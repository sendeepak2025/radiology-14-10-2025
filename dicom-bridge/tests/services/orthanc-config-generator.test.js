const { OrthancConfigGenerator } = require('../../src/services/orthanc-config-generator');
const fs = require('fs').promises;
const { exec } = require('child_process');
const { getApplicationSecrets } = require('../../src/services/secret-manager');

// Mock dependencies
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    copyFile: jest.fn(),
    stat: jest.fn(),
    access: jest.fn()
  }
}));

jest.mock('child_process', () => ({
  exec: jest.fn()
}));

jest.mock('../../src/services/secret-manager', () => ({
  getApplicationSecrets: jest.fn()
}));

jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
}));

// Mock axios for Orthanc health checks
jest.mock('axios', () => ({
  get: jest.fn()
}));

describe('OrthancConfigGenerator', () => {
  let configGenerator;
  let mockSecrets;

  beforeEach(() => {
    jest.clearAllMocks();
    
    configGenerator = new OrthancConfigGenerator({
      configPath: '/test/orthanc.json',
      templatePath: '/test/orthanc.template.json',
      backupPath: '/test/orthanc.backup.json'
    });

    mockSecrets = {
      orthanc: {
        username: 'test-user',
        password: 'test-password',
        url: 'http://orthanc:8042'
      },
      webhook: {
        secret: 'webhook-secret-key'
      },
      database: {
        uri: 'mongodb://localhost:27017/dicom'
      },
      cloudinary: {
        cloudName: 'test-cloud',
        apiKey: 'test-key',
        apiSecret: 'test-secret'
      }
    };

    getApplicationSecrets.mockResolvedValue(mockSecrets);
  });

  describe('generateConfig', () => {
    it('should generate configuration with secrets successfully', async () => {
      const mockTemplate = {
        "Name": "{{ORTHANC_NAME}}",
        "DicomAet": "{{ORTHANC_AET}}",
        "DicomPort": "{{ORTHANC_DICOM_PORT}}",
        "HttpPort": "{{ORTHANC_HTTP_PORT}}",
        "RegisteredUsers": {
          "{{ORTHANC_USERNAME}}": "{{ORTHANC_PASSWORD}}"
        },
        "StorageDirectory": "/var/lib/orthanc/storage",
        "IndexDirectory": "/var/lib/orthanc/db",
        "OnStoredInstance": [
          "local webhook_secret = '{{WEBHOOK_SECRET}}'"
        ]
      };

      fs.readFile.mockResolvedValue(JSON.stringify(mockTemplate));

      const result = await configGenerator.generateConfig();

      expect(result.Name).toBe('ORTHANC_TEST_AE');
      expect(result.RegisteredUsers['test-user']).toBe('test-password');
      expect(result.OnStoredInstance[0]).toContain('webhook-secret-key');
    });

    it('should use default template when template file not found', async () => {
      fs.readFile.mockRejectedValue({ code: 'ENOENT' });

      const result = await configGenerator.generateConfig();

      expect(result.Name).toBe('ORTHANC_TEST_AE');
      expect(result.RegisteredUsers['test-user']).toBe('test-password');
    });

    it('should handle secret retrieval failure', async () => {
      getApplicationSecrets.mockRejectedValue(new Error('Secrets unavailable'));

      await expect(configGenerator.generateConfig())
        .rejects.toThrow('Secrets unavailable');
    });

    it('should validate required configuration fields', async () => {
      const invalidTemplate = {
        "Name": "{{ORTHANC_NAME}}"
        // Missing required fields
      };

      fs.readFile.mockResolvedValue(JSON.stringify(invalidTemplate));

      await expect(configGenerator.generateConfig())
        .rejects.toThrow('Missing required configuration field');
    });

    it('should validate port ranges', async () => {
      const invalidTemplate = {
        "Name": "{{ORTHANC_NAME}}",
        "DicomAet": "TEST_AE",
        "DicomPort": 99999, // Invalid port
        "HttpPort": 8042,
        "RegisteredUsers": { "user": "pass" },
        "StorageDirectory": "/storage",
        "IndexDirectory": "/index"
      };

      fs.readFile.mockResolvedValue(JSON.stringify(invalidTemplate));

      await expect(configGenerator.generateConfig())
        .rejects.toThrow('Invalid DICOM port: 99999');
    });
  });

  describe('writeConfig', () => {
    it('should backup existing config and write new config', async () => {
      const config = { Name: 'Test Config' };
      
      fs.stat.mockResolvedValue({ isFile: () => true });
      fs.copyFile.mockResolvedValue();
      fs.writeFile.mockResolvedValue();

      await configGenerator.writeConfig(config);

      expect(fs.copyFile).toHaveBeenCalledWith('/test/orthanc.json', '/test/orthanc.backup.json');
      expect(fs.writeFile).toHaveBeenCalledWith('/test/orthanc.json', JSON.stringify(config, null, 2), 'utf8');
    });

    it('should handle backup failure gracefully', async () => {
      const config = { Name: 'Test Config' };
      
      fs.stat.mockRejectedValue({ code: 'ENOENT' });
      fs.writeFile.mockResolvedValue();

      await configGenerator.writeConfig(config);

      expect(fs.copyFile).not.toHaveBeenCalled();
      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should handle write failure', async () => {
      const config = { Name: 'Test Config' };
      
      fs.stat.mockResolvedValue({ isFile: () => true });
      fs.copyFile.mockResolvedValue();
      fs.writeFile.mockRejectedValue(new Error('Write failed'));

      await expect(configGenerator.writeConfig(config))
        .rejects.toThrow('Write failed');
    });
  });

  describe('restartOrthancService', () => {
    it('should restart Docker container when in Docker environment', async () => {
      // Mock Docker environment detection
      fs.access.mockResolvedValue(); // /.dockerenv exists
      
      const mockExec = jest.fn((cmd, callback) => {
        callback(null, { stdout: '', stderr: '' });
      });
      exec.mockImplementation(mockExec);

      // Mock Orthanc readiness check
      const axios = require('axios');
      axios.get.mockResolvedValue({ status: 200 });

      await configGenerator.restartOrthancService();

      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining('docker-compose restart orthanc'),
        expect.any(Function)
      );
    });

    it('should restart system service when not in Docker', async () => {
      // Mock non-Docker environment
      fs.access.mockRejectedValue({ code: 'ENOENT' });
      
      const mockExec = jest.fn((cmd, callback) => {
        if (cmd.includes('cat /proc/1/cgroup')) {
          callback(null, { stdout: 'init.scope' }); // Not Docker
        } else {
          callback(null, { stdout: '', stderr: '' });
        }
      });
      exec.mockImplementation(mockExec);

      // Mock Orthanc readiness check
      const axios = require('axios');
      axios.get.mockResolvedValue({ status: 200 });

      await configGenerator.restartOrthancService();

      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining('systemctl restart orthanc'),
        expect.any(Function)
      );
    });

    it('should handle restart failure', async () => {
      fs.access.mockResolvedValue();
      
      const mockExec = jest.fn((cmd, callback) => {
        callback(new Error('Restart failed'), null);
      });
      exec.mockImplementation(mockExec);

      await expect(configGenerator.restartOrthancService())
        .rejects.toThrow('Failed to restart Orthanc service');
    });

    it('should timeout if Orthanc not ready after restart', async () => {
      fs.access.mockResolvedValue();
      
      const mockExec = jest.fn((cmd, callback) => {
        callback(null, { stdout: '', stderr: '' });
      });
      exec.mockImplementation(mockExec);

      // Mock Orthanc never becoming ready
      const axios = require('axios');
      axios.get.mockRejectedValue(new Error('Connection refused'));

      await expect(configGenerator.restartOrthancService())
        .rejects.toThrow('Orthanc not ready after 30 attempts');
    }, 15000);
  });

  describe('handleCredentialRotation', () => {
    it('should update configuration and restart service successfully', async () => {
      const mockTemplate = {
        "Name": "{{ORTHANC_NAME}}",
        "DicomAet": "{{ORTHANC_AET}}",
        "DicomPort": "{{ORTHANC_DICOM_PORT}}",
        "HttpPort": "{{ORTHANC_HTTP_PORT}}",
        "RegisteredUsers": {
          "{{ORTHANC_USERNAME}}": "{{ORTHANC_PASSWORD}}"
        },
        "StorageDirectory": "/var/lib/orthanc/storage",
        "IndexDirectory": "/var/lib/orthanc/db"
      };

      fs.readFile.mockResolvedValue(JSON.stringify(mockTemplate));
      fs.stat.mockResolvedValue({ isFile: () => true });
      fs.copyFile.mockResolvedValue();
      fs.writeFile.mockResolvedValue();
      fs.access.mockResolvedValue(); // Docker environment

      const mockExec = jest.fn((cmd, callback) => {
        callback(null, { stdout: '', stderr: '' });
      });
      exec.mockImplementation(mockExec);

      // Mock Orthanc readiness check
      const axios = require('axios');
      axios.get.mockResolvedValue({ status: 200 });

      const result = await configGenerator.handleCredentialRotation();

      expect(result.RegisteredUsers['test-user']).toBe('test-password');
      expect(fs.writeFile).toHaveBeenCalled();
      expect(mockExec).toHaveBeenCalled();
    });

    it('should restore from backup on rotation failure', async () => {
      getApplicationSecrets.mockRejectedValue(new Error('Secrets unavailable'));
      
      fs.copyFile.mockResolvedValue(); // Backup restore
      fs.access.mockResolvedValue(); // Docker environment

      const mockExec = jest.fn((cmd, callback) => {
        callback(null, { stdout: '', stderr: '' });
      });
      exec.mockImplementation(mockExec);

      // Mock Orthanc readiness check
      const axios = require('axios');
      axios.get.mockResolvedValue({ status: 200 });

      await expect(configGenerator.handleCredentialRotation())
        .rejects.toThrow('Secrets unavailable');

      // Should attempt to restore from backup
      expect(fs.copyFile).toHaveBeenCalledWith('/test/orthanc.backup.json', '/test/orthanc.json');
    });

    it('should handle backup restore failure', async () => {
      getApplicationSecrets.mockRejectedValue(new Error('Secrets unavailable'));
      
      fs.copyFile.mockRejectedValue(new Error('Backup not found'));

      await expect(configGenerator.handleCredentialRotation())
        .rejects.toThrow('Secrets unavailable');
    });
  });

  describe('populateTemplate', () => {
    it('should replace all template variables correctly', async () => {
      const template = {
        "Name": "{{ORTHANC_NAME}}",
        "DicomPort": "{{ORTHANC_DICOM_PORT}}",
        "RegisteredUsers": {
          "{{ORTHANC_USERNAME}}": "{{ORTHANC_PASSWORD}}"
        },
        "OnStoredInstance": [
          "local webhook_secret = '{{WEBHOOK_SECRET}}'"
        ]
      };

      process.env.ORTHANC_NAME = 'TEST_ORTHANC';
      process.env.ORTHANC_DICOM_PORT = '4242';

      const result = await configGenerator.populateTemplate(template, mockSecrets);

      expect(result.Name).toBe('TEST_ORTHANC');
      expect(result.DicomPort).toBe('4242');
      expect(result.RegisteredUsers['test-user']).toBe('test-password');
      expect(result.OnStoredInstance[0]).toContain('webhook-secret-key');

      // Clean up
      delete process.env.ORTHANC_NAME;
      delete process.env.ORTHANC_DICOM_PORT;
    });

    it('should use default values when environment variables not set', async () => {
      // Clear environment variables that might be set in setup
      delete process.env.ORTHANC_NAME;
      delete process.env.ORTHANC_AET;
      
      const template = {
        "Name": "{{ORTHANC_NAME}}",
        "DicomAet": "{{ORTHANC_AET}}"
      };

      const result = await configGenerator.populateTemplate(template, mockSecrets);

      expect(result.Name).toBe('ORTHANC_TEST_AE');
      expect(result.DicomAet).toBe('ORTHANC_TEST_AE');
    });
  });

  describe('waitForOrthancReady', () => {
    it('should return when Orthanc becomes ready', async () => {
      const axios = require('axios');
      axios.get.mockResolvedValue({ status: 200 });

      await expect(configGenerator.waitForOrthancReady(3, 100))
        .resolves.toBeUndefined();

      expect(axios.get).toHaveBeenCalledWith(
        'http://test-orthanc:8042/system',
        expect.objectContaining({
          timeout: 5000,
          auth: expect.any(Object)
        })
      );
    });

    it('should retry on connection failures', async () => {
      const axios = require('axios');
      axios.get
        .mockRejectedValueOnce(new Error('Connection refused'))
        .mockRejectedValueOnce(new Error('Connection refused'))
        .mockResolvedValueOnce({ status: 200 });

      await expect(configGenerator.waitForOrthancReady(3, 100))
        .resolves.toBeUndefined();

      expect(axios.get).toHaveBeenCalledTimes(3);
    }, 15000);

    it('should timeout after max attempts', async () => {
      const axios = require('axios');
      axios.get.mockRejectedValue(new Error('Connection refused'));

      await expect(configGenerator.waitForOrthancReady(2, 100))
        .rejects.toThrow('Orthanc not ready after 2 attempts');

      expect(axios.get).toHaveBeenCalledTimes(2);
    }, 15000);
  });
});