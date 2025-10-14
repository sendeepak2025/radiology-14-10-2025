/**
 * Certificate Management Service for Orthanc Bridge
 * Handles certificate auto-renewal, validation, and rotation without service downtime
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const EventEmitter = require('events');

class CertificateManager extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.config = {
            certsDir: options.certsDir || '/app/certs',
            renewalThresholdDays: options.renewalThresholdDays || 30,
            checkIntervalHours: options.checkIntervalHours || 24,
            backupRetentionDays: options.backupRetentionDays || 90,
            enableAutoRenewal: options.enableAutoRenewal !== false,
            notificationWebhook: options.notificationWebhook || null,
            ...options
        };
        
        this.certificates = new Map();
        this.renewalTimer = null;
        this.isRenewing = false;
        
        // Certificate types and their configurations
        this.certTypes = {
            'dicom-tls': {
                certFile: 'dicom-tls.crt',
                keyFile: 'dicom-tls.key',
                caFile: 'dicom-ca.crt',
                description: 'DICOM-TLS Server Certificate',
                critical: true
            },
            'orthanc-https': {
                certFile: 'orthanc-https.crt',
                keyFile: 'orthanc-https.key',
                caFile: 'dicom-ca.crt',
                description: 'Orthanc HTTPS Certificate',
                critical: true
            },
            'nginx-tls': {
                certFile: 'orthanc.crt',
                keyFile: 'orthanc.key',
                caFile: 'ca-chain.crt',
                description: 'Nginx TLS Certificate',
                critical: false
            },
            'bridge-tls': {
                certFile: 'bridge.crt',
                keyFile: 'bridge.key',
                caFile: 'ca-chain.crt',
                description: 'Bridge TLS Certificate',
                critical: false
            }
        };
        
        this.logger = options.logger || console;
    }
    
    /**
     * Initialize the certificate manager
     */
    async initialize() {
        try {
            this.logger.info('Initializing Certificate Manager...');
            
            // Load existing certificates
            await this.loadCertificates();
            
            // Start monitoring if auto-renewal is enabled
            if (this.config.enableAutoRenewal) {
                this.startMonitoring();
            }
            
            this.logger.info('Certificate Manager initialized successfully');
            this.emit('initialized');
            
        } catch (error) {
            this.logger.error('Failed to initialize Certificate Manager:', error);
            this.emit('error', error);
            throw error;
        }
    }
    
    /**
     * Load and validate all certificates
     */
    async loadCertificates() {
        this.logger.info('Loading certificates...');
        
        for (const [type, config] of Object.entries(this.certTypes)) {
            try {
                const certInfo = await this.loadCertificate(type, config);
                if (certInfo) {
                    this.certificates.set(type, certInfo);
                    this.logger.info(`Loaded ${config.description}: expires ${certInfo.expiryDate}`);
                }
            } catch (error) {
                this.logger.warn(`Failed to load ${config.description}:`, error.message);
                if (config.critical) {
                    throw new Error(`Critical certificate ${type} is missing or invalid`);
                }
            }
        }
        
        this.logger.info(`Loaded ${this.certificates.size} certificates`);
    }
    
    /**
     * Load and validate a single certificate
     */
    async loadCertificate(type, config) {
        const certPath = path.join(this.config.certsDir, config.certFile);
        const keyPath = path.join(this.config.certsDir, config.keyFile);
        const caPath = path.join(this.config.certsDir, config.caFile);
        
        // Check if certificate files exist
        try {
            await fs.access(certPath);
            await fs.access(keyPath);
        } catch (error) {
            throw new Error(`Certificate files not found for ${type}`);
        }
        
        // Read certificate content
        const certContent = await fs.readFile(certPath, 'utf8');
        const keyContent = await fs.readFile(keyPath, 'utf8');
        
        // Parse certificate information
        const certInfo = await this.parseCertificate(certContent);
        
        // Validate certificate-key pair
        if (!await this.validateCertificateKeyPair(certContent, keyContent)) {
            throw new Error(`Certificate and key do not match for ${type}`);
        }
        
        // Validate certificate chain if CA is available
        if (await this.fileExists(caPath)) {
            const caContent = await fs.readFile(caPath, 'utf8');
            if (!await this.validateCertificateChain(certContent, caContent)) {
                this.logger.warn(`Certificate chain validation failed for ${type}`);
            }
        }
        
        return {
            type,
            certPath,
            keyPath,
            caPath,
            certContent,
            keyContent,
            ...certInfo,
            lastChecked: new Date(),
            config
        };
    }
    
    /**
     * Parse certificate information using OpenSSL
     */
    async parseCertificate(certContent) {
        return new Promise((resolve, reject) => {
            const openssl = spawn('openssl', ['x509', '-noout', '-dates', '-subject', '-issuer']);
            
            let output = '';
            let error = '';
            
            openssl.stdout.on('data', (data) => {
                output += data.toString();
            });
            
            openssl.stderr.on('data', (data) => {
                error += data.toString();
            });
            
            openssl.on('close', (code) => {
                if (code !== 0) {
                    reject(new Error(`OpenSSL error: ${error}`));
                    return;
                }
                
                try {
                    const lines = output.split('\n');
                    const notBefore = lines.find(line => line.startsWith('notBefore='))?.split('=')[1];
                    const notAfter = lines.find(line => line.startsWith('notAfter='))?.split('=')[1];
                    const subject = lines.find(line => line.startsWith('subject='))?.split('=', 2)[1];
                    const issuer = lines.find(line => line.startsWith('issuer='))?.split('=', 2)[1];
                    
                    const expiryDate = new Date(notAfter);
                    const issueDate = new Date(notBefore);
                    const daysUntilExpiry = Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24));
                    
                    resolve({
                        subject,
                        issuer,
                        issueDate,
                        expiryDate,
                        daysUntilExpiry,
                        isExpired: daysUntilExpiry <= 0,
                        needsRenewal: daysUntilExpiry <= this.config.renewalThresholdDays
                    });
                } catch (parseError) {
                    reject(new Error(`Failed to parse certificate info: ${parseError.message}`));
                }
            });
            
            openssl.stdin.write(certContent);
            openssl.stdin.end();
        });
    }
    
    /**
     * Validate that certificate and private key match
     */
    async validateCertificateKeyPair(certContent, keyContent) {
        try {
            const certHash = await this.getCertificateModulusHash(certContent);
            const keyHash = await this.getPrivateKeyModulusHash(keyContent);
            return certHash === keyHash;
        } catch (error) {
            this.logger.error('Certificate-key validation error:', error);
            return false;
        }
    }
    
    /**
     * Get certificate modulus hash
     */
    async getCertificateModulusHash(certContent) {
        return new Promise((resolve, reject) => {
            const openssl = spawn('openssl', ['x509', '-noout', '-modulus']);
            
            let output = '';
            let error = '';
            
            openssl.stdout.on('data', (data) => {
                output += data.toString();
            });
            
            openssl.stderr.on('data', (data) => {
                error += data.toString();
            });
            
            openssl.on('close', (code) => {
                if (code !== 0) {
                    reject(new Error(`OpenSSL error: ${error}`));
                    return;
                }
                
                const hash = crypto.createHash('md5').update(output).digest('hex');
                resolve(hash);
            });
            
            openssl.stdin.write(certContent);
            openssl.stdin.end();
        });
    }
    
    /**
     * Get private key modulus hash
     */
    async getPrivateKeyModulusHash(keyContent) {
        return new Promise((resolve, reject) => {
            const openssl = spawn('openssl', ['rsa', '-noout', '-modulus']);
            
            let output = '';
            let error = '';
            
            openssl.stdout.on('data', (data) => {
                output += data.toString();
            });
            
            openssl.stderr.on('data', (data) => {
                error += data.toString();
            });
            
            openssl.on('close', (code) => {
                if (code !== 0) {
                    reject(new Error(`OpenSSL error: ${error}`));
                    return;
                }
                
                const hash = crypto.createHash('md5').update(output).digest('hex');
                resolve(hash);
            });
            
            openssl.stdin.write(keyContent);
            openssl.stdin.end();
        });
    }
    
    /**
     * Validate certificate chain
     */
    async validateCertificateChain(certContent, caContent) {
        return new Promise((resolve) => {
            const openssl = spawn('openssl', ['verify', '-CAfile', '/dev/stdin']);
            
            let error = '';
            
            openssl.stderr.on('data', (data) => {
                error += data.toString();
            });
            
            openssl.on('close', (code) => {
                resolve(code === 0);
            });
            
            // Write CA content to stdin, then certificate
            openssl.stdin.write(caContent);
            openssl.stdin.write('\n');
            openssl.stdin.write(certContent);
            openssl.stdin.end();
        });
    }
    
    /**
     * Start certificate monitoring
     */
    startMonitoring() {
        if (this.renewalTimer) {
            clearInterval(this.renewalTimer);
        }
        
        const intervalMs = this.config.checkIntervalHours * 60 * 60 * 1000;
        
        this.renewalTimer = setInterval(async () => {
            try {
                await this.checkAndRenewCertificates();
            } catch (error) {
                this.logger.error('Certificate monitoring error:', error);
                this.emit('error', error);
            }
        }, intervalMs);
        
        this.logger.info(`Certificate monitoring started (checking every ${this.config.checkIntervalHours} hours)`);
        
        // Initial check
        setTimeout(() => this.checkAndRenewCertificates(), 5000);
    }
    
    /**
     * Stop certificate monitoring
     */
    stopMonitoring() {
        if (this.renewalTimer) {
            clearInterval(this.renewalTimer);
            this.renewalTimer = null;
            this.logger.info('Certificate monitoring stopped');
        }
    }
    
    /**
     * Check all certificates and renew if needed
     */
    async checkAndRenewCertificates() {
        if (this.isRenewing) {
            this.logger.info('Certificate renewal already in progress, skipping check');
            return;
        }
        
        this.logger.info('Checking certificates for renewal...');
        
        try {
            // Reload certificates to get current status
            await this.loadCertificates();
            
            const renewalNeeded = [];
            const expiredCerts = [];
            
            for (const [type, certInfo] of this.certificates) {
                if (certInfo.isExpired) {
                    expiredCerts.push(type);
                } else if (certInfo.needsRenewal) {
                    renewalNeeded.push(type);
                }
                
                this.logger.info(`${certInfo.config.description}: ${certInfo.daysUntilExpiry} days until expiry`);
            }
            
            // Alert about expired certificates
            if (expiredCerts.length > 0) {
                const message = `CRITICAL: Expired certificates detected: ${expiredCerts.join(', ')}`;
                this.logger.error(message);
                await this.sendNotification('CRITICAL', message);
                this.emit('certificatesExpired', expiredCerts);
            }
            
            // Renew certificates that need renewal
            if (renewalNeeded.length > 0) {
                const message = `Certificates need renewal: ${renewalNeeded.join(', ')}`;
                this.logger.warn(message);
                await this.sendNotification('WARNING', message);
                
                for (const type of renewalNeeded) {
                    await this.renewCertificate(type);
                }
            } else {
                this.logger.info('No certificates need renewal at this time');
            }
            
        } catch (error) {
            this.logger.error('Certificate check failed:', error);
            await this.sendNotification('ERROR', `Certificate check failed: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Renew a specific certificate
     */
    async renewCertificate(type) {
        if (this.isRenewing) {
            throw new Error('Certificate renewal already in progress');
        }
        
        this.isRenewing = true;
        
        try {
            this.logger.info(`Starting renewal for certificate: ${type}`);
            
            const certInfo = this.certificates.get(type);
            if (!certInfo) {
                throw new Error(`Certificate ${type} not found`);
            }
            
            // Create backup before renewal
            const backupDir = await this.createCertificateBackup(type);
            
            try {
                // Determine renewal method based on certificate type
                if (type.includes('nginx') || type.includes('bridge')) {
                    await this.renewNginxCertificate(type, certInfo);
                } else {
                    await this.renewDicomCertificate(type, certInfo);
                }
                
                // Validate renewed certificate
                const newCertInfo = await this.loadCertificate(type, certInfo.config);
                this.certificates.set(type, newCertInfo);
                
                // Trigger service reload if needed
                await this.reloadServices(type);
                
                this.logger.info(`Certificate ${type} renewed successfully`);
                await this.sendNotification('SUCCESS', `Certificate ${type} renewed successfully`);
                this.emit('certificateRenewed', type, newCertInfo);
                
            } catch (renewalError) {
                // Restore backup on failure
                this.logger.error(`Certificate renewal failed for ${type}:`, renewalError);
                await this.restoreCertificateBackup(type, backupDir);
                throw renewalError;
            }
            
        } finally {
            this.isRenewing = false;
        }
    }
    
    /**
     * Renew DICOM certificate using internal CA
     */
    async renewDicomCertificate(type, certInfo) {
        this.logger.info(`Renewing DICOM certificate: ${type}`);
        
        // Use the generate-dicom-tls-certs.sh script for renewal
        const scriptPath = path.join(__dirname, '../../orthanc-config/generate-dicom-tls-certs.sh');
        
        return new Promise((resolve, reject) => {
            const renewal = spawn('bash', [scriptPath], {
                env: {
                    ...process.env,
                    VALIDITY_DAYS: '365',
                    ORTHANC_AET: process.env.ORTHANC_AET || 'ORTHANC_PROD_AE',
                    ORTHANC_HOST: process.env.ORTHANC_HOST || 'orthanc.hospital.local'
                }
            });
            
            let output = '';
            let error = '';
            
            renewal.stdout.on('data', (data) => {
                output += data.toString();
            });
            
            renewal.stderr.on('data', (data) => {
                error += data.toString();
            });
            
            renewal.on('close', (code) => {
                if (code === 0) {
                    this.logger.info('DICOM certificate renewal completed');
                    resolve();
                } else {
                    reject(new Error(`Certificate renewal failed: ${error}`));
                }
            });
        });
    }
    
    /**
     * Renew Nginx certificate using Let's Encrypt or self-signed
     */
    async renewNginxCertificate(type, certInfo) {
        this.logger.info(`Renewing Nginx certificate: ${type}`);
        
        // Use the renew-certs.sh script for renewal
        const scriptPath = path.join(__dirname, '../../nginx-config/renew-certs.sh');
        
        return new Promise((resolve, reject) => {
            const renewal = spawn('bash', [scriptPath, '-f'], {
                env: {
                    ...process.env,
                    CERT_TYPE: process.env.CERT_TYPE || 'self-signed',
                    NGINX_CONTAINER: process.env.NGINX_CONTAINER || 'nginx-tls-proxy'
                }
            });
            
            let output = '';
            let error = '';
            
            renewal.stdout.on('data', (data) => {
                output += data.toString();
            });
            
            renewal.stderr.on('data', (data) => {
                error += data.toString();
            });
            
            renewal.on('close', (code) => {
                if (code === 0) {
                    this.logger.info('Nginx certificate renewal completed');
                    resolve();
                } else {
                    reject(new Error(`Certificate renewal failed: ${error}`));
                }
            });
        });
    }
    
    /**
     * Create backup of certificate before renewal
     */
    async createCertificateBackup(type) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupDir = path.join(this.config.certsDir, 'backups', `${type}-${timestamp}`);
        
        await fs.mkdir(backupDir, { recursive: true });
        
        const certInfo = this.certificates.get(type);
        if (certInfo) {
            await fs.copyFile(certInfo.certPath, path.join(backupDir, path.basename(certInfo.certPath)));
            await fs.copyFile(certInfo.keyPath, path.join(backupDir, path.basename(certInfo.keyPath)));
            
            // Copy CA file if it exists
            if (await this.fileExists(certInfo.caPath)) {
                await fs.copyFile(certInfo.caPath, path.join(backupDir, path.basename(certInfo.caPath)));
            }
        }
        
        this.logger.info(`Certificate backup created: ${backupDir}`);
        return backupDir;
    }
    
    /**
     * Restore certificate from backup
     */
    async restoreCertificateBackup(type, backupDir) {
        this.logger.info(`Restoring certificate backup for ${type} from ${backupDir}`);
        
        const certInfo = this.certificates.get(type);
        if (!certInfo) {
            throw new Error(`Certificate info not found for ${type}`);
        }
        
        try {
            await fs.copyFile(
                path.join(backupDir, path.basename(certInfo.certPath)),
                certInfo.certPath
            );
            await fs.copyFile(
                path.join(backupDir, path.basename(certInfo.keyPath)),
                certInfo.keyPath
            );
            
            this.logger.info(`Certificate ${type} restored from backup`);
        } catch (error) {
            this.logger.error(`Failed to restore certificate ${type}:`, error);
            throw error;
        }
    }
    
    /**
     * Reload services after certificate renewal
     */
    async reloadServices(certificateType) {
        this.logger.info(`Reloading services for certificate type: ${certificateType}`);
        
        try {
            if (certificateType.includes('nginx')) {
                await this.reloadNginx();
            }
            
            if (certificateType.includes('dicom') || certificateType.includes('orthanc')) {
                await this.reloadOrthanc();
            }
            
            // Emit event for other services to handle
            this.emit('certificateReloaded', certificateType);
            
        } catch (error) {
            this.logger.error(`Failed to reload services for ${certificateType}:`, error);
            throw error;
        }
    }
    
    /**
     * Reload Nginx configuration
     */
    async reloadNginx() {
        return new Promise((resolve, reject) => {
            const nginx = spawn('docker', ['exec', 'nginx-tls-proxy', 'nginx', '-s', 'reload']);
            
            nginx.on('close', (code) => {
                if (code === 0) {
                    this.logger.info('Nginx reloaded successfully');
                    resolve();
                } else {
                    reject(new Error(`Nginx reload failed with code ${code}`));
                }
            });
        });
    }
    
    /**
     * Reload Orthanc configuration (restart required for certificate changes)
     */
    async reloadOrthanc() {
        return new Promise((resolve, reject) => {
            const orthanc = spawn('docker', ['restart', 'orthanc-dev']);
            
            orthanc.on('close', (code) => {
                if (code === 0) {
                    this.logger.info('Orthanc restarted successfully');
                    resolve();
                } else {
                    reject(new Error(`Orthanc restart failed with code ${code}`));
                }
            });
        });
    }
    
    /**
     * Clean up old certificate backups
     */
    async cleanupOldBackups() {
        const backupsDir = path.join(this.config.certsDir, 'backups');
        
        try {
            const entries = await fs.readdir(backupsDir, { withFileTypes: true });
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - this.config.backupRetentionDays);
            
            for (const entry of entries) {
                if (entry.isDirectory()) {
                    const backupPath = path.join(backupsDir, entry.name);
                    const stats = await fs.stat(backupPath);
                    
                    if (stats.mtime < cutoffDate) {
                        await fs.rm(backupPath, { recursive: true });
                        this.logger.info(`Removed old backup: ${entry.name}`);
                    }
                }
            }
        } catch (error) {
            this.logger.warn('Failed to cleanup old backups:', error);
        }
    }
    
    /**
     * Send notification about certificate events
     */
    async sendNotification(level, message) {
        if (!this.config.notificationWebhook) {
            return;
        }
        
        try {
            const payload = {
                level,
                message,
                timestamp: new Date().toISOString(),
                service: 'certificate-manager'
            };
            
            const response = await fetch(this.config.notificationWebhook, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            
            if (!response.ok) {
                throw new Error(`Notification failed: ${response.status}`);
            }
            
        } catch (error) {
            this.logger.error('Failed to send notification:', error);
        }
    }
    
    /**
     * Get certificate status summary
     */
    getCertificateStatus() {
        const status = {
            totalCertificates: this.certificates.size,
            expiredCertificates: 0,
            expiringCertificates: 0,
            validCertificates: 0,
            certificates: []
        };
        
        for (const [type, certInfo] of this.certificates) {
            const certStatus = {
                type,
                description: certInfo.config.description,
                subject: certInfo.subject,
                issuer: certInfo.issuer,
                issueDate: certInfo.issueDate,
                expiryDate: certInfo.expiryDate,
                daysUntilExpiry: certInfo.daysUntilExpiry,
                isExpired: certInfo.isExpired,
                needsRenewal: certInfo.needsRenewal,
                critical: certInfo.config.critical
            };
            
            if (certInfo.isExpired) {
                status.expiredCertificates++;
            } else if (certInfo.needsRenewal) {
                status.expiringCertificates++;
            } else {
                status.validCertificates++;
            }
            
            status.certificates.push(certStatus);
        }
        
        return status;
    }
    
    /**
     * Force renewal of all certificates
     */
    async forceRenewalAll() {
        this.logger.info('Forcing renewal of all certificates...');
        
        for (const type of this.certificates.keys()) {
            try {
                await this.renewCertificate(type);
            } catch (error) {
                this.logger.error(`Failed to renew certificate ${type}:`, error);
            }
        }
    }
    
    /**
     * Utility method to check if file exists
     */
    async fileExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }
    
    /**
     * Shutdown the certificate manager
     */
    async shutdown() {
        this.logger.info('Shutting down Certificate Manager...');
        
        this.stopMonitoring();
        
        // Clean up old backups before shutdown
        await this.cleanupOldBackups();
        
        this.emit('shutdown');
        this.logger.info('Certificate Manager shutdown complete');
    }
}

module.exports = CertificateManager;