const express = require('express');
const crypto = require('crypto');
const logger = require('../utils/logger');
const { getSecretManager, getApplicationSecrets } = require('../services/secret-manager');

const router = express.Router();

/**
 * Webhook endpoint for secret rotation notifications
 * Called by secret management system when secrets are rotated
 */
router.post('/rotation-webhook', async (req, res) => {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();
  
  try {
    logger.info('Secret rotation webhook received', { 
      requestId,
      headers: {
        'user-agent': req.headers['user-agent'],
        'content-type': req.headers['content-type']
      }
    });

    // Validate webhook signature (if configured)
    const rotationSecret = process.env.SECRET_ROTATION_WEBHOOK_SECRET;
    if (rotationSecret) {
      const signature = req.headers['x-rotation-signature'];
      if (!validateRotationSignature(req.body, signature, rotationSecret)) {
        logger.warn('Invalid rotation webhook signature', { requestId });
        return res.status(401).json({
          success: false,
          message: 'Invalid signature'
        });
      }
    }

    const { secretPath, action, timestamp } = req.body;

    // Validate required fields
    if (!secretPath || !action) {
      logger.warn('Missing required fields in rotation webhook', { 
        requestId, 
        payload: req.body 
      });
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: secretPath, action'
      });
    }

    // Handle different rotation actions
    switch (action) {
      case 'rotated':
        await handleSecretRotation(secretPath, requestId);
        break;
      case 'rotation_scheduled':
        await handleRotationScheduled(secretPath, requestId);
        break;
      case 'rotation_failed':
        await handleRotationFailed(secretPath, requestId);
        break;
      default:
        logger.warn('Unknown rotation action', { requestId, action });
        return res.status(400).json({
          success: false,
          message: `Unknown action: ${action}`
        });
    }

    const processingTime = Date.now() - startTime;
    logger.info('Secret rotation webhook processed', {
      requestId,
      secretPath,
      action,
      processingTime
    });

    res.status(200).json({
      success: true,
      message: 'Rotation webhook processed',
      data: {
        requestId,
        secretPath,
        action,
        processingTime
      }
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Secret rotation webhook processing failed', {
      requestId,
      error: error.message,
      stack: error.stack,
      processingTime
    });

    res.status(500).json({
      success: false,
      message: 'Failed to process rotation webhook',
      requestId
    });
  }
});

/**
 * Manual secret refresh endpoint (admin only)
 */
router.post('/refresh', async (req, res) => {
  try {
    logger.info('Manual secret refresh requested', {
      userAgent: req.headers['user-agent'],
      ip: req.ip
    });

    // Clear secret cache
    const secretManager = getSecretManager();
    secretManager.clearCache();

    // Reload application secrets
    const secrets = await getApplicationSecrets();
    
    // Update environment variables
    updateEnvironmentFromSecrets(secrets);

    logger.info('Secrets refreshed successfully');

    res.json({
      success: true,
      message: 'Secrets refreshed successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Manual secret refresh failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to refresh secrets'
    });
  }
});

/**
 * Get secret manager status and cache statistics
 */
router.get('/status', (req, res) => {
  try {
    const secretManager = getSecretManager();
    const stats = secretManager.getCacheStats();

    res.json({
      success: true,
      data: {
        provider: stats.provider,
        cacheSize: stats.size,
        cacheTimeout: stats.timeout,
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Failed to get secret manager status', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get status'
    });
  }
});

/**
 * Handle secret rotation completion
 */
async function handleSecretRotation(secretPath, requestId) {
  try {
    logger.info('Processing secret rotation', { secretPath, requestId });

    // Clear cache for rotated secret
    const secretManager = getSecretManager();
    secretManager.clearCache();

    // Reload application secrets
    const secrets = await getApplicationSecrets();
    
    // Update environment variables
    updateEnvironmentFromSecrets(secrets);

    // If Orthanc credentials were rotated, update configuration and restart
    if (secretPath.includes('orthanc')) {
      logger.info('Orthanc credentials rotated, updating configuration and restarting', { requestId });
      
      try {
        const { OrthancConfigGenerator } = require('../services/orthanc-config-generator');
        const configGenerator = new OrthancConfigGenerator();
        
        // Handle credential rotation with configuration update and restart
        await configGenerator.handleCredentialRotation();
        
        logger.info('Orthanc credential rotation completed', { requestId });
      } catch (orthancError) {
        logger.error('Failed to handle Orthanc credential rotation', {
          requestId,
          error: orthancError.message
        });
        
        // Still validate connection as fallback
        const { validateOrthancConnection } = require('../services/orthanc-client');
        await validateOrthancConnection();
      }
    }

    logger.info('Secret rotation processed successfully', { secretPath, requestId });

  } catch (error) {
    logger.error('Failed to process secret rotation', {
      secretPath,
      requestId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Handle rotation scheduling notification
 */
async function handleRotationScheduled(secretPath, requestId) {
  logger.info('Secret rotation scheduled', { secretPath, requestId });
  
  // Could trigger pre-rotation preparations here
  // For example, health check validation, backup creation, etc.
}

/**
 * Handle rotation failure notification
 */
async function handleRotationFailed(secretPath, requestId) {
  logger.error('Secret rotation failed', { secretPath, requestId });
  
  // Could trigger alerts, fallback procedures, etc.
  // For now, just log the failure
}

/**
 * Validate rotation webhook signature
 */
function validateRotationSignature(payload, signature, secret) {
  if (!signature || !secret) {
    return false;
  }

  try {
    const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payloadString)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch (error) {
    logger.error('Signature validation error', { error: error.message });
    return false;
  }
}

/**
 * Update environment variables from loaded secrets
 */
function updateEnvironmentFromSecrets(secrets) {
  process.env.ORTHANC_URL = secrets.orthanc.url || process.env.ORTHANC_URL;
  process.env.ORTHANC_USERNAME = secrets.orthanc.username || process.env.ORTHANC_USERNAME;
  process.env.ORTHANC_PASSWORD = secrets.orthanc.password || process.env.ORTHANC_PASSWORD;
  process.env.WEBHOOK_SECRET = secrets.webhook.secret || process.env.WEBHOOK_SECRET;
  process.env.MONGODB_URI = secrets.database.uri || process.env.MONGODB_URI;
  process.env.CLOUDINARY_CLOUD_NAME = secrets.cloudinary.cloudName || process.env.CLOUDINARY_CLOUD_NAME;
  process.env.CLOUDINARY_API_KEY = secrets.cloudinary.apiKey || process.env.CLOUDINARY_API_KEY;
  process.env.CLOUDINARY_API_SECRET = secrets.cloudinary.apiSecret || process.env.CLOUDINARY_API_SECRET;
}

module.exports = router;