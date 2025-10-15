const mongoose = require('mongoose');

/**
 * Report Schema
 * Stores generated reports for studies
 */
const ReportSchema = new mongoose.Schema({
  reportId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  studyInstanceUID: {
    type: String,
    required: true,
    index: true,
  },
  patientName: String,
  patientID: String,
  studyDate: String,
  modality: String,
  templateId: {
    type: String,
    index: true,
  },
  templateName: String,
  content: {
    type: String,
    required: true,
  },
  sections: [{
    sectionName: String,
    sectionContent: String,
  }],
  findings: {
    type: String,
  },
  impression: {
    type: String,
  },
  status: {
    type: String,
    enum: ['draft', 'in_review', 'finalized', 'amended'],
    default: 'draft',
    index: true,
  },
  createdBy: {
    type: String,
    required: true,
  },
  radiologist: {
    name: String,
    id: String,
  },
  reviewedBy: String,
  reviewedAt: Date,
  finalizedBy: String,
  finalizedAt: Date,
  signature: {
    data: String, // Base64 encoded signature
    timestamp: Date,
    signedBy: String,
  },
  organizationId: {
    type: String,
    index: true,
  },
  version: {
    type: Number,
    default: 1,
  },
  previousVersionId: String,
  amendments: [{
    amendedBy: String,
    amendedAt: Date,
    reason: String,
    changes: String,
  }],
  metadata: {
    wordCount: Number,
    readingTime: Number, // in seconds
    criticalFindings: Boolean,
  },
}, {
  timestamps: true,
});

// Compound indexes
ReportSchema.index({ studyInstanceUID: 1, version: -1 });
ReportSchema.index({ status: 1, createdAt: -1 });
ReportSchema.index({ organizationId: 1, status: 1 });
ReportSchema.index({ createdBy: 1, createdAt: -1 });

module.exports = mongoose.model('Report', ReportSchema);
