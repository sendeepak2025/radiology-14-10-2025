/**
 * Certificate Management API Routes
 * Provides endpoints for certificate monitoring, renewal, and status
 */

const express = require('express');
const router = express.Router();

/**
 * Get certificate status for all managed certificates
 */
router.get('/status', async (req, res) => {
    try {
        const certificateManager = req.app.get('certificateManager');
        
        if (!certificateManager) {
            return res.status(503).json({
                error: 'Certificate Manager not available',
                message: 'Certificate management service is not initialized'
            });
        }
        
        const status = certificateManager.getCertificateStatus();
        
        res.json({
            success: true,
            data: status,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        res.status(500).json({
            error: 'Failed to get certificate status',
            message: error.message
        });
    }
});

/**
 * Get detailed information about a specific certificate
 */
router.get('/status/:type', async (req, res) => {
    try {
        const { type } = req.params;
        const certificateManager = req.app.get('certificateManager');
        
        if (!certificateManager) {
            return res.status(503).json({
                error: 'Certificate Manager not available'
            });
        }
        
        const certificate = certificateManager.certificates.get(type);
        
        if (!certificate) {
            return res.status(404).json({
                error: 'Certificate not found',
                message: `Certificate type '${type}' not found`
            });
        }
        
        res.json({
            success: true,
            data: {
                type: certificate.type,
                description: certificate.config.description,
                subject: certificate.subject,
                issuer: certificate.issuer,
                issueDate: certificate.issueDate,
                expiryDate: certificate.expiryDate,
                daysUntilExpiry: certificate.daysUntilExpiry,
                isExpired: certificate.isExpired,
                needsRenewal: certificate.needsRenewal,
                critical: certificate.config.critical,
                lastChecked: certificate.lastChecked,
                certPath: certificate.certPath,
                keyPath: certificate.keyPath
            },
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        res.status(500).json({
            error: 'Failed to get certificate information',
            message: error.message
        });
    }
});

/**
 * Trigger certificate renewal check
 */
router.post('/check', async (req, res) => {
    try {
        const certificateManager = req.app.get('certificateManager');
        
        if (!certificateManager) {
            return res.status(503).json({
                error: 'Certificate Manager not available'
            });
        }
        
        // Trigger certificate check in background
        certificateManager.checkAndRenewCertificates()
            .catch(error => {
                console.error('Certificate check failed:', error);
            });
        
        res.json({
            success: true,
            message: 'Certificate renewal check initiated',
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        res.status(500).json({
            error: 'Failed to initiate certificate check',
            message: error.message
        });
    }
});

/**
 * Force renewal of a specific certificate
 */
router.post('/renew/:type', async (req, res) => {
    try {
        const { type } = req.params;
        const certificateManager = req.app.get('certificateManager');
        
        if (!certificateManager) {
            return res.status(503).json({
                error: 'Certificate Manager not available'
            });
        }
        
        if (!certificateManager.certificates.has(type)) {
            return res.status(404).json({
                error: 'Certificate not found',
                message: `Certificate type '${type}' not found`
            });
        }
        
        // Start renewal in background
        certificateManager.renewCertificate(type)
            .then(() => {
                console.log(`Certificate ${type} renewed successfully`);
            })
            .catch(error => {
                console.error(`Certificate ${type} renewal failed:`, error);
            });
        
        res.json({
            success: true,
            message: `Certificate renewal initiated for ${type}`,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        res.status(500).json({
            error: 'Failed to initiate certificate renewal',
            message: error.message
        });
    }
});

/**
 * Force renewal of all certificates
 */
router.post('/renew-all', async (req, res) => {
    try {
        const certificateManager = req.app.get('certificateManager');
        
        if (!certificateManager) {
            return res.status(503).json({
                error: 'Certificate Manager not available'
            });
        }
        
        // Start renewal in background
        certificateManager.forceRenewalAll()
            .then(() => {
                console.log('All certificates renewal completed');
            })
            .catch(error => {
                console.error('Certificate renewal failed:', error);
            });
        
        res.json({
            success: true,
            message: 'Certificate renewal initiated for all certificates',
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        res.status(500).json({
            error: 'Failed to initiate certificate renewal',
            message: error.message
        });
    }
});

/**
 * Get certificate expiry alerts
 */
router.get('/alerts', async (req, res) => {
    try {
        const certificateManager = req.app.get('certificateManager');
        
        if (!certificateManager) {
            return res.status(503).json({
                error: 'Certificate Manager not available'
            });
        }
        
        const status = certificateManager.getCertificateStatus();
        const alerts = [];
        
        for (const cert of status.certificates) {
            if (cert.isExpired) {
                alerts.push({
                    level: 'critical',
                    type: cert.type,
                    description: cert.description,
                    message: `Certificate has expired ${Math.abs(cert.daysUntilExpiry)} days ago`,
                    expiryDate: cert.expiryDate,
                    critical: cert.critical
                });
            } else if (cert.needsRenewal) {
                alerts.push({
                    level: 'warning',
                    type: cert.type,
                    description: cert.description,
                    message: `Certificate expires in ${cert.daysUntilExpiry} days`,
                    expiryDate: cert.expiryDate,
                    critical: cert.critical
                });
            }
        }
        
        res.json({
            success: true,
            data: {
                alertCount: alerts.length,
                criticalAlerts: alerts.filter(a => a.level === 'critical').length,
                warningAlerts: alerts.filter(a => a.level === 'warning').length,
                alerts: alerts.sort((a, b) => {
                    // Sort by level (critical first) then by days until expiry
                    if (a.level !== b.level) {
                        return a.level === 'critical' ? -1 : 1;
                    }
                    return a.daysUntilExpiry - b.daysUntilExpiry;
                })
            },
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        res.status(500).json({
            error: 'Failed to get certificate alerts',
            message: error.message
        });
    }
});

/**
 * Get certificate monitoring configuration
 */
router.get('/config', async (req, res) => {
    try {
        const certificateManager = req.app.get('certificateManager');
        
        if (!certificateManager) {
            return res.status(503).json({
                error: 'Certificate Manager not available'
            });
        }
        
        res.json({
            success: true,
            data: {
                renewalThresholdDays: certificateManager.config.renewalThresholdDays,
                checkIntervalHours: certificateManager.config.checkIntervalHours,
                backupRetentionDays: certificateManager.config.backupRetentionDays,
                enableAutoRenewal: certificateManager.config.enableAutoRenewal,
                certsDir: certificateManager.config.certsDir,
                monitoringActive: certificateManager.renewalTimer !== null,
                supportedCertificateTypes: Object.keys(certificateManager.certTypes)
            },
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        res.status(500).json({
            error: 'Failed to get certificate configuration',
            message: error.message
        });
    }
});

/**
 * Health check endpoint for certificate management
 */
router.get('/health', async (req, res) => {
    try {
        const certificateManager = req.app.get('certificateManager');
        
        if (!certificateManager) {
            return res.status(503).json({
                healthy: false,
                error: 'Certificate Manager not available'
            });
        }
        
        const status = certificateManager.getCertificateStatus();
        const hasExpiredCritical = status.certificates.some(cert => cert.isExpired && cert.critical);
        
        res.status(hasExpiredCritical ? 503 : 200).json({
            healthy: !hasExpiredCritical,
            certificateManager: {
                initialized: true,
                monitoring: certificateManager.renewalTimer !== null,
                totalCertificates: status.totalCertificates,
                expiredCertificates: status.expiredCertificates,
                expiringCertificates: status.expiringCertificates,
                criticalExpired: hasExpiredCritical
            },
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        res.status(500).json({
            healthy: false,
            error: error.message
        });
    }
});

module.exports = router;