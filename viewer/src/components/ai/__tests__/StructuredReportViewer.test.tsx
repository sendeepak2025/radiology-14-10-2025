import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom'

import StructuredReportViewer from '../StructuredReportViewer'

const mockReport = {
  sopInstanceUID: 'sr-1.2.3.4.5',
  sopClassUID: '1.2.840.10008.5.1.4.1.1.88.11',
  studyInstanceUID: '1.2.3.4',
  seriesInstanceUID: '1.2.3.5',
  instanceNumber: 1,
  contentDate: '2024-01-15',
  contentTime: '143000',
  institutionName: 'Test Hospital',
  manufacturerModelName: 'AI System v1.0',
  patientName: 'John Doe',
  patientID: 'P001',
  studyDescription: 'CT Chest',
  seriesDescription: 'AI Analysis Report',
  completionFlag: 'COMPLETE' as const,
  verificationFlag: 'VERIFIED' as const,
  documentTitle: 'AI Analysis Report - Chest CT',
  content: [
    {
      conceptName: 'Finding',
      valueType: 'TEXT' as const,
      textValue: 'Small pulmonary nodule detected',
    },
    {
      conceptName: 'Measurement',
      valueType: 'NUM' as const,
      numericValue: {
        value: 8.5,
        unit: 'mm',
      },
    },
  ],
  aiGenerated: true,
  aiModelInfo: {
    modelName: 'ChestCT-AI',
    modelVersion: '1.0.0',
    confidence: 0.92,
  },
}

describe('StructuredReportViewer', () => {
  const mockProps = {
    report: mockReport,
    visible: true,
    onVisibilityChange: vi.fn(),
    onMeasurementSelect: vi.fn(),
    onFindingSelect: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders report title and basic info', () => {
    render(<StructuredReportViewer {...mockProps} />)
    
    expect(screen.getByText('Structured Report')).toBeInTheDocument()
    expect(screen.getByText('AI Analysis Report - Chest CT')).toBeInTheDocument()
    expect(screen.getByText('AI Generated')).toBeInTheDocument()
  })

  it('displays completion and verification status', () => {
    render(<StructuredReportViewer {...mockProps} />)
    
    expect(screen.getByText('COMPLETE')).toBeInTheDocument()
    expect(screen.getByText('VERIFIED')).toBeInTheDocument()
  })

  it('shows AI model information', () => {
    render(<StructuredReportViewer {...mockProps} />)
    
    expect(screen.getByText('ChestCT-AI (92%)')).toBeInTheDocument()
  })
})