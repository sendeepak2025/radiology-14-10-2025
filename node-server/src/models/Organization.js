/**
 * Organization Model
 * Represents hospitals, clinics, or imaging centers
 */

const mongoose = require('mongoose');

const OrganizationSchema = new mongoose.Schema({
  // Unique identifier
  organizationId: {
    type: String,
    required: true,
    unique: true,
    default: () => `ORG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  },

  // Organization Details
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },

  type: {
    type: String,
    enum: ['hospital', 'clinic', 'imaging_center', 'research', 'other'],
    default: 'hospital'
  },

  // Contact Information
  address: {
    street: { type: String, default: null },
    city: { type: String, default: null },
    state: { type: String, default: null },
    zipCode: { type: String, default: null },
    country: { type: String, default: 'USA' }
  },

  contact: {
    phone: { type: String, default: null },
    email: { type: String, default: null },
    website: { type: String, default: null }
  },

  // Subscription
  plan: {
    type: String,
    enum: ['free', 'basic', 'professional', 'enterprise'],
    default: 'free'
  },

  subscriptionStatus: {
    type: String,
    enum: ['active', 'inactive', 'trial', 'suspended'],
    default: 'trial'
  },

  trialEndsAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
  },

  // Limits
  limits: {
    maxMachines: { type: Number, default: 5 },
    maxUsers: { type: Number, default: 10 },
    maxStorageGB: { type: Number, default: 100 },
    maxAIAnalysesPerMonth: { type: Number, default: 100 }
  },

  // Usage Statistics
  usage: {
    totalMachines: { type: Number, default: 0 },
    totalUsers: { type: Number, default: 0 },
    totalStudies: { type: Number, default: 0 },
    totalStorageGB: { type: Number, default: 0 },
    aiAnalysesThisMonth: { type: Number, default: 0 }
  },

  // Settings
  settings: {
    autoDeleteOldStudies: { type: Boolean, default: false },
    studyRetentionDays: { type: Number, default: 365 },
    requireAIReview: { type: Boolean, default: false },
    enableAIAutoAnalysis: { type: Boolean, default: false },
    notificationEmail: { type: String, default: null }
  },

  // Admin User
  adminUserId: {
    type: String,
    required: true
  },

  // Status
  enabled: {
    type: Boolean,
    default: true
  },

  notes: {
    type: String,
    default: null
  }

}, {
  timestamps: true
});

// Indexes
OrganizationSchema.index({ name: 1 });
OrganizationSchema.index({ subscriptionStatus: 1 });

// Method to check if organization can add more machines
OrganizationSchema.methods.canAddMachine = function() {
  return this.usage.totalMachines < this.limits.maxMachines;
};

// Method to increment machine count
OrganizationSchema.methods.incrementMachineCount = function() {
  this.usage.totalMachines += 1;
  return this.save();
};

// Method to decrement machine count
OrganizationSchema.methods.decrementMachineCount = function() {
  if (this.usage.totalMachines > 0) {
    this.usage.totalMachines -= 1;
  }
  return this.save();
};

const Organization = mongoose.model('Organization', OrganizationSchema);

module.exports = Organization;
