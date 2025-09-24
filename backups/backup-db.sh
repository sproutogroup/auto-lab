#!/bin/bash

# Database Backup Script
# This script creates automated backups of the PostgreSQL database

set -e

# Configuration
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backup_${TIMESTAMP}.sql"
LOG_FILE="./logs/backup.log"

# Ensure directories exist
mkdir -p $BACKUP_DIR
mkdir -p ./logs

# Function to log messages
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Start backup process
log_message "Starting database backup..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    log_message "ERROR: DATABASE_URL environment variable not set"
    exit 1
fi

# Create database backup
log_message "Creating database dump..."
if pg_dump "$DATABASE_URL" > "$BACKUP_DIR/$BACKUP_FILE"; then
    log_message "Database backup created: $BACKUP_FILE"
    
    # Compress backup
    log_message "Compressing backup..."
    gzip "$BACKUP_DIR/$BACKUP_FILE"
    COMPRESSED_FILE="${BACKUP_FILE}.gz"
    log_message "Backup compressed: $COMPRESSED_FILE"
    
    # Get backup size
    BACKUP_SIZE=$(du -h "$BACKUP_DIR/$COMPRESSED_FILE" | cut -f1)
    log_message "Backup size: $BACKUP_SIZE"
    
    # Upload to cloud storage if configured
    if [ -n "$BACKUP_S3_BUCKET" ]; then
        log_message "Uploading to S3..."
        aws s3 cp "$BACKUP_DIR/$COMPRESSED_FILE" "s3://$BACKUP_S3_BUCKET/database-backups/$COMPRESSED_FILE"
        log_message "Backup uploaded to S3"
    fi
    
    # Clean up old backups (keep last 7 days)
    find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +7 -delete
    log_message "Old backups cleaned up"
    
    log_message "Backup completed successfully"
else
    log_message "ERROR: Database backup failed"
    exit 1
fi
