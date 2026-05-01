# Phase 4 — Redshift Serverless namespace + workgroup with auto-pause.
# Stub: not yet implemented. Variables below are the expected interface.

variable "env" {
  type = string
}

variable "subnet_ids" {
  type = list(string)
}

variable "security_group_ids" {
  type = list(string)
}

variable "admin_username" {
  type = string
}

variable "base_capacity_rpu" {
  type    = number
  default = 8
}

variable "max_capacity_rpu" {
  type    = number
  default = 32
}

# TODO Phase 4:
# - aws_secretsmanager_secret + aws_secretsmanager_secret_version (admin password)
# - aws_redshiftserverless_namespace
# - aws_redshiftserverless_workgroup with usage_limit (cap to control cost)
# - configure auto-pause via the namespace config
