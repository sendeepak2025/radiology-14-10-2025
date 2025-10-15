#!/bin/bash

##############################################################################
# Setup Automated Backup Cron Job
# 
# This script configures a cron job for automated daily backups
# Usage: ./setup-backup-cron.sh
##############################################################################

set -e

echo "========================================="
echo "Setting up Automated MongoDB Backups"
echo "========================================="

# Load environment variables
if [ -f /app/node-server/.env ]; then
    export $(cat /app/node-server/.env | grep -v '^#' | xargs)
    echo "✓ Environment variables loaded"
else
    echo "⚠️  Warning: /app/node-server/.env not found"
fi

# Create backup directory
mkdir -p /app/backups
mkdir -p /app/logs

echo "✓ Backup directory created: /app/backups"

# Create a wrapper script that loads environment variables
cat > /app/scripts/backup-wrapper.sh << 'EOF'
#!/bin/bash
# Load environment variables
export $(cat /app/node-server/.env | grep -v '^#' | xargs 2>/dev/null) 2>/dev/null || true
# Run backup script
/app/scripts/backup-mongodb.sh >> /app/logs/backup.log 2>&1
EOF

chmod +x /app/scripts/backup-wrapper.sh
echo "✓ Backup wrapper script created"

# Backup schedule options
echo ""
echo "Select backup schedule:"
echo "1) Daily at 2:00 AM"
echo "2) Daily at 3:00 AM"
echo "3) Every 12 hours"
echo "4) Every 6 hours"
echo "5) Custom (you provide cron expression)"

read -p "Enter choice [1-5]: " SCHEDULE_CHOICE

case $SCHEDULE_CHOICE in
    1)
        CRON_SCHEDULE="0 2 * * *"
        DESCRIPTION="Daily at 2:00 AM"
        ;;
    2)
        CRON_SCHEDULE="0 3 * * *"
        DESCRIPTION="Daily at 3:00 AM"
        ;;
    3)
        CRON_SCHEDULE="0 */12 * * *"
        DESCRIPTION="Every 12 hours"
        ;;
    4)
        CRON_SCHEDULE="0 */6 * * *"
        DESCRIPTION="Every 6 hours"
        ;;
    5)
        read -p "Enter cron expression: " CRON_SCHEDULE
        DESCRIPTION="Custom schedule"
        ;;
    *)
        echo "Invalid choice. Using default: Daily at 2:00 AM"
        CRON_SCHEDULE="0 2 * * *"
        DESCRIPTION="Daily at 2:00 AM"
        ;;
esac

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "backup-wrapper.sh"; then
    echo "⚠️  Cron job already exists. Updating..."
    # Remove old entry
    crontab -l 2>/dev/null | grep -v "backup-wrapper.sh" | crontab -
fi

# Add new cron job
(crontab -l 2>/dev/null; echo "# MongoDB Backup - $DESCRIPTION"; echo "$CRON_SCHEDULE /app/scripts/backup-wrapper.sh") | crontab -

echo ""
echo "========================================="
echo "✓ Backup Cron Job Configured"
echo "========================================="
echo "Schedule: $DESCRIPTION"
echo "Cron expression: $CRON_SCHEDULE"
echo "Logs: /app/logs/backup.log"
echo "Backups: /app/backups/"
echo ""
echo "To view current cron jobs:"
echo "  crontab -l"
echo ""
echo "To run a manual backup now:"
echo "  /app/scripts/backup-mongodb.sh"
echo ""
echo "To remove the cron job:"
echo "  crontab -l | grep -v 'backup-wrapper.sh' | crontab -"
echo "========================================="
