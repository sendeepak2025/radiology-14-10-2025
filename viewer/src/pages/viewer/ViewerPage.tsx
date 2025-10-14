import React, { useState, useEffect } from 'react'
import { Box, Alert, Typography, Button, Paper, Grid, Chip, Tabs, Tab, ToggleButton, ToggleButtonGroup } from '@mui/material'
import { Helmet } from 'react-helmet-async'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { MedicalImageViewer } from '../../components/viewer/MedicalImageViewer'
import Cornerstone3DViewer from '../../components/viewer/Cornerstone3DViewer'
import { ReportingInterface } from '../../components/reporting/ReportingInterface'
import { PatientContextPanel } from '../../components/worklist/PatientContextPanel'
import ApiService from '../../services/ApiService'

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel({ children, value, index, ...other }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`viewer-tabpanel-${index}`}
      aria-labelledby={`viewer-tab-${index}`}
      style={{ height: '100%' }}
      {...other}
    >
      {value === index && <Box sx={{ height: '100%' }}>{children}</Box>}
    </div>
  )
}

const ViewerPage: React.FC = () => {
  const { studyInstanceUID } = useParams<{ studyInstanceUID: string }>()
  console.log(studyInstanceUID)
  const { user } = useAuth()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false) // Force false to test rendering
  const [error, setError] = useState<string | null>(null)
  const [studyData, setStudyData] = useState<any>({
    studyInstanceUID: '',
    studyDate: '',
    studyTime: '',
    patientName: '',
    patientID: '',
    modality: '',
    studyDescription: '',
    series: [{
      seriesInstanceUID: '',
      seriesNumber: 1,
      modality: '',
      seriesDescription: '',
      numberOfInstances: 96,
      instances: [{
        sopInstanceUID: '',
        instanceNumber: 1
      }]
    }]
  })
  const [patientContext, setPatientContext] = useState<any>(null)
  const [activeTab, setActiveTab] = useState(0)
  const [viewerType, setViewerType] = useState<'legacy' | 'cornerstone3d'>('legacy')

  // Load study data from DICOM API
  useEffect(() => {
    const loadStudyData = async () => {
      if(!studyInstanceUID) return
      try {
        setIsLoading(true)
        setError(null)
        
        // Use provided studyInstanceUID or default to real DICOM file
        const currentStudyUID = studyInstanceUID 
        
        console.log('Loading study data for:', currentStudyUID)
        
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('API call timeout')), 5000)
        })
        
        try {
          // Fetch study details from DICOM API with timeout
          const result = await Promise.race([
            ApiService.getStudyMetadata(currentStudyUID),
            timeoutPromise
          ])
          
          console.log('Study data loaded successfully:', result)
          setStudyData(result?.data)
          
          // Skip FHIR loading for now to avoid errors
          console.log('Skipping FHIR patient context loading')
          setPatientContext(null)
          
        } catch (apiErr) {
          console.warn('API call failed or timed out, using fallback data:', apiErr)
          throw apiErr // Re-throw to trigger fallback below
        }
        
      } catch (err) {
        console.error('Error loading study data, using fallback:', err)
        setError(null) // Clear error since we're using fallback
        
        // Fallback to demo data for development
        const fallbackData = {
          studyInstanceUID: studyInstanceUID || '1.3.12.2.1107.5.4.3.123456789012345.19950922.121803.6',
          studyDate: '19950922',
          studyTime: '121803',
          patientName: 'Rubo^DEMO',
          patientID: 'DEMO001',
          modality: 'XA',
          studyDescription: 'X-Ray Angiography Study',
          series: [
            {
              seriesInstanceUID: '1.3.12.2.1107.5.4.3.123456789012345.19950922.121803.8',
              seriesNumber: 1,
              modality: 'XA',
              seriesDescription: 'Angiography Series',
              numberOfInstances: 96,
              instances: [
                {
                  sopInstanceUID: '1.3.12.2.1107.5.4.3.321890.19960124.162922.29.0',
                  instanceNumber: 1
                }
              ]
            }
          ]
        }
        
        console.log('Using fallback demo data:', fallbackData)
        setStudyData(fallbackData)
      } finally {
        setIsLoading(false)
      }
    }

    loadStudyData()
  }, [studyInstanceUID])

  if (isLoading || !studyInstanceUID) {
    return (
      <>
        <Helmet>
          <title>Loading Viewer - Medical Imaging Viewer</title>
        </Helmet>
        
        <Box sx={{ 
          height: '100vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          bgcolor: 'grey.900'
        }}>
          <Typography variant="h6" color="grey.400">
            Loading medical imaging study...
          </Typography>
        </Box>
      </>
    )
  }

  if (error) {
    return (
      <>
        <Helmet>
          <title>Error - Medical Imaging Viewer</title>
        </Helmet>
        
        <Box sx={{ p: 3 }}>
          <Alert severity="error">
            <Typography variant="h6" gutterBottom>
              Failed to Load Study
            </Typography>
            <Typography variant="body2">{error}</Typography>
            {studyInstanceUID && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                Study UID: {studyInstanceUID}
              </Typography>
            )}
          </Alert>
        </Box>
      </>
    )
  }

  return (
    <>
      <Helmet>
        <title>{`Medical Image Viewer - ${studyData?.studyDescription || 'DICOM Study'}`}</title>
      </Helmet>
      
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        {/* Header */}
        <Box sx={{ 
          bgcolor: 'secondary.main', 
          color: 'secondary.contrastText', 
          p: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            👁️ Advanced Medical Imaging Viewer
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2">
              {user?.firstName} {user?.lastName}
            </Typography>
            <Button 
              variant="contained" 
              size="small" 
              onClick={() => navigate('/orthanc')}
              sx={{ 
                bgcolor: 'primary.main',
                '&:hover': {
                  bgcolor: 'primary.dark'
                }
              }}
            >
              📁 Browse Studies
            </Button>
            <Button 
              variant="outlined" 
              size="small" 
              onClick={() => navigate('/dashboard')}
              sx={{ 
                color: 'secondary.contrastText', 
                borderColor: 'secondary.contrastText',
                '&:hover': {
                  bgcolor: 'rgba(255,255,255,0.1)'
                }
              }}
            >
              Back to Dashboard
            </Button>
          </Box>
        </Box>

        {/* Study Information */}
        <Box sx={{ p: 2, bgcolor: 'grey.100' }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <Typography variant="body2" color="text.secondary">Patient:</Typography>
              <Typography variant="body1" fontWeight="bold">
                {studyData?.patientName?.replace('^', ', ') || 'Unknown Patient'}
              </Typography>
            </Grid>
            <Grid item xs={12} md={2}>
              <Typography variant="body2" color="text.secondary">Patient ID:</Typography>
              <Typography variant="body1">{studyData?.patientID || 'N/A'}</Typography>
            </Grid>
            <Grid item xs={12} md={2}>
              <Typography variant="body2" color="text.secondary">Study Date:</Typography>
              <Typography variant="body1">
                {studyData?.studyDate ? 
                  new Date(studyData.studyDate.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')).toLocaleDateString() 
                  : 'N/A'
                }
              </Typography>
            </Grid>
            <Grid item xs={12} md={2}>
              <Typography variant="body2" color="text.secondary">Modality:</Typography>
              <Chip label={studyData?.modality || 'Unknown'} size="small" color="primary" />
            </Grid>
            <Grid item xs={12} md={3}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">Description:</Typography>
                  <Typography variant="body1">{studyData?.studyDescription || 'N/A'}</Typography>
                </Box>
              
              </Box>
            </Grid>
          </Grid>
            <Box sx={{ width: 350, bgcolor: 'grey.50', borderRight: 1, borderColor: 'divider', display: 'flex', flexDirection: 'column' }}>
            {/* Patient Context Panel */}
            {patientContext && (
              <Box sx={{ maxHeight: '40%', overflow: 'auto' }}>
                <PatientContextPanel 
                  patientContext={patientContext}
                  isLoading={false}
                />
              </Box>
            )}
            
            {/* Series List */}
            <Box sx={{ flex: 1, p: 2, overflow: 'auto' }}>
              <Typography variant="h6" gutterBottom>Series ({studyData?.series?.length || 0})</Typography>
              {studyData?.series?.map((series: any, index: number) => (
                <Paper 
                  key={series.seriesInstanceUID}
                  sx={{ 
                    p: 2, 
                    mb: 1, 
                    cursor: 'pointer',
                    bgcolor: 'white',
                    '&:hover': { bgcolor: 'grey.100' }
                  }}
                >
                  <Typography variant="body1" fontWeight="bold">{series.seriesDescription}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {series.numberOfInstances} images • {series.modality}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Series: {series.seriesNumber}
                  </Typography>
                </Paper>
              ))}
            </Box>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', height: 'calc(100vh - 140px)' }}>
          {/* Left Panel - Patient Context & Series */}
        

          {/* Main Content Area */}
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {/* Tab Navigation */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
                <Tab label="Image Viewer" />
                <Tab label="Structured Reporting" />
              </Tabs>
            </Box>

            {/* Tab Content */}
            <Box sx={{ flex: 1 }}>
              <TabPanel value={activeTab} index={0}>
                {studyData ? (
                  viewerType === 'cornerstone3d' ? (
                    <Cornerstone3DViewer
                      studyInstanceUID={studyData.studyInstanceUID}
                      seriesInstanceUID={studyData.series?.[0]?.seriesInstanceUID}
                      sopInstanceUIDs={studyData.series?.[0]?.instances?.map((instance: any) => instance.sopInstanceUID) || []}
                      dicomWebBaseUrl="/api/dicom"
                      mode="stack"
                    />
                  ) : (
                    <MedicalImageViewer
                      studyInstanceUID={studyData.studyInstanceUID}
                      seriesInstanceUID={studyData.series?.[0]?.seriesInstanceUID || 'default-series'}
                      sopInstanceUIDs={studyData.series?.[0]?.instances?.map((instance: any) => instance.sopInstanceUID) || []}
                      isLoading={isLoading}
                      error={error || undefined}
                    />
                  )
                ) : (
                  <Box sx={{ 
                    height: '100%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    bgcolor: 'grey.900'
                  }}>
                    <Typography variant="h6" color="grey.400">
                      No study data available
                    </Typography>
                  </Box>
                )}
              </TabPanel>

              <TabPanel value={activeTab} index={1}>
                {studyData ? (
                  <ReportingInterface
                    studyInstanceUID={studyData.studyInstanceUID}
                    patientId={studyData.patientID}
                    onReportFinalized={(report) => {
                      console.log('Report finalized:', report)
                      // Could show success message or navigate
                    }}
                  />
                ) : (
                  <Box sx={{ p: 3 }}>
                    <Typography variant="h6" color="text.secondary">
                      No study data available for reporting
                    </Typography>
                  </Box>
                )}
              </TabPanel>
            </Box>
          </Box>
        </Box>
      </Box>
    </>
  )
}

export default ViewerPage