/**
 * AI Analysis Model
 * Stores AI-generated analysis results for medical studies
 */

const mongoose = require('mongoose');

const FindingSchema = new mongoose.Schema({
  category: {
    type: String,
    enum: ['tumor', 'fracture', 'calcification', 'lesion', 'normal', 'other'],
    required: true
  },
  description: {
    type: String,
    required: true
  },
  location: {
    type: String,
    default: null
  },
  confidence: {
    type: String,
    enum: ['high', 'moderate', 'low'],
    required: true
  },
  severity: {
    type: String,
    enum: ['critical', 'high', 'moderate', 'low', 'none'],
    required: true
  }
}, { _id: false });

const AIAnalysisSchema = new mongoose.Schema({
  studyInstanceUID: {
    type: String,
    required: true,
    index: true
  },
  analysisId: {
    type: String,
    required: true,
    unique: true
  },
  modelUsed: {
    type: String,
    default: 'gemini-2.0-flash'
  },
  analysisTimestamp: {
    type: Date,
    default: Date.now
  },
  summary: {
    type: String,
    required: true
  },
  findings: [FindingSchema],
  recommendations: [{
    type: String
  }],
  aiConfidence: {
    type: String,
    enum: ['high', 'moderate', 'low'],
    required: true
  },
  reviewedBy: {
    type: String,
    default: null
  },
  reviewedAt: {
    type: Date,
    default: null
  },
  reviewStatus: {
    type: String,
    enum: ['pending', 'confirmed', 'rejected', 'modified'],
    default: 'pending'
  },
  radiologistNotes: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Index for efficient queries
AIAnalysisSchema.index({ studyInstanceUID: 1, analysisTimestamp: -1 });
AIAnalysisSchema.index({ reviewStatus: 1 });

const AIAnalysis = mongoose.model('AIAnalysis', AIAnalysisSchema);

module.exports = AIAnalysis;
