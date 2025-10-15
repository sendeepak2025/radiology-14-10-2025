/**
 * AI Detection Routes
 */

const express = require('express');
const router = express.Router();
const { 
  analyzeStudy, 
  getAIStatus, 
  analyzeUploadedImage,
  getAnalysisHistory,
  getLatestAnalysis,
  updateReviewStatus
} = require('../controllers/aiDetectionController');

/**
 * Get AI service status
 * GET /api/ai/status
 */
router.get('/status', getAIStatus);

/**
 * Analyze a study with AI
 * POST /api/ai/analyze/:studyUid
 */
router.post('/analyze/:studyUid', analyzeStudy);

/**
 * Analyze uploaded image
 * POST /api/ai/analyze-upload
 */
router.post('/analyze-upload', express.json({ limit: '50mb' }), analyzeUploadedImage);

/**
 * Get AI analysis history for a study
 * GET /api/ai/analysis/:studyUid
 */
router.get('/analysis/:studyUid', getAnalysisHistory);

/**
 * Get latest AI analysis for a study
 * GET /api/ai/analysis/:studyUid/latest
 */
router.get('/analysis/:studyUid/latest', getLatestAnalysis);

/**
 * Update analysis review status
 * PUT /api/ai/analysis/:analysisId/review
 */
router.put('/analysis/:analysisId/review', express.json(), updateReviewStatus);

module.exports = router;
