import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom'

import '../../../test/cornerstone-setup'
import MeasurementTools from '../MeasurementTools'
import type { AIFinding, AIResult } from '@/types/worklist'

// Mock viewport
const mockViewport = {
  id: 'test-viewport',
  render: vi.fn(),
  element: {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  },
}

// Mock tool group
const mockToolGroup = {
  setToolActive: vi.fn(),
  setToolPassive: vi.fn(),
}

vi.mock('@cornerstonejs/tools', () => ({
  ToolGroupManager: {
    getToolGroup: vi.fn().mockReturnValue(mockToolGroup),
  },
  annotation: {
    state: {
      removeAnnotation: vi.fn(),
      getDefaultAnnotationManager: vi.fn().mockReturnValue({
        getAnnotation: vi.fn().mockReturnValue({
          isVisible: true,
        }),
      }),
    },
  },
}))

const mockAIFindings = [
  {
    finding: {
      type: 'nodule',
      description: 'Pulmonary nodule',
      confidence: 0.89,
      severity: 'MEDIUM' as const,
      measurements: {
        diameter: 12.5,
        area: 123.4,
      },
    },
    result: {
      id: 'ai-result-1',
      modelName: 'ChestCT-v1',
      modelVersion: '1.0.0',
      confidence: 0.89,
      findings: [],
      processingTime: 5000,
      createdAt: '2024-01-15T14:35:00Z',
    },
  },
]

describe('MeasurementTools', () => {
  const mockProps = {
    viewport: mockViewport as any,
    toolGroupId: 'test-tool-group',
    aiFindings: mockAIFindings,
    visible: true,
    onMeasurementsChange: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders measurement tools correctly', () => {
    render(<MeasurementTools {...mockProps} />)
    
    expect(screen.getByText('Measurements')).toBeInTheDocument()
    expect(screen.getByLabelText('Length')).toBeInTheDocument()
    expect(screen.getByLabelText('Rectangle ROI')).toBeInTheDocument()
    expect(screen.getByLabelText('Circle ROI')).toBeInTheDocument()
    expect(screen.getByLabelText('Angle')).toBeInTheDocument()
  })

  it('displays AI generated measurements', () => {
    render(<MeasurementTools {...mockProps} />)
    
    expect(screen.getByText('AI Generated (2)')).toBeInTheDocument()
    expect(screen.getByText('nodule - diameter')).toBeInTheDocument()
    expect(screen.getByText('nodule - area')).toBeInTheDocument()
    expect(screen.getByText('12.5 mm')).toBeInTheDocument()
    expect(screen.getByText('123.4 mm')).toBeInTheDocument()
  })

  it('handles tool selection', () => {
    render(<MeasurementTools {...mockProps} />)
    
    const lengthTool = screen.getByLabelText('Length')
    fireEvent.click(lengthTool)
    
    expect(mockToolGroup.setToolActive).toHaveBeenCalledWith('Length', {
      bindings: [{ mouseButton: 1 }],
    })
  })

  it('toggles tool activation', () => {
    render(<MeasurementTools {...mockProps} />)
    
    const lengthTool = screen.getByLabelText('Length')
    
    // First click activates
    fireEvent.click(lengthTool)
    expect(mockToolGroup.setToolActive).toHaveBeenCalledWith('Length', {
      bindings: [{ mouseButton: 1 }],
    })
    
    // Second click deactivates
    fireEvent.click(lengthTool)
    expect(mockToolGroup.setToolPassive).toHaveBeenCalledWith('Length')
  })

  it('shows AI measure button', () => {
    render(<MeasurementTools {...mockProps} />)
    
    const aiMeasureButton = screen.getByText('AI Measure')
    expect(aiMeasureButton).toBeInTheDocument()
  })

  it('handles AI measurement generation', () => {
    render(<MeasurementTools {...mockProps} />)
    
    const aiMeasureButton = screen.getByText('AI Measure')
    fireEvent.click(aiMeasureButton)
    
    expect(mockProps.onMeasurementsChange).toHaveBeenCalled()
  })

  it('toggles measurement visibility', () => {
    render(<MeasurementTools {...mockProps} />)
    
    const visibilityButton = screen.getByLabelText(/hide measurements|show measurements/i)
    fireEvent.click(visibilityButton)
    
    // Should call viewport render after visibility change
    expect(mockViewport.render).toHaveBeenCalled()
  })

  it('displays confidence scores for AI measurements', () => {
    render(<MeasurementTools {...mockProps} />)
    
    expect(screen.getByText('89%')).toBeInTheDocument()
  })

  it('shows empty state when no measurements', () => {
    render(<MeasurementTools {...mockProps} aiFindings={[]} />)
    
    expect(screen.getByText('No measurements available')).toBeInTheDocument()
    expect(screen.getByText('Select a measurement tool to start measuring')).toBeInTheDocument()
  })

  it('does not render when not visible', () => {
    render(<MeasurementTools {...mockProps} visible={false} />)
    
    expect(screen.queryByText('Measurements')).not.toBeInTheDocument()
  })

  it('handles manual measurement deletion', async () => {
    // First add a manual measurement by simulating annotation event
    const { rerender } = render(<MeasurementTools {...mockProps} />)
    
    // Simulate adding a manual measurement
    const mockAnnotation = {
      annotationUID: 'manual-measurement-1',
      metadata: { toolName: 'Length' },
    }
    
    // Trigger annotation added event
    const addedEvent = new CustomEvent('CORNERSTONE_ANNOTATION_ADDED', {
      detail: { annotation: mockAnnotation },
    })
    mockViewport.element.dispatchEvent(addedEvent)
    
    rerender(<MeasurementTools {...mockProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('Manual Measurements (1)')).toBeInTheDocument()
    })
    
    // Click delete button
    const deleteButton = screen.getByLabelText(/delete/i)
    fireEvent.click(deleteButton)
    
    expect(require('@cornerstonejs/tools').annotation.state.removeAnnotation)
      .toHaveBeenCalledWith('manual-measurement-1')
  })

  it('displays measurement summary', () => {
    render(<MeasurementTools {...mockProps} />)
    
    expect(screen.getByText('Total: 2 measurements')).toBeInTheDocument()
    expect(screen.getByText('• 2 AI-generated')).toBeInTheDocument()
  })

  it('highlights active tool', () => {
    render(<MeasurementTools {...mockProps} />)
    
    const lengthTool = screen.getByLabelText('Length')
    fireEvent.click(lengthTool)
    
    // Tool should have active styling (primary color)
    expect(lengthTool).toHaveStyle({ color: expect.stringContaining('25, 118, 210') })
  })

  it('shows related finding information for AI measurements', () => {
    render(<MeasurementTools {...mockProps} />)
    
    expect(screen.getByText('• nodule')).toBeInTheDocument()
  })

  it('sets up event listeners on mount', () => {
    render(<MeasurementTools {...mockProps} />)
    
    expect(mockViewport.element.addEventListener).toHaveBeenCalledWith(
      'CORNERSTONE_ANNOTATION_ADDED',
      expect.any(Function)
    )
    expect(mockViewport.element.addEventListener).toHaveBeenCalledWith(
      'CORNERSTONE_ANNOTATION_REMOVED',
      expect.any(Function)
    )
  })

  it('cleans up event listeners on unmount', () => {
    const { unmount } = render(<MeasurementTools {...mockProps} />)
    
    unmount()
    
    expect(mockViewport.element.removeEventListener).toHaveBeenCalledWith(
      'CORNERSTONE_ANNOTATION_ADDED',
      expect.any(Function)
    )
    expect(mockViewport.element.removeEventListener).toHaveBeenCalledWith(
      'CORNERSTONE_ANNOTATION_REMOVED',
      expect.any(Function)
    )
  })
})