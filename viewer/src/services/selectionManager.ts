import type { Annotation, Point, BoundingBox } from '../types/viewer'
import { store } from '../store'
import { selectAnnotation as selectAnnotationAction } from '../store/slices/viewerSlice'

/**
 * SelectionManager
 * 
 * Manages annotation selection state and provides selection-related utilities.
 */
export class SelectionManager {
  /**
   * Select an annotation by ID
   */
  selectAnnotation(id: string): void {
    store.dispatch(selectAnnotationAction(id))
  }

  /**
   * Deselect all annotations
   */
  deselectAll(): void {
    store.dispatch(selectAnnotationAction(null))
  }

  /**
   * Get the currently selected annotation
   */
  getSelectedAnnotation(annotations: Annotation[]): Annotation | null {
    const state = store.getState()
    const selectedId = state.viewer.selection.selectedAnnotationId
    
    if (!selectedId) return null
    
    return annotations.find(a => a.id === selectedId) || null
  }

  /**
   * Check if an annotation is selected
   */
  isAnnotationSelected(id: string): boolean {
    const state = store.getState()
    return state.viewer.selection.selectedAnnotationId === id
  }

  /**
   * Highlight annotation with selection outline
   */
  highlightAnnotation(annotation: Annotation, ctx: CanvasRenderingContext2D, imageToCanvasCoords: (p: Point) => Point): void {
    const canvasPoints = annotation.normalized
      ? annotation.points.map(p => imageToCanvasCoords(p))
      : annotation.points

    if (canvasPoints.length === 0) return

    ctx.save()
    
    // Selection outline style
    ctx.strokeStyle = '#ffff00' // Yellow
    ctx.lineWidth = 3
    ctx.shadowColor = 'rgba(255, 255, 0, 0.5)'
    ctx.shadowBlur = 8
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 0

    // Draw outline based on annotation type
    switch (annotation.type) {
      case 'rectangle':
        this.highlightRectangle(canvasPoints, ctx)
        break
      case 'circle':
        this.highlightCircle(canvasPoints, ctx)
        break
      case 'freehand':
      case 'polygon':
        this.highlightPolygon(canvasPoints, ctx)
        break
      case 'arrow':
      case 'text':
        this.highlightPoints(canvasPoints, ctx)
        break
      default:
        this.highlightPolygon(canvasPoints, ctx)
    }

    ctx.restore()
  }

  /**
   * Highlight rectangle annotation
   */
  private highlightRectangle(points: Point[], ctx: CanvasRenderingContext2D): void {
    if (points.length < 2) return

    const [p1, p2] = points
    const x = Math.min(p1.x, p2.x)
    const y = Math.min(p1.y, p2.y)
    const width = Math.abs(p2.x - p1.x)
    const height = Math.abs(p2.y - p1.y)

    ctx.strokeRect(x, y, width, height)
  }

  /**
   * Highlight circle annotation
   */
  private highlightCircle(points: Point[], ctx: CanvasRenderingContext2D): void {
    if (points.length < 2) return

    const [center, edge] = points
    const radius = Math.sqrt(Math.pow(edge.x - center.x, 2) + Math.pow(edge.y - center.y, 2))

    ctx.beginPath()
    ctx.arc(center.x, center.y, radius, 0, Math.PI * 2)
    ctx.stroke()
  }

  /**
   * Highlight polygon/freehand annotation
   */
  private highlightPolygon(points: Point[], ctx: CanvasRenderingContext2D): void {
    if (points.length < 2) return

    ctx.beginPath()
    ctx.moveTo(points[0].x, points[0].y)
    
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y)
    }
    
    ctx.stroke()
  }

  /**
   * Highlight points (for arrow, text, etc.)
   */
  private highlightPoints(points: Point[], ctx: CanvasRenderingContext2D): void {
    if (points.length === 0) return

    // Draw circles around each point
    points.forEach(point => {
      ctx.beginPath()
      ctx.arc(point.x, point.y, 15, 0, Math.PI * 2)
      ctx.stroke()
    })
  }

  /**
   * Get bounding box for an annotation
   */
  getBoundingBox(annotation: Annotation, imageToCanvasCoords: (p: Point) => Point): BoundingBox {
    const canvasPoints = annotation.normalized
      ? annotation.points.map(p => imageToCanvasCoords(p))
      : annotation.points

    if (canvasPoints.length === 0) {
      return { x: 0, y: 0, width: 0, height: 0 }
    }

    const xs = canvasPoints.map(p => p.x)
    const ys = canvasPoints.map(p => p.y)
    
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    }
  }
}

// Export singleton instance
export const selectionManager = new SelectionManager()
