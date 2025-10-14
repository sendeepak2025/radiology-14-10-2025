const crypto = require('crypto');
const SecurityAuditLogger = require('../utils/security-audit-logger');

/**
 * Security logging middleware for comprehensive request tracking
 */
class SecurityLoggingMiddleware {
  constructor(options = {}) {
    this.auditLogger = new SecurityAuditLogger({
      serviceName: options.serviceName || 'dicom-bridge',
      version: options.version || '1.0.0'
    });
    this.logAllRequests = options.logAllRequests || false;
    this.sensitiveHeaders = options.sensitiveHeaders || [
      'authorization',
      'x-api-key',
      'x-orthanc-signature',
      'cookie'
    ];
  }

  /**
   * Express middleware for request correlation and security logging
   */
  middleware() {
    return (req, res, next) => {
      // Generate correlation ID for request tracking
      req.correlationId = req.headers['x-correlation-id'] || crypto.randomUUID();
      
      // Extract request metadata
      const sourceIP = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';
      const method = req.method;
      const path = req.path;
      const timestamp = new Date().toISOString();

      // Add correlation ID to response headers
      res.setHeader('X-Correlation-ID', req.correlationId);

      // Log security-sensitive requests
      if (this.isSecuritySensitiveRequest(req)) {
        this.auditLogger.logWebhookSecurityEvent('request_received', {
          correlationId: req.correlationId,
          sourceIP,
          userAgent,
          method,
          path,
          timestamp,
          headers: this.sanitizeHeaders(req.headers)
        });
      } else if (this.logAllRequests) {
        // Log all requests if configured
        this.auditLogger.logWebhookSecurityEvent('request_received', {
          correlationId: req.correlationId,
          sourceIP,
          userAgent,
          method,
          path,
          timestamp
        });
      }

      // Track response completion
      const originalSend = res.send;
      res.send = function(data) {
        const statusCode = res.statusCode;
        const responseTime = Date.now() - req.startTime;

        // Log security-relevant responses
        if (statusCode >= 400) {
          this.auditLogger.logWebhookSecurityEvent('error_response', {
            correlationId: req.correlationId,
            sourceIP,
            userAgent,
            method,
            path,
            statusCode,
            responseTime
          });
        }

        return originalSend.call(this, data);
      }.bind(this);

      // Record request start time
      req.startTime = Date.now();
      
      next();
    };
  }

  /**
   * Check if request is security-sensitive
   */
  isSecuritySensitiveRequest(req) {
    const securityPaths = [
      '/api/orthanc/new-instance',
      '/api/webhook',
      '/api/secrets',
      '/auth'
    ];

    return securityPaths.some(path => req.path.startsWith(path)) ||
           req.headers['x-orthanc-signature'] ||
           req.headers['authorization'];
  }

  /**
   * Sanitize headers for logging (remove sensitive data)
   */
  sanitizeHeaders(headers) {
    const sanitized = {};
    
    for (const [key, value] of Object.entries(headers)) {
      const lowerKey = key.toLowerCase();
      
      if (this.sensitiveHeaders.includes(lowerKey)) {
        sanitized[key] = '[REDACTED]';
      } else if (lowerKey.includes('signature')) {
        sanitized[key] = value ? '[PRESENT]' : '[MISSING]';
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }

  /**
   * Log authentication events
   */
  logAuthEvent(eventType, req, userId = null, details = {}) {
    const sourceIP = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    return this.auditLogger.logAuthenticationEvent(
      eventType,
      userId,
      sourceIP,
      {
        correlationId: req.correlationId,
        userAgent,
        path: req.path,
        method: req.method,
        ...details
      }
    );
  }

  /**
   * Log system events
   */
  logSystemEvent(eventType, details = {}) {
    return this.auditLogger.logSystemSecurityEvent(eventType, details);
  }
}

module.exports = SecurityLoggingMiddleware;