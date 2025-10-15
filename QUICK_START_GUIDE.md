# Quick Start Guide - DICOM PACS Integration

## 🚀 Getting Started in 5 Minutes

### 1. Verify Services are Running
```bash
# Check all services
sudo supervisorctl status

# Should see:
# - backend: RUNNING
# - frontend: RUNNING
# - mongodb: RUNNING

# Check Orthanc PACS
ps aux | grep Orthanc
# Should see: /usr/sbin/Orthanc /etc/orthanc/
```

If Orthanc is not running:
```bash
/usr/sbin/Orthanc /etc/orthanc/ > /var/log/orthanc.log 2>&1 &
```

### 2. Test the System
```bash
# Send 3 test DICOM studies
python /app/dicom-test-sender.py

# Expected output:
# ✓ C-ECHO successful
# ✓ 3 C-STORE successful
```

### 3. View Studies
Open browser: http://localhost:3000
- You should see test studies for:
  - John^Doe (CT)
  - Jane^Smith (MRI)
  - Bob^Wilson (X-Ray)

### 4. Access Orthanc Explorer
Open browser: http://localhost:8042/app/explorer.html
- Username: `orthanc`
- Password: `orthanc`

## 🏥 Connect Your Medical Machine

### On Your CT/MRI/PET Console:
1. Go to DICOM Settings
2. Add new destination:
   - **Name**: Cloud PACS
   - **AE Title**: `ORTHANC`
   - **IP Address**: `YOUR_SERVER_IP`
   - **Port**: `4242`
3. Test connection (DICOM Echo)
4. Send a test study

### Find Your Server IP:
```bash
# Get server IP address
ip addr show | grep "inet " | grep -v 127.0.0.1
```

## 🔍 Quick Checks

### Is Orthanc receiving studies?
```bash
curl -u orthanc:orthanc http://localhost:8042/studies
```

### Are studies in the database?
```bash
curl http://localhost:8001/api/dicom/studies | jq '.data | length'
```

### Is the webhook working?
```bash
tail -20 /var/log/orthanc.log | grep "Webhook"
```

## 🛟 Quick Troubleshooting

### Machine can't connect to Orthanc
```bash
# Test if port is open
telnet localhost 4242

# Check Orthanc is listening
netstat -tuln | grep 4242
```

### Studies not appearing in viewer
```bash
# Check backend is processing
tail -f /var/log/supervisor/backend.out.log | grep "Processing instance"

# Manual sync from Orthanc
curl -X POST http://localhost:8001/api/orthanc/sync-all
```

### Need to restart everything
```bash
# Restart all services
sudo supervisorctl restart all
pkill Orthanc && sleep 2
/usr/sbin/Orthanc /etc/orthanc/ > /var/log/orthanc.log 2>&1 &
```

## 📊 Quick Status Check
```bash
# One-line status check
echo "Orthanc: $(ps aux | grep -c Orthanc) | Backend: $(sudo supervisorctl status backend | grep RUNNING | wc -l) | Studies: $(curl -s http://localhost:8001/api/dicom/studies | jq '.data | length')"
```

## 🔐 Default Credentials

**Orthanc**:
- URL: http://localhost:8042
- Username: `orthanc`
- Password: `orthanc`
- AE Title: `ORTHANC`
- DICOM Port: `4242`

**Backend API**:
- URL: http://localhost:8001
- No authentication (add in production!)

**Frontend**:
- URL: http://localhost:3000

## 📱 Important URLs

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend Viewer | http://localhost:3000 | Main application |
| Backend API | http://localhost:8001/api | REST API |
| Orthanc PACS | http://localhost:8042 | PACS server |
| Orthanc Explorer | http://localhost:8042/app/explorer.html | PACS UI |
| MongoDB | mongodb://localhost:27017 | Database |

## 🧪 Test Commands

```bash
# Test Orthanc connectivity
curl -u orthanc:orthanc http://localhost:8042/system

# Test backend PACS endpoint
curl http://localhost:8001/api/pacs/test

# Send test DICOM studies
python /app/dicom-test-sender.py

# Check study count
curl -s http://localhost:8001/api/dicom/studies | jq '.data | length'

# View last 10 backend logs
tail -10 /var/log/supervisor/backend.out.log
```

## 📖 Full Documentation
See `PHASE1_ORTHANC_PACS_DOCUMENTATION.md` for complete details.

---

**Need Help?** Check the troubleshooting section in the full documentation.
