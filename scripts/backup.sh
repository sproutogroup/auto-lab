#!/bin/bash

# Dealership Management System - Database Backup Script
# This script creates automated backups of the PostgreSQL database

set -e  # Exit on any error

# Configuration
BACKUP_DIR="/tmp/backups"
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="dealership_backup_$TIMESTAMP.sql"
LOG_FILE="/tmp/backup.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Error handling
error_exit() {
    echo -e "${RED}Error: $1${NC}" >&2
    log "ERROR: $1"
    exit 1
}

# Success message
success() {
    echo -e "${GREEN}$1${NC}"
    log "SUCCESS: $1"
}

# Warning message
warning() {
    echo -e "${YELLOW}Warning: $1${NC}"
    log "WARNING: $1"
}

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    error_exit "DATABASE_URL environment variable is not set"
fi

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR" || error_exit "Failed to create backup directory"

log "Starting database backup process"

# Check if pg_dump is available
if ! command -v pg_dump &> /dev/null; then
    error_exit "pg_dump is not installed or not in PATH"
fi

# Test database connection
log "Testing database connection"
if ! pg_isready -d "$DATABASE_URL" -q; then
    error_exit "Cannot connect to database"
fi

# Create backup
log "Creating database backup: $BACKUP_FILE"
if pg_dump "$DATABASE_URL" > "$BACKUP_DIR/$BACKUP_FILE"; then
    success "Database backup created successfully"
else
    error_exit "Failed to create database backup"
fi

# Compress backup
log "Compressing backup file"
if gzip "$BACKUP_DIR/$BACKUP_FILE"; then
    BACKUP_FILE="$BACKUP_FILE.gz"
    success "Backup compressed successfully"
else
    warning "Failed to compress backup file"
fi

# Get backup size
BACKUP_SIZE=$(du -h "$BACKUP_DIR/$BACKUP_FILE" | cut -f1)
log "Backup size: $BACKUP_SIZE"

# Verify backup integrity
log "Verifying backup integrity"
if gunzip -t "$BACKUP_DIR/$BACKUP_FILE" 2>/dev/null; then
    success "Backup integrity verified"
else
    error_exit "Backup integrity check failed"
fi

# Upload to cloud storage (if configured)
if [ -n "$AWS_S3_BUCKET" ] && command -v aws &> /dev/null; then
    log "Uploading backup to S3"
    if aws s3 cp "$BACKUP_DIR/$BACKUP_FILE" "s3://$AWS_S3_BUCKET/backups/"; then
        success "Backup uploaded to S3"
    else
        warning "Failed to upload backup to S3"
    fi
fi

# Clean up old backups
log "Cleaning up old backups (older than $RETENTION_DAYS days)"
if find "$BACKUP_DIR" -name "dealership_backup_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete 2>/dev/null; then
    success "Old backups cleaned up"
else
    warning "Failed to clean up old backups"
fi

# Generate backup report
cat > "$BACKUP_DIR/backup_report_$TIMESTAMP.txt" << EOF
Dealership Management System - Backup Report
============================================

Date: $(date)
Backup File: $BACKUP_FILE
Backup Size: $BACKUP_SIZE
Database URL: ${DATABASE_URL%/*}/***
Status: Success

Backup Details:
- Timestamp: $TIMESTAMP
- Retention: $RETENTION_DAYS days
- Compression: gzip
- Location: $BACKUP_DIR/$BACKUP_FILE

Next Steps:
1. Verify backup can be restored
2. Store backup in secure location
3. Update backup inventory

EOF

success "Backup process completed successfully"
log "Backup saved to: $BACKUP_DIR/$BACKUP_FILE"

# Optional: Send notification (if webhook URL is set)
if [ -n "$BACKUP_WEBHOOK_URL" ]; then
    curl -X POST "$BACKUP_WEBHOOK_URL" \
        -H "Content-Type: application/json" \
        -d "{\"text\":\"Database backup completed successfully\",\"attachments\":[{\"color\":\"good\",\"fields\":[{\"title\":\"Backup File\",\"value\":\"$BACKUP_FILE\",\"short\":true},{\"title\":\"Size\",\"value\":\"$BACKUP_SIZE\",\"short\":true}]}]}" \
        > /dev/null 2>&1 || warning "Failed to send notification"
fi

exit 0