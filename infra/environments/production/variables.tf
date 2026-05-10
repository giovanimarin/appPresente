variable "project" {
  type    = string
  default = "presente"
}
variable "env" {
  type    = string
  default = "production"
}
variable "aws_region" {
  type    = string
  default = "sa-east-1"
}
variable "db_password" {
  type      = string
  sensitive = true
}
variable "key_name" {
  type = string
}
variable "ssh_allowed_cidr" {
  type        = string
  description = "CIDR para SSH (ex: IP do seu escritório/0.0.0.0/0)"
}
variable "ecr_registry" { type = string }
