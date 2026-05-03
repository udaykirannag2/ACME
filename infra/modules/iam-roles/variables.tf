variable "env" {
  type = string
}

variable "s3_lake_arns" {
  description = "Map of zone name -> bucket ARN."
  type        = map(string)
}

variable "kms_key_arn" {
  description = "Lake CMK ARN. Used in glue_lake_access policy for decrypt."
  type        = string
}
