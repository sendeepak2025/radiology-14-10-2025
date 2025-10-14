const express = require('express');
const { validateOrthancConnection } = require('../services/orthanc-client');
const { getQueueHealth } = require('../services/queue');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * Basic health check endpoint
 */
router.get('/', (req, res) => {
  res.json({
    success: true,
    service: 'DICOM Bridge',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

/**
 * Detailed health check with dependencies
 */
router.get('/detailed', async (req, res) => {
  const health = {
    service: 'DICOM Bridge',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    status: 'healthy',
    checks: {}
  };

  try {
    // Check Orthanc connectivity
    try {
      await validateOrthancConnection();
      health.checks.orthanc = {
        status: 'healthy',
        url: process.env.ORTHANC_URL,
        message: 'Connected successfully'
      };
    } catch (error) {
      health.checks.orthanc = {
        status: 'unhealthy',
        url: process.env.ORTHANC_URL,
        message: error.message
      };
      health.status = 'degraded';
    }

    // Check Redis/Queue connectivity
    try {
      const queueHealth = await getQueueHealth();
      health.checks.queue = {
        status: 'healthy',
        ...queueHealth
      };
    } catch (error) {
      health.checks.queue = {
        status: 'unhealthy',
        message: error.message
      };
      health.status = 'degraded';
    }

    // Check main API connectivity (optional)
    try {
      const axios = require('axios');
      const response = await axios.get(`${process.env.MAIN_API_URL}/`, {
        timeout: 5000
      });
      health.checks.mainApi = {
        status: response.status === 200 ? 'healthy' : 'unhealthy',
        url: process.env.MAIN_API_URL,
        statusCode: response.status
      };
    } catch (error) {
      health.checks.mainApi = {
        status: 'unhealthy',
        url: process.env.MAIN_API_URL,
        message: error.message
      };
      // Don't mark as degraded for main API issues
    }

    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);

  } catch (error) {
    logger.error('Health check failed', { error: error.message });
    res.status(503).json({
      ...health,
      status: 'unhealthy',
      error: error.message
    });
  }
});

/**
 * Orthanc-specific health check
 */
router.get('/orthanc', async (req, res) => {
  try {
    const orthancClient = require('../services/orthanc-client');
    const systemInfo = await orthancClient.getSystemInfo();
    
    res.json({
      success: true,
      orthanc: {
        status: 'connected',
        version: systemInfo.Version,
        name: systemInfo.Name,
        aet: systemInfo.DicomAet,
        port: systemInfo.DicomPort,
        storageSize: systemInfo.StorageSize,
        countPatients: systemInfo.CountPatients,
        countStudies: systemInfo.CountStudies,
        countSeries: systemInfo.CountSeries,
        countInstances: systemInfo.CountInstances
      }
    });
    
  } catch (error) {
    logger.error('Orthanc health check failed', { error: error.message });
    res.status(503).json({
      success: false,
      orthanc: {
        status: 'disconnected',
        error: error.message
      }
    });
  }
});

module.exports = router;