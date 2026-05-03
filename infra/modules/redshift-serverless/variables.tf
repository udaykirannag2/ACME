variable "env" {
  type = string
}

variable "subnet_ids" {
  description = "Subnets for the workgroup. Need at least 3 in different AZs for Redshift Serverless."
  type        = list(string)
}

variable "security_group_ids" {
  type = list(string)
}

variable "kms_key_arn" {
  type = string
}

variable "s3_lake_arns" {
  description = "Map of zone name -> bucket ARN. Used for Spectrum IAM policy."
  type        = map(string)
}

variable "admin_username" {
  type    = string
  default = "acme_admin"
}

variable "database_name" {
  type    = string
  default = "acme"
}

variable "base_capacity_rpu" {
  type    = number
  default = 8
}

variable "max_capacity_rpu" {
  type    = number
  default = 32
}

variable "publicly_accessible" {
  type    = bool
  default = true
}

variable "my_ip_cidr" {
  description = "Operator IPv4 in /32 notation. NULL means no public ingress rule."
  type        = string
  default     = null
}

variable "usage_limit_rpu_hours" {
  description = "Monthly usage limit in RPU-hours. At $0.36/RPU-hour, 70 RPU-hrs = ~$25/mo."
  type        = number
  default     = 70
}
