resource "aws_elasticache_subnet_group" "main" {
  name       = "${var.project}-${var.env}-cache-subnet"
  subnet_ids = var.subnet_ids
}

resource "aws_elasticache_cluster" "main" {
  cluster_id           = "${var.project}-${var.env}-redis"
  engine               = "redis"
  node_type            = var.node_type
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
  engine_version       = "7.0"
  port                 = 6379

  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [var.security_group_id]

  snapshot_retention_limit = var.env == "production" ? 1 : 0

  tags = { Name = "${var.project}-${var.env}-redis", Env = var.env }
}
