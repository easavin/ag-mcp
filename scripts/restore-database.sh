#!/bin/bash

# Database Restore Script for AgMCP
# Restores database from backup files

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

# Database connection
DB_URL="${DATABASE_URL}"
DB_NAME="${DB_NAME:-agmcp_dev}"

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
    
    if ! command -v psql &> /dev/null; then
        log_error "psql is not installed. Please install PostgreSQL client tools."
        exit 1
    fi
    
    if ! command -v gunzip &> /dev/null; then
        log_error "gunzip is not installed."
        exit 1
    fi
    
    log_success "All dependencies are available"
}

# List available backups
list_backups() {
    log_info "Available backups:"
    
    if [ ! -d "$BACKUP_DIR" ]; then
        log_error "Backup directory does not exist: $BACKUP_DIR"
        return 1
    fi
    
    local backups=($(find "$BACKUP_DIR" -name "agmcp_backup_*.sql.gz" -type f | sort -r))
    
    if [ ${#backups[@]} -eq 0 ]; then
        log_warning "No backup files found in $BACKUP_DIR"
        return 1
    fi
    
    echo ""
    for i in "${!backups[@]}"; do
        local backup="${backups[$i]}"
        local filename=$(basename "$backup")
        local size=$(du -h "$backup" | cut -f1)
        local date=$(echo "$filename" | sed 's/agmcp_backup_\([0-9]\{8\}\)_\([0-9]\{6\}\)\.sql\.gz/\1 \2/' | sed 's/\([0-9]\{4\}\)\([0-9]\{2\}\)\([0-9]\{2\}\) \([0-9]\{2\}\)\([0-9]\{2\}\)\([0-9]\{2\}\)/\1-\2-\3 \4:\5:\6/')
        
        printf "%2d) %s (%s) - %s\n" $((i+1)) "$filename" "$size" "$date"
    done
    
    echo ""
    return 0
}

# Get backup file by selection
select_backup() {
    local backups=($(find "$BACKUP_DIR" -name "agmcp_backup_*.sql.gz" -type f | sort -r))
    
    if [ ${#backups[@]} -eq 0 ]; then
        log_error "No backup files found"
        return 1
    fi
    
    echo "Select a backup to restore:"
    read -p "Enter backup number (1-${#backups[@]}): " selection
    
    if ! [[ "$selection" =~ ^[0-9]+$ ]] || [ "$selection" -lt 1 ] || [ "$selection" -gt ${#backups[@]} ]; then
        log_error "Invalid selection"
        return 1
    fi
    
    SELECTED_BACKUP="${backups[$((selection-1))]}"
    log_info "Selected backup: $(basename "$SELECTED_BACKUP")"
    return 0
}

# Verify backup file
verify_backup() {
    local backup_file="$1"
    
    log_info "Verifying backup file integrity..."
    
    if [ ! -f "$backup_file" ]; then
        log_error "Backup file does not exist: $backup_file"
        return 1
    fi
    
    if ! gzip -t "$backup_file" 2>/dev/null; then
        log_error "Backup file is corrupted or not a valid gzip file"
        return 1
    fi
    
    log_success "Backup file integrity verified"
    return 0
}

# Create backup before restore
create_pre_restore_backup() {
    log_info "Creating backup before restore..."
    
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local pre_restore_backup="$BACKUP_DIR/pre_restore_backup_$timestamp.sql.gz"
    
    if [ -n "$DB_URL" ]; then
        pg_dump "$DB_URL" | gzip > "$pre_restore_backup"
    else
        pg_dump -h "${DB_HOST:-localhost}" \
                -p "${DB_PORT:-5432}" \
                -U "${DB_USER:-postgres}" \
                -d "$DB_NAME" | gzip > "$pre_restore_backup"
    fi
    
    if [ $? -eq 0 ] && [ -s "$pre_restore_backup" ]; then
        log_success "Pre-restore backup created: $(basename "$pre_restore_backup")"
        echo "💾 Pre-restore backup: $pre_restore_backup"
    else
        log_warning "Failed to create pre-restore backup"
        rm -f "$pre_restore_backup" 2>/dev/null
    fi
}

# Perform database restore
perform_restore() {
    local backup_file="$1"
    
    log_info "Starting database restore..."
    log_info "Backup file: $(basename "$backup_file")"
    
    # Extract and restore
    log_info "Extracting and restoring backup..."
    
    if [ -n "$DB_URL" ]; then
        # Use DATABASE_URL if available
        log_info "Using DATABASE_URL for restore"
        gunzip -c "$backup_file" | psql "$DB_URL"
    else
        # Fall back to individual connection parameters
        log_info "Using individual connection parameters"
        gunzip -c "$backup_file" | psql -h "${DB_HOST:-localhost}" \
                                        -p "${DB_PORT:-5432}" \
                                        -U "${DB_USER:-postgres}" \
                                        -d "$DB_NAME"
    fi
    
    if [ $? -eq 0 ]; then
        log_success "Database restore completed successfully"
        return 0
    else
        log_error "Database restore failed"
        return 1
    fi
}

# Verify restore
verify_restore() {
    log_info "Verifying database restore..."
    
    # Check if we can connect and query basic tables
    if [ -n "$DB_URL" ]; then
        psql "$DB_URL" -c "\dt" > /dev/null 2>&1
    else
        psql -h "${DB_HOST:-localhost}" \
             -p "${DB_PORT:-5432}" \
             -U "${DB_USER:-postgres}" \
             -d "$DB_NAME" -c "\dt" > /dev/null 2>&1
    fi
    
    if [ $? -eq 0 ]; then
        log_success "Database is accessible after restore"
        return 0
    else
        log_error "Database verification failed"
        return 1
    fi
}

# Interactive restore process
interactive_restore() {
    echo "🔄 AgMCP Database Restore"
    echo "========================="
    echo ""
    
    check_dependencies
    
    if ! list_backups; then
        exit 1
    fi
    
    if ! select_backup; then
        exit 1
    fi
    
    if ! verify_backup "$SELECTED_BACKUP"; then
        exit 1
    fi
    
    echo ""
    log_warning "⚠️  WARNING: This will replace your current database!"
    log_warning "All current data will be lost and replaced with the backup data."
    echo ""
    
    read -p "Are you sure you want to continue? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        log_info "Restore cancelled"
        exit 0
    fi
    
    echo ""
    create_pre_restore_backup
    
    echo ""
    if perform_restore "$SELECTED_BACKUP"; then
        if verify_restore; then
            echo ""
            log_success "🎉 Database restore completed successfully!"
            echo "📁 Restored from: $(basename "$SELECTED_BACKUP")"
            echo "🕒 Completed at: $(date)"
        else
            log_error "Restore verification failed"
            exit 1
        fi
    else
        log_error "Restore failed"
        exit 1
    fi
}

# Handle command line arguments
case "${1:-}" in
    --help|-h)
        echo "AgMCP Database Restore Script"
        echo ""
        echo "Usage: $0 [options] [backup_file]"
        echo ""
        echo "Options:"
        echo "  --help, -h          Show this help message"
        echo "  --list, -l          List available backups"
        echo "  backup_file         Specific backup file to restore"
        echo ""
        echo "Environment Variables:"
        echo "  DATABASE_URL        Full database connection URL"
        echo "  DB_HOST            Database host (default: localhost)"
        echo "  DB_PORT            Database port (default: 5432)"
        echo "  DB_USER            Database user (default: postgres)"
        echo "  DB_NAME            Database name (default: agmcp_dev)"
        echo "  BACKUP_DIR         Backup directory (default: ./backups)"
        exit 0
        ;;
    --list|-l)
        check_dependencies
        list_backups
        exit 0
        ;;
    "")
        interactive_restore
        ;;
    *)
        # Restore from specific backup file
        BACKUP_FILE="$1"
        
        if [ ! -f "$BACKUP_FILE" ]; then
            log_error "Backup file does not exist: $BACKUP_FILE"
            exit 1
        fi
        
        check_dependencies
        
        if verify_backup "$BACKUP_FILE"; then
            echo ""
            log_warning "⚠️  WARNING: This will replace your current database!"
            read -p "Continue with restore? (yes/no): " confirm
            
            if [ "$confirm" = "yes" ]; then
                create_pre_restore_backup
                echo ""
                if perform_restore "$BACKUP_FILE" && verify_restore; then
                    log_success "Restore completed successfully!"
                else
                    log_error "Restore failed"
                    exit 1
                fi
            else
                log_info "Restore cancelled"
            fi
        else
            exit 1
        fi
        ;;
esac
