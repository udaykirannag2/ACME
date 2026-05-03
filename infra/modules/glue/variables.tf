variable "env" {
  type = string
}

variable "raw_bucket_name" {
  description = "Name (not ARN) of the S3 raw lake bucket."
  type        = string
}

variable "curated_bucket_name" {
  description = "Name of the S3 curated lake bucket. Used for Iceberg warehouse + ETL script storage."
  type        = string
}

variable "glue_role_arn" {
  description = "IAM role ARN that crawlers + ETL jobs assume. Created in iam-roles module."
  type        = string
}
