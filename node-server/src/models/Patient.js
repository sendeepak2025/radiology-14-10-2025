const mongoose = require('mongoose');

const PatientSchema = new mongoose.Schema({
  patientID: { type: String, unique: true, index: true },
  patientName: { type: String },
  birthDate: { type: String },
  sex: { type: String },
  studyIds: { type: [String], default: [] }
}, { timestamps: true });

module.exports = mongoose.model('Patient', PatientSchema);