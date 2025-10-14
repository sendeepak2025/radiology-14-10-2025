import React, { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import SignaturePad from './SignaturePad'
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Switch,
  FormControlLabel,
  Divider,
  Alert,
  CircularProgress,
  Snackbar,
  LinearProgress,
  Card,
  CardContent,
  CardActions,
  Badge
} from '@mui/material'
import {
  ExpandMore as ExpandMoreIcon,
  Assignment as ReportIcon,
  AutoAwesome as AIIcon,
  Save as SaveIcon,
  Print as PrintIcon,
  Share as ShareIcon,
  History as HistoryIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Mic as MicIcon,
  Stop as StopIcon,
  PlayArrow as PlayIcon,
  ContentCopy as CopyIcon,
  Download as DownloadIcon,
  Description as TemplateIcon,
  SmartToy as SmartToyIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material'

interface Measurement {
  id: string
  type: 'length' | 'area' | 'angle'
  value: number
  unit: string
  location: string
  frameIndex: number
}

interface Finding {
  id: string
  category: string
  location: string
  description: string
  severity: 'normal' | 'mild' | 'moderate' | 'severe' | 'critical'
  measurements: string[]
  icdCode?: string
  recommendations?: string[]
}

interface ReportTemplate {
  id: string
  name: string
  modality: string
  sections: {
    id: string
    title: string
    content: string
    required: boolean
    suggestions: string[]
  }[]
}

interface StructuredReportingProps {
  studyData: any
  measurements: Measurement[]
  annotations: any[]
  onSaveReport: (report: any) => void
  onExportReport: (format: string) => void
  onSignatureSave?: (signatureDataUrl: string) => void
}

const StructuredReporting: React.FC<StructuredReportingProps> = ({
  studyData,
  measurements,
  annotations,
  onSaveReport,
  onExportReport,
  onSignatureSave
}) => {
  const [currentTab, setCurrentTab] = useState(0)
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null)
  const [reportSections, setReportSections] = useState<any>({})
  const [findings, setFindings] = useState<Finding[]>([])
  const [isAIAssistEnabled, setIsAIAssistEnabled] = useState(true)
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)
  const [reportStatus, setReportStatus] = useState<'draft' | 'reviewing' | 'final'>('draft')
  const [voiceRecording, setVoiceRecording] = useState(false)
  const [showTemplateDialog, setShowTemplateDialog] = useState(false)
  const [reportPreview, setReportPreview] = useState('')
  
  // Advanced state management
  const [availableTemplates, setAvailableTemplates] = useState<ReportTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<'saving' | 'saved' | 'error' | null>(null)
  
  // Previous reports
  const [showPreviousReports, setShowPreviousReports] = useState(false)
  const [previousReports, setPreviousReports] = useState<any[]>([])
  const [loadingReports, setLoadingReports] = useState(false)
  const [reportHistory, setReportHistory] = useState<any[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [autoSaveInterval, setAutoSaveInterval] = useState<NodeJS.Timeout | null>(null)
  const [reportValidation, setReportValidation] = useState<{[key: string]: boolean}>({})
  const [exportProgress, setExportProgress] = useState(0)
  const [showExportDialog, setShowExportDialog] = useState(false)

  // Standard Templates for different modalities
  const standardTemplates: ReportTemplate[] = [
    {
      id: 'chest-xray',
      name: 'Chest X-Ray Report',
      modality: 'XA',
      sections: [
        {
          id: 'clinical-info',
          title: 'Clinical Information',
          content: '',
          required: true,
          suggestions: [
            'Chest pain',
            'Shortness of breath', 
            'Cough',
            'Fever',
            'Follow-up study',
            'Pre-operative evaluation'
          ]
        },
        {
          id: 'technique',
          title: 'Technique',
          content: 'Frontal and lateral chest radiographs obtained in the upright position.',
          required: true,
          suggestions: [
            'Frontal and lateral chest radiographs',
            'Single frontal view',
            'Portable chest radiograph',
            'Inspiration and expiration views'
          ]
        },
        {
          id: 'findings',
          title: 'Findings',
          content: '',
          required: true,
          suggestions: [
            'Lungs are clear bilaterally',
            'No acute cardiopulmonary process',
            'Heart size is normal',
            'Mediastinal contours are normal',
            'No pleural effusion',
            'Skeletal structures appear intact'
          ]
        },
        {
          id: 'impression',
          title: 'Impression',
          content: '',
          required: true,
          suggestions: [
            'Normal chest radiograph',
            'No acute cardiopulmonary process',
            'Pneumonia',
            'Pleural effusion',
            'Pneumothorax'
          ]
        }
      ]
    },
    {
      id: 'cardiac-angio',
      name: 'Cardiac Angiography Report',
      modality: 'XA',
      sections: [
        {
          id: 'indication',
          title: 'Clinical Indication',
          content: '',
          required: true,
          suggestions: [
            'Chest pain evaluation',
            'Acute coronary syndrome',
            'Abnormal stress test',
            'Heart failure evaluation',
            'Pre-operative risk assessment'
          ]
        },
        {
          id: 'procedure',
          title: 'Procedure',
          content: 'Coronary angiography performed via radial/femoral approach.',
          required: true,
          suggestions: [
            'Right heart catheterization',
            'Left heart catheterization',
            'Coronary angiography',
            'Ventriculography'
          ]
        },
        {
          id: 'vessels',
          title: 'Coronary Vessels',
          content: '',
          required: true,
          suggestions: [
            'Left main: Normal',
            'LAD: Normal',
            'LCX: Normal',
            'RCA: Normal',
            'Dominance: Right dominant system'
          ]
        },
        {
          id: 'lvef',
          title: 'Left Ventricular Function',
          content: '',
          required: true,
          suggestions: [
            'Normal LVEF (>55%)',
            'Mildly reduced LVEF (45-54%)',
            'Moderately reduced LVEF (35-44%)',
            'Severely reduced LVEF (<35%)'
          ]
        },
        {
          id: 'conclusion',
          title: 'Conclusion',
          content: '',
          required: true,
          suggestions: [
            'Normal coronary arteries',
            'Non-obstructive coronary disease',
            'Single vessel disease',
            'Multi-vessel disease'
          ]
        }
      ]
    },
    {
      id: 'ct-chest',
      name: 'CT Chest Report',
      modality: 'CT',
      sections: [
        {
          id: 'clinical-history',
          title: 'Clinical History',
          content: '',
          required: true,
          suggestions: [
            'Chest pain',
            'Dyspnea',
            'Hemoptysis',
            'Weight loss',
            'Staging evaluation'
          ]
        },
        {
          id: 'technique',
          title: 'Technique',
          content: 'Chest CT with/without IV contrast.',
          required: true,
          suggestions: [
            'Non-contrast chest CT',
            'CT chest with IV contrast',
            'CT pulmonary angiogram (CTPA)',
            'High resolution CT (HRCT)'
          ]
        },
        {
          id: 'findings',
          title: 'Findings',
          content: '',
          required: true,
          suggestions: [
            'Lungs: Clear bilaterally',
            'Pleura: No effusion or pneumothorax',
            'Mediastinum: Normal lymph nodes',
            'Heart: Normal size and contour'
          ]
        },
        {
          id: 'impression',
          title: 'Impression',
          content: '',
          required: true,
          suggestions: [
            'Normal CT chest',
            'No acute pulmonary embolism',
            'Pneumonia',
            'Pulmonary nodule'
          ]
        }
      ]
    }
  ]

  // Initialize with templates and auto-select appropriate one
  useEffect(() => {
    const initializeReporting = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Try to load from backend, but always have fallback
        let templatesToUse = standardTemplates
        
        try {
          const backendUrl = import.meta.env.VITE_BACKEND_URL || process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001'
          const response = await axios.get(`${backendUrl}/api/reports/templates?active=true`)
          
          if (response.data?.success && response.data.templates?.length > 0) {
            templatesToUse = response.data.templates
            console.log('✅ Loaded templates from backend:', templatesToUse.length)
          }
        } catch (backendError) {
          console.log('Backend templates not available, using built-in templates')
        }
        
        setAvailableTemplates(templatesToUse)
        
        // Auto-select appropriate template based on study modality
        if (studyData && !selectedTemplate) {
          const modality = studyData.modality || 'XA'
          const template = templatesToUse.find(t => t.modality === modality) || templatesToUse[0]
          
          if (template) {
            setSelectedTemplate(template)
            
            // Initialize sections with template content
            const initialSections: any = {}
            template.sections.forEach(section => {
              initialSections[section.id] = section.content || ''
            })
            setReportSections(initialSections)
            console.log('✅ Auto-selected template:', template.name)
          }
        }
        
      } catch (err) {
        console.error('Error initializing reporting:', err)
        setAvailableTemplates(standardTemplates)
        setError('Initialization error - using basic functionality')
      } finally {
        setLoading(false)
      }
    }

    initializeReporting()
  }, [studyData])

  // Load report history
  useEffect(() => {
    const loadReportHistory = async () => {
      if (!studyData?.studyInstanceUID) return
      
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001'
        const response = await axios.get(`${backendUrl}/api/reports/study/${studyData.studyInstanceUID}`)
        
        if (response.data.success) {
          setReportHistory(response.data.reports || [])
        }
      } catch (err) {
        console.warn('Failed to load report history:', err)
      }
    }

    loadReportHistory()
  }, [studyData?.studyInstanceUID])

  // Auto-save functionality
  useEffect(() => {
    if (Object.keys(reportSections).length === 0 || !selectedTemplate) return

    if (autoSaveInterval) {
      clearInterval(autoSaveInterval)
    }

    const interval = setInterval(() => {
      handleAutoSave()
    }, 30000) // Auto-save every 30 seconds

    setAutoSaveInterval(interval)

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [reportSections, selectedTemplate])

  // Validation
  useEffect(() => {
    if (!selectedTemplate) return

    const validation: {[key: string]: boolean} = {}
    selectedTemplate.sections.forEach(section => {
      if (section.required) {
        validation[section.id] = Boolean(reportSections[section.id]?.trim())
      }
    })
    setReportValidation(validation)
  }, [reportSections, selectedTemplate])

  // Auto-save handler
  const handleAutoSave = useCallback(async () => {
    if (!selectedTemplate || !studyData?.studyInstanceUID) return

    try {
      setSaveStatus('saving')
      
      const reportData = {
        templateId: selectedTemplate.id,
        sections: reportSections,
        findings: findings,
        measurements: measurements.map(m => ({
          id: m.id,
          type: m.type,
          value: m.value,
          unit: m.unit,
          location: m.location || `Frame ${m.frameIndex}`,
          frameIndex: m.frameIndex
        })),
        status: reportStatus,
        author: 'Current User'
      }

      const backendUrl = import.meta.env.VITE_BACKEND_URL || process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001'
      await axios.post(`${backendUrl}/api/reports`, reportData)
      
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus(null), 3000)
      
    } catch (err) {
      console.warn('Auto-save failed:', err)
      setSaveStatus('error')
      setTimeout(() => setSaveStatus(null), 5000)
    }
  }, [selectedTemplate, reportSections, findings, measurements, reportStatus, studyData?.studyInstanceUID])

  // Auto-generate findings from measurements and annotations
  const generateFindingsFromData = useCallback(() => {
    const generatedFindings: Finding[] = []

    // Process measurements
    measurements.forEach(measurement => {
      if (measurement.type === 'length' && measurement.value > 0) {
        generatedFindings.push({
          id: `finding-${measurement.id}`,
          category: 'Measurement',
          location: measurement.location || 'Not specified',
          description: `${measurement.type} measurement: ${measurement.value} ${measurement.unit}`,
          severity: 'normal',
          measurements: [measurement.id]
        })
      }
    })

    // Process annotations
    annotations.forEach(annotation => {
      if (annotation.category === 'finding') {
        generatedFindings.push({
          id: `finding-${annotation.id}`,
          category: annotation.category || 'General',
          location: 'Image annotation',
          description: annotation.text || 'Annotated finding',
          severity: 'mild',
          measurements: []
        })
      }
    })

    setFindings(generatedFindings)
  }, [measurements, annotations])

  // Simple working AI Report Generation
  const generateAIReport = useCallback(async () => {
    if (!selectedTemplate) {
      setError('No template selected')
      return
    }

    setIsGeneratingReport(true)
    setError(null)
    
    try {
      // Try backend AI generation first
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001'
        
        const requestData = {
          templateId: selectedTemplate.id,
          studyData: studyData,
          measurements: measurements,
          findings: findings
        }
        
        const response = await axios.post(`${backendUrl}/api/reports/ai-generate`, requestData, {
          timeout: 10000 // 10 second timeout
        })
        
        if (response.data?.success && response.data.sections) {
          setReportSections(response.data.sections)
          setSaveStatus('saved')
          setTimeout(() => setSaveStatus(null), 3000)
          console.log('✅ AI report generated successfully')
          return
        }
      } catch (backendError) {
        console.log('Backend AI unavailable, using local generation')
      }
      
      // Local AI-like generation as fallback
      const aiGeneratedSections: any = {}
      
      selectedTemplate.sections.forEach(section => {
        switch (section.id) {
          case 'clinical-info':
          case 'clinical-history': 
          case 'indication':
            aiGeneratedSections[section.id] = studyData?.studyDescription || 'Clinical evaluation for diagnostic imaging.'
            break
            
          case 'technique':
            const modality = studyData?.modality || 'Unknown'
            if (modality === 'XA') {
              aiGeneratedSections[section.id] = 'Digital angiography performed with contrast enhancement.'
            } else if (modality === 'CT') {
              aiGeneratedSections[section.id] = 'Chest CT performed with IV contrast enhancement.'
            } else {
              aiGeneratedSections[section.id] = section.content || 'Standard imaging technique utilized.'
            }
            break
            
          case 'findings':
            let findingsText = 'IMAGING FINDINGS:\n\n'
            
            if (measurements.length > 0) {
              findingsText += 'MEASUREMENTS:\n'
              measurements.forEach(m => {
                findingsText += `• ${m.type}: ${m.value} ${m.unit}\n`
              })
              findingsText += '\n'
            }
            
            if (findings.length > 0) {
              findingsText += 'DOCUMENTED FINDINGS:\n'
              findings.forEach(f => {
                findingsText += `• ${f.location}: ${f.description}\n`
              })
            } else {
              findingsText += 'No acute abnormalities identified.'
            }
            
            aiGeneratedSections[section.id] = findingsText
            break
            
          case 'vessels':
            if (measurements.length > 0) {
              let vesselText = 'VASCULAR ASSESSMENT:\n'
              measurements.forEach(m => {
                vesselText += `• ${m.location || 'Vessel'}: ${m.value} ${m.unit}\n`
              })
              aiGeneratedSections[section.id] = vesselText
            } else {
              aiGeneratedSections[section.id] = 'Coronary vessels appear normal.'
            }
            break
            
          case 'impression':
          case 'conclusion':
            const hasCritical = findings.some(f => f.severity === 'critical')
            if (hasCritical) {
              aiGeneratedSections[section.id] = 'ABNORMAL STUDY - Significant findings identified.'
            } else {
              aiGeneratedSections[section.id] = 'No significant abnormalities identified.'
            }
            break
            
          default:
            aiGeneratedSections[section.id] = reportSections[section.id] || section.content || ''
        }
      })
      
      setReportSections(aiGeneratedSections)
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus(null), 3000)
      console.log('✅ Local AI generation completed')
      
    } catch (error) {
      console.error('AI generation error:', error)
      setError('AI generation failed')
    } finally {
      setIsGeneratingReport(false)
    }
  }, [selectedTemplate, findings, measurements, studyData, reportSections])

  // Generate complete report text
  const generateReportPreview = useCallback(() => {
    if (!selectedTemplate) return

    let reportText = `STRUCTURED RADIOLOGY REPORT\n\n`
    reportText += `Study: ${studyData?.studyDescription || 'Medical Imaging Study'}\n`
    reportText += `Date: ${new Date().toLocaleDateString()}\n`
    reportText += `Patient: ${studyData?.patientName || 'Patient Name'}\n`
    reportText += `Modality: ${selectedTemplate.modality}\n\n`

    selectedTemplate.sections.forEach(section => {
      const content = reportSections[section.id] || section.content
      if (content.trim()) {
        reportText += `${section.title.toUpperCase()}:\n`
        reportText += `${content}\n\n`
      }
    })

    if (findings.length > 0) {
      reportText += `DETAILED FINDINGS:\n`
      findings.forEach((finding, index) => {
        reportText += `${index + 1}. ${finding.location} - ${finding.description}\n`
      })
      reportText += '\n'
    }

    reportText += `Report Status: ${reportStatus.toUpperCase()}\n`
    reportText += `Generated: ${new Date().toLocaleString()}\n`

    setReportPreview(reportText)
  }, [selectedTemplate, reportSections, findings, studyData, reportStatus])

  useEffect(() => {
    generateReportPreview()
  }, [generateReportPreview])

  useEffect(() => {
    generateFindingsFromData()
  }, [generateFindingsFromData])

  const handleSectionChange = (sectionId: string, value: string) => {
    setReportSections(prev => ({
      ...prev,
      [sectionId]: value
    }))
  }

  const handleSaveReport = () => {
    const report = {
      template: selectedTemplate?.id,
      sections: reportSections,
      findings: findings,
      status: reportStatus,
      timestamp: new Date().toISOString(),
      studyData: studyData
    }
    onSaveReport(report)
  }

  const fetchPreviousReports = async () => {
    setLoadingReports(true)
    try {
      const studyUID = studyData?.studyInstanceUID
      console.log('📚 Fetching previous reports for study:', studyUID)
      console.log('📊 Study data:', studyData)
      
      if (!studyUID) {
        console.warn('⚠️ No study UID available')
        setPreviousReports([])
        setLoadingReports(false)
        return
      }
      
      const url = `/api/reports/study/${encodeURIComponent(studyUID)}?limit=10`
      console.log('🔗 Fetching from URL:', url)
      
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
      })
      
      console.log('📡 Response status:', response.status)
      console.log('📡 Response ok:', response.ok)
      
      const result = await response.json()
      console.log('📦 Response data:', result)
      
      if (result.success) {
        setPreviousReports(result.data || [])
        console.log('✅ Loaded previous reports:', result.data?.length || 0)
        if (result.data && result.data.length > 0) {
          console.log('📄 First report:', result.data[0])
        }
      } else {
        console.error('❌ Failed to load reports:', result.error)
        setPreviousReports([])
      }
    } catch (error) {
      console.error('💥 Error fetching previous reports:', error)
      setPreviousReports([])
    } finally {
      setLoadingReports(false)
    }
  }

  const loadReportData = (report: any) => {
    console.log('📄 Loading report data:', report.reportId)
    
    // Load sections
    if (report.sections) {
      setReportSections(report.sections)
    }
    
    // Load findings
    if (report.findings) {
      setFindings(report.findings)
    }
    
    // Load signature if available
    if (report.radiologistSignatureUrl) {
      setSignatureDataUrl(report.radiologistSignatureUrl)
    }
    
    // Close previous reports dialog
    setShowPreviousReports(false)
    
    console.log('✅ Report data loaded successfully')
  }

  const handleExport = (format: 'pdf' | 'docx' | 'dicom-sr' | 'hl7') => {
    onExportReport(format)
  }

  const toggleVoiceRecording = () => {
    setVoiceRecording(!voiceRecording)
    // Voice recording implementation would go here
  }

  if (loading) {
    return (
      <Box sx={{ 
        width: '100%', 
        height: '100%', 
        bgcolor: '#1a1a1a', 
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 2
      }}>
        <CircularProgress size={60} sx={{ color: '#64b5f6' }} />
        <Typography variant="h6" sx={{ color: '#64b5f6' }}>
          Loading Advanced Reporting System...
        </Typography>
        <Typography variant="body2" sx={{ color: '#ccc' }}>
          Initializing templates and AI services
        </Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ width: '100%', height: '100%', bgcolor: '#1a1a1a', color: '#fff', position: 'relative' }}>
      {/* Loading Progress Bar */}
      {(isGeneratingReport || saveStatus === 'saving') && (
        <LinearProgress 
          sx={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            right: 0, 
            zIndex: 1000,
            '& .MuiLinearProgress-bar': {
              backgroundColor: '#64b5f6'
            }
          }} 
        />
      )}

      {/* Error/Success Messages */}
      <Snackbar 
        open={Boolean(error)} 
        autoHideDuration={6000} 
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="warning" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>

      <Snackbar 
        open={saveStatus === 'saved'} 
        autoHideDuration={3000} 
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert severity="success">
          Report auto-saved successfully
        </Alert>
      </Snackbar>

      {/* Advanced Header */}
      <Box sx={{ 
        p: 2, 
        borderBottom: '1px solid #333', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        background: 'linear-gradient(90deg, #1a1a1a 0%, #2a2a3a 100%)'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <ReportIcon sx={{ color: '#64b5f6', fontSize: 28 }} />
          <Box>
            <Typography variant="h5" sx={{ color: '#64b5f6', fontWeight: 'bold' }}>
              Advanced Structured Reporting
            </Typography>
            <Typography variant="body2" sx={{ color: '#ccc' }}>
              AI-Powered Medical Report Generation
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip 
              label={reportStatus.toUpperCase()} 
              color={reportStatus === 'final' ? 'success' : reportStatus === 'reviewing' ? 'warning' : 'default'}
              size="small"
            />
            
            {saveStatus && (
              <Chip 
                icon={saveStatus === 'saving' ? <CircularProgress size={16} /> : 
                      saveStatus === 'saved' ? <CheckIcon /> : <ErrorIcon />}
                label={saveStatus === 'saving' ? 'Saving...' : 
                       saveStatus === 'saved' ? 'Auto-saved' : 'Save failed'}
                size="small"
                color={saveStatus === 'saved' ? 'success' : saveStatus === 'error' ? 'error' : 'default'}
              />
            )}

            {reportHistory.length > 0 && (
              <Badge badgeContent={reportHistory.length} color="primary">
                <Chip 
                  icon={<HistoryIcon />}
                  label="History" 
                  size="small"
                  onClick={() => setShowHistory(true)}
                  sx={{ cursor: 'pointer' }}
                />
              </Badge>
            )}
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <FormControlLabel
            control={
              <Switch 
                checked={isAIAssistEnabled}
                onChange={(e) => setIsAIAssistEnabled(e.target.checked)}
                color="primary"
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <AIIcon sx={{ fontSize: 18 }} />
                AI Assist
              </Box>
            }
            sx={{ color: '#ccc' }}
          />
          
          <Button
            variant="contained"
            startIcon={<SmartToyIcon />}
            onClick={generateAIReport}
            disabled={isGeneratingReport}
            sx={{ 
              background: 'linear-gradient(45deg, #9c27b0, #e91e63)',
              '&:hover': { background: 'linear-gradient(45deg, #7b1fa2, #c2185b)' }
            }}
          >
            {isGeneratingReport ? 'Generating...' : 'AI Generate'}
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<SaveIcon />}
            onClick={handleSaveReport}
            sx={{ borderColor: '#4caf50', color: '#4caf50' }}
          >
            Save
          </Button>
        </Box>
      </Box>

      {/* Main Content */}
      <Box sx={{ display: 'flex', height: 'calc(100% - 80px)' }}>
        {/* Left Panel - Report Editor */}
        <Box sx={{ width: '60%', borderRight: '1px solid #333' }}>
          <Tabs 
            value={currentTab} 
            onChange={(e, newValue) => setCurrentTab(newValue)}
            sx={{ borderBottom: '1px solid #333' }}
          >
            <Tab label="Template" />
            <Tab label="Sections" />
            <Tab label="Findings" />
            <Tab label="Review" />
          </Tabs>

          <Box sx={{ p: 2, height: 'calc(100% - 48px)', overflow: 'auto' }}>
            {/* Advanced Template Selection Tab */}
            {currentTab === 0 && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6" sx={{ color: '#64b5f6' }}>
                    Professional Report Templates
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Chip 
                      label={`${availableTemplates.length} Available`} 
                      size="small" 
                      sx={{ bgcolor: '#2a2a2a' }}
                    />
                    <Button
                      size="small"
                      startIcon={<RefreshIcon />}
                      onClick={() => window.location.reload()}
                      sx={{ color: '#64b5f6' }}
                    >
                      Refresh
                    </Button>
                  </Box>
                </Box>

                {error && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    {error}
                  </Alert>
                )}
                
                <Grid container spacing={2}>
                  {availableTemplates.map(template => (
                    <Grid item xs={12} md={6} key={template.id}>
                      <Card 
                        sx={{ 
                          bgcolor: selectedTemplate?.id === template.id ? '#2a4a6b' : '#2a2a2a',
                          border: selectedTemplate?.id === template.id ? '2px solid #64b5f6' : '1px solid #444',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            bgcolor: selectedTemplate?.id === template.id ? '#2a4a6b' : '#3a3a3a',
                            transform: 'translateY(-2px)',
                            boxShadow: '0 4px 8px rgba(100, 181, 246, 0.2)'
                          }
                        }}
                        onClick={() => {
                          setSelectedTemplate(template)
                          // Initialize sections with template content
                          const initialSections: any = {}
                          template.sections.forEach(section => {
                            initialSections[section.id] = section.content || ''
                          })
                          setReportSections(initialSections)
                        }}
                      >
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="h6" sx={{ color: '#64b5f6', mb: 1, fontWeight: 'bold' }}>
                                {template.name}
                              </Typography>
                              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                                <Chip 
                                  label={template.modality} 
                                  size="small" 
                                  color="primary" 
                                  variant="outlined"
                                />
                                <Chip 
                                  label={template.body_part || 'General'} 
                                  size="small" 
                                  sx={{ bgcolor: '#3a3a3a', color: '#ccc' }}
                                />
                              </Box>
                              <Typography variant="body2" sx={{ color: '#ccc', mb: 1 }}>
                                {template.sections.length} structured sections
                              </Typography>
                              <Typography variant="body2" sx={{ color: '#888', fontSize: '0.8rem' }}>
                                Required: {template.sections.filter(s => s.required).length} sections
                              </Typography>
                            </Box>
                            
                            {selectedTemplate?.id === template.id && (
                              <CheckIcon sx={{ color: '#64b5f6', ml: 1 }} />
                            )}
                          </Box>
                        </CardContent>
                        
                        <CardActions sx={{ pt: 0 }}>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {template.sections.slice(0, 3).map(section => (
                              <Chip 
                                key={section.id}
                                label={section.title}
                                size="small"
                                variant="outlined"
                                sx={{ 
                                  fontSize: '0.7rem',
                                  height: '20px',
                                  color: '#aaa',
                                  borderColor: '#555'
                                }}
                              />
                            ))}
                            {template.sections.length > 3 && (
                              <Chip 
                                label={`+${template.sections.length - 3} more`}
                                size="small"
                                sx={{ 
                                  fontSize: '0.7rem',
                                  height: '20px',
                                  bgcolor: '#3a3a3a',
                                  color: '#888'
                                }}
                              />
                            )}
                          </Box>
                        </CardActions>
                      </Card>
                    </Grid>
                  ))}
                </Grid>

                {availableTemplates.length === 0 && !loading && (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="h6" sx={{ color: '#ccc', mb: 2 }}>
                      No templates available
                    </Typography>
                    <Button 
                      variant="outlined" 
                      onClick={() => window.location.reload()}
                      sx={{ color: '#64b5f6', borderColor: '#64b5f6' }}
                    >
                      Retry Loading Templates
                    </Button>
                  </Box>
                )}
              </Box>
            )}

            {/* Sections Editor Tab */}
            {currentTab === 1 && selectedTemplate && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" sx={{ color: '#64b5f6' }}>
                    Report Sections
                  </Typography>
                  <Button
                    startIcon={voiceRecording ? <StopIcon /> : <MicIcon />}
                    onClick={toggleVoiceRecording}
                    variant={voiceRecording ? 'contained' : 'outlined'}
                    color={voiceRecording ? 'error' : 'primary'}
                    size="small"
                  >
                    {voiceRecording ? 'Stop' : 'Voice'} Dictation
                  </Button>
                </Box>

                {selectedTemplate.sections.map(section => (
                  <Accordion key={section.id} sx={{ bgcolor: '#2a2a2a', mb: 1 }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: '#64b5f6' }} />}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography sx={{ color: '#64b5f6', fontWeight: 'bold' }}>
                          {section.title}
                        </Typography>
                        {section.required && (
                          <Chip label="Required" size="small" color="warning" />
                        )}
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      <TextField
                        fullWidth
                        multiline
                        rows={4}
                        value={reportSections[section.id] || section.content}
                        onChange={(e) => handleSectionChange(section.id, e.target.value)}
                        variant="outlined"
                        sx={{ mb: 2 }}
                        InputProps={{
                          sx: { color: '#fff', '& fieldset': { borderColor: '#444' } }
                        }}
                      />
                      
                      <Typography variant="subtitle2" sx={{ color: '#64b5f6', mb: 1 }}>
                        Quick Suggestions:
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {section.suggestions.map((suggestion, index) => (
                          <Chip
                            key={index}
                            label={suggestion}
                            size="small"
                            onClick={() => {
                              const current = reportSections[section.id] || ''
                              handleSectionChange(section.id, current + (current ? '\n' : '') + suggestion)
                            }}
                            sx={{ 
                              bgcolor: '#3a3a3a',
                              color: '#ccc',
                              '&:hover': { bgcolor: '#4a4a4a' }
                            }}
                          />
                        ))}
                      </Box>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Box>
            )}

            {/* Findings Tab */}
            {currentTab === 2 && (
              <Box>
                <Typography variant="h6" sx={{ mb: 2, color: '#64b5f6' }}>
                  Clinical Findings
                </Typography>
                
                {findings.length === 0 ? (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    No findings detected. Measurements and annotations will automatically generate findings.
                  </Alert>
                ) : (
                  <List>
                    {findings.map(finding => (
                      <ListItem key={finding.id} sx={{ bgcolor: '#2a2a2a', mb: 1, borderRadius: 1 }}>
                        <ListItemIcon>
                          {finding.severity === 'critical' && <ErrorIcon color="error" />}
                          {finding.severity === 'severe' && <WarningIcon color="warning" />}
                          {(finding.severity === 'normal' || finding.severity === 'mild') && <CheckIcon color="success" />}
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Typography sx={{ color: '#64b5f6', fontWeight: 'bold' }}>
                              {finding.location} - {finding.category}
                            </Typography>
                          }
                          secondary={
                            <Typography sx={{ color: '#ccc' }}>
                              {finding.description}
                            </Typography>
                          }
                        />
                        <Chip 
                          label={finding.severity} 
                          size="small"
                          color={
                            finding.severity === 'critical' ? 'error' :
                            finding.severity === 'severe' ? 'warning' :
                            'success'
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </Box>
            )}

            {/* Review Tab */}
            {currentTab === 3 && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" sx={{ color: '#64b5f6' }}>
                    Report Review
                  </Typography>
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel sx={{ color: '#ccc' }}>Status</InputLabel>
                    <Select
                      value={reportStatus}
                      onChange={(e) => setReportStatus(e.target.value as any)}
                      sx={{ color: '#fff' }}
                    >
                      <MenuItem value="draft">Draft</MenuItem>
                      <MenuItem value="reviewing">Reviewing</MenuItem>
                      <MenuItem value="final">Final</MenuItem>
                    </Select>
                  </FormControl>
                </Box>

                <Paper sx={{ p: 2, bgcolor: '#2a2a2a', maxHeight: '60vh', overflow: 'auto' }}>
                  <pre style={{ 
                    fontFamily: 'monospace', 
                    fontSize: '14px', 
                    lineHeight: '1.6',
                    color: '#fff',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {reportPreview}
                  </pre>
                </Paper>

                <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                  <Button
                    startIcon={<PrintIcon />}
                    onClick={() => handleExport('pdf')}
                    variant="outlined"
                  >
                    Export PDF
                  </Button>
                  <Button
                    startIcon={<DownloadIcon />}
                    onClick={() => handleExport('docx')}
                    variant="outlined"
                  >
                    Export Word
                  </Button>
                  <Button
                    startIcon={<ShareIcon />}
                    onClick={() => handleExport('dicom-sr')}
                    variant="outlined"
                  >
                    DICOM SR
                  </Button>
                  <Button
                    startIcon={<CopyIcon />}
                    onClick={() => navigator.clipboard.writeText(reportPreview)}
                    variant="outlined"
                  >
                    Copy Text
                  </Button>
                </Box>
              </Box>
            )}
          </Box>
        </Box>

        {/* Right Panel - Study Information & Tools */}
        <Box sx={{ width: '40%', p: 2, overflow: 'auto' }}>
          <Typography variant="h6" sx={{ mb: 2, color: '#64b5f6' }}>
            Study Information
          </Typography>
          
          <Paper sx={{ p: 2, bgcolor: '#2a2a2a', mb: 2 }}>
            <Grid container spacing={1}>
              <Grid item xs={6}>
                <Typography variant="body2" sx={{ color: '#ccc' }}>Patient:</Typography>
                <Typography variant="body1" sx={{ color: '#fff', fontWeight: 'bold' }}>
                  {studyData?.patientName || 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" sx={{ color: '#ccc' }}>Study Date:</Typography>
                <Typography variant="body1" sx={{ color: '#fff' }}>
                  {studyData?.studyDate || 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" sx={{ color: '#ccc' }}>Modality:</Typography>
                <Typography variant="body1" sx={{ color: '#fff' }}>
                  {studyData?.modality || 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" sx={{ color: '#ccc' }}>Series:</Typography>
                <Typography variant="body1" sx={{ color: '#fff' }}>
                  {studyData?.numberOfInstances || 'N/A'} images
                </Typography>
              </Grid>
            </Grid>
          </Paper>

          <Typography variant="h6" sx={{ mb: 2, color: '#64b5f6' }}>
            Measurements ({measurements.length})
          </Typography>
          
          <Paper sx={{ p: 2, bgcolor: '#2a2a2a', mb: 2, maxHeight: '200px', overflow: 'auto' }}>
            {measurements.length === 0 ? (
              <Typography sx={{ color: '#ccc', fontStyle: 'italic' }}>
                No measurements available
              </Typography>
            ) : (
              <List dense>
                {measurements.map(measurement => (
                  <ListItem key={measurement.id} sx={{ py: 0.5 }}>
                    <ListItemText
                      primary={`${measurement.type}: ${measurement.value} ${measurement.unit}`}
                      secondary={`Frame ${measurement.frameIndex} - ${measurement.location || 'Unspecified'}`}
                      primaryTypographyProps={{ sx: { color: '#fff', fontSize: '0.9rem' } }}
                      secondaryTypographyProps={{ sx: { color: '#ccc', fontSize: '0.8rem' } }}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>

          <Typography variant="h6" sx={{ mb: 2, color: '#64b5f6' }}>
            Radiologist Signature
          </Typography>
          
          <Paper sx={{ p: 2, bgcolor: '#2a2a2a', mb: 2 }}>
            <SignaturePad
              onSave={(dataUrl) => {
                console.log('✍️ Signature saved:', dataUrl.substring(0, 50) + '...')
                setSignatureDataUrl(dataUrl)
                if (onSignatureSave) {
                  onSignatureSave(dataUrl)
                }
              }}
              onClear={() => {
                setSignatureDataUrl(null)
              }}
              width={450}
              height={150}
            />
            {signatureDataUrl && (
              <Box sx={{ mt: 2, p: 1, bgcolor: '#1a1a1a', borderRadius: 1 }}>
                <Typography variant="caption" sx={{ color: '#4caf50' }}>
                  ✅ Signature captured successfully
                </Typography>
              </Box>
            )}
          </Paper>

          <Typography variant="h6" sx={{ mb: 2, color: '#64b5f6' }}>
            Report Tools
          </Typography>
          
          <Paper sx={{ p: 2, bgcolor: '#2a2a2a' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<HistoryIcon />}
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setShowPreviousReports(true)
                  fetchPreviousReports()
                }}
                sx={{ justifyContent: 'flex-start' }}
              >
                Previous Reports
              </Button>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<TemplateIcon />}
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setShowTemplateDialog(true)
                }}
                sx={{ justifyContent: 'flex-start' }}
              >
                Template Library
              </Button>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<AIIcon />}
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  console.log('AI Suggestions clicked')
                }}
                sx={{ justifyContent: 'flex-start' }}
              >
                AI Suggestions
              </Button>
              <Divider sx={{ my: 1, bgcolor: '#444' }} />
              <Button
                fullWidth
                variant="contained"
                type="button"
                startIcon={<CheckIcon />}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  
                  // Set status to final
                  setReportStatus('final')
                  
                  // Prepare and save report
                  const report = {
                    template: selectedTemplate?.id,
                    sections: reportSections,
                    findings: findings,
                    status: 'final',
                    timestamp: new Date().toISOString(),
                    studyData: studyData,
                    measurements: measurements,
                    annotations: annotations,
                    radiologistSignature: signatureDataUrl
                  }
                  
                  console.log('🔒 Finalizing report:', report)
                  onSaveReport(report)
                }}
                disabled={reportStatus === 'final' || !signatureDataUrl}
                sx={{ 
                  bgcolor: '#4caf50',
                  '&:hover': { bgcolor: '#45a049' },
                  '&:disabled': { bgcolor: '#ccc' }
                }}
              >
                {signatureDataUrl ? 'Finalize Report' : 'Sign First to Finalize'}
              </Button>
            </Box>
          </Paper>
        </Box>
      </Box>

      {/* Previous Reports Dialog */}
      <Dialog
      open={showPreviousReports}
      onClose={() => setShowPreviousReports(false)}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: '#1a1a1a',
          color: '#fff'
        }
      }}
    >
      <DialogTitle sx={{ bgcolor: '#2563eb', color: 'white' }}>
        📚 Previous Reports
      </DialogTitle>
      <DialogContent sx={{ mt: 2 }}>
        {loadingReports ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : previousReports.length === 0 ? (
          <Box sx={{ textAlign: 'center', p: 4 }}>
            <Typography variant="body1" color="text.secondary">
              No previous reports found for this patient
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {previousReports.map((report) => (
              <Card
                key={report._id}
                sx={{
                  bgcolor: '#2a2a2a',
                  cursor: 'pointer',
                  '&:hover': {
                    bgcolor: '#333',
                    transform: 'translateY(-2px)',
                    transition: 'all 0.2s'
                  }
                }}
                onClick={() => loadReportData(report)}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="h6" sx={{ color: '#64b5f6' }}>
                      Report ID: {report.reportId}
                    </Typography>
                    <Chip
                      label={report.reportStatus}
                      size="small"
                      color={
                        report.reportStatus === 'final' ? 'success' :
                        report.reportStatus === 'draft' ? 'default' :
                        'warning'
                      }
                    />
                  </Box>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Date: {new Date(report.reportDate).toLocaleDateString()}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Radiologist: {report.radiologistName}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Measurements: {report.measurements?.length || 0}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Annotations: {report.annotations?.length || 0}
                      </Typography>
                    </Grid>
                  </Grid>
                  
                  {report.impression && (
                    <Box sx={{ mt: 2, p: 1, bgcolor: '#1a1a1a', borderRadius: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Impression:
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        {report.impression.substring(0, 150)}
                        {report.impression.length > 150 ? '...' : ''}
                      </Typography>
                    </Box>
                  )}
                  
                  {report.radiologistSignatureUrl && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        Signature:
                      </Typography>
                      <Box
                        component="img"
                        src={report.radiologistSignatureUrl}
                        alt="Signature"
                        sx={{
                          maxWidth: 200,
                          maxHeight: 60,
                          mt: 1,
                          border: '1px solid #444',
                          borderRadius: 1,
                          p: 0.5,
                          bgcolor: 'white'
                        }}
                      />
                    </Box>
                  )}
                </CardContent>
                <CardActions sx={{ justifyContent: 'flex-end', p: 2, pt: 0 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={(e) => {
                      e.stopPropagation()
                      loadReportData(report)
                    }}
                  >
                    Load Report
                  </Button>
                </CardActions>
              </Card>
            ))}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setShowPreviousReports(false)}>
          Close
        </Button>
      </DialogActions>
      </Dialog>
    </Box>
  )
}

export default StructuredReporting