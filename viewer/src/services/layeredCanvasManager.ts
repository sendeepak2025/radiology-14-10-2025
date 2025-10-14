/**
 * Layered Canvas Manager
 * 
 * Manages multiple canvas layers for optimized rendering:
 * - Base layer: DICOM image (rarely redrawn)
 * - Annotation layer: All annotations (redrawn on annotation changes)
 * - Control layer: Control points and UI overlays (redrawn on selection/hover)
 */

export interface CanvasLayers {
  base: HTMLCanvasElement
  annotation: HTMLCanvasElement
  control: HTMLCanvasElement
}

export interface LayerDirtyFlags {
  base: boolean
  annotation: boolean
  control: boolean
}

class LayeredCanvasManager {
  private layers: CanvasLayers | null = null
  private dirtyFlags: LayerDirtyFlags = {
    base: true,
    annotation: true,
    control: true,
  }
  private compositeCanvas: HTMLCanvasElement | null = null

  /**
   * Initialize canvas layers
   */
  initializeLayers(width: number, height: number): CanvasLayers {
    // Create base layer for DICOM image
    const base = document.createElement('canvas')
    base.width = width
    base.height = height

    // Create annotation layer
    const annotation = document.createElement('canvas')
    annotation.width = width
    annotation.height = height

    // Create control layer for control points and UI
    const control = document.createElement('canvas')
    control.width = width
    control.height = height

    this.layers = { base, annotation, control }
    this.markAllDirty()

    return this.layers
  }

  /**
   * Get canvas layers
   */
  getLayers(): CanvasLayers | null {
    return this.layers
  }

  /**
   * Set composite canvas (the visible canvas)
   */
  setCompositeCanvas(canvas: HTMLCanvasElement): void {
    this.compositeCanvas = canvas
  }

  /**
   * Resize all layers
   */
  resizeLayers(width: number, height: number): void {
    if (!this.layers) return

    this.layers.base.width = width
    this.layers.base.height = height
    this.layers.annotation.width = width
    this.layers.annotation.height = height
    this.layers.control.width = width
    this.layers.control.height = height

    this.markAllDirty()
  }

  /**
   * Mark a layer as dirty (needs redraw)
   */
  markDirty(layer: keyof CanvasLayers): void {
    this.dirtyFlags[layer] = true
  }

  /**
   * Mark all layers as dirty
   */
  markAllDirty(): void {
    this.dirtyFlags.base = true
    this.dirtyFlags.annotation = true
    this.dirtyFlags.control = true
  }

  /**
   * Check if a layer is dirty
   */
  isDirty(layer: keyof CanvasLayers): boolean {
    return this.dirtyFlags[layer]
  }

  /**
   * Mark a layer as clean (already drawn)
   */
  markClean(layer: keyof CanvasLayers): void {
    this.dirtyFlags[layer] = false
  }

  /**
   * Clear a specific layer
   */
  clearLayer(layer: keyof CanvasLayers): void {
    if (!this.layers) return

    const canvas = this.layers[layer]
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
  }

  /**
   * Composite all layers onto the visible canvas
   */
  composite(): void {
    if (!this.layers || !this.compositeCanvas) return

    const ctx = this.compositeCanvas.getContext('2d')
    if (!ctx) return

    // Clear composite canvas
    ctx.clearRect(0, 0, this.compositeCanvas.width, this.compositeCanvas.height)

    // Draw layers in order
    ctx.drawImage(this.layers.base, 0, 0)
    ctx.drawImage(this.layers.annotation, 0, 0)
    ctx.drawImage(this.layers.control, 0, 0)
  }

  /**
   * Get context for a specific layer
   */
  getContext(layer: keyof CanvasLayers): CanvasRenderingContext2D | null {
    if (!this.layers) return null
    return this.layers[layer].getContext('2d')
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.layers = null
    this.compositeCanvas = null
    this.markAllDirty()
  }
}

// Singleton instance
export const layeredCanvasManager = new LayeredCanvasManager()
