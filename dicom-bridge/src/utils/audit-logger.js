const crypto = require('crypto');
const winston = require('winston');
const path = require('path');

/**
 * Comprehensive Audit Logger for DICOM Bridge Operations
 * Provides structured audit logging with correlation IDs, PHI redaction, and SIEM integration
 */
class AuditLogger {
  constructor(options = {}) {
    this.serviceName = options.serviceName || 'dicom-bridge';
    this.version = options.version || '1.0.0';
    this.environment = process.env.NODE_ENV || 'development';
    
    // Initialize Winston logger for audit events
    this.logger = this.createAuditLogger();
    
    // PHI fields that need redaction
    this.phiFields = [
      'patientName', 'patientID', 'patientBirthDate', 'patientSex',
      'patientAddress', 'patientTelephoneNumbers', 'institutionName',
      'institutionAddress', 'referringPhysicianName', 'performingPhysicianName',
      'operatorName', 'reviewerName', 'password', 'token', 'authorization',
      'cookie', 'secret', 'key', 'signature'
    ];
  }

  /**
   * Create dedicated Winston logger for audit events
   */
  createAuditLogger() {
    const auditFormat = winston.format.combine(
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss.SSS'
      }),
      winston.format.errors({ stack: true }),
      winston.format.json(),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        return JSON.stringify({
          timestamp,
          level,
          message,
          service: this.serviceName,
          environment: this.environment,
          auditEvent: true,
          ...meta
        });
      })
    );

    return winston.createLogger({
      level: 'info',
      format: auditFormat,
      defaultMeta: {
        service: this.serviceName,
        version: this.version,
        auditEvent: true
      },
      transports: [
        // Dedicated audit log file
        new winston.transports.File({
          filename: path.join(process.cwd(), 'logs', 'audit.log'),
          maxsize: 50 * 1024 * 1024, // 50MB
          maxFiles: 10,
          tailable: true
        }),
        
        // Console output for development
        ...(this.environment === 'development' ? [
          new winston.transports.Console({
            format: winston.format.combine(
              winston.format.colorize(),
              winston.format.simple()
            )
          })
        ] : [])
      ]
    });
  }

  /**
   * Generate unique correlation ID for tracking related events
   */
  generateCorrelationId() {
    return crypto.randomUUID();
  }

  /**
   * Redact PHI and sensitive data from audit logs
   */
  redactPHI(data) {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const redacted = Array.isArray(data) ? [] : {};
    
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      
      // Check if field contains PHI
      const isPHI = this.phiFields.some(field => 
        lowerKey.includes(field.toLowerCase()) || 
        lowerKey === field.toLowerCase()
      );
      
      if (isPHI) {
        redacted[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        redacted[key] = this.redactPHI(value);
      } else {
        redacted[key] = value;
      }
    }
    
    return redacted;
  }

  /**
   * Create base audit event structure
   */
  createBaseAuditEvent(eventType, details = {}) {
    const correlationId = details.correlationId || this.generateCorrelationId();
    const timestamp = new Date().toISOString();
    
    return {
      timestamp,
      correlationId,
      service: this.serviceName,
      version: this.version,
      environment: this.environment,
      eventType,
      severity: this.getSeverityLevel(eventType),
      details: this.redactPHI(details)
    };
  }

  /**
   * Log DICOM processing audit events
   */
  logDicomProcessingEvent(eventType, instanceData, details = {}) {
    const auditEvent = this.createBaseAuditEvent(`dicom.processing.${eventType}`, {
      instanceId: instanceData.instanceId,
      studyInstanceUID: instanceData.studyInstanceUID,
      seriesInstanceUID: instanceData.seriesInstanceUID,
      sopInstanceUID: instanceData.sopInstanceUID,
      modality: instanceData.modality,
      aeTitle: instanceData.aeTitle,
      sourceIP: instanceData.sourceIP,
      processingTime: details.processingTime,
      success: details.success,
      errorMessage: details.errorMessage,
      ...details
    });

    this.logger.info('DICOM processing audit event', auditEvent);
    return auditEvent.correlationId;
  }

  /**
   * Log anonymization audit events
   */
  logAnonymizationEvent(eventType, anonymizationData, details = {}) {
    const auditEvent = this.createBaseAuditEvent(`anonymization.${eventType}`, {
      studyInstanceUID: anonymizationData.studyInstanceUID,
      originalPatientID: '[REDACTED]', // Always redact original patient ID
      anonymizedPatientID: anonymizationData.anonymizedPatientID,
      tagsRemoved: anonymizationData.tagsRemoved,
      tagsPseudonymized: anonymizationData.tagsPseudonymized,
      policyVersion: anonymizationData.policyVersion,
      validationResult: details.validationResult,
      ...details
    });

    this.logger.info('Anonymization audit event', auditEvent);
    return auditEvent.correlationId;
  }

  /**
   * Log webhook audit events
   */
  logWebhookEvent(eventType, webhookData, details = {}) {
    const auditEvent = this.createBaseAuditEvent(`webhook.${eventType}`, {
      sourceIP: webhookData.sourceIP,
      userAgent: webhookData.userAgent,
      timestamp: webhookData.timestamp,
      nonce: webhookData.nonce,
      signatureValid: details.signatureValid,
      rateLimitStatus: details.rateLimitStatus,
      processingTime: details.processingTime,
      ...details
    });

    const logLevel = eventType.includes('error') || eventType.includes('invalid') ? 'error' : 'info';
    this.logger[logLevel]('Webhook audit event', auditEvent);
    return auditEvent.correlationId;
  }

  /**
   * Log user access audit events
   */
  logAccessEvent(eventType, userContext, details = {}) {
    const auditEvent = this.createBaseAuditEvent(`access.${eventType}`, {
      userId: userContext.userId,
      username: userContext.username,
      role: userContext.role,
      sourceIP: userContext.sourceIP,
      userAgent: userContext.userAgent,
      sessionId: userContext.sessionId,
      resource: details.resource,
      action: details.action,
      success: details.success,
      ...details
    });

    const logLevel = details.success === false ? 'warn' : 'info';
    this.logger[logLevel]('Access audit event', auditEvent);
    return auditEvent.correlationId;
  }

  /**
   * Log system audit events
   */
  logSystemEvent(eventType, systemData, details = {}) {
    const auditEvent = this.createBaseAuditEvent(`system.${eventType}`, {
      component: systemData.component,
      operation: systemData.operation,
      result: systemData.result,
      duration: details.duration,
      resourceUsage: details.resourceUsage,
      ...details
    });

    this.logger.info('System audit event', auditEvent);
    return auditEvent.correlationId;
  }

  /**
   * Log compliance audit events
   */
  logComplianceEvent(eventType, complianceData, details = {}) {
    const auditEvent = this.createBaseAuditEvent(`compliance.${eventType}`, {
      regulatoryFramework: complianceData.regulatoryFramework,
      requirement: complianceData.requirement,
      status: complianceData.status,
      evidence: complianceData.evidence,
      reviewer: complianceData.reviewer,
      ...details
    });

    this.logger.info('Compliance audit event', auditEvent);
    return auditEvent.correlationId;
  }

  /**
   * Get severity level based on event type
   */
  getSeverityLevel(eventType) {
    const severityMap = {
      // DICOM processing events
      'dicom.processing.started': 'info',
      'dicom.processing.completed': 'info',
      'dicom.processing.failed': 'error',
      'dicom.processing.timeout': 'warn',
      
      // Anonymization events
      'anonymization.started': 'info',
      'anonymization.completed': 'info',
      'anonymization.failed': 'error',
      'anonymization.validation_failed': 'error',
      
      // Webhook events
      'webhook.received': 'info',
      'webhook.processed': 'info',
      'webhook.invalid_signature': 'error',
      'webhook.rate_limited': 'warn',
      'webhook.replay_attack': 'critical',
      
      // Access events
      'access.login': 'info',
      'access.logout': 'info',
      'access.unauthorized': 'warn',
      'access.forbidden': 'warn',
      
      // System events
      'system.startup': 'info',
      'system.shutdown': 'info',
      'system.error': 'error',
      'system.config_change': 'warn',
      
      // Compliance events
      'compliance.policy_applied': 'info',
      'compliance.violation': 'error',
      'compliance.audit_completed': 'info'
    };

    return severityMap[eventType] || 'info';
  }

  /**
   * Create audit trail for a complete operation
   */
  async createAuditTrail(operationType, operationData, operationFunction) {
    const correlationId = this.generateCorrelationId();
    const startTime = Date.now();
    
    // Log operation start
    this.logSystemEvent('operation_started', {
      component: 'audit-trail',
      operation: operationType
    }, {
      correlationId,
      operationData: this.redactPHI(operationData)
    });

    try {
      // Execute the operation
      const result = await operationFunction(correlationId);
      const duration = Date.now() - startTime;
      
      // Log operation success
      this.logSystemEvent('operation_completed', {
        component: 'audit-trail',
        operation: operationType,
        result: 'success'
      }, {
        correlationId,
        duration,
        result: this.redactPHI(result)
      });

      return { success: true, result, correlationId };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Log operation failure
      this.logSystemEvent('operation_failed', {
        component: 'audit-trail',
        operation: operationType,
        result: 'failure'
      }, {
        correlationId,
        duration,
        error: error.message,
        stack: error.stack
      });

      throw error;
    }
  }

  /**
   * Export audit logs for SIEM integration
   */
  async exportAuditLogs(startDate, endDate, format = 'json') {
    const correlationId = this.generateCorrelationId();
    
    this.logSystemEvent('audit_export_started', {
      component: 'audit-logger',
      operation: 'export_logs'
    }, {
      correlationId,
      startDate,
      endDate,
      format
    });

    try {
      // Implementation would read from audit log files
      // and format for SIEM consumption
      const exportData = {
        exportId: correlationId,
        startDate,
        endDate,
        format,
        recordCount: 0, // Would be populated by actual implementation
        exportedAt: new Date().toISOString()
      };

      this.logSystemEvent('audit_export_completed', {
        component: 'audit-logger',
        operation: 'export_logs',
        result: 'success'
      }, {
        correlationId,
        exportData
      });

      return exportData;
      
    } catch (error) {
      this.logSystemEvent('audit_export_failed', {
        component: 'audit-logger',
        operation: 'export_logs',
        result: 'failure'
      }, {
        correlationId,
        error: error.message
      });

      throw error;
    }
  }
}

module.exports = AuditLogger;