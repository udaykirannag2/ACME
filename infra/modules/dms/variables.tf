variable "env" {
  type = string
}

variable "subnet_ids" {
  description = "Subnets for the DMS replication subnet group. Min 2 in different AZs."
  type        = list(string)
}

variable "security_group_ids" {
  description = "Security groups attached to the DMS replication compute. Must allow egress to RDS (port 5432)."
  type        = list(string)
}

variable "raw_bucket_name" {
  description = "Target S3 bucket name for DMS output."
  type        = string
}

variable "raw_bucket_arn" {
  description = "Target S3 bucket ARN."
  type        = string
}

variable "kms_key_arn" {
  description = "Lake CMK ARN. Used for SSE-KMS on Parquet output."
  type        = string
}

variable "source_secret_arn" {
  description = "Secrets Manager ARN with RDS Postgres credentials (host/port/dbname/user/password)."
  type        = string
}

variable "source_database_name" {
  description = "Postgres database name to replicate from (e.g. acme_erp)."
  type        = string
}
