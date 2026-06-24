#!/bin/bash
# NexaSphere Database Restore Tool
# This script decrypts and restores a PostgreSQL backup to the specified database.

set -e

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: ./restore-backup.sh <path_to_encrypted_backup>"
    echo "Environment variables DATABASE_URL and ENCRYPTION_KEY must be set."
    exit 1
fi

if [ -z "$DATABASE_URL" ]; then
    echo "Error: DATABASE_URL environment variable is not set."
    exit 1
fi

if [ -z "$ENCRYPTION_KEY" ]; then
    echo "Error: ENCRYPTION_KEY environment variable is not set."
    exit 1
fi

echo "Starting restoration for backup: $BACKUP_FILE to $DATABASE_URL..."

LOCAL_BACKUP_PATH="/tmp/$(basename "$BACKUP_FILE")"

# 1. Download from S3 if necessary
if [[ "$BACKUP_FILE" == s3://* ]]; then
    echo "Downloading backup from S3: $BACKUP_FILE to $LOCAL_BACKUP_PATH"
    aws s3 cp "$BACKUP_FILE" "$LOCAL_BACKUP_PATH"
    BACKUP_TO_PROCESS="$LOCAL_BACKUP_PATH"
else
    BACKUP_TO_PROCESS="$BACKUP_FILE"
fi

# 2. Decrypt and Restore
echo "Decrypting and restoring database..."
openssl aes-256-cbc -d -in "$BACKUP_TO_PROCESS" -k "$ENCRYPTION_KEY" | gunzip | psql "$DATABASE_URL"

echo "Database restoration complete."

# 3. Cleanup
if [ -f "$LOCAL_BACKUP_PATH" ]; then
    echo "Removing temporary local backup file: $LOCAL_BACKUP_PATH"
    rm "$LOCAL_BACKUP_PATH"
fi

exit 0