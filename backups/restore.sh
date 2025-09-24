#!/bin/bash

# Backup Restoration Script
# This script restores database and file backups

set -e

# Configuration
BACKUP_DIR="./backups"
LOG_FILE="./logs/restore.log"

# Function to log messages
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Check arguments
if [ $# -eq 0 ]; then
    echo "Usage: $0 <backup-file>"
    echo "Available backups:"
    ls -la "$BACKUP_DIR"/*.gz 2>/dev/null || echo "No backups found"
    exit 1
fi

BACKUP_FILE="$1"

# Check if backup file exists
if [ ! -f "$BACKUP_DIR/$BACKUP_FILE" ]; then
    log_message "ERROR: Backup file not found: $BACKUP_FILE"
    exit 1
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    log_message "ERROR: DATABASE_URL environment variable not set"
    exit 1
fi

# Restore database backup
if [[ "$BACKUP_FILE" == backup_*.sql.gz ]]; then
    log_message "Restoring database backup: $BACKUP_FILE"
    
    # Decompress backup
    log_message "Decompressing backup..."
    gunzip -c "$BACKUP_DIR/$BACKUP_FILE" > "/tmp/restore.sql"
    
    # Restore database
    log_message "Restoring database..."
    psql "$DATABASE_URL" < "/tmp/restore.sql"
    
    # Clean up
    rm "/tmp/restore.sql"
    
    log_message "Database restore completed successfully"
    
elif [[ "$BACKUP_FILE" == files_backup_*.tar.gz ]]; then
    log_message "Restoring file backup: $BACKUP_FILE"
    
    # Extract files
    log_message "Extracting files..."
    tar -xzf "$BACKUP_DIR/$BACKUP_FILE" -C ./
    
    log_message "File restore completed successfully"
    
else
    log_message "ERROR: Unknown backup file format: $BACKUP_FILE"
    exit 1
fi
