#!/bin/bash
# NexaSphere Automated Backup Verification Tool
# This script downloads the latest backup, restores it to a temporary local DB, 
# and runs validation queries to ensure the backup is not corrupted.

set -e

TEMP_DB_NAME="nexasphere_verify_$(date +%s)"
BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: ./verify-backup-integrity.sh <path_to_encrypted_backup>"
    exit 1
fi

echo "Starting verification for $BACKUP_FILE..."

# 1. Create temporary database
createdb $TEMP_DB_NAME

# 2. Decrypt and Restore
openssl aes-256-cbc -d -in "$BACKUP_FILE" -k "$ENCRYPTION_KEY" | gunzip | psql $TEMP_DB_NAME > /dev/null

echo "Restoration successful. Running integrity checks..."

# 3. Run Validation Queries (Sanity Checks)
USER_COUNT=$(psql -d $TEMP_DB_NAME -t -c "SELECT count(*) FROM users;")
EVENT_COUNT=$(psql -d $TEMP_DB_NAME -t -c "SELECT count(*) FROM events;")

if [ "$USER_COUNT" -gt 0 ] && [ "$EVENT_COUNT" -gt 0 ]; then
    echo "Integrity Check Passed: Found $USER_COUNT users and $EVENT_COUNT events."
else
    echo "Integrity Check FAILED: Database appears empty or corrupted."
    dropdb $TEMP_DB_NAME
    exit 1
fi

# 4. Cleanup
dropdb $TEMP_DB_NAME
echo "Verification complete. Backup is valid."
exit 0