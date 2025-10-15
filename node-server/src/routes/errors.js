const express = require('express');
const router = express.Router();

/**
 * Error Logging Routes
 * Receives and stores frontend error logs
 */

// In-memory error storage (replace with database in production)
const errorLogs = [];
const MAX_LOGS = 1000; // Keep last 1000 errors

/**
 * POST /api/errors/log
 * Log a frontend error
 */
router.post('/log', async (req, res) => {
  try {
    const {
      message,
      stack,
      severity,
      context,
      timestamp,
      userAgent,
      url,
    } = req.body;

    const errorLog = {
      id: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      message,
      stack,
      severity,
      context,
      timestamp: timestamp || new Date().toISOString(),
      userAgent,
      url,
      ip: req.ip || req.connection.remoteAddress,
      headers: {
        referer: req.headers.referer,
        origin: req.headers.origin,
      },
    };

    // Store error (in production, save to MongoDB)
    errorLogs.unshift(errorLog);
    if (errorLogs.length > MAX_LOGS) {
      errorLogs.pop();
    }

    // Log to console
    console.error(
      `[${severity.toUpperCase()}] Frontend Error:`,
      message,
      context
    );

    // TODO: In production, save to MongoDB
    // await ErrorLog.create(errorLog);

    // TODO: Send critical errors to alerting service
    // if (severity === 'critical') {
    //   await sendSlackAlert(errorLog);
    //   await sendEmailAlert(errorLog);
    // }

    res.status(200).json({
      success: true,
      message: 'Error logged successfully',
      errorId: errorLog.id,
    });
  } catch (error) {
    console.error('Error logging frontend error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to log error',
    });
  }
});

/**
 * GET /api/errors/recent
 * Get recent error logs (admin only)
 */
router.get('/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const severity = req.query.severity;

    let logs = errorLogs;

    // Filter by severity if specified
    if (severity) {
      logs = logs.filter((log) => log.severity === severity);
    }

    res.json({
      success: true,
      data: logs.slice(0, limit),
      total: logs.length,
    });
  } catch (error) {
    console.error('Error fetching error logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch error logs',
    });
  }
});

/**
 * GET /api/errors/stats
 * Get error statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = {
      total: errorLogs.length,
      bySeverity: {
        low: errorLogs.filter((log) => log.severity === 'low').length,
        medium: errorLogs.filter((log) => log.severity === 'medium').length,
        high: errorLogs.filter((log) => log.severity === 'high').length,
        critical: errorLogs.filter((log) => log.severity === 'critical').length,
      },
      recentCritical: errorLogs
        .filter((log) => log.severity === 'critical')
        .slice(0, 10),
      lastHour: errorLogs.filter(
        (log) =>
          new Date(log.timestamp) > new Date(Date.now() - 60 * 60 * 1000)
      ).length,
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error fetching error stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch error statistics',
    });
  }
});

/**
 * DELETE /api/errors/clear
 * Clear error logs (admin only)
 */
router.delete('/clear', async (req, res) => {
  try {
    const count = errorLogs.length;
    errorLogs.length = 0;

    res.json({
      success: true,
      message: `Cleared ${count} error logs`,
    });
  } catch (error) {
    console.error('Error clearing error logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear error logs',
    });
  }
});

module.exports = router;
