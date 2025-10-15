const express = require('express');
const mongoose = require('mongoose');
const os = require('os');
const router = express.Router();

/**
 * Health Monitoring Routes
 * Comprehensive health checks for all system components
 */

// Health check cache to avoid excessive checks
let healthCache = null;
let lastHealthCheck = 0;
const HEALTH_CACHE_TTL = 30000; // 30 seconds

/**
 * GET /api/health
 * Quick health check endpoint
 */
router.get('/', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    };

    res.json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/health/detailed
 * Comprehensive health check with all dependencies
 */
router.get('/detailed', async (req, res) => {
  try {
    // Use cache if available and fresh
    const now = Date.now();
    if (healthCache && now - lastHealthCheck < HEALTH_CACHE_TTL) {
      return res.json(healthCache);
    }

    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: {
        process: process.uptime(),
        system: os.uptime(),
      },
      checks: {
        database: await checkDatabase(),
        memory: checkMemory(),
        disk: checkDisk(),
        aiService: await checkAIService(),
      },
    };

    // Determine overall health status
    const unhealthyChecks = Object.values(health.checks).filter(
      (check) => check.status !== 'healthy'
    );

    if (unhealthyChecks.length > 0) {
      health.status = 'degraded';
    }

    // Cache the result
    healthCache = health;
    lastHealthCheck = now;

    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    console.error('Health check error:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/health/database
 * Database connectivity check
 */
router.get('/database', async (req, res) => {
  try {
    const dbHealth = await checkDatabase();
    const statusCode = dbHealth.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(dbHealth);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/health/metrics
 * System metrics and statistics
 */
router.get('/metrics', async (req, res) => {
  try {
    const metrics = {
      timestamp: new Date().toISOString(),
      process: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        pid: process.pid,
        version: process.version,
      },
      system: {
        platform: os.platform(),
        arch: os.arch(),
        hostname: os.hostname(),
        uptime: os.uptime(),
        loadavg: os.loadavg(),
        totalmem: os.totalmem(),
        freemem: os.freemem(),
        cpus: os.cpus().length,
      },
      nodejs: {
        version: process.version,
        memoryUsage: process.memoryUsage(),
      },
    };

    res.json(metrics);
  } catch (error) {
    res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Helper Functions

/**
 * Check MongoDB database connection
 */
async function checkDatabase() {
  try {
    const state = mongoose.connection.readyState;
    const stateMap = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
    };

    if (state !== 1) {
      return {
        status: 'unhealthy',
        message: `Database ${stateMap[state]}`,
        state: stateMap[state],
        timestamp: new Date().toISOString(),
      };
    }

    // Test actual query
    const startTime = Date.now();
    await mongoose.connection.db.admin().ping();
    const responseTime = Date.now() - startTime;

    // Get database stats
    const stats = await mongoose.connection.db.stats();

    return {
      status: 'healthy',
      message: 'Database connected',
      responseTime: `${responseTime}ms`,
      database: mongoose.connection.name,
      collections: stats.collections,
      dataSize: `${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`,
      indexSize: `${(stats.indexSize / 1024 / 1024).toFixed(2)} MB`,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: 'Database connection error',
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Check system memory
 */
function checkMemory() {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memoryUsagePercent = (usedMem / totalMem) * 100;

  const processMemory = process.memoryUsage();

  return {
    status: memoryUsagePercent > 90 ? 'warning' : 'healthy',
    system: {
      total: `${(totalMem / 1024 / 1024 / 1024).toFixed(2)} GB`,
      used: `${(usedMem / 1024 / 1024 / 1024).toFixed(2)} GB`,
      free: `${(freeMem / 1024 / 1024 / 1024).toFixed(2)} GB`,
      usagePercent: `${memoryUsagePercent.toFixed(2)}%`,
    },
    process: {
      rss: `${(processMemory.rss / 1024 / 1024).toFixed(2)} MB`,
      heapTotal: `${(processMemory.heapTotal / 1024 / 1024).toFixed(2)} MB`,
      heapUsed: `${(processMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`,
      external: `${(processMemory.external / 1024 / 1024).toFixed(2)} MB`,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Check disk space (placeholder - requires additional package)
 */
function checkDisk() {
  // Note: For production, install 'check-disk-space' package
  // const diskSpace = require('check-disk-space').default;
  
  return {
    status: 'healthy',
    message: 'Disk space monitoring not configured',
    note: 'Install check-disk-space package for full disk monitoring',
    timestamp: new Date().toISOString(),
  };
}

/**
 * Check AI service availability
 */
async function checkAIService() {
  try {
    const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:5000';
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${AI_SERVICE_URL}/health`, {
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    if (response.ok) {
      return {
        status: 'healthy',
        message: 'AI service available',
        url: AI_SERVICE_URL,
        timestamp: new Date().toISOString(),
      };
    } else {
      return {
        status: 'unhealthy',
        message: 'AI service returned error',
        statusCode: response.status,
        url: AI_SERVICE_URL,
        timestamp: new Date().toISOString(),
      };
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      message: 'AI service unavailable',
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
}

module.exports = router;
