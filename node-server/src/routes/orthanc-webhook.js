/**
 * Orthanc Webhook Handler
 * 
 * Automatically processes files when uploaded to Orthanc
 * जब भी Orthanc पे file upload होगी, यह automatically trigger होगा
 */

const express = require('express');
const router = express.Router();
const Study = require('../models/Study');
const Instance = require('../models/Instance');
const { getUnifiedOrthancService } = require('../services/unified-orthanc-service');

/**
 * Webhook endpoint - Called by Orthanc when new instance is stored
 * यह endpoint Orthanc automatically call करेगा
 */
router.post('/orthanc/new-instance', async (req, res) => {
  try {
    console.log('📥 New DICOM instance received from Orthanc');
    
    const { instanceId, studyInstanceUID, seriesInstanceUID, sopInstanceUID } = req.body;
    
    // Quick response to Orthanc (don't make it wait)
    res.status(200).json({ success: true, message: 'Processing started' });
    
    // Process in background
    processNewInstance(instanceId, studyInstanceUID, seriesInstanceUID, sopInstanceUID)
      .catch(error => {
        console.error('Failed to process instance:', error);
      });
    
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Background processing of new instance
 * यह function background में चलेगा
 * Handles both Orthanc (new) and Cloudinary (legacy) storage
 */
async function processNewInstance(orthancInstanceId, studyInstanceUID, seriesInstanceUID, sopInstanceUID) {
  try {
    console.log(`Processing instance: ${orthancInstanceId}`);
    
    const orthanc = getUnifiedOrthancService();
    const cloudinary = require('cloudinary').v2;
    
    // Get instance metadata from Orthanc
    const metadata = await orthanc.getInstanceMetadata(orthancInstanceId);
    const frameCount = parseInt(metadata.NumberOfFrames) || 1;
    
    console.log(`Instance has ${frameCount} frames`);
    
    // Get DICOM file from Orthanc for Cloudinary upload
    let cloudinaryUrl = null;
    let cloudinaryPublicId = null;
    
    try {
      console.log('Uploading to Cloudinary for legacy support...');
      
      // Get raw DICOM file
      const dicomBuffer = await orthanc.getInstanceFile(orthancInstanceId);
      
      // Upload to Cloudinary
      const uploadResult = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            resource_type: 'raw',
            folder: 'dicom_files',
            public_id: `${studyInstanceUID}_${orthancInstanceId}`,
            format: 'dcm'
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        
        uploadStream.end(dicomBuffer);
      });
      
      cloudinaryUrl = uploadResult.secure_url;
      cloudinaryPublicId = uploadResult.public_id;
      
      console.log(`✅ Uploaded to Cloudinary: ${cloudinaryPublicId}`);
      
    } catch (cloudinaryError) {
      console.warn('Cloudinary upload failed (non-critical):', cloudinaryError.message);
      // Continue processing even if Cloudinary fails
    }
    
    // Check if study exists in database
    let study = await Study.findOne({ studyInstanceUID });
    
    if (!study) {
      // Create new study
      console.log('Creating new study in database...');
      
      study = await Study.create({
        studyInstanceUID: studyInstanceUID,
        studyDate: metadata.StudyDate,
        studyTime: metadata.StudyTime,
        patientName: metadata.PatientName || 'Unknown',
        patientID: metadata.PatientID,
        patientBirthDate: metadata.PatientBirthDate,
        patientSex: metadata.PatientSex,
        modality: metadata.Modality || 'OT',
        studyDescription: metadata.StudyDescription,
        numberOfSeries: 1,
        numberOfInstances: frameCount,
        orthancStudyId: orthancInstanceId // Store Orthanc reference
      });
      
      console.log(`✅ Study created: ${studyInstanceUID}`);
    } else {
      // Update existing study
      console.log('Updating existing study...');
      
      await Study.updateOne(
        { studyInstanceUID },
        { 
          $inc: { numberOfInstances: frameCount },
          $set: { 
            updatedAt: new Date(),
            orthancStudyId: orthancInstanceId
          }
        }
      );
      
      console.log(`✅ Study updated: ${studyInstanceUID}`);
    }
    
    // Create instance records (one per frame for multi-frame DICOM)
    console.log(`Creating ${frameCount} instance records...`);
    
    const instanceRecords = [];
    for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
      instanceRecords.push({
        studyInstanceUID: studyInstanceUID,
        seriesInstanceUID: seriesInstanceUID || `${studyInstanceUID}.1`,
        sopInstanceUID: frameCount > 1 ? `${sopInstanceUID}.frame${frameIndex}` : sopInstanceUID,
        instanceNumber: frameIndex + 1,
        modality: metadata.Modality || 'OT',
        // Orthanc storage (primary - fast)
        orthancInstanceId: orthancInstanceId,
        orthancUrl: `${process.env.ORTHANC_URL}/instances/${orthancInstanceId}`,
        orthancFrameIndex: frameIndex,
        useOrthancPreview: true,
        // Cloudinary storage (legacy - backup)
        cloudinaryUrl: cloudinaryUrl,
        cloudinaryPublicId: cloudinaryPublicId
      });
    }
    
    // Bulk insert instances
    await Instance.insertMany(instanceRecords, { ordered: false })
      .catch(error => {
        // Ignore duplicate key errors
        if (error.code !== 11000) {
          throw error;
        }
      });
    
    console.log(`✅ Created ${frameCount} instance records`);
    console.log(`✅ Processing complete for ${orthancInstanceId}`);
    console.log(`   - Orthanc: ${frameCount} frames`);
    console.log(`   - Cloudinary: ${cloudinaryUrl ? 'uploaded' : 'skipped'}`);
    
    // Emit event for real-time updates (if you have WebSocket)
    if (global.io) {
      global.io.emit('new-study', {
        studyInstanceUID: studyInstanceUID,
        patientName: metadata.PatientName,
        modality: metadata.Modality,
        frameCount: frameCount,
        hasCloudinaryBackup: !!cloudinaryUrl
      });
    }
    
  } catch (error) {
    console.error('Failed to process instance:', error);
    throw error;
  }
}

/**
 * Manual sync endpoint - Sync all Orthanc studies to database
 * यह manually भी call कर सकते हैं
 */
router.post('/orthanc/sync-all', async (req, res) => {
  try {
    console.log('Starting manual sync of all Orthanc studies...');
    
    const orthanc = getUnifiedOrthancService();
    
    // Get all studies from Orthanc
    const studyIds = await orthanc.getAllStudies();
    console.log(`Found ${studyIds.length} studies in Orthanc`);
    
    let syncedCount = 0;
    let errorCount = 0;
    
    for (const orthancStudyId of studyIds) {
      try {
        // Get study details
        const tags = await orthanc.getStudyTags(orthancStudyId);
        const instances = await orthanc.getStudyInstances(orthancStudyId);
        
        // Process each instance
        for (const instanceId of instances) {
          const instanceTags = await orthanc.getInstanceMetadata(instanceId);
          
          await processNewInstance(
            instanceId,
            tags.StudyInstanceUID,
            instanceTags.SeriesInstanceUID,
            instanceTags.SOPInstanceUID
          );
        }
        
        syncedCount++;
        console.log(`Synced study ${syncedCount}/${studyIds.length}`);
        
      } catch (error) {
        console.error(`Failed to sync study ${orthancStudyId}:`, error.message);
        errorCount++;
      }
    }
    
    res.json({
      success: true,
      message: 'Sync completed',
      synced: syncedCount,
      errors: errorCount,
      total: studyIds.length
    });
    
  } catch (error) {
    console.error('Sync failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get sync status
 */
router.get('/orthanc/sync-status', async (req, res) => {
  try {
    const orthanc = getUnifiedOrthancService();
    
    // Count studies in Orthanc
    const orthancStudies = await orthanc.getAllStudies();
    
    // Count studies in database
    const dbStudies = await Study.countDocuments();
    
    // Count instances in database
    const dbInstances = await Instance.countDocuments();
    
    res.json({
      orthanc: {
        studies: orthancStudies.length
      },
      database: {
        studies: dbStudies,
        instances: dbInstances
      },
      synced: orthancStudies.length === dbStudies
    });
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
