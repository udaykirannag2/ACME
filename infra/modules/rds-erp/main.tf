# Phase 3 — RDS Postgres for the ERP simulator.
#
# Postgres 16 on db.t4g.micro (free-tier eligible). Public endpoint allowlisted
# to a single /32 (the operator's home IP) plus internal VPC access.
# Logical replication enabled so DMS can do CDC in Phase 4.
#
# Tear-down: this module is destroy-safe. Storage is encrypted with the lake
# CMK; backups have 7-day retention and are also KMS-encrypted.

terraform {
  required_providers {
    aws    = { source = "hashicorp/aws", version = "~> 5.70" }
    random = { source = "hashicorp/random", version = "~> 3.6" }
  }
}

# =============================================================================
# Subnet group — RDS requires at least 2 subnets in different AZs
# =============================================================================

resource "aws_db_subnet_group" "erp" {
  name       = "acme-finance-${var.env}-erp"
  subnet_ids = var.subnet_ids

  tags = {
    Name = "acme-finance-${var.env}-erp"
  }
}

# =============================================================================
# Parameter group — enable logical replication for DMS CDC (Phase 4)
# =============================================================================

resource "aws_db_parameter_group" "erp" {
  name   = "acme-finance-${var.env}-erp-pg16"
  family = "postgres16"

  parameter {
    name         = "rds.logical_replication"
    value        = "1"
    apply_method = "pending-reboot"
  }

  parameter {
    name         = "max_replication_slots"
    value        = "10"
    apply_method = "pending-reboot"
  }

  parameter {
    name         = "max_wal_senders"
    value        = "10"
    apply_method = "pending-reboot"
  }

  # Useful for diagnostics
  parameter {
    name  = "log_min_duration_statement"
    value = "1000" # log queries slower than 1s
  }
}

# =============================================================================
# Master password — generated and stored in Secrets Manager
# =============================================================================

resource "random_password" "master" {
  length           = 32
  special          = true
  override_special = "!@#$%^&*-_=+"
}

resource "aws_secretsmanager_secret" "erp_master" {
  name                    = "acme-finance-${var.env}-erp-master"
  description             = "Master password for ACME ERP RDS Postgres instance"
  recovery_window_in_days = 0 # immediate delete on destroy (dev only)
}

resource "aws_secretsmanager_secret_version" "erp_master" {
  secret_id = aws_secretsmanager_secret.erp_master.id
  secret_string = jsonencode({
    username = var.master_username
    password = random_password.master.result
    engine   = "postgres"
    port     = 5432
    dbname   = var.database_name
    # host is filled in after the instance is created — see outputs
  })
}

# =============================================================================
# Public ingress security group rule — from operator IP only
# =============================================================================

# Augment the existing rds security group (created in network module) with a
# public-IP allowlist rule.
resource "aws_security_group_rule" "rds_from_my_ip" {
  count = var.my_ip_cidr != null ? 1 : 0

  type              = "ingress"
  from_port         = 5432
  to_port           = 5432
  protocol          = "tcp"
  cidr_blocks       = [var.my_ip_cidr]
  security_group_id = var.security_group_ids[0]
  description       = "Operator home IP to RDS Postgres"
}

# =============================================================================
# RDS instance
# =============================================================================

resource "aws_db_instance" "erp" {
  identifier     = "acme-erp-${var.env}"
  engine         = "postgres"
  engine_version = "16.6"

  instance_class    = var.instance_class
  allocated_storage = 20
  storage_type      = "gp3"
  storage_encrypted = true
  kms_key_id        = var.kms_key_arn

  db_name  = var.database_name
  username = var.master_username
  password = random_password.master.result
  port     = 5432

  db_subnet_group_name   = aws_db_subnet_group.erp.name
  vpc_security_group_ids = var.security_group_ids
  parameter_group_name   = aws_db_parameter_group.erp.name
  publicly_accessible    = var.publicly_accessible

  multi_az                    = false
  backup_retention_period     = 7
  backup_window               = "07:00-08:00"
  maintenance_window          = "sun:08:00-sun:09:00"
  auto_minor_version_upgrade  = true
  apply_immediately           = false
  deletion_protection         = false # learning project — allow destroy
  skip_final_snapshot         = true  # learning project
  performance_insights_enabled = false
  copy_tags_to_snapshot       = true

  tags = {
    Name = "acme-erp-${var.env}"
  }

  lifecycle {
    ignore_changes = [password] # rotated independently via Secrets Manager
  }
}

# Update the secret with the host now that we know it
resource "aws_secretsmanager_secret_version" "erp_master_with_host" {
  secret_id = aws_secretsmanager_secret.erp_master.id
  secret_string = jsonencode({
    username = var.master_username
    password = random_password.master.result
    engine   = "postgres"
    host     = aws_db_instance.erp.address
    port     = 5432
    dbname   = var.database_name
  })

  depends_on = [aws_secretsmanager_secret_version.erp_master]
}
