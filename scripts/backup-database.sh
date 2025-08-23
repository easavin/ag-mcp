#!/bin/bash

# Database Backup Script for AgMCP
# Supports both development and production environments

set -e  # Exit on any error

# Load environment variables
if [ -f .env.local ]; then
    export $(grep -v '^#' .env.local | xargs)
fi

if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
MAX_BACKUPS="${MAX_BACKUPS:-50}"

# Database connection
DB_URL="${DATABASE_URL}"
DB_NAME="${DB_NAME:-agmcp_dev}"

# Backup file naming
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="agmcp_backup_${TIMESTAMP}.sql"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILE}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
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

# Check dependencies
check_dependencies() {
    log_info "Checking dependencies..."
    
    if ! command -v pg_dump &> /dev/null; then
        log_error "pg_dump is not installed. Please install PostgreSQL client tools."
        exit 1
    fi
    
    if ! command -v gzip &> /dev/null; then
        log_error "gzip is not installed."
        exit 1
    fi
    
    log_success "All dependencies are available"
}

# Create backup directory
create_backup_dir() {
    if [ ! -d "$BACKUP_DIR" ]; then
        log_info "Creating backup directory: $BACKUP_DIR"
        mkdir -p "$BACKUP_DIR"
    fi
}

# Get database size
get_db_size() {
    if [ -n "$DB_URL" ]; then
        psql "$DB_URL" -t -c "SELECT pg_size_pretty(pg_database_size(current_database()));" 2>/dev/null | xargs || echo "Unknown"
    else
        echo "Unknown"
    fi
}

# Perform backup
perform_backup() {
    log_info "Starting database backup..."
    log_info "Database: $DB_NAME"
    log_info "Backup file: $BACKUP_PATH"
    
    # Get database size for logging
    DB_SIZE=$(get_db_size)
    log_info "Database size: $DB_SIZE"
    
    # Create the backup
    if [ -n "$DB_URL" ]; then
        # Use DATABASE_URL if available
        log_info "Using DATABASE_URL for backup"
        pg_dump "$DB_URL" > "$BACKUP_PATH"
    else
        # Fall back to individual connection parameters
        log_info "Using individual connection parameters"
        pg_dump -h "${DB_HOST:-localhost}" \
                -p "${DB_PORT:-5432}" \
                -U "${DB_USER:-postgres}" \
                -d "$DB_NAME" > "$BACKUP_PATH"
    fi
    
    # Check if backup was successful
    if [ $? -eq 0 ] && [ -s "$BACKUP_PATH" ]; then
        # Compress the backup
        log_info "Compressing backup..."
        gzip "$BACKUP_PATH"
        BACKUP_PATH="${BACKUP_PATH}.gz"
        
        # Get backup file size
        BACKUP_SIZE=$(du -h "$BACKUP_PATH" | cut -f1)
        log_success "Backup completed successfully"
        log_success "Compressed backup size: $BACKUP_SIZE"
        log_success "Backup saved to: $BACKUP_PATH"
        
        return 0
    else
        log_error "Backup failed"
        rm -f "$BACKUP_PATH" 2>/dev/null
        return 1
    fi
}

# Clean old backups
cleanup_old_backups() {
    log_info "Cleaning up old backups..."
    
    # Remove backups older than RETENTION_DAYS
    if [ "$RETENTION_DAYS" -gt 0 ]; then
        find "$BACKUP_DIR" -name "agmcp_backup_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
        log_info "Removed backups older than $RETENTION_DAYS days"
    fi
    
    # Keep only MAX_BACKUPS most recent files
    if [ "$MAX_BACKUPS" -gt 0 ]; then
        BACKUP_COUNT=$(find "$BACKUP_DIR" -name "agmcp_backup_*.sql.gz" -type f | wc -l)
        if [ "$BACKUP_COUNT" -gt "$MAX_BACKUPS" ]; then
            EXCESS=$((BACKUP_COUNT - MAX_BACKUPS))
            find "$BACKUP_DIR" -name "agmcp_backup_*.sql.gz" -type f -printf '%T+ %p\n' | sort | head -n $EXCESS | cut -d' ' -f2- | xargs rm -f
            log_info "Kept only $MAX_BACKUPS most recent backups"
        fi
    fi
    
    # Show remaining backups
    REMAINING=$(find "$BACKUP_DIR" -name "agmcp_backup_*.sql.gz" -type f | wc -l)
    log_info "Total backups retained: $REMAINING"
}

# List recent backups
list_recent_backups() {
    log_info "Recent backups:"
    
    # macOS compatible version
    if [[ "$OSTYPE" == "darwin"* ]]; then
        find "$BACKUP_DIR" -name "agmcp_backup_*.sql.gz" -type f -exec stat -f "%Sm %N %z" -t "%Y-%m-%d %H:%M:%S" {} \; | sort -r | head -5 | while read -r line; do
            timestamp=$(echo "$line" | cut -d' ' -f1,2)
            filepath=$(echo "$line" | cut -d' ' -f3-)
            size=$(echo "$line" | awk '{print $NF}')
            filepath=$(echo "$filepath" | sed "s/ $size$//")
            filename=$(basename "$filepath")
            readable_size=$(numfmt --to=iec-i --suffix=B "$size" 2>/dev/null || echo "${size}B")
            echo "  • $filename ($readable_size) - $timestamp"
        done
    else
        # Linux version
        find "$BACKUP_DIR" -name "agmcp_backup_*.sql.gz" -type f -printf '%T+ %p %s\n' | sort -r | head -5 | while read -r line; do
            timestamp=$(echo "$line" | cut -d' ' -f1)
            filepath=$(echo "$line" | cut -d' ' -f2)
            size=$(echo "$line" | cut -d' ' -f3)
            filename=$(basename "$filepath")
            readable_size=$(numfmt --to=iec-i --suffix=B "$size" 2>/dev/null || echo "${size}B")
            echo "  • $filename ($readable_size) - $timestamp"
        done
    fi
}

# Verify backup integrity
verify_backup() {
    log_info "Verifying backup integrity..."
    
    if gzip -t "$BACKUP_PATH" 2>/dev/null; then
        log_success "Backup file integrity verified"
        return 0
    else
        log_error "Backup file is corrupted"
        return 1
    fi
}

# Main execution
main() {
    echo "🗄️  AgMCP Database Backup Script"
    echo "=================================="
    echo "Started at: $(date)"
    echo ""
    
    check_dependencies
    create_backup_dir
    
    if perform_backup; then
        if verify_backup; then
            cleanup_old_backups
            list_recent_backups
            
            echo ""
            log_success "Backup process completed successfully!"
            echo "📁 Backup location: $BACKUP_PATH"
            echo "🕒 Completed at: $(date)"
        else
            log_error "Backup verification failed"
            exit 1
        fi
    else
        log_error "Backup process failed"
        exit 1
    fi
}

# Handle command line arguments
case "${1:-}" in
    --help|-h)
        echo "AgMCP Database Backup Script"
        echo ""
        echo "Usage: $0 [options]"
        echo ""
        echo "Options:"
        echo "  --help, -h          Show this help message"
        echo "  --list, -l          List recent backups"
        echo "  --cleanup, -c       Clean old backups only"
        echo ""
        echo "Environment Variables:"
        echo "  DATABASE_URL        Full database connection URL"
        echo "  DB_HOST            Database host (default: localhost)"
        echo "  DB_PORT            Database port (default: 5432)"
        echo "  DB_USER            Database user (default: postgres)"
        echo "  DB_NAME            Database name (default: agmcp_dev)"
        echo "  BACKUP_DIR         Backup directory (default: ./backups)"
        echo "  BACKUP_RETENTION_DAYS  Days to keep backups (default: 30)"
        echo "  MAX_BACKUPS        Maximum number of backups to keep (default: 50)"
        exit 0
        ;;
    --list|-l)
        create_backup_dir
        list_recent_backups
        exit 0
        ;;
    --cleanup|-c)
        create_backup_dir
        cleanup_old_backups
        exit 0
        ;;
    "")
        main
        ;;
    *)
        log_error "Unknown option: $1"
        echo "Use --help for usage information"
        exit 1
        ;;
esac
