#!/bin/bash

# File System Backup Script
# This script creates backups of uploaded files and logs

set -e

# Configuration
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILES_BACKUP="files_backup_${TIMESTAMP}.tar.gz"
LOG_FILE="./logs/backup.log"

# Function to log messages
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Start file backup process
log_message "Starting file system backup..."

# Create tar archive of important files
log_message "Creating file system archive..."
tar -czf "$BACKUP_DIR/$FILES_BACKUP"     --exclude="./backups"     --exclude="./node_modules"     --exclude="./dist"     --exclude="./.git"     ./uploads     ./logs     ./ssl     ./.env     ./package.json     ./package-lock.json     ./drizzle.config.ts     ./replit.md     2>/dev/null || true

if [ -f "$BACKUP_DIR/$FILES_BACKUP" ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_DIR/$FILES_BACKUP" | cut -f1)
    log_message "File backup created: $FILES_BACKUP (Size: $BACKUP_SIZE)"
    
    # Upload to cloud storage if configured
    if [ -n "$BACKUP_S3_BUCKET" ]; then
        log_message "Uploading files to S3..."
        aws s3 cp "$BACKUP_DIR/$FILES_BACKUP" "s3://$BACKUP_S3_BUCKET/file-backups/$FILES_BACKUP"
        log_message "File backup uploaded to S3"
    fi
    
    # Clean up old file backups (keep last 7 days)
    find "$BACKUP_DIR" -name "files_backup_*.tar.gz" -mtime +7 -delete
    log_message "Old file backups cleaned up"
    
    log_message "File backup completed successfully"
else
    log_message "ERROR: File backup failed"
    exit 1
fi
