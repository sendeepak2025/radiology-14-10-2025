const express = require('express');
const { getOrthancStudyService } = require('../services/orthanc-study-service');

const router = express.Router();

/**
 * Test PACS connection
 * GET /api/pacs/test
 */
router.get('/test', async (req, res) => {
  try {
    const orthancStudyService = getOrthancStudyService();
    const isConnected = await orthancStudyService.testConnection();
    
    res.json({
      success: true,
      data: {
        connected: isConnected,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Sync studies from PACS to database
 * POST /api/pacs/sync
 */
router.post('/sync', async (req, res) => {
  try {
    const orthancStudyService = getOrthancStudyService();
    const result = await orthancStudyService.syncPacsToDatabase();
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Debug: Check database instances for a study
 * GET /api/pacs/debug/:studyUid
 */
router.get('/debug/:studyUid', async (req, res) => {
  try {
    const { studyUid } = req.params;
    const Instance = require('../models/Instance');
    const Study = require('../models/Study');
    
    // Check study in database
    const study = await Study.findOne({ studyInstanceUID: studyUid }).lean();
    
    // Check instances in database
    const instances = await Instance.find({ studyInstanceUID: studyUid }).lean();
    
    res.json({
      success: true,
      data: {
        studyUid,
        study: study || 'Not found in database',
        instanceCount: instances.length,
        instances: instances.map(inst => ({
          _id: inst._id,
          instanceNumber: inst.instanceNumber,
          hasCloudinaryUrl: !!inst.cloudinaryUrl,
          hasCloudinaryPublicId: !!inst.cloudinaryPublicId,
          cloudinaryUrl: inst.cloudinaryUrl ? 'Present' : 'Missing',
          cloudinaryPublicId: inst.cloudinaryPublicId ? 'Present' : 'Missing'
        }))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Get studies from PACS only (for debugging)
 * GET /api/pacs/studies
 */
router.get('/studies', async (req, res) => {
  try {
    const orthancStudyService = getOrthancStudyService();
    const pacsStudies = await orthancStudyService.fetchStudiesFromPacs();
    
    res.json({
      success: true,
      data: pacsStudies
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Get unified studies (database + PACS)
 * GET /api/pacs/unified-studies
 */
router.get('/unified-studies', async (req, res) => {
  try {
    const orthancStudyService = getOrthancStudyService();
    const unifiedStudies = await orthancStudyService.getUnifiedStudies();
    
    res.json({
      success: true,
      data: unifiedStudies
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// PACS Upload Routes
const { 
  uploadSingle, 
  uploadBatch, 
  getUploadStatus, 
  testUploadConnection,
  uploadMiddleware 
} = require('../controllers/pacsUploadController');

/**
 * Upload single DICOM file to PACS with real-time processing
 * POST /api/pacs/upload
 */
router.post('/upload', uploadMiddleware().single('dicom'), uploadSingle);

/**
 * Upload multiple DICOM files to PACS with batch processing
 * POST /api/pacs/upload/batch
 */
router.post('/upload/batch', uploadMiddleware().array('dicom', 10), uploadBatch);

/**
 * Get PACS upload status and capabilities
 * GET /api/pacs/upload/status
 */
router.get('/upload/status', getUploadStatus);

/**
 * Test PACS upload connectivity
 * GET /api/pacs/upload/test
 */
router.get('/upload/test', testUploadConnection);

/**
 * Check environment configuration
 * GET /api/pacs/upload/config-check
 */
router.get('/upload/config-check', (req, res) => {
  const errors = [];
  const warnings = [];
  const config = {};

  // Check required environment variables
  if (!process.env.ORTHANC_URL) {
    errors.push('ORTHANC_URL is not set');
  } else {
    config.orthancUrl = process.env.ORTHANC_URL;
  }

  if (!process.env.ORTHANC_USERNAME) {
    errors.push('ORTHANC_USERNAME is not set');
  } else {
    config.orthancUsername = '***';
  }

  if (!process.env.ORTHANC_PASSWORD) {
    errors.push('ORTHANC_PASSWORD is not set');
  } else {
    config.orthancPassword = '***';
  }

  if (!process.env.MONGODB_URI) {
    errors.push('MONGODB_URI is not set');
  } else {
    config.mongodbUri = process.env.MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
  }

  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    warnings.push('CLOUDINARY_CLOUD_NAME is not set (optional for PACS uploads)');
  }

  const isValid = errors.length === 0;

  res.json({
    success: isValid,
    valid: isValid,
    message: isValid ? 'Environment configuration is valid' : 'Environment configuration has errors',
    errors: errors,
    warnings: warnings,
    config: config,
    recommendations: errors.length > 0 ? [
      'Check your .env file in the node-server directory',
      'Ensure Orthanc PACS server is running on the configured URL',
      'Verify MongoDB connection string is correct'
    ] : []
  });
});

module.exports = router;