const express = require('express');
const router = express.Router();
const structuredReportController = require('../controllers/structuredReportController');

/**
 * Structured Reporting API Routes
 * TODO: Add authentication before production - currently open for testing
 */

// Dummy authentication middleware for testing
const dummyAuthMiddleware = (req, res, next) => {
  // Create a dummy user for testing
  req.user = {
    id: 'test-user-123',
    _id: 'test-user-123',
    firstName: 'Test',
    lastName: 'Radiologist',
    email: 'test@example.com',
    username: 'test.radiologist'
  };
  next();
};

// Create or update a structured report
router.post('/',
  dummyAuthMiddleware,
  structuredReportController.saveReport
);

// Get reports by study
router.get('/study/:studyInstanceUID',
  dummyAuthMiddleware,
  structuredReportController.getReportsByStudy
);

// Get reports by patient
router.get('/patient/:patientID',
  dummyAuthMiddleware,
  structuredReportController.getReportsByPatient
);

// Get reports by current radiologist
router.get('/my-reports',
  dummyAuthMiddleware,
  structuredReportController.getReportsByRadiologist
);

// Get report statistics
router.get('/stats',
  dummyAuthMiddleware,
  structuredReportController.getReportStats
);

// Get specific report by ID
router.get('/:reportId',
  dummyAuthMiddleware,
  structuredReportController.getReportById
);

// Export report
router.get('/:reportId/export',
  dummyAuthMiddleware,
  structuredReportController.exportReport
);

// Delete (cancel) report
router.delete('/:reportId',
  dummyAuthMiddleware,
  structuredReportController.deleteReport
);

module.exports = router;
