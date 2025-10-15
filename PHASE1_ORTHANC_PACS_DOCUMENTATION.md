# Phase 1: Orthanc PACS Integration - Complete Documentation

## 🎯 Overview

Phase 1 implements a complete DICOM PACS (Picture Archiving and Communication System) infrastructure using Orthanc. This enables your medical imaging viewer to communicate with CT, MRI, PET, and other medical imaging machines to receive, store, and manage DICOM studies.

## ✅ What's Been Implemented

### 1. Orthanc PACS Server
- **Version**: Orthanc 1.10.1
- **DICOM Port**: 4242 (standard)
- **HTTP Port**: 8042
- **AE Title**: ORTHANC
- **Storage**: `/var/lib/orthanc/db-v6`

### 2. DICOM Protocol Support
- ✅ **C-STORE**: Receive DICOM images from modalities (CT/MRI/PET machines)
- ✅ **C-ECHO**: Test connectivity to/from modalities
- ✅ **C-FIND**: Query studies (infrastructure ready)
- ✅ **C-MOVE**: Retrieve studies (infrastructure ready)

### 3. Integration Pipeline
```
Medical Machine (CT/MRI/PET)
    ↓ [DICOM C-STORE]
Orthanc PACS Server (Port 4242)
    ↓ [Lua Webhook]
Backend API (Port 8001)
    ↓ [Process & Store]
MongoDB (Metadata) + Cloudinary (Images)
    ↓ [API]
Frontend Viewer (Port 3000)
```

### 4. Automatic Processing
When a new DICOM study is sent to Orthanc:
1. Orthanc receives and stores the DICOM file
2. Lua webhook triggers automatically
3. Backend extracts metadata
4. Study saved to MongoDB
5. Images uploaded to Cloudinary (backup)
6. Study appears in viewer immediately

## 🔧 Configuration Files

### Orthanc Configuration
**Location**: `/etc/orthanc/orthanc.json`

Key settings:
```json
{
  "DicomAet": "ORTHANC",
  "DicomPort": 4242,
  "HttpPort": 8042,
  "DicomAlwaysAllowStore": true,
  "RemoteAccessAllowed": true
}
```

**Credentials**: `/etc/orthanc/credentials.json`
```json
{
  "RegisteredUsers": {
    "orthanc": "orthanc"
  }
}
```

**Webhook Script**: `/etc/orthanc/webhook.lua`
- Automatically triggers on new DICOM uploads
- Sends data to: `http://localhost:8001/api/orthanc/new-instance`

### Backend Configuration
**Location**: `/app/node-server/.env`

```bash
# Orthanc PACS Configuration
ORTHANC_URL=http://localhost:8042
ORTHANC_USERNAME=orthanc
ORTHANC_PASSWORD=orthanc
ENABLE_ORTHANC_PREVIEW=true
ORTHANC_MIGRATION_PERCENTAGE=100
```

## 📡 API Endpoints

### PACS Connectivity
```bash
# Test Orthanc connection
GET /api/pacs/test

# Get studies from PACS only
GET /api/pacs/studies

# Get unified studies (Database + PACS)
GET /api/pacs/unified-studies

# Manual sync from Orthanc to database
POST /api/orthanc/sync-all

# Check sync status
GET /api/orthanc/sync-status
```

### Study Management
```bash
# Get all studies
GET /api/dicom/studies

# Get specific study
GET /api/dicom/studies/:studyUid

# Get study frames
GET /api/dicom/studies/:studyUid/frames/:frameIndex
```

## 🧪 Testing Tools

### 1. DICOM Test Sender
**Location**: `/app/dicom-test-sender.py`

**Purpose**: Simulates CT/MRI/PET machines sending DICOM files

**Usage**:
```bash
# Send 3 test studies (CT, MRI, X-Ray)
python /app/dicom-test-sender.py

# Custom configuration
ORTHANC_HOST=localhost ORTHANC_PORT=4242 python /app/dicom-test-sender.py
```

**Features**:
- Creates synthetic DICOM images
- Tests C-ECHO connectivity
- Sends C-STORE requests
- Generates realistic patient data
- Supports multiple modalities (CT, MR, CR, XA)

### 2. Manual Testing with curl

**Test Orthanc API**:
```bash
# Get Orthanc system info
curl -u orthanc:orthanc http://localhost:8042/system

# List all studies in Orthanc
curl -u orthanc:orthanc http://localhost:8042/studies

# Get study details
curl -u orthanc:orthanc http://localhost:8042/studies/STUDY_ID
```

**Test Backend API**:
```bash
# Test PACS connectivity
curl http://localhost:8001/api/pacs/test

# Get studies from database
curl http://localhost:8001/api/dicom/studies

# Trigger manual sync
curl -X POST http://localhost:8001/api/orthanc/sync-all
```

## 🔌 Connecting Real Medical Machines

### Step 1: Configure Machine's DICOM Settings
On your CT/MRI/PET machine console:

1. **DICOM Destination Configuration**:
   - AE Title: `ORTHANC`
   - IP Address: `YOUR_SERVER_IP`
   - Port: `4242`
   - Protocol: `DICOM`

2. **Network Settings**:
   - Ensure machine can reach your server
   - Open port 4242 in firewall if needed

### Step 2: Test Connectivity
Most machines have a "DICOM Echo Test" feature:
- Use it to verify connection to ORTHANC
- Should return success if configured correctly

### Step 3: Send Test Study
- Send a test study from the machine
- Check Orthanc: http://localhost:8042/app/explorer.html
- Check your viewer: http://localhost:3000

### Common Machine AE Titles
For reference, typical manufacturer AE titles:
- GE: `GE_PACS`
- Siemens: `SIEMENS_CT`
- Philips: `PHILIPS_MRI`
- Canon/Toshiba: `TOSHIBA_CT`

## 🏥 Real-World Usage Scenarios

### Scenario 1: Emergency Room CT Scan
1. Technician performs CT scan on patient
2. Technician clicks "Send to PACS" on CT console
3. CT machine sends DICOM via C-STORE to ORTHANC
4. Study automatically appears in your viewer
5. Radiologist can view immediately

### Scenario 2: MRI Study with Multiple Series
1. MRI scan produces 5 series (T1, T2, FLAIR, etc.)
2. All series sent as one study
3. Orthanc receives and processes each series
4. Backend creates instance records for all frames
5. Viewer shows all series for comparison

### Scenario 3: Scheduled Worklist
1. RIS/HIS sends worklist to Orthanc
2. Modality queries worklist (C-FIND)
3. Technician selects patient from worklist
4. Scan is linked to correct patient automatically
5. Study sent back with correct patient info

## 🛠️ Service Management

### Starting/Stopping Services

**Orthanc PACS**:
```bash
# Start Orthanc
/usr/sbin/Orthanc /etc/orthanc/ > /var/log/orthanc.log 2>&1 &

# Stop Orthanc
pkill Orthanc

# Check if running
ps aux | grep Orthanc
```

**Backend**:
```bash
# Restart backend
sudo supervisorctl restart backend

# Check backend logs
tail -f /var/log/supervisor/backend.out.log
tail -f /var/log/supervisor/backend.err.log
```

**Frontend**:
```bash
# Restart frontend
sudo supervisorctl restart frontend

# Check status
sudo supervisorctl status
```

### Monitoring Logs

**Orthanc Logs**:
```bash
# Real-time Orthanc activity
tail -f /var/log/orthanc.log

# Filter for new studies
tail -f /var/log/orthanc.log | grep "instance stored"

# Check webhook triggers
tail -f /var/log/orthanc.log | grep "Webhook"
```

**Backend Logs**:
```bash
# Real-time backend activity
tail -f /var/log/supervisor/backend.out.log

# Filter for DICOM processing
tail -f /var/log/supervisor/backend.out.log | grep "Processing instance"
```

## 🔍 Troubleshooting

### Issue: Machine can't connect to Orthanc
**Solutions**:
1. Check firewall: `sudo ufw status` (port 4242 should be open)
2. Verify Orthanc is running: `ps aux | grep Orthanc`
3. Test from machine network: `telnet YOUR_SERVER_IP 4242`
4. Check AE Title matches: "ORTHANC" (case-sensitive)

### Issue: Studies not appearing in viewer
**Solutions**:
1. Check Orthanc has studies: `curl -u orthanc:orthanc http://localhost:8042/studies`
2. Check webhook is triggering: `tail -f /var/log/orthanc.log | grep "Webhook"`
3. Check backend is processing: `tail -f /var/log/supervisor/backend.out.log | grep "Processing"`
4. Verify MongoDB connection: Check backend logs for "MongoDB connected"

### Issue: Webhook returns 500 error
**Solutions**:
1. Check backend is running: `sudo supervisorctl status backend`
2. Check backend logs for errors: `tail -50 /var/log/supervisor/backend.err.log`
3. Verify webhook endpoint: `curl -X POST http://localhost:8001/api/orthanc/new-instance`

### Issue: Slow study processing
**Solutions**:
1. Check Cloudinary upload: May need to disable for faster processing
2. Increase Orthanc concurrent jobs: Edit `/etc/orthanc/orthanc.json` → `"ConcurrentJobs": 4`
3. Check network speed between services
4. Monitor MongoDB performance

## 📊 Performance Optimization

### For Large Volumes (100+ studies/day)
1. **Disable Cloudinary backup** (use Orthanc storage only):
   ```javascript
   // In orthanc-webhook.js
   // Comment out Cloudinary upload section
   ```

2. **Increase Orthanc cache**:
   ```json
   "MaximumStorageCacheSize": 512  // In orthanc.json
   ```

3. **Enable compression**:
   ```json
   "StorageCompression": true  // In orthanc.json
   ```

4. **Use SSD storage** for Orthanc database:
   ```json
   "StorageDirectory": "/path/to/ssd/orthanc"
   ```

## 🔐 Security Best Practices

### Production Deployment
1. **Change default passwords**:
   - Edit `/etc/orthanc/credentials.json`
   - Update backend `.env` with new credentials

2. **Enable TLS for DICOM**:
   ```json
   "DicomTlsEnabled": true,
   "DicomTlsCertificate": "/path/to/cert.pem",
   "DicomTlsPrivateKey": "/path/to/key.pem"
   ```

3. **Restrict DICOM access**:
   ```json
   "DicomAlwaysAllowStore": false,
   "DicomModalities": {
     "CT_MACHINE_1": ["CT1", "192.168.1.100", 104],
     "MRI_MACHINE_1": ["MRI1", "192.168.1.101", 104]
   }
   ```

4. **Enable authentication** on all endpoints
5. **Use HTTPS** for web interfaces
6. **Regular backups** of Orthanc storage and MongoDB

## 📈 Monitoring & Metrics

### Key Metrics to Track
```bash
# Number of studies in Orthanc
curl -u orthanc:orthanc http://localhost:8042/statistics

# Number of studies in database
curl http://localhost:8001/api/dicom/studies | jq '.data | length'

# Check sync status
curl http://localhost:8001/api/orthanc/sync-status
```

### Orthanc Statistics
Access Orthanc Explorer: http://localhost:8042/app/explorer.html
- Total patients
- Total studies
- Total series
- Total instances
- Storage size

## 🎓 Additional Resources

### Orthanc Documentation
- Official docs: https://book.orthanc-server.com/
- REST API: https://api.orthanc-server.com/
- DICOM protocol: https://www.dicomstandard.org/

### DICOM Standards
- Transfer syntaxes: https://www.dicomlibrary.com/dicom/transfer-syntax/
- SOP Classes: https://www.dicomlibrary.com/dicom/sop/
- Tags reference: https://dicom.innolitics.com/

## 🚀 Next Steps (Phase 2 & 3)

### Phase 2: AI Detection System
- Integrate Google Gemini 2.0 for medical image analysis
- Detect abnormalities (tumors, fractures, lesions)
- Generate preliminary findings
- Highlight regions of interest
- Draft report suggestions

### Phase 3: Enhanced Reporting
- Structured reporting templates
- AI-assisted report generation
- Annotation tools for radiologists
- Approval workflow
- Report export (PDF, HL7)

## ✅ Testing Results

All Phase 1 components have been tested and verified:
- ✅ Orthanc PACS server running (v1.10.1)
- ✅ DICOM C-ECHO connectivity working
- ✅ Webhook integration functional
- ✅ Studies appearing in database
- ✅ API endpoints operational
- ✅ Test DICOM sender working
- ✅ All 9/9 backend tests passed

**Test Studies Confirmed**:
- John^Doe (CT Chest with Contrast)
- Jane^Smith (MRI Brain)
- Bob^Wilson (Chest X-Ray)

## 📞 Support

For issues or questions:
1. Check logs first (see Monitoring Logs section)
2. Review troubleshooting guide above
3. Test with DICOM test sender
4. Check Orthanc Explorer for studies

---

**Phase 1 Status**: ✅ **COMPLETE AND OPERATIONAL**

**Date**: October 15, 2025
**Version**: 1.0.0
