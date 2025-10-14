import axios, { AxiosResponse } from 'axios'
import type {
  ReportTemplate,
  StructuredReport,
  ReportComparison,
  DICOMSRContent,
  ReportStatus,
  ReportPriority,
  ReportSectionData,
  ReportFinding,
  ReportMeasurement
} from '@medical-imaging/shared-types'

class ReportingService {
  private baseURL = '/api/reports'

  /**
   * Get available report templates
   */
  async getTemplates(params?: {
    modality?: string
    bodyPart?: string
    active?: boolean
  }): Promise<ReportTemplate[]> {
    try {
      const response: AxiosResponse<{ success: boolean; data: ReportTemplate[] }> = await axios.get(
        `${this.baseURL}/templates`,
        { params }
      )
      return response.data.data
    } catch (error) {
      console.error('Failed to fetch report templates:', error)
      return []
    }
  }

  /**
   * Get a specific report template
   */
  async getTemplate(templateId: string): Promise<ReportTemplate | null> {
    try {
      const response: AxiosResponse<{ success: boolean; data: ReportTemplate }> = await axios.get(
        `${this.baseURL}/templates/${templateId}`
      )
      return response.data.data
    } catch (error) {
      console.error('Failed to fetch report template:', error)
      return null
    }
  }

  /**
   * Create a new structured report
   */
  async createReport(data: {
    studyInstanceUID: string
    templateId: string
    priority?: ReportPriority
  }): Promise<StructuredReport> {
    const response: AxiosResponse<{ success: boolean; data: StructuredReport }> = await axios.post(
      `${this.baseURL}/reports`,
      data
    )
    return response.data.data
  }

  /**
   * Get a structured report
   */
  async getReport(reportId: string): Promise<StructuredReport | null> {
    try {
      const response: AxiosResponse<{ success: boolean; data: StructuredReport }> = await axios.get(
        `${this.baseURL}/reports/${reportId}`
      )
      return response.data.data
    } catch (error) {
      console.error('Failed to fetch report:', error)
      return null
    }
  }

  /**
   * Get reports for a study
   */
  async getReportsForStudy(studyInstanceUID: string): Promise<StructuredReport[]> {
    try {
      const response: AxiosResponse<{ success: boolean; data: StructuredReport[] }> = await axios.get(
        `${this.baseURL}/study/${studyInstanceUID}`
      )
      return response.data.data
    } catch (error) {
      console.error('Failed to fetch study reports:', error)
      return []
    }
  }

  /**
   * Update report content
   */
  async updateReport(reportId: string, data: {
    sections?: ReportSectionData[]
    findings?: ReportFinding[]
    measurements?: ReportMeasurement[]
    impression?: string
    recommendations?: string[]
    status?: ReportStatus
  }): Promise<StructuredReport> {
    const response: AxiosResponse<{ success: boolean; data: StructuredReport }> = await axios.put(
      `${this.baseURL}/reports/${reportId}`,
      data
    )
    return response.data.data
  }

  /**
   * Save report as draft
   */
  async saveDraft(reportId: string, data: {
    sections?: ReportSectionData[]
    findings?: ReportFinding[]
    measurements?: ReportMeasurement[]
    impression?: string
    recommendations?: string[]
  }): Promise<StructuredReport> {
    const response: AxiosResponse<{ success: boolean; data: StructuredReport }> = await axios.put(
      `${this.baseURL}/reports/${reportId}/draft`,
      data
    )
    return response.data.data
  }

  /**
   * Finalize report
   */
  async finalizeReport(reportId: string, data: {
    sections: ReportSectionData[]
    findings: ReportFinding[]
    measurements: ReportMeasurement[]
    impression: string
    recommendations: string[]
  }): Promise<{
    report: StructuredReport
    dicomSR: DICOMSRContent
    fhirReportId?: string
  }> {
    const response: AxiosResponse<{
      success: boolean;
      data: {
        report: StructuredReport
        dicomSR: DICOMSRContent
        fhirReportId?: string
      }
    }> = await axios.post(
      `${this.baseURL}/reports/${reportId}/finalize`,
      data
    )
    return response.data.data
  }

  /**
   * Submit report to EHR
   */
  async submitToEHR(reportId: string): Promise<{
    success: boolean
    fhirReportId?: string
    error?: string
  }> {
    try {
      const response: AxiosResponse<{
        success: boolean;
        data: {
          fhirReportId: string
        }
      }> = await axios.post(
        `${this.baseURL}/reports/${reportId}/submit-ehr`
      )
      return {
        success: true,
        fhirReportId: response.data.data.fhirReportId
      }
    } catch (error: any) {
      console.error('Failed to submit report to EHR:', error)
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to submit to EHR'
      }
    }
  }

  /**
   * Generate DICOM SR from report
   */
  async generateDICOMSR(reportId: string): Promise<DICOMSRContent> {
    const response: AxiosResponse<{ success: boolean; data: DICOMSRContent }> = await axios.post(
      `${this.baseURL}/reports/${reportId}/generate-sr`
    )
    return response.data.data
  }

  /**
   * Compare reports
   */
  async compareReports(currentReportId: string, priorReportId: string): Promise<ReportComparison> {
    const response: AxiosResponse<{ success: boolean; data: ReportComparison }> = await axios.post(
      `${this.baseURL}/reports/compare`,
      {
        currentReportId,
        priorReportId
      }
    )
    return response.data.data
  }

  /**
   * Get reports by study
   */
  async getReportsByStudy(studyInstanceUID: string): Promise<StructuredReport[]> {
    try {
      console.log('📚 Fetching reports for study:', studyInstanceUID)
      console.log('📚 URL:', `${this.baseURL}/study/${studyInstanceUID}`)
      const response: AxiosResponse<{ success: boolean; data: StructuredReport[] }> = await axios.get(
        `${this.baseURL}/study/${studyInstanceUID}`
      )
      console.log('✅ Study reports response:', response.data)
      return response.data.data || []
    } catch (error: any) {
      console.error('❌ Failed to fetch study reports:', error)
      console.error('❌ Error response:', error.response?.data)
      console.error('❌ Error status:', error.response?.status)
      return []
    }
  }

  /**
   * Get report history for a patient
   */
  async getReportHistory(patientId: string, params?: {
    modality?: string
    bodyPart?: string
    dateFrom?: string
    dateTo?: string
    limit?: number
  }): Promise<StructuredReport[]> {
    try {
      console.log('📚 Fetching report history for patient:', patientId)
      const response: AxiosResponse<{ success: boolean; data: StructuredReport[] }> = await axios.get(
        `${this.baseURL}/patient/${patientId}`,
        { params }
      )
      console.log('✅ Report history response:', response.data)
      return response.data.data || []
    } catch (error) {
      console.error('Failed to fetch report history:', error)
      return []
    }
  }

  /**
   * Auto-populate report from AI findings
   */
  async populateFromAI(reportId: string, studyInstanceUID: string): Promise<{
    findings: ReportFinding[]
    measurements: ReportMeasurement[]
    suggestedImpression?: string
  }> {
    try {
      const response: AxiosResponse<{
        success: boolean;
        data: {
          findings: ReportFinding[]
          measurements: ReportMeasurement[]
          suggestedImpression?: string
        }
      }> = await axios.post(
        `${this.baseURL}/reports/${reportId}/populate-ai`,
        { studyInstanceUID }
      )
      return response.data.data
    } catch (error) {
      console.error('Failed to populate from AI:', error)
      return {
        findings: [],
        measurements: []
      }
    }
  }

  /**
   * Validate report completeness
   */
  async validateReport(reportId: string): Promise<{
    isValid: boolean
    errors: Array<{
      field: string
      message: string
      severity: 'error' | 'warning'
    }>
  }> {
    try {
      const response: AxiosResponse<{
        success: boolean;
        data: {
          isValid: boolean
          errors: Array<{
            field: string
            message: string
            severity: 'error' | 'warning'
          }>
        }
      }> = await axios.post(
        `${this.baseURL}/reports/${reportId}/validate`
      )
      return response.data.data
    } catch (error) {
      console.error('Failed to validate report:', error)
      return {
        isValid: false,
        errors: [{
          field: 'general',
          message: 'Failed to validate report',
          severity: 'error'
        }]
      }
    }
  }
}

export const reportingService = new ReportingService()