const mongoose = require('mongoose');

/**
 * Structured Report Schema
 * Stores medical findings, measurements, annotations, and clinical reports
 * Linked to studyInstanceUID, patientID, and radiologist signature
 */
const StructuredReportSchema = new mongoose.Schema({
  // Study and Patient References
  studyInstanceUID: { type: String, required: true, index: true },
  patientID: { type: String, required: true, index: true },
  patientName: String,
  patientBirthDate: String,
  patientSex: String,
  patientAge: String,
  
  // Study Information
  studyDate: String,
  studyTime: String,
  studyDescription: String,
  modality: String,
  
  // Report Metadata
  reportId: { type: String, unique: true, index: true }, // Auto-generated
  reportDate: { type: Date, default: Date.now },
  reportStatus: { 
    type: String, 
    enum: ['draft', 'preliminary', 'final', 'amended', 'cancelled'],
    default: 'draft',
    index: true
  },
  
  // Radiologist/Author Information
  radiologistId: { type: String }, // String for testing (not ObjectId)
  radiologistName: { type: String, required: true, default: 'Test Radiologist' },
  radiologistSignature: String, // Text signature (legacy)
  radiologistSignatureUrl: String, // Cloudinary URL for signature image
  radiologistSignaturePublicId: String, // Cloudinary public ID for deletion
  signedAt: Date,
  
  // Clinical Findings
  findings: [{
    id: String,
    type: { type: String, enum: ['finding', 'impression', 'recommendation', 'critical'] },
    category: String, // e.g., 'cardiac', 'pulmonary', 'skeletal'
    description: String,
    severity: { type: String, enum: ['normal', 'mild', 'moderate', 'severe', 'critical'] },
    clinicalCode: String, // ICD-10 or other coding system
    location: String, // Anatomical location
    frameIndex: Number,
    timestamp: { type: Date, default: Date.now }
  }],
  
  // Measurements (from viewer tools)
  measurements: [{
    id: String,
    type: { type: String, enum: ['length', 'angle', 'area', 'volume'] },
    value: Number,
    unit: String,
    label: String,
    points: [{ x: Number, y: Number }], // Normalized coordinates
    frameIndex: Number,
    timestamp: { type: Date, default: Date.now }
  }],
  
  // Annotations (from viewer tools)
  annotations: [{
    id: String,
    type: { 
      type: String, 
      enum: ['text', 'arrow', 'freehand', 'rectangle', 'circle', 'polygon', 'clinical', 'leader'] 
    },
    text: String,
    color: String,
    points: [{ x: Number, y: Number }], // Normalized coordinates
    anchor: { x: Number, y: Number }, // For leader annotations
    textPos: { x: Number, y: Number }, // For leader annotations
    category: String,
    clinicalCode: String,
    isKeyImage: Boolean,
    frameIndex: Number,
    timestamp: { type: Date, default: Date.now }
  }],
  
  // Report Sections
  clinicalHistory: String,
  technique: String,
  comparison: String,
  findingsText: String, // Narrative findings
  impression: String, // Summary/conclusion
  recommendations: String,
  
  // Additional Metadata
  keyImages: [Number], // Frame indices marked as key images
  tags: [String],
  priority: { type: String, enum: ['routine', 'urgent', 'stat'], default: 'routine' },
  
  // Audit Trail
  revisionHistory: [{
    revisedBy: String,
    revisedAt: Date,
    changes: String,
    previousStatus: String
  }],
  
  // Version Control
  version: { type: Number, default: 1 },
  previousVersionId: { type: mongoose.Schema.Types.ObjectId, ref: 'StructuredReport' }
  
}, { timestamps: true });

// Indexes for efficient querying
StructuredReportSchema.index({ studyInstanceUID: 1, reportStatus: 1 });
StructuredReportSchema.index({ patientID: 1, reportDate: -1 });
StructuredReportSchema.index({ radiologistId: 1, reportDate: -1 });
StructuredReportSchema.index({ reportStatus: 1, reportDate: -1 });

// Generate unique report ID before saving
StructuredReportSchema.pre('save', function(next) {
  if (!this.reportId) {
    this.reportId = `SR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    console.log('📝 Generated reportId:', this.reportId);
  }
  next();
});

module.exports = mongoose.model('StructuredReport', StructuredReportSchema);
