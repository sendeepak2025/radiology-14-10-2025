/**
 * Hover Effects Manager
 * 
 * Manages visual hover effects for annotations and control points
 */

import type { Annotation, ControlPoint, Point } from '../types/viewer'

export interface HoverStyle {
  strokeColor: string
  fillColor?: string
  strokeWidth: number
  opacity: number
  glow?: boolean
  glowColor?: string
  glowBlur?: number
}

class HoverEffectsManager {
  private hoveredAnnotationId: string | null = null
  private hoveredControlPointId: string | null = null
  private transitionDuration = 150 // ms

  /**
   * Set hovered annotation
   */
  setHoveredAnnotation(annotationId: string | null): void {
    this.hoveredAnnotationId = annotationId
  }

  /**
   * Set hovered control point
   */
  setHoveredControlPoint(controlPointId: string | null): void {
    this.hoveredControlPointId = controlPointId
  }

  /**
   * Check if annotation is hovered
   */
  isAnnotationHovered(annotationId: string): boolean {
    return this.hoveredAnnotationId === annotationId
  }

  /**
   * Check if control point is hovered
   */
  isControlPointHovered(controlPointId: string): boolean {
    return this.hoveredControlPointId === controlPointId
  }

  /**
   * Get hover style for annotation
   */
  getAnnotationHoverStyle(annotation: Annotation): HoverStyle {
    const baseStyle = annotation.style

    if (this.isAnnotationHovered(annotation.id)) {
      return {
        strokeColor: this.lightenColor(baseStyle.strokeColor, 0.3),
        fillColor: baseStyle.fillColor
          ? this.lightenColor(baseStyle.fillColor, 0.2)
          : undefined,
        strokeWidth: baseStyle.strokeWidth + 1,
        opacity: Math.min(1, baseStyle.opacity + 0.2),
        glow: true,
        glowColor: baseStyle.strokeColor,
        glowBlur: 10,
      }
    }

    return {
      strokeColor: baseStyle.strokeColor,
      fillColor: baseStyle.fillColor,
      strokeWidth: baseStyle.strokeWidth,
      opacity: baseStyle.opacity,
    }
  }

  /**
   * Get control point size based on hover state
   */
  getControlPointSize(controlPoint: ControlPoint, baseSize: number = 8): number {
    if (this.isControlPointHovered(controlPoint.id)) {
      return baseSize * 1.5 // 8px → 12px
    }
    return baseSize
  }

  /**
   * Draw annotation with hover effects
   */
  drawAnnotationWithHover(
    ctx: CanvasRenderingContext2D,
    annotation: Annotation,
    drawFunction: (ctx: CanvasRenderingContext2D, style: HoverStyle) => void
  ): void {
    const hoverStyle = this.getAnnotationHoverStyle(annotation)

    // Apply glow effect if hovered
    if (hoverStyle.glow && hoverStyle.glowColor) {
      ctx.save()
      ctx.shadowColor = hoverStyle.glowColor
      ctx.shadowBlur = hoverStyle.glowBlur || 10
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 0
    }

    // Draw annotation
    drawFunction(ctx, hoverStyle)

    // Restore context
    if (hoverStyle.glow) {
      ctx.restore()
    }
  }

  /**
   * Draw control point with hover effects
   */
  drawControlPointWithHover(
    ctx: CanvasRenderingContext2D,
    controlPoint: ControlPoint,
    baseSize: number = 8
  ): void {
    const size = this.getControlPointSize(controlPoint, baseSize)
    const isHovered = this.isControlPointHovered(controlPoint.id)

    ctx.save()

    // Add glow effect on hover
    if (isHovered) {
      ctx.shadowColor = '#ffffff'
      ctx.shadowBlur = 8
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 0
    }

    // Draw control point
    ctx.beginPath()
    ctx.arc(controlPoint.position.x, controlPoint.position.y, size / 2, 0, Math.PI * 2)

    // Fill
    ctx.fillStyle = isHovered ? '#ffffff' : '#f0f0f0'
    ctx.fill()

    // Stroke
    ctx.strokeStyle = isHovered ? '#2196f3' : '#333333'
    ctx.lineWidth = isHovered ? 2 : 1.5
    ctx.stroke()

    ctx.restore()
  }

  /**
   * Lighten a color by a percentage
   */
  private lightenColor(color: string, percent: number): string {
    // Parse hex color
    const hex = color.replace('#', '')
    const r = parseInt(hex.substring(0, 2), 16)
    const g = parseInt(hex.substring(2, 4), 16)
    const b = parseInt(hex.substring(4, 6), 16)

    // Lighten
    const newR = Math.min(255, Math.floor(r + (255 - r) * percent))
    const newG = Math.min(255, Math.floor(g + (255 - g) * percent))
    const newB = Math.min(255, Math.floor(b + (255 - b) * percent))

    // Convert back to hex
    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`
  }

  /**
   * Get tooltip text for annotation
   */
  getAnnotationTooltip(annotation: Annotation): string {
    const name = annotation.metadata?.name || annotation.text || annotation.label
    const type = annotation.type.charAt(0).toUpperCase() + annotation.type.slice(1)

    if (name) {
      return `${type}: ${name}`
    }

    return type
  }

  /**
   * Get tooltip text for control point
   */
  getControlPointTooltip(controlPoint: ControlPoint): string {
    switch (controlPoint.type) {
      case 'corner':
        return 'Drag to resize'
      case 'edge':
        return 'Drag to resize'
      case 'point':
        return 'Drag to move point'
      case 'center':
        return 'Drag to move'
      default:
        return 'Drag to edit'
    }
  }

  /**
   * Draw tooltip
   */
  drawTooltip(
    ctx: CanvasRenderingContext2D,
    text: string,
    position: Point,
    offset: { x: number; y: number } = { x: 10, y: -10 }
  ): void {
    ctx.save()

    // Measure text
    ctx.font = '12px Arial'
    const metrics = ctx.measureText(text)
    const padding = 8
    const width = metrics.width + padding * 2
    const height = 20

    const x = position.x + offset.x
    const y = position.y + offset.y

    // Draw background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
    ctx.fillRect(x, y - height, width, height)

    // Draw border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
    ctx.lineWidth = 1
    ctx.strokeRect(x, y - height, width, height)

    // Draw text
    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, x + padding, y - height / 2)

    ctx.restore()
  }

  /**
   * Animate transition (for smooth hover effects)
   */
  animateTransition(
    from: number,
    to: number,
    duration: number,
    callback: (value: number) => void
  ): void {
    const startTime = performance.now()

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)

      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      const value = from + (to - from) * eased

      callback(value)

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)
  }

  /**
   * Clear hover state
   */
  clearHover(): void {
    this.hoveredAnnotationId = null
    this.hoveredControlPointId = null
  }
}

// Singleton instance
export const hoverEffectsManager = new HoverEffectsManager()
