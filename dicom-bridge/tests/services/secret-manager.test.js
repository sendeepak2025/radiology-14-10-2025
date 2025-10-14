const { SecretManagerClient, getSecretManager, getApplicationSecrets } = require('../../src/services/secret-manager');
const axios = require('axios');
const AWS = require('aws-sdk');

// Mock dependencies
jest.mock('axios');
jest.mock('aws-sdk');
jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
}));

describe('SecretManagerClient', () => {
  let secretManager;
  let mockAxiosInstance;
  let mockAWSSecretsManager;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock axios create
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      interceptors: {
        request: {
          use: jest.fn()
        }
      }
    };
    axios.create.mockReturnValue(mockAxiosInstance);

    // Mock AWS SecretsManager
    mockAWSSecretsManager = {
      getSecretValue: jest.fn().mockReturnValue({
        promise: jest.fn()
      }),
      updateSecret: jest.fn().mockReturnValue({
        promise: jest.fn()
      }),
      createSecret: jest.fn().mockReturnValue({
        promise: jest.fn()
      }),
      listSecrets: jest.fn().mockReturnValue({
        promise: jest.fn()
      }),
      describeSecret: jest.fn().mockReturnValue({
        promise: jest.fn()
      })
    };
    AWS.SecretsManager.mockImplementation(() => mockAWSSecretsManager);
  });

  describe('Vault Provider', () => {
    beforeEach(() => {
      secretManager = new SecretManagerClient({
        provider: 'vault',
        vaultUrl: 'http://test-vault:8200',
        vaultToken: 'test-token'
      });
    });

    describe('getSecret', () => {
      it('should retrieve secret successfully with valid credentials', async () => {
        const mockSecretData = {
          username: 'test-user',
          password: 'test-password'
        };

        mockAxiosInstance.get.mockResolvedValue({
          data: {
            data: {
              data: mockSecretData
            }
          }
        });

        const result = await secretManager.getSecret('secret/test');

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/v1/secret/test');
        expect(result).toEqual(mockSecretData);
      });

      it('should handle invalid credentials gracefully', async () => {
        mockAxiosInstance.get.mockRejectedValue({
          response: { status: 403 },
          message: 'Forbidden'
        });

        await expect(secretManager.getSecret('secret/test'))
          .rejects.toThrow('Vault secret retrieval failed: Forbidden');
      });

      it('should handle secret not found', async () => {
        mockAxiosInstance.get.mockRejectedValue({
          response: { status: 404 },
          message: 'Not Found'
        });

        await expect(secretManager.getSecret('secret/nonexistent'))
          .rejects.toThrow('Secret not found: secret/nonexistent');
      });

      it('should use cached secret when available', async () => {
        const mockSecretData = { key: 'cached-value' };
        
        // First call - should hit the API
        mockAxiosInstance.get.mockResolvedValue({
          data: { data: { data: mockSecretData } }
        });

        const result1 = await secretManager.getSecret('secret/cached');
        
        // Second call - should use cache
        const result2 = await secretManager.getSecret('secret/cached');

        expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);
        expect(result1).toEqual(mockSecretData);
        expect(result2).toEqual(mockSecretData);
      });

      it('should skip cache when requested', async () => {
        const mockSecretData = { key: 'fresh-value' };
        
        mockAxiosInstance.get.mockResolvedValue({
          data: { data: { data: mockSecretData } }
        });

        await secretManager.getSecret('secret/fresh');
        await secretManager.getSecret('secret/fresh', { skipCache: true });

        expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);
      });
    });

    describe('putSecret', () => {
      it('should store secret successfully', async () => {
        const secretData = { username: 'new-user', password: 'new-password' };
        
        mockAxiosInstance.post.mockResolvedValue({ data: {} });

        await secretManager.putSecret('secret/new', secretData);

        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/v1/secret/new', {
          data: secretData
        });
      });

      it('should invalidate cache after storing secret', async () => {
        const secretData = { key: 'updated-value' };
        
        // First, cache a secret
        mockAxiosInstance.get.mockResolvedValue({
          data: { data: { data: { key: 'old-value' } } }
        });
        await secretManager.getSecret('secret/update');

        // Update the secret
        mockAxiosInstance.post.mockResolvedValue({ data: {} });
        await secretManager.putSecret('secret/update', secretData);

        // Verify cache was invalidated by checking cache stats
        const stats = secretManager.getCacheStats();
        expect(stats.size).toBe(0);
      });
    });

    describe('testConnection', () => {
      it('should return true for successful connection', async () => {
        mockAxiosInstance.get.mockResolvedValue({ data: {} });

        const result = await secretManager.testConnection();

        expect(result).toBe(true);
        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/v1/sys/health');
      });

      it('should return false for failed connection', async () => {
        mockAxiosInstance.get.mockRejectedValue(new Error('Connection failed'));

        const result = await secretManager.testConnection();

        expect(result).toBe(false);
      });
    });
  });

  describe('AWS Provider', () => {
    beforeEach(() => {
      secretManager = new SecretManagerClient({
        provider: 'aws',
        awsRegion: 'us-east-1'
      });
    });

    describe('getSecret', () => {
      it('should retrieve JSON secret successfully', async () => {
        const mockSecretData = { username: 'aws-user', password: 'aws-password' };
        
        mockAWSSecretsManager.getSecretValue().promise.mockResolvedValue({
          SecretString: JSON.stringify(mockSecretData)
        });

        const result = await secretManager.getSecret('test-secret');

        expect(mockAWSSecretsManager.getSecretValue).toHaveBeenCalledWith({
          SecretId: 'test-secret'
        });
        expect(result).toEqual(mockSecretData);
      });

      it('should retrieve string secret successfully', async () => {
        mockAWSSecretsManager.getSecretValue().promise.mockResolvedValue({
          SecretString: 'plain-text-secret'
        });

        const result = await secretManager.getSecret('string-secret');

        expect(result).toEqual({ value: 'plain-text-secret' });
      });

      it('should handle binary secrets', async () => {
        const binaryData = Buffer.from('binary-secret').toString('base64');
        
        mockAWSSecretsManager.getSecretValue().promise.mockResolvedValue({
          SecretBinary: binaryData
        });

        const result = await secretManager.getSecret('binary-secret');

        expect(result).toEqual({ value: 'binary-secret' });
      });

      it('should handle secret not found', async () => {
        const error = new Error('Secret not found');
        error.code = 'ResourceNotFoundException';
        
        mockAWSSecretsManager.getSecretValue().promise.mockRejectedValue(error);

        await expect(secretManager.getSecret('nonexistent'))
          .rejects.toThrow('Secret not found: nonexistent');
      });

      it('should handle AWS service errors', async () => {
        const error = new Error('Service unavailable');
        error.code = 'ServiceUnavailableException';
        
        mockAWSSecretsManager.getSecretValue().promise.mockRejectedValue(error);

        await expect(secretManager.getSecret('test-secret'))
          .rejects.toThrow('AWS Secrets Manager retrieval failed: Service unavailable');
      });
    });

    describe('putSecret', () => {
      it('should update existing secret successfully', async () => {
        const secretData = { key: 'updated-value' };
        
        mockAWSSecretsManager.updateSecret().promise.mockResolvedValue({});

        await secretManager.putSecret('existing-secret', secretData);

        expect(mockAWSSecretsManager.updateSecret).toHaveBeenCalledWith({
          SecretId: 'existing-secret',
          SecretString: JSON.stringify(secretData)
        });
      });

      it('should create new secret if not exists', async () => {
        const secretData = { key: 'new-value' };
        const error = new Error('Secret not found');
        error.code = 'ResourceNotFoundException';
        
        mockAWSSecretsManager.updateSecret().promise.mockRejectedValue(error);
        mockAWSSecretsManager.createSecret().promise.mockResolvedValue({});

        await secretManager.putSecret('new-secret', secretData);

        expect(mockAWSSecretsManager.createSecret).toHaveBeenCalledWith({
          Name: 'new-secret',
          SecretString: JSON.stringify(secretData)
        });
      });
    });
  });

  describe('Error Handling and Fallback', () => {
    it('should throw error for unsupported provider', () => {
      expect(() => {
        new SecretManagerClient({ provider: 'unsupported' });
      }).toThrow('Unsupported secret provider: unsupported');
    });

    it('should handle network timeouts gracefully', async () => {
      secretManager = new SecretManagerClient({
        provider: 'vault',
        vaultToken: 'test-token'
      });

      const timeoutError = new Error('Request timeout');
      timeoutError.code = 'ECONNABORTED';
      
      mockAxiosInstance.get.mockRejectedValue(timeoutError);

      await expect(secretManager.getSecret('secret/timeout'))
        .rejects.toThrow('Vault secret retrieval failed: Request timeout');
    });

    it('should handle secrets unavailable scenario', async () => {
      secretManager = new SecretManagerClient({
        provider: 'vault',
        vaultToken: 'test-token'
      });

      mockAxiosInstance.get.mockRejectedValue(new Error('Service unavailable'));

      await expect(secretManager.getSecret('secret/unavailable'))
        .rejects.toThrow('Vault secret retrieval failed: Service unavailable');
    });
  });

  describe('Cache Management', () => {
    beforeEach(() => {
      secretManager = new SecretManagerClient({
        provider: 'vault',
        vaultToken: 'test-token',
        cacheTimeout: 1000 // 1 second for testing
      });
    });

    it('should clear cache successfully', () => {
      secretManager.clearCache();
      
      const stats = secretManager.getCacheStats();
      expect(stats.size).toBe(0);
    });

    it('should return correct cache statistics', () => {
      const stats = secretManager.getCacheStats();
      
      expect(stats).toEqual({
        size: 0,
        timeout: 1000,
        provider: 'vault'
      });
    });

    it('should expire cached secrets after timeout', async () => {
      const mockSecretData = { key: 'expiring-value' };
      
      mockAxiosInstance.get.mockResolvedValue({
        data: { data: { data: mockSecretData } }
      });

      // First call
      await secretManager.getSecret('secret/expiring');
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);

      // Advance timers to expire cache
      jest.advanceTimersByTime(1100);

      // Second call should hit API again
      await secretManager.getSecret('secret/expiring');
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);
    });
  });
});

// Separate test file for getApplicationSecrets to avoid circular dependency issues
describe('getApplicationSecrets', () => {
  let mockGetSecretManager;
  let mockSecretManager;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockSecretManager = {
      getSecret: jest.fn()
    };

    // Mock the module before requiring
    mockGetSecretManager = jest.fn().mockReturnValue(mockSecretManager);
    
    jest.doMock('../../src/services/secret-manager', () => ({
      getSecretManager: mockGetSecretManager,
      getApplicationSecrets: jest.requireActual('../../src/services/secret-manager').getApplicationSecrets
    }));
  });

  it('should retrieve all application secrets successfully', async () => {
    const mockSecrets = {
      orthanc: { username: 'orthanc-user', password: 'orthanc-pass', url: 'http://orthanc:8042' },
      webhook: { hmac_secret: 'webhook-secret' },
      database: { mongodb_uri: 'mongodb://localhost:27017/dicom' },
      cloudinary: { cloud_name: 'test-cloud', api_key: 'test-key', api_secret: 'test-secret' }
    };

    mockSecretManager.getSecret
      .mockResolvedValueOnce(mockSecrets.orthanc)
      .mockResolvedValueOnce(mockSecrets.webhook)
      .mockResolvedValueOnce(mockSecrets.database)
      .mockResolvedValueOnce(mockSecrets.cloudinary);

    const { getApplicationSecrets } = require('../../src/services/secret-manager');
    const result = await getApplicationSecrets();

    expect(result).toEqual({
      orthanc: {
        username: 'orthanc-user',
        password: 'orthanc-pass',
        url: 'http://orthanc:8042'
      },
      webhook: {
        secret: 'webhook-secret'
      },
      database: {
        uri: 'mongodb://localhost:27017/dicom'
      },
      cloudinary: {
        cloudName: 'test-cloud',
        apiKey: 'test-key',
        apiSecret: 'test-secret'
      }
    });
  });

  it('should handle partial secret failures gracefully', async () => {
    const mockSecrets = {
      orthanc: { username: 'orthanc-user', password: 'orthanc-pass', url: 'http://orthanc:8042' },
      webhook: { hmac_secret: 'webhook-secret' }
    };

    mockSecretManager.getSecret
      .mockResolvedValueOnce(mockSecrets.orthanc)
      .mockResolvedValueOnce(mockSecrets.webhook)
      .mockRejectedValueOnce(new Error('Database secret not found'))
      .mockRejectedValueOnce(new Error('Cloudinary secret not found'));

    const { getApplicationSecrets } = require('../../src/services/secret-manager');
    const result = await getApplicationSecrets();

    expect(result.orthanc.username).toBe('orthanc-user');
    expect(result.webhook.secret).toBe('webhook-secret');
    expect(result.database).toEqual({});
    expect(result.cloudinary).toEqual({});
  });

  it('should handle complete secret manager failure', async () => {
    // Mock getSecretManager to throw error
    mockGetSecretManager.mockImplementation(() => {
      throw new Error('Secret manager unavailable');
    });

    const { getApplicationSecrets } = require('../../src/services/secret-manager');
    await expect(getApplicationSecrets())
      .rejects.toThrow('Application secrets retrieval failed: Secret manager unavailable');
  });
});