# S3 Bucket for Database Backups
resource "aws_s3_bucket" "db_backups" {
  bucket = "${var.project_name}-db-backups-${var.environment}"

  tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# Enable versioning for the backup bucket
resource "aws_s3_bucket_versioning" "db_backups_versioning" {
  bucket = aws_s3_bucket.db_backups.id
  versioning_configuration {
    status = "Enabled"
  }
}

# S3 Bucket Policy to enforce SSL and deny public access
resource "aws_s3_bucket_policy" "db_backups_policy" {
  bucket = aws_s3_bucket.db_backups.id
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Sid       = "DenyUnencryptedTraffic",
        Effect    = "Deny",
        Principal = "*",
        Action    = "s3:*",
        Resource = [
          "${aws_s3_bucket.db_backups.arn}/*",
          aws_s3_bucket.db_backups.arn,
        ],
        Condition = {
          Bool = {
            "aws:SecureTransport" = "false"
          }
        }
      },
      {
        Sid       = "DenyPublicAccess",
        Effect    = "Deny",
        Principal = "*",
        Action    = "s3:*",
        Resource = [
          "${aws_s3_bucket.db_backups.arn}/*",
          aws_s3_bucket.db_backups.arn,
        ],
        Condition = {
          Bool = {
            "aws:SourceVpc" = "false" # Example: Restrict to VPC if needed, or remove for broader access
          }
        }
      }
    ]
  })
}

# Block all public access to the bucket
resource "aws_s3_bucket_public_access_block" "db_backups_public_access_block" {
  bucket = aws_s3_bucket.db_backups.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# S3 Lifecycle Rules for Backup Retention
resource "aws_s3_bucket_lifecycle_configuration" "db_backups_lifecycle" {
  bucket = aws_s3_bucket.db_backups.id

  rule {
    id     = "DailyBackupsRetention"
    status = "Enabled"

    expiration {
      days = 30 # Retain daily backups for 30 days
    }

    filter {
      prefix = "daily/" # Assuming daily backups are stored under 'daily/' prefix
    }
  }

  rule {
    id     = "WeeklyBackupsRetention"
    status = "Enabled"

    # Transition to Glacier after 30 days, expire after 1 year (365 days)
    transition {
      days          = 30
      storage_class = "GLACIER"
    }
    expiration {
      days = 365 # Retain weekly backups for 1 year
    }

    filter {
      prefix = "weekly/" # Assuming weekly backups are stored under 'weekly/' prefix
    }
  }

  rule {
    id     = "MonthlyBackupsRetention"
    status = "Enabled"

    # Transition to Glacier Deep Archive after 90 days, expire after 12 months (365 days)
    transition {
      days          = 90
      storage_class = "DEEP_ARCHIVE"
    }
    expiration {
      days = 365 * 12 # Retain monthly backups for 12 years (adjust as per 12 months requirement)
    }

    filter {
      prefix = "monthly/" # Assuming monthly backups are stored under 'monthly/' prefix
    }
  }
}

output "db_backup_bucket_name" {
  value = aws_s3_bucket.db_backups.bucket
}