const express = require('express');
const { getSecretManager, getApplicationSecrets } = require('../services/secret-manager');
const { configureCloudinary } = require('../config/cloudinary');

const router = express.Router();

/**
 * Manual secret refresh endpoint (admin only)
 */
router.post('/refresh', async (req, res) => {
  try {
    console.log('Manual secret refresh requested', {
      userAgent: req.headers['user-agent'],
      ip: req.ip
    });

    // Clear secret cache
    const secretManager = getSecretManager();
    secretManager.clearCache();

    // Reload application secrets
    const secrets = await getApplicationSecrets();
    
    // Update environment variables
    process.env.MONGODB_URI = secrets.database.uri || process.env.MONGODB_URI;
    process.env.CLOUDINARY_CLOUD_NAME = secrets.cloudinary.cloudName || process.env.CLOUDINARY_CLOUD_NAME;
    process.env.CLOUDINARY_API_KEY = secrets.cloudinary.apiKey || process.env.CLOUDINARY_API_KEY;
    process.env.CLOUDINARY_API_SECRET = secrets.cloudinary.apiSecret || process.env.CLOUDINARY_API_SECRET;

    // Reconfigure Cloudinary with new secrets
    configureCloudinary({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });

    console.log('Secrets refreshed successfully');

    res.json({
      success: true,
      message: 'Secrets refreshed successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Manual secret refresh failed', { error: error.message });
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
    console.error('Failed to get secret manager status', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get status'
    });
  }
});

module.exports = router;