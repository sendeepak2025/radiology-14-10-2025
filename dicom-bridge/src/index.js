require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const logger = require('./utils/logger');
const webhookRoutes = require('./routes/webhook');
const healthRoutes = require('./routes/health');
const secretsRoutes = require('./routes/secrets');
const certificateRoutes = require('./routes/certificates');
const { initializeQueue } = require('./services/queue');
const { validateOrthancConnection } = require('./services/orthanc-client');
const { getSecretManager, getApplicationSecrets } = require('./services/secret-manager');
const SecurityAuditLogger = require('./utils/security-audit-logger');
const SecurityLoggingMiddleware = require('./middleware/security-logging');
const CertificateManager = require('./services/CertificateManager');
const CertificateMonitor = require('./utils/certificateMonitor');
const { ensureLogsDirectory } = require('./utils/ensure-logs-dir');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize security audit logger and middleware
const securityAuditLogger = new SecurityAuditLogger({
  serviceName: 'dicom-bridge',
  version: process.env.SERVICE_VERSION || '1.0.0'
});

const securityLoggingMiddleware = new SecurityLoggingMiddleware({
  serviceName: 'dicom-bridge',
  version: process.env.SERVICE_VERSION || '1.0.0',
  logAllRequests: process.env.LOG_ALL_REQUESTS === 'true'
});

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));

// Rate limiting with security logging
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP',
  onLimitReached: (req, res, options) => {
    const sourceIP = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    securityAuditLogger.logRateLimitViolation(
      sourceIP,
      options.max,
      options.max,
      options.windowMs,
      {
        userAgent,
        path: req.path,
        method: req.method
      }
    );
  }
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Security logging middleware
app.use(securityLoggingMiddleware.middleware());

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    correlationId: req.correlationId,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });
  next();
});

// Routes
app.use('/health', healthRoutes);
app.use('/api/orthanc', webhookRoutes);
app.use('/api/secrets', secretsRoutes);
app.use('/api/certificates', certificateRoutes);

// Error handling with security logging
app.use((err, req, res, next) => {
  const sourceIP = req.ip || req.connection.remoteAddress || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';
  
  // Log security-relevant errors
  const correlationId = securityAuditLogger.logSystemSecurityEvent('unhandled_error', {
    sourceIP,
    userAgent,
    path: req.path,
    method: req.method,
    error: err.message,
    stack: err.stack
  });

  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    correlationId,
    sourceIP,
    path: req.path,
    method: req.method
  });

  res.status(500).json({
    success: false,
    message: 'Internal server error',
    correlationId
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  // Shutdown certificate services
  const certificateManager = app.get('certificateManager');
  const certificateMonitor = app.get('certificateMonitor');
  
  if (certificateManager) {
    await certificateManager.shutdown();
  }
  
  if (certificateMonitor) {
    certificateMonitor.shutdown();
  }
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  
  // Shutdown certificate services
  const certificateManager = app.get('certificateManager');
  const certificateMonitor = app.get('certificateMonitor');
  
  if (certificateManager) {
    await certificateManager.shutdown();
  }
  
  if (certificateMonitor) {
    certificateMonitor.shutdown();
  }
  
  process.exit(0);
});

// Initialize services and start server
async function startServer() {
  try {
    // Ensure logs directory exists
    ensureLogsDirectory();
    
    // Initialize certificate manager
    logger.info('Initializing certificate management...');
    const certificateManager = new CertificateManager({
      certsDir: process.env.CERTS_DIR || '/app/certs',
      renewalThresholdDays: parseInt(process.env.CERT_RENEWAL_THRESHOLD_DAYS) || 30,
      checkIntervalHours: parseInt(process.env.CERT_CHECK_INTERVAL_HOURS) || 24,
      enableAutoRenewal: process.env.CERT_AUTO_RENEWAL !== 'false',
      notificationWebhook: process.env.CERT_NOTIFICATION_WEBHOOK,
      logger: logger
    });
    
    // Initialize certificate monitor
    const certificateMonitor = new CertificateMonitor(certificateManager, {
      enableSlackAlerts: process.env.SLACK_ALERTS_ENABLED === 'true',
      slackWebhookUrl: process.env.SLACK_WEBHOOK_URL,
      enableEmailAlerts: process.env.EMAIL_ALERTS_ENABLED === 'true',
      logger: logger
    });
    
    // Make certificate manager available to routes
    app.set('certificateManager', certificateManager);
    app.set('certificateMonitor', certificateMonitor);
    
    try {
      await certificateManager.initialize();
      certificateMonitor.startMonitoring();
      logger.info('Certificate management initialized successfully');
    } catch (certError) {
      logger.warn('Certificate management initialization failed:', certError.message);
      logger.warn('Continuing without certificate management...');
    }

    // Initialize secret manager and load secrets
    logger.info('Initializing secret management...');
    const secretManager = getSecretManager();
    
    // Test secret manager connectivity
    const secretsAvailable = await secretManager.testConnection();
    if (!secretsAvailable) {
      logger.warn('Secret manager not available, falling back to environment variables');
    } else {
      // Load application secrets and update environment
      try {
        const secrets = await getApplicationSecrets();
        
        // Update environment variables with secrets (use fallback values if secrets not available)
        process.env.ORTHANC_URL = secrets.orthanc.url || process.env.ORTHANC_URL;
        process.env.ORTHANC_USERNAME = secrets.orthanc.username || process.env.ORTHANC_USERNAME_FALLBACK;
        process.env.ORTHANC_PASSWORD = secrets.orthanc.password || process.env.ORTHANC_PASSWORD_FALLBACK;
        process.env.WEBHOOK_SECRET = secrets.webhook.secret || process.env.WEBHOOK_SECRET_FALLBACK;
        process.env.MONGODB_URI = secrets.database.uri || process.env.MONGODB_URI_FALLBACK;
        process.env.CLOUDINARY_CLOUD_NAME = secrets.cloudinary.cloudName || process.env.CLOUDINARY_CLOUD_NAME_FALLBACK;
        process.env.CLOUDINARY_API_KEY = secrets.cloudinary.apiKey || process.env.CLOUDINARY_API_KEY_FALLBACK;
        process.env.CLOUDINARY_API_SECRET = secrets.cloudinary.apiSecret || process.env.CLOUDINARY_API_SECRET_FALLBACK;
        
        logger.info('Application secrets loaded successfully');
      } catch (secretError) {
        logger.warn('Failed to load secrets, using environment variables', {
          error: secretError.message
        });
      }
    }

    // Validate Orthanc connection
    await validateOrthancConnection();
    logger.info('Orthanc connection validated');

    // Initialize job queue
    await initializeQueue();
    logger.info('Job queue initialized');

    // Start server
    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`DICOM Bridge server running on port ${PORT}`, {
        environment: process.env.NODE_ENV,
        orthancUrl: process.env.ORTHANC_URL,
        mainApiUrl: process.env.MAIN_API_URL,
        secretsEnabled: secretsAvailable
      });

      // Log service startup
      securityAuditLogger.logSystemSecurityEvent('service_startup', {
        port: PORT,
        environment: process.env.NODE_ENV,
        secretsEnabled: secretsAvailable,
        version: process.env.SERVICE_VERSION || '1.0.0'
      });
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();