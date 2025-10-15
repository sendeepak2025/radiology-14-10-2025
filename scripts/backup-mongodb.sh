#!/bin/bash

##############################################################################
# MongoDB Backup Script for Medical Imaging Viewer
# 
# This script performs automated backups of the MongoDB database
# Usage: ./backup-mongodb.sh
# 
# Environment Variables Required:
#   MONGODB_URI - MongoDB connection string
#   BACKUP_DIR - Directory to store backups (default: /app/backups)
#   RETENTION_DAYS - Number of days to keep backups (default: 30)
##############################################################################

set -e  # Exit on error

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/app/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="medical_imaging_backup_${TIMESTAMP}"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"
LOG_FILE="${BACKUP_DIR}/backup.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

log_info() {
    echo -e "${YELLOW}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

log "========================================="
log "MongoDB Backup Started"
log "========================================="

# Check if MongoDB URI is set
if [ -z "$MONGODB_URI" ]; then
    log_error "MONGODB_URI environment variable is not set"
    log_error "Please set it in /app/node-server/.env"
    exit 1
fi

# Extract database name from MongoDB URI
DB_NAME=$(echo $MONGODB_URI | sed -n 's/.*\/\([^?]*\).*/\1/p')
log_info "Database: $DB_NAME"
log_info "Backup location: $BACKUP_PATH"

# Perform backup using mongodump
log_info "Starting mongodump..."

if mongodump --uri="$MONGODB_URI" --out="$BACKUP_PATH" --gzip 2>&1 | tee -a "$LOG_FILE"; then
    log_success "Mongodump completed successfully"
else
    log_error "Mongodump failed"
    exit 1
fi

# Create a backup metadata file
cat > "${BACKUP_PATH}/metadata.json" << EOF
{
  "timestamp": "$(date -Iseconds)",
  "database": "$DB_NAME",
  "backup_name": "$BACKUP_NAME",
  "mongo_version": "$(mongodump --version | head -1)",
  "hostname": "$(hostname)",
  "backup_size": "$(du -sh $BACKUP_PATH | cut -f1)"
}
EOF

log_info "Backup metadata created"

# Compress backup into tar.gz
log_info "Compressing backup..."
cd "$BACKUP_DIR"
tar -czf "${BACKUP_NAME}.tar.gz" "$BACKUP_NAME" 2>&1 | tee -a "$LOG_FILE"

if [ $? -eq 0 ]; then
    # Remove uncompressed backup
    rm -rf "$BACKUP_PATH"
    
    BACKUP_SIZE=$(du -sh "${BACKUP_NAME}.tar.gz" | cut -f1)
    log_success "Backup compressed: ${BACKUP_NAME}.tar.gz (${BACKUP_SIZE})"
else
    log_error "Compression failed"
    exit 1
fi

# Verify backup integrity
log_info "Verifying backup integrity..."
if tar -tzf "${BACKUP_NAME}.tar.gz" > /dev/null 2>&1; then
    log_success "Backup integrity verified"
else
    log_error "Backup integrity check failed"
    exit 1
fi

# Clean up old backups
log_info "Cleaning up old backups (retention: ${RETENTION_DAYS} days)..."
find "$BACKUP_DIR" -name "medical_imaging_backup_*.tar.gz" -type f -mtime +${RETENTION_DAYS} -delete 2>&1 | tee -a "$LOG_FILE"

OLD_BACKUP_COUNT=$(find "$BACKUP_DIR" -name "medical_imaging_backup_*.tar.gz" -type f | wc -l)
log_info "Total backups retained: $OLD_BACKUP_COUNT"

# Display backup summary
log "========================================="
log "Backup Summary"
log "========================================="
log_info "Backup file: ${BACKUP_NAME}.tar.gz"
log_info "Size: ${BACKUP_SIZE}"
log_info "Location: ${BACKUP_DIR}"
log_info "Retention: ${RETENTION_DAYS} days"
log_info "Total backups: ${OLD_BACKUP_COUNT}"
log "========================================="
log_success "MongoDB Backup Completed Successfully"
log "========================================="

# Optional: Upload to cloud storage (S3, Google Cloud Storage, etc.)
# Uncomment and configure if needed
# if [ ! -z "$AWS_S3_BUCKET" ]; then
#     log_info "Uploading backup to S3..."
#     aws s3 cp "${BACKUP_NAME}.tar.gz" "s3://${AWS_S3_BUCKET}/backups/"
#     log_success "Backup uploaded to S3"
# fi

exit 0
