const crypto = require('crypto');
const logger = require('./logger');

/**
 * SecurityAuditLogger for comprehensive security event logging
 */
class SecurityAuditLogger {
  constructor(options = {}) {
    this.serviceName = options.serviceName || 'dicom-bridge';
    this.version = options.version || '1.0.0';
  }

  /**
   * Generate correlation ID for tracking related events
   */
  generateCorrelationId() {
    return crypto.randomUUID();
  }

  /**
   * Log webhook security events
   */
  logWebhookSecurityEvent(eventType, details = {}) {
    const correlationId = details.correlationId || this.generateCorrelationId();
    const timestamp = new Date().toISOString();
    
    const auditEvent = {
      timestamp,
      correlationId,
      service: this.serviceName,
      version: this.version,
      eventType: `webhook.security.${eventType}`,
      severity: this.getSeverityLevel(eventType),
      sourceIP: details.sourceIP || 'unknown',
      userAgent: details.userAgent || 'unknown',
      details: {
        ...details,
        // Remove sensitive data from logs
        signature: details.signature ? '[REDACTED]' : undefined,
        payload: details.payload ? '[PAYLOAD_PRESENT]' : undefined
      }
    };

    // Log based on severity
    switch (auditEvent.severity) {
      case 'critical':
      case 'high':
        logger.error('Security audit event', auditEvent);
        break;
      case 'medium':
        logger.warn('Security audit event', auditEvent);
        break;
      case 'low':
      case 'info':
        logger.info('Security audit event', auditEvent);
        break;
      default:
        logger.info('Security audit event', auditEvent);
    }

    return correlationId;
  }

  /**
   * Log invalid signature attempts
   */
  logInvalidSignature(sourceIP, reason, details = {}) {
    return this.logWebhookSecurityEvent('invalid_signature', {
      sourceIP,
      reason,
      timestamp: details.timestamp,
      nonce: details.nonce,
      signatureLength: details.signatureLength,
      expectedLength: details.expectedLength,
      ...details
    });
  }

  /**
   * Log replay attack attempts
   */
  logReplayAttack(sourceIP, nonce, timestamp, details = {}) {
    return this.logWebhookSecurityEvent('replay_attack', {
      sourceIP,
      nonce,
      timestamp,
      attackType: 'nonce_reuse',
      ...details
    });
  }

  /**
   * Log rate limit violations
   */
  logRateLimitViolation(sourceIP, currentCount, maxRequests, windowMs, details = {}) {
    return this.logWebhookSecurityEvent('rate_limit_violation', {
      sourceIP,
      currentCount,
      maxRequests,
      windowMs,
      violationType: 'request_limit_exceeded',
      ...details
    });
  }

  /**
   * Log timestamp expiry violations
   */
  logTimestampExpiry(sourceIP, webhookTime, currentTime, maxAge, details = {}) {
    return this.logWebhookSecurityEvent('timestamp_expired', {
      sourceIP,
      webhookTime,
      currentTime,
      ageDiff: Math.abs(currentTime - webhookTime),
      maxAge,
      ...details
    });
  }

  /**
   * Log successful webhook validations
   */
  logSuccessfulValidation(sourceIP, timestamp, nonce, details = {}) {
    return this.logWebhookSecurityEvent('validation_success', {
      sourceIP,
      timestamp,
      nonce,
      ...details
    });
  }

  /**
   * Log authentication events
   */
  logAuthenticationEvent(eventType, userId, sourceIP, details = {}) {
    const correlationId = details.correlationId || this.generateCorrelationId();
    const timestamp = new Date().toISOString();
    
    const auditEvent = {
      timestamp,
      correlationId,
      service: this.serviceName,
      version: this.version,
      eventType: `auth.${eventType}`,
      severity: this.getAuthSeverityLevel(eventType),
      userId: userId || 'anonymous',
      sourceIP: sourceIP || 'unknown',
      userAgent: details.userAgent || 'unknown',
      details: {
        ...details,
        // Remove sensitive data
        password: details.password ? '[REDACTED]' : undefined,
        token: details.token ? '[REDACTED]' : undefined
      }
    };

    // Log based on severity
    switch (auditEvent.severity) {
      case 'critical':
      case 'high':
        logger.error('Authentication audit event', auditEvent);
        break;
      case 'medium':
        logger.warn('Authentication audit event', auditEvent);
        break;
      case 'low':
      case 'info':
        logger.info('Authentication audit event', auditEvent);
        break;
      default:
        logger.info('Authentication audit event', auditEvent);
    }

    return correlationId;
  }

  /**
   * Get severity level for webhook security events
   */
  getSeverityLevel(eventType) {
    const severityMap = {
      'invalid_signature': 'high',
      'replay_attack': 'critical',
      'rate_limit_violation': 'medium',
      'timestamp_expired': 'medium',
      'validation_success': 'info',
      'missing_signature': 'high',
      'missing_timestamp': 'medium',
      'missing_nonce': 'medium',
      'validation_error': 'high'
    };

    return severityMap[eventType] || 'medium';
  }

  /**
   * Get severity level for authentication events
   */
  getAuthSeverityLevel(eventType) {
    const severityMap = {
      'login_success': 'info',
      'login_failure': 'medium',
      'logout': 'info',
      'password_change': 'info',
      'account_locked': 'high',
      'suspicious_activity': 'critical',
      'privilege_escalation': 'critical',
      'unauthorized_access': 'critical'
    };

    return severityMap[eventType] || 'medium';
  }

  /**
   * Log system security events
   */
  logSystemSecurityEvent(eventType, details = {}) {
    const correlationId = details.correlationId || this.generateCorrelationId();
    const timestamp = new Date().toISOString();
    
    const auditEvent = {
      timestamp,
      correlationId,
      service: this.serviceName,
      version: this.version,
      eventType: `system.security.${eventType}`,
      severity: this.getSystemSeverityLevel(eventType),
      details
    };

    logger.warn('System security audit event', auditEvent);
    return correlationId;
  }

  /**
   * Get severity level for system security events
   */
  getSystemSeverityLevel(eventType) {
    const severityMap = {
      'config_change': 'medium',
      'secret_rotation': 'info',
      'certificate_expiry': 'high',
      'service_restart': 'info',
      'backup_failure': 'high',
      'disk_space_low': 'medium',
      'memory_usage_high': 'medium'
    };

    return severityMap[eventType] || 'medium';
  }
}

module.exports = SecurityAuditLogger;