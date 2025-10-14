# Secret Management Implementation

## Overview

The DICOM Bridge now supports enterprise-grade secret management using HashiCorp Vault or AWS Secrets Manager. This implementation removes hardcoded credentials from configuration files and enables automated secret rotation.

## Features

- **Multi-Provider Support**: HashiCorp Vault and AWS Secrets Manager
- **IAM Authentication**: Role-based secret retrieval without hardcoded tokens
- **Automatic Rotation**: Webhook-based secret rotation with service restart
- **Graceful Fallback**: Falls back to environment variables if secrets unavailable
- **Caching**: In-memory secret caching with configurable TTL
- **Audit Logging**: All secret operations are logged (without exposing values)

## Configuration

### HashiCorp Vault

```bash
# Environment variables
SECRET_PROVIDER=vault
VAULT_URL=http://vault:8200
VAULT_ROLE=dicom-bridge
VAULT_NAMESPACE=  # Optional for Vault Enterprise

# For development with token auth
VAULT_TOKEN=dev-root-token
```

### AWS Secrets Manager

```bash
# Environment variables
SECRET_PROVIDER=aws
AWS_REGION=us-east-1

# Uses IAM role authentication automatically
```

## Secret Structure

Secrets are organized by environment and component:

```
dicom-bridge/
├── development/
│   ├── orthanc          # Orthanc credentials
│   ├── webhook          # Webhook HMAC secret
│   ├── database         # MongoDB connection
│   └── cloudinary       # Cloud storage credentials
├── staging/
│   └── ...
└── production/
    └── ...
```

### Secret Formats

#### Orthanc Secrets
```json
{
  "username": "orthanc_admin",
  "password": "secure_password_123",
  "url": "http://orthanc:8042"
}
```

#### Webhook Secrets
```json
{
  "hmac_secret": "webhook_hmac_key_256_bits"
}
```

#### Database Secrets
```json
{
  "mongodb_uri": "mongodb://user:pass@host:27017/database"
}
```

#### Cloudinary Secrets
```json
{
  "cloud_name": "your_cloud_name",
  "api_key": "your_api_key",
  "api_secret": "your_api_secret"
}
```

## Development Setup

### 1. Start Vault in Development Mode

```bash
# Start services including Vault
docker-compose up -d vault

# Initialize Vault with development secrets
docker exec vault-dev /vault/config/vault-init.sh
```

### 2. Verify Secret Access

```bash
# Check Vault status
curl http://localhost:8200/v1/sys/health

# List secrets (requires authentication)
vault kv list dicom-bridge/development/
```

### 3. Start Bridge Service

```bash
# Start bridge with secret management
docker-compose up -d dicom-bridge

# Check logs for secret loading
docker logs dicom-bridge-dev
```

## Production Deployment

### 1. Vault Production Setup

```bash
# Use production Vault cluster
VAULT_URL=https://vault.company.com
VAULT_NAMESPACE=medical-imaging

# Configure IAM authentication
vault write auth/aws/role/dicom-bridge \
  auth_type=iam \
  policies=dicom-bridge-policy \
  bound_iam_principal_arn="arn:aws:iam::ACCOUNT:role/dicom-bridge-role"
```

### 2. AWS Secrets Manager Setup

```bash
# Create secrets in AWS Secrets Manager
aws secretsmanager create-secret \
  --name "dicom-bridge/production/orthanc" \
  --description "Orthanc credentials for DICOM Bridge" \
  --secret-string '{"username":"orthanc","password":"secure_password"}'

# Configure IAM role with SecretsManager permissions
```

### 3. Environment Configuration

```bash
# Production environment variables
SECRET_PROVIDER=vault  # or 'aws'
VAULT_URL=https://vault.company.com
VAULT_ROLE=dicom-bridge-prod
NODE_ENV=production

# Remove all fallback credentials in production
```

## Secret Rotation

### Automated Rotation (Vault)

```bash
# Configure rotation policy
vault write sys/policies/password/dicom-bridge \
  policy='length=20 rule="charset" charset="abcdefghijklmnopqrstuvwxyz"'

# Enable automatic rotation
vault write database/config/orthanc \
  plugin_name=mysql-database-plugin \
  connection_url="{{username}}:{{password}}@tcp(orthanc:3306)/" \
  allowed_roles="dicom-bridge" \
  username="root" \
  password="mysql-root-password"
```

### Manual Rotation

```bash
# Rotate Orthanc password
vault kv put dicom-bridge/production/orthanc \
  username="orthanc" \
  password="new_secure_password_$(date +%s)"

# Trigger bridge service refresh
curl -X POST http://bridge:3000/api/secrets/refresh
```

### Rotation Webhook

The bridge service exposes a webhook endpoint for rotation notifications:

```bash
# Webhook endpoint
POST /api/secrets/rotation-webhook

# Payload
{
  "secretPath": "dicom-bridge/production/orthanc",
  "action": "rotated",
  "timestamp": 1699123456
}
```

## API Endpoints

### Secret Management

```bash
# Refresh secrets manually
POST /api/secrets/refresh

# Get secret manager status
GET /api/secrets/status

# Rotation webhook (called by secret manager)
POST /api/secrets/rotation-webhook
```

### Health Checks

```bash
# Basic health check
GET /health

# Detailed health with secret manager status
GET /health/detailed
```

## Security Considerations

### Development
- Uses development tokens and simple authentication
- Secrets are stored in local Vault instance
- Fallback credentials available in environment

### Production
- **Remove all fallback credentials**
- Use IAM role-based authentication only
- Enable audit logging for all secret operations
- Implement secret rotation policies
- Use TLS for all secret manager communication
- Monitor secret access patterns

## Troubleshooting

### Common Issues

1. **Secret Manager Unavailable**
   ```
   WARN: Secret manager not available, falling back to environment variables
   ```
   - Check Vault/AWS connectivity
   - Verify authentication credentials
   - Check network policies

2. **Authentication Failed**
   ```
   ERROR: Vault authentication failed: permission denied
   ```
   - Verify IAM role permissions
   - Check Vault policies
   - Validate role configuration

3. **Secret Not Found**
   ```
   ERROR: Secret not found: dicom-bridge/production/orthanc
   ```
   - Verify secret path exists
   - Check environment configuration
   - Validate secret structure

### Debug Commands

```bash
# Test Vault connectivity
vault status

# List available secrets
vault kv list dicom-bridge/development/

# Get secret value (development only)
vault kv get dicom-bridge/development/orthanc

# Check bridge service logs
docker logs dicom-bridge-dev

# Test secret manager endpoint
curl http://localhost:3001/api/secrets/status
```

## Migration from Environment Variables

### 1. Backup Current Configuration
```bash
# Save current environment variables
env | grep -E "(ORTHANC|WEBHOOK|MONGODB|CLOUDINARY)" > backup.env
```

### 2. Create Secrets in Vault/AWS
```bash
# Use vault-init.sh script or manual creation
./vault-config/vault-init.sh
```

### 3. Update Environment Configuration
```bash
# Remove hardcoded secrets from .env files
# Add secret manager configuration
SECRET_PROVIDER=vault
VAULT_URL=http://vault:8200
```

### 4. Test and Validate
```bash
# Start services and verify secret loading
docker-compose up -d
docker logs dicom-bridge-dev | grep "secrets loaded"
```

This implementation provides enterprise-grade secret management while maintaining backward compatibility and operational simplicity.