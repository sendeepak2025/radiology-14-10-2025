import type { Annotation, HistoryEntry } from '../types/viewer'
import { store } from '../store'
import { updateAnnotation, addAnnotation, removeAnnotation } from '../store/slices/viewerSlice'

/**
 * UndoRedoManager - Manages undo/redo functionality for annotations
 * 
 * Responsibilities:
 * - Maintain undo and redo stacks
 * - Push actions to history
 * - Undo/redo operations
 * - Stack size management
 */
class UndoRedoManager {
  private undoStack: HistoryEntry[] = []
  private redoStack: HistoryEntry[] = []
  private readonly maxStackSize = 50

  /**
   * Push an action to the undo stack
   * @param entry - History entry to add
   */
  pushAction(entry: HistoryEntry): void {
    // Add to undo stack
    this.undoStack.push(entry)

    // Clear redo stack (new action invalidates redo history)
    this.redoStack = []

    // Prune undo stack if it exceeds max size
    if (this.undoStack.length > this.maxStackSize) {
      this.undoStack.shift() // Remove oldest entry
    }

    console.log('[UndoRedoManager] Pushed action:', {
      action: entry.action,
      annotationId: entry.annotationId,
      undoStackSize: this.undoStack.length,
    })
  }

  /**
   * Undo the last action
   * @returns The history entry that was undone, or null if nothing to undo
   */
  undo(): HistoryEntry | null {
    if (this.undoStack.length === 0) {
      console.warn('[UndoRedoManager] Nothing to undo')
      return null
    }

    const entry = this.undoStack.pop()!

    // Move to redo stack
    this.redoStack.push(entry)

    // Apply the undo operation
    this.applyUndo(entry)

    console.log('[UndoRedoManager] Undid action:', {
      action: entry.action,
      annotationId: entry.annotationId,
      undoStackSize: this.undoStack.length,
      redoStackSize: this.redoStack.length,
    })

    return entry
  }

  /**
   * Redo the last undone action
   * @returns The history entry that was redone, or null if nothing to redo
   */
  redo(): HistoryEntry | null {
    if (this.redoStack.length === 0) {
      console.warn('[UndoRedoManager] Nothing to redo')
      return null
    }

    const entry = this.redoStack.pop()!

    // Move back to undo stack
    this.undoStack.push(entry)

    // Apply the redo operation
    this.applyRedo(entry)

    console.log('[UndoRedoManager] Redid action:', {
      action: entry.action,
      annotationId: entry.annotationId,
      undoStackSize: this.undoStack.length,
      redoStackSize: this.redoStack.length,
    })

    return entry
  }

  /**
   * Apply undo operation (restore beforeState)
   * @param entry - History entry to undo
   */
  private applyUndo(entry: HistoryEntry): void {
    const { action, beforeState, annotationId } = entry

    switch (action) {
      case 'create':
        // Undo create: remove annotation
        if (annotationId) {
          store.dispatch(removeAnnotation(annotationId))
        }
        break

      case 'delete':
        // Undo delete: restore annotation
        if (beforeState) {
          store.dispatch(addAnnotation(beforeState))
        }
        break

      case 'move':
      case 'resize':
      case 'edit':
      case 'style':
      case 'point-move':
        // Undo modification: restore previous state
        if (beforeState) {
          store.dispatch(updateAnnotation(beforeState))
        }
        break

      default:
        console.warn('[UndoRedoManager] Unknown action type:', action)
    }
  }

  /**
   * Apply redo operation (restore afterState)
   * @param entry - History entry to redo
   */
  private applyRedo(entry: HistoryEntry): void {
    const { action, afterState, annotationId } = entry

    switch (action) {
      case 'create':
        // Redo create: add annotation
        if (afterState) {
          store.dispatch(addAnnotation(afterState))
        }
        break

      case 'delete':
        // Redo delete: remove annotation
        if (annotationId) {
          store.dispatch(removeAnnotation(annotationId))
        }
        break

      case 'move':
      case 'resize':
      case 'edit':
      case 'style':
      case 'point-move':
        // Redo modification: restore new state
        if (afterState) {
          store.dispatch(updateAnnotation(afterState))
        }
        break

      default:
        console.warn('[UndoRedoManager] Unknown action type:', action)
    }
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.undoStack.length > 0
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.redoStack.length > 0
  }

  /**
   * Get undo stack size
   */
  getUndoStackSize(): number {
    return this.undoStack.length
  }

  /**
   * Get redo stack size
   */
  getRedoStackSize(): number {
    return this.redoStack.length
  }

  /**
   * Get the last action description (for UI display)
   */
  getLastActionDescription(): string | null {
    if (this.undoStack.length === 0) {
      return null
    }

    const entry = this.undoStack[this.undoStack.length - 1]
    return this.getActionDescription(entry)
  }

  /**
   * Get the next redo action description (for UI display)
   */
  getNextRedoDescription(): string | null {
    if (this.redoStack.length === 0) {
      return null
    }

    const entry = this.redoStack[this.redoStack.length - 1]
    return this.getActionDescription(entry)
  }

  /**
   * Get human-readable action description
   */
  private getActionDescription(entry: HistoryEntry): string {
    switch (entry.action) {
      case 'create':
        return 'Create annotation'
      case 'delete':
        return 'Delete annotation'
      case 'move':
        return 'Move annotation'
      case 'resize':
        return 'Resize annotation'
      case 'edit':
        return 'Edit text'
      case 'style':
        return 'Change style'
      case 'point-move':
        return 'Move point'
      default:
        return 'Unknown action'
    }
  }

  /**
   * Clear all history
   */
  clear(): void {
    this.undoStack = []
    this.redoStack = []
    console.log('[UndoRedoManager] Cleared all history')
  }

  /**
   * Get undo stack (for debugging)
   */
  getUndoStack(): HistoryEntry[] {
    return [...this.undoStack]
  }

  /**
   * Get redo stack (for debugging)
   */
  getRedoStack(): HistoryEntry[] {
    return [...this.redoStack]
  }
}

// Export singleton instance
export const undoRedoManager = new UndoRedoManager()
export default undoRedoManager
