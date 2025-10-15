/**
 * AI Detection Service
 * Handles communication with AI detection backend
 */

import ApiService from './ApiService';

export interface AIFinding {
  category: 'tumor' | 'fracture' | 'calcification' | 'lesion' | 'normal' | 'other';
  description: string;
  location: string | null;
  confidence: 'high' | 'moderate' | 'low';
  severity: 'critical' | 'high' | 'moderate' | 'low' | 'none';
}

export interface AIAnalysisResult {
  study_uid: string;
  analysis_id: string;
  timestamp: string;
  summary: string;
  findings: AIFinding[];
  recommendations: string[];
  ai_confidence: 'high' | 'moderate' | 'low';
  model_used: string;
}

export interface AIAnalysisHistory {
  studyInstanceUID: string;
  analysisId: string;
  modelUsed: string;
  analysisTimestamp: string;
  summary: string;
  findings: AIFinding[];
  recommendations: string[];
  aiConfidence: string;
  reviewStatus: 'pending' | 'confirmed' | 'rejected' | 'modified';
  reviewedBy: string | null;
  reviewedAt: string | null;
  radiologistNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewUpdateRequest {
  reviewStatus: 'confirmed' | 'rejected' | 'modified';
  radiologistNotes?: string;
  reviewedBy: string;
}

class AIDetectionService {
  private static instance: AIDetectionService;
  private baseUrl: string;

  private constructor() {
    this.baseUrl = import.meta.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
  }

  public static getInstance(): AIDetectionService {
    if (!AIDetectionService.instance) {
      AIDetectionService.instance = new AIDetectionService();
    }
    return AIDetectionService.instance;
  }

  /**
   * Check AI service status
   */
  async getStatus(): Promise<{
    status: string;
    model: string;
    api_key_configured: boolean;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/ai/status`);
      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error getting AI status:', error);
      throw error;
    }
  }

  /**
   * Trigger AI analysis for a study
   */
  async analyzeStudy(studyUid: string): Promise<AIAnalysisResult> {
    try {
      console.log(`Triggering AI analysis for study: ${studyUid}`);
      
      const response = await fetch(`${this.baseUrl}/api/ai/analyze/${studyUid}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`AI analysis failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'AI analysis failed');
      }

      console.log('AI analysis completed:', data.data.analysis_id);
      return data.data;
    } catch (error) {
      console.error('Error analyzing study:', error);
      throw error;
    }
  }

  /**
   * Get analysis history for a study
   */
  async getAnalysisHistory(studyUid: string): Promise<AIAnalysisHistory[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/ai/analysis/${studyUid}`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to get analysis history');
      }

      return data.data;
    } catch (error) {
      console.error('Error getting analysis history:', error);
      throw error;
    }
  }

  /**
   * Get latest analysis for a study
   */
  async getLatestAnalysis(studyUid: string): Promise<AIAnalysisHistory | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/ai/analysis/${studyUid}/latest`);
      
      if (response.status === 404) {
        return null;
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to get latest analysis');
      }

      return data.data;
    } catch (error) {
      console.error('Error getting latest analysis:', error);
      throw error;
    }
  }

  /**
   * Update review status of an analysis
   */
  async updateReviewStatus(
    analysisId: string,
    update: ReviewUpdateRequest
  ): Promise<AIAnalysisHistory> {
    try {
      const response = await fetch(`${this.baseUrl}/api/ai/analysis/${analysisId}/review`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(update),
      });

      if (!response.ok) {
        throw new Error(`Failed to update review: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to update review');
      }

      return data.data;
    } catch (error) {
      console.error('Error updating review status:', error);
      throw error;
    }
  }

  /**
   * Analyze uploaded image
   */
  async analyzeUploadedImage(
    imageBase64: string,
    modality: string = 'CT'
  ): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/ai/analyze-upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64,
          modality,
        }),
      });

      if (!response.ok) {
        throw new Error(`Image analysis failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Image analysis failed');
      }

      return data.data;
    } catch (error) {
      console.error('Error analyzing uploaded image:', error);
      throw error;
    }
  }
}

export default AIDetectionService.getInstance();
