const AuditLogger = require('../utils/audit-logger');

/**
 * Audit Middleware for Node Server
 * Logs all user access events and API operations
 */
class AuditMiddleware {
  constructor() {
    this.auditLogger = new AuditLogger({ serviceName: 'node-server' });
  }

  /**
   * Middleware to log all HTTP requests
   */
  logRequest() {
    return (req, res, next) => {
      const startTime = Date.now();
      const correlationId = this.auditLogger.generateCorrelationId();
      
      // Add correlation ID to request for downstream use
      req.correlationId = correlationId;
      
      // Extract user context
      const userContext = {
        userId: req.user?.id || 'anonymous',
        username: req.user?.username || 'anonymous',
        role: req.user?.role || 'guest',
        sourceIP: req.ip || req.connection?.remoteAddress || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
        sessionId: req.sessionID || 'no-session'
      };

      // Log access attempt
      this.auditLogger.logAccessEvent('request', userContext, {
        correlationId,
        resource: req.originalUrl || req.url,
        action: req.method,
        method: req.method,
        path: req.path,
        query: this.sanitizeQuery(req.query),
        headers: this.sanitizeHeaders(req.headers),
        timestamp: new Date().toISOString()
      });

      // Override res.end to capture response details
      const originalEnd = res.end;
      const self = this;
      res.end = function(chunk, encoding) {
        const duration = Date.now() - startTime;
        
        // Log access completion
        self.auditLogger.logAccessEvent('response', userContext, {
          correlationId,
          resource: req.originalUrl || req.url,
          action: req.method,
          method: req.method,
          path: req.path,
          success: res.statusCode < 400,
          statusCode: res.statusCode,
          duration,
          responseSize: chunk ? chunk.length : 0
        });

        // Call original end method
        originalEnd.call(this, chunk, encoding);
      };

      next();
    };
  }

  /**
   * Middleware to log authentication events
   */
  logAuthentication() {
    return (req, res, next) => {
      const correlationId = req.correlationId || this.auditLogger.generateCorrelationId();
      
      // Check if this is a login attempt
      if (req.path === '/api/auth/login' && req.method === 'POST') {
        const userContext = {
          userId: req.body?.username || 'unknown',
          username: req.body?.username || 'unknown',
          role: 'unknown',
          sourceIP: req.ip || req.connection?.remoteAddress || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown',
          sessionId: req.sessionID || 'no-session'
        };

        // Log login attempt
        this.auditLogger.logAccessEvent('login_attempt', userContext, {
          correlationId,
          resource: req.originalUrl,
          action: 'LOGIN',
          timestamp: new Date().toISOString()
        });

        // Override res.json to capture login result
        const originalJson = res.json;
        const self = this;
        res.json = function(data) {
          const success = res.statusCode === 200 && data.success;
          
          // Log login result
          self.auditLogger.logAccessEvent(success ? 'login_success' : 'login_failure', {
            ...userContext,
            userId: success ? data.user?.id || userContext.userId : userContext.userId,
            role: success ? data.user?.role || 'user' : 'unknown'
          }, {
            correlationId,
            resource: req.originalUrl,
            action: 'LOGIN',
            success,
            statusCode: res.statusCode,
            errorMessage: success ? null : data.message || 'Login failed'
          });

          originalJson.call(this, data);
        };
      }

      // Check if this is a logout
      if (req.path === '/api/auth/logout' && req.method === 'POST') {
        const userContext = {
          userId: req.user?.id || 'unknown',
          username: req.user?.username || 'unknown',
          role: req.user?.role || 'unknown',
          sourceIP: req.ip || req.connection?.remoteAddress || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown',
          sessionId: req.sessionID || 'no-session'
        };

        this.auditLogger.logAccessEvent('logout', userContext, {
          correlationId,
          resource: req.originalUrl,
          action: 'LOGOUT',
          success: true,
          timestamp: new Date().toISOString()
        });
      }

      next();
    };
  }

  /**
   * Middleware to log DICOM operations
   */
  logDicomOperation() {
    return (req, res, next) => {
      const correlationId = req.correlationId || this.auditLogger.generateCorrelationId();
      
      // Check if this is a DICOM-related operation
      if (req.path.includes('/api/dicom') || req.path.includes('/api/studies') || 
          req.path.includes('/api/patients') || req.path.includes('/api/instances')) {
        
        const userContext = {
          userId: req.user?.id || 'system',
          username: req.user?.username || 'system',
          role: req.user?.role || 'system',
          sourceIP: req.ip || req.connection?.remoteAddress || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown',
          sessionId: req.sessionID || 'no-session'
        };

        // Determine operation type
        let operationType = 'unknown';
        if (req.method === 'GET') operationType = 'read';
        else if (req.method === 'POST') operationType = 'create';
        else if (req.method === 'PUT' || req.method === 'PATCH') operationType = 'update';
        else if (req.method === 'DELETE') operationType = 'delete';

        // Log DICOM operation
        this.auditLogger.logAccessEvent(`dicom_${operationType}`, userContext, {
          correlationId,
          resource: req.originalUrl,
          action: operationType.toUpperCase(),
          method: req.method,
          path: req.path,
          dataType: this.extractDataType(req.path),
          studyUID: req.params.studyUID || req.body?.studyInstanceUID,
          patientID: '[REDACTED]', // Always redact PHI
          timestamp: new Date().toISOString()
        });

        // Override response to log completion
        const originalJson = res.json;
        const self = this;
        res.json = function(data) {
          const success = res.statusCode < 400;
          
          self.auditLogger.logAccessEvent(`dicom_${operationType}_complete`, userContext, {
            correlationId,
            resource: req.originalUrl,
            action: operationType.toUpperCase(),
            success,
            statusCode: res.statusCode,
            recordCount: Array.isArray(data?.data) ? data.data.length : (data?.data ? 1 : 0),
            errorMessage: success ? null : data?.message
          });

          originalJson.call(this, data);
        };
      }

      next();
    };
  }

  /**
   * Middleware to log unauthorized access attempts
   */
  logUnauthorizedAccess() {
    return (req, res, next) => {
      const correlationId = req.correlationId || this.auditLogger.generateCorrelationId();
      
      // Override res.status to catch 401/403 responses
      const originalStatus = res.status;
      const self = this;
      res.status = function(code) {
        if (code === 401 || code === 403) {
          const userContext = {
            userId: req.user?.id || 'anonymous',
            username: req.user?.username || 'anonymous',
            role: req.user?.role || 'guest',
            sourceIP: req.ip || req.connection?.remoteAddress || 'unknown',
            userAgent: req.headers['user-agent'] || 'unknown',
            sessionId: req.sessionID || 'no-session'
          };

          self.auditLogger.logAccessEvent(code === 401 ? 'unauthorized' : 'forbidden', userContext, {
            correlationId,
            resource: req.originalUrl,
            action: req.method,
            success: false,
            statusCode: code,
            attemptedAccess: req.path,
            timestamp: new Date().toISOString()
          });
        }

        return originalStatus.call(this, code);
      };

      next();
    };
  }

  /**
   * Sanitize query parameters for logging
   */
  sanitizeQuery(query) {
    const sanitized = { ...query };
    const sensitiveParams = ['password', 'token', 'secret', 'key'];
    
    for (const param of sensitiveParams) {
      if (sanitized[param]) {
        sanitized[param] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }

  /**
   * Sanitize headers for logging
   */
  sanitizeHeaders(headers) {
    const sanitized = { ...headers };
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
    
    for (const header of sensitiveHeaders) {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    }
    
    return {
      'user-agent': sanitized['user-agent'],
      'content-type': sanitized['content-type'],
      'accept': sanitized['accept'],
      'x-forwarded-for': sanitized['x-forwarded-for']
    };
  }

  /**
   * Extract data type from request path
   */
  extractDataType(path) {
    if (path.includes('/patients')) return 'patient';
    if (path.includes('/studies')) return 'study';
    if (path.includes('/series')) return 'series';
    if (path.includes('/instances')) return 'instance';
    if (path.includes('/dicom')) return 'dicom';
    return 'unknown';
  }
}

// Create singleton instance
const auditMiddleware = new AuditMiddleware();

module.exports = {
  logRequest: auditMiddleware.logRequest.bind(auditMiddleware),
  logAuthentication: auditMiddleware.logAuthentication.bind(auditMiddleware),
  logDicomOperation: auditMiddleware.logDicomOperation.bind(auditMiddleware),
  logUnauthorizedAccess: auditMiddleware.logUnauthorizedAccess.bind(auditMiddleware)
};