const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const Study = require('../models/Study');
const Series = require('../models/Series');
const Instance = require('../models/Instance');
const { generateUID } = require('../utils/uid');
// Add filesystem and DICOM parsing utilities
const fs = require('fs');
const path = require('path');
const dicomParser = require('dicom-parser');
const { PNG } = require('pngjs');

const upload = multer({ storage: multer.memoryStorage() });

function uploadMiddleware() {
  return upload.single('file');
}

// Backend base directory for storing uploaded studies and generated frames
const BACKEND_DIR = path.resolve(__dirname, '../../backend');

function parseDicomMetadata(buffer) {
  try {
    const dataSet = dicomParser.parseDicom(buffer);
    const readStr = (tag, defVal = '') => {
      try { return dataSet.string(tag) || defVal; } catch { return defVal; }
    };
    const readInt = (tag, defVal = 0) => {
      try { return dataSet.intString(tag) ?? defVal; } catch { return defVal; }
    };

    const studyInstanceUID = readStr('x0020000D', generateUID());
    const seriesInstanceUID = readStr('x0020000E', generateUID());
    const sopInstanceUID = readStr('x00080018', generateUID());

    const patientName = readStr('x00100010', 'Unknown');
    const patientID = readStr('x00100020', 'Unknown');
    const patientBirthDate = readStr('x00100030', '');
    const patientSex = readStr('x00100040', '');
    const studyDate = readStr('x00080020', '');
    const studyTime = readStr('x00080030', '');
    const studyDescription = readStr('x00081030', '');
    const modality = readStr('x00080060', 'OT');

    const rows = readInt('x00280010', 0);
    const cols = readInt('x00280011', 0);
    const samplesPerPixel = readInt('x00280002', 1);
    const bitsAllocated = readInt('x00280100', 8);
    const numberOfFrames = readInt('x00280008', 1) || 1;
    const photometricInterpretation = readStr('x00280004', 'MONOCHROME2');

    const pixelDataElement = dataSet.elements.x7fe00010;
    const pixelDataOffset = pixelDataElement ? pixelDataElement.dataOffset : null;

    return {
      studyInstanceUID,
      seriesInstanceUID,
      sopInstanceUID,
      patientName,
      patientID,
      patientBirthDate,
      patientSex,
      studyDate,
      studyTime,
      studyDescription,
      modality,
      rows,
      cols,
      samplesPerPixel,
      bitsAllocated,
      numberOfFrames,
      photometricInterpretation,
      dataSet,
      pixelDataOffset
    };
  } catch (e) {
    // If parsing fails, return minimal metadata
    return {
      studyInstanceUID: generateUID(),
      seriesInstanceUID: generateUID(),
      sopInstanceUID: generateUID(),
      patientName: 'Unknown',
      patientID: 'Unknown',
      patientBirthDate: '',
      patientSex: '',
      studyDate: '',
      studyTime: '',
      studyDescription: '',
      modality: 'OT',
      rows: 0,
      cols: 0,
      samplesPerPixel: 1,
      bitsAllocated: 8,
      numberOfFrames: 1,
      photometricInterpretation: 'MONOCHROME2',
      dataSet: null,
      pixelDataOffset: null
    };
  }
}

function ensureDirectories(studyUID, seriesUID) {
  const studyDir = path.join(BACKEND_DIR, 'uploaded_studies', studyUID, seriesUID);
  const framesDir = path.join(BACKEND_DIR, `uploaded_frames_${studyUID}`);
  fs.mkdirSync(studyDir, { recursive: true });
  fs.mkdirSync(framesDir, { recursive: true });
  return { studyDir, framesDir };
}

function writeDicomFile(studyDir, sopUID, buffer) {
  const filePath = path.join(studyDir, `${sopUID}.dcm`);
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

function generatePngFrameFromPixelData(meta) {
  try {
    const { rows, cols, bitsAllocated, samplesPerPixel, pixelDataOffset, dataSet, studyInstanceUID } = meta;
    const framesDir = path.join(BACKEND_DIR, `uploaded_frames_${studyInstanceUID}`);
    if (!rows || !cols || pixelDataOffset == null || !dataSet) {
      // Create a placeholder image to avoid 404
      const png = new PNG({ width: 256, height: 256 });
      for (let y = 0; y < png.height; y++) {
        for (let x = 0; x < png.width; x++) {
          const idx = (png.width * y + x) << 2;
          const v = ((x ^ y) & 0xff);
          png.data[idx] = v;
          png.data[idx + 1] = v;
          png.data[idx + 2] = v;
          png.data[idx + 3] = 255;
        }
      }
      const outPath = path.join(framesDir, `frame_000.png`);
      fs.writeFileSync(outPath, PNG.sync.write(png));
      return 1;
    }
    const byteArray = dataSet.byteArray;
    const frameBytes = rows * cols * samplesPerPixel * (bitsAllocated / 8);
    // Only generate first frame for now
    const frame0 = byteArray.slice(pixelDataOffset, pixelDataOffset + frameBytes);

    let grayscale;
    if (bitsAllocated === 16) {
      const view = new Uint16Array(frame0.buffer, frame0.byteOffset, frame0.length / 2);
      // Normalize to 0-255
      let min = 65535, max = 0;
      for (let i = 0; i < view.length; i++) { const v = view[i]; if (v < min) min = v; if (v > max) max = v; }
      grayscale = Buffer.alloc(rows * cols);
      const range = max - min || 1;
      for (let i = 0; i < view.length; i++) {
        grayscale[i] = Math.round(((view[i] - min) / range) * 255);
      }
    } else {
      // 8-bit
      const view = new Uint8Array(frame0.buffer, frame0.byteOffset, frame0.length);
      grayscale = Buffer.from(view);
    }

    const png = new PNG({ width: cols, height: rows });
    // Map grayscale to RGBA
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = y * cols + x;
        const g = grayscale[i] || 0;
        const idx = (cols * y + x) << 2;
        png.data[idx] = g;
        png.data[idx + 1] = g;
        png.data[idx + 2] = g;
        png.data[idx + 3] = 255;
      }
    }
    fs.writeFileSync(path.join(framesDir, `frame_000.png`), PNG.sync.write(png));
    return 1;
  } catch (e) {
    console.error('Failed to generate PNG frame from DICOM:', e);
    return 0;
  }
}

async function handleUpload(req, res) {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const buffer = req.file.buffer;

    // Parse DICOM metadata from uploaded file (fallback to generated UIDs)
    const meta = parseDicomMetadata(buffer);
    const { studyInstanceUID, seriesInstanceUID, sopInstanceUID } = meta;

    // Allow overriding patient info from form-data fields
    const overridePatientID = (req.body && req.body.patientID) ? String(req.body.patientID) : null;
    const overridePatientName = (req.body && req.body.patientName) ? String(req.body.patientName) : null;
    if (overridePatientID) meta.patientID = overridePatientID;
    if (overridePatientName) meta.patientName = overridePatientName;

    // Ensure directories and persist original DICOM
    const { studyDir, framesDir } = ensureDirectories(studyInstanceUID, seriesInstanceUID);
    const storedDicomPath = writeDicomFile(studyDir, sopInstanceUID, buffer);

    // Try to generate a PNG frame for display (frame_000.png)
    const generatedFrames = generatePngFrameFromPixelData(meta) || 0;

    // Upload a preview to Cloudinary (optional)
    let uploadResult = { secure_url: '', public_id: '' };
    try {
      uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream({ folder: 'dicom/previews', resource_type: 'auto' }, (err, result) => {
          if (err) return reject(err);
          resolve(result);
        });
        stream.end(buffer);
      });
    } catch (clErr) {
      console.warn('Cloudinary upload failed, continuing without preview:', clErr?.message || clErr);
    }

    // Persist study, series, and instance metadata to MongoDB
    await Study.updateOne(
      { studyInstanceUID },
      {
        $set: {
          studyInstanceUID,
          patientName: meta.patientName || 'Unknown',
          patientID: meta.patientID || 'Unknown',
          patientBirthDate: meta.patientBirthDate || '',
          patientSex: meta.patientSex || '',
          studyDate: meta.studyDate || '',
          studyTime: meta.studyTime || '',
          modality: meta.modality || 'OT',
          studyDescription: meta.studyDescription || '',
          numberOfSeries: 1,
          numberOfInstances: generatedFrames || 1
        }
      },
      { upsert: true }
    );

    await Series.updateOne(
      { studyInstanceUID, seriesInstanceUID },
      { $set: { studyInstanceUID, seriesInstanceUID, modality: meta.modality || 'OT', seriesNumber: 1, description: meta.studyDescription || '' } },
      { upsert: true }
    );

    const instanceDoc = await Instance.create({
      studyInstanceUID,
      seriesInstanceUID,
      sopInstanceUID,
      instanceNumber: 1,
      modality: meta.modality || 'OT',
      cloudinaryUrl: uploadResult.secure_url,
      cloudinaryPublicId: uploadResult.public_id
    });

    // Link study to patient (create/update patient record and attach study ID)
    try {
      const Patient = require('../models/Patient');
      const pid = meta.patientID || 'Unknown';
      const pnameOverride = (req.body && req.body.patientName) ? String(req.body.patientName) : null;
      const pnameFromDicom = meta.patientName || 'Unknown';

      const existing = await Patient.findOne({ patientID: pid }).lean();
      if (existing) {
        // Only update name if override explicitly provided; otherwise keep existing
        const update = { $addToSet: { studyIds: studyInstanceUID } };
        if (pnameOverride && pnameOverride.trim()) {
          update.$set = { patientName: pnameOverride.trim() };
        }
        await Patient.updateOne({ patientID: pid }, update, { upsert: true });
      } else {
        // Create new patient with override or DICOM name
        await Patient.updateOne(
          { patientID: pid },
          {
            $set: { patientID: pid, patientName: (pnameOverride && pnameOverride.trim()) ? pnameOverride.trim() : pnameFromDicom },
            $addToSet: { studyIds: studyInstanceUID }
          },
          { upsert: true }
        );
      }
    } catch (patientErr) {
      console.warn('Patient linking skipped or failed:', patientErr?.message || patientErr);
    }

    res.json({ success: true, data: {
      studyInstanceUID,
      seriesInstanceUID,
      instance: instanceDoc,
      patientID: meta.patientID || 'Unknown',
      patientName: meta.patientName || 'Unknown'
    }});
  } catch (e) {
    console.error('Upload failed:', e);
    res.status(500).json({ success: false, message: e.message });
  }
}

module.exports = { uploadMiddleware, handleUpload };