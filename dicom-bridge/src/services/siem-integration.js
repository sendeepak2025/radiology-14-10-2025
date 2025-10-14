const AWS = require('aws-sdk');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');
const { promisify } = require('util');
const gzip = promisify(zlib.gzip);
const logger = require('../utils/logger');
const AuditLogger = require('../utils/audit-logger');

/**
 * SIEM Integration Service
 * Handles export of audit logs to SIEM systems and S3 with object lock
 */
class SiemIntegrationService {
  constructor(options = {}) {
    this.serviceName = 'siem-integration';
    this.auditLogger = new AuditLogger({ serviceName: this.serviceName });
    
    // S3 Configuration
    this.s3Config = {
      region: process.env.AWS_REGION || 'us-east-1',
      bucket: process.env.AUDIT_S3_BUCKET || 'dicom-bridge-audit-logs',
      keyPrefix: process.env.AUDIT_S3_PREFIX || 'audit-logs/',
      objectLockEnabled: process.env.AUDIT_S3_OBJECT_LOCK === 'true'
    };
    
    // SIEM Configuration
    this.siemConfig = {
      type: process.env.SIEM_TYPE || 'splunk', // splunk, elasticsearch, sumo
      endpoint: process.env.SIEM_ENDPOINT,
      token: process.env.SIEM_TOKEN,
      index: process.env.SIEM_INDEX || 'dicom-bridge-audit',
      batchSize: parseInt(process.env.SIEM_BATCH_SIZE) || 100,
      retryAttempts: parseInt(process.env.SIEM_RETRY_ATTEMPTS) || 3
    };
    
    // Retention Configuration
    this.retentionConfig = {
      auditLogRetentionDays: parseInt(process.env.AUDIT_LOG_RETENTION_DAYS) || 2555, // 7 years
      archiveAfterDays: parseInt(process.env.AUDIT_ARCHIVE_AFTER_DAYS) || 90,
      compressionEnabled: process.env.AUDIT_COMPRESSION_ENABLED !== 'false'
    };
    
    // Initialize AWS S3 client
    this.s3Client = new AWS.S3({
      region: this.s3Config.region,
      ...(process.env.AWS_ACCESS_KEY_ID && {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      })
    });
    
    // Export queue for batching
    this.exportQueue = [];
    this.isProcessingQueue = false;
    
    // Start periodic export if configured
    if (process.env.AUDIT_EXPORT_INTERVAL_MINUTES) {
      this.startPeriodicExport(parseInt(process.env.AUDIT_EXPORT_INTERVAL_MINUTES));
    }
  }

  /**
   * Export audit logs to S3 with object lock
   */
  async exportToS3(logEntries, options = {}) {
    const correlationId = this.auditLogger.generateCorrelationId();
    const exportId = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    
    try {
      this.auditLogger.logSystemEvent('s3_export_started', {
        component: this.serviceName,
        operation: 's3_export'
      }, {
        correlationId,
        exportId,
        entryCount: logEntries.length,
        bucket: this.s3Config.bucket
      });

      // Prepare log data
      const exportData = {
        exportId,
        timestamp,
        service: 'dicom-bridge',
        entryCount: logEntries.length,
        entries: logEntries
      };

      // Convert to JSON and optionally compress
      let logData = JSON.stringify(exportData, null, 2);
      let contentType = 'application/json';
      let contentEncoding = null;

      if (this.retentionConfig.compressionEnabled) {
        logData = await gzip(logData);
        contentEncoding = 'gzip';
        contentType = 'application/json';
      }

      // Generate S3 key with date partitioning
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hour = String(date.getHours()).padStart(2, '0');
      
      const s3Key = `${this.s3Config.keyPrefix}year=${year}/month=${month}/day=${day}/hour=${hour}/${exportId}.json${this.retentionConfig.compressionEnabled ? '.gz' : ''}`;

      // S3 upload parameters
      const uploadParams = {
        Bucket: this.s3Config.bucket,
        Key: s3Key,
        Body: logData,
        ContentType: contentType,
        ...(contentEncoding && { ContentEncoding: contentEncoding }),
        Metadata: {
          'export-id': exportId,
          'correlation-id': correlationId,
          'entry-count': logEntries.length.toString(),
          'export-timestamp': timestamp,
          'service': 'dicom-bridge'
        },
        // Object lock configuration if enabled
        ...(this.s3Config.objectLockEnabled && {
          ObjectLockMode: 'COMPLIANCE',
          ObjectLockRetainUntilDate: new Date(Date.now() + (this.retentionConfig.auditLogRetentionDays * 24 * 60 * 60 * 1000))
        })
      };

      // Upload to S3
      const uploadResult = await this.s3Client.upload(uploadParams).promise();

      this.auditLogger.logSystemEvent('s3_export_completed', {
        component: this.serviceName,
        operation: 's3_export',
        result: 'success'
      }, {
        correlationId,
        exportId,
        s3Location: uploadResult.Location,
        s3Key,
        dataSize: logData.length,
        compressed: this.retentionConfig.compressionEnabled
      });

      return {
        success: true,
        exportId,
        s3Location: uploadResult.Location,
        s3Key,
        entryCount: logEntries.length,
        dataSize: logData.length,
        compressed: this.retentionConfig.compressionEnabled
      };

    } catch (error) {
      this.auditLogger.logSystemEvent('s3_export_failed', {
        component: this.serviceName,
        operation: 's3_export',
        result: 'failure'
      }, {
        correlationId,
        exportId,
        error: error.message,
        stack: error.stack
      });

      throw new Error(`S3 export failed: ${error.message}`);
    }
  }

  /**
   * Export audit logs to SIEM system
   */
  async exportToSiem(logEntries, options = {}) {
    const correlationId = this.auditLogger.generateCorrelationId();
    const exportId = crypto.randomUUID();
    
    try {
      this.auditLogger.logSystemEvent('siem_export_started', {
        component: this.serviceName,
        operation: 'siem_export'
      }, {
        correlationId,
        exportId,
        entryCount: logEntries.length,
        siemType: this.siemConfig.type
      });

      let exportResult;
      
      switch (this.siemConfig.type.toLowerCase()) {
        case 'splunk':
          exportResult = await this.exportToSplunk(logEntries, correlationId);
          break;
        case 'elasticsearch':
          exportResult = await this.exportToElasticsearch(logEntries, correlationId);
          break;
        case 'sumo':
          exportResult = await this.exportToSumoLogic(logEntries, correlationId);
          break;
        default:
          throw new Error(`Unsupported SIEM type: ${this.siemConfig.type}`);
      }

      this.auditLogger.logSystemEvent('siem_export_completed', {
        component: this.serviceName,
        operation: 'siem_export',
        result: 'success'
      }, {
        correlationId,
        exportId,
        siemType: this.siemConfig.type,
        ...exportResult
      });

      return {
        success: true,
        exportId,
        siemType: this.siemConfig.type,
        ...exportResult
      };

    } catch (error) {
      this.auditLogger.logSystemEvent('siem_export_failed', {
        component: this.serviceName,
        operation: 'siem_export',
        result: 'failure'
      }, {
        correlationId,
        exportId,
        error: error.message,
        stack: error.stack
      });

      throw new Error(`SIEM export failed: ${error.message}`);
    }
  }

  /**
   * Export to Splunk HEC
   */
  async exportToSplunk(logEntries, correlationId) {
    const axios = require('axios');
    
    // Format entries for Splunk HEC
    const splunkEvents = logEntries.map(entry => ({
      time: Math.floor(new Date(entry.timestamp).getTime() / 1000),
      source: 'dicom-bridge',
      sourcetype: 'audit_log',
      index: this.siemConfig.index,
      event: entry
    }));

    // Send in batches
    const batches = this.chunkArray(splunkEvents, this.siemConfig.batchSize);
    let totalSent = 0;
    
    for (const batch of batches) {
      const response = await axios.post(
        `${this.siemConfig.endpoint}/services/collector/event`,
        batch.map(event => JSON.stringify(event)).join('\n'),
        {
          headers: {
            'Authorization': `Splunk ${this.siemConfig.token}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );
      
      if (response.status !== 200) {
        throw new Error(`Splunk export failed with status ${response.status}`);
      }
      
      totalSent += batch.length;
    }

    return {
      entriesSent: totalSent,
      batchCount: batches.length,
      endpoint: this.siemConfig.endpoint
    };
  }

  /**
   * Export to Elasticsearch
   */
  async exportToElasticsearch(logEntries, correlationId) {
    const axios = require('axios');
    
    // Format entries for Elasticsearch bulk API
    const bulkBody = [];
    logEntries.forEach(entry => {
      bulkBody.push({
        index: {
          _index: this.siemConfig.index,
          _type: '_doc'
        }
      });
      bulkBody.push(entry);
    });

    const response = await axios.post(
      `${this.siemConfig.endpoint}/_bulk`,
      bulkBody.map(item => JSON.stringify(item)).join('\n') + '\n',
      {
        headers: {
          'Content-Type': 'application/x-ndjson',
          ...(this.siemConfig.token && {
            'Authorization': `Bearer ${this.siemConfig.token}`
          })
        },
        timeout: 30000
      }
    );

    if (response.status !== 200) {
      throw new Error(`Elasticsearch export failed with status ${response.status}`);
    }

    return {
      entriesSent: logEntries.length,
      took: response.data.took,
      errors: response.data.errors
    };
  }

  /**
   * Export to Sumo Logic
   */
  async exportToSumoLogic(logEntries, correlationId) {
    const axios = require('axios');
    
    // Format entries for Sumo Logic
    const sumoData = logEntries.map(entry => JSON.stringify(entry)).join('\n');

    const response = await axios.post(
      this.siemConfig.endpoint,
      sumoData,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Sumo-Category': 'dicom-bridge/audit',
          'X-Sumo-Name': 'audit-logs'
        },
        timeout: 30000
      }
    );

    if (response.status !== 200) {
      throw new Error(`Sumo Logic export failed with status ${response.status}`);
    }

    return {
      entriesSent: logEntries.length,
      endpoint: this.siemConfig.endpoint
    };
  }

  /**
   * Read audit logs from file system
   */
  async readAuditLogs(startDate, endDate, options = {}) {
    const correlationId = this.auditLogger.generateCorrelationId();
    
    try {
      const auditLogPath = path.join(process.cwd(), 'logs', 'audit.log');
      const logContent = await fs.readFile(auditLogPath, 'utf8');
      
      // Parse log entries
      const logEntries = logContent
        .split('\n')
        .filter(line => line.trim())
        .map(line => {
          try {
            return JSON.parse(line);
          } catch (error) {
            logger.warn('Failed to parse log line', { line, error: error.message });
            return null;
          }
        })
        .filter(entry => entry !== null);

      // Filter by date range if provided
      let filteredEntries = logEntries;
      if (startDate || endDate) {
        filteredEntries = logEntries.filter(entry => {
          const entryDate = new Date(entry.timestamp);
          if (startDate && entryDate < new Date(startDate)) return false;
          if (endDate && entryDate > new Date(endDate)) return false;
          return true;
        });
      }

      this.auditLogger.logSystemEvent('audit_logs_read', {
        component: this.serviceName,
        operation: 'read_logs'
      }, {
        correlationId,
        totalEntries: logEntries.length,
        filteredEntries: filteredEntries.length,
        startDate,
        endDate
      });

      return filteredEntries;

    } catch (error) {
      this.auditLogger.logSystemEvent('audit_logs_read_failed', {
        component: this.serviceName,
        operation: 'read_logs',
        result: 'failure'
      }, {
        correlationId,
        error: error.message
      });

      throw new Error(`Failed to read audit logs: ${error.message}`);
    }
  }

  /**
   * Implement log retention policy
   */
  async enforceRetentionPolicy() {
    const correlationId = this.auditLogger.generateCorrelationId();
    
    try {
      this.auditLogger.logSystemEvent('retention_policy_started', {
        component: this.serviceName,
        operation: 'retention_enforcement'
      }, {
        correlationId,
        retentionDays: this.retentionConfig.auditLogRetentionDays,
        archiveAfterDays: this.retentionConfig.archiveAfterDays
      });

      // List objects in S3 bucket older than retention period
      const cutoffDate = new Date(Date.now() - (this.retentionConfig.auditLogRetentionDays * 24 * 60 * 60 * 1000));
      const archiveDate = new Date(Date.now() - (this.retentionConfig.archiveAfterDays * 24 * 60 * 60 * 1000));

      const listParams = {
        Bucket: this.s3Config.bucket,
        Prefix: this.s3Config.keyPrefix
      };

      const objects = await this.s3Client.listObjectsV2(listParams).promise();
      
      let archivedCount = 0;
      let deletedCount = 0;

      for (const object of objects.Contents || []) {
        const objectDate = new Date(object.LastModified);
        
        if (objectDate < cutoffDate) {
          // Delete objects older than retention period
          await this.s3Client.deleteObject({
            Bucket: this.s3Config.bucket,
            Key: object.Key
          }).promise();
          deletedCount++;
          
        } else if (objectDate < archiveDate) {
          // Archive objects older than archive threshold
          await this.s3Client.copyObject({
            Bucket: this.s3Config.bucket,
            CopySource: `${this.s3Config.bucket}/${object.Key}`,
            Key: object.Key.replace(this.s3Config.keyPrefix, `${this.s3Config.keyPrefix}archive/`),
            StorageClass: 'GLACIER'
          }).promise();
          archivedCount++;
        }
      }

      this.auditLogger.logSystemEvent('retention_policy_completed', {
        component: this.serviceName,
        operation: 'retention_enforcement',
        result: 'success'
      }, {
        correlationId,
        archivedCount,
        deletedCount,
        totalProcessed: objects.Contents?.length || 0
      });

      return {
        success: true,
        archivedCount,
        deletedCount,
        totalProcessed: objects.Contents?.length || 0
      };

    } catch (error) {
      this.auditLogger.logSystemEvent('retention_policy_failed', {
        component: this.serviceName,
        operation: 'retention_enforcement',
        result: 'failure'
      }, {
        correlationId,
        error: error.message
      });

      throw new Error(`Retention policy enforcement failed: ${error.message}`);
    }
  }

  /**
   * Start periodic export of audit logs
   */
  startPeriodicExport(intervalMinutes) {
    const intervalMs = intervalMinutes * 60 * 1000;
    
    setInterval(async () => {
      try {
        await this.exportAuditLogs();
      } catch (error) {
        logger.error('Periodic audit export failed', {
          error: error.message,
          stack: error.stack
        });
      }
    }, intervalMs);

    logger.info('Started periodic audit export', {
      intervalMinutes,
      nextExport: new Date(Date.now() + intervalMs).toISOString()
    });
  }

  /**
   * Export audit logs (main export function)
   */
  async exportAuditLogs(startDate = null, endDate = null) {
    const correlationId = this.auditLogger.generateCorrelationId();
    
    try {
      // Read audit logs
      const logEntries = await this.readAuditLogs(startDate, endDate);
      
      if (logEntries.length === 0) {
        logger.info('No audit logs to export', { correlationId });
        return { success: true, entriesExported: 0 };
      }

      const results = {};

      // Export to S3 if configured
      if (this.s3Config.bucket) {
        results.s3 = await this.exportToS3(logEntries);
      }

      // Export to SIEM if configured
      if (this.siemConfig.endpoint) {
        results.siem = await this.exportToSiem(logEntries);
      }

      return {
        success: true,
        entriesExported: logEntries.length,
        correlationId,
        results
      };

    } catch (error) {
      logger.error('Audit log export failed', {
        correlationId,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Utility function to chunk array into smaller arrays
   */
  chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Health check for SIEM integration
   */
  async healthCheck() {
    const correlationId = this.auditLogger.generateCorrelationId();
    const health = {
      service: this.serviceName,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      correlationId,
      checks: {}
    };

    try {
      // Check S3 connectivity
      if (this.s3Config.bucket) {
        try {
          await this.s3Client.headBucket({ Bucket: this.s3Config.bucket }).promise();
          health.checks.s3 = { status: 'healthy', bucket: this.s3Config.bucket };
        } catch (error) {
          health.checks.s3 = { status: 'unhealthy', error: error.message };
          health.status = 'degraded';
        }
      }

      // Check SIEM connectivity
      if (this.siemConfig.endpoint) {
        try {
          const axios = require('axios');
          await axios.get(this.siemConfig.endpoint, { timeout: 5000 });
          health.checks.siem = { status: 'healthy', type: this.siemConfig.type };
        } catch (error) {
          health.checks.siem = { status: 'unhealthy', error: error.message };
          health.status = 'degraded';
        }
      }

      return health;

    } catch (error) {
      health.status = 'unhealthy';
      health.error = error.message;
      return health;
    }
  }
}

module.exports = SiemIntegrationService;