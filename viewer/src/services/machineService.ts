/**
 * Machine Management Service
 * API calls for medical imaging machine management
 */

import ApiService from './ApiService';

export interface Machine {
  machineId: string;
  organizationId: string;
  organizationName: string;
  name: string;
  machineType: 'CT' | 'MRI' | 'PET' | 'XRAY' | 'US' | 'CR' | 'DX' | 'MG' | 'OTHER';
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  ipAddress: string;
  port: number;
  aeTitle: string;
  callingAeTitle: string;
  status: 'online' | 'offline' | 'testing' | 'error' | 'pending';
  lastSeen?: string;
  lastConnectionTest?: string;
  connectionTestResult?: {
    success: boolean;
    message: string;
    testedAt: string;
  };
  totalStudiesReceived: number;
  lastStudyReceived?: string;
  location?: {
    building?: string;
    floor?: string;
    room?: string;
    description?: string;
  };
  autoAcceptStudies: boolean;
  enabled: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMachineRequest {
  organizationId: string;
  organizationName: string;
  name: string;
  machineType: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  ipAddress: string;
  port?: number;
  aeTitle?: string;
  callingAeTitle?: string;
  location?: {
    building?: string;
    floor?: string;
    room?: string;
    description?: string;
  };
  notes?: string;
}

class MachineService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
  }

  /**
   * Get all machines for an organization
   */
  async getMachines(organizationId: string): Promise<Machine[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/machines?organizationId=${organizationId}`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch machines');
      }

      return data.data;
    } catch (error) {
      console.error('Error fetching machines:', error);
      throw error;
    }
  }

  /**
   * Get single machine by ID
   */
  async getMachine(machineId: string): Promise<Machine> {
    try {
      const response = await fetch(`${this.baseUrl}/api/machines/${machineId}`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch machine');
      }

      return data.data;
    } catch (error) {
      console.error('Error fetching machine:', error);
      throw error;
    }
  }

  /**
   * Create new machine
   */
  async createMachine(machine: CreateMachineRequest): Promise<Machine> {
    try {
      const response = await fetch(`${this.baseUrl}/api/machines`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(machine),
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to create machine');
      }

      return data.data;
    } catch (error) {
      console.error('Error creating machine:', error);
      throw error;
    }
  }

  /**
   * Update machine
   */
  async updateMachine(machineId: string, updates: Partial<Machine>): Promise<Machine> {
    try {
      const response = await fetch(`${this.baseUrl}/api/machines/${machineId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to update machine');
      }

      return data.data;
    } catch (error) {
      console.error('Error updating machine:', error);
      throw error;
    }
  }

  /**
   * Delete machine
   */
  async deleteMachine(machineId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/machines/${machineId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to delete machine');
      }
    } catch (error) {
      console.error('Error deleting machine:', error);
      throw error;
    }
  }

  /**
   * Test machine connection (DICOM C-ECHO)
   */
  async testConnection(machineId: string): Promise<{
    success: boolean;
    message: string;
    status: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/machines/${machineId}/test`, {
        method: 'POST',
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to test connection');
      }

      return data.data;
    } catch (error) {
      console.error('Error testing connection:', error);
      throw error;
    }
  }

  /**
   * Generate configuration for machine
   */
  async generateConfig(machineId: string, format: 'json' | 'text' | 'qr' = 'json'): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/machines/${machineId}/config?format=${format}`);
      
      if (format === 'text') {
        return await response.text();
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to generate config');
      }

      return data.data;
    } catch (error) {
      console.error('Error generating config:', error);
      throw error;
    }
  }

  /**
   * Get machine statistics
   */
  async getMachineStats(machineId: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/machines/${machineId}/stats`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch stats');
      }

      return data.data;
    } catch (error) {
      console.error('Error fetching stats:', error);
      throw error;
    }
  }
}

export default new MachineService();
