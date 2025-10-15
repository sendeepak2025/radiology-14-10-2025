/**
 * Export Service
 * Handles exporting studies and reports in various formats
 */

interface Study {
  studyInstanceUID: string;
  patientName: string;
  patientID?: string;
  studyDate: string;
  modality: string;
  studyDescription?: string;
  numberOfInstances?: number;
}

interface Report {
  reportId: string;
  studyInstanceUID: string;
  content: string;
  findings?: string;
  impression?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

class ExportService {
  /**
   * Export studies list to CSV
   */
  exportStudiesToCSV(studies: Study[]): void {
    const headers = ['Patient Name', 'Patient ID', 'Study Date', 'Modality', 'Description', 'Images', 'Study UID'];
    
    const rows = studies.map(study => [
      study.patientName || 'Unknown',
      study.patientID || 'N/A',
      this.formatStudyDate(study.studyDate),
      study.modality,
      study.studyDescription || 'No description',
      study.numberOfInstances?.toString() || '0',
      study.studyInstanceUID,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    this.downloadFile(csvContent, `studies_export_${Date.now()}.csv`, 'text/csv');
  }

  /**
   * Export report to PDF (text-based PDF)
   */
  async exportReportToPDF(report: Report, studyInfo?: any): Promise<void> {
    // For a more complete PDF solution, you would use a library like jsPDF or pdfmake
    // This is a simplified version that creates a text representation
    
    const content = this.generateReportHTML(report, studyInfo);
    
    // Create a blob and trigger download
    // In production, this should use a proper PDF library
    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `report_${report.reportId}_${Date.now()}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Export report to JSON
   */
  exportReportToJSON(report: Report): void {
    const jsonContent = JSON.stringify(report, null, 2);
    this.downloadFile(jsonContent, `report_${report.reportId}_${Date.now()}.json`, 'application/json');
  }

  /**
   * Export report to TXT
   */
  exportReportToTXT(report: Report, studyInfo?: any): void {
    let content = '';
    
    if (studyInfo) {
      content += `Patient: ${studyInfo.patientName || 'Unknown'}\n`;
      content += `Patient ID: ${studyInfo.patientID || 'N/A'}\n`;
      content += `Study Date: ${this.formatStudyDate(studyInfo.studyDate)}\n`;
      content += `Modality: ${studyInfo.modality || 'N/A'}\n`;
      content += `Study Description: ${studyInfo.studyDescription || 'N/A'}\n`;
      content += '\n' + '='.repeat(80) + '\n\n';
    }
    
    content += `REPORT\n`;
    content += `Report ID: ${report.reportId}\n`;
    content += `Status: ${report.status.toUpperCase()}\n`;
    content += `Created: ${new Date(report.createdAt).toLocaleString()}\n`;
    content += `Updated: ${new Date(report.updatedAt).toLocaleString()}\n\n`;
    
    content += '='.repeat(80) + '\n\n';
    content += `CONTENT:\n\n${report.content}\n\n`;
    
    if (report.findings) {
      content += '='.repeat(80) + '\n\n';
      content += `KEY FINDINGS:\n\n${report.findings}\n\n`;
    }
    
    if (report.impression) {
      content += '='.repeat(80) + '\n\n';
      content += `IMPRESSION:\n\n${report.impression}\n\n`;
    }
    
    this.downloadFile(content, `report_${report.reportId}_${Date.now()}.txt`, 'text/plain');
  }

  /**
   * Export multiple studies metadata to JSON
   */
  exportStudiesToJSON(studies: Study[]): void {
    const jsonContent = JSON.stringify(studies, null, 2);
    this.downloadFile(jsonContent, `studies_export_${Date.now()}.json`, 'application/json');
  }

  /**
   * Generate HTML for report
   */
  private generateReportHTML(report: Report, studyInfo?: any): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Medical Report - ${report.reportId}</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      max-width: 800px;
      margin: 40px auto;
      padding: 20px;
      line-height: 1.6;
      color: #333;
    }
    .header {
      border-bottom: 3px solid #1976d2;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #1976d2;
      margin: 0 0 10px 0;
    }
    .info-section {
      background: #f5f5f5;
      padding: 15px;
      border-radius: 5px;
      margin-bottom: 20px;
    }
    .info-section h2 {
      margin-top: 0;
      color: #555;
      font-size: 1.2em;
    }
    .section {
      margin-bottom: 30px;
    }
    .section h3 {
      color: #1976d2;
      border-bottom: 2px solid #1976d2;
      padding-bottom: 5px;
    }
    .content {
      white-space: pre-wrap;
      background: #fafafa;
      padding: 15px;
      border-radius: 5px;
      border-left: 4px solid #1976d2;
    }
    .status {
      display: inline-block;
      padding: 5px 15px;
      border-radius: 20px;
      background: ${report.status === 'finalized' ? '#4caf50' : '#ff9800'};
      color: white;
      font-weight: bold;
      text-transform: uppercase;
    }
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      text-align: center;
      color: #777;
      font-size: 0.9em;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Medical Imaging Report</h1>
    <span class="status">${report.status}</span>
  </div>

  ${studyInfo ? `
  <div class="info-section">
    <h2>Patient Information</h2>
    <p><strong>Patient Name:</strong> ${studyInfo.patientName || 'Unknown'}</p>
    <p><strong>Patient ID:</strong> ${studyInfo.patientID || 'N/A'}</p>
    <p><strong>Study Date:</strong> ${this.formatStudyDate(studyInfo.studyDate)}</p>
    <p><strong>Modality:</strong> ${studyInfo.modality || 'N/A'}</p>
    <p><strong>Study Description:</strong> ${studyInfo.studyDescription || 'N/A'}</p>
  </div>
  ` : ''}

  <div class="info-section">
    <h2>Report Information</h2>
    <p><strong>Report ID:</strong> ${report.reportId}</p>
    <p><strong>Study UID:</strong> ${report.studyInstanceUID}</p>
    <p><strong>Created:</strong> ${new Date(report.createdAt).toLocaleString()}</p>
    <p><strong>Last Updated:</strong> ${new Date(report.updatedAt).toLocaleString()}</p>
  </div>

  <div class="section">
    <h3>Report Content</h3>
    <div class="content">${this.escapeHtml(report.content)}</div>
  </div>

  ${report.findings ? `
  <div class="section">
    <h3>Key Findings</h3>
    <div class="content">${this.escapeHtml(report.findings)}</div>
  </div>
  ` : ''}

  ${report.impression ? `
  <div class="section">
    <h3>Impression</h3>
    <div class="content">${this.escapeHtml(report.impression)}</div>
  </div>
  ` : ''}

  <div class="footer">
    <p>Generated on ${new Date().toLocaleString()}</p>
    <p>Medical Imaging Viewer - Professional Report</p>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Format study date from DICOM format (YYYYMMDD) to readable format
   */
  private formatStudyDate(dateString: string): string {
    if (!dateString || dateString.length !== 8) return dateString || 'N/A';
    
    const year = dateString.substring(0, 4);
    const month = dateString.substring(4, 6);
    const day = dateString.substring(6, 8);
    
    return `${month}/${day}/${year}`;
  }

  /**
   * Escape HTML special characters
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Download file helper
   */
  private downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }
}

export default new ExportService();
