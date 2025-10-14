const request = require('supertest');
const express = require('express');
const crypto = require('crypto');
const { getSecretManager, getApplicationSecrets } = require('../../src/services/secret-manager');
const { OrthancConfigGenerator } = require('../../src/services/orthanc-config-generator');

// Mock dependencies
jest.mock('../../src/services/secret-manager');
jest.mock('../../src/services/orthanc-config-generator');
jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
}));

describe('Secret Rotation Integration Tests', () => {
  let app;
  let mockSecretManager;
  let mockConfigGenerator;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup Express app with secrets router
    app = express();
    app.use(express.json());
    app.use('/api/secrets', require('../../src/routes/secrets'));

    // Mock secret manager
    mockSecretManager = {
      clearCache: jest.fn(),
      getCacheStats: jest.fn().mockReturnValue({
        provider: 'vault',
        size: 5,
        timeout: 300000
      })
    };
    getSecretManager.mockReturnValue(mockSecretManager);

    // Mock config generator
    mockConfigGenerator = {
      handleCredentialRotation: jest.fn()
    };
    OrthancConfigGenerator.mockImplementation(() => mockConfigGenerator);

    // Mock application secrets
    getApplicationSecrets.mockResolvedValue({
      orthanc: { username: 'test-user', password: 'test-pass', url: 'http://orthanc:8042' },
      webhook: { secret: 'test-webhook-secret' },
      database: { uri: 'mongodb://localhost:27017/dicom' },
      cloudinary: { cloudName: 'test', apiKey: 'key', apiSecret: 'secret' }
    });
  });

  describe('Webhook Rotation Handling', () => {
    it('should handle Orthanc credential rotation successfully', async () => {
      const payload = {
        secretPath: 'dicom-bridge/production/orthanc',
        action: 'rotated',
        timestamp: Date.now()
      };

      mockConfigGenerator.handleCredentialRotation.mockResolvedValue({});

      const response = await request(app)
        .post('/api/secrets/rotation-webhook')
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockSecretManager.clearCache).toHaveBeenCalled();
      expect(mockConfigGenerator.handleCredentialRotation).toHaveBeenCalled();
    });

    it('should handle non-Orthanc credential rotation', async () => {
      const payload = {
        secretPath: 'dicom-bridge/production/database',
        action: 'rotated',
        timestamp: Date.now()
      };

      const response = await request(app)
        .post('/api/secrets/rotation-webhook')
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockSecretManager.clearCache).toHaveBeenCalled();
      expect(mockConfigGenerator.handleCredentialRotation).not.toHaveBeenCalled();
    });

    it('should handle rotation failure with fallback', async () => {
      const payload = {
        secretPath: 'dicom-bridge/production/orthanc',
        action: 'rotated',
        timestamp: Date.now()
      };

      mockConfigGenerator.handleCredentialRotation.mockRejectedValue(new Error('Restart failed'));

      // Mock fallback validation
      const { validateOrthancConnection } = require('../../src/services/orthanc-client');
      jest.doMock('../../src/services/orthanc-client', () => ({
        validateOrthancConnection: jest.fn().mockResolvedValue()
      }));

      const response = await request(app)
        .post('/api/secrets/rotation-webhook')
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Secret Refresh', () => {
    it('should refresh secrets and update environment', async () => {
      const response = await request(app)
        .post('/api/secrets/refresh');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockSecretManager.clearCache).toHaveBeenCalled();
      expect(getApplicationSecrets).toHaveBeenCalled();
    });

    it('should handle refresh failure gracefully', async () => {
      getApplicationSecrets.mockRejectedValue(new Error('Secrets unavailable'));

      const response = await request(app)
        .post('/api/secrets/refresh');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Webhook Signature Validation', () => {
    it('should validate HMAC signatures correctly', async () => {
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

      const response = await request(app)
        .post('/api/secrets/rotation-webhook')
        .set('x-rotation-signature', validSignature)
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      delete process.env.SECRET_ROTATION_WEBHOOK_SECRET;
    });

    it('should reject invalid signatures', async () => {
      process.env.SECRET_ROTATION_WEBHOOK_SECRET = 'test-secret';
      
      const payload = {
        secretPath: 'test/path',
        action: 'rotated'
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
  });

  describe('Environment Variable Updates', () => {
    it('should update process environment from secrets', async () => {
      const originalEnv = { ...process.env };
      
      const payload = {
        secretPath: 'dicom-bridge/production/database',
        action: 'rotated'
      };

      const mockSecrets = {
        orthanc: { username: 'new-user', password: 'new-pass', url: 'http://new-orthanc:8042' },
        webhook: { secret: 'new-webhook-secret' },
        database: { uri: 'mongodb://new-host:27017/dicom' },
        cloudinary: { cloudName: 'new-cloud', apiKey: 'new-key', apiSecret: 'new-secret' }
      };

      getApplicationSecrets.mockResolvedValue(mockSecrets);

      await request(app)
        .post('/api/secrets/rotation-webhook')
        .send(payload);

      expect(process.env.ORTHANC_URL).toBe('http://new-orthanc:8042');
      expect(process.env.ORTHANC_USERNAME).toBe('new-user');
      expect(process.env.ORTHANC_PASSWORD).toBe('new-pass');
      expect(process.env.WEBHOOK_SECRET).toBe('new-webhook-secret');
      expect(process.env.MONGODB_URI).toBe('mongodb://new-host:27017/dicom');

      // Restore original environment
      process.env = originalEnv;
    });
  });
});