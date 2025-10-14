import React from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Box, Container, Typography, Paper } from '@mui/material'
import { ReportingInterface } from '@/components/reporting'
import type { StructuredReport } from '@medical-imaging/shared-types'

export const ReportingPage: React.FC = () => {
  const { studyInstanceUID } = useParams<{ studyInstanceUID: string }>()
  const [searchParams] = useSearchParams()
  const patientId = searchParams.get('patientId')

  if (!studyInstanceUID || !patientId) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="error">
            Missing required parameters
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Study Instance UID and Patient ID are required
          </Typography>
        </Paper>
      </Container>
    )
  }

  const handleReportFinalized = (report: StructuredReport) => {
    console.log('Report finalized:', report)
    // Could navigate back to viewer or show success message
  }

  return (
    <Container maxWidth="xl" sx={{ py: 2, height: '100vh' }}>
      <Box mb={2}>
        <Typography variant="h4" gutterBottom>
          Structured Reporting
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Study: {studyInstanceUID.slice(-12)} • Patient: {patientId}
        </Typography>
      </Box>
      
      <Box sx={{ height: 'calc(100vh - 120px)' }}>
        <ReportingInterface
          studyInstanceUID={studyInstanceUID}
          patientId={patientId}
          onReportFinalized={handleReportFinalized}
        />
      </Box>
    </Container>
  )
}