import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom'

import AIFindingsPanel from '../AIFindingsPanel'
import type { AIResult } from '@/types/worklist'

const mockAIResults: AIResult[] = [
  {
    id: 'ai-result-1',
    modelName: 'ChestCT-v1',
    modelVersion: '1.0.0',
    confidence: 0.89,
    findings: [
      {
        type: 'nodule',
        description: 'Small pulmonary nodule in right upper lobe',
        confidence: 0.92,
        severity: 'MEDIUM',
        location: {
          x: 150,
          y: 200,
          z: 50,
          seriesInstanceUID: 'series-1',
          sopInstanceUID: 'sop-1',
        },
        measurements: {
          diameter: 8.5,
          volume: 310.2,
        },
      },
      {
        type: 'consolidation',
        description: 'Ground glass opacity',
        confidence: 0.76,
        severity: 'LOW',
      },
    ],
    processingTime: 5420,
    createdAt: '2024-01-15T14:35:00Z',
  },
  {
    id: 'ai-result-2',
    modelName: 'EmergencyAI-v2',
    modelVersion: '2.1.0',
    confidence: 0.95,
    findings: [
      {
        type: 'fracture',
        description: 'Possible rib fracture',
        confidence: 0.95,
        severity: 'CRITICAL',
        location: {
          x: 100,
          y: 150,
        },
      },
    ],
    processingTime: 2100,
    createdAt: '2024-01-15T14:40:00Z',
  },
]

describe('AIFindingsPanel', () => {
  const mockProps = {
    aiResults: mockAIResults,
    visible: true,
    onVisibilityChange: vi.fn(),
    onFindingSelect: vi.fn(),
    onShowLocation: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders AI results summary correctly', () => {
    render(<AIFindingsPanel {...mockProps} />)
    
    expect(screen.getByText('AI Analysis Results')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument() // Total findings
    expect(screen.getByText('89%')).toBeInTheDocument() // Average confidence
  })

  it('displays severity breakdown chips', () => {
    render(<AIFindingsPanel {...mockProps} />)
    
    expect(screen.getByText('1 Critical')).toBeInTheDocument()
    expect(screen.getByText('2 Models')).toBeInTheDocument()
  })

  it('shows model information in accordions', () => {
    render(<AIFindingsPanel {...mockProps} />)
    
    expect(screen.getByText('ChestCT-v1')).toBeInTheDocument()
    expect(screen.getByText('EmergencyAI-v2')).toBeInTheDocument()
    expect(screen.getByText('v1.0.0')).toBeInTheDocument()
    expect(screen.getByText('v2.1.0')).toBeInTheDocument()
  })

  it('displays processing times correctly', () => {
    render(<AIFindingsPanel {...mockProps} />)
    
    expect(screen.getByText('5.4s')).toBeInTheDocument()
    expect(screen.getByText('2.1s')).toBeInTheDocument()
  })

  it('expands accordion to show findings', () => {
    render(<AIFindingsPanel {...mockProps} />)
    
    const chestCTAccordion = screen.getByText('ChestCT-v1').closest('button')
    fireEvent.click(chestCTAccordion!)
    
    expect(screen.getByText('nodule')).toBeInTheDocument()
    expect(screen.getByText('consolidation')).toBeInTheDocument()
    expect(screen.getByText('Small pulmonary nodule in right upper lobe')).toBeInTheDocument()
  })

  it('displays severity icons and chips correctly', () => {
    render(<AIFindingsPanel {...mockProps} />)
    
    // Expand accordion to see findings
    const chestCTAccordion = screen.getByText('ChestCT-v1').closest('button')
    fireEvent.click(chestCTAccordion!)
    
    expect(screen.getByText('MEDIUM')).toBeInTheDocument()
    expect(screen.getByText('LOW')).toBeInTheDocument()
    
    // Expand second accordion
    const emergencyAIAccordion = screen.getByText('EmergencyAI-v2').closest('button')
    fireEvent.click(emergencyAIAccordion!)
    
    expect(screen.getByText('CRITICAL')).toBeInTheDocument()
  })

  it('handles finding selection', () => {
    render(<AIFindingsPanel {...mockProps} />)
    
    // Expand accordion
    const chestCTAccordion = screen.getByText('ChestCT-v1').closest('button')
    fireEvent.click(chestCTAccordion!)
    
    // Click on a finding
    const noduleFinding = screen.getByText('nodule').closest('li')
    fireEvent.click(noduleFinding!)
    
    expect(mockProps.onFindingSelect).toHaveBeenCalledWith(
      mockAIResults[0].findings[0],
      mockAIResults[0]
    )
  })

  it('handles show location button click', () => {
    render(<AIFindingsPanel {...mockProps} />)
    
    // Expand accordion
    const chestCTAccordion = screen.getByText('ChestCT-v1').closest('button')
    fireEvent.click(chestCTAccordion!)
    
    // Click show location button
    const showLocationButton = screen.getAllByLabelText('Show Location')[0]
    fireEvent.click(showLocationButton)
    
    expect(mockProps.onShowLocation).toHaveBeenCalledWith(
      mockAIResults[0].findings[0],
      mockAIResults[0]
    )
  })

  it('displays measurements summary when available', () => {
    render(<AIFindingsPanel {...mockProps} />)
    
    // Expand accordion
    const chestCTAccordion = screen.getByText('ChestCT-v1').closest('button')
    fireEvent.click(chestCTAccordion!)
    
    expect(screen.getByText('Measurements Summary')).toBeInTheDocument()
    expect(screen.getByText('diameter: 8.5 mm')).toBeInTheDocument()
    expect(screen.getByText('volume: 310.2 mm')).toBeInTheDocument()
  })

  it('shows confidence percentages for findings', () => {
    render(<AIFindingsPanel {...mockProps} />)
    
    // Expand accordion
    const chestCTAccordion = screen.getByText('ChestCT-v1').closest('button')
    fireEvent.click(chestCTAccordion!)
    
    expect(screen.getByText('Confidence: 92%')).toBeInTheDocument()
    expect(screen.getByText('Confidence: 76%')).toBeInTheDocument()
  })

  it('handles visibility toggle', () => {
    render(<AIFindingsPanel {...mockProps} />)
    
    const closeButton = screen.getByLabelText(/close/i)
    fireEvent.click(closeButton)
    
    expect(mockProps.onVisibilityChange).toHaveBeenCalledWith(false)
  })

  it('highlights selected finding', () => {
    render(<AIFindingsPanel {...mockProps} selectedFindingId="ai-result-1-0" />)
    
    // Expand accordion to see findings
    const chestCTAccordion = screen.getByText('ChestCT-v1').closest('button')
    fireEvent.click(chestCTAccordion!)
    
    const selectedFinding = screen.getByText('nodule').closest('li')
    expect(selectedFinding).toHaveClass('Mui-selected')
  })

  it('renders empty state when no AI results', () => {
    render(<AIFindingsPanel {...mockProps} aiResults={[]} />)
    
    expect(screen.getByText('No AI analysis results available')).toBeInTheDocument()
  })

  it('does not render when not visible', () => {
    render(<AIFindingsPanel {...mockProps} visible={false} />)
    
    expect(screen.queryByText('AI Analysis Results')).not.toBeInTheDocument()
  })

  it('displays confidence progress bars', () => {
    render(<AIFindingsPanel {...mockProps} />)
    
    const progressBars = screen.getAllByRole('progressbar')
    expect(progressBars.length).toBeGreaterThan(0)
  })

  it('shows measurement count in finding details', () => {
    render(<AIFindingsPanel {...mockProps} />)
    
    // Expand accordion
    const chestCTAccordion = screen.getByText('ChestCT-v1').closest('button')
    fireEvent.click(chestCTAccordion!)
    
    expect(screen.getByText('• Measurements: 2')).toBeInTheDocument()
  })

  it('formats dates correctly', () => {
    render(<AIFindingsPanel {...mockProps} />)
    
    expect(screen.getByText('Jan 15, 14:35')).toBeInTheDocument()
    expect(screen.getByText('Jan 15, 14:40')).toBeInTheDocument()
  })
})