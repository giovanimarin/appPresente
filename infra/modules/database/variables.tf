variable "project"           { type = string }
variable "env"               { type = string }
variable "subnet_ids"        { type = list(string) }
variable "security_group_id" { type = string }
variable "instance_class"    { type = string; default = "db.t4g.micro" }
variable "allocated_storage" { type = number; default = 20 }
variable "db_name"           { type = string; default = "presente" }
variable "db_username"       { type = string; default = "presente" }
variable "db_password"       { type = string; sensitive = true }
