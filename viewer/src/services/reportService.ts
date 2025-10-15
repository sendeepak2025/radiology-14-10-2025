/**
 * Report Service
 * Handles API calls for reports and templates
 */

export interface ReportTemplate {
  templateId: string;
  name: string;
  description?: string;
  modality?: string[];
  bodyPart?: string;
  category: string;
  template: string;
  sections: Array<{
    sectionName: string;
    sectionContent: string;
    order: number;
  }>;
  variables: Array<{
    name: string;
    label: string;
    type: string;
    options?: string[];
    required?: boolean;
    defaultValue?: string;
  }>;
  tags?: string[];
}

export interface Report {
  reportId: string;
  studyInstanceUID: string;
  patientName?: string;
  patientID?: string;
  studyDate?: string;
  modality?: string;
  templateId?: string;
  templateName?: string;
  content: string;
  sections?: Array<{
    sectionName: string;
    sectionContent: string;
  }>;
  findings?: string;
  impression?: string;
  status: 'draft' | 'in_review' | 'finalized' | 'amended';
  createdBy: string;
  radiologist?: {
    name: string;
    id: string;
  };
  signature?: {
    data: string;
    timestamp: Date;
    signedBy: string;
  };
  version?: number;
  createdAt?: string;
  updatedAt?: string;
}

class ReportService {
  private baseUrl = '/api';

  /**
   * Get all report templates
   */
  async getTemplates(filters?: {
    modality?: string;
    category?: string;
    search?: string;
  }): Promise<{ success: boolean; data: ReportTemplate[]; count: number }> {
    const params = new URLSearchParams();
    if (filters?.modality) params.append('modality', filters.modality);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.search) params.append('search', filters.search);

    const response = await fetch(
      `${this.baseUrl}/report-templates?${params.toString()}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch templates');
    }

    return response.json();
  }

  /**
   * Get a specific template
   */
  async getTemplate(templateId: string): Promise<{ success: boolean; data: ReportTemplate }> {
    const response = await fetch(`${this.baseUrl}/report-templates/${templateId}`);

    if (!response.ok) {
      throw new Error('Template not found');
    }

    return response.json();
  }

  /**
   * Create a new report
   */
  async createReport(data: {
    studyInstanceUID: string;
    templateId?: string;
    content: string;
    sections?: any[];
    findings?: string;
    impression?: string;
  }): Promise<{ success: boolean; data: Report }> {
    const response = await fetch(`${this.baseUrl}/reports`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to create report');
    }

    return response.json();
  }

  /**
   * Get a specific report
   */
  async getReport(reportId: string): Promise<{ success: boolean; data: Report }> {
    const response = await fetch(`${this.baseUrl}/reports/${reportId}`);

    if (!response.ok) {
      throw new Error('Report not found');
    }

    return response.json();
  }

  /**
   * Get reports for a study
   */
  async getReportsByStudy(studyInstanceUID: string): Promise<{
    success: boolean;
    data: Report[];
    count: number;
  }> {
    const response = await fetch(`${this.baseUrl}/studies/${studyInstanceUID}/reports`);

    if (!response.ok) {
      throw new Error('Failed to fetch reports');
    }

    return response.json();
  }

  /**
   * Update a report
   */
  async updateReport(
    reportId: string,
    updates: Partial<Report>
  ): Promise<{ success: boolean; data: Report }> {
    const response = await fetch(`${this.baseUrl}/reports/${reportId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error('Failed to update report');
    }

    return response.json();
  }

  /**
   * Finalize a report
   */
  async finalizeReport(reportId: string): Promise<{ success: boolean; data: Report }> {
    const response = await fetch(`${this.baseUrl}/reports/${reportId}/finalize`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error('Failed to finalize report');
    }

    return response.json();
  }

  /**
   * Sign a report
   */
  async signReport(
    reportId: string,
    signatureData: string
  ): Promise<{ success: boolean; data: Report }> {
    const response = await fetch(`${this.baseUrl}/reports/${reportId}/sign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ signatureData }),
    });

    if (!response.ok) {
      throw new Error('Failed to sign report');
    }

    return response.json();
  }

  /**
   * Delete a report (draft only)
   */
  async deleteReport(reportId: string): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/reports/${reportId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete report');
    }

    return response.json();
  }

  /**
   * Seed default templates
   */
  async seedTemplates(): Promise<{ success: boolean; count: number }> {
    const response = await fetch(`${this.baseUrl}/report-templates/seed`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error('Failed to seed templates');
    }

    return response.json();
  }

  /**
   * Replace template variables with actual values
   */
  replaceTemplateVariables(template: string, values: Record<string, string>): string {
    let result = template;
    Object.entries(values).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, value || '');
    });
    return result;
  }
}

export default new ReportService();
