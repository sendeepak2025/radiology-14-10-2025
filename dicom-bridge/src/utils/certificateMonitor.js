/**
 * Certificate Monitoring Utilities
 * Provides monitoring, alerting, and reporting functions for certificate management
 */

const EventEmitter = require('events');

class CertificateMonitor extends EventEmitter {
    constructor(certificateManager, options = {}) {
        super();
        
        this.certificateManager = certificateManager;
        this.config = {
            alertThresholds: {
                critical: 7,    // Days until expiry for critical alerts
                warning: 30,    // Days until expiry for warning alerts
                info: 60        // Days until expiry for info alerts
            },
            checkInterval: options.checkInterval || 3600000, // 1 hour in milliseconds
            enableSlackAlerts: options.enableSlackAlerts || false,
            slackWebhookUrl: options.slackWebhookUrl || null,
            enableEmailAlerts: options.enableEmailAlerts || false,
            emailConfig: options.emailConfig || null,
            ...options
        };
        
        this.alertHistory = new Map();
        this.monitoringTimer = null;
        this.logger = options.logger || console;
        
        // Bind to certificate manager events
        this.setupEventHandlers();
    }
    
    /**
     * Set up event handlers for certificate manager events
     */
    setupEventHandlers() {
        if (!this.certificateManager) {
            return;
        }
        
        this.certificateManager.on('certificateRenewed', (type, certInfo) => {
            this.handleCertificateRenewed(type, certInfo);
        });
        
        this.certificateManager.on('certificatesExpired', (expiredTypes) => {
            this.handleCertificatesExpired(expiredTypes);
        });
        
        this.certificateManager.on('error', (error) => {
            this.handleCertificateError(error);
        });
    }
    
    /**
     * Start certificate monitoring
     */
    startMonitoring() {
        if (this.monitoringTimer) {
            this.stopMonitoring();
        }
        
        this.monitoringTimer = setInterval(() => {
            this.performMonitoringCheck();
        }, this.config.checkInterval);
        
        this.logger.info('Certificate monitoring started');
        
        // Perform initial check
        setTimeout(() => this.performMonitoringCheck(), 5000);
    }
    
    /**
     * Stop certificate monitoring
     */
    stopMonitoring() {
        if (this.monitoringTimer) {
            clearInterval(this.monitoringTimer);
            this.monitoringTimer = null;
            this.logger.info('Certificate monitoring stopped');
        }
    }
    
    /**
     * Perform monitoring check and generate alerts
     */
    async performMonitoringCheck() {
        try {
            if (!this.certificateManager) {
                return;
            }
            
            const status = this.certificateManager.getCertificateStatus();
            const alerts = this.generateAlerts(status);
            
            // Process alerts
            for (const alert of alerts) {
                await this.processAlert(alert);
            }
            
            // Generate monitoring report
            const report = this.generateMonitoringReport(status, alerts);
            this.emit('monitoringReport', report);
            
        } catch (error) {
            this.logger.error('Certificate monitoring check failed:', error);
            this.emit('monitoringError', error);
        }
    }
    
    /**
     * Generate alerts based on certificate status
     */
    generateAlerts(status) {
        const alerts = [];
        const now = new Date();
        
        for (const cert of status.certificates) {
            const alertKey = `${cert.type}-${cert.expiryDate}`;
            const lastAlert = this.alertHistory.get(alertKey);
            
            let alertLevel = null;
            let message = '';
            
            if (cert.isExpired) {
                alertLevel = 'critical';
                message = `Certificate '${cert.description}' has expired ${Math.abs(cert.daysUntilExpiry)} days ago`;
            } else if (cert.daysUntilExpiry <= this.config.alertThresholds.critical) {
                alertLevel = 'critical';
                message = `Certificate '${cert.description}' expires in ${cert.daysUntilExpiry} days`;
            } else if (cert.daysUntilExpiry <= this.config.alertThresholds.warning) {
                alertLevel = 'warning';
                message = `Certificate '${cert.description}' expires in ${cert.daysUntilExpiry} days`;
            } else if (cert.daysUntilExpiry <= this.config.alertThresholds.info) {
                alertLevel = 'info';
                message = `Certificate '${cert.description}' expires in ${cert.daysUntilExpiry} days`;
            }
            
            if (alertLevel) {
                // Check if we should send this alert (avoid spam)
                const shouldSendAlert = this.shouldSendAlert(alertKey, alertLevel, lastAlert);
                
                if (shouldSendAlert) {
                    alerts.push({
                        id: alertKey,
                        level: alertLevel,
                        type: cert.type,
                        description: cert.description,
                        message,
                        daysUntilExpiry: cert.daysUntilExpiry,
                        expiryDate: cert.expiryDate,
                        critical: cert.critical,
                        timestamp: now,
                        shouldSend: true
                    });
                    
                    // Update alert history
                    this.alertHistory.set(alertKey, {
                        level: alertLevel,
                        lastSent: now,
                        count: (lastAlert?.count || 0) + 1
                    });
                }
            }
        }
        
        return alerts;
    }
    
    /**
     * Determine if an alert should be sent based on history and level
     */
    shouldSendAlert(alertKey, level, lastAlert) {
        if (!lastAlert) {
            return true; // First time alert
        }
        
        const timeSinceLastAlert = Date.now() - lastAlert.lastSent.getTime();
        const hoursSinceLastAlert = timeSinceLastAlert / (1000 * 60 * 60);
        
        // Send critical alerts every 4 hours
        if (level === 'critical' && hoursSinceLastAlert >= 4) {
            return true;
        }
        
        // Send warning alerts every 24 hours
        if (level === 'warning' && hoursSinceLastAlert >= 24) {
            return true;
        }
        
        // Send info alerts every 7 days
        if (level === 'info' && hoursSinceLastAlert >= 168) {
            return true;
        }
        
        return false;
    }
    
    /**
     * Process an individual alert
     */
    async processAlert(alert) {
        try {
            this.logger.warn(`Certificate Alert [${alert.level.toUpperCase()}]: ${alert.message}`);
            
            // Send to configured notification channels
            if (this.config.enableSlackAlerts && this.config.slackWebhookUrl) {
                await this.sendSlackAlert(alert);
            }
            
            if (this.config.enableEmailAlerts && this.config.emailConfig) {
                await this.sendEmailAlert(alert);
            }
            
            // Emit alert event
            this.emit('certificateAlert', alert);
            
        } catch (error) {
            this.logger.error('Failed to process certificate alert:', error);
        }
    }
    
    /**
     * Send alert to Slack
     */
    async sendSlackAlert(alert) {
        try {
            const color = this.getSlackColor(alert.level);
            const emoji = this.getAlertEmoji(alert.level);
            
            const payload = {
                text: `${emoji} Certificate Alert - ${alert.level.toUpperCase()}`,
                attachments: [{
                    color: color,
                    fields: [
                        {
                            title: 'Certificate',
                            value: alert.description,
                            short: true
                        },
                        {
                            title: 'Type',
                            value: alert.type,
                            short: true
                        },
                        {
                            title: 'Status',
                            value: alert.message,
                            short: false
                        },
                        {
                            title: 'Expiry Date',
                            value: alert.expiryDate.toISOString().split('T')[0],
                            short: true
                        },
                        {
                            title: 'Days Until Expiry',
                            value: alert.daysUntilExpiry.toString(),
                            short: true
                        }
                    ],
                    footer: 'Orthanc Bridge Certificate Monitor',
                    ts: Math.floor(alert.timestamp.getTime() / 1000)
                }]
            };
            
            const response = await fetch(this.config.slackWebhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            
            if (!response.ok) {
                throw new Error(`Slack notification failed: ${response.status}`);
            }
            
            this.logger.info(`Slack alert sent for certificate: ${alert.type}`);
            
        } catch (error) {
            this.logger.error('Failed to send Slack alert:', error);
        }
    }
    
    /**
     * Send alert via email
     */
    async sendEmailAlert(alert) {
        try {
            // This would integrate with your email service (SendGrid, SES, etc.)
            // Implementation depends on your email provider
            
            const subject = `Certificate Alert: ${alert.description} - ${alert.level.toUpperCase()}`;
            const body = this.generateEmailBody(alert);
            
            // Example implementation (replace with your email service)
            this.logger.info(`Email alert would be sent: ${subject}`);
            this.logger.info(`Email body: ${body}`);
            
        } catch (error) {
            this.logger.error('Failed to send email alert:', error);
        }
    }
    
    /**
     * Generate email body for alert
     */
    generateEmailBody(alert) {
        return `
Certificate Alert - ${alert.level.toUpperCase()}

Certificate: ${alert.description}
Type: ${alert.type}
Status: ${alert.message}
Expiry Date: ${alert.expiryDate.toISOString().split('T')[0]}
Days Until Expiry: ${alert.daysUntilExpiry}
Critical: ${alert.critical ? 'Yes' : 'No'}

This is an automated alert from the Orthanc Bridge Certificate Monitor.

Please take appropriate action to renew the certificate before it expires.

Timestamp: ${alert.timestamp.toISOString()}
        `.trim();
    }
    
    /**
     * Get Slack color for alert level
     */
    getSlackColor(level) {
        const colors = {
            critical: 'danger',
            warning: 'warning',
            info: 'good'
        };
        return colors[level] || 'good';
    }
    
    /**
     * Get emoji for alert level
     */
    getAlertEmoji(level) {
        const emojis = {
            critical: '🚨',
            warning: '⚠️',
            info: 'ℹ️'
        };
        return emojis[level] || 'ℹ️';
    }
    
    /**
     * Generate monitoring report
     */
    generateMonitoringReport(status, alerts) {
        return {
            timestamp: new Date(),
            summary: {
                totalCertificates: status.totalCertificates,
                expiredCertificates: status.expiredCertificates,
                expiringCertificates: status.expiringCertificates,
                validCertificates: status.validCertificates,
                alertsGenerated: alerts.length,
                criticalAlerts: alerts.filter(a => a.level === 'critical').length,
                warningAlerts: alerts.filter(a => a.level === 'warning').length
            },
            certificates: status.certificates.map(cert => ({
                type: cert.type,
                description: cert.description,
                daysUntilExpiry: cert.daysUntilExpiry,
                status: cert.isExpired ? 'expired' : 
                       cert.needsRenewal ? 'expiring' : 'valid',
                critical: cert.critical
            })),
            alerts: alerts,
            recommendations: this.generateRecommendations(status, alerts)
        };
    }
    
    /**
     * Generate recommendations based on certificate status
     */
    generateRecommendations(status, alerts) {
        const recommendations = [];
        
        if (status.expiredCertificates > 0) {
            recommendations.push({
                priority: 'critical',
                action: 'Renew expired certificates immediately',
                description: 'Expired certificates can cause service disruptions'
            });
        }
        
        if (status.expiringCertificates > 0) {
            recommendations.push({
                priority: 'high',
                action: 'Schedule certificate renewal',
                description: 'Certificates are approaching expiry and should be renewed soon'
            });
        }
        
        const criticalAlerts = alerts.filter(a => a.level === 'critical' && a.critical);
        if (criticalAlerts.length > 0) {
            recommendations.push({
                priority: 'critical',
                action: 'Address critical certificate issues',
                description: 'Critical certificates require immediate attention'
            });
        }
        
        if (recommendations.length === 0) {
            recommendations.push({
                priority: 'info',
                action: 'Continue monitoring',
                description: 'All certificates are in good condition'
            });
        }
        
        return recommendations;
    }
    
    /**
     * Handle certificate renewed event
     */
    handleCertificateRenewed(type, certInfo) {
        this.logger.info(`Certificate renewed: ${type}`);
        
        // Clear alert history for renewed certificate
        const alertKeys = Array.from(this.alertHistory.keys()).filter(key => key.startsWith(type));
        for (const key of alertKeys) {
            this.alertHistory.delete(key);
        }
        
        this.emit('certificateRenewedAlert', {
            type,
            description: certInfo.config.description,
            newExpiryDate: certInfo.expiryDate,
            timestamp: new Date()
        });
    }
    
    /**
     * Handle certificates expired event
     */
    handleCertificatesExpired(expiredTypes) {
        this.logger.error(`Critical: Certificates expired: ${expiredTypes.join(', ')}`);
        
        this.emit('criticalCertificateAlert', {
            expiredTypes,
            message: 'Critical certificates have expired',
            timestamp: new Date()
        });
    }
    
    /**
     * Handle certificate error event
     */
    handleCertificateError(error) {
        this.logger.error('Certificate management error:', error);
        
        this.emit('certificateManagementError', {
            error: error.message,
            timestamp: new Date()
        });
    }
    
    /**
     * Get monitoring statistics
     */
    getMonitoringStats() {
        return {
            monitoringActive: this.monitoringTimer !== null,
            checkInterval: this.config.checkInterval,
            alertHistory: {
                totalAlerts: this.alertHistory.size,
                alertsByLevel: this.getAlertsByLevel()
            },
            configuration: {
                alertThresholds: this.config.alertThresholds,
                slackEnabled: this.config.enableSlackAlerts,
                emailEnabled: this.config.enableEmailAlerts
            }
        };
    }
    
    /**
     * Get alerts grouped by level
     */
    getAlertsByLevel() {
        const levels = { critical: 0, warning: 0, info: 0 };
        
        for (const alert of this.alertHistory.values()) {
            if (levels.hasOwnProperty(alert.level)) {
                levels[alert.level]++;
            }
        }
        
        return levels;
    }
    
    /**
     * Clear alert history
     */
    clearAlertHistory() {
        this.alertHistory.clear();
        this.logger.info('Certificate alert history cleared');
    }
    
    /**
     * Shutdown the monitor
     */
    shutdown() {
        this.stopMonitoring();
        this.clearAlertHistory();
        this.removeAllListeners();
        this.logger.info('Certificate monitor shutdown complete');
    }
}

module.exports = CertificateMonitor;