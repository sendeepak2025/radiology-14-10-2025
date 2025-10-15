# Phase 1: Infrastructure & Error Handling - Complete Guide

## Overview
This guide covers the infrastructure improvements implemented in Phase 1:
- Centralized Error Logging
- Automated MongoDB Backups
- Health Monitoring
- Input Validation & Sanitization

---

## 1. Error Logging System

### Features
- ✅ Centralized error tracking
- ✅ Severity levels (LOW, MEDIUM, HIGH, CRITICAL)
- ✅ Contextual logging (component, action, user, study)
- ✅ Development vs Production modes
- ✅ Automatic backend reporting

### Frontend Usage

```typescript
import { errorLogger, ErrorSeverity, logError, logCritical } from '@/utils/errorLogger';

// Simple error logging
logError('Something went wrong', {
  component: 'ViewerPage',
  action: 'load_study',
});

// Critical error
logCritical('Database connection lost', {
  component: 'ApiService',
});

// API error
errorLogger.logApiError('/api/studies', 500, 'Internal Server Error', {
  studyId: '1.2.3.4.5',
});

// User action error
errorLogger.logUserActionError('delete_study', new Error('Permission denied'), {
  userId: 'user123',
});
```

### Backend API Endpoints

**Log an error:**
```bash
POST /api/errors/log
Content-Type: application/json

{
  "message": "Error message",
  "stack": "Error stack trace",
  "severity": "medium",
  "context": {
    "component": "StudyController",
    "action": "fetch_study"
  },
  "timestamp": "2025-10-15T10:30:00Z",
  "userAgent": "Mozilla/5.0...",
  "url": "https://app.example.com/viewer/123"
}
```

**Get recent errors:**
```bash
GET /api/errors/recent?limit=50&severity=critical
```

**Get error statistics:**
```bash
GET /api/errors/stats
```

**Clear error logs (admin only):**
```bash
DELETE /api/errors/clear
```

---

## 2. Automated MongoDB Backups

### Quick Start

**Run a manual backup:**
```bash
cd /app
export MONGODB_URI="your_mongodb_connection_string"
./scripts/backup-mongodb.sh
```

**Set up automated daily backups:**
```bash
./scripts/setup-backup-cron.sh
```

**Restore from backup:**
```bash
./scripts/restore-mongodb.sh medical_imaging_backup_20251015_103000.tar.gz
```

### Backup Configuration

**Environment Variables:**
```bash
# In /app/node-server/.env or set in environment

MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname
BACKUP_DIR=/app/backups          # Default backup location
RETENTION_DAYS=30                # Keep backups for 30 days
```

### Backup Schedule Options

The setup script offers these schedules:
1. **Daily at 2:00 AM** (Recommended for production)
2. **Daily at 3:00 AM**
3. **Every 12 hours**
4. **Every 6 hours** (For critical systems)
5. **Custom cron expression**

### Backup Features

- ✅ Compressed backups (gzip + tar.gz)
- ✅ Metadata tracking (timestamp, size, version)
- ✅ Integrity verification
- ✅ Automatic cleanup of old backups
- ✅ Detailed logging
- ✅ Ready for cloud upload (S3, GCS)

### Backup Locations

**Local:**
- Backups: `/app/backups/`
- Logs: `/app/backups/backup.log`

**View current backups:**
```bash
ls -lh /app/backups/
```

**View backup logs:**
```bash
tail -f /app/backups/backup.log
```

### Disaster Recovery

**To restore from backup:**

1. Stop the application
2. Run restore script:
   ```bash
   ./scripts/restore-mongodb.sh medical_imaging_backup_YYYYMMDD_HHMMSS.tar.gz
   ```
3. Verify data integrity
4. Restart application

**Restore verification:**
```bash
# Connect to MongoDB and verify
mongosh "$MONGODB_URI" --eval "db.studies.countDocuments({})"
```

---

## 3. Health Monitoring

### API Endpoints

**Quick health check:**
```bash
GET /api/health
```

**Detailed health check:**
```bash
GET /api/health/detailed
```

**Database health:**
```bash
GET /api/health/database
```

**System metrics:**
```bash
GET /api/health/metrics
```

### Health Check Response

```json
{
  "status": "healthy",
  "timestamp": "2025-10-15T10:30:00Z",
  "version": "1.0.0",
  "uptime": {
    "process": 86400,
    "system": 259200
  },
  "checks": {
    "database": {
      "status": "healthy",
      "responseTime": "15ms",
      "collections": 10
    },
    "memory": {
      "status": "healthy",
      "usagePercent": "45.23%"
    },
    "aiService": {
      "status": "healthy",
      "message": "AI service available"
    }
  }
}
```

### Health Status Codes

- **200** - System healthy
- **503** - System unhealthy or degraded

### Monitoring Integration

**Add to your monitoring system:**
```bash
# Uptime monitoring (UptimeRobot, Pingdom, etc.)
https://your-domain.com/api/health

# Check every 5 minutes
# Alert if status != 200
```

**Prometheus metrics (future):**
```bash
GET /api/health/metrics
```

---

## 4. Input Validation & Sanitization

### Features

- ✅ Automatic input sanitization (XSS protection)
- ✅ DICOM UID validation
- ✅ Patient name validation
- ✅ Date format validation
- ✅ Modality code validation
- ✅ Rate limiting (100 requests/min)
- ✅ Pagination validation

### Validation Middleware Usage

**Apply to specific routes:**
```javascript
const {
  validateStudyUID,
  validatePagination,
  validateSearchQuery,
  strictRateLimiter,
} = require('./middleware/validation');

// Validate study UID
router.get('/studies/:studyInstanceUID', validateStudyUID, getStudy);

// Validate pagination
router.get('/studies', validatePagination, getStudies);

// Validate search parameters
router.get('/search', validateSearchQuery, searchStudies);

// Apply strict rate limiting to sensitive endpoints
router.post('/admin/delete', strictRateLimiter, deleteAction);
```

### DICOM File Validation

**Validate uploaded DICOM files:**
```javascript
const { validateUploadedDICOM } = require('./middleware/dicomValidation');

router.post('/upload', upload.single('file'), validateUploadedDICOM, handleUpload);
```

**Validation checks:**
- ✅ File size (min 132 bytes, max 2GB)
- ✅ DICOM magic number (DICM at offset 128)
- ✅ File extension (.dcm, .dicom)
- ✅ Format integrity

### Rate Limiting

**Default rate limiter:**
- 100 requests per minute per IP

**Strict rate limiter:**
- 10 requests per minute per IP
- Use for sensitive endpoints (delete, admin actions)

**Response when rate limited:**
```json
{
  "success": false,
  "error": "Too many requests. Please try again later.",
  "retryAfter": 45
}
```

---

## 5. Maintenance & Operations

### Daily Operations

**Check system health:**
```bash
curl http://localhost:8001/api/health/detailed | json_pp
```

**View recent errors:**
```bash
curl http://localhost:8001/api/errors/recent?limit=10 | json_pp
```

**Check backup status:**
```bash
ls -lh /app/backups/ | tail -10
tail -20 /app/backups/backup.log
```

**Monitor disk space:**
```bash
df -h /app/backups
```

### Weekly Operations

**Review error logs:**
```bash
curl http://localhost:8001/api/errors/stats | json_pp
```

**Test backup restore (on staging):**
```bash
./scripts/restore-mongodb.sh latest_backup.tar.gz
```

**Check database size:**
```bash
mongosh "$MONGODB_URI" --eval "db.stats()"
```

### Monthly Operations

**Review backup retention:**
```bash
find /app/backups -name "*.tar.gz" -mtime +30 -ls
```

**Audit system performance:**
```bash
curl http://localhost:8001/api/health/metrics | json_pp
```

**Update dependencies:**
```bash
cd /app/node-server && npm audit
npm update
```

---

## 6. Troubleshooting

### Backup Issues

**Problem:** Backup fails with "MONGODB_URI not set"
```bash
# Solution: Set environment variable
export MONGODB_URI="mongodb+srv://..."
# Or add to /app/node-server/.env
```

**Problem:** Backup runs but files not found
```bash
# Check cron job is running
crontab -l

# Check backup logs
tail -f /app/backups/backup.log

# Check disk space
df -h
```

**Problem:** Cannot restore backup
```bash
# Verify backup integrity
tar -tzf backup_file.tar.gz

# Check MongoDB connection
mongosh "$MONGODB_URI" --eval "db.stats()"
```

### Health Check Issues

**Problem:** Health check returns 503
```bash
# Check detailed health
curl http://localhost:8001/api/health/detailed

# Check specific components
curl http://localhost:8001/api/health/database
```

**Problem:** Database check fails
```bash
# Test MongoDB connection
mongosh "$MONGODB_URI" --eval "db.adminCommand('ping')"
```

### Error Logging Issues

**Problem:** Errors not being logged
```bash
# Check backend is running
curl http://localhost:8001/api/health

# Test error endpoint
curl -X POST http://localhost:8001/api/errors/log \
  -H "Content-Type: application/json" \
  -d '{"message":"test","severity":"low"}'
```

---

## 7. Security Best Practices

### Backup Security

- ✅ Store backups in secure location
- ✅ Encrypt sensitive backups
- ✅ Restrict backup directory permissions
- ✅ Use secure cloud storage (S3 with encryption)
- ✅ Implement access controls

```bash
# Restrict backup directory
chmod 700 /app/backups
chown appuser:appuser /app/backups
```

### API Security

- ✅ Rate limiting enabled
- ✅ Input sanitization active
- ✅ HTTPS enforced (production)
- ✅ Authentication required (production)
- ✅ Audit logging enabled

### Error Logging Security

- ⚠️ **Never log sensitive data:**
  - Patient identifiers (sanitize before logging)
  - Passwords or tokens
  - Full API keys
  - PHI/PII data

- ✅ **Safe logging practices:**
  - Use error IDs instead of full details
  - Sanitize user inputs
  - Redact sensitive fields
  - Implement log retention policies

---

## 8. Next Steps

After Phase 1, you have:
- ✅ Enterprise error tracking
- ✅ Automated backups
- ✅ Health monitoring
- ✅ Input validation

**Ready for Phase 2:**
- Database indexing
- Performance optimization
- Caching implementation
- API response compression

**Resources:**
- Tracker: `/app/IMPLEMENTATION_TRACKER.md`
- Improvements Guide: `/app/PRE_PRODUCTION_IMPROVEMENTS.md`

---

## Support

For issues or questions:
1. Check `/app/backups/backup.log`
2. Review error logs via API
3. Consult health check endpoints
4. Review this documentation

**Critical Issues:**
- Database connection lost → Check health endpoint
- Backup failures → Check disk space and logs
- High error rate → Review error stats API
