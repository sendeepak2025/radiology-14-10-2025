const mongoose = require('mongoose');

/**
 * Report Template Schema
 * Stores report templates for different study types
 */
const ReportTemplateSchema = new mongoose.Schema({
  templateId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  modality: {
    type: [String],
    index: true,
  },
  bodyPart: {
    type: String,
    index: true,
  },
  category: {
    type: String,
    enum: ['general', 'chest', 'abdomen', 'neuro', 'musculoskeletal', 'cardiac', 'custom'],
    default: 'general',
    index: true,
  },
  template: {
    type: String,
    required: true,
  },
  sections: [{
    sectionName: String,
    sectionContent: String,
    order: Number,
  }],
  variables: [{
    name: String,
    label: String,
    type: {
      type: String,
      enum: ['text', 'number', 'date', 'select', 'multiselect', 'boolean'],
      default: 'text',
    },
    options: [String], // For select/multiselect
    required: Boolean,
    defaultValue: String,
  }],
  isPublic: {
    type: Boolean,
    default: true,
  },
  createdBy: {
    type: String,
    required: true,
  },
  organizationId: {
    type: String,
    index: true,
  },
  usageCount: {
    type: Number,
    default: 0,
  },
  tags: [String],
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
}, {
  timestamps: true,
});

// Compound indexes for efficient queries
ReportTemplateSchema.index({ modality: 1, bodyPart: 1 });
ReportTemplateSchema.index({ category: 1, isActive: 1 });
ReportTemplateSchema.index({ organizationId: 1, isActive: 1 });

module.exports = mongoose.model('ReportTemplate', ReportTemplateSchema);
