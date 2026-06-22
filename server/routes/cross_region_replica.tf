# Cross-Region RDS Read Replica
# This module assumes a primary RDS instance is already provisioned in the main region.

resource "aws_db_instance" "cross_region_replica" {
  # The identifier for the read replica
  identifier = "${var.project_name}-${var.environment}-db-replica"

  # Specify the primary instance to replicate from
  replicate_source_db = var.primary_db_instance_arn

  # Define the secondary region for the replica
  # This must be different from the primary DB's region
  region = var.secondary_region

  # Instance class for the replica (can be different from primary)
  instance_class = var.replica_instance_class

  # Storage type and allocated storage (must match primary for replication)
  storage_type    = var.primary_db_storage_type
  allocated_storage = var.primary_db_allocated_storage

  # Engine and version must match the primary
  engine         = var.primary_db_engine
  engine_version = var.primary_db_engine_version

  # Multi-AZ for high availability within the secondary region
  multi_az = var.replica_multi_az

  # VPC Security Group IDs for the replica
  vpc_security_group_ids = var.replica_security_group_ids

  # DB Subnet Group for the replica
  db_subnet_group_name = var.replica_db_subnet_group_name

  # Enable deletion protection for production replicas
  deletion_protection = var.environment == "production" ? true : false

  tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
    Role        = "CrossRegionReadReplica"
  }
}

output "replica_db_instance_endpoint" {
  description = "The connection endpoint for the cross-region read replica."
  value       = aws_db_instance.cross_region_replica.address
}

output "replica_db_instance_arn" {
  description = "The ARN of the cross-region read replica."
  value       = aws_db_instance.cross_region_replica.arn
}