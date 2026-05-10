variable "project"      { type = string }
variable "env"          { type = string }
variable "cors_origins" { type = list(string); default = ["*"] }
