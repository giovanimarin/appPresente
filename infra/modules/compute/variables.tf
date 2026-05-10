variable "project"           { type = string }
variable "env"               { type = string }
variable "subnet_id"         { type = string }
variable "security_group_id" { type = string }
variable "instance_type"     { type = string; default = "t3.small" }
variable "ssh_public_key"    { type = string }
variable "ecr_registry"      { type = string }
variable "aws_region"        { type = string; default = "sa-east-1" }
