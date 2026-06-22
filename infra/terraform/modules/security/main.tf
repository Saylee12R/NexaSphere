resource "aws_security_group" "rds" {
  # checkov:skip=CKV2_AWS_5:Security group is attached to RDS instance externally
  # checkov:skip=CKV_AWS_382:No egress needed, restricted to empty list
  name        = "${var.project_name}-${var.environment}-rds-sg"
  description = "Security group for RDS PostgreSQL"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.eks_cluster.id]
    description     = "PostgreSQL from EKS"
  }

  egress {
    description = "No outbound traffic from RDS"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = []
  }

  tags = { Name = "${var.project_name}-${var.environment}-rds-sg" }
}

resource "aws_security_group" "eks_cluster" {
  # checkov:skip=CKV2_AWS_5:Security group is attached to EKS cluster externally
  # checkov:skip=CKV_AWS_382:Egress is required for cluster communication and external APIs
  name        = "${var.project_name}-${var.environment}-eks-cluster-sg"
  description = "Security group for EKS cluster"
  vpc_id      = var.vpc_id

  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.project_name}-${var.environment}-eks-cluster-sg" }
}

resource "aws_security_group" "eks_nodes" {
  # checkov:skip=CKV2_AWS_5:Security group is attached to EKS nodes externally
  # checkov:skip=CKV_AWS_382:Egress is required for nodes to fetch updates and access APIs
  name        = "${var.project_name}-${var.environment}-eks-nodes-sg"
  description = "Security group for EKS worker nodes"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 0
    to_port         = 0
    protocol        = "-1"
    security_groups = [aws_security_group.eks_cluster.id]
    description     = "Cluster to node communication"
  }

  ingress {
    from_port       = 1025
    to_port         = 65535
    protocol        = "tcp"
    security_groups = [aws_security_group.eks_cluster.id]
    description     = "Node port range from cluster"
  }

  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.project_name}-${var.environment}-eks-nodes-sg" }
}

resource "aws_security_group" "alb" {
  # checkov:skip=CKV2_AWS_5:Security group is attached to ALB externally
  # checkov:skip=CKV_AWS_382:Egress is required for forwarding traffic to targets
  name        = "${var.project_name}-${var.environment}-alb-sg"
  description = "Security group for ALB"
  vpc_id      = var.vpc_id

  ingress {
    # checkov:skip=CKV_AWS_260:Port 80 is required for public web traffic to allow redirects to HTTPS
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTP from internet"
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS from internet"
  }

  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.project_name}-${var.environment}-alb-sg" }
}

resource "aws_security_group_rule" "nodes_from_alb" {
  type                     = "ingress"
  from_port                = 3000
  to_port                  = 3000
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.alb.id
  security_group_id        = aws_security_group.eks_nodes.id
  description              = "ALB to node traffic"
}
