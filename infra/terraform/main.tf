module "vpc" {
  source = "./modules/vpc"

  project_name          = var.project_name
  environment           = var.environment
  vpc_cidr              = var.vpc_cidr
  availability_zones    = var.availability_zones
  private_subnet_cidrs  = var.private_subnet_cidrs
  public_subnet_cidrs   = var.public_subnet_cidrs
  database_subnet_cidrs = var.database_subnet_cidrs
  aws_region            = var.aws_region
}

module "iam" {
  source = "./modules/iam"

  project_name = var.project_name
  environment  = var.environment
}

module "security" {
  source = "./modules/security"

  project_name = var.project_name
  environment  = var.environment
  vpc_id       = module.vpc.vpc_id
}

module "rds" {
  source = "./modules/rds"

  project_name          = var.project_name
  environment           = var.environment
  instance_class        = var.rds_instance_class
  allocated_storage     = var.rds_allocated_storage
  db_name               = var.db_name
  db_username           = var.db_username
  db_password           = var.db_password
  db_subnet_group_name  = module.vpc.database_subnet_group_name
  security_group_id     = module.security.rds_security_group_id
  multi_az              = var.rds_multi_az
  backup_retention_days = var.rds_backup_retention_days
}

module "s3" {
  source = "./modules/s3"

  project_name = var.project_name
  environment  = var.environment
  domain_name  = var.domain_name
}

module "cloudfront" {
  source = "./modules/cloudfront"

  project_name                 = var.project_name
  environment                  = var.environment
  domain_name                  = var.domain_name
  acm_certificate_arn          = var.acm_certificate_arn
  media_bucket_regional_domain = module.s3.media_bucket_regional_domain_name
}

module "eks" {
  source = "./modules/eks"

  project_name              = var.project_name
  environment               = var.environment
  cluster_role_arn          = module.iam.eks_cluster_role_arn
  node_role_arn             = module.iam.eks_node_role_arn
  cluster_security_group_id = module.security.eks_cluster_security_group_id
  private_subnet_ids        = module.vpc.private_subnet_ids
  kms_key_arn               = module.iam.kms_key_arn
  node_instance_types       = var.eks_node_instance_types
  desired_nodes             = var.eks_desired_nodes
  min_nodes                 = var.eks_min_nodes
  max_nodes                 = var.eks_max_nodes
}
