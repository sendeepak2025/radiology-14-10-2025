const fs = require('fs');
const path = require('path');
const Study = require('../models/Study');
const Instance = require('../models/Instance');
const { getOrthancStudyService } = require('../services/orthanc-study-service');

const BACKEND_DIR = path.resolve(__dirname, '../../backend');
const UPLOADED_STUDIES_DIR = path.join(BACKEND_DIR, 'uploaded_studies');

function countFrames(studyInstanceUID) {
  try {
    const framesDir = path.join(BACKEND_DIR, `uploaded_frames_${studyInstanceUID}`);
    const files = fs.existsSync(framesDir) ? fs.readdirSync(framesDir) : [];
    // Count PNG frames only
    return files.filter(f => f.toLowerCase().endsWith('.png')).length;
  } catch (e) {
    return 0;
  }
}

function listUploadedStudies() {
  try {
    if (!fs.existsSync(UPLOADED_STUDIES_DIR)) return [];
    const studyDirs = fs.readdirSync(UPLOADED_STUDIES_DIR).filter(name => !name.startsWith('.'));
    return studyDirs.map(uid => ({
      studyInstanceUID: uid,
      patientName: 'Rubo DEMO',
      modality: 'XA',
      numberOfSeries: 1,
      numberOfInstances: countFrames(uid)
    }));
  } catch (e) {
    return [];
  }
}

function countFramesFromCloudinary(inst) {
  try {
    const dicomParser = require('dicom-parser');
    const axios = require('axios');
    const { v2: cloudinary } = require('cloudinary');
    let dicomUrl = inst.cloudinaryUrl;
    if (!dicomUrl && inst.cloudinaryPublicId) {
      dicomUrl = cloudinary.url(inst.cloudinaryPublicId, { resource_type: 'raw', secure: true });
    }
    if (!dicomUrl) return 1;
    return axios.get(dicomUrl, { responseType: 'arraybuffer' }).then(resp => {
      const buffer = Buffer.from(resp.data);
      const ds = dicomParser.parseDicom(buffer);
      const readInt = (tag, defVal = 1) => { try { return ds.intString(tag) ?? defVal; } catch { return defVal; } };
      const frames = readInt('x00280008', 1) || 1;
      return frames;
    }).catch(() => 1);
  } catch (e) {
    return 1;
  }
}

async function getStudies(req, res) {
  try {
    const mongoose = require('mongoose');
    const { getFilesystemStudyLoader } = require('../services/filesystem-study-loader');
    
    // Check MongoDB connection
    const isMongoConnected = mongoose.connection.readyState === 1;
    
    if (!isMongoConnected) {
      console.warn('⚠️  MongoDB not connected, using filesystem fallback');
      const fsLoader = getFilesystemStudyLoader();
      const fsStudies = fsLoader.getAllStudies();
      return res.json({ 
        success: true, 
        data: fsStudies,
        source: 'filesystem',
        warning: 'MongoDB not connected, showing studies from filesystem only'
      });
    }
    
    // Check if PACS integration is enabled
    const enablePacsIntegration = process.env.ENABLE_PACS_INTEGRATION !== 'false';
    
    if (enablePacsIntegration) {
      // Use unified studies from both database and PACS
      console.log('Fetching unified studies from database and PACS...');
      const orthancStudyService = getOrthancStudyService();
      const unifiedStudies = await orthancStudyService.getUnifiedStudies();
      
      res.json({ success: true, data: unifiedStudies });
    } else {
      // Fallback to database-only with improved frame counting
      console.log('PACS integration disabled, using database only...');
      
      const dbStudies = await Study.find({}, {
        studyInstanceUID: 1,
        patientName: 1,
        modality: 1,
        numberOfSeries: 1,
        numberOfInstances: 1
      }).lean();

      // Get accurate frame counts for each study (same logic as getStudy)
      const studiesWithFrameCounts = await Promise.all(
        dbStudies.map(async (study) => {
          let numberOfInstances = study.numberOfInstances || 1;
          
          // Try to get accurate frame count from Cloudinary instance
          try {
            const inst = await Instance.findOne({ studyInstanceUID: study.studyInstanceUID }).lean();
            if (inst) {
              numberOfInstances = await countFramesFromCloudinary(inst);
            }
          } catch (error) {
            console.warn(`Failed to get frame count for study ${study.studyInstanceUID}:`, error.message);
            // Fall back to stored value or local frame count
            numberOfInstances = study.numberOfInstances || countFrames(study.studyInstanceUID) || 1;
          }

          return {
            studyInstanceUID: study.studyInstanceUID,
            patientName: study.patientName || 'Unknown',
            modality: study.modality || 'OT',
            numberOfSeries: study.numberOfSeries || 1,
            numberOfInstances: numberOfInstances
          };
        })
      );

      res.json({ success: true, data: studiesWithFrameCounts });
    }
  } catch (e) {
    console.error('getStudies error:', e);
    
    // Final fallback to filesystem
    try {
      console.warn('⚠️  Database error, falling back to filesystem');
      const { getFilesystemStudyLoader } = require('../services/filesystem-study-loader');
      const fsLoader = getFilesystemStudyLoader();
      const fsStudies = fsLoader.getAllStudies();
      return res.json({ 
        success: true, 
        data: fsStudies,
        source: 'filesystem',
        warning: 'Database error, showing studies from filesystem only'
      });
    } catch (fsError) {
      console.error('Filesystem fallback also failed:', fsError);
      res.status(500).json({ success: false, message: e.message });
    }
  }
}

async function getStudy(req, res) {
  try {
    const { studyUid } = req.params;
    
    // First try to find in database
    let study = await Study.findOne({ studyInstanceUID: studyUid }).lean();
    
    // If not found in database and PACS integration is enabled, try PACS
    if (!study && process.env.ENABLE_PACS_INTEGRATION !== 'false') {
      console.log("ENTER")
      console.log(`Study ${studyUid} not found in database, checking PACS...`);
      const orthancStudyService = getOrthancStudyService();
      const pacsStudy = await orthancStudyService.getStudyFromPacs(studyUid);
      
      if (pacsStudy) {
        console.log(`Found study ${studyUid} in PACS`);
        study = pacsStudy;
      }
    }
    
    if (!study) {
      return res.status(404).json({ success: false, message: 'Study not found' });
    }

    // Get accurate frame count
    let numberOfInstances = study.numberOfInstances || 1;
    
    // Try to get frame count from instance data
    const inst = await Instance.findOne({ studyInstanceUID: studyUid }).lean();
    if (inst) {
      numberOfInstances = await countFramesFromCloudinary(inst);
    }

    res.json({ success: true, data: { ...study, numberOfInstances } });
  } catch (e) {
    console.error('getStudy error:', e);
    res.status(500).json({ success: false, message: e.message });
  }
}

async function getStudyMetadata(req, res) {
  try {
    const { studyUid } = req.params;
    let study = await Study.findOne({ studyInstanceUID: studyUid }).lean();
    if (!study) return res.status(404).json({ success: false, message: 'Study not found' });

    const inst = await Instance.findOne({ studyInstanceUID: studyUid }).lean();
    let totalFrames = study.numberOfInstances || 1;
    if (inst) totalFrames = await countFramesFromCloudinary(inst);

    const metadata = {
      studyInstanceUID: studyUid,
      patientName: study.patientName || 'Unknown',
      modality: study.modality || 'OT',
      numberOfSeries: study.numberOfSeries || 1,
      numberOfInstances: totalFrames,
      series: [
        {
          seriesInstanceUID: `${studyUid}.1`,
          seriesNumber: 1,
          instances: Array.from({ length: totalFrames }, (_, i) => ({
            sopInstanceUID: `${studyUid}.1.${i + 1}`,
            instanceNumber: i + 1
          }))
        }
      ]
    };

    res.json({ success: true, data: metadata });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: e.message });
  }
}

module.exports = { getStudies, getStudy, getStudyMetadata, countFramesFromCloudinary };