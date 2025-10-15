/**
 * Machine Management Routes
 */

const express = require('express');
const router = express.Router();
const {
  getMachines,
  getMachine,
  createMachine,
  updateMachine,
  deleteMachine,
  testConnection,
  generateConfig,
  getMachineStats
} = require('../controllers/machineController');

/**
 * Get all machines for organization
 * GET /api/machines?organizationId=xxx
 */
router.get('/', getMachines);

/**
 * Get single machine
 * GET /api/machines/:machineId
 */
router.get('/:machineId', getMachine);

/**
 * Create new machine
 * POST /api/machines
 */
router.post('/', createMachine);

/**
 * Update machine
 * PUT /api/machines/:machineId
 */
router.put('/:machineId', updateMachine);

/**
 * Delete machine
 * DELETE /api/machines/:machineId
 */
router.delete('/:machineId', deleteMachine);

/**
 * Test machine connection (DICOM C-ECHO)
 * POST /api/machines/:machineId/test
 */
router.post('/:machineId/test', testConnection);

/**
 * Generate configuration for machine
 * GET /api/machines/:machineId/config?format=json|text|qr
 */
router.get('/:machineId/config', generateConfig);

/**
 * Get machine statistics
 * GET /api/machines/:machineId/stats
 */
router.get('/:machineId/stats', getMachineStats);

module.exports = router;
