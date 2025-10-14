import { jsPDF } from 'jspdf'

export interface ExportOptions {
  format: 'pdf' | 'docx' | 'dicom-sr' | 'hl7' | 'txt'
  includeImages: boolean
  includeMetadata: boolean
  includeMeasurements: boolean
  headerInfo?: {
    institutionName?: string
    departmentName?: string
    radiologist?: string
    physicianName?: string
  }
}

export interface ReportData {
  studyInfo: {
    patientName: string
    patientID: string
    studyDate: string
    studyTime?: string
    modality: string
    studyDescription: string
    studyInstanceUID: string
  }
  sections: {
    [key: string]: string
  }
  findings: Array<{
    id: string
    category: string
    location: string
    description: string
    severity: string
    measurements?: string[]
  }>
  measurements: Array<{
    id: string
    type: string
    value: number
    unit: string
    location?: string
    frameIndex: number
  }>
  reportStatus: string
  timestamp: string
  radiologist?: string
}

class ReportExportService {
  private static instance: ReportExportService
  
  public static getInstance(): ReportExportService {
    if (!ReportExportService.instance) {
      ReportExportService.instance = new ReportExportService()
    }
    return ReportExportService.instance
  }

  /**
   * Export report to PDF format
   */
  public async exportToPDF(reportData: ReportData, options: ExportOptions = { format: 'pdf', includeImages: false, includeMetadata: true, includeMeasurements: true }): Promise<void> {
    try {
      const doc = new jsPDF()
      let yPosition = 20
      const pageWidth = doc.internal.pageSize.getWidth()
      const margin = 20

      // Header
      if (options.headerInfo?.institutionName) {
        doc.setFontSize(16)
        doc.setFont('helvetica', 'bold')
        doc.text(options.headerInfo.institutionName, pageWidth / 2, yPosition, { align: 'center' })
        yPosition += 10
        
        if (options.headerInfo.departmentName) {
          doc.setFontSize(12)
          doc.setFont('helvetica', 'normal')
          doc.text(options.headerInfo.departmentName, pageWidth / 2, yPosition, { align: 'center' })
          yPosition += 15
        }
      }

      // Title
      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      doc.text('RADIOLOGY REPORT', pageWidth / 2, yPosition, { align: 'center' })
      yPosition += 20

      // Patient Information
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('PATIENT INFORMATION', margin, yPosition)
      yPosition += 8

      doc.setFont('helvetica', 'normal')
      doc.text(`Patient Name: ${reportData.studyInfo.patientName}`, margin, yPosition)
      yPosition += 6
      doc.text(`Patient ID: ${reportData.studyInfo.patientID}`, margin, yPosition)
      yPosition += 6
      doc.text(`Study Date: ${this.formatDate(reportData.studyInfo.studyDate)}`, margin, yPosition)
      yPosition += 6
      doc.text(`Modality: ${reportData.studyInfo.modality}`, margin, yPosition)
      yPosition += 6
      doc.text(`Study Description: ${reportData.studyInfo.studyDescription}`, margin, yPosition)
      yPosition += 15

      // Report Sections
      Object.entries(reportData.sections).forEach(([sectionId, content]) => {
        if (content && content.trim()) {
          // Check if we need a new page
          if (yPosition > 250) {
            doc.addPage()
            yPosition = 20
          }

          doc.setFont('helvetica', 'bold')
          doc.text(this.formatSectionTitle(sectionId), margin, yPosition)
          yPosition += 8

          doc.setFont('helvetica', 'normal')
          const lines = doc.splitTextToSize(content, pageWidth - 2 * margin)
          lines.forEach((line: string) => {
            if (yPosition > 270) {
              doc.addPage()
              yPosition = 20
            }
            doc.text(line, margin, yPosition)
            yPosition += 6
          })
          yPosition += 8
        }
      })

      // Measurements (if included)
      if (options.includeMeasurements && reportData.measurements.length > 0) {
        if (yPosition > 200) {
          doc.addPage()
          yPosition = 20
        }

        doc.setFont('helvetica', 'bold')
        doc.text('MEASUREMENTS', margin, yPosition)
        yPosition += 8

        doc.setFont('helvetica', 'normal')
        reportData.measurements.forEach(measurement => {
          if (yPosition > 270) {
            doc.addPage()
            yPosition = 20
          }
          doc.text(`• ${measurement.type}: ${measurement.value} ${measurement.unit} (${measurement.location || 'Frame ' + measurement.frameIndex})`, margin, yPosition)
          yPosition += 6
        })
        yPosition += 10
      }

      // Findings
      if (reportData.findings.length > 0) {
        if (yPosition > 200) {
          doc.addPage()
          yPosition = 20
        }

        doc.setFont('helvetica', 'bold')
        doc.text('DETAILED FINDINGS', margin, yPosition)
        yPosition += 8

        doc.setFont('helvetica', 'normal')
        reportData.findings.forEach((finding, index) => {
          if (yPosition > 260) {
            doc.addPage()
            yPosition = 20
          }
          doc.text(`${index + 1}. ${finding.location} - ${finding.description}`, margin, yPosition)
          doc.text(`   Category: ${finding.category}, Severity: ${finding.severity}`, margin + 10, yPosition + 6)
          yPosition += 15
        })
      }

      // Footer
      doc.setFontSize(10)
      doc.setFont('helvetica', 'italic')
      doc.text(`Report generated: ${new Date(reportData.timestamp).toLocaleString()}`, margin, doc.internal.pageSize.getHeight() - 10)
      doc.text(`Status: ${reportData.reportStatus.toUpperCase()}`, pageWidth - margin - 50, doc.internal.pageSize.getHeight() - 10)

      if (options.headerInfo?.radiologist) {
        doc.text(`Radiologist: ${options.headerInfo.radiologist}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' })
      }

      // Save the PDF
      const fileName = `RadiologyReport_${reportData.studyInfo.patientName.replace(/[^a-zA-Z0-9]/g, '_')}_${reportData.studyInfo.studyDate}.pdf`
      doc.save(fileName)
      
    } catch (error) {
      console.error('Error exporting to PDF:', error)
      throw new Error('Failed to export report to PDF')
    }
  }

  /**
   * Export report to plain text
   */
  public async exportToText(reportData: ReportData): Promise<string> {
    let reportText = ''
    
    // Header
    reportText += 'STRUCTURED RADIOLOGY REPORT\n'
    reportText += '='.repeat(50) + '\n\n'
    
    // Patient Info
    reportText += 'PATIENT INFORMATION:\n'
    reportText += `-`.repeat(20) + '\n'
    reportText += `Patient Name: ${reportData.studyInfo.patientName}\n`
    reportText += `Patient ID: ${reportData.studyInfo.patientID}\n`
    reportText += `Study Date: ${this.formatDate(reportData.studyInfo.studyDate)}\n`
    reportText += `Modality: ${reportData.studyInfo.modality}\n`
    reportText += `Study Description: ${reportData.studyInfo.studyDescription}\n\n`
    
    // Sections
    Object.entries(reportData.sections).forEach(([sectionId, content]) => {
      if (content && content.trim()) {
        reportText += `${this.formatSectionTitle(sectionId).toUpperCase()}:\n`
        reportText += content + '\n\n'
      }
    })
    
    // Measurements
    if (reportData.measurements.length > 0) {
      reportText += 'MEASUREMENTS:\n'
      reportText += '-'.repeat(12) + '\n'
      reportData.measurements.forEach(measurement => {
        reportText += `• ${measurement.type}: ${measurement.value} ${measurement.unit}`
        if (measurement.location) {
          reportText += ` (${measurement.location})`
        }
        reportText += `\n`
      })
      reportText += '\n'
    }
    
    // Findings
    if (reportData.findings.length > 0) {
      reportText += 'DETAILED FINDINGS:\n'
      reportText += '-'.repeat(17) + '\n'
      reportData.findings.forEach((finding, index) => {
        reportText += `${index + 1}. ${finding.location} - ${finding.description}\n`
        reportText += `   Category: ${finding.category}, Severity: ${finding.severity}\n`
      })
      reportText += '\n'
    }
    
    // Footer
    reportText += '-'.repeat(50) + '\n'
    reportText += `Report Status: ${reportData.reportStatus.toUpperCase()}\n`
    reportText += `Generated: ${new Date(reportData.timestamp).toLocaleString()}\n`
    
    return reportText
  }

  /**
   * Export report to DICOM Structured Report format
   */
  public async exportToDICOMSR(reportData: ReportData): Promise<string> {
    // Basic DICOM SR structure (simplified)
    const dicomSR = {
      studyInstanceUID: reportData.studyInfo.studyInstanceUID,
      seriesInstanceUID: this.generateUID(),
      sopInstanceUID: this.generateUID(),
      patientName: reportData.studyInfo.patientName,
      patientID: reportData.studyInfo.patientID,
      studyDate: reportData.studyInfo.studyDate,
      modality: 'SR',
      documentTitle: 'Radiology Report',
      completionFlag: reportData.reportStatus === 'final' ? 'COMPLETE' : 'PARTIAL',
      verificationFlag: reportData.reportStatus === 'final' ? 'VERIFIED' : 'UNVERIFIED',
      content: {
        sections: reportData.sections,
        findings: reportData.findings,
        measurements: reportData.measurements
      },
      timestamp: reportData.timestamp
    }
    
    // Convert to JSON string (in real implementation, this would be DICOM format)
    const fileName = `SR_${reportData.studyInfo.patientName.replace(/[^a-zA-Z0-9]/g, '_')}_${reportData.studyInfo.studyDate}.json`
    this.downloadAsFile(JSON.stringify(dicomSR, null, 2), fileName, 'application/json')
    
    return JSON.stringify(dicomSR)
  }

  /**
   * Export report to HL7 format
   */
  public async exportToHL7(reportData: ReportData): Promise<string> {
    const hl7Timestamp = new Date(reportData.timestamp).toISOString().replace(/[-:]/g, '').split('.')[0]
    const reportText = await this.exportToText(reportData)
    
    // Basic HL7 MDM message structure
    const hl7Message = [
      'MSH|^~\\&|RadiologyIS|HOSPITAL|RIS|HOSPITAL|' + hl7Timestamp + '||MDM^T02|' + Date.now() + '|P|2.5',
      'EVN|T02|' + hl7Timestamp,
      `PID|||${reportData.studyInfo.patientID}||${reportData.studyInfo.patientName.replace('^', '\\S\\')}`,
      'PV1|1|I|||||||||||||||||||||||||||||||||||||||||||||||||',
      'TXA|1|RA|TEXT|' + hl7Timestamp + '||||||||' + reportData.studyInfo.studyInstanceUID + '|',
      'OBX|1|TX|RAD_REPORT^Radiology Report^L||' + reportText.replace(/\n/g, '\\E\\') + '||||||F'
    ].join('\r')
    
    const fileName = `HL7_${reportData.studyInfo.patientName.replace(/[^a-zA-Z0-9]/g, '_')}_${reportData.studyInfo.studyDate}.hl7`
    this.downloadAsFile(hl7Message, fileName, 'text/plain')
    
    return hl7Message
  }

  /**
   * Download text content as file
   */
  private downloadAsFile(content: string, fileName: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  /**
   * Format section title for display
   */
  private formatSectionTitle(sectionId: string): string {
    return sectionId
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  /**
   * Format date for display
   */
  private formatDate(dateString: string): string {
    if (!dateString) return 'Unknown'
    
    // Handle DICOM date format (YYYYMMDD)
    if (dateString.length === 8 && /^\d+$/.test(dateString)) {
      const year = dateString.substring(0, 4)
      const month = dateString.substring(4, 6)
      const day = dateString.substring(6, 8)
      return `${month}/${day}/${year}`
    }
    
    return dateString
  }

  /**
   * Generate a simple UID for DICOM
   */
  private generateUID(): string {
    const timestamp = Date.now()
    const random = Math.floor(Math.random() * 10000)
    return `1.2.840.113619.2.5.${timestamp}.${random}`
  }

  /**
   * Copy report text to clipboard
   */
  public async copyToClipboard(reportData: ReportData): Promise<void> {
    try {
      const reportText = await this.exportToText(reportData)
      await navigator.clipboard.writeText(reportText)
    } catch (error) {
      console.error('Error copying to clipboard:', error)
      throw new Error('Failed to copy report to clipboard')
    }
  }

  /**
   * Print report
   */
  public async printReport(reportData: ReportData, options: ExportOptions = { format: 'pdf', includeImages: false, includeMetadata: true, includeMeasurements: true }): Promise<void> {
    try {
      const reportText = await this.exportToText(reportData)
      
      // Create a new window for printing
      const printWindow = window.open('', '_blank', 'width=800,height=600')
      if (!printWindow) {
        throw new Error('Unable to open print window')
      }
      
      printWindow.document.write(`
        <html>
          <head>
            <title>Radiology Report</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
              h1 { color: #333; border-bottom: 2px solid #333; }
              .header { text-align: center; margin-bottom: 30px; }
              .section { margin-bottom: 20px; }
              .measurements { background-color: #f5f5f5; padding: 10px; }
              @media print {
                body { margin: 0; }
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>RADIOLOGY REPORT</h1>
              ${options.headerInfo?.institutionName ? `<h2>${options.headerInfo.institutionName}</h2>` : ''}
              ${options.headerInfo?.departmentName ? `<h3>${options.headerInfo.departmentName}</h3>` : ''}
            </div>
            <pre style="white-space: pre-wrap; font-family: Arial, sans-serif;">${reportText}</pre>
            <div class="no-print" style="margin-top: 20px; text-align: center;">
              <button onclick="window.print()">Print Report</button>
              <button onclick="window.close()">Close</button>
            </div>
          </body>
        </html>
      `)
      
      printWindow.document.close()
      printWindow.focus()
      
    } catch (error) {
      console.error('Error printing report:', error)
      throw new Error('Failed to print report')
    }
  }
}

export default ReportExportService