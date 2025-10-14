/**
 * Dirty Rectangle Manager
 * 
 * Tracks regions of the canvas that need to be redrawn for performance optimization.
 * Only redraws changed areas instead of the entire canvas.
 */

export interface Rectangle {
  x: number
  y: number
  width: number
  height: number
}

class DirtyRectManager {
  private dirtyRects: Rectangle[] = []
  private mergeThreshold = 50 // Merge rects if they're within 50px of each other

  /**
   * Add a dirty rectangle
   */
  addDirtyRect(rect: Rectangle): void {
    // Expand rect slightly for safety margin
    const expandedRect = {
      x: rect.x - 5,
      y: rect.y - 5,
      width: rect.width + 10,
      height: rect.height + 10,
    }

    this.dirtyRects.push(expandedRect)
  }

  /**
   * Add a dirty rectangle from annotation bounding box
   */
  addAnnotationDirtyRect(boundingBox: Rectangle): void {
    this.addDirtyRect(boundingBox)
  }

  /**
   * Check if two rectangles overlap or are close enough to merge
   */
  private shouldMerge(rect1: Rectangle, rect2: Rectangle): boolean {
    const expandedRect1 = {
      x: rect1.x - this.mergeThreshold,
      y: rect1.y - this.mergeThreshold,
      width: rect1.width + this.mergeThreshold * 2,
      height: rect1.height + this.mergeThreshold * 2,
    }

    return !(
      expandedRect1.x + expandedRect1.width < rect2.x ||
      rect2.x + rect2.width < expandedRect1.x ||
      expandedRect1.y + expandedRect1.height < rect2.y ||
      rect2.y + rect2.height < expandedRect1.y
    )
  }

  /**
   * Merge two rectangles into one that contains both
   */
  private mergeRects(rect1: Rectangle, rect2: Rectangle): Rectangle {
    const x = Math.min(rect1.x, rect2.x)
    const y = Math.min(rect1.y, rect2.y)
    const maxX = Math.max(rect1.x + rect1.width, rect2.x + rect2.width)
    const maxY = Math.max(rect1.y + rect1.height, rect2.y + rect2.height)

    return {
      x,
      y,
      width: maxX - x,
      height: maxY - y,
    }
  }

  /**
   * Merge overlapping dirty rectangles
   */
  private mergeDirtyRects(): void {
    if (this.dirtyRects.length <= 1) return

    let merged = true
    while (merged) {
      merged = false

      for (let i = 0; i < this.dirtyRects.length; i++) {
        for (let j = i + 1; j < this.dirtyRects.length; j++) {
          if (this.shouldMerge(this.dirtyRects[i], this.dirtyRects[j])) {
            // Merge the two rectangles
            const mergedRect = this.mergeRects(this.dirtyRects[i], this.dirtyRects[j])
            this.dirtyRects.splice(j, 1)
            this.dirtyRects.splice(i, 1)
            this.dirtyRects.push(mergedRect)
            merged = true
            break
          }
        }
        if (merged) break
      }
    }
  }

  /**
   * Get all dirty rectangles (merged)
   */
  getDirtyRects(): Rectangle[] {
    this.mergeDirtyRects()
    return [...this.dirtyRects]
  }

  /**
   * Check if there are any dirty rectangles
   */
  hasDirtyRects(): boolean {
    return this.dirtyRects.length > 0
  }

  /**
   * Clear all dirty rectangles
   */
  clear(): void {
    this.dirtyRects = []
  }

  /**
   * Clear and redraw specific regions of a canvas
   */
  clearDirtyRegions(ctx: CanvasRenderingContext2D): void {
    const rects = this.getDirtyRects()
    rects.forEach(rect => {
      ctx.clearRect(rect.x, rect.y, rect.width, rect.height)
    })
  }

  /**
   * Check if a point is within any dirty rectangle
   */
  isPointDirty(x: number, y: number): boolean {
    return this.dirtyRects.some(rect => 
      x >= rect.x && 
      x <= rect.x + rect.width && 
      y >= rect.y && 
      y <= rect.y + rect.height
    )
  }

  /**
   * Check if a rectangle intersects with any dirty rectangle
   */
  isRectDirty(rect: Rectangle): boolean {
    return this.dirtyRects.some(dirtyRect => 
      !(
        rect.x + rect.width < dirtyRect.x ||
        dirtyRect.x + dirtyRect.width < rect.x ||
        rect.y + rect.height < dirtyRect.y ||
        dirtyRect.y + dirtyRect.height < rect.y
      )
    )
  }

  /**
   * Get the total area of all dirty rectangles
   */
  getTotalDirtyArea(): number {
    return this.dirtyRects.reduce((total, rect) => {
      return total + (rect.width * rect.height)
    }, 0)
  }

  /**
   * Check if it's more efficient to redraw everything
   * Returns true if dirty area exceeds threshold (e.g., 50% of canvas)
   */
  shouldRedrawAll(canvasWidth: number, canvasHeight: number, threshold = 0.5): boolean {
    const totalArea = canvasWidth * canvasHeight
    const dirtyArea = this.getTotalDirtyArea()
    return dirtyArea / totalArea > threshold
  }
}

// Singleton instance
export const dirtyRectManager = new DirtyRectManager()
