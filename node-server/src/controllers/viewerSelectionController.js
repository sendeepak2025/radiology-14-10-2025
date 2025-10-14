/**
 * Viewer Selection Controller
 * Handles selection synchronization for the medical image viewer
 */

/**
 * Sync selection state
 * POST /api/viewer/selection
 */
exports.syncSelection = async (req, res) => {
  try {
    const { itemId, itemType, action, timestamp, studyInstanceUID, frameIndex } = req.body

    // Validate request body
    if (!itemId || !itemType || !action) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: itemId, itemType, action'
      })
    }

    // Validate itemType
    if (!['measurement', 'annotation'].includes(itemType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid itemType. Must be "measurement" or "annotation"'
      })
    }

    // Validate action
    if (!['select', 'deselect'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid action. Must be "select" or "deselect"'
      })
    }

    // Log the selection event (for analytics/audit)
    console.log('Selection sync:', {
      itemId,
      itemType,
      action,
      timestamp,
      studyInstanceUID,
      frameIndex,
      user: req.user?.username || 'anonymous'
    })

    // In a real implementation, you might:
    // 1. Store selection events in a database for analytics
    // 2. Broadcast to other connected clients via WebSocket
    // 3. Update user session state
    // 4. Track user interactions for ML/analytics

    // For now, just acknowledge the sync
    res.json({
      success: true,
      itemId,
      timestamp: Date.now()
    })
  } catch (error) {
    console.error('Error syncing selection:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to sync selection'
    })
  }
}

/**
 * Sync item removal
 * DELETE /api/viewer/items/:itemId
 */
exports.syncRemoval = async (req, res) => {
  try {
    const { itemId } = req.params
    const { itemType, timestamp, studyInstanceUID } = req.body

    // Validate request
    if (!itemId || !itemType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: itemId, itemType'
      })
    }

    // Validate itemType
    if (!['measurement', 'annotation'].includes(itemType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid itemType. Must be "measurement" or "annotation"'
      })
    }

    // Log the removal event
    console.log('Item removal sync:', {
      itemId,
      itemType,
      timestamp,
      studyInstanceUID,
      user: req.user?.username || 'anonymous'
    })

    // In a real implementation, you might:
    // 1. Remove the item from a database
    // 2. Broadcast removal to other connected clients
    // 3. Update study metadata
    // 4. Create audit trail

    // For now, just acknowledge the removal
    res.json({
      success: true,
      itemId,
      timestamp: Date.now()
    })
  } catch (error) {
    console.error('Error syncing removal:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to sync removal'
    })
  }
}
