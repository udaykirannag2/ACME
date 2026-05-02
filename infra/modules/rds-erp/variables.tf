variable "env" {
  type = string
}

variable "subnet_ids" {
  description = "Private subnet IDs for the DB subnet group. Need at least 2 in different AZs."
  type        = list(string)
}

variable "security_group_ids" {
  description = "Security groups attached to the DB instance."
  type        = list(string)
}

variable "kms_key_arn" {
  description = "CMK ARN for storage encryption."
  type        = string
}

variable "instance_class" {
  type    = string
  default = "db.t4g.micro" # free-tier eligible
}

variable "database_name" {
  type    = string
  default = "acme_erp"
}

variable "master_username" {
  type    = string
  default = "acme_admin"
}

variable "publicly_accessible" {
  description = "Whether to assign a public DNS endpoint. Public + IP allowlist for dev iteration."
  type        = bool
  default     = true
}

variable "my_ip_cidr" {
  description = "Operator IPv4 in /32 notation. NULL means no public ingress rule is created."
  type        = string
  default     = null
}
