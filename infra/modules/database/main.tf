resource "aws_db_subnet_group" "main" {
  name       = "${var.project}-${var.env}-db-subnet"
  subnet_ids = var.subnet_ids
  tags       = { Name = "${var.project}-${var.env}-db-subnet" }
}

resource "aws_db_instance" "main" {
  identifier        = "${var.project}-${var.env}-postgres"
  engine            = "postgres"
  engine_version    = "15"
  instance_class    = var.instance_class
  allocated_storage = var.allocated_storage
  storage_type      = "gp3"
  storage_encrypted = true

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [var.security_group_id]
  publicly_accessible    = false

  backup_retention_period = var.env == "production" ? 7 : 1
  backup_window           = "03:00-04:00"
  maintenance_window      = "sun:04:00-sun:05:00"

  deletion_protection       = var.env == "production"
  skip_final_snapshot       = var.env != "production"
  final_snapshot_identifier = var.env == "production" ? "${var.project}-${var.env}-final-snapshot" : null

  tags = { Name = "${var.project}-${var.env}-postgres", Env = var.env }
}
