const Study = require('../models/Study');
const Patient = require('../models/Patient');

async function getPatients(req, res) {
  try {
    const patients = await Patient.find({}).lean();
    const out = patients.map(p => ({
      patientID: p.patientID,
      patientName: p.patientName || 'Unknown',
      birthDate: p.birthDate || '',
      sex: p.sex || '',
      studyCount: Array.isArray(p.studyIds) ? p.studyIds.length : 0
    }));
    res.json({ success: true, data: out });
  } catch (e) {
    console.error('Failed to list patients:', e);
    res.status(500).json({ success: false, message: e.message });
  }
}

async function getPatientStudies(req, res) {
  try {
    const { patientID } = req.params;
    const patient = await Patient.findOne({ patientID }).lean();
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    let studies = [];
    if (Array.isArray(patient.studyIds) && patient.studyIds.length > 0) {
      studies = await Study.find({ studyInstanceUID: { $in: patient.studyIds } }).lean();
    } else {
      // Fallback: query by patientID if studyIds are not populated
      studies = await Study.find({ patientID }).lean();
    }

    const out = studies.map(s => ({
      studyInstanceUID: s.studyInstanceUID,
      patientName: s.patientName || patient.patientName || 'Unknown',
      patientID: s.patientID || patientID,
      modality: s.modality || 'OT',
      numberOfSeries: s.numberOfSeries || 1,
      numberOfInstances: s.numberOfInstances || 1,
      studyDescription: s.studyDescription || ''
    }));

    res.json({ success: true, data: out });
  } catch (e) {
    console.error('Failed to list patient studies:', e);
    res.status(500).json({ success: false, message: e.message });
  }
}

async function createPatient(req, res) {
  try {
    const { patientID, patientName, birthDate, sex } = req.body || {}
    if (!patientID || typeof patientID !== 'string') {
      return res.status(400).json({ success: false, message: 'patientID is required' })
    }

    // Upsert patient by patientID
    const existing = await Patient.findOne({ patientID })
    if (existing) {
      existing.patientName = patientName ?? existing.patientName
      existing.birthDate = birthDate ?? existing.birthDate
      existing.sex = sex ?? existing.sex
      await existing.save()
      return res.json({ success: true, data: { patientID: existing.patientID } })
    }

    const patient = new Patient({ patientID, patientName, birthDate, sex, studyIds: [] })
    await patient.save()
    res.json({ success: true, data: { patientID: patient.patientID } })
  } catch (e) {
    console.error('Failed to create patient:', e)
    res.status(500).json({ success: false, message: e.message })
  }
}

module.exports = { getPatients, getPatientStudies, createPatient }