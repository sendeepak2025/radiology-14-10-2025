# 🚨 Emergency Rollback Procedures

## Immediate Rollback (< 5 minutes)

### 1. Disable Orthanc Webhook
```bash
# Method A: Clear webhook via REST API
curl -u orthanc:orthanc_secure_2024 -X PUT \
  "http://ORTHANC_HOST:8042/tools/configuration" \
  -d '{"OnStoredInstance": []}' \
  -H "Content-Type: application/json"

# Method B: Stop Orthanc container
docker stop orthanc-dev

# Method C: Replace config and restart
cp orthanc-config/orthanc-safe.json orthanc-config/orthanc.json
docker restart orthanc-dev
```

### 2. Stop Bridge Service
```bash
# Stop bridge processing
docker-compose stop dicom-bridge

# Or scale to zero
docker-compose scale dicom-bridge=0
```

### 3. Verify Rollback
```bash
# Check no jobs are being processed
curl http://localhost:3001/health/detailed

# Verify Orthanc webhook disabled
curl -u orthanc:orthanc_secure_2024 http://localhost:8042/tools/configuration
```

## Complete System Removal

### 1. Stop All Services
```bash
docker-compose down
```

### 2. Remove Containers and Networks
```bash
docker-compose down --volumes --remove-orphans
docker network rm orthanc-bridge-network
```

### 3. Verify Clean State
```bash
# Check no bridge processes
ps aux | grep dicom-bridge

# Check no Orthanc processes
ps aux | grep orthanc

# Verify network cleanup
docker network ls | grep orthanc
```

## Verification Checklist

- [ ] Webhook disabled (no new jobs enqueued)
- [ ] Bridge service stopped
- [ ] Original PACS functionality unchanged
- [ ] No residual processes running
- [ ] Network isolation removed
- [ ] All containers stopped/removed