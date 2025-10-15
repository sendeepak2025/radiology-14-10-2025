/**
 * AI Detection Service Integration
 * Connects to Python AI service for medical image analysis
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

class AIDetectionService {
  constructor(config = {}) {
    this.config = {
      aiServiceUrl: config.aiServiceUrl || process.env.AI_SERVICE_URL || 'http://localhost:8002',
      timeout: config.timeout || 120000, // 2 minutes for AI analysis
      ...config
    };

    this.client = axios.create({
      baseURL: this.config.aiServiceUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('AI Detection Service initialized:', this.config.aiServiceUrl);
  }

  /**
   * Check if AI service is available
   */
  async isAvailable() {
    try {
      const response = await this.client.get('/health');
      return response.data.status === 'healthy';
    } catch (error) {
      console.warn('AI service not available:', error.message);
      return false;
    }
  }

  /**
   * Analyze a study using AI
   */
  async analyzeStudy(studyData) {
    try {
      console.log(`Analyzing study with AI: ${studyData.studyInstanceUID}`);

      const request = {
        study_uid: studyData.studyInstanceUID,
        instance_id: studyData.instanceId || null,
        frame_index: studyData.frameIndex || 0,
        modality: studyData.modality || 'CT',
        patient_name: studyData.patientName || 'Unknown',
        study_description: studyData.studyDescription || ''
      };

      const response = await this.client.post('/api/ai/analyze', request);

      console.log(`AI analysis completed: ${response.data.analysis_id}`);

      return {
        success: true,
        data: response.data
      };

    } catch (error) {
      console.error('AI analysis error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Analyze base64-encoded image directly
   */
  async analyzeImage(imageBase64, modality = 'CT') {
    try {
      console.log('Analyzing uploaded image with AI...');

      const response = await this.client.post('/api/ai/analyze-image', {
        image_base64: imageBase64,
        modality: modality
      });

      return {
        success: true,
        data: response.data
      };

    } catch (error) {
      console.error('Image analysis error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get AI service status
   */
  async getStatus() {
    try {
      const response = await this.client.get('/health');
      return response.data;
    } catch (error) {
      return {
        status: 'unavailable',
        error: error.message
      };
    }
  }
}

// Singleton instance
let aiDetectionServiceInstance = null;

/**
 * Get singleton instance
 */
function getAIDetectionService(config = {}) {
  if (!aiDetectionServiceInstance) {
    aiDetectionServiceInstance = new AIDetectionService(config);
  }
  return aiDetectionServiceInstance;
}

module.exports = { AIDetectionService, getAIDetectionService };
