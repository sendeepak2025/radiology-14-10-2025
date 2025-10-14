import React, { useState, useEffect } from 'react'
import { Box, Typography, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, CircularProgress, Alert } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { fhirService } from '../../services/fhirService'

export const SimpleWorklist: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [studies, setStudies] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load studies from DICOM API and enrich with FHIR data
  useEffect(() => {
    const loadWorklist = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Fetch studies from DICOM API
        const response = await fetch('/api/dicom/studies')
        if (!response.ok) {
          throw new Error(`Failed to fetch studies: ${response.statusText}`)
        }

        const result = await response.json()
        if (!result.success) {
          throw new Error(result.error || 'Failed to load studies')
        }

        const dicomStudies = result.data || []
        
        // Enrich with FHIR data for each study
        const enrichedStudies = await Promise.all(
          dicomStudies.map(async (study: any) => {
            let patientContext = null
            let priority = 'ROUTINE'
            let status = 'SCHEDULED'
            let aiStatus = 'PENDING'

            try {
              // Try to get FHIR patient context
              if (study.patientID) {
                patientContext = await fhirService.getPatientContext(study.patientID)
                
                // Check for urgent service requests
                const urgentRequests = patientContext.serviceRequests?.filter(
                  (req: any) => req.priority === 'urgent' || req.priority === 'stat'
                )
                if (urgentRequests?.length > 0) {
                  priority = 'URGENT'
                }
              }
            } catch (fhirError) {
              console.warn(`Failed to load FHIR data for patient ${study.patientID}:`, fhirError)
            }

            // Simulate AI status based on study age
            const studyDate = new Date(study.studyDate?.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3') || Date.now())
            const daysSinceStudy = Math.floor((Date.now() - studyDate.getTime()) / (1000 * 60 * 60 * 24))
            
            if (daysSinceStudy > 1) {
              aiStatus = 'COMPLETED'
              status = 'COMPLETED'
            } else if (daysSinceStudy > 0) {
              aiStatus = 'PROCESSING'
              status = 'IN_PROGRESS'
            }

            return {
              id: study.studyInstanceUID,
              studyInstanceUID: study.studyInstanceUID,
              patientName: study.patientName?.replace('^', ', ') || 'Unknown Patient',
              patientId: study.patientID || 'N/A',
              studyDate: studyDate.toLocaleDateString(),
              modality: study.modality || 'Unknown',
              description: study.studyDescription || 'No description',
              priority,
              status,
              aiStatus,
              numberOfSeries: study.numberOfSeries || 0,
              numberOfInstances: study.numberOfInstances || 0,
              patientContext
            }
          })
        )

        setStudies(enrichedStudies)
      } catch (err) {
        console.error('Error loading worklist:', err)
        setError(err instanceof Error ? err.message : 'Failed to load worklist')
        
        // Fallback to demo data
        setStudies([
          {
            id: '1.2.840.113619.2.5.1762583153.215519.978957063.78',
            studyInstanceUID: '1.2.840.113619.2.5.1762583153.215519.978957063.78',
            patientName: 'Doe, John',
            patientId: 'P001',
            studyDate: new Date().toLocaleDateString(),
            modality: 'CT',
            description: 'CT Chest with Contrast',
            priority: 'ROUTINE',
            status: 'SCHEDULED',
            aiStatus: 'COMPLETED',
            numberOfSeries: 3,
            numberOfInstances: 150
          }
        ])
      } finally {
        setIsLoading(false)
      }
    }

    loadWorklist()
  }, [])
  
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'error'
      case 'STAT': return 'error'
      case 'ROUTINE': return 'primary'
      case 'LOW': return 'default'
      default: return 'default'
    }
  }
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'success'
      case 'IN_PROGRESS': return 'warning'
      case 'SCHEDULED': return 'info'
      case 'CANCELLED': return 'default'
      default: return 'default'
    }
  }

  const getAIStatusColor = (aiStatus: string) => {
    switch (aiStatus) {
      case 'COMPLETED': return 'success'
      case 'PROCESSING': return 'warning'
      case 'FAILED': return 'error'
      case 'PENDING': return 'default'
      default: return 'default'
    }
  }
  
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Header */}
      <Box sx={{ 
        bgcolor: 'primary.main', 
        color: 'primary.contrastText', 
        p: 2,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          📋 Medical Worklist
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body2">
            {user?.firstName} {user?.lastName}
          </Typography>
          <Button 
            variant="outlined" 
            size="small" 
            onClick={() => navigate('/dashboard')}
            sx={{ 
              color: 'primary.contrastText', 
              borderColor: 'primary.contrastText',
              '&:hover': {
                bgcolor: 'rgba(255,255,255,0.1)'
              }
            }}
          >
            Back to Dashboard
          </Button>
        </Box>
      </Box>

      {/* Main Content */}
      <Box sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Medical Imaging Worklist
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Integrated DICOM studies with FHIR patient context and AI analysis
        </Typography>

        {error && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            {error} - Showing demo data for development
          </Alert>
        )}

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* Worklist Table */}
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Patient Name</strong></TableCell>
                    <TableCell><strong>Patient ID</strong></TableCell>
                    <TableCell><strong>Study Date</strong></TableCell>
                    <TableCell><strong>Modality</strong></TableCell>
                    <TableCell><strong>Description</strong></TableCell>
                    <TableCell><strong>Series/Images</strong></TableCell>
                    <TableCell><strong>Priority</strong></TableCell>
                    <TableCell><strong>Status</strong></TableCell>
                    <TableCell><strong>AI Status</strong></TableCell>
                    <TableCell><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {studies.map((study) => (
                    <TableRow key={study.id} hover>
                      <TableCell>{study.patientName}</TableCell>
                      <TableCell>{study.patientId}</TableCell>
                      <TableCell>{study.studyDate}</TableCell>
                      <TableCell>
                        <Chip label={study.modality} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>{study.description}</TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {study.numberOfSeries} series / {study.numberOfInstances} images
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={study.priority} 
                          size="small" 
                          color={getPriorityColor(study.priority) as any}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={study.status} 
                          size="small" 
                          color={getStatusColor(study.status) as any}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={study.aiStatus} 
                          size="small" 
                          color={getAIStatusColor(study.aiStatus) as any}
                        />
                      </TableCell>
                      <TableCell>
                        <Button 
                          size="small" 
                          variant="contained" 
                          onClick={() => navigate(`/viewer/${study.studyInstanceUID}`)}
                        >
                          Open Viewer
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Summary */}
            <Box sx={{ mt: 4, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" color="primary.main">{studies.length}</Typography>
                <Typography variant="body2">Total Studies</Typography>
              </Paper>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" color="warning.main">
                  {studies.filter(s => s.status === 'IN_PROGRESS').length}
                </Typography>
                <Typography variant="body2">In Progress</Typography>
              </Paper>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" color="error.main">
                  {studies.filter(s => s.priority === 'URGENT').length}
                </Typography>
                <Typography variant="body2">Urgent Priority</Typography>
              </Paper>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" color="success.main">
                  {studies.filter(s => s.aiStatus === 'COMPLETED').length}
                </Typography>
                <Typography variant="body2">AI Completed</Typography>
              </Paper>
            </Box>
          </>
        )}

        {/* Status */}
        <Box sx={{ mt: 4, p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
          <Typography variant="body2" color="success.dark">
            ✅ <strong>Worklist Status:</strong> 3 studies assigned | 
            <strong> User:</strong> {user?.username} | 
            <strong> Role:</strong> {user?.roles?.join(', ')}
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}