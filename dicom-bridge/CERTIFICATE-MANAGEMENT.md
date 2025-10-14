# Certificate Management System

The Orthanc Bridge includes a comprehensive certificate management system that handles automatic renewal, validation, and monitoring of SSL/TLS certificates used throughout the system.

## Features

- **Automatic Certificate Renewal**: Monitors certificate expiry and automatically renews certificates before they expire
- **Multi-Certificate Support**: Manages DICOM-TLS, HTTPS, and Nginx certificates
- **Zero-Downtime Rotation**: Performs certificate updates without service interruption
- **Comprehensive Monitoring**: Tracks certificate status and sends alerts for expiring certificates
- **Backup and Recovery**: Creates backups before renewal and can restore on failure
- **API Integration**: Provides REST API for certificate status and management
- **Notification Support**: Integrates with Slack and email for alerting

## Architecture

### Core Components

1. **CertificateManager**: Main service for certificate lifecycle management
2. **CertificateMonitor**: Monitoring and alerting service
3. **Certificate API**: REST endpoints for certificate management
4. **Integration Scripts**: Shell scripts for certificate generation and renewal

### Certificate Types

The system manages four types of certificates:

- **dicom-tls**: DICOM-TLS server certificate for secure DICOM communication
- **orthanc-https**: HTTPS certificate for Orthanc web interface
- **nginx-tls**: Nginx reverse proxy TLS certificate
- **bridge-tls**: Bridge service TLS certificate

## Configuration

### Environment Variables

```bash
# Certificate Management
CERTS_DIR=/app/certs                          # Certificate directory
CERT_RENEWAL_THRESHOLD_DAYS=30                # Days before expiry to renew
CERT_CHECK_INTERVAL_HOURS=24                  # How often to check certificates
CERT_AUTO_RENEWAL=true                        # Enable automatic renewal
CERT_NOTIFICATION_WEBHOOK=https://...         # Webhook for notifications

# Monitoring and Alerts
SLACK_ALERTS_ENABLED=true                     # Enable Slack alerts
SLACK_WEBHOOK_URL=https://hooks.slack.com/... # Slack webhook URL
EMAIL_ALERTS_ENABLED=false                    # Enable email alerts
```

### Certificate Manager Configuration

```javascript
const certificateManager = new CertificateManager({
  certsDir: '/app/certs',
  renewalThresholdDays: 30,
  checkIntervalHours: 24,
  backupRetentionDays: 90,
  enableAutoRenewal: true,
  notificationWebhook: 'https://your-webhook-url',
  logger: logger
});
```

## API Endpoints

### Certificate Status

```bash
# Get status of all certificates
GET /api/certificates/status

# Get status of specific certificate
GET /api/certificates/status/:type

# Get certificate alerts
GET /api/certificates/alerts

# Get certificate configuration
GET /api/certificates/config

# Health check for certificate management
GET /api/certificates/health
```

### Certificate Management

```bash
# Trigger certificate renewal check
POST /api/certificates/check

# Force renewal of specific certificate
POST /api/certificates/renew/:type

# Force renewal of all certificates
POST /api/certificates/renew-all
```

### Example API Responses

#### Certificate Status
```json
{
  "success": true,
  "data": {
    "totalCertificates": 4,
    "expiredCertificates": 0,
    "expiringCertificates": 1,
    "validCertificates": 3,
    "certificates": [
      {
        "type": "dicom-tls",
        "description": "DICOM-TLS Server Certificate",
        "subject": "CN=orthanc.hospital.local",
        "issuer": "CN=DICOM-TLS CA",
        "issueDate": "2024-01-01T00:00:00.000Z",
        "expiryDate": "2025-01-01T00:00:00.000Z",
        "daysUntilExpiry": 25,
        "isExpired": false,
        "needsRenewal": true,
        "critical": true
      }
    ]
  },
  "timestamp": "2024-12-07T10:00:00.000Z"
}
```

#### Certificate Alerts
```json
{
  "success": true,
  "data": {
    "alertCount": 1,
    "criticalAlerts": 0,
    "warningAlerts": 1,
    "alerts": [
      {
        "level": "warning",
        "type": "dicom-tls",
        "description": "DICOM-TLS Server Certificate",
        "message": "Certificate expires in 25 days",
        "expiryDate": "2025-01-01T00:00:00.000Z",
        "critical": true
      }
    ]
  },
  "timestamp": "2024-12-07T10:00:00.000Z"
}
```

## Certificate Generation

### DICOM-TLS Certificates

Generate DICOM-TLS certificates for secure DICOM communication:

```bash
cd orthanc-config
./generate-dicom-tls-certs.sh -a ORTHANC_PROD -h orthanc.hospital.local -d 365
```

### Nginx TLS Certificates

Generate TLS certificates for Nginx reverse proxy:

```bash
cd nginx-config
./generate-certs.sh -t self-signed -o orthanc.local -b bridge.local
```

For production with Let's Encrypt:

```bash
cd nginx-config
./generate-certs.sh -t letsencrypt -o orthanc.example.com -b bridge.example.com -e admin@example.com
```

## Monitoring and Alerting

### Alert Levels

- **Critical**: Certificate expired or expires within 7 days
- **Warning**: Certificate expires within 30 days
- **Info**: Certificate expires within 60 days

### Alert Frequency

- Critical alerts: Every 4 hours
- Warning alerts: Every 24 hours
- Info alerts: Every 7 days

### Slack Integration

Configure Slack alerts by setting environment variables:

```bash
SLACK_ALERTS_ENABLED=true
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
```

Slack messages include:
- Certificate type and description
- Expiry status and date
- Days until expiry
- Criticality level

### Monitoring Dashboard

The certificate monitor provides comprehensive reporting:

```javascript
const monitor = app.get('certificateMonitor');
const stats = monitor.getMonitoringStats();

// Get monitoring report
monitor.on('monitoringReport', (report) => {
  console.log('Certificate Report:', report);
});
```

## Certificate Renewal Process

### Automatic Renewal

1. **Monitoring**: System checks certificates every 24 hours (configurable)
2. **Threshold Check**: Identifies certificates expiring within 30 days
3. **Backup Creation**: Creates backup of current certificates
4. **Renewal**: Generates new certificates using appropriate method
5. **Validation**: Validates new certificates and chain
6. **Service Reload**: Reloads affected services (Nginx, Orthanc)
7. **Notification**: Sends success/failure notifications

### Manual Renewal

Force renewal of specific certificate:

```bash
curl -X POST http://localhost:3000/api/certificates/renew/dicom-tls
```

Force renewal of all certificates:

```bash
curl -X POST http://localhost:3000/api/certificates/renew-all
```

### Renewal Methods

#### DICOM Certificates
- Uses internal CA for certificate generation
- Maintains certificate chain integrity
- Supports mutual TLS authentication

#### Nginx Certificates
- Supports both Let's Encrypt and self-signed certificates
- Automatic ACME challenge handling for Let's Encrypt
- Graceful Nginx reload without downtime

## Backup and Recovery

### Automatic Backups

- Backups created before each renewal attempt
- Stored in `{certsDir}/backups/` directory
- Retention period: 90 days (configurable)
- Includes certificate, private key, and CA files

### Recovery Process

If renewal fails, the system automatically:
1. Restores certificates from backup
2. Logs the failure with details
3. Sends failure notification
4. Maintains service availability

### Manual Recovery

Restore from specific backup:

```bash
# List available backups
ls /app/certs/backups/

# Restore manually if needed
cp /app/certs/backups/dicom-tls-2024-12-07T10-00-00/* /app/certs/
```

## Security Considerations

### Certificate Storage

- Private keys stored with 600 permissions (owner read/write only)
- Certificates stored with 644 permissions (owner read/write, group/other read)
- Backup directory protected with appropriate permissions
- CA private keys secured and backed up separately

### Certificate Validation

- Validates certificate-key pairs before deployment
- Verifies certificate chain integrity
- Checks certificate expiry and validity periods
- Validates subject names and SANs

### Access Control

- Certificate management API requires authentication
- Admin endpoints restricted by IP whitelist
- Audit logging for all certificate operations
- Secure webhook signatures for notifications

## Troubleshooting

### Common Issues

#### Certificate Validation Failures

```bash
# Check certificate details
openssl x509 -in /app/certs/dicom-tls.crt -text -noout

# Verify certificate chain
openssl verify -CAfile /app/certs/dicom-ca.crt /app/certs/dicom-tls.crt

# Check certificate-key match
openssl x509 -noout -modulus -in /app/certs/dicom-tls.crt | openssl md5
openssl rsa -noout -modulus -in /app/certs/dicom-tls.key | openssl md5
```

#### Service Reload Failures

```bash
# Check Nginx configuration
docker exec nginx-tls-proxy nginx -t

# Check Orthanc logs
docker logs orthanc-dev

# Manual service restart
docker restart nginx-tls-proxy
docker restart orthanc-dev
```

#### Certificate Generation Failures

```bash
# Check certificate generation logs
docker logs dicom-bridge-dev | grep -i certificate

# Verify certificate directory permissions
ls -la /app/certs/

# Test certificate generation manually
cd orthanc-config
./generate-dicom-tls-certs.sh --help
```

### Debugging

Enable debug logging:

```bash
LOG_LEVEL=debug
CERT_DEBUG=true
```

Check certificate manager status:

```bash
curl http://localhost:3000/api/certificates/health
curl http://localhost:3000/api/certificates/status
```

### Recovery Procedures

#### Emergency Certificate Deployment

1. Generate emergency certificates manually
2. Stop certificate monitoring temporarily
3. Deploy certificates manually
4. Restart affected services
5. Re-enable monitoring

#### Certificate Authority Compromise

1. Generate new CA certificate and key
2. Re-issue all certificates with new CA
3. Update all DICOM devices with new CA
4. Rotate all certificates immediately
5. Audit all certificate usage

## Integration Examples

### Docker Compose Integration

```yaml
services:
  dicom-bridge:
    environment:
      - CERTS_DIR=/app/certs
      - CERT_AUTO_RENEWAL=true
      - CERT_RENEWAL_THRESHOLD_DAYS=30
      - SLACK_ALERTS_ENABLED=true
      - SLACK_WEBHOOK_URL=${SLACK_WEBHOOK_URL}
    volumes:
      - ./orthanc-config/certs:/app/certs:ro
      - ./nginx-config/certs:/app/nginx-certs:ro
```

### Monitoring Integration

```javascript
// Custom monitoring integration
const certificateMonitor = app.get('certificateMonitor');

certificateMonitor.on('certificateAlert', (alert) => {
  // Send to your monitoring system
  sendToMonitoring(alert);
});

certificateMonitor.on('certificateRenewed', (type, certInfo) => {
  // Log successful renewal
  auditLogger.logCertificateRenewal(type, certInfo);
});
```

### Webhook Integration

```javascript
// Custom webhook for certificate events
app.post('/webhooks/certificate-events', (req, res) => {
  const { level, message, type } = req.body;
  
  // Handle certificate events
  if (level === 'critical') {
    // Trigger emergency procedures
    handleCriticalCertificateAlert(type, message);
  }
  
  res.json({ success: true });
});
```

## Best Practices

1. **Regular Monitoring**: Check certificate status regularly
2. **Automated Renewal**: Enable automatic renewal for production
3. **Backup Strategy**: Maintain secure backups of CA keys
4. **Testing**: Test certificate renewal in staging environment
5. **Documentation**: Keep certificate inventory and procedures updated
6. **Security**: Protect private keys and use strong passwords
7. **Monitoring**: Set up comprehensive alerting and monitoring
8. **Recovery**: Test recovery procedures regularly

## Support and Maintenance

- Monitor certificate expiry dates regularly
- Keep certificate generation scripts updated
- Review and update security configurations
- Test backup and recovery procedures
- Update notification configurations as needed
- Audit certificate usage and access logs