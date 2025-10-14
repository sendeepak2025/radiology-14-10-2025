const request = require('supertest');
const express = require('express');
const crypto = require('crypto');
const secretsRouter = require('../../src/routes/secrets');
const { getSecretManager, getApplicationSecrets } = require('../../src/services/secret-manager');

// Mock dependencies
jest.mock('../../src/services/secret-manager', () => ({
  getSecretManager: jest.fn(),
  getApplicationSecrets: jest.fn()
}));

const mockHandleCredentialRotation = jest.fn();
jest.mock('../../src/services/orthanc-config-generator', () => ({
  OrthancConfigGenerator: jest.fn().mockImplementation(() => ({
    handleCredentialRotation: mockHandleCredentialRotation
  }))
}));

jest.mock('../../src/services/orthanc-client', () => ({
  validateOrthancConnection: jest.fn()
}));

jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
}));

describe('Secrets Routes', () => {
  let app;
  let mockSecretManager;

  beforeEach(() => {
    jest.clearAllMocks();
    
    app = express();
    app.use(express.json());
    app.use('/api/secrets', secretsRouter);

    mockSecretManager = {
      clearCache: jest.fn(),
      getCacheStats: jest.fn().mockReturnValue({
        provider: 'vault',
        size: 5,
        timeout: 300000
      })
    };

    getSecretManager.mockReturnValue(mockSecretManager);
  });

  describe('POST /rotation-webhook', () => {
    it('should process rotation webhook successfully', async () => {
      const payload = {
        secretPath: 'dicom-bridge/production/orthanc',
        action: 'rotated',
        timestamp: Date.now()
      };

      getApplicationSecrets.mockResolvedValue({
        orthanc: { username: 'new-user', password: 'new-pass', url: 'http://orthanc:8042' },
        webhook: { secret: 'new-webhook-secret' },
        database: { uri: 'mongodb://localhost:27017/dicom' },
        cloudinary: { cloudName: 'test', apiKey: 'key', apiSecret: 'secret' }
      });

      mockHandleCredentialRotation.mockResolvedValue({});

      const response = await request(app)
        .post('/api/secrets/rotation-webhook')
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.secretPath).toBe(payload.secretPath);
      expect(response.body.data.action).toBe(payload.action);
      expect(mockSecretManager.clearCache).toHaveBeenCalled();
      expect(mockHandleCredentialRotation).toHaveBeenCalled();
    });

    it('should validate webhook signature when secret is configured', async () => {
      process.env.SECRET_ROTATION_WEBHOOK_SECRET = 'webhook-secret';
      
      const payload = {
        secretPath: 'dicom-bridge/production/database',
        action: 'rotated',
        timestamp: Date.now()
      };

      const payloadString = JSON.stringify(payload);
      const validSignature = crypto
        .createHmac('sha256', 'webhook-secret')
        .update(payloadString)
        .digest('hex');

      getApplicationSecrets.mockResolvedValue({
        orthanc: { username: 'user', password: 'pass', url: 'http://orthanc:8042' },
        webhook: { secret: 'webhook-secret' },
        database: { uri: 'mongodb://localhost:27017/dicom' },
        cloudinary: { cloudName: 'test', apiKey: 'key', apiSecret: 'secret' }
      });

      const response = await request(app)
        .post('/api/secrets/rotation-webhook')
        .set('x-rotation-signature', validSignature)
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      delete process.env.SECRET_ROTATION_WEBHOOK_SECRET;
    });

    it('should reject invalid webhook signature', async () => {
      process.env.SECRET_ROTATION_WEBHOOK_SECRET = 'webhook-secret';
      
      const payload = {
        secretPath: 'dicom-bridge/production/database',
        action: 'rotated',
        timestamp: Date.now()
      };

      const response = await request(app)
        .post('/api/secrets/rotation-webhook')
        .set('x-rotation-signature', 'invalid-signature')
        .send(payload);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid signature');

      delete process.env.SECRET_ROTATION_WEBHOOK_SECRET;
    });

    it('should handle missing required fields', async () => {
      const payload = {
        action: 'rotated'
        // Missing secretPath
      };

      const response = await request(app)
        .post('/api/secrets/rotation-webhook')
        .send(payload);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Missing required fields');
    });

    it('should handle unknown rotation action', async () => {
      const payload = {
        secretPath: 'dicom-bridge/production/database',
        action: 'unknown-action',
        timestamp: Date.now()
      };

      const response = await request(app)
        .post('/api/secrets/rotation-webhook')
        .send(payload);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Unknown action');
    });

    it('should handle rotation_scheduled action', async () => {
      const payload = {
        secretPath: 'dicom-bridge/production/webhook',
        action: 'rotation_scheduled',
        timestamp: Date.now()
      };

      const response = await request(app)
        .post('/api/secrets/rotation-webhook')
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should handle rotation_failed action', async () => {
      const payload = {
        secretPath: 'dicom-bridge/production/cloudinary',
        action: 'rotation_failed',
        timestamp: Date.now()
      };

      const response = await request(app)
        .post('/api/secrets/rotation-webhook')
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should handle Orthanc credential rotation failure with fallback', async () => {
      const payload = {
        secretPath: 'dicom-bridge/production/orthanc',
        action: 'rotated',
        timestamp: Date.now()
      };

      getApplicationSecrets.mockResolvedValue({
        orthanc: { username: 'new-user', password: 'new-pass', url: 'http://orthanc:8042' },
        webhook: { secret: 'new-webhook-secret' },
        database: { uri: 'mongodb://localhost:27017/dicom' },
        cloudinary: { cloudName: 'test', apiKey: 'key', apiSecret: 'secret' }
      });

      mockHandleCredentialRotation.mockRejectedValue(new Error('Restart failed'));

      const { validateOrthancConnection } = require('../../src/services/orthanc-client');
      validateOrthancConnection.mockResolvedValue();

      const response = await request(app)
        .post('/api/secrets/rotation-webhook')
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(validateOrthancConnection).toHaveBeenCalled();
    });

    it('should handle webhook processing failure', async () => {
      const payload = {
        secretPath: 'dicom-bridge/production/database',
        action: 'rotated',
        timestamp: Date.now()
      };

      getApplicationSecrets.mockRejectedValue(new Error('Secret manager unavailable'));

      const response = await request(app)
        .post('/api/secrets/rotation-webhook')
        .send(payload);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to process rotation webhook');
      expect(response.body.requestId).toBeDefined();
    });
  });

  describe('POST /refresh', () => {
    it('should refresh secrets successfully', async () => {
      const mockSecrets = {
        orthanc: { username: 'refreshed-user', password: 'refreshed-pass', url: 'http://orthanc:8042' },
        webhook: { secret: 'refreshed-webhook-secret' },
        database: { uri: 'mongodb://localhost:27017/dicom' },
        cloudinary: { cloudName: 'test', apiKey: 'key', apiSecret: 'secret' }
      };

      getApplicationSecrets.mockResolvedValue(mockSecrets);

      const response = await request(app)
        .post('/api/secrets/refresh');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Secrets refreshed successfully');
      expect(response.body.timestamp).toBeDefined();
      expect(mockSecretManager.clearCache).toHaveBeenCalled();
    });

    it('should handle refresh failure', async () => {
      getApplicationSecrets.mockRejectedValue(new Error('Secrets unavailable'));

      const response = await request(app)
        .post('/api/secrets/refresh');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to refresh secrets');
    });
  });

  describe('GET /status', () => {
    it('should return secret manager status', async () => {
      const response = await request(app)
        .get('/api/secrets/status');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual({
        provider: 'vault',
        cacheSize: 5,
        cacheTimeout: 300000,
        uptime: expect.any(Number),
        timestamp: expect.any(String)
      });
    });

    it('should handle status retrieval failure', async () => {
      mockSecretManager.getCacheStats.mockImplementation(() => {
        throw new Error('Status unavailable');
      });

      const response = await request(app)
        .get('/api/secrets/status');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to get status');
    });
  });

  describe('Signature Validation', () => {
    it('should validate HMAC signature correctly', async () => {
      process.env.SECRET_ROTATION_WEBHOOK_SECRET = 'test-secret';
      
      const payload = {
        secretPath: 'test/path',
        action: 'rotated'
      };
      const payloadString = JSON.stringify(payload);
      const validSignature = crypto
        .createHmac('sha256', 'test-secret')
        .update(payloadString)
        .digest('hex');

      getApplicationSecrets.mockResolvedValue({
        orthanc: { username: 'user', password: 'pass', url: 'http://orthanc:8042' },
        webhook: { secret: 'webhook-secret' },
        database: { uri: 'mongodb://localhost:27017/dicom' },
        cloudinary: { cloudName: 'test', apiKey: 'key', apiSecret: 'secret' }
      });

      // Test with valid signature
      const validResponse = await request(app)
        .post('/api/secrets/rotation-webhook')
        .set('x-rotation-signature', validSignature)
        .send(payload);

      expect(validResponse.status).toBe(200);

      delete process.env.SECRET_ROTATION_WEBHOOK_SECRET;
    });

    it('should handle signature validation errors', async () => {
      process.env.SECRET_ROTATION_WEBHOOK_SECRET = 'test-secret';
      
      const response = await request(app)
        .post('/api/secrets/rotation-webhook')
        .set('x-rotation-signature', 'malformed-signature')
        .send({
          secretPath: 'test/path',
          action: 'rotated'
        });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid signature');

      delete process.env.SECRET_ROTATION_WEBHOOK_SECRET;
    });
  });

  describe('Environment Variable Updates', () => {
    it('should update environment variables from secrets', async () => {
      const originalEnv = { ...process.env };
      
      const payload = {
        secretPath: 'dicom-bridge/production/database',
        action: 'rotated',
        timestamp: Date.now()
      };

      const mockSecrets = {
        orthanc: { username: 'env-user', password: 'env-pass', url: 'http://new-orthanc:8042' },
        webhook: { secret: 'env-webhook-secret' },
        database: { uri: 'mongodb://new-host:27017/dicom' },
        cloudinary: { cloudName: 'env-cloud', apiKey: 'env-key', apiSecret: 'env-secret' }
      };

      getApplicationSecrets.mockResolvedValue(mockSecrets);

      await request(app)
        .post('/api/secrets/rotation-webhook')
        .send(payload);

      expect(process.env.ORTHANC_URL).toBe('http://new-orthanc:8042');
      expect(process.env.ORTHANC_USERNAME).toBe('env-user');
      expect(process.env.ORTHANC_PASSWORD).toBe('env-pass');
      expect(process.env.WEBHOOK_SECRET).toBe('env-webhook-secret');
      expect(process.env.MONGODB_URI).toBe('mongodb://new-host:27017/dicom');
      expect(process.env.CLOUDINARY_CLOUD_NAME).toBe('env-cloud');
      expect(process.env.CLOUDINARY_API_KEY).toBe('env-key');
      expect(process.env.CLOUDINARY_API_SECRET).toBe('env-secret');

      // Restore original environment
      process.env = originalEnv;
    });
  });
});