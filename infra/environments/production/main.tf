terraform {
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
  backend "s3" {
    bucket         = "presente-terraform-state"
    key            = "production/terraform.tfstate"
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
  vpc_cidr             = "10.0.0.0/16"
  public_subnet_cidrs  = ["10.0.1.0/24", "10.0.2.0/24"]
  private_subnet_cidrs = ["10.0.10.0/24", "10.0.11.0/24"]
  availability_zones   = ["${var.aws_region}a", "${var.aws_region}b"]
  ssh_allowed_cidr     = var.ssh_allowed_cidr
}

module "database" {
  source = "../../modules/database"

  project           = var.project
  env               = var.env
  subnet_ids        = module.networking.private_subnet_ids
  security_group_id = module.networking.db_sg_id
  instance_class    = "db.t4g.small"
  allocated_storage = 50
  db_password       = var.db_password
}

module "cache" {
  source = "../../modules/cache"

  project           = var.project
  env               = var.env
  subnet_ids        = module.networking.private_subnet_ids
  security_group_id = module.networking.cache_sg_id
  node_type         = "cache.t3.micro"
}

module "storage" {
  source       = "../../modules/storage"
  project      = var.project
  env          = var.env
  cors_origins = ["https://presente.app", "https://www.presente.app"]
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
