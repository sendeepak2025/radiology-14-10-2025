import React, { useState } from 'react'
import {
  Box,
  Button,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  Divider,
  Alert,
  CircularProgress
} from '@mui/material'
import {
  GetApp as DownloadIcon,
  PictureAsPdf as PdfIcon,
  Description as WordIcon,
  ContentCopy as CopyIcon,
  Print as PrintIcon
} from '@mui/icons-material'

interface SimpleReportExportProps {
  reportData: any
  studyData: any
  measurements: any[]
  open: boolean
  onClose: () => void
}

const SimpleReportExport: React.FC<SimpleReportExportProps> = ({
  reportData,
  studyData,
  measurements,
  open,
  onClose
}) => {
  const [exporting, setExporting] = useState(false)
  const [exportStatus, setExportStatus] = useState<string | null>(null)

  // Generate comprehensive report text
  const generateReportText = () => {
    const currentDate = new Date().toLocaleDateString()
    const currentTime = new Date().toLocaleTimeString()
    
    let reportText = `STRUCTURED RADIOLOGY REPORT\n`
    reportText += `${'='.repeat(50)}\n\n`
    
    // Patient Information
    reportText += `PATIENT INFORMATION:\n`
    reportText += `Patient Name: ${studyData?.patientName || 'Unknown Patient'}\n`
    reportText += `Patient ID: ${studyData?.patientID || 'N/A'}\n`
    reportText += `Study Date: ${studyData?.studyDate || currentDate}\n`
    reportText += `Modality: ${studyData?.modality || 'Unknown'}\n`
    reportText += `Study Description: ${studyData?.studyDescription || 'Medical Imaging Study'}\n\n`
    
    // Clinical Indication
    reportText += `CLINICAL INDICATION:\n`
    reportText += `${studyData?.studyDescription || 'Diagnostic imaging evaluation'}\n\n`
    
    // Technique
    reportText += `TECHNIQUE:\n`
    const modality = studyData?.modality || 'Unknown'
    if (modality === 'XA') {
      reportText += `Digital angiography performed with contrast enhancement.\n`
      reportText += `Multiple projections obtained to evaluate vascular anatomy.\n\n`
    } else if (modality === 'CT') {
      reportText += `CT examination performed with IV contrast enhancement.\n`
      reportText += `Axial images reconstructed with standard algorithms.\n\n`
    } else {
      reportText += `Standard imaging technique utilized according to protocol.\n\n`
    }
    
    // Measurements
    if (measurements && measurements.length > 0) {
      reportText += `MEASUREMENTS:\n`
      measurements.forEach((measurement, index) => {
        reportText += `${index + 1}. ${measurement.type}: ${measurement.value} ${measurement.unit}`
        if (measurement.location) {
          reportText += ` (${measurement.location})`
        }
        reportText += `\n`
      })
      reportText += `\n`
    }
    
    // Findings
    reportText += `FINDINGS:\n`
    if (measurements && measurements.length > 0) {
      reportText += `Measurements as documented above.\n`
      
      // Add clinical interpretation based on measurements
      const hasLargeMeasurements = measurements.some(m => m.value > 5)
      if (hasLargeMeasurements) {
        reportText += `Some measurements suggest possible abnormality.\n`
      } else {
        reportText += `Measurements within expected range.\n`
      }
    } else {
      reportText += `No significant abnormalities identified.\n`
      reportText += `Normal anatomical structures visualized.\n`
    }
    reportText += `\n`
    
    // Impression
    reportText += `IMPRESSION:\n`
    if (measurements && measurements.some(m => m.value > 5)) {
      reportText += `BORDERLINE STUDY - Measurements suggest possible abnormality.\n`
      reportText += `Clinical correlation and follow-up recommended.\n`
    } else {
      reportText += `NORMAL STUDY - No significant abnormalities identified.\n`
    }
    reportText += `\n`
    
    // Footer
    reportText += `${'='.repeat(50)}\n`
    reportText += `Report Generated: ${currentDate} ${currentTime}\n`
    reportText += `System: Advanced Medical Imaging Workstation\n`
    reportText += `Status: Electronically Signed\n`
    
    return reportText
  }

  // Export as text file
  const exportAsText = async () => {
    try {
      setExporting(true)
      const reportText = generateReportText()
      
      const blob = new Blob([reportText], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `RadiologyReport_${studyData?.patientName?.replace(/[^a-zA-Z0-9]/g, '_') || 'Patient'}_${new Date().toISOString().split('T')[0]}.txt`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      setExportStatus('Text file downloaded successfully!')
      setTimeout(() => setExportStatus(null), 3000)
      
    } catch (error) {
      console.error('Export error:', error)
      setExportStatus('Export failed. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  // Export as HTML file (opens as PDF in browser)
  const exportAsHTML = async () => {
    try {
      setExporting(true)
      const reportText = generateReportText()
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Radiology Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
            h1 { color: #333; text-align: center; border-bottom: 3px solid #333; padding-bottom: 10px; }
            .header { text-align: center; margin-bottom: 30px; background: #f5f5f5; padding: 20px; }
            .section { margin-bottom: 20px; }
            .measurements { background: #f9f9f9; padding: 15px; border-left: 4px solid #007bff; }
            pre { white-space: pre-wrap; font-family: Arial, sans-serif; }
            @media print {
              body { margin: 20px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>RADIOLOGY REPORT</h1>
            <p><strong>Advanced Medical Imaging Workstation</strong></p>
          </div>
          <pre>${reportText}</pre>
          <div class="no-print" style="margin-top: 30px; text-align: center;">
            <button onclick="window.print()" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">Print Report</button>
          </div>
        </body>
        </html>
      `
      
      const blob = new Blob([htmlContent], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `RadiologyReport_${studyData?.patientName?.replace(/[^a-zA-Z0-9]/g, '_') || 'Patient'}_${new Date().toISOString().split('T')[0]}.html`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      setExportStatus('HTML report downloaded successfully!')
      setTimeout(() => setExportStatus(null), 3000)
      
    } catch (error) {
      console.error('HTML export error:', error)
      setExportStatus('HTML export failed. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  // Copy to clipboard
  const copyToClipboard = async () => {
    try {
      setExporting(true)
      const reportText = generateReportText()
      await navigator.clipboard.writeText(reportText)
      
      setExportStatus('Report copied to clipboard!')
      setTimeout(() => setExportStatus(null), 3000)
      
    } catch (error) {
      console.error('Copy error:', error)
      setExportStatus('Copy failed. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  // Print report
  const printReport = () => {
    const reportText = generateReportText()
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(`
        <html>
        <head>
          <title>Radiology Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
            h1 { text-align: center; color: #333; }
            pre { white-space: pre-wrap; font-family: Arial, sans-serif; }
          </style>
        </head>
        <body>
          <h1>RADIOLOGY REPORT</h1>
          <pre>${reportText}</pre>
        </body>
        </html>
      `)
      printWindow.document.close()
      printWindow.focus()
      printWindow.print()
    }
  }

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: '#1a1a1a',
          color: '#fff'
        }
      }}
    >
      <DialogTitle sx={{ 
        bgcolor: '#2a2a2a', 
        color: '#64b5f6',
        display: 'flex',
        alignItems: 'center',
        gap: 1
      }}>
        <DownloadIcon />
        Export Medical Report
      </DialogTitle>
      
      <DialogContent sx={{ p: 3 }}>
        {exportStatus && (
          <Alert 
            severity={exportStatus.includes('failed') ? 'error' : 'success'} 
            sx={{ mb: 2 }}
          >
            {exportStatus}
          </Alert>
        )}
        
        <Typography variant="h6" sx={{ mb: 2, color: '#64b5f6' }}>
          Available Export Formats
        </Typography>
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          
          {/* HTML/PDF Export */}
          <Paper sx={{ p: 2, bgcolor: '#2a2a2a', border: '1px solid #444' }}>
            <Typography variant="subtitle1" sx={{ color: '#64b5f6', mb: 1 }}>
              📄 Professional HTML Report
            </Typography>
            <Typography variant="body2" sx={{ color: '#ccc', mb: 2 }}>
              Downloads as HTML file that can be printed as PDF from any browser
            </Typography>
            <Button
              variant="contained"
              startIcon={exporting ? <CircularProgress size={20} /> : <PdfIcon />}
              onClick={exportAsHTML}
              disabled={exporting}
              sx={{ 
                bgcolor: '#d32f2f', 
                '&:hover': { bgcolor: '#b71c1c' }
              }}
            >
              {exporting ? 'Generating...' : 'Export HTML/PDF'}
            </Button>
          </Paper>

          {/* Text Export */}
          <Paper sx={{ p: 2, bgcolor: '#2a2a2a', border: '1px solid #444' }}>
            <Typography variant="subtitle1" sx={{ color: '#64b5f6', mb: 1 }}>
              📝 Plain Text Report
            </Typography>
            <Typography variant="body2" sx={{ color: '#ccc', mb: 2 }}>
              Simple text format compatible with all systems
            </Typography>
            <Button
              variant="contained"
              startIcon={exporting ? <CircularProgress size={20} /> : <WordIcon />}
              onClick={exportAsText}
              disabled={exporting}
              sx={{ 
                bgcolor: '#1976d2', 
                '&:hover': { bgcolor: '#1565c0' }
              }}
            >
              {exporting ? 'Generating...' : 'Export Text File'}
            </Button>
          </Paper>

          {/* Copy to Clipboard */}
          <Paper sx={{ p: 2, bgcolor: '#2a2a2a', border: '1px solid #444' }}>
            <Typography variant="subtitle1" sx={{ color: '#64b5f6', mb: 1 }}>
              📋 Copy to Clipboard
            </Typography>
            <Typography variant="body2" sx={{ color: '#ccc', mb: 2 }}>
              Copy report text for pasting into other applications
            </Typography>
            <Button
              variant="contained"
              startIcon={exporting ? <CircularProgress size={20} /> : <CopyIcon />}
              onClick={copyToClipboard}
              disabled={exporting}
              sx={{ 
                bgcolor: '#388e3c', 
                '&:hover': { bgcolor: '#2e7d32' }
              }}
            >
              {exporting ? 'Copying...' : 'Copy to Clipboard'}
            </Button>
          </Paper>

          {/* Print */}
          <Paper sx={{ p: 2, bgcolor: '#2a2a2a', border: '1px solid #444' }}>
            <Typography variant="subtitle1" sx={{ color: '#64b5f6', mb: 1 }}>
              🖨️ Print Report
            </Typography>
            <Typography variant="body2" sx={{ color: '#ccc', mb: 2 }}>
              Send directly to printer or save as PDF
            </Typography>
            <Button
              variant="contained"
              startIcon={<PrintIcon />}
              onClick={printReport}
              sx={{ 
                bgcolor: '#7b1fa2', 
                '&:hover': { bgcolor: '#6a1b9a' }
              }}
            >
              Print Report
            </Button>
          </Paper>
          
        </Box>

        <Divider sx={{ my: 3, bgcolor: '#444' }} />
        
        <Typography variant="body2" sx={{ color: '#888', fontStyle: 'italic' }}>
          💡 Tip: The HTML export can be opened in any browser and printed as PDF using Ctrl+P
        </Typography>
      </DialogContent>
      
      <DialogActions sx={{ p: 2, bgcolor: '#2a2a2a' }}>
        <Button onClick={onClose} sx={{ color: '#64b5f6' }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default SimpleReportExport