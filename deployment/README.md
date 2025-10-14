# Orthanc Bridge Deployment Automation

This directory contains comprehensive deployment automation tools for the Orthanc Bridge system, providing environment-specific configuration management, pre-deployment validation, and automated rollback capabilities.

## 🚀 Quick Start

### 1. Generate Base Templates
```bash
# Create configuration templates
node scripts/generate-deployment-config.js templates
```

### 2. Setup Environment Configuration
```bash
# Generate staging environment
node scripts/deployment-manager.js setup staging

# Generate production environment
node scripts/deployment-manager.js setup production
```

### 3. Deploy to Environment
```bash
# Deploy to staging
node scripts/deployment-manager.js deploy staging

# Deploy to production (with confirmation)
node scripts/deployment-manager.js deploy production
```

## 📁 Directory Structure

```
deployment/
├── README.md                    # This file
├── templates/                   # Configuration templates
│   ├── .env.template           # Environment variables template
│   ├── docker-compose.template.yml # Docker Compose template
│   ├── validate-deployment.template.sh # Validation script template
│   └── SSL-SETUP.md            # SSL certificate setup guide
└── environments/               # Environment-specific configurations
    ├── staging/                # Staging environment
    │   ├── .env               # Staging environment variables
    │   ├── docker-compose.yml # Staging service definitions
    │   ├── validate-deployment.sh # Staging validation script
    │   ├── README.md          # Staging-specific documentation
    │   ├── ssl/               # SSL certificates
    │   ├── logs/              # Application logs
    │   └── backups/           # Backup storage
    └── production/            # Production environment
        ├── .env               # Production environment variables
        ├── docker-compose.yml # Production service definitions
        ├── validate-deployment.sh # Production validation script
        ├── README.md          # Production-specific documentation
        ├── ssl/               # SSL certificates
        ├── logs/              # Application logs
        └── backups/           # Backup storage
```

## 🛠️ Deployment Tools

### 1. Deployment Manager (`scripts/deployment-manager.js`)

Comprehensive deployment automation with full workflow management.

**Features:**
- Environment-specific configuration generation
- Pre-deployment validation and health checks
- Automated backup creation (production)
- Service deployment with health monitoring
- Post-deployment validation
- Automated rollback capabilities

**Usage:**
```bash
# Setup environment configuration
node scripts/deployment-manager.js setup <environment>

# Deploy with full validation
node scripts/deployment-manager.js deploy <environment>

# Validate existing deployment
node scripts/deployment-manager.js validate <environment>

# Rollback deployment
node scripts/deployment-manager.js rollback <environment>

# Create backup
node scripts/deployment-manager.js backup <environment>
```

**Options:**
- `--dry-run`: Preview deployment without executing
- `--force`: Skip confirmation prompts

### 2. Pre-Deployment Health Check (`scripts/pre-deployment-check.js`)

Comprehensive pre-deployment validation including system prerequisites, configuration validation, and security requirements verification.

**Features:**
- System prerequisites validation (Docker, Docker Compose, Node.js)
- Environment configuration validation
- Security requirements checking
- SSL certificate validation (production)
- Network connectivity testing
- Production readiness verification

**Usage:**
```bash
# Check staging environment
node scripts/pre-deployment-check.js staging

# Check production environment
node scripts/pre-deployment-check.js production
```

### 3. Configuration Generator (`scripts/generate-deployment-config.js`)

Template-based configuration generator for environment-specific deployments.

**Features:**
- Base template creation
- Environment-specific configuration generation
- Secure password generation
- SSL setup documentation
- Validation script generation

**Usage:**
```bash
# Create base templates
node scripts/generate-deployment-config.js templates

# Generate environment configuration
node scripts/generate-deployment-config.js generate <environment>
```

### 4. Legacy Deployment Scripts

Enhanced versions of the original deployment scripts with integrated health checks.

**Scripts:**
- `scripts/deploy.sh` - Enhanced Bash deployment script
- `scripts/deploy.ps1` - Enhanced PowerShell deployment script
- `scripts/setup-deployment.sh` - Environment setup script
- `scripts/setup-deployment.ps1` - PowerShell environment setup script

## 🔧 Configuration Management

### Environment Variables

Each environment has its own `.env` file with the following key configurations:

```bash
# Environment Settings
NODE_ENV=production
ENVIRONMENT=production

# Orthanc Configuration
ORTHANC_PASSWORD=<generated-secure-password>
ORTHANC_HTTP_PORT=8042
ORTHANC_DICOM_PORT=4242

# Bridge Configuration
BRIDGE_PORT=3001
WEBHOOK_SECRET=<generated-secure-secret>

# Security Configuration
TLS_ENABLED=true
VAULT_TOKEN=<generated-secure-token>

# Monitoring Configuration
METRICS_ENABLED=true
BACKUP_ENABLED=true
```

### Docker Compose Configuration

Environment-specific Docker Compose files with:
- Service definitions with health checks
- Environment-specific networking
- Volume management
- Logging configuration
- Production-specific services (Nginx reverse proxy)

### SSL Certificate Management

Comprehensive SSL setup with:
- Let's Encrypt integration
- Self-signed certificate generation
- Internal CA certificate support
- Automated renewal scripts
- Certificate validation tools

## 🔍 Validation and Testing

### Pre-Deployment Checks

Automated validation includes:
- ✅ System prerequisites (Docker, Docker Compose, Node.js)
- ✅ Environment configuration validation
- ✅ Security requirements verification
- ✅ SSL certificate validation (production)
- ✅ Network connectivity testing
- ✅ Production readiness checklist

### Post-Deployment Validation

Comprehensive health checks:
- ✅ Service health monitoring
- ✅ Authentication testing
- ✅ Webhook security validation
- ✅ Database connectivity
- ✅ Redis connectivity
- ✅ Vault integration
- ✅ TLS configuration (production)
- ✅ Smoke test execution

### Validation Scripts

Each environment includes a `validate-deployment.sh` script that:
- Tests all service endpoints
- Validates authentication
- Checks security configuration
- Runs smoke tests
- Provides detailed reporting

## 🚨 Emergency Procedures

### Immediate Disable

```bash
# Disable webhook processing
curl -u $ORTHANC_USERNAME:$ORTHANC_PASSWORD -X PUT \
  "http://localhost:$ORTHANC_HTTP_PORT/tools/configuration" \
  -d '{"OnStoredInstance": []}' \
  -H "Content-Type: application/json"

# Stop bridge service
docker stop dicom-bridge-<environment>
```

### Complete Rollback

```bash
# Using deployment manager
node scripts/deployment-manager.js rollback <environment>

# Using legacy script
./scripts/deploy.sh <environment> --rollback
```

### Service Restart

```bash
# Restart specific service
docker-compose restart dicom-bridge

# Restart all services
docker-compose restart
```

## 📊 Monitoring and Logging

### Health Endpoints

- **Orthanc**: `http://localhost:8042/system`
- **DICOM Bridge**: `http://localhost:3001/health`
- **Detailed Health**: `http://localhost:3001/health/detailed`
- **Metrics**: `http://localhost:9090/metrics`
- **Vault**: `http://localhost:8200/v1/sys/health`

### Log Monitoring

```bash
# View service logs
docker-compose logs -f dicom-bridge
docker-compose logs -f orthanc

# View application logs
tail -f deployment/environments/<env>/logs/bridge.log
tail -f deployment/environments/<env>/logs/orthanc.log
```

### Metrics Collection

- Prometheus metrics on port 9090
- Health check endpoints
- Service-specific metrics
- Performance monitoring

## 🔒 Security Features

### Secret Management

- HashiCorp Vault integration
- Secure password generation
- Environment-specific secrets
- Secret rotation support

### Network Security

- TLS encryption for all communications
- HMAC-SHA256 webhook validation
- Rate limiting and request validation
- Network isolation with Docker networks

### Access Control

- Authentication required for all admin operations
- Role-based access control
- IP-based restrictions (configurable)
- Audit logging for all operations

## 📋 Production Deployment Checklist

### Pre-Deployment
- [ ] Run pre-deployment health checks
- [ ] Validate SSL certificates
- [ ] Review security configuration
- [ ] Obtain PACS administrator approval
- [ ] Schedule deployment window
- [ ] Notify stakeholders

### Deployment
- [ ] Create deployment backup
- [ ] Deploy services with monitoring
- [ ] Validate deployment health
- [ ] Run smoke tests
- [ ] Monitor for 2-4 hours

### Post-Deployment
- [ ] Verify PACS integration
- [ ] Test clinical workflows
- [ ] Monitor system metrics
- [ ] Document deployment
- [ ] Update runbooks

## 🆘 Troubleshooting

### Common Issues

1. **Service won't start**
   ```bash
   # Check logs
   docker-compose logs <service-name>
   
   # Check configuration
   docker-compose config
   ```

2. **Health checks failing**
   ```bash
   # Run validation script
   ./validate-deployment.sh
   
   # Check individual services
   curl http://localhost:3001/health
   ```

3. **SSL certificate issues**
   ```bash
   # Check certificate validity
   openssl x509 -in ssl/certs/orthanc.crt -text -noout
   
   # Verify certificate chain
   openssl verify -CAfile ssl/certs/ca.crt ssl/certs/orthanc.crt
   ```

4. **Permission errors**
   ```bash
   # Check file permissions
   ls -la ssl/private/orthanc.key
   
   # Fix permissions
   chmod 600 ssl/private/orthanc.key
   chmod 644 ssl/certs/orthanc.crt
   ```

### Support Resources

- **Documentation**: `../README.md`
- **Security Procedures**: `../docs/SECURITY_REVIEW_PROCESS.md`
- **PACS Runbook**: `../docs/PACS-RUNBOOK.md`
- **Rollback Procedures**: `../docs/ROLLBACK.md`

## 🔄 Continuous Integration

### Automated Testing

The deployment automation integrates with CI/CD pipelines:
- Pre-merge validation
- Automated smoke testing
- Security scanning
- Configuration validation

### Deployment Pipeline

1. **Development** → Automated testing and validation
2. **Staging** → Full integration testing
3. **Production** → Controlled deployment with monitoring

## 📞 Emergency Contacts

### Production Issues
- **On-call Engineer**: [Contact Information]
- **PACS Administrator**: [Contact Information]
- **Security Team**: [Contact Information]

### Development Issues
- **Development Team**: [Contact Information]
- **DevOps Team**: [Contact Information]

---

**Last Updated**: ${new Date().toISOString().split('T')[0]}  
**Version**: 1.0.0  
**Maintained by**: Orthanc Bridge Development Team