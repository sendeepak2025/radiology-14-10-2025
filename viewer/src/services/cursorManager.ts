/**
 * Cursor Manager
 * 
 * Manages cursor changes based on interaction context
 */

import type { CursorType, ControlPoint, Annotation, Point } from '../types/viewer'

class CursorManager {
  private canvas: HTMLCanvasElement | null = null
  private currentCursor: string = 'default'

  /**
   * Set the canvas element
   */
  setCanvas(canvas: HTMLCanvasElement): void {
    this.canvas = canvas
  }

  /**
   * Set cursor style
   */
  setCursor(cursor: string): void {
    if (this.canvas && this.currentCursor !== cursor) {
      this.canvas.style.cursor = cursor
      this.currentCursor = cursor
    }
  }

  /**
   * Get current cursor
   */
  getCurrentCursor(): string {
    return this.currentCursor
  }

  /**
   * Reset to default cursor
   */
  resetCursor(): void {
    this.setCursor('default')
  }

  /**
   * Set cursor based on control point type
   */
  setControlPointCursor(controlPoint: ControlPoint): void {
    this.setCursor(controlPoint.cursor)
  }

  /**
   * Set cursor for annotation hover
   */
  setAnnotationHoverCursor(annotation: Annotation): void {
    if (annotation.type === 'text') {
      this.setCursor('text')
    } else {
      this.setCursor('move')
    }
  }

  /**
   * Set cursor for drawing mode
   */
  setDrawingCursor(annotationType: Annotation['type']): void {
    switch (annotationType) {
      case 'text':
        this.setCursor('text')
        break
      case 'arrow':
      case 'freehand':
      case 'rectangle':
      case 'circle':
      case 'polygon':
      case 'leader':
      case 'clinical':
      case 'measurement':
        this.setCursor('crosshair')
        break
      default:
        this.setCursor('crosshair')
    }
  }

  /**
   * Set cursor for drag operation
   */
  setDragCursor(dragType: 'move' | 'resize'): void {
    if (dragType === 'move') {
      this.setCursor('move')
    } else {
      this.setCursor('grabbing')
    }
  }

  /**
   * Set cursor for pan tool
   */
  setPanCursor(isDragging: boolean = false): void {
    this.setCursor(isDragging ? 'grabbing' : 'grab')
  }

  /**
   * Set cursor for zoom tool
   */
  setZoomCursor(isZoomIn: boolean = true): void {
    this.setCursor(isZoomIn ? 'zoom-in' : 'zoom-out')
  }

  /**
   * Get resize cursor based on angle
   */
  getResizeCursorFromAngle(angle: number): CursorType {
    // Normalize angle to 0-360
    const normalizedAngle = ((angle % 360) + 360) % 360

    // Map angle to cursor type
    if (normalizedAngle >= 337.5 || normalizedAngle < 22.5) {
      return 'e-resize'
    } else if (normalizedAngle >= 22.5 && normalizedAngle < 67.5) {
      return 'ne-resize'
    } else if (normalizedAngle >= 67.5 && normalizedAngle < 112.5) {
      return 'n-resize'
    } else if (normalizedAngle >= 112.5 && normalizedAngle < 157.5) {
      return 'nw-resize'
    } else if (normalizedAngle >= 157.5 && normalizedAngle < 202.5) {
      return 'w-resize'
    } else if (normalizedAngle >= 202.5 && normalizedAngle < 247.5) {
      return 'sw-resize'
    } else if (normalizedAngle >= 247.5 && normalizedAngle < 292.5) {
      return 's-resize'
    } else {
      return 'se-resize'
    }
  }

  /**
   * Determine cursor based on interaction context
   */
  updateCursorForContext(context: {
    isDrawing?: boolean
    isDragging?: boolean
    hoveredControlPoint?: ControlPoint | null
    hoveredAnnotation?: Annotation | null
    activeTool?: string
    annotationType?: Annotation['type']
  }): void {
    const {
      isDrawing,
      isDragging,
      hoveredControlPoint,
      hoveredAnnotation,
      activeTool,
      annotationType,
    } = context

    // Priority order:
    // 1. Dragging
    if (isDragging) {
      this.setCursor('grabbing')
      return
    }

    // 2. Drawing
    if (isDrawing && annotationType) {
      this.setDrawingCursor(annotationType)
      return
    }

    // 3. Hovered control point
    if (hoveredControlPoint) {
      this.setControlPointCursor(hoveredControlPoint)
      return
    }

    // 4. Hovered annotation
    if (hoveredAnnotation) {
      this.setAnnotationHoverCursor(hoveredAnnotation)
      return
    }

    // 5. Active tool
    if (activeTool) {
      switch (activeTool) {
        case 'pan':
          this.setPanCursor(false)
          return
        case 'zoom':
          this.setZoomCursor(true)
          return
        case 'annotation':
        case 'textAnnotation':
        case 'arrowAnnotation':
        case 'freehand':
        case 'rectangle':
        case 'circle':
        case 'polygon':
        case 'leader':
        case 'clinical':
          this.setCursor('crosshair')
          return
        default:
          break
      }
    }

    // 6. Default
    this.resetCursor()
  }

  /**
   * Get cursor for corner control point
   */
  getCornerCursor(corner: 'nw' | 'ne' | 'sw' | 'se'): CursorType {
    const cursorMap: Record<string, CursorType> = {
      nw: 'nw-resize',
      ne: 'ne-resize',
      sw: 'sw-resize',
      se: 'se-resize',
    }
    return cursorMap[corner]
  }

  /**
   * Get cursor for edge control point
   */
  getEdgeCursor(edge: 'n' | 's' | 'e' | 'w'): CursorType {
    const cursorMap: Record<string, CursorType> = {
      n: 'n-resize',
      s: 's-resize',
      e: 'e-resize',
      w: 'w-resize',
    }
    return cursorMap[edge]
  }

  /**
   * Check if point is near annotation edge (for hover detection)
   */
  isNearAnnotationEdge(
    point: Point,
    annotation: Annotation,
    threshold: number = 10
  ): boolean {
    // Simple implementation - can be enhanced based on annotation type
    const points = annotation.points
    if (points.length < 2) return false

    for (let i = 0; i < points.length; i++) {
      const p1 = points[i]
      const p2 = points[(i + 1) % points.length]

      const distance = this.distanceToLineSegment(point, p1, p2)
      if (distance <= threshold) {
        return true
      }
    }

    return false
  }

  /**
   * Calculate distance from point to line segment
   */
  private distanceToLineSegment(
    point: Point,
    lineStart: Point,
    lineEnd: Point
  ): number {
    const dx = lineEnd.x - lineStart.x
    const dy = lineEnd.y - lineStart.y
    const lengthSquared = dx * dx + dy * dy

    if (lengthSquared === 0) {
      // Line segment is a point
      const pdx = point.x - lineStart.x
      const pdy = point.y - lineStart.y
      return Math.sqrt(pdx * pdx + pdy * pdy)
    }

    // Calculate projection of point onto line
    const t = Math.max(
      0,
      Math.min(
        1,
        ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) /
          lengthSquared
      )
    )

    const projectionX = lineStart.x + t * dx
    const projectionY = lineStart.y + t * dy

    const pdx = point.x - projectionX
    const pdy = point.y - projectionY

    return Math.sqrt(pdx * pdx + pdy * pdy)
  }
}

// Singleton instance
export const cursorManager = new CursorManager()
