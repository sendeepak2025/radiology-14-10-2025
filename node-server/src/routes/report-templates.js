const express = require('express');
const router = express.Router();
const {
  getReportTemplates,
  getReportTemplateById,
  createReportTemplate,
  updateReportTemplate,
  deleteReportTemplate,
  seedDefaultTemplates,
  incrementUsageCount,
  getTemplateStats,
} = require('../controllers/reportTemplateController');

/**
 * Report Template Routes
 */

// GET /api/report-templates - Get all templates with filters
router.get('/', getReportTemplates);

// GET /api/report-templates/stats - Get template statistics
router.get('/stats', getTemplateStats);

// POST /api/report-templates/seed - Seed default templates
router.post('/seed', seedDefaultTemplates);

// GET /api/report-templates/:id - Get specific template
router.get('/:id', getReportTemplateById);

// POST /api/report-templates - Create new template
router.post('/', createReportTemplate);

// PUT /api/report-templates/:id - Update template
router.put('/:id', updateReportTemplate);

// DELETE /api/report-templates/:id - Delete template
router.delete('/:id', deleteReportTemplate);

// POST /api/report-templates/:id/increment-usage - Increment usage count
router.post('/:id/increment-usage', incrementUsageCount);

module.exports = router;
