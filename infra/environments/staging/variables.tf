variable "project"        { type = string; default = "presente" }
variable "env"            { type = string; default = "staging" }
variable "aws_region"     { type = string; default = "sa-east-1" }
variable "db_password"    { type = string; sensitive = true }
variable "ssh_public_key" { type = string }
variable "ecr_registry"   { type = string }
