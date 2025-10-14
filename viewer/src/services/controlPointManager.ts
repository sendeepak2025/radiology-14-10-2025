import type { Annotation, ControlPoint, Point, CursorType } from '../types/viewer'

/**
 * ControlPointManager
 * 
 * Manages control points for annotation editing.
 * Generates control points based on annotation type and handles hit detection.
 */
export class ControlPointManager {
  private hitRadius = 15 // pixels

  /**
   * Generate control points for an annotation based on its type
   */
  generateControlPoints(annotation: Annotation, imageToCanvasCoords: (p: Point) => Point): ControlPoint[] {
    const controlPoints: ControlPoint[] = []
    
    // Convert annotation points to canvas coordinates
    const canvasPoints = annotation.normalized
      ? annotation.points.map(p => imageToCanvasCoords(p))
      : annotation.points

    switch (annotation.type) {
      case 'rectangle':
        controlPoints.push(...this.generateRectangleControlPoints(annotation, canvasPoints))
        break
      
      case 'circle':
        controlPoints.push(...this.generateCircleControlPoints(annotation, canvasPoints))
        break
      
      case 'freehand':
      case 'polygon':
        controlPoints.push(...this.generatePolygonControlPoints(annotation, canvasPoints))
        break
      
      case 'arrow':
        controlPoints.push(...this.generateArrowControlPoints(annotation, canvasPoints))
        break
      
      case 'text':
        controlPoints.push(...this.generateTextControlPoints(annotation, canvasPoints))
        break
      
      default:
        // For other types, create control points at each vertex
        controlPoints.push(...this.generateDefaultControlPoints(annotation, canvasPoints))
    }

    return controlPoints
  }

  /**
   * Generate control points for rectangle (8 points: 4 corners + 4 edges)
   */
  private generateRectangleControlPoints(annotation: Annotation, canvasPoints: Point[]): ControlPoint[] {
    if (canvasPoints.length < 2) return []

    const [p1, p2] = canvasPoints
    const minX = Math.min(p1.x, p2.x)
    const maxX = Math.max(p1.x, p2.x)
    const minY = Math.min(p1.y, p2.y)
    const maxY = Math.max(p1.y, p2.y)
    const midX = (minX + maxX) / 2
    const midY = (minY + maxY) / 2

    return [
      // Corners
      { id: `${annotation.id}-nw`, annotationId: annotation.id, type: 'corner', position: { x: minX, y: minY }, cursor: 'nw-resize' },
      { id: `${annotation.id}-ne`, annotationId: annotation.id, type: 'corner', position: { x: maxX, y: minY }, cursor: 'ne-resize' },
      { id: `${annotation.id}-sw`, annotationId: annotation.id, type: 'corner', position: { x: minX, y: maxY }, cursor: 'sw-resize' },
      { id: `${annotation.id}-se`, annotationId: annotation.id, type: 'corner', position: { x: maxX, y: maxY }, cursor: 'se-resize' },
      // Edges
      { id: `${annotation.id}-n`, annotationId: annotation.id, type: 'edge', position: { x: midX, y: minY }, cursor: 'n-resize' },
      { id: `${annotation.id}-s`, annotationId: annotation.id, type: 'edge', position: { x: midX, y: maxY }, cursor: 's-resize' },
      { id: `${annotation.id}-w`, annotationId: annotation.id, type: 'edge', position: { x: minX, y: midY }, cursor: 'w-resize' },
      { id: `${annotation.id}-e`, annotationId: annotation.id, type: 'edge', position: { x: maxX, y: midY }, cursor: 'e-resize' },
    ]
  }

  /**
   * Generate control points for circle (4 points: cardinal directions)
   */
  private generateCircleControlPoints(annotation: Annotation, canvasPoints: Point[]): ControlPoint[] {
    if (canvasPoints.length < 2) return []

    const [center, edge] = canvasPoints
    const radius = Math.sqrt(Math.pow(edge.x - center.x, 2) + Math.pow(edge.y - center.y, 2))

    return [
      { id: `${annotation.id}-n`, annotationId: annotation.id, type: 'edge', position: { x: center.x, y: center.y - radius }, cursor: 'n-resize' },
      { id: `${annotation.id}-s`, annotationId: annotation.id, type: 'edge', position: { x: center.x, y: center.y + radius }, cursor: 's-resize' },
      { id: `${annotation.id}-w`, annotationId: annotation.id, type: 'edge', position: { x: center.x - radius, y: center.y }, cursor: 'w-resize' },
      { id: `${annotation.id}-e`, annotationId: annotation.id, type: 'edge', position: { x: center.x + radius, y: center.y }, cursor: 'e-resize' },
    ]
  }

  /**
   * Generate control points for freehand/polygon (one point per vertex)
   */
  private generatePolygonControlPoints(annotation: Annotation, canvasPoints: Point[]): ControlPoint[] {
    return canvasPoints.map((point, index) => ({
      id: `${annotation.id}-p${index}`,
      annotationId: annotation.id,
      type: 'point',
      position: point,
      cursor: 'move',
      index,
    }))
  }

  /**
   * Generate control points for arrow (2 points: start and end)
   */
  private generateArrowControlPoints(annotation: Annotation, canvasPoints: Point[]): ControlPoint[] {
    if (canvasPoints.length < 2) return []

    return [
      { id: `${annotation.id}-start`, annotationId: annotation.id, type: 'point', position: canvasPoints[0], cursor: 'move', index: 0 },
      { id: `${annotation.id}-end`, annotationId: annotation.id, type: 'point', position: canvasPoints[1], cursor: 'move', index: 1 },
    ]
  }

  /**
   * Generate control points for text (1 center point for moving)
   */
  private generateTextControlPoints(annotation: Annotation, canvasPoints: Point[]): ControlPoint[] {
    if (canvasPoints.length === 0) return []

    return [
      { id: `${annotation.id}-center`, annotationId: annotation.id, type: 'center', position: canvasPoints[0], cursor: 'move' },
    ]
  }

  /**
   * Generate default control points (one per vertex)
   */
  private generateDefaultControlPoints(annotation: Annotation, canvasPoints: Point[]): ControlPoint[] {
    return canvasPoints.map((point, index) => ({
      id: `${annotation.id}-p${index}`,
      annotationId: annotation.id,
      type: 'point',
      position: point,
      cursor: 'move',
      index,
    }))
  }

  /**
   * Find control point at given position
   */
  getControlPointAtPosition(controlPoints: ControlPoint[], position: Point): ControlPoint | null {
    for (const cp of controlPoints) {
      const distance = Math.sqrt(
        Math.pow(position.x - cp.position.x, 2) + 
        Math.pow(position.y - cp.position.y, 2)
      )
      
      if (distance <= this.hitRadius) {
        return cp
      }
    }
    
    return null
  }

  /**
   * Set hit radius for control point detection
   */
  setHitRadius(radius: number): void {
    this.hitRadius = radius
  }

  /**
   * Get hit radius
   */
  getHitRadius(): number {
    return this.hitRadius
  }
}

// Export singleton instance
export const controlPointManager = new ControlPointManager()
