import type { Annotation, Point, TextEditorState } from '../types/viewer'
import { store } from '../store'
import { updateAnnotation } from '../store/slices/viewerSlice'

/**
 * TextEditorManager - Manages inline text editing for annotations
 * 
 * Responsibilities:
 * - Track text editor state
 * - Start/stop editing sessions
 * - Update text in real-time
 * - Save/cancel edits
 * - Manage Redux state updates
 */
class TextEditorManager {
  private editorState: TextEditorState = {
    isEditing: false,
    annotationId: null,
    position: { x: 0, y: 0 },
    initialText: '',
    currentText: '',
  }

  private originalAnnotation: Annotation | null = null

  /**
   * Start editing an annotation's text
   * @param annotation - The annotation to edit
   * @param position - Position for the editor (canvas coordinates)
   */
  startEdit(annotation: Annotation, position: Point): void {
    // Store original annotation for cancel
    this.originalAnnotation = JSON.parse(JSON.stringify(annotation))

    const initialText = annotation.text || ''

    this.editorState = {
      isEditing: true,
      annotationId: annotation.id,
      position,
      initialText,
      currentText: initialText,
    }

    console.log('[TextEditorManager] Started editing:', {
      annotationId: annotation.id,
      initialText,
      position,
    })
  }

  /**
   * Update the current text being edited
   * @param text - New text value
   */
  updateText(text: string): void {
    if (!this.editorState.isEditing) {
      console.warn('[TextEditorManager] Cannot update text: not editing')
      return
    }

    this.editorState.currentText = text
  }

  /**
   * Save the edited text to Redux
   * @param annotations - Current annotations array to find and update the annotation
   * @returns Updated annotation or null if not found
   */
  saveEdit(annotations: Annotation[]): Annotation | null {
    if (!this.editorState.isEditing || !this.editorState.annotationId) {
      console.warn('[TextEditorManager] Cannot save: not editing')
      return null
    }

    const annotation = annotations.find(a => a.id === this.editorState.annotationId)
    if (!annotation) {
      console.warn('[TextEditorManager] Annotation not found:', this.editorState.annotationId)
      this.cancelEdit()
      return null
    }

    // Update annotation with new text
    const updatedAnnotation: Annotation = {
      ...annotation,
      text: this.editorState.currentText,
      updatedAt: new Date().toISOString(),
    }

    // Save to Redux
    store.dispatch(updateAnnotation(updatedAnnotation))

    console.log('[TextEditorManager] Saved text edit:', {
      annotationId: updatedAnnotation.id,
      oldText: this.editorState.initialText,
      newText: this.editorState.currentText,
    })

    // Clear editor state
    this.clearState()

    return updatedAnnotation
  }

  /**
   * Cancel editing and restore original text
   */
  cancelEdit(): void {
    if (!this.editorState.isEditing) {
      return
    }

    console.log('[TextEditorManager] Cancelled text edit:', {
      annotationId: this.editorState.annotationId,
      discardedText: this.editorState.currentText,
    })

    // Clear editor state
    this.clearState()
  }

  /**
   * Clear editor state
   */
  private clearState(): void {
    this.editorState = {
      isEditing: false,
      annotationId: null,
      position: { x: 0, y: 0 },
      initialText: '',
      currentText: '',
    }
    this.originalAnnotation = null
  }

  /**
   * Check if currently editing
   */
  isEditing(): boolean {
    return this.editorState.isEditing
  }

  /**
   * Get current editor state
   */
  getEditorState(): TextEditorState {
    return { ...this.editorState }
  }

  /**
   * Get the annotation ID being edited
   */
  getEditingAnnotationId(): string | null {
    return this.editorState.annotationId
  }

  /**
   * Get current text value
   */
  getCurrentText(): string {
    return this.editorState.currentText
  }

  /**
   * Get initial text value (before editing)
   */
  getInitialText(): string {
    return this.editorState.initialText
  }

  /**
   * Get editor position
   */
  getPosition(): Point {
    return { ...this.editorState.position }
  }

  /**
   * Check if text has changed
   */
  hasChanges(): boolean {
    return this.editorState.currentText !== this.editorState.initialText
  }
}

// Export singleton instance
export const textEditorManager = new TextEditorManager()
export default textEditorManager
