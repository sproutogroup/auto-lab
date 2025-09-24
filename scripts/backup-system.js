#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { execSync } from "child_process";

// Colors for console output
const colors = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  reset: "\x1b[0m",
  bold: "\x1b[1m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function createBackupSystem() {
  log("💾 Setting up Automated Backup System...", "blue");
  log("=".repeat(50), "blue");

  // Create backup directory
  const backupDir = "./backups";
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
    log("✅ Created backup directory", "green");
  }

  // Create database backup script
  const dbBackupScript = `#!/bin/bash

# Database Backup Script
# This script creates automated backups of the PostgreSQL database

set -e

# Configuration
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backup_\${TIMESTAMP}.sql"
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
    COMPRESSED_FILE="\${BACKUP_FILE}.gz"
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
`;

  fs.writeFileSync(path.join(backupDir, "backup-db.sh"), dbBackupScript);
  execSync(`chmod +x ${path.join(backupDir, "backup-db.sh")}`);
  log("✅ Created database backup script", "green");

  // Create file system backup script
  const fileBackupScript = `#!/bin/bash

# File System Backup Script
# This script creates backups of uploaded files and logs

set -e

# Configuration
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILES_BACKUP="files_backup_\${TIMESTAMP}.tar.gz"
LOG_FILE="./logs/backup.log"

# Function to log messages
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Start file backup process
log_message "Starting file system backup..."

# Create tar archive of important files
log_message "Creating file system archive..."
tar -czf "$BACKUP_DIR/$FILES_BACKUP" \
    --exclude="./backups" \
    --exclude="./node_modules" \
    --exclude="./dist" \
    --exclude="./.git" \
    ./uploads \
    ./logs \
    ./ssl \
    ./.env \
    ./package.json \
    ./package-lock.json \
    ./drizzle.config.ts \
    ./replit.md \
    2>/dev/null || true

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
`;

  fs.writeFileSync(path.join(backupDir, "backup-files.sh"), fileBackupScript);
  execSync(`chmod +x ${path.join(backupDir, "backup-files.sh")}`);
  log("✅ Created file system backup script", "green");

  // Create backup restoration script
  const restoreScript = `#!/bin/bash

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
`;

  fs.writeFileSync(path.join(backupDir, "restore.sh"), restoreScript);
  execSync(`chmod +x ${path.join(backupDir, "restore.sh")}`);
  log("✅ Created backup restoration script", "green");

  log("\n📋 Backup System Setup Complete:", "green");
  log("   - Database backup script created", "reset");
  log("   - File system backup script created", "reset");
  log("   - Restoration script created", "reset");

  log("\n💡 Next Steps:", "yellow");
  log("   1. Test database backup: ./backups/backup-db.sh", "reset");
  log("   2. Test file backup: ./backups/backup-files.sh", "reset");
  log("   3. Test restoration: ./backups/restore.sh <backup-file>", "reset");
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  createBackupSystem();
}

export { createBackupSystem };
