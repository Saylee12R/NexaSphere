#!/bin/bash
# NexaSphere Automated Daily Backup
set -e

TIMESTAMP=$(date +%Y-%m-%d-%H%M)
BACKUP_NAME="nexasphere-db-$TIMESTAMP.sql.gz.enc"
TEMP_RAW="backup.sql"

echo "Creating database dump..."
pg_dump $DATABASE_URL > $TEMP_RAW

echo "Encrypting and compressing..."
cat $TEMP_RAW | gzip | openssl aes-256-cbc -salt -k "$ENCRYPTION_KEY" -out "$BACKUP_NAME" -pbkdf2

echo "Uploading to S3..."
# Note: Requires AWS CLI configured
aws s3 cp "$BACKUP_NAME" "s3://${S3_BACKUP_BUCKET}/daily/$BACKUP_NAME"

echo "Cleaning up local files..."
rm $TEMP_RAW "$BACKUP_NAME"

echo "Backup successful: $BACKUP_NAME"

# Trigger verification of the created backup
chmod +x ./verify-backup-integrity.sh
./verify-backup-integrity.sh "s3://${S3_BACKUP_BUCKET}/daily/$BACKUP_NAME" # Pass S3 path for verification

exit 0