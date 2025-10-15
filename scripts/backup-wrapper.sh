#!/bin/bash
# Load environment variables
export $(cat /app/node-server/.env | grep -v '^#' | xargs 2>/dev/null) 2>/dev/null || true
# Run backup script
/app/scripts/backup-mongodb.sh >> /app/logs/backup.log 2>&1
