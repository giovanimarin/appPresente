variable "project"              { type = string }
variable "env"                  { type = string }
variable "vpc_cidr"             { type = string }
variable "public_subnet_cidrs"  { type = list(string) }
variable "private_subnet_cidrs" { type = list(string) }
variable "availability_zones"   { type = list(string) }
variable "ssh_allowed_cidr"     { type = string; default = "0.0.0.0/0" }
