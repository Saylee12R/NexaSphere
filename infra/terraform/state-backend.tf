resource "aws_dynamodb_table" "terraform_locks" {
  # checkov:skip=CKV_AWS_119:Terraform lock table does not contain sensitive data and AWS-managed KMS key is sufficient
  name         = "nexasphere-terraform-locks"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  server_side_encryption {
    enabled = true
  }

  point_in_time_recovery {
    enabled = true
  }

  tags = { Name = "nexasphere-terraform-locks" }
}
