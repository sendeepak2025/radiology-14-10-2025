import type { Annotation, Point, ControlPoint } from '../types/viewer'

/**
 * BoundingBox interface for annotation bounds
 */
export interface BoundingBox {
  minX: number
  minY: number
  maxX: number
  maxY: number
  width: number
  height: number
  centerX: number
  centerY: number
}

/**
 * TransformService - Handles geometric transformations for annotations
 * 
 * Responsibilities:
 * - Calculate bounding boxes
 * - Resize annotations based on control point movement
 * - Move individual points
 * - Validate transformations
 */
class TransformService {
  /**
   * Get bounding box for an annotation
   * @param annotation - The annotation to calculate bounds for
   * @returns BoundingBox with min/max coordinates and dimensions
   */
  getBoundingBox(annotation: Annotation): BoundingBox {
    if (annotation.points.length === 0) {
      return {
        minX: 0,
        minY: 0,
        maxX: 0,
        maxY: 0,
        width: 0,
        height: 0,
        centerX: 0,
        centerY: 0,
      }
    }

    let minX = annotation.points[0].x
    let minY = annotation.points[0].y
    let maxX = annotation.points[0].x
    let maxY = annotation.points[0].y

    for (const point of annotation.points) {
      minX = Math.min(minX, point.x)
      minY = Math.min(minY, point.y)
      maxX = Math.max(maxX, point.x)
      maxY = Math.max(maxY, point.y)
    }

    const width = maxX - minX
    const height = maxY - minY
    const centerX = minX + width / 2
    const centerY = minY + height / 2

    return {
      minX,
      minY,
      maxX,
      maxY,
      width,
      height,
      centerX,
      centerY,
    }
  }

  /**
   * Resize annotation based on control point movement
   * @param annotation - The annotation to resize
   * @param controlPoint - The control point being dragged
   * @param newPos - New position of the control point (normalized coordinates)
   * @param minSize - Minimum size constraint (default: 0.01 in normalized space)
   * @returns New annotation with resized points
   */
  resizeAnnotation(
    annotation: Annotation,
    controlPoint: ControlPoint,
    newPos: Point,
    minSize: number = 0.01
  ): Annotation {
    const { type } = annotation

    if (type === 'rectangle') {
      return this.resizeRectangle(annotation, controlPoint, newPos, minSize)
    } else if (type === 'circle') {
      return this.resizeCircle(annotation, controlPoint, newPos, minSize)
    } else if (type === 'freehand' || type === 'polygon') {
      // For freehand/polygon, control points move individual vertices
      return this.movePoint(annotation, controlPoint.index, newPos)
    }

    // For other types, return unchanged
    console.warn('[TransformService] Resize not supported for type:', type)
    return annotation
  }

  /**
   * Resize rectangle annotation
   * @param annotation - Rectangle annotation
   * @param controlPoint - Control point being dragged
   * @param newPos - New position
   * @param minSize - Minimum size
   * @returns Resized rectangle
   */
  private resizeRectangle(
    annotation: Annotation,
    controlPoint: ControlPoint,
    newPos: Point,
    minSize: number
  ): Annotation {
    if (annotation.points.length !== 2) {
      console.warn('[TransformService] Rectangle must have exactly 2 points')
      return annotation
    }

    const [topLeft, bottomRight] = annotation.points
    let newTopLeft = { ...topLeft }
    let newBottomRight = { ...bottomRight }

    // Determine which corner/edge is being dragged based on control point ID
    const cpId = controlPoint.id

    if (cpId === 'corner-0') {
      // Top-left corner
      newTopLeft = newPos
    } else if (cpId === 'corner-1') {
      // Top-right corner
      newTopLeft.y = newPos.y
      newBottomRight.x = newPos.x
    } else if (cpId === 'corner-2') {
      // Bottom-right corner
      newBottomRight = newPos
    } else if (cpId === 'corner-3') {
      // Bottom-left corner
      newTopLeft.x = newPos.x
      newBottomRight.y = newPos.y
    } else if (cpId === 'edge-0') {
      // Top edge
      newTopLeft.y = newPos.y
    } else if (cpId === 'edge-1') {
      // Right edge
      newBottomRight.x = newPos.x
    } else if (cpId === 'edge-2') {
      // Bottom edge
      newBottomRight.y = newPos.y
    } else if (cpId === 'edge-3') {
      // Left edge
      newTopLeft.x = newPos.x
    }

    // Ensure minimum size
    const width = Math.abs(newBottomRight.x - newTopLeft.x)
    const height = Math.abs(newBottomRight.y - newTopLeft.y)

    if (width < minSize || height < minSize) {
      console.warn('[TransformService] Rectangle too small, maintaining minimum size')
      return annotation
    }

    // Ensure correct order (top-left, bottom-right)
    const finalTopLeft = {
      x: Math.min(newTopLeft.x, newBottomRight.x),
      y: Math.min(newTopLeft.y, newBottomRight.y),
    }
    const finalBottomRight = {
      x: Math.max(newTopLeft.x, newBottomRight.x),
      y: Math.max(newTopLeft.y, newBottomRight.y),
    }

    return {
      ...annotation,
      points: [finalTopLeft, finalBottomRight],
      updatedAt: new Date().toISOString(),
    }
  }

  /**
   * Resize circle annotation
   * @param annotation - Circle annotation
   * @param controlPoint - Control point being dragged
   * @param newPos - New position
   * @param minSize - Minimum radius
   * @returns Resized circle
   */
  private resizeCircle(
    annotation: Annotation,
    controlPoint: ControlPoint,
    newPos: Point,
    minSize: number
  ): Annotation {
    if (annotation.points.length !== 2) {
      console.warn('[TransformService] Circle must have exactly 2 points (center + edge)')
      return annotation
    }

    const [center, edge] = annotation.points

    // Calculate new radius based on distance from center to new position
    const newRadius = Math.sqrt(
      Math.pow(newPos.x - center.x, 2) + Math.pow(newPos.y - center.y, 2)
    )

    // Ensure minimum radius
    if (newRadius < minSize) {
      console.warn('[TransformService] Circle too small, maintaining minimum radius')
      return annotation
    }

    // Determine new edge point based on control point direction
    const cpId = controlPoint.id
    let newEdge = { ...edge }

    if (cpId === 'cardinal-0') {
      // North
      newEdge = { x: center.x, y: center.y - newRadius }
    } else if (cpId === 'cardinal-1') {
      // East
      newEdge = { x: center.x + newRadius, y: center.y }
    } else if (cpId === 'cardinal-2') {
      // South
      newEdge = { x: center.x, y: center.y + newRadius }
    } else if (cpId === 'cardinal-3') {
      // West
      newEdge = { x: center.x - newRadius, y: center.y }
    } else {
      // Generic: use new position directly
      newEdge = newPos
    }

    return {
      ...annotation,
      points: [center, newEdge],
      updatedAt: new Date().toISOString(),
    }
  }

  /**
   * Move a specific point in an annotation
   * @param annotation - The annotation
   * @param pointIndex - Index of the point to move
   * @param newPos - New position for the point
   * @returns Annotation with updated point
   */
  movePoint(annotation: Annotation, pointIndex: number, newPos: Point): Annotation {
    if (pointIndex < 0 || pointIndex >= annotation.points.length) {
      console.warn('[TransformService] Invalid point index:', pointIndex)
      return annotation
    }

    const newPoints = [...annotation.points]
    newPoints[pointIndex] = newPos

    return {
      ...annotation,
      points: newPoints,
      updatedAt: new Date().toISOString(),
    }
  }

  /**
   * Move entire annotation by delta
   * @param annotation - The annotation to move
   * @param delta - Movement delta { dx, dy }
   * @returns Annotation with moved points
   */
  moveAnnotation(annotation: Annotation, delta: Point): Annotation {
    const movedPoints = annotation.points.map(point => ({
      x: point.x + delta.x,
      y: point.y + delta.y,
    }))

    return {
      ...annotation,
      points: movedPoints,
      updatedAt: new Date().toISOString(),
    }
  }

  /**
   * Validate that annotation doesn't have self-intersecting edges
   * (for polygons and freehand)
   * @param annotation - The annotation to validate
   * @returns true if valid, false if self-intersecting
   */
  validateNoSelfIntersection(annotation: Annotation): boolean {
    if (annotation.type !== 'polygon' && annotation.type !== 'freehand') {
      return true // Not applicable
    }

    const points = annotation.points
    if (points.length < 4) {
      return true // Need at least 4 points to have intersection
    }

    // Check each edge against all other non-adjacent edges
    for (let i = 0; i < points.length; i++) {
      const p1 = points[i]
      const p2 = points[(i + 1) % points.length]

      for (let j = i + 2; j < points.length; j++) {
        // Skip adjacent edges
        if (j === (i + points.length - 1) % points.length) continue

        const p3 = points[j]
        const p4 = points[(j + 1) % points.length]

        if (this.doSegmentsIntersect(p1, p2, p3, p4)) {
          return false
        }
      }
    }

    return true
  }

  /**
   * Check if two line segments intersect
   * @param p1 - Start of segment 1
   * @param p2 - End of segment 1
   * @param p3 - Start of segment 2
   * @param p4 - End of segment 2
   * @returns true if segments intersect
   */
  private doSegmentsIntersect(p1: Point, p2: Point, p3: Point, p4: Point): boolean {
    const ccw = (a: Point, b: Point, c: Point) => {
      return (c.y - a.y) * (b.x - a.x) > (b.y - a.y) * (c.x - a.x)
    }

    return (
      ccw(p1, p3, p4) !== ccw(p2, p3, p4) &&
      ccw(p1, p2, p3) !== ccw(p1, p2, p4)
    )
  }
}

// Export singleton instance
export const transformService = new TransformService()
export default transformService
