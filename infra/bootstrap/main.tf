# Bootstrap — cria o backend remoto do Terraform (roda UMA vez, manualmente)
# cd infra/bootstrap && terraform init && terraform apply

terraform {
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
    tls = { source = "hashicorp/tls", version = "~> 4.0" }
    local = { source = "hashicorp/local", version = "~> 2.0" }
  }
}

provider "aws" {
  region = "sa-east-1"
}

resource "aws_s3_bucket" "tf_state" {
  bucket = "presente-terraform-state"

  lifecycle { prevent_destroy = true }
}

resource "aws_s3_bucket_versioning" "tf_state" {
  bucket = aws_s3_bucket.tf_state.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "tf_state" {
  bucket = aws_s3_bucket.tf_state.id
  rule {
    apply_server_side_encryption_by_default { sse_algorithm = "AES256" }
  }
}

resource "aws_s3_bucket_public_access_block" "tf_state" {
  bucket                  = aws_s3_bucket.tf_state.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_dynamodb_table" "tf_locks" {
  name         = "presente-terraform-locks"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  lifecycle { prevent_destroy = true }
}

# ECR — registry compartilhado entre envs
resource "aws_ecr_repository" "api" {
  name                 = "presente/api"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration { scan_on_push = true }
}

resource "aws_ecr_lifecycle_policy" "api" {
  repository = aws_ecr_repository.api.name
  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Mantém apenas as 10 imagens mais recentes"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 10
      }
      action = { type = "expire" }
    }]
  })
}

# ---------------------------------------------------------------------------
# IAM — usuário de deploy (usado pelo GitHub Actions e pela sua máquina)
# ---------------------------------------------------------------------------
resource "aws_iam_user" "deploy" {
  name = "presente-deploy"
  path = "/"
}

resource "aws_iam_user_policy_attachment" "deploy_admin" {
  user       = aws_iam_user.deploy.name
  policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
}

resource "aws_iam_access_key" "deploy" {
  user = aws_iam_user.deploy.name
}

# ---------------------------------------------------------------------------
# SSH key pairs — um por ambiente (staging e production)
# As chaves privadas são salvas em ~/.ssh/ para acesso SSH às instâncias EC2
# ---------------------------------------------------------------------------
resource "tls_private_key" "staging" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "tls_private_key" "production" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "aws_key_pair" "staging" {
  key_name   = "presente-staging"
  public_key = tls_private_key.staging.public_key_openssh
}

resource "aws_key_pair" "production" {
  key_name   = "presente-production"
  public_key = tls_private_key.production.public_key_openssh
}

# Salva as chaves privadas localmente (não vão para o state remoto — ficam no bootstrap local)
resource "local_sensitive_file" "staging_pem" {
  content         = tls_private_key.staging.private_key_pem
  filename        = pathexpand("~/.ssh/presente-staging.pem")
  file_permission = "0600"
}

resource "local_sensitive_file" "production_pem" {
  content         = tls_private_key.production.private_key_pem
  filename        = pathexpand("~/.ssh/presente-production.pem")
  file_permission = "0600"
}

# ---------------------------------------------------------------------------
# Outputs
# ---------------------------------------------------------------------------
output "ecr_repository_url" { value = aws_ecr_repository.api.repository_url }
output "state_bucket"       { value = aws_s3_bucket.tf_state.id }
output "lock_table"         { value = aws_dynamodb_table.tf_locks.name }

output "deploy_access_key_id" {
  description = "AWS_ACCESS_KEY_ID para o GitHub Actions / terraform local"
  value       = aws_iam_access_key.deploy.id
}

output "deploy_secret_access_key" {
  description = "AWS_SECRET_ACCESS_KEY — guarde em segredo, não aparece novamente"
  value       = aws_iam_access_key.deploy.secret
  sensitive   = true
}

output "staging_key_pair_name"    { value = aws_key_pair.staging.key_name }
output "production_key_pair_name" { value = aws_key_pair.production.key_name }

output "staging_pem_path"    { value = local_sensitive_file.staging_pem.filename }
output "production_pem_path" { value = local_sensitive_file.production_pem.filename }
