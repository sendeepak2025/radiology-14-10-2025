/**
 * AI Detection Routes
 */

const express = require('express');
const router = express.Router();
const { analyzeStudy, getAIStatus, analyzeUploadedImage } = require('../controllers/aiDetectionController');

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

module.exports = router;
