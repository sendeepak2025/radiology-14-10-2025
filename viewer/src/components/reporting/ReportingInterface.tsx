import React, { useState, useEffect } from 'react'
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Button,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip
} from '@mui/material'
import {
  Save as SaveIcon,
  Send as SendIcon,
  History as HistoryIcon,
  Compare as CompareIcon,
  AutoAwesome as AIIcon
} from '@mui/icons-material'
import type {
  StructuredReport,
  ReportTemplate,
  ReportStatus,
  ReportComparison
} from '@medical-imaging/shared-types'
import { reportingService } from '@/services/reportingService'
import { ReportEditor } from './ReportEditor'
import { ReportHistory } from './ReportHistory'
import { ReportComparison as ReportComparisonComponent } from './ReportComparison'
import { TemplateSelector } from './TemplateSelector'

interface ReportingInterfaceProps {
  studyInstanceUID: string
  patientId: string
  onReportFinalized?: (report: StructuredReport) => void
}

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
      id={`reporting-tabpanel-${index}`}
      aria-labelledby={`reporting-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  )
}

export const ReportingInterface: React.FC<ReportingInterfaceProps> = ({
  studyInstanceUID,
  patientId,
  onReportFinalized
}) => {
  const [activeTab, setActiveTab] = useState(0)
  const [currentReport, setCurrentReport] = useState<StructuredReport | null>(null)
  const [template, setTemplate] = useState<ReportTemplate | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showTemplateSelector, setShowTemplateSelector] = useState(false)
  const [showComparison, setShowComparison] = useState(false)
  const [comparisonData, setComparisonData] = useState<ReportComparison | null>(null)
  const [validationErrors, setValidationErrors] = useState<Array<{
    field: string
    message: string
    severity: 'error' | 'warning'
  }>>([])

  useEffect(() => {
    loadExistingReport()
  }, [studyInstanceUID])

  const loadExistingReport = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const reports = await reportingService.getReportsForStudy(studyInstanceUID)
      const draftReport = reports.find(r => r.status === 'draft' || r.status === 'in_progress')
      
      if (draftReport) {
        setCurrentReport(draftReport)
        const reportTemplate = await reportingService.getTemplate(draftReport.templateId)
        setTemplate(reportTemplate)
      } else {
        setShowTemplateSelector(true)
      }
    } catch (err) {
      setError('Failed to load existing report')
      console.error('Error loading report:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleTemplateSelected = async (selectedTemplate: ReportTemplate) => {
    setLoading(true)
    setError(null)
    
    try {
      const newReport = await reportingService.createReport({
        studyInstanceUID,
        templateId: selectedTemplate.id,
        priority: 'routine'
      })
      
      setCurrentReport(newReport)
      setTemplate(selectedTemplate)
      setShowTemplateSelector(false)
    } catch (err) {
      setError('Failed to create new report')
      console.error('Error creating report:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveDraft = async (reportData: any) => {
    if (!currentReport) return
    
    setSaving(true)
    setError(null)
    
    try {
      const updatedReport = await reportingService.saveDraft(currentReport.id, reportData)
      setCurrentReport(updatedReport)
    } catch (err) {
      setError('Failed to save draft')
      console.error('Error saving draft:', err)
    } finally {
      setSaving(false)
    }
  }

  const handlePopulateFromAI = async () => {
    if (!currentReport) return
    
    setLoading(true)
    setError(null)
    
    try {
      const aiData = await reportingService.populateFromAI(currentReport.id, studyInstanceUID)
      
      // Update the current report with AI findings
      const updatedReport = await reportingService.updateReport(currentReport.id, {
        findings: aiData.findings,
        measurements: aiData.measurements,
        impression: aiData.suggestedImpression || currentReport.impression
      })
      
      setCurrentReport(updatedReport)
    } catch (err) {
      setError('Failed to populate from AI findings')
      console.error('Error populating from AI:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleFinalizeReport = async (reportData: any) => {
    if (!currentReport) return
    
    setLoading(true)
    setError(null)
    
    try {
      // Validate report first
      const validation = await reportingService.validateReport(currentReport.id)
      
      if (!validation.isValid) {
        setValidationErrors(validation.errors)
        setError('Report validation failed. Please fix the errors before finalizing.')
        setLoading(false)
        return
      }
      
      const result = await reportingService.finalizeReport(currentReport.id, reportData)
      setCurrentReport(result.report)
      
      // Submit to EHR
      const ehrResult = await reportingService.submitToEHR(result.report.id)
      
      if (!ehrResult.success) {
        setError(`Report finalized but EHR submission failed: ${ehrResult.error}`)
      }
      
      onReportFinalized?.(result.report)
    } catch (err) {
      setError('Failed to finalize report')
      console.error('Error finalizing report:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCompareWithPrior = async (priorReportId: string) => {
    if (!currentReport) return
    
    setLoading(true)
    setError(null)
    
    try {
      const comparison = await reportingService.compareReports(currentReport.id, priorReportId)
      setComparisonData(comparison)
      setShowComparison(true)
    } catch (err) {
      setError('Failed to compare reports')
      console.error('Error comparing reports:', err)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: ReportStatus) => {
    switch (status) {
      case 'draft': return 'default'
      case 'in_progress': return 'primary'
      case 'preliminary': return 'warning'
      case 'final': return 'success'
      case 'amended': return 'info'
      case 'corrected': return 'info'
      case 'cancelled': return 'error'
      default: return 'default'
    }
  }

  if (loading && !currentReport) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {validationErrors.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setValidationErrors([])}>
          <Typography variant="subtitle2" gutterBottom>
            Validation Issues:
          </Typography>
          {validationErrors.map((error, index) => (
            <Typography key={index} variant="body2">
              • {error.field}: {error.message}
            </Typography>
          ))}
        </Alert>
      )}

      {currentReport && (
        <Paper sx={{ mb: 2, p: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h6">
                {template?.name || 'Structured Report'}
              </Typography>
              <Box display="flex" gap={1} mt={1}>
                <Chip 
                  label={currentReport.status.replace('_', ' ').toUpperCase()} 
                  color={getStatusColor(currentReport.status)}
                  size="small"
                />
                <Chip 
                  label={currentReport.priority.toUpperCase()} 
                  variant="outlined"
                  size="small"
                />
              </Box>
            </Box>
            <Box display="flex" gap={1}>
              <Button
                startIcon={<AIIcon />}
                onClick={handlePopulateFromAI}
                disabled={loading || currentReport.status === 'final'}
                variant="outlined"
                size="small"
              >
                AI Assist
              </Button>
              <Button
                startIcon={<SaveIcon />}
                onClick={() => handleSaveDraft({})}
                disabled={saving || currentReport.status === 'final'}
                variant="outlined"
                size="small"
              >
                {saving ? 'Saving...' : 'Save Draft'}
              </Button>
            </Box>
          </Box>
        </Paper>
      )}

      <Paper sx={{ flexGrow: 1 }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Report Editor" />
          <Tab label="History" icon={<HistoryIcon />} />
          <Tab label="Comparison" icon={<CompareIcon />} />
        </Tabs>

        <TabPanel value={activeTab} index={0}>
          {currentReport && template ? (
            <ReportEditor
              report={currentReport}
              template={template}
              onSaveDraft={handleSaveDraft}
              onFinalize={handleFinalizeReport}
              disabled={currentReport.status === 'final'}
            />
          ) : (
            <Box textAlign="center" py={4}>
              <Typography variant="h6" color="text.secondary">
                No report template selected
              </Typography>
              <Button
                variant="contained"
                onClick={() => setShowTemplateSelector(true)}
                sx={{ mt: 2 }}
              >
                Select Template
              </Button>
            </Box>
          )}
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <ReportHistory
            studyInstanceUID={studyInstanceUID}
            patientId={patientId}
            onCompareWithCurrent={handleCompareWithPrior}
          />
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          {comparisonData ? (
            <ReportComparisonComponent comparison={comparisonData} />
          ) : (
            <Box textAlign="center" py={4}>
              <Typography variant="h6" color="text.secondary">
                No comparison selected
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Select a prior report from the History tab to compare
              </Typography>
            </Box>
          )}
        </TabPanel>
      </Paper>

      {/* Template Selector Dialog */}
      <Dialog
        open={showTemplateSelector}
        onClose={() => setShowTemplateSelector(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Select Report Template</DialogTitle>
        <DialogContent>
          <TemplateSelector
            studyInstanceUID={studyInstanceUID}
            onTemplateSelected={handleTemplateSelected}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowTemplateSelector(false)}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      {/* Comparison Dialog */}
      <Dialog
        open={showComparison}
        onClose={() => setShowComparison(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>Report Comparison</DialogTitle>
        <DialogContent>
          {comparisonData && (
            <ReportComparisonComponent comparison={comparisonData} />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowComparison(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}