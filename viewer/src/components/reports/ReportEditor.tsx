import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Divider,
  Chip,
  Stack,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Save as SaveIcon,
  Send as SendIcon,
  Preview as PreviewIcon,
  Close as CloseIcon,
  Draw as DrawIcon,
} from '@mui/icons-material';

import reportService, { ReportTemplate, Report } from '../../services/reportService';
import SignatureCapture from './SignatureCapture';

interface ReportEditorProps {
  studyInstanceUID: string;
  studyInfo?: {
    patientName?: string;
    patientID?: string;
    studyDate?: string;
    modality?: string;
    studyDescription?: string;
  };
  existingReport?: Report;
  onSave?: (report: Report) => void;
  onClose?: () => void;
}

/**
 * Report Editor Component
 * Full-featured report editor with template support
 */
const ReportEditor: React.FC<ReportEditorProps> = ({
  studyInstanceUID,
  studyInfo,
  existingReport,
  onSave,
  onClose,
}) => {
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [reportContent, setReportContent] = useState('');
  const [findings, setFindings] = useState('');
  const [impression, setImpression] = useState('');
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [previewOpen, setPreviewOpen] = useState(false);
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);
  const [reportSignature, setReportSignature] = useState<string | null>(null);
  const [currentReport, setCurrentReport] = useState<Report | null>(existingReport || null);

  // Load templates on mount
  useEffect(() => {
    loadTemplates();
    
    // If editing existing report, load it
    if (existingReport) {
      setReportContent(existingReport.content);
      setFindings(existingReport.findings || '');
      setImpression(existingReport.impression || '');
    }
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const response = await reportService.getTemplates({
        modality: studyInfo?.modality,
      });
      setTemplates(response.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSelect = async (templateId: string) => {
    try {
      const response = await reportService.getTemplate(templateId);
      const template = response.data;
      setSelectedTemplate(template);
      
      // Initialize variable values with defaults
      const initialValues: Record<string, string> = {};
      template.variables?.forEach((variable) => {
        initialValues[variable.name] = variable.defaultValue || '';
      });
      setVariableValues(initialValues);
      
      // Generate initial content
      const content = reportService.replaceTemplateVariables(template.template, initialValues);
      setReportContent(content);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleVariableChange = (variableName: string, value: string) => {
    const newValues = {
      ...variableValues,
      [variableName]: value,
    };
    setVariableValues(newValues);
    
    // Update content with new values
    if (selectedTemplate) {
      const content = reportService.replaceTemplateVariables(
        selectedTemplate.template,
        newValues
      );
      setReportContent(content);
    }
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    setError(null);
    
    try {
      let report: Report;
      
      if (currentReport) {
        // Update existing report
        const response = await reportService.updateReport(currentReport.reportId, {
          content: reportContent,
          findings,
          impression,
        });
        report = response.data;
      } else {
        // Create new report
        const response = await reportService.createReport({
          studyInstanceUID,
          templateId: selectedTemplate?.templateId,
          content: reportContent,
          findings,
          impression,
        });
        report = response.data;
        setCurrentReport(report);
      }
      
      setSuccess('Report saved successfully');
      if (onSave) onSave(report);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleFinalize = async () => {
    if (!currentReport) {
      setError('Please save the report first');
      return;
    }
    
    // Check if signature is required
    if (!reportSignature) {
      setError('Please sign the report before finalizing');
      setSignatureDialogOpen(true);
      return;
    }
    
    setSaving(true);
    try {
      const response = await reportService.finalizeReport(currentReport.reportId);
      setCurrentReport(response.data);
      setSuccess('Report finalized successfully');
      if (onSave) onSave(response.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSignatureSave = (signatureData: string) => {
    setReportSignature(signatureData);
    setSuccess('Signature captured successfully');
    setTimeout(() => setSuccess(null), 3000);
  };

  const isFinalized = currentReport?.status === 'finalized';

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6">Report Editor</Typography>
            {studyInfo && (
              <Typography variant="caption" color="text.secondary">
                {studyInfo.patientName} | {studyInfo.modality} | {studyInfo.studyDate}
              </Typography>
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {currentReport && (
              <Chip
                label={currentReport.status.replace('_', ' ').toUpperCase()}
                color={currentReport.status === 'finalized' ? 'success' : 'default'}
                size="small"
              />
            )}
            {onClose && (
              <Button startIcon={<CloseIcon />} onClick={onClose}>
                Close
              </Button>
            )}
          </Box>
        </Box>
      </Paper>

      {/* Status Messages */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Template Selection */}
      {!existingReport && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Select Template</InputLabel>
            <Select
              value={selectedTemplate?.templateId || ''}
              onChange={(e) => handleTemplateSelect(e.target.value)}
              label="Select Template"
              disabled={loading || isFinalized}
            >
              <MenuItem value="">
                <em>Start from scratch</em>
              </MenuItem>
              {templates.map((template) => (
                <MenuItem key={template.templateId} value={template.templateId}>
                  {template.name} - {template.modality?.join(', ')}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Paper>
      )}

      {/* Variable Inputs */}
      {selectedTemplate && selectedTemplate.variables && selectedTemplate.variables.length > 0 && (
        <Paper sx={{ p: 2, mb: 2, maxHeight: 200, overflow: 'auto' }}>
          <Typography variant="subtitle2" gutterBottom>
            Template Variables
          </Typography>
          <Grid container spacing={2}>
            {selectedTemplate.variables.map((variable) => (
              <Grid item xs={12} sm={6} key={variable.name}>
                {variable.type === 'select' && variable.options ? (
                  <FormControl fullWidth size="small">
                    <InputLabel>{variable.label}</InputLabel>
                    <Select
                      value={variableValues[variable.name] || ''}
                      onChange={(e) => handleVariableChange(variable.name, e.target.value)}
                      label={variable.label}
                      disabled={isFinalized}
                    >
                      {variable.options.map((option) => (
                        <MenuItem key={option} value={option}>
                          {option}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                ) : (
                  <TextField
                    fullWidth
                    size="small"
                    label={variable.label}
                    value={variableValues[variable.name] || ''}
                    onChange={(e) => handleVariableChange(variable.name, e.target.value)}
                    required={variable.required}
                    multiline={variable.type === 'text' && variable.name.includes('Findings')}
                    rows={variable.name.includes('Findings') ? 2 : 1}
                    disabled={isFinalized}
                  />
                )}
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}

      {/* Editor */}
      <Paper sx={{ p: 2, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
        <Typography variant="subtitle2" gutterBottom>
          Report Content
        </Typography>
        <TextField
          fullWidth
          multiline
          rows={15}
          value={reportContent}
          onChange={(e) => setReportContent(e.target.value)}
          placeholder="Enter report content..."
          variant="outlined"
          disabled={isFinalized}
          sx={{
            '& .MuiInputBase-root': {
              fontFamily: 'monospace',
              fontSize: '0.9rem',
            },
          }}
        />

        <Divider sx={{ my: 2 }} />

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Key Findings"
              multiline
              rows={4}
              value={findings}
              onChange={(e) => setFindings(e.target.value)}
              disabled={isFinalized}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Impression"
              multiline
              rows={4}
              value={impression}
              onChange={(e) => setImpression(e.target.value)}
              disabled={isFinalized}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Actions */}
      <Paper sx={{ p: 2, mt: 2 }}>
        <Stack direction="row" spacing={2} justifyContent="space-between" alignItems="center">
          <Box>
            {reportSignature && (
              <Chip
                icon={<DrawIcon />}
                label="Signed"
                color="success"
                size="small"
                onClick={() => setSignatureDialogOpen(true)}
              />
            )}
          </Box>
          <Stack direction="row" spacing={2}>
            <Button
              startIcon={<PreviewIcon />}
              onClick={() => setPreviewOpen(true)}
              disabled={!reportContent}
            >
              Preview
            </Button>
            <Button
              variant="outlined"
              startIcon={<DrawIcon />}
              onClick={() => setSignatureDialogOpen(true)}
              disabled={isFinalized}
              color={reportSignature ? 'success' : 'primary'}
            >
              {reportSignature ? 'Update Signature' : 'Sign Report'}
            </Button>
            <Button
              variant="outlined"
              startIcon={<SaveIcon />}
              onClick={handleSaveDraft}
              disabled={saving || isFinalized || !reportContent}
            >
              {saving ? <CircularProgress size={20} /> : 'Save Draft'}
            </Button>
            <Button
              variant="contained"
              startIcon={<SendIcon />}
              onClick={handleFinalize}
              disabled={saving || isFinalized || !currentReport || !reportSignature}
            >
              Finalize Report
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {/* Preview Dialog */}
      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Report Preview</DialogTitle>
        <DialogContent>
          <Box
            sx={{
              whiteSpace: 'pre-wrap',
              fontFamily: 'monospace',
              fontSize: '0.9rem',
              p: 2,
              backgroundColor: 'grey.50',
              borderRadius: 1,
            }}
          >
            {reportContent}
            {findings && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2">KEY FINDINGS:</Typography>
                <Typography>{findings}</Typography>
              </>
            )}
            {impression && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2">IMPRESSION:</Typography>
                <Typography>{impression}</Typography>
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ReportEditor;
