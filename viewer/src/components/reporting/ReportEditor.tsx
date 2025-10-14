import React, { useState, useEffect } from 'react'
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material'
import {
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon
} from '@mui/icons-material'
import type {
  StructuredReport,
  ReportTemplate,
  ReportSection,
  ReportField,
  ReportSectionData,
  ReportFinding,
  ReportMeasurement
} from '@medical-imaging/shared-types'
import { FindingEditor } from './FindingEditor'
import { MeasurementEditor } from './MeasurementEditor'

interface ReportEditorProps {
  report: StructuredReport
  template: ReportTemplate
  onSaveDraft: (data: any) => void
  onFinalize: (data: any) => void
  disabled?: boolean
}

export const ReportEditor: React.FC<ReportEditorProps> = ({
  report,
  template,
  onSaveDraft,
  onFinalize,
  disabled = false
}) => {
  const [sectionData, setSectionData] = useState<Record<string, Record<string, any>>>({})
  const [findings, setFindings] = useState<ReportFinding[]>(report.findings || [])
  const [measurements, setMeasurements] = useState<ReportMeasurement[]>(report.measurements || [])
  const [impression, setImpression] = useState(report.impression || '')
  const [recommendations, setRecommendations] = useState<string[]>(report.recommendations || [])
  const [newRecommendation, setNewRecommendation] = useState('')
  const [showFindingEditor, setShowFindingEditor] = useState(false)
  const [showMeasurementEditor, setShowMeasurementEditor] = useState(false)
  const [editingFinding, setEditingFinding] = useState<ReportFinding | null>(null)
  const [editingMeasurement, setEditingMeasurement] = useState<ReportMeasurement | null>(null)

  useEffect(() => {
    // Initialize section data from existing report
    const initialData: Record<string, Record<string, any>> = {}
    
    report.sections.forEach(section => {
      initialData[section.sectionId] = section.fields
    })
    
    setSectionData(initialData)
  }, [report])

  const handleFieldChange = (sectionId: string, fieldId: string, value: any) => {
    setSectionData(prev => ({
      ...prev,
      [sectionId]: {
        ...prev[sectionId],
        [fieldId]: value
      }
    }))
  }

  const handleAddRecommendation = () => {
    if (newRecommendation.trim()) {
      setRecommendations(prev => [...prev, newRecommendation.trim()])
      setNewRecommendation('')
    }
  }

  const handleRemoveRecommendation = (index: number) => {
    setRecommendations(prev => prev.filter((_, i) => i !== index))
  }

  const handleAddFinding = () => {
    setEditingFinding(null)
    setShowFindingEditor(true)
  }

  const handleEditFinding = (finding: ReportFinding) => {
    setEditingFinding(finding)
    setShowFindingEditor(true)
  }

  const handleSaveFinding = (finding: ReportFinding) => {
    if (editingFinding) {
      setFindings(prev => prev.map(f => f.id === finding.id ? finding : f))
    } else {
      setFindings(prev => [...prev, { ...finding, id: Date.now().toString() }])
    }
    setShowFindingEditor(false)
    setEditingFinding(null)
  }

  const handleDeleteFinding = (findingId: string) => {
    setFindings(prev => prev.filter(f => f.id !== findingId))
  }

  const handleAddMeasurement = () => {
    setEditingMeasurement(null)
    setShowMeasurementEditor(true)
  }

  const handleEditMeasurement = (measurement: ReportMeasurement) => {
    setEditingMeasurement(measurement)
    setShowMeasurementEditor(true)
  }

  const handleSaveMeasurement = (measurement: ReportMeasurement) => {
    if (editingMeasurement) {
      setMeasurements(prev => prev.map(m => m.id === measurement.id ? measurement : m))
    } else {
      setMeasurements(prev => [...prev, { ...measurement, id: Date.now().toString() }])
    }
    setShowMeasurementEditor(false)
    setEditingMeasurement(null)
  }

  const handleDeleteMeasurement = (measurementId: string) => {
    setMeasurements(prev => prev.filter(m => m.id !== measurementId))
  }

  const getReportData = () => {
    const sections: ReportSectionData[] = Object.entries(sectionData).map(([sectionId, fields]) => ({
      sectionId,
      fields
    }))

    return {
      sections,
      findings,
      measurements,
      impression,
      recommendations
    }
  }

  const handleSaveDraft = () => {
    onSaveDraft(getReportData())
  }

  const handleFinalize = () => {
    onFinalize(getReportData())
  }

  const renderField = (section: ReportSection, field: ReportField) => {
    const value = sectionData[section.id]?.[field.id] || field.defaultValue || ''

    switch (field.type) {
      case 'text':
        return (
          <TextField
            fullWidth
            label={field.label}
            value={value}
            onChange={(e) => handleFieldChange(section.id, field.id, e.target.value)}
            required={field.required}
            disabled={disabled}
            helperText={field.helpText}
            size="small"
          />
        )

      case 'textarea':
        return (
          <TextField
            fullWidth
            multiline
            rows={4}
            label={field.label}
            value={value}
            onChange={(e) => handleFieldChange(section.id, field.id, e.target.value)}
            required={field.required}
            disabled={disabled}
            helperText={field.helpText}
          />
        )

      case 'select':
        return (
          <FormControl fullWidth size="small">
            <InputLabel>{field.label}</InputLabel>
            <Select
              value={value}
              label={field.label}
              onChange={(e) => handleFieldChange(section.id, field.id, e.target.value)}
              required={field.required}
              disabled={disabled}
            >
              {field.options?.map(option => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )

      case 'multiselect':
        return (
          <FormControl fullWidth size="small">
            <InputLabel>{field.label}</InputLabel>
            <Select
              multiple
              value={Array.isArray(value) ? value : []}
              label={field.label}
              onChange={(e) => handleFieldChange(section.id, field.id, e.target.value)}
              required={field.required}
              disabled={disabled}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {(selected as string[]).map((val) => (
                    <Chip key={val} label={val} size="small" />
                  ))}
                </Box>
              )}
            >
              {field.options?.map(option => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )

      case 'checkbox':
        return (
          <FormGroup>
            {field.options?.map(option => (
              <FormControlLabel
                key={option.value}
                control={
                  <Checkbox
                    checked={Array.isArray(value) ? value.includes(option.value) : false}
                    onChange={(e) => {
                      const currentValues = Array.isArray(value) ? value : []
                      const newValues = e.target.checked
                        ? [...currentValues, option.value]
                        : currentValues.filter(v => v !== option.value)
                      handleFieldChange(section.id, field.id, newValues)
                    }}
                    disabled={disabled}
                  />
                }
                label={option.label}
              />
            ))}
          </FormGroup>
        )

      case 'number':
        return (
          <TextField
            fullWidth
            type="number"
            label={field.label}
            value={value}
            onChange={(e) => handleFieldChange(section.id, field.id, parseFloat(e.target.value) || 0)}
            required={field.required}
            disabled={disabled}
            helperText={field.helpText}
            size="small"
          />
        )

      case 'date':
        return (
          <TextField
            fullWidth
            type="date"
            label={field.label}
            value={value}
            onChange={(e) => handleFieldChange(section.id, field.id, e.target.value)}
            required={field.required}
            disabled={disabled}
            InputLabelProps={{ shrink: true }}
            size="small"
          />
        )

      default:
        return (
          <TextField
            fullWidth
            label={field.label}
            value={value}
            onChange={(e) => handleFieldChange(section.id, field.id, e.target.value)}
            required={field.required}
            disabled={disabled}
            helperText={field.helpText}
            size="small"
          />
        )
    }
  }

  return (
    <Box sx={{ maxHeight: '70vh', overflow: 'auto' }}>
      {/* Template Sections */}
      {template.sections
        .sort((a, b) => a.order - b.order)
        .map((section) => (
          <Accordion key={section.id} defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">
                {section.title}
                {section.required && <span style={{ color: 'red' }}> *</span>}
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                {section.fields
                  .sort((a, b) => a.order - b.order)
                  .map((field) => (
                    <Grid item xs={12} md={6} key={field.id}>
                      {renderField(section, field)}
                    </Grid>
                  ))}
              </Grid>
            </AccordionDetails>
          </Accordion>
        ))}

      {/* Findings Section */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Findings</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="subtitle1">Clinical Findings</Typography>
            <Button
              startIcon={<AddIcon />}
              onClick={handleAddFinding}
              disabled={disabled}
              variant="outlined"
              size="small"
            >
              Add Finding
            </Button>
          </Box>
          
          {findings.map((finding) => (
            <Paper key={finding.id} sx={{ p: 2, mb: 1 }}>
              <Box display="flex" justifyContent="space-between" alignItems="start">
                <Box flex={1}>
                  <Typography variant="subtitle2">{finding.type}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {finding.description}
                  </Typography>
                  {finding.severity && (
                    <Chip
                      label={finding.severity}
                      size="small"
                      color={finding.severity === 'critical' ? 'error' : 'default'}
                      sx={{ mt: 1 }}
                    />
                  )}
                </Box>
                <Box>
                  <IconButton
                    size="small"
                    onClick={() => handleEditFinding(finding)}
                    disabled={disabled}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDeleteFinding(finding.id)}
                    disabled={disabled}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </Box>
            </Paper>
          ))}
        </AccordionDetails>
      </Accordion>

      {/* Measurements Section */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Measurements</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="subtitle1">Quantitative Measurements</Typography>
            <Button
              startIcon={<AddIcon />}
              onClick={handleAddMeasurement}
              disabled={disabled}
              variant="outlined"
              size="small"
            >
              Add Measurement
            </Button>
          </Box>
          
          {measurements.map((measurement) => (
            <Paper key={measurement.id} sx={{ p: 2, mb: 1 }}>
              <Box display="flex" justifyContent="space-between" alignItems="start">
                <Box flex={1}>
                  <Typography variant="subtitle2">{measurement.name}</Typography>
                  <Typography variant="body2">
                    {measurement.value} {measurement.unit}
                  </Typography>
                  {measurement.normalRange && (
                    <Typography variant="caption" color="text.secondary">
                      Normal: {measurement.normalRange.min}-{measurement.normalRange.max} {measurement.unit}
                    </Typography>
                  )}
                </Box>
                <Box>
                  <IconButton
                    size="small"
                    onClick={() => handleEditMeasurement(measurement)}
                    disabled={disabled}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDeleteMeasurement(measurement.id)}
                    disabled={disabled}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </Box>
            </Paper>
          ))}
        </AccordionDetails>
      </Accordion>

      {/* Impression Section */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Impression</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Clinical Impression"
            value={impression}
            onChange={(e) => setImpression(e.target.value)}
            disabled={disabled}
            placeholder="Enter your clinical impression and diagnosis..."
          />
        </AccordionDetails>
      </Accordion>

      {/* Recommendations Section */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Recommendations</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box mb={2}>
            <Box display="flex" gap={1} mb={2}>
              <TextField
                fullWidth
                label="Add Recommendation"
                value={newRecommendation}
                onChange={(e) => setNewRecommendation(e.target.value)}
                disabled={disabled}
                size="small"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAddRecommendation()
                  }
                }}
              />
              <Button
                onClick={handleAddRecommendation}
                disabled={disabled || !newRecommendation.trim()}
                variant="outlined"
              >
                Add
              </Button>
            </Box>
            
            {recommendations.map((rec, index) => (
              <Paper key={index} sx={{ p: 1, mb: 1, display: 'flex', alignItems: 'center' }}>
                <Typography flex={1}>{rec}</Typography>
                <IconButton
                  size="small"
                  onClick={() => handleRemoveRecommendation(index)}
                  disabled={disabled}
                >
                  <DeleteIcon />
                </IconButton>
              </Paper>
            ))}
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Action Buttons */}
      <Box display="flex" justifyContent="flex-end" gap={2} mt={3} p={2}>
        <Button
          variant="outlined"
          onClick={handleSaveDraft}
          disabled={disabled}
        >
          Save Draft
        </Button>
        <Button
          variant="contained"
          onClick={handleFinalize}
          disabled={disabled}
          color="primary"
        >
          Finalize Report
        </Button>
      </Box>

      {/* Finding Editor Dialog */}
      <Dialog
        open={showFindingEditor}
        onClose={() => setShowFindingEditor(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingFinding ? 'Edit Finding' : 'Add Finding'}
        </DialogTitle>
        <DialogContent>
          <FindingEditor
            finding={editingFinding}
            onSave={handleSaveFinding}
            onCancel={() => setShowFindingEditor(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Measurement Editor Dialog */}
      <Dialog
        open={showMeasurementEditor}
        onClose={() => setShowMeasurementEditor(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingMeasurement ? 'Edit Measurement' : 'Add Measurement'}
        </DialogTitle>
        <DialogContent>
          <MeasurementEditor
            measurement={editingMeasurement}
            onSave={handleSaveMeasurement}
            onCancel={() => setShowMeasurementEditor(false)}
          />
        </DialogContent>
      </Dialog>
    </Box>
  )
}