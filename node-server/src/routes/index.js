const express = require('express');
const { getRoot } = require('../controllers/healthController');
const { getStudies, getStudy, getStudyMetadata } = require('../controllers/studyController');
const { getFrame } = require('../controllers/instanceController');
const { getFrame: getFrameOrthanc, getInstanceMetadata, checkOrthancHealth } = require('../controllers/orthancInstanceController');
const { getDICOMMigrationService } = require('../services/dicom-migration-service');
const { uploadMiddleware, handleUpload } = require('../controllers/uploadController');
const { uploadZipStudy, getZipUploadInfo, testZipUpload, uploadMiddleware: zipUploadMiddleware } = require('../controllers/zipUploadController');
const { getPatients, getPatientStudies, createPatient } = require('../controllers/patientController');
const authRoutes = require('./auth');
const secretsRoutes = require('./secrets');
const anonymizationRoutes = require('./anonymization');
const metricsRoutes = require('./metrics');
const healthRoutes = require('./health');
const alertsRoutes = require('./alerts');
const rbacRoutes = require('./rbac');
const adminActionRoutes = require('./admin-actions');
const migrationRoutes = require('./migration');
const pacsRoutes = require('./pacs');
const viewerSelectionRoutes = require('./viewer-selection');
const structuredReportsRoutes = require('./structured-reports');
const signatureRoutes = require('./signature');

const router = express.Router();

// Health
router.get('/', getRoot);

// PACS Upload Interface (TODO: Add authentication before production - currently open for testing)
router.get('/pacs-upload', (req, res) => {
  res.sendFile('pacs-upload.html', { root: './public' });
});

// Orthanc Viewer Interface
router.get('/viewer', (req, res) => {
  res.sendFile('orthanc-viewer.html', { root: './public' });
});

// Patients (TODO: Add authentication before production - currently open for testing)
router.get('/api/patients', getPatients);
router.get('/api/patients/:patientID/studies', getPatientStudies);
router.post('/api/patients', express.json(), createPatient);

// DICOM Studies (TODO: Add authentication before production - currently open for testing)
router.get('/api/dicom/studies', getStudies);
router.get('/api/dicom/studies/:studyUid', getStudy);
router.get('/api/dicom/studies/:studyUid/metadata', getStudyMetadata);

// Frames - with migration support (TODO: Add authentication before production - currently open for testing)
router.get('/api/dicom/studies/:studyUid/frames/:frameIndex', async (req, res) => {
  const migrationService = getDICOMMigrationService({
    enableOrthancPreview: process.env.ENABLE_ORTHANC_PREVIEW !== 'false',
    migrationPercentage: parseInt(process.env.ORTHANC_MIGRATION_PERCENTAGE) || 100
  });
  
  return await migrationService.getFrameWithMigration(req, res, getFrame);
});

// Orthanc-specific endpoints (TODO: Add authentication before production - currently open for testing)
router.get('/api/dicom/instances/:instanceId/metadata', getInstanceMetadata);
router.get('/api/dicom/orthanc/health', checkOrthancHealth);

// Upload (TODO: Add authentication before production - currently open for testing)
router.post('/api/dicom/upload', uploadMiddleware(), handleUpload);

// ZIP Upload - Upload entire ZIP as single DICOM study (TODO: Add authentication before production)
router.post('/api/dicom/upload/zip', zipUploadMiddleware().single('file'), uploadZipStudy);
router.get('/api/dicom/upload/zip/info', getZipUploadInfo);
router.post('/api/dicom/upload/zip/test', zipUploadMiddleware().single('file'), testZipUpload);

// Auth
router.use('/auth', authRoutes);

// RBAC
router.use('/api/rbac', rbacRoutes);

// Admin Actions
router.use('/api/admin-actions', adminActionRoutes);

// Secrets management
router.use('/api/secrets', secretsRoutes);

// Anonymization
router.use('/api/anonymization', anonymizationRoutes);

// Metrics
router.use('/metrics', metricsRoutes);

// Health checks
router.use('/health', healthRoutes);

// Alerts
router.use('/alerts', alertsRoutes);

// Migration
router.use('/api/migration', migrationRoutes);

// PACS Integration (TODO: Add authentication before production - currently open for testing)
router.use('/api/pacs', pacsRoutes);

// Orthanc Webhook (Auto-sync when files uploaded to Orthanc)
const orthancWebhookRoutes = require('./orthanc-webhook');
router.use('/api', orthancWebhookRoutes);

// Orthanc Viewer API - Direct access to Orthanc for UI display
const orthancViewController = require('../controllers/orthancViewController');
router.get('/api/viewer/orthanc/studies', orthancViewController.getAllStudies);
router.get('/api/viewer/orthanc/studies/search', orthancViewController.searchStudies);
router.get('/api/viewer/orthanc/studies/:studyId', orthancViewController.getStudy);
router.get('/api/viewer/orthanc/series/:seriesId', orthancViewController.getSeries);
router.get('/api/viewer/orthanc/stats', orthancViewController.getStats);

// Unified Viewer API - Shows both Orthanc + Database data
const unifiedViewController = require('../controllers/unifiedViewController');
router.get('/api/viewer/studies', unifiedViewController.getAllStudies);
router.get('/api/viewer/studies/search', unifiedViewController.searchStudies);
router.get('/api/viewer/studies/:studyId', unifiedViewController.getStudy);
router.get('/api/viewer/stats', unifiedViewController.getStats);

// Viewer Selection Sync API - Selection synchronization for measurements and annotations
router.use('/api/viewer', viewerSelectionRoutes);

// Structured Reporting API - Medical findings, measurements, and reports
router.use('/api/reports', structuredReportsRoutes);

// Signature Upload API - Upload signatures to Cloudinary
router.use('/api/signature', signatureRoutes);

module.exports = router;