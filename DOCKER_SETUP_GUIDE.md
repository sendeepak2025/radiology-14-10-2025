# Docker Setup Guide - Medical Imaging PACS System
## One-Command Deployment for USA Hospitals

---

## 🚀 Quick Start (5 Minutes)

### **Prerequisites**
- Docker Desktop installed ([Download](https://www.docker.com/products/docker-desktop/))
- 4GB+ RAM available
- 20GB+ disk space

###  **Step 1: Get the Code**
```bash
# Clone or download the repository
cd /path/to/pacs-system
```

### **Step 2: Configure Environment**
```bash
# Copy environment template
cp .env.template .env

# Edit .env file with your credentials
nano .env  # or use any text editor
```

**Required Variables**:
```bash
# MongoDB (Get free at mongodb.com/cloud/atlas)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/radiology

# Cloudinary (Get free at cloudinary.com)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Emergent LLM Key (for AI features)
EMERGENT_LLM_KEY=sk-emergent-your-key-here
```

### **Step 3: Start All Services**
```bash
# One command to rule them all!
docker-compose up -d
```

### **Step 4: Verify Installation**
```bash
# Check all services are running
docker-compose ps

# Expected output:
# NAME                STATUS              PORTS
# pacs-frontend       Up (healthy)        0.0.0.0:3000->3000/tcp
# pacs-backend        Up (healthy)        0.0.0.0:8001->8001/tcp
# pacs-ai-service     Up (healthy)        0.0.0.0:8002->8002/tcp
# pacs-orthanc        Up (healthy)        0.0.0.0:4242->4242/tcp, 0.0.0.0:8042->8042/tcp
```

### **Step 5: Access the Application**
Open browser and go to:
- **Main Application**: http://localhost:3000
- **Backend API**: http://localhost:8001
- **Orthanc PACS**: http://localhost:8042 (user: orthanc, pass: orthanc)

---

## 📊 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Docker Network                           │
│                                                             │
│  ┌────────────┐  ┌────────────┐  ┌───────────────┐       │
│  │  Frontend  │  │  Backend   │  │  AI Service   │       │
│  │  (Port     │←→│  (Port     │←→│  (Port 8002)  │       │
│  │   3000)    │  │   8001)    │  │               │       │
│  └────────────┘  └────────────┘  └───────────────┘       │
│         ↓              ↓                  ↓               │
│  ┌────────────────────────────────────────────┐           │
│  │         Orthanc PACS Server                │           │
│  │   DICOM: 4242  |  HTTP: 8042               │           │
│  └────────────────────────────────────────────┘           │
│         ↓                                                  │
│  ┌────────────────────────────────────────────┐           │
│  │         Volume: orthanc-data                │           │
│  │    (Persistent DICOM Storage)               │           │
│  └────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────┘
                          ↕
              External Services (Cloud)
         ┌──────────────┬──────────────┐
         │   MongoDB    │  Cloudinary  │
         │   Atlas      │   Storage    │
         └──────────────┴──────────────┘
```

---

## 🛠️ Management Commands

### **Starting Services**
```bash
# Start all services
docker-compose up -d

# Start specific service
docker-compose up -d backend

# View logs while starting
docker-compose up
```

### **Stopping Services**
```bash
# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: deletes data!)
docker-compose down -v
```

### **Viewing Logs**
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f ai-service
docker-compose logs -f orthanc

# Last 100 lines
docker-compose logs --tail=100 backend
```

### **Restarting Services**
```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart backend
```

### **Updating Services**
```bash
# Pull latest code
git pull

# Rebuild and restart
docker-compose up -d --build
```

### **Health Checks**
```bash
# Check service health
docker-compose ps

# Manual health checks
curl http://localhost:3000/health  # Frontend
curl http://localhost:8001/health  # Backend
curl http://localhost:8002/health  # AI Service
curl -u orthanc:orthanc http://localhost:8042/system  # Orthanc
```

---

## 🔧 Troubleshooting

### **Issue: Containers won't start**
```bash
# Check Docker is running
docker --version

# Check ports are available
lsof -i :3000
lsof -i :8001
lsof -i :4242

# View error logs
docker-compose logs backend
```

### **Issue: Backend can't connect to MongoDB**
```bash
# Verify MongoDB URI in .env
cat .env | grep MONGODB_URI

# Test connection
docker-compose exec backend node -e "const mongoose = require('mongoose'); mongoose.connect(process.env.MONGODB_URI).then(() => console.log('OK')).catch(e => console.error(e))"
```

### **Issue: AI service not working**
```bash
# Check AI service logs
docker-compose logs ai-service

# Verify Emergent LLM key
docker-compose exec ai-service python -c "import os; print('Key:', os.getenv('EMERGENT_LLM_KEY'))"

# Test AI service
curl http://localhost:8002/health
```

### **Issue: Orthanc not receiving DICOM**
```bash
# Check Orthanc logs
docker-compose logs orthanc

# Verify port 4242 is open
docker-compose exec orthanc netstat -ln | grep 4242

# Test DICOM echo
# (from CT/MRI machine or DICOM test tool)
```

### **Issue: Out of disk space**
```bash
# Check Docker disk usage
docker system df

# Clean up unused resources
docker system prune -a

# Check orthanc volume size
docker volume inspect pacs_orthanc-data
```

---

## 🏥 Connecting Medical Machines

### **Step 1: Get Server IP Address**
```bash
# On server/computer running Docker
ipconfig  # Windows
ifconfig  # Mac/Linux
ip addr   # Linux
```

### **Step 2: Configure CT/MRI/PET Machine**
On the medical imaging machine:
1. Go to DICOM settings
2. Add new destination:
   - **Name**: Cloud PACS
   - **AE Title**: ORTHANC
   - **IP Address**: [Your Server IP]
   - **Port**: 4242
3. Test connection (DICOM Echo)
4. Send a test study

### **Step 3: Verify Study Received**
```bash
# Check Orthanc received the study
curl -u orthanc:orthanc http://localhost:8042/studies

# Check backend processed it
curl http://localhost:8001/api/dicom/studies

# View in web interface
# Open: http://localhost:3000
```

---

## 📈 Performance Tuning

### **For High Volume (100+ studies/day)**
```yaml
# docker-compose.yml modifications
services:
  backend:
    deploy:
      replicas: 3  # Scale backend
      resources:
        limits:
          cpus: '2'
          memory: 4G
  
  orthanc:
    environment:
      - ORTHANC_MAXIMUM_STORAGE_SIZE=500000  # 500GB
      - ORTHANC_CONCURRENT_JOBS=4
    volumes:
      - /path/to/ssd:/var/lib/orthanc/db  # Use SSD for better performance
```

### **Memory Optimization**
```bash
# Limit container memory
docker-compose up -d --scale backend=2 --memory 2g
```

---

## 🔐 Production Security

### **1. Change Default Passwords**
```bash
# Generate strong passwords
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Update .env file
JWT_SECRET=<generated-secret>
SESSION_SECRET=<generated-secret>
```

### **2. Use HTTPS**
```bash
# Option A: Use reverse proxy (nginx/Caddy)
# Option B: Modify docker-compose.yml to add SSL certificates
```

### **3. Firewall Rules**
```bash
# Only allow necessary ports
# Port 3000: Web interface
# Port 4242: DICOM from hospital network only
# Block: 8001, 8002, 8042 from public internet
```

### **4. Regular Backups**
```bash
# Backup Orthanc data
docker run --rm -v pacs_orthanc-data:/data -v $(pwd):/backup alpine tar czf /backup/orthanc-backup-$(date +%Y%m%d).tar.gz /data

# Backup MongoDB
# Use MongoDB Atlas built-in backups or:
mongodump --uri="$MONGODB_URI"
```

---

## 📊 Monitoring

### **Resource Usage**
```bash
# Container stats
docker stats

# Disk usage
docker system df
```

### **Service Health**
```bash
# Create monitoring script
cat > check-health.sh << 'EOF'
#!/bin/bash
echo "Checking PACS System Health..."
curl -f http://localhost:3000/health && echo "✓ Frontend OK" || echo "✗ Frontend DOWN"
curl -f http://localhost:8001/health && echo "✓ Backend OK" || echo "✗ Backend DOWN"
curl -f http://localhost:8002/health && echo "✓ AI Service OK" || echo "✗ AI Service DOWN"
curl -f -u orthanc:orthanc http://localhost:8042/system && echo "✓ Orthanc OK" || echo "✗ Orthanc DOWN"
EOF
chmod +x check-health.sh

# Run health check
./check-health.sh
```

### **Set Up Uptime Monitoring**
- Use UptimeRobot (free)
- Or internal monitoring tools

---

## 💰 Cost Estimates (Monthly)

### **Small Hospital (10-50 users, 100 studies/month)**
```
MongoDB Atlas (M10): $57
Cloudinary (25 GB): $100
AI Analyses (100): $50
Server (DigitalOcean): $40
Total: ~$247/month
```

### **Medium Hospital (50-200 users, 500 studies/month)**
```
MongoDB Atlas (M20): $145
Cloudinary (100 GB): $200
AI Analyses (500): $150
Server (DigitalOcean): $80
Total: ~$575/month
```

---

## 🆘 Getting Help

### **Check Logs First**
```bash
docker-compose logs --tail=100
```

### **Common Issues**
- Port conflicts: Change ports in docker-compose.yml
- Memory issues: Increase Docker Desktop memory limit
- Network issues: Check firewall settings

### **Documentation**
- Phase 1: PACS Setup → `PHASE1_ORTHANC_PACS_DOCUMENTATION.md`
- Phase 2: AI Detection → `PHASE2_AI_DETECTION_DOCUMENTATION.md`
- Phase 3: Frontend → `PHASE3_FRONTEND_REPORTING_DOCUMENTATION.md`
- Complete Workflow → `COMPLETE_WORKFLOW_GUIDE.md`

---

## ✅ Post-Installation Checklist

- [ ] All services running (`docker-compose ps` shows healthy)
- [ ] Can access frontend (http://localhost:3000)
- [ ] Can login (user: admin, pass: admin123)
- [ ] Backend API responding (http://localhost:8001/health)
- [ ] AI service working (http://localhost:8002/health)
- [ ] Orthanc accessible (http://localhost:8042)
- [ ] Test DICOM upload works
- [ ] 2D viewer displays images
- [ ] 3D viewer initializes (click "START 3D RENDERING")
- [ ] AI analysis works (click "Analyze with AI")
- [ ] Environment variables set correctly
- [ ] Backups configured

---

**Your Medical Imaging PACS is now running in Docker!** 🎉

**Next Steps**:
1. Configure medical machines to send to port 4242
2. Create additional user accounts
3. Set up regular backups
4. Configure monitoring
5. Review security settings for production
