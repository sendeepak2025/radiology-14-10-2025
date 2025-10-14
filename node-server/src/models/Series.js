const mongoose = require('mongoose');

const SeriesSchema = new mongoose.Schema({
  studyInstanceUID: { type: String, index: true },
  seriesInstanceUID: { type: String, unique: true, index: true },
  modality: String,
  seriesNumber: Number,
  description: String
}, { timestamps: true });

module.exports = mongoose.model('Series', SeriesSchema);