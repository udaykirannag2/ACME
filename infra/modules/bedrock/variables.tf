variable "env" {
  type        = string
  description = "Environment name (dev, prod)"
}

variable "kb_bucket_arn" {
  type        = string
  description = "ARN of the S3 knowledge-base bucket (from s3-lake module)"
}

variable "redshift_workgroup_arn" {
  type        = string
  description = "ARN of the Redshift Serverless workgroup"
}

variable "lambda_source_dir" {
  type        = string
  description = "Absolute path to the text_to_sql Lambda source directory"
}

variable "foundation_model_id" {
  type        = string
  default     = "us.anthropic.claude-3-5-sonnet-20241022-v2:0"
  description = "Bedrock foundation model ID for the agent"
}
