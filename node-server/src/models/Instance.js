const mongoose = require('mongoose');

const InstanceSchema = new mongoose.Schema({
  studyInstanceUID: { type: String,  },
  seriesInstanceUID: { type: String,  },
  sopInstanceUID: { type: String,  },
  instanceNumber: Number,
  modality: String,
  cloudinaryUrl: String,
  cloudinaryPublicId: String,
  // Orthanc integration fields
  orthancInstanceId: { type: String, index: true }, // Orthanc instance UUID
  orthancUrl: String, // Full Orthanc instance URL
  orthancFrameIndex: { type: Number, default: 0 }, // Frame index within multi-frame DICOM
  useOrthancPreview: { type: Boolean, default: false } // Feature flag for migration
}, { timestamps: true });

module.exports = mongoose.model('Instance', InstanceSchema);