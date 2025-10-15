const express = require('express');
const router = express.Router();
const {
  createReport,
  getReportById,
  getReportsByStudy,
  updateReport,
  finalizeReport,
  signReport,
  amendReport,
  deleteReport,
  getReportStats,
} = require('../controllers/reportController');

/**
 * Report Routes
 */

// GET /api/reports/stats - Get report statistics
router.get('/stats', getReportStats);

// POST /api/reports - Create new report
router.post('/', createReport);

// GET /api/reports/:id - Get specific report
router.get('/:id', getReportById);

// PUT /api/reports/:id - Update report
router.put('/:id', updateReport);

// DELETE /api/reports/:id - Delete report (draft only)
router.delete('/:id', deleteReport);

// POST /api/reports/:id/finalize - Finalize report
router.post('/:id/finalize', finalizeReport);

// POST /api/reports/:id/sign - Sign report
router.post('/:id/sign', signReport);

// POST /api/reports/:id/amend - Amend report
router.post('/:id/amend', amendReport);

// Study-specific reports
// GET /api/studies/:studyInstanceUID/reports - moved to study routes

module.exports = router;
