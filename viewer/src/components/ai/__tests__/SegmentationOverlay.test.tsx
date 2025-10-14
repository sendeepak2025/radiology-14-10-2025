import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom'

import '../../../test/cornerstone-setup'
import SegmentationOverlay from '../SegmentationOverlay'

// Mock viewport
const mockViewport = {
  id: 'test-viewport',
  render: vi.fn(),
  element: document.createElement('div'),
}

const mockSegmentations = [
  {
    segmentationId: 'seg-1',
    volumeId: 'volume-1',
    label: 'Liver Segmentation',
    color: [255, 0, 0, 255] as [number, number, number, number],
    confidence: 0.95,
    category: 'Organ',
    description: 'Automated liver segmentation',
  },
  {
    segmentationId: 'seg-2',
    volumeId: 'volume-1',
    label: 'Tumor Segmentation',
    color: [0, 255, 0, 255] as [number, number, number, number],
    confidence: 0.87,
    category: 'Pathology',
    description: 'Detected tumor region',
  },
]

// Mock Cornerstone3D segmentation
vi.mock('@cornerstonejs/tools', () => ({
  segmentation: {
    addSegmentations: vi.fn().mockResolvedValue(undefined),
    addSegmentationRepresentations: vi.fn().mockResolvedValue(undefined),
    removeSegmentation: vi.fn(),
    state: {
      getSegmentation: vi.fn().mockReturnValue({
        colorLUTIndex: 0,
      }),
      getColorLUT: vi.fn().mockReturnValue([]),
      setColorLUT: vi.fn(),
    },
    config: {
      setGlobalConfig: vi.fn(),
      setSegmentationRepresentationConfig: vi.fn(),
    },
  },
}))

describe('SegmentationOverlay', () => {
  const mockProps = {
    viewport: mockViewport as any,
    segmentations: mockSegmentations,
    visible: true,
    onVisibilityChange: vi.fn(),
    onOpacityChange: vi.fn(),
    onSegmentationSelect: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders segmentation list correctly', () => {
    render(<SegmentationOverlay {...mockProps} />)
    
    expect(screen.getByText('AI Segmentations (2)')).toBeInTheDocument()
    expect(screen.getByText('Liver Segmentation')).toBeInTheDocument()
    expect(screen.getByText('Tumor Segmentation')).toBeInTheDocument()
  })

  it('displays confidence scores', () => {
    render(<SegmentationOverlay {...mockProps} />)
    
    expect(screen.getByText('95%')).toBeInTheDocument()
    expect(screen.getByText('87%')).toBeInTheDocument()
  })

  it('shows categories and descriptions', () => {
    render(<SegmentationOverlay {...mockProps} />)
    
    expect(screen.getByText('Category: Organ')).toBeInTheDocument()
    expect(screen.getByText('Category: Pathology')).toBeInTheDocument()
    expect(screen.getByText('Automated liver segmentation')).toBeInTheDocument()
    expect(screen.getByText('Detected tumor region')).toBeInTheDocument()
  })

  it('handles visibility toggle', () => {
    render(<SegmentationOverlay {...mockProps} />)
    
    const visibilityButton = screen.getByLabelText(/hide overlays|show overlays/i)
    fireEvent.click(visibilityButton)
    
    expect(mockProps.onVisibilityChange).toHaveBeenCalledWith(false)
  })

  it('handles opacity changes', () => {
    render(<SegmentationOverlay {...mockProps} />)
    
    const opacitySlider = screen.getByRole('slider')
    fireEvent.change(opacitySlider, { target: { value: '0.8' } })
    
    expect(mockProps.onOpacityChange).toHaveBeenCalledWith(0.8)
  })

  it('handles segmentation selection', () => {
    render(<SegmentationOverlay {...mockProps} />)
    
    const liverSegmentation = screen.getByText('Liver Segmentation').closest('div')
    fireEvent.click(liverSegmentation!)
    
    expect(mockProps.onSegmentationSelect).toHaveBeenCalledWith('seg-1')
  })

  it('highlights selected segmentation', () => {
    render(<SegmentationOverlay {...mockProps} selectedSegmentationId="seg-1" />)
    
    const liverSegmentation = screen.getByText('Liver Segmentation').closest('div')
    expect(liverSegmentation).toHaveStyle({ borderColor: expect.stringContaining('25, 118, 210') })
  })

  it('displays opacity percentage correctly', () => {
    render(<SegmentationOverlay {...mockProps} opacity={0.75} />)
    
    expect(screen.getByText('Opacity: 75%')).toBeInTheDocument()
  })

  it('renders color indicators', () => {
    render(<SegmentationOverlay {...mockProps} />)
    
    // Check that color boxes are rendered (they would have the background colors)
    const colorBoxes = screen.getAllByRole('generic').filter(el => 
      el.style.backgroundColor || el.style.background
    )
    expect(colorBoxes.length).toBeGreaterThan(0)
  })

  it('does not render when no segmentations provided', () => {
    render(<SegmentationOverlay {...mockProps} segmentations={[]} />)
    
    expect(screen.queryByText('AI Segmentations')).not.toBeInTheDocument()
  })

  it('handles viewport render calls', async () => {
    render(<SegmentationOverlay {...mockProps} />)
    
    await waitFor(() => {
      expect(mockViewport.render).toHaveBeenCalled()
    })
  })

  it('cleans up segmentations on unmount', () => {
    const { unmount } = render(<SegmentationOverlay {...mockProps} />)
    
    unmount()
    
    // Cleanup should be called (mocked in the segmentation module)
    expect(vi.mocked(require('@cornerstonejs/tools').segmentation.removeSegmentation)).toHaveBeenCalled()
  })
})