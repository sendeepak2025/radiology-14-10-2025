const express = require('express');
const router = express.Router();
const {
  getPaginatedStudies,
  getStudiesCount,
  searchStudies,
  getRecentStudies,
  getStudiesByPatient,
  getStudiesByModality,
  getStudyStats,
} = require('../controllers/studyPaginationController');

const { validatePagination, validateSearchQuery } = require('../middleware/validation');

/**
 * Paginated Studies Routes
 * Optimized endpoints for efficient data retrieval
 */

// GET /api/studies/paginated - Get paginated studies with filters
router.get('/paginated', validatePagination, validateSearchQuery, getPaginatedStudies);

// GET /api/studies/count - Get count of studies
router.get('/count', getStudiesCount);

// GET /api/studies/search - Full-text search
router.get('/search', validatePagination, searchStudies);

// GET /api/studies/recent - Get recent studies
router.get('/recent', getRecentStudies);

// GET /api/studies/by-patient/:patientID - Get studies by patient
router.get('/by-patient/:patientID', validatePagination, getStudiesByPatient);

// GET /api/studies/by-modality/:modality - Get studies by modality
router.get('/by-modality/:modality', validatePagination, getStudiesByModality);

// GET /api/studies/stats - Get study statistics
router.get('/stats', getStudyStats);

// GET /api/studies/:studyInstanceUID/reports - Get reports for a study
const { getReportsByStudy } = require('../controllers/reportController');
router.get('/:studyInstanceUID/reports', getReportsByStudy);

module.exports = router;
