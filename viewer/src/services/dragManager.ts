import type { Annotation, Point, DragState } from '../types/viewer'
import { store } from '../store'
import { updateAnnotation } from '../store/slices/viewerSlice'

/**
 * DragManager - Manages drag and drop operations for annotations
 * 
 * Responsibilities:
 * - Track drag state (start position, current position, drag type)
 * - Calculate position deltas during drag
 * - Apply transformations to annotations
 * - Update Redux state on drag end
 */
class DragManager {
  private dragState: DragState | null = null
  private initialAnnotation: Annotation | null = null

  /**
   * Start a drag operation
   * @param annotation - The annotation being dragged
   * @param startPos - The starting position of the drag (canvas coordinates)
   * @param type - Type of drag: 'move' (whole annotation) or 'point' (single point) or 'resize' (control point)
   */
  startDrag(annotation: Annotation, startPos: Point, type: DragState['dragType']): void {
    this.initialAnnotation = JSON.parse(JSON.stringify(annotation)) // Deep clone
    
    this.dragState = {
      isDragging: true,
      dragType: type,
      startPosition: startPos,
      currentPosition: startPos,
      targetId: annotation.id,
      controlPointId: undefined,
      initialAnnotation: this.initialAnnotation,
    }

    console.log('[DragManager] Started drag:', {
      type,
      annotationId: annotation.id,
      startPos,
    })
  }

  /**
   * Start a drag operation with a specific control point
   * @param annotation - The annotation being dragged
   * @param startPos - The starting position of the drag
   * @param controlPointId - ID of the control point being dragged
   */
  startControlPointDrag(annotation: Annotation, startPos: Point, controlPointId: string): void {
    this.initialAnnotation = JSON.parse(JSON.stringify(annotation)) // Deep clone
    
    this.dragState = {
      isDragging: true,
      dragType: 'resize',
      startPosition: startPos,
      currentPosition: startPos,
      targetId: annotation.id,
      controlPointId,
      initialAnnotation: this.initialAnnotation,
    }

    console.log('[DragManager] Started control point drag:', {
      annotationId: annotation.id,
      controlPointId,
      startPos,
    })
  }

  /**
   * Update drag position
   * @param currentPos - Current mouse position (canvas coordinates)
   * @returns The delta movement since drag start
   */
  updateDrag(currentPos: Point): { dx: number; dy: number } | null {
    if (!this.dragState) {
      return null
    }

    this.dragState.currentPosition = currentPos

    const dx = currentPos.x - this.dragState.startPosition.x
    const dy = currentPos.y - this.dragState.startPosition.y

    return { dx, dy }
  }

  /**
   * End the drag operation and save changes to Redux
   * @param finalAnnotation - The final state of the annotation after drag
   */
  endDrag(finalAnnotation?: Annotation): void {
    if (!this.dragState) {
      console.warn('[DragManager] endDrag called but no drag in progress')
      return
    }

    const { targetId, dragType, startPosition, currentPosition } = this.dragState

    // Calculate total movement
    const dx = currentPosition.x - startPosition.x
    const dy = currentPosition.y - startPosition.y

    console.log('[DragManager] Ended drag:', {
      annotationId: targetId,
      dragType,
      delta: { dx, dy },
      moved: Math.abs(dx) > 1 || Math.abs(dy) > 1,
    })

    // If annotation was actually moved, update Redux
    if (finalAnnotation && (Math.abs(dx) > 1 || Math.abs(dy) > 1)) {
      store.dispatch(updateAnnotation(finalAnnotation))
      console.log('[DragManager] Updated annotation in Redux:', finalAnnotation.id)
    }

    // Clear drag state
    this.dragState = null
    this.initialAnnotation = null
  }

  /**
   * Cancel the current drag operation without saving
   */
  cancelDrag(): void {
    if (!this.dragState) {
      return
    }

    console.log('[DragManager] Cancelled drag:', this.dragState.targetId)
    
    this.dragState = null
    this.initialAnnotation = null
  }

  /**
   * Check if a drag is currently in progress
   */
  isDragging(): boolean {
    return this.dragState !== null && this.dragState.isDragging
  }

  /**
   * Get the current drag state
   */
  getDragState(): DragState | null {
    return this.dragState
  }

  /**
   * Get the initial annotation state (before drag started)
   */
  getInitialAnnotation(): Annotation | null {
    return this.initialAnnotation
  }

  /**
   * Apply movement transformation to annotation
   * Moves all points by the given delta
   * @param annotation - The annotation to transform
   * @param delta - The movement delta { dx, dy }
   * @returns New annotation with updated points
   */
  applyMovement(annotation: Annotation, delta: { dx: number; dy: number }): Annotation {
    // For normalized coordinates, we need to convert delta to normalized space
    // This will be handled by the caller who has access to canvas dimensions
    
    const movedPoints = annotation.points.map(point => ({
      x: point.x + delta.dx,
      y: point.y + delta.dy,
    }))

    return {
      ...annotation,
      points: movedPoints,
      updatedAt: new Date().toISOString(),
    }
  }

  /**
   * Apply point movement to a specific point in the annotation
   * @param annotation - The annotation to transform
   * @param pointIndex - Index of the point to move
   * @param newPosition - New position for the point
   * @returns New annotation with updated point
   */
  applyPointMovement(
    annotation: Annotation,
    pointIndex: number,
    newPosition: Point
  ): Annotation {
    if (pointIndex < 0 || pointIndex >= annotation.points.length) {
      console.warn('[DragManager] Invalid point index:', pointIndex)
      return annotation
    }

    const updatedPoints = [...annotation.points]
    updatedPoints[pointIndex] = newPosition

    return {
      ...annotation,
      points: updatedPoints,
      updatedAt: new Date().toISOString(),
    }
  }
}

// Export singleton instance
export const dragManager = new DragManager()
export default dragManager
