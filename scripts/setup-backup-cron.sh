#!/bin/bash

# Script to set up automated database backups using cron
# Run this once to configure periodic backups

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Get the absolute path to the project directory
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_SCRIPT="$PROJECT_DIR/scripts/backup-database.sh"

echo "🕒 AgMCP Database Backup Scheduler"
echo "=================================="
echo ""

# Check if backup script exists
if [ ! -f "$BACKUP_SCRIPT" ]; then
    log_error "Backup script not found at: $BACKUP_SCRIPT"
    exit 1
fi

# Make sure backup script is executable
chmod +x "$BACKUP_SCRIPT"

log_info "Project directory: $PROJECT_DIR"
log_info "Backup script: $BACKUP_SCRIPT"

echo ""
echo "Please choose a backup frequency:"
echo "1) Every 6 hours"
echo "2) Daily at 2 AM"
echo "3) Daily at 6 AM"  
echo "4) Twice daily (6 AM and 6 PM)"
echo "5) Custom schedule"
echo "6) Show current cron jobs"
echo "7) Remove backup cron jobs"

read -p "Enter your choice (1-7): " choice

case $choice in
    1)
        # Every 6 hours
        CRON_SCHEDULE="0 */6 * * *"
        DESCRIPTION="every 6 hours"
        ;;
    2)
        # Daily at 2 AM
        CRON_SCHEDULE="0 2 * * *"
        DESCRIPTION="daily at 2:00 AM"
        ;;
    3)
        # Daily at 6 AM
        CRON_SCHEDULE="0 6 * * *"
        DESCRIPTION="daily at 6:00 AM"
        ;;
    4)
        # Twice daily
        CRON_SCHEDULE="0 6,18 * * *"
        DESCRIPTION="twice daily (6:00 AM and 6:00 PM)"
        ;;
    5)
        # Custom schedule
        echo ""
        echo "Enter a custom cron schedule (5 fields: minute hour day month weekday)"
        echo "Examples:"
        echo "  0 3 * * *     - Daily at 3:00 AM"
        echo "  30 */4 * * *  - Every 4 hours at 30 minutes past"
        echo "  0 0 * * 0     - Weekly on Sunday at midnight"
        read -p "Cron schedule: " CRON_SCHEDULE
        DESCRIPTION="custom schedule: $CRON_SCHEDULE"
        ;;
    6)
        # Show current cron jobs
        echo ""
        log_info "Current cron jobs:"
        crontab -l 2>/dev/null | grep -E "(backup-database|agmcp)" || echo "No AgMCP backup jobs found"
        exit 0
        ;;
    7)
        # Remove backup cron jobs
        echo ""
        log_info "Removing AgMCP backup cron jobs..."
        (crontab -l 2>/dev/null | grep -v "backup-database.sh" | grep -v "# AgMCP Database Backup") | crontab -
        log_success "Backup cron jobs removed"
        exit 0
        ;;
    *)
        log_error "Invalid choice"
        exit 1
        ;;
esac

# Validate cron schedule format
if ! echo "$CRON_SCHEDULE" | grep -E '^[0-9*,/-]+ [0-9*,/-]+ [0-9*,/-]+ [0-9*,/-]+ [0-9*,/-]+$' > /dev/null; then
    log_error "Invalid cron schedule format: $CRON_SCHEDULE"
    exit 1
fi

echo ""
log_info "Setting up backup schedule: $DESCRIPTION"
log_info "Cron schedule: $CRON_SCHEDULE"

# Create the cron job entry
CRON_COMMENT="# AgMCP Database Backup - $DESCRIPTION"
CRON_JOB="$CRON_SCHEDULE cd $PROJECT_DIR && ./scripts/backup-database.sh >> ./logs/backup.log 2>&1"

# Create logs directory if it doesn't exist
mkdir -p "$PROJECT_DIR/logs"

# Remove any existing AgMCP backup jobs
(crontab -l 2>/dev/null | grep -v "backup-database.sh" | grep -v "# AgMCP Database Backup") | crontab -

# Add the new cron job
(crontab -l 2>/dev/null; echo "$CRON_COMMENT"; echo "$CRON_JOB") | crontab -

echo ""
log_success "Backup schedule configured successfully!"
log_info "Schedule: $DESCRIPTION"
log_info "Logs will be written to: $PROJECT_DIR/logs/backup.log"

echo ""
echo "📋 Configuration Summary:"
echo "  • Backup frequency: $DESCRIPTION"
echo "  • Backup location: $PROJECT_DIR/backups/"
echo "  • Log location: $PROJECT_DIR/logs/backup.log"
echo "  • Retention: 30 days (configurable via BACKUP_RETENTION_DAYS)"
echo "  • Max backups: 50 (configurable via MAX_BACKUPS)"

echo ""
echo "🔧 Management Commands:"
echo "  • View logs: tail -f $PROJECT_DIR/logs/backup.log"
echo "  • List backups: $BACKUP_SCRIPT --list"
echo "  • Manual backup: $BACKUP_SCRIPT"
echo "  • Clean old backups: $BACKUP_SCRIPT --cleanup"
echo "  • View cron jobs: crontab -l"
echo "  • Remove schedule: $0 and choose option 7"

echo ""
log_info "Testing backup script..."
if "$BACKUP_SCRIPT" --help > /dev/null 2>&1; then
    log_success "Backup script is working correctly"
else
    log_warning "Backup script may have issues - please test manually"
fi

echo ""
log_success "Setup complete! Your database will be backed up $DESCRIPTION"
