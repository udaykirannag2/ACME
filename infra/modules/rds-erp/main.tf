# Phase 3 — RDS Postgres for ERP simulator (db.t4g.micro, free-tier eligible).
# Stub.

variable "env" {
  type = string
}

variable "subnet_ids" {
  type = list(string)
}

variable "security_group_ids" {
  type = list(string)
}

# TODO Phase 3:
# - aws_db_subnet_group
# - aws_secretsmanager_secret for master password
# - aws_db_instance "erp" with db.t4g.micro, single-AZ, 20GB gp3, 7-day backups
# - parameter group with rds.logical_replication=1 for DMS CDC
