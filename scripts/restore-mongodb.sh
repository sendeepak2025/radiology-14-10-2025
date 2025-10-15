#!/bin/bash

##############################################################################
# MongoDB Restore Script for Medical Imaging Viewer
# 
# This script restores MongoDB database from backup
# Usage: ./restore-mongodb.sh <backup_file>
# Example: ./restore-mongodb.sh medical_imaging_backup_20251015_103000.tar.gz
##############################################################################

set -e  # Exit on error

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/app/backups}"
RESTORE_TEMP_DIR="/tmp/mongodb_restore_$$"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_info() {
    echo -e "${YELLOW}[INFO]${NC} $1"
}

# Check arguments
if [ $# -eq 0 ]; then
    log_error "No backup file specified"
    echo "Usage: $0 <backup_file>"
    echo "Example: $0 medical_imaging_backup_20251015_103000.tar.gz"
    echo ""
    echo "Available backups:"
    ls -lh "$BACKUP_DIR"/medical_imaging_backup_*.tar.gz 2>/dev/null || echo "  No backups found"
    exit 1
fi

BACKUP_FILE="$1"

# Check if backup file exists
if [ ! -f "$BACKUP_DIR/$BACKUP_FILE" ]; then
    log_error "Backup file not found: $BACKUP_DIR/$BACKUP_FILE"
    exit 1
fi

# Check if MongoDB URI is set
if [ -z "$MONGODB_URI" ]; then
    log_error "MONGODB_URI environment variable is not set"
    exit 1
fi

log "========================================="
log "MongoDB Restore Started"
log "========================================="
log_info "Backup file: $BACKUP_FILE"
log_info "MongoDB URI: ${MONGODB_URI%%@*}@***"

# Ask for confirmation
echo ""
read -p "⚠️  WARNING: This will OVERWRITE the current database. Continue? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    log_info "Restore cancelled by user"
    exit 0
fi

# Create temporary restore directory
mkdir -p "$RESTORE_TEMP_DIR"
log_info "Created temporary directory: $RESTORE_TEMP_DIR"

# Extract backup
log_info "Extracting backup..."
tar -xzf "$BACKUP_DIR/$BACKUP_FILE" -C "$RESTORE_TEMP_DIR"

if [ $? -eq 0 ]; then
    log_success "Backup extracted successfully"
else
    log_error "Failed to extract backup"
    rm -rf "$RESTORE_TEMP_DIR"
    exit 1
fi

# Find the backup directory
BACKUP_EXTRACT_DIR=$(find "$RESTORE_TEMP_DIR" -type d -name "medical_imaging_backup_*" | head -1)

if [ -z "$BACKUP_EXTRACT_DIR" ]; then
    log_error "Could not find extracted backup directory"
    rm -rf "$RESTORE_TEMP_DIR"
    exit 1
fi

# Display metadata if available
if [ -f "$BACKUP_EXTRACT_DIR/metadata.json" ]; then
    log_info "Backup metadata:"
    cat "$BACKUP_EXTRACT_DIR/metadata.json" | python3 -m json.tool 2>/dev/null || cat "$BACKUP_EXTRACT_DIR/metadata.json"
fi

# Perform restore
log_info "Starting mongorestore..."
if mongorestore --uri="$MONGODB_URI" --gzip --drop "$BACKUP_EXTRACT_DIR"; then
    log_success "Mongorestore completed successfully"
else
    log_error "Mongorestore failed"
    rm -rf "$RESTORE_TEMP_DIR"
    exit 1
fi

# Clean up
log_info "Cleaning up temporary files..."
rm -rf "$RESTORE_TEMP_DIR"

log "========================================="
log_success "MongoDB Restore Completed Successfully"
log "========================================="
log_info "Database has been restored from: $BACKUP_FILE"

exit 0
