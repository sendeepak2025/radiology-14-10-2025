const axios = require('axios');
const logger = require('../utils/logger');

class OrthancClient {
  constructor() {
    this.baseURL = process.env.ORTHANC_URL || 'http://orthanc:8042';
    this.username = process.env.ORTHANC_USERNAME || 'orthanc';
    this.password = process.env.ORTHANC_PASSWORD || 'orthanc_secure_2024';
    
    this.client = axios.create({
      baseURL: this.baseURL,
      auth: {
        username: this.username,
        password: this.password
      },
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        logger.debug('Orthanc API request', {
          method: config.method,
          url: config.url,
          baseURL: config.baseURL
        });
        return config;
      },
      (error) => {
        logger.error('Orthanc API request error', { error: error.message });
        return Promise.reject(error);
      }
    );

    // Response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        logger.debug('Orthanc API response', {
          status: response.status,
          url: response.config.url
        });
        return response;
      },
      (error) => {
        logger.error('Orthanc API response error', {
          status: error.response?.status,
          url: error.config?.url,
          message: error.message
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Validate connection to Orthanc
   */
  async validateConnection() {
    try {
      const response = await this.client.get('/system');
      logger.info('Orthanc connection validated', {
        version: response.data.Version,
        name: response.data.Name
      });
      return response.data;
    } catch (error) {
      logger.error('Orthanc connection failed', { error: error.message });
      throw new Error(`Cannot connect to Orthanc: ${error.message}`);
    }
  }

  /**
   * Get system information from Orthanc
   */
  async getSystemInfo() {
    try {
      const response = await this.client.get('/system');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get Orthanc system info: ${error.message}`);
    }
  }

  /**
   * Get instance file as buffer (READ-ONLY operation)
   * CRITICAL: This creates a copy in memory, never modifies the original
   */
  async getInstanceFile(instanceId) {
    try {
      logger.info('Fetching instance file (read-only)', { instanceId });
      
      const response = await this.client.get(`/instances/${instanceId}/file`, {
        responseType: 'arraybuffer'
      });
      
      const buffer = Buffer.from(response.data);
      
      logger.info('Instance file fetched successfully', {
        instanceId,
        size: buffer.length,
        contentType: response.headers['content-type']
      });
      
      return buffer;
    } catch (error) {
      logger.error('Failed to fetch instance file', {
        instanceId,
        error: error.message
      });
      throw new Error(`Failed to fetch instance ${instanceId}: ${error.message}`);
    }
  }

  /**
   * Get instance metadata (READ-ONLY operation)
   */
  async getInstanceMetadata(instanceId) {
    try {
      const response = await this.client.get(`/instances/${instanceId}/simplified-tags`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get instance metadata: ${error.message}`);
    }
  }

  /**
   * Get instance information (READ-ONLY operation)
   */
  async getInstanceInfo(instanceId) {
    try {
      const response = await this.client.get(`/instances/${instanceId}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get instance info: ${error.message}`);
    }
  }

  /**
   * List all instances (READ-ONLY operation)
   */
  async listInstances() {
    try {
      const response = await this.client.get('/instances');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to list instances: ${error.message}`);
    }
  }

  /**
   * Get study information (READ-ONLY operation)
   */
  async getStudyInfo(studyId) {
    try {
      const response = await this.client.get(`/studies/${studyId}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get study info: ${error.message}`);
    }
  }

  /**
   * SAFETY CHECK: Verify instance exists before processing
   */
  async verifyInstanceExists(instanceId) {
    try {
      await this.client.head(`/instances/${instanceId}`);
      return true;
    } catch (error) {
      if (error.response?.status === 404) {
        return false;
      }
      throw error;
    }
  }
}

// Singleton instance
const orthancClient = new OrthancClient();

// Export functions for easier use
module.exports = {
  validateOrthancConnection: () => orthancClient.validateConnection(),
  getSystemInfo: () => orthancClient.getSystemInfo(),
  getInstanceFile: (instanceId) => orthancClient.getInstanceFile(instanceId),
  getInstanceMetadata: (instanceId) => orthancClient.getInstanceMetadata(instanceId),
  getInstanceInfo: (instanceId) => orthancClient.getInstanceInfo(instanceId),
  listInstances: () => orthancClient.listInstances(),
  getStudyInfo: (studyId) => orthancClient.getStudyInfo(studyId),
  verifyInstanceExists: (instanceId) => orthancClient.verifyInstanceExists(instanceId),
  orthancClient
};