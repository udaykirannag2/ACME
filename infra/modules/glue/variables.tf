variable "env" {
  type = string
}

variable "raw_bucket_name" {
  description = "Name (not ARN) of the S3 raw lake bucket. Used in crawler s3_target paths."
  type        = string
}

variable "glue_role_arn" {
  description = "IAM role ARN that crawlers assume. Created in iam-roles module."
  type        = string
}
