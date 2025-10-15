/**
 * Search Service
 * Handles API calls for search and filtering
 */

import ApiService from './ApiService';

export interface StudyFilters {
  patientName?: string;
  patientID?: string;
  studyDateFrom?: string;
  studyDateTo?: string;
  modality?: string[];
  studyDescription?: string;
  accessionNumber?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    currentPage: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    nextPage: number | null;
    prevPage: number | null;
  };
}

class SearchService {
  /**
   * Search studies with pagination and filters
   */
  async searchStudies(
    filters: StudyFilters = {},
    pagination: PaginationParams = {}
  ): Promise<PaginatedResponse<any>> {
    const params = new URLSearchParams();

    // Add pagination params
    if (pagination.page) params.append('page', pagination.page.toString());
    if (pagination.limit) params.append('limit', pagination.limit.toString());
    if (pagination.sortBy) params.append('sortBy', pagination.sortBy);
    if (pagination.sortOrder) params.append('sortOrder', pagination.sortOrder);

    // Add filter params
    if (filters.patientName) params.append('patientName', filters.patientName);
    if (filters.patientID) params.append('patientID', filters.patientID);
    if (filters.studyDateFrom) params.append('studyDateFrom', filters.studyDateFrom);
    if (filters.studyDateTo) params.append('studyDateTo', filters.studyDateTo);
    if (filters.modality && filters.modality.length > 0) {
      // Send as comma-separated for now, backend can handle array
      params.append('modality', filters.modality.join(','));
    }
    if (filters.studyDescription) params.append('studyDescription', filters.studyDescription);
    if (filters.accessionNumber) params.append('accessionNumber', filters.accessionNumber);

    const response = await fetch(
      `/api/studies/paginated?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to search studies');
    }

    return response.json();
  }

  /**
   * Full-text search
   */
  async fullTextSearch(
    query: string,
    pagination: PaginationParams = {}
  ): Promise<PaginatedResponse<any>> {
    const params = new URLSearchParams({
      q: query,
      page: (pagination.page || 1).toString(),
      limit: (pagination.limit || 20).toString(),
    });

    const response = await fetch(
      `/api/studies/search?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Search failed');
    }

    return response.json();
  }

  /**
   * Get recent studies
   */
  async getRecentStudies(limit: number = 10): Promise<any> {
    const response = await fetch(
      `/api/studies/recent?limit=${limit}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch recent studies');
    }

    return response.json();
  }

  /**
   * Get studies by patient
   */
  async getStudiesByPatient(
    patientID: string,
    pagination: PaginationParams = {}
  ): Promise<PaginatedResponse<any>> {
    const params = new URLSearchParams({
      page: (pagination.page || 1).toString(),
      limit: (pagination.limit || 20).toString(),
    });

    const response = await fetch(
      `/api/studies/by-patient/${patientID}?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch patient studies');
    }

    return response.json();
  }

  /**
   * Get studies by modality
   */
  async getStudiesByModality(
    modality: string,
    pagination: PaginationParams = {}
  ): Promise<PaginatedResponse<any>> {
    const params = new URLSearchParams({
      page: (pagination.page || 1).toString(),
      limit: (pagination.limit || 20).toString(),
    });

    const response = await fetch(
      `/api/studies/by-modality/${modality}?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch studies');
    }

    return response.json();
  }

  /**
   * Get study count with filters
   */
  async getStudyCount(filters: StudyFilters = {}): Promise<number> {
    const params = new URLSearchParams();

    if (filters.patientName) params.append('patientName', filters.patientName);
    if (filters.patientID) params.append('patientID', filters.patientID);
    if (filters.studyDateFrom) params.append('studyDateFrom', filters.studyDateFrom);
    if (filters.studyDateTo) params.append('studyDateTo', filters.studyDateTo);
    if (filters.modality && filters.modality.length > 0) {
      params.append('modality', filters.modality.join(','));
    }

    const response = await fetch(
      `/api/studies/count?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to count studies');
    }

    const data = await response.json();
    return data.total;
  }

  /**
   * Get study statistics
   */
  async getStudyStats(): Promise<any> {
    const response = await fetch('/api/studies/stats', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch statistics');
    }

    return response.json();
  }
}

export default new SearchService();
