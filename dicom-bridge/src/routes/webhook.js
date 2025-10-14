const express = require('express');
const crypto = require('crypto');
const logger = require('../utils/logger');
const AuditLogger = require('../utils/audit-logger');
const { enqueueInstanceProcessing } = require('../services/queue');
const { getWebhookSecurity, checkRateLimit } = require('../utils/security');
const SecurityAuditLogger = require('../utils/security-audit-logger');

const router = express.Router();

// Initialize audit loggers
const securityAuditLogger = new SecurityAuditLogger({
  serviceName: 'dicom-bridge-webhook',
  version: process.env.SERVICE_VERSION || '1.0.0'
});

const auditLogger = new AuditLogger({
  serviceName: 'dicom-bridge-webhook'
});

/**
 * Webhook endpoint for Orthanc OnStoredInstance events
 * CRITICAL: This endpoint only enqueues jobs, never modifies original DICOMs
 */
router.post('/new-instance', async (req, res) => {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();
  const sourceIP = req.ip || req.connection.remoteAddress || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';
  
  try {
    logger.info('Webhook received', { 
      requestId,
      sourceIP,
      userAgent,
      headers: {
        signature: req.headers['x-orthanc-signature'] ? '[PRESENT]' : '[MISSING]',
        timestamp: req.headers['x-orthanc-timestamp'],
        nonce: req.headers['x-orthanc-nonce'],
        instanceId: req.headers['x-orthanc-instance-id']
      }
    });

    // Check rate limiting first
    const rateLimitResult = await checkRateLimit(sourceIP);
    if (!rateLimitResult.allowed) {
      const correlationId = securityAuditLogger.logRateLimitViolation(
        sourceIP,
        rateLimitResult.count,
        100, // maxRequests
        60000, // windowMs
        { requestId, userAgent }
      );

      return res.status(429).json({
        success: false,
        message: 'Rate limit exceeded',
        retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000),
        correlationId
      });
    }

    // Extract security headers
    const signature = req.headers['x-orthanc-signature'];
    const timestamp = req.headers['x-orthanc-timestamp'];
    const nonce = req.headers['x-orthanc-nonce'];

    // Validate webhook signature with enhanced security
    const webhookSecurity = getWebhookSecurity();
    const validationResult = await webhookSecurity.validateSignature(
      req.body, 
      signature, 
      timestamp, 
      nonce, 
      sourceIP
    );

    if (!validationResult.valid) {
      let correlationId;
      
      switch (validationResult.reason) {
        case 'missing_signature':
        case 'invalid_signature':
          correlationId = securityAuditLogger.logInvalidSignature(
            sourceIP,
            validationResult.reason,
            { requestId, userAgent, timestamp, nonce }
          );
          break;
        case 'replay_attack':
          correlationId = securityAuditLogger.logReplayAttack(
            sourceIP,
            nonce,
            timestamp,
            { requestId, userAgent }
          );
          break;
        case 'timestamp_expired':
          correlationId = securityAuditLogger.logTimestampExpiry(
            sourceIP,
            parseInt(timestamp),
            Math.floor(Date.now() / 1000),
            300, // maxAge
            { requestId, userAgent }
          );
          break;
        default:
          correlationId = securityAuditLogger.logWebhookSecurityEvent(
            'validation_failure',
            { sourceIP, reason: validationResult.reason, requestId, userAgent }
          );
      }

      return res.status(401).json({
        success: false,
        message: 'Webhook validation failed',
        reason: validationResult.reason,
        correlationId
      });
    }

    // Log successful validation
    const correlationId = securityAuditLogger.logSuccessfulValidation(
      sourceIP,
      timestamp,
      nonce,
      { requestId, userAgent }
    );

    // Log webhook received event
    auditLogger.logWebhookEvent('received', {
      sourceIP,
      userAgent,
      requestMethod: req.method,
      requestPath: req.path,
      timestamp,
      nonce
    }, {
      correlationId,
      signatureValid: true,
      rateLimitStatus: 'allowed',
      processingTime: Date.now() - startTime
    });

    // Extract instance data from webhook payload
    const {
      instanceId,
      studyInstanceUID,
      seriesInstanceUID,
      sopInstanceUID,
      patientID,
      patientName,
      modality,
      studyDate,
      origin,
      timestamp: orthancTimestamp
    } = req.body;

    // Validate required fields
    if (!instanceId || !studyInstanceUID || !sopInstanceUID) {
      logger.warn('Missing required fields in webhook payload', { 
        requestId,
        correlationId,
        payload: req.body 
      });
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: instanceId, studyInstanceUID, sopInstanceUID',
        correlationId
      });
    }

    // Prepare job data for queue
    const jobData = {
      requestId,
      correlationId,
      instanceId,
      studyInstanceUID,
      seriesInstanceUID,
      sopInstanceUID,
      patientID: patientID || 'Unknown',
      patientName: patientName || 'Unknown',
      modality: modality || 'OT',
      studyDate: studyDate || '',
      origin: origin || 'unknown',
      receivedAt: new Date().toISOString(),
      orthancTimestamp,
      sourceIP,
      userAgent
    };

    // Enqueue processing job (non-blocking)
    const job = await enqueueInstanceProcessing(jobData);
    
    const processingTime = Date.now() - startTime;
    
    // Log job enqueued event
    auditLogger.logDicomProcessingEvent('job_enqueued', {
      instanceId,
      studyInstanceUID,
      seriesInstanceUID,
      sopInstanceUID,
      modality: modality || 'OT',
      aeTitle: 'ORTHANC',
      sourceIP
    }, {
      correlationId,
      requestId,
      jobId: job.id,
      processingTime,
      queueName: 'instance-processing',
      success: true
    });
    
    logger.info('Instance processing job enqueued', {
      requestId,
      correlationId,
      jobId: job.id,
      instanceId,
      studyInstanceUID,
      sopInstanceUID,
      processingTime,
      sourceIP
    });

    // Return success immediately (webhook should be fast)
    res.status(200).json({
      success: true,
      message: 'Instance processing enqueued',
      data: {
        requestId,
        correlationId,
        jobId: job.id,
        instanceId,
        studyInstanceUID,
        processingTime
      }
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    const errorCorrelationId = securityAuditLogger.logWebhookSecurityEvent(
      'processing_error',
      { 
        sourceIP, 
        requestId, 
        userAgent,
        error: error.message,
        processingTime
      }
    );

    logger.error('Webhook processing failed', {
      requestId,
      correlationId: errorCorrelationId,
      error: error.message,
      stack: error.stack,
      processingTime,
      sourceIP
    });

    res.status(500).json({
      success: false,
      message: 'Failed to process webhook',
      requestId,
      correlationId: errorCorrelationId
    });
  }
});

/**
 * Get processing status for an instance
 */
router.get('/status/:instanceId', async (req, res) => {
  try {
    const { instanceId } = req.params;
    
    // This would query job status from Redis/Bull
    // Implementation depends on your job tracking needs
    
    res.json({
      success: true,
      data: {
        instanceId,
        status: 'queued', // or 'processing', 'completed', 'failed'
        message: 'Status endpoint placeholder'
      }
    });
    
  } catch (error) {
    logger.error('Status check failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to check status'
    });
  }
});

module.exports = router;