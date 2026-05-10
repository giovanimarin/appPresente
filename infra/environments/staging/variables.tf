variable "project" {
  type    = string
  default = "presente"
}
variable "env" {
  type    = string
  default = "staging"
}
variable "aws_region" {
  type    = string
  default = "sa-east-1"
}
variable "db_password" {
  type      = string
  sensitive = true
}
variable "ecr_registry" { type = string }
