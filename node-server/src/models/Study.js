const mongoose = require('mongoose');

const StudySchema = new mongoose.Schema({
  studyInstanceUID: { type: String, unique: true, index: true },
  studyDate: String,
  studyTime: String,
  patientName: String,
  patientID: String,
  patientBirthDate: String,
  patientSex: String,
  modality: String,
  studyDescription: String,
  numberOfSeries: Number,
  numberOfInstances: Number
}, { timestamps: true });

module.exports = mongoose.model('Study', StudySchema);