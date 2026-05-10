terraform {
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
  backend "s3" {
    bucket         = "presente-terraform-state"
    key            = "staging/terraform.tfstate"
    region         = "sa-east-1"
    dynamodb_table = "presente-terraform-locks"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region
  default_tags { tags = { Project = var.project, Env = var.env, ManagedBy = "terraform" } }
}

module "networking" {
  source = "../../modules/networking"

  project              = var.project
  env                  = var.env
  vpc_cidr             = "10.1.0.0/16"
  public_subnet_cidrs  = ["10.1.1.0/24", "10.1.2.0/24"]
  private_subnet_cidrs = ["10.1.10.0/24", "10.1.11.0/24"]
  availability_zones   = ["${var.aws_region}a", "${var.aws_region}b"]
  ssh_allowed_cidr     = "0.0.0.0/0"
}

# Staging: banco gerenciado (pequeno) + Redis no próprio EC2 via Docker
module "database" {
  source = "../../modules/database"

  project           = var.project
  env               = var.env
  subnet_ids        = module.networking.private_subnet_ids
  security_group_id = module.networking.db_sg_id
  instance_class    = "db.t4g.micro"
  allocated_storage = 20
  db_password       = var.db_password
}

module "storage" {
  source       = "../../modules/storage"
  project      = var.project
  env          = var.env
  cors_origins = ["https://staging.presente.app", "http://localhost:3000"]
}

module "compute" {
  source = "../../modules/compute"

  project           = var.project
  env               = var.env
  subnet_id         = module.networking.public_subnet_ids[0]
  security_group_id = module.networking.app_sg_id
  instance_type     = "t3.small"
  ssh_public_key    = var.ssh_public_key
  ecr_registry      = var.ecr_registry
  aws_region        = var.aws_region
}
