/**
 * AI Detection Controller
 * Handles AI-powered medical image analysis requests
 */

const { getAIDetectionService } = require('../services/ai-detection-service');
const Study = require('../models/Study');
const Instance = require('../models/Instance');
const AIAnalysis = require('../models/AIAnalysis');

/**
 * Analyze a study with AI
 * POST /api/ai/analyze/:studyUid
 */
async function analyzeStudy(req, res) {
  try {
    const { studyUid } = req.params;

    console.log(`AI analysis requested for study: ${studyUid}`);

    // Get study from database
    const study = await Study.findOne({ studyInstanceUID: studyUid });

    if (!study) {
      return res.status(404).json({
        success: false,
        message: 'Study not found'
      });
    }

    // Get first instance for analysis
    const instance = await Instance.findOne({ studyInstanceUID: studyUid }).limit(1);

    // Prepare study data for AI
    const studyData = {
      studyInstanceUID: study.studyInstanceUID,
      instanceId: instance ? instance.orthancInstanceId : null,
      frameIndex: 0,
      modality: study.modality,
      patientName: study.patientName,
      studyDescription: study.studyDescription
    };

    // Call AI service
    const aiService = getAIDetectionService();
    const result = await aiService.analyzeStudy(studyData);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'AI analysis failed',
        error: result.error
      });
    }

    // TODO: Save analysis result to database
    // await saveAnalysisResult(result.data);

    return res.json({
      success: true,
      data: result.data
    });

  } catch (error) {
    console.error('Error in AI analysis:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * Get AI service status
 * GET /api/ai/status
 */
async function getAIStatus(req, res) {
  try {
    const aiService = getAIDetectionService();
    const status = await aiService.getStatus();

    return res.json({
      success: true,
      data: status
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * Analyze uploaded image
 * POST /api/ai/analyze-upload
 */
async function analyzeUploadedImage(req, res) {
  try {
    const { imageBase64, modality } = req.body;

    if (!imageBase64) {
      return res.status(400).json({
        success: false,
        message: 'Image data required'
      });
    }

    const aiService = getAIDetectionService();
    const result = await aiService.analyzeImage(imageBase64, modality || 'CT');

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'AI analysis failed',
        error: result.error
      });
    }

    return res.json({
      success: true,
      data: result.data
    });

  } catch (error) {
    console.error('Error analyzing uploaded image:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

module.exports = {
  analyzeStudy,
  getAIStatus,
  analyzeUploadedImage
};
