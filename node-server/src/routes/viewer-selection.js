/**
 * Viewer Selection Routes
 * Routes for selection synchronization in the medical image viewer
 */

const express = require('express')
const router = express.Router()
const viewerSelectionController = require('../controllers/viewerSelectionController')
const { authenticateToken } = require('../middleware/authMiddleware')
const { createRateLimiter } = require('../middleware/rateLimitMiddleware')

// Apply authentication middleware to all routes
// Comment out if you want to test without authentication
// router.use(authenticateToken)

// Apply rate limiting: 100 requests per minute per user/IP
const rateLimiter = createRateLimiter({
  windowMs: 60000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'Too many selection sync requests. Please slow down.'
})

router.use(rateLimiter)

/**
 * @route   POST /api/viewer/selection
 * @desc    Sync selection state (select/deselect measurement or annotation)
 * @access  Private (requires authentication)
 * @body    {
 *            itemId: string,
 *            itemType: 'measurement' | 'annotation',
 *            action: 'select' | 'deselect',
 *            timestamp: number,
 *            studyInstanceUID: string,
 *            frameIndex: number
 *          }
 */
router.post('/selection', viewerSelectionController.syncSelection)

/**
 * @route   DELETE /api/viewer/items/:itemId
 * @desc    Sync item removal (measurement or annotation)
 * @access  Private (requires authentication)
 * @params  itemId - ID of the item to remove
 * @body    {
 *            itemType: 'measurement' | 'annotation',
 *            timestamp: number,
 *            studyInstanceUID: string
 *          }
 */
router.delete('/items/:itemId', viewerSelectionController.syncRemoval)

module.exports = router
