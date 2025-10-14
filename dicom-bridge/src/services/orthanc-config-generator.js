const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const logger = require('../utils/logger');
const { getApplicationSecrets } = require('./secret-manager');

const execAsync = promisify(exec);

/**
 * Orthanc Configuration Generator
 * Generates dynamic Orthanc configuration using secrets from secret manager
 */
class OrthancConfigGenerator {
  constructor(options = {}) {
    this.configPath = options.configPath || '/etc/orthanc/orthanc.json';
    this.templatePath = options.templatePath || path.join(__dirname, '../../config-templates/orthanc.template.json');
    this.backupPath = options.backupPath || '/etc/orthanc/orthanc.backup.json';
  }

  /**
   * Generate Orthanc configuration with current secrets
   */
  async generateConfig() {
    try {
      logger.info('Generating Orthanc configuration with secrets');

      // Load configuration template
      const template = await this.loadTemplate();
      
      // Get current secrets
      const secrets = await getApplicationSecrets();
      
      // Generate configuration from template and secrets
      const config = await this.populateTemplate(template, secrets);
      
      // Validate configuration
      this.validateConfig(config);
      
      logger.info('Orthanc configuration generated successfully');
      return config;

    } catch (error) {
      logger.error('Failed to generate Orthanc configuration', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Load configuration template
   */
  async loadTemplate() {
    try {
      const templateContent = await fs.readFile(this.templatePath, 'utf8');
      return JSON.parse(templateContent);
    } catch (error) {
      // If template doesn't exist, use default configuration
      logger.warn('Template not found, using default configuration', {
        templatePath: this.templatePath
      });
      return this.getDefaultTemplate();
    }
  }

  /**
   * Get default Orthanc configuration template
   */
  getDefaultTemplate() {
    return {
      "Name": "{{ORTHANC_NAME}}",
      "DicomAet": "{{ORTHANC_AET}}",
      "DicomPort": "{{ORTHANC_DICOM_PORT}}",
      "HttpPort": "{{ORTHANC_HTTP_PORT}}",
      
      "RemoteAccessAllowed": true,
      "AuthenticationEnabled": true,
      "RegisteredUsers": {
        "{{ORTHANC_USERNAME}}": "{{ORTHANC_PASSWORD}}"
      },
      
      "DicomModalities": {},
      "OrthancPeers": {},
      
      "HttpVerbose": false,
      "DicomVerbose": false,
      
      "StorageDirectory": "/var/lib/orthanc/storage",
      "IndexDirectory": "/var/lib/orthanc/db",
      
      "StorageCompression": false,
      "MaximumStorageSize": 0,
      "MaximumPatientCount": 0,
      
      "DicomAssociationCloseDelay": 5,
      "DicomScuTimeout": 10,
      "DicomScpTimeout": 30,
      
      "HttpTimeout": 60,
      "HttpRequestTimeout": 30,
      
      "UnknownSopClassAccepted": false,
      "DicomCheckModalityHost": false,
      
      "DicomAlwaysAllowEcho": true,
      "DicomAlwaysAllowFind": false,
      "DicomAlwaysAllowMove": false,
      "DicomAlwaysAllowGet": false,
      "DicomAlwaysAllowStore": true,
      
      "DicomCheckCalledAet": false,
      "DicomCheckCallingAet": false,
      
      "ExecuteLuaEnabled": true,
      "HttpsVerifyPeers": true,
      "HttpsCACertificates": "",
      
      "UserMetadata": {},
      "DefaultEncoding": "Latin1",
      "DeidentifyLogs": true,
      "DeidentifyLogsDicomVersion": "2023b",
      
      "LoadPrivateDictionary": true,
      "Dictionary": {},
      
      "SynchronousCMove": true,
      "JobsHistorySize": 10,
      "SaveJobs": true,
      
      "OverwriteInstances": false,
      "MediaArchiveSize": 1,
      
      "StoreMD5ForAttachments": true,
      
      "LimitFindResults": 0,
      "LimitFindInstances": 0,
      
      "LogExportedResources": false,
      "KeepAlive": true,
      "TcpNoDelay": true,
      
      "HttpThreadsCount": 50,
      "HttpDescribeErrors": true,
      
      "DicomTlsEnabled": "{{DICOM_TLS_ENABLED}}",
      "DicomTlsCertificate": "{{DICOM_TLS_CERT_PATH}}",
      "DicomTlsPrivateKey": "{{DICOM_TLS_KEY_PATH}}",
      "DicomTlsTrustedCertificates": "{{DICOM_TLS_CA_PATH}}",
      "DicomTlsRemoteCertificateRequired": true,
      
      "HttpsCertificate": "{{HTTPS_CERT_PATH}}",
      "HttpsPrivateKey": "{{HTTPS_KEY_PATH}}",
      
      "Plugins": [],
      
      "LuaScripts": [
        "/etc/orthanc/webhook-security.lua"
      ]
    };
  }

  /**
   * Populate template with secrets and environment variables
   */
  async populateTemplate(template, secrets) {
    const environment = process.env.NODE_ENV || 'development';
    const bridgeUrl = process.env.BRIDGE_URL || 'http://dicom-bridge:3000';
    
    // Define template variables
    const variables = {
      ORTHANC_NAME: process.env.ORTHANC_NAME || `ORTHANC_${environment.toUpperCase()}_AE`,
      ORTHANC_AET: process.env.ORTHANC_AET || `ORTHANC_${environment.toUpperCase()}_AE`,
      ORTHANC_DICOM_PORT: parseInt(process.env.ORTHANC_DICOM_PORT || '4242'),
      ORTHANC_HTTP_PORT: parseInt(process.env.ORTHANC_HTTP_PORT || '8042'),
      ORTHANC_USERNAME: secrets.orthanc.username,
      ORTHANC_PASSWORD: secrets.orthanc.password,
      WEBHOOK_URL: `${bridgeUrl}/api/orthanc/new-instance`,
      WEBHOOK_SECRET: secrets.webhook.secret,
      DICOM_TLS_ENABLED: process.env.DICOM_TLS_ENABLED === 'true',
      DICOM_TLS_CERT_PATH: process.env.DICOM_TLS_CERT_PATH || '',
      DICOM_TLS_KEY_PATH: process.env.DICOM_TLS_KEY_PATH || '',
      DICOM_TLS_CA_PATH: process.env.DICOM_TLS_CA_PATH || '',
      HTTPS_CERT_PATH: process.env.HTTPS_CERT_PATH || '',
      HTTPS_KEY_PATH: process.env.HTTPS_KEY_PATH || ''
    };

    // Replace template variables
    let configString = JSON.stringify(template, null, 2);
    
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      configString = configString.replace(new RegExp(placeholder, 'g'), value);
    }

    return JSON.parse(configString);
  }

  /**
   * Validate generated configuration
   */
  validateConfig(config) {
    const requiredFields = [
      'Name', 'DicomAet', 'DicomPort', 'HttpPort',
      'RegisteredUsers', 'StorageDirectory', 'IndexDirectory'
    ];

    for (const field of requiredFields) {
      if (!config[field]) {
        throw new Error(`Missing required configuration field: ${field}`);
      }
    }

    // Validate ports
    if (config.DicomPort < 1 || config.DicomPort > 65535) {
      throw new Error(`Invalid DICOM port: ${config.DicomPort}`);
    }

    if (config.HttpPort < 1 || config.HttpPort > 65535) {
      throw new Error(`Invalid HTTP port: ${config.HttpPort}`);
    }

    // Validate users
    if (!config.RegisteredUsers || Object.keys(config.RegisteredUsers).length === 0) {
      throw new Error('No registered users configured');
    }

    logger.info('Orthanc configuration validation passed');
  }

  /**
   * Write configuration to file
   */
  async writeConfig(config) {
    try {
      // Backup existing configuration
      await this.backupExistingConfig();
      
      // Write Lua script with template variables substituted
      await this.writeLuaScript();
      
      // Write new configuration
      const configString = JSON.stringify(config, null, 2);
      await fs.writeFile(this.configPath, configString, 'utf8');
      
      logger.info('Orthanc configuration written successfully', {
        configPath: this.configPath
      });

    } catch (error) {
      logger.error('Failed to write Orthanc configuration', {
        error: error.message,
        configPath: this.configPath
      });
      throw error;
    }
  }

  /**
   * Write Lua script with template variables substituted
   */
  async writeLuaScript() {
    try {
      const luaTemplatePath = path.join(__dirname, '../../config-templates/webhook-security.lua');
      const luaOutputPath = '/etc/orthanc/webhook-security.lua';
      
      // Read Lua template
      const luaTemplate = await fs.readFile(luaTemplatePath, 'utf8');
      
      // Get secrets for template substitution
      const secrets = await getApplicationSecrets();
      const environment = process.env.NODE_ENV || 'development';
      const bridgeUrl = process.env.BRIDGE_URL || 'http://dicom-bridge:3000';
      
      // Define template variables for Lua script
      const variables = {
        WEBHOOK_URL: `${bridgeUrl}/api/webhook/new-instance`,
        WEBHOOK_SECRET: secrets.webhook.secret || secrets.webhook.hmac_secret
      };

      // Replace template variables in Lua script
      let luaScript = luaTemplate;
      for (const [key, value] of Object.entries(variables)) {
        const placeholder = `{{${key}}}`;
        luaScript = luaScript.replace(new RegExp(placeholder, 'g'), value);
      }

      // Write Lua script to Orthanc directory
      await fs.writeFile(luaOutputPath, luaScript, 'utf8');
      
      logger.info('Orthanc Lua script written successfully', {
        luaOutputPath
      });

    } catch (error) {
      logger.error('Failed to write Orthanc Lua script', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Backup existing configuration
   */
  async backupExistingConfig() {
    try {
      const stats = await fs.stat(this.configPath);
      if (stats.isFile()) {
        await fs.copyFile(this.configPath, this.backupPath);
        logger.info('Existing configuration backed up', {
          backupPath: this.backupPath
        });
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        logger.warn('Failed to backup existing configuration', {
          error: error.message
        });
      }
    }
  }

  /**
   * Restore configuration from backup
   */
  async restoreFromBackup() {
    try {
      await fs.copyFile(this.backupPath, this.configPath);
      logger.info('Configuration restored from backup');
    } catch (error) {
      logger.error('Failed to restore configuration from backup', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Generate and write configuration
   */
  async updateConfiguration() {
    try {
      const config = await this.generateConfig();
      await this.writeConfig(config);
      return config;
    } catch (error) {
      logger.error('Failed to update Orthanc configuration', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Restart Orthanc service for credential rotation
   */
  async restartOrthancService() {
    try {
      logger.info('Restarting Orthanc service for credential rotation');

      // Check if running in Docker environment
      const isDocker = process.env.DOCKER_ENV === 'true' || 
                      await this.isRunningInDocker();

      if (isDocker) {
        // Restart Orthanc container
        await this.restartOrthancContainer();
      } else {
        // Restart Orthanc system service
        await this.restartOrthancSystemService();
      }

      // Wait for Orthanc to be ready
      await this.waitForOrthancReady();

      logger.info('Orthanc service restarted successfully');

    } catch (error) {
      logger.error('Failed to restart Orthanc service', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Check if running in Docker environment
   */
  async isRunningInDocker() {
    try {
      await fs.access('/.dockerenv');
      return true;
    } catch {
      try {
        const { stdout } = await execAsync('cat /proc/1/cgroup');
        return stdout.includes('docker') || stdout.includes('containerd');
      } catch {
        return false;
      }
    }
  }

  /**
   * Restart Orthanc Docker container
   */
  async restartOrthancContainer() {
    try {
      const containerName = process.env.ORTHANC_CONTAINER_NAME || 'orthanc';
      
      logger.info('Restarting Orthanc Docker container', { containerName });

      // Use docker-compose if available, otherwise use docker directly
      try {
        await execAsync(`docker-compose restart ${containerName}`);
      } catch {
        await execAsync(`docker restart ${containerName}`);
      }

    } catch (error) {
      logger.error('Failed to restart Orthanc container', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Restart Orthanc system service
   */
  async restartOrthancSystemService() {
    try {
      const serviceName = process.env.ORTHANC_SERVICE_NAME || 'orthanc';
      
      logger.info('Restarting Orthanc system service', { serviceName });

      // Try systemctl first, then service command
      try {
        await execAsync(`systemctl restart ${serviceName}`);
      } catch {
        await execAsync(`service ${serviceName} restart`);
      }

    } catch (error) {
      logger.error('Failed to restart Orthanc system service', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Wait for Orthanc to be ready after restart
   */
  async waitForOrthancReady(maxAttempts = 30, delayMs = 2000) {
    const orthancUrl = process.env.ORTHANC_URL || 'http://orthanc:8042';
    
    logger.info('Waiting for Orthanc to be ready', { 
      orthancUrl, 
      maxAttempts, 
      delayMs 
    });

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // Import axios here to avoid circular dependencies
        const axios = require('axios');
        
        const response = await axios.get(`${orthancUrl}/system`, {
          timeout: 5000,
          auth: {
            username: process.env.ORTHANC_USERNAME,
            password: process.env.ORTHANC_PASSWORD
          }
        });

        if (response.status === 200) {
          logger.info('Orthanc is ready', { attempt });
          return;
        }

      } catch (error) {
        logger.debug('Orthanc not ready yet', { 
          attempt, 
          error: error.message 
        });
      }

      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    throw new Error(`Orthanc not ready after ${maxAttempts} attempts`);
  }

  /**
   * Handle credential rotation with configuration update and restart
   */
  async handleCredentialRotation() {
    try {
      logger.info('Handling Orthanc credential rotation');

      // Generate new configuration with rotated secrets
      const config = await this.updateConfiguration();

      // Restart Orthanc service to apply new configuration
      await this.restartOrthancService();

      logger.info('Orthanc credential rotation completed successfully');
      return config;

    } catch (error) {
      logger.error('Failed to handle credential rotation', {
        error: error.message
      });

      // Attempt to restore from backup if available
      try {
        await this.restoreFromBackup();
        await this.restartOrthancService();
        logger.warn('Restored Orthanc configuration from backup after rotation failure');
      } catch (restoreError) {
        logger.error('Failed to restore from backup', {
          error: restoreError.message
        });
      }

      throw error;
    }
  }
}

module.exports = {
  OrthancConfigGenerator
};