/**
 * Machine Model
 * Represents medical imaging machines (CT, MRI, PET, etc.)
 */

const mongoose = require('mongoose');

const MachineSchema = new mongoose.Schema({
  // Unique identifier
  machineId: {
    type: String,
    required: true,
    unique: true,
    default: () => `MACHINE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  },

  // Organization/Hospital
  organizationId: {
    type: String,
    required: true,
    index: true
  },

  organizationName: {
    type: String,
    required: true
  },

  // Machine Details
  name: {
    type: String,
    required: true,
    trim: true
  },

  machineType: {
    type: String,
    required: true,
    enum: ['CT', 'MRI', 'PET', 'XRAY', 'US', 'CR', 'DX', 'MG', 'OTHER'],
    default: 'CT'
  },

  manufacturer: {
    type: String,
    default: null
  },

  model: {
    type: String,
    default: null
  },

  serialNumber: {
    type: String,
    default: null
  },

  // DICOM Configuration
  ipAddress: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        // Basic IP validation
        return /^(\d{1,3}\.){3}\d{1,3}$/.test(v);
      },
      message: props => `${props.value} is not a valid IP address!`
    }
  },

  port: {
    type: Number,
    required: true,
    default: 4242
  },

  aeTitle: {
    type: String,
    required: true,
    default: 'MACHINE',
    uppercase: true,
    maxlength: 16
  },

  callingAeTitle: {
    type: String,
    required: true,
    default: 'ORTHANC',
    uppercase: true,
    maxlength: 16
  },

  // Connection Status
  status: {
    type: String,
    enum: ['online', 'offline', 'testing', 'error', 'pending'],
    default: 'pending'
  },

  lastSeen: {
    type: Date,
    default: null
  },

  lastConnectionTest: {
    type: Date,
    default: null
  },

  connectionTestResult: {
    success: { type: Boolean, default: false },
    message: { type: String, default: null },
    testedAt: { type: Date, default: null }
  },

  // Statistics
  totalStudiesReceived: {
    type: Number,
    default: 0
  },

  lastStudyReceived: {
    type: Date,
    default: null
  },

  // Location
  location: {
    building: { type: String, default: null },
    floor: { type: String, default: null },
    room: { type: String, default: null },
    description: { type: String, default: null }
  },

  // Configuration
  autoAcceptStudies: {
    type: Boolean,
    default: true
  },

  enabled: {
    type: Boolean,
    default: true
  },

  notes: {
    type: String,
    default: null
  },

  // Metadata
  createdBy: {
    type: String,
    required: true
  },

  updatedBy: {
    type: String,
    default: null
  }

}, {
  timestamps: true
});

// Indexes for efficient queries
MachineSchema.index({ organizationId: 1, status: 1 });
MachineSchema.index({ organizationId: 1, machineType: 1 });
MachineSchema.index({ ipAddress: 1, port: 1 });

// Virtual for connection string
MachineSchema.virtual('connectionString').get(function() {
  return `${this.aeTitle}@${this.ipAddress}:${this.port}`;
});

// Method to update last seen
MachineSchema.methods.updateLastSeen = function() {
  this.lastSeen = new Date();
  this.status = 'online';
  return this.save();
};

// Method to increment study count
MachineSchema.methods.incrementStudyCount = function() {
  this.totalStudiesReceived += 1;
  this.lastStudyReceived = new Date();
  this.lastSeen = new Date();
  this.status = 'online';
  return this.save();
};

const Machine = mongoose.model('Machine', MachineSchema);

module.exports = Machine;
