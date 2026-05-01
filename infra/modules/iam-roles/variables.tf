variable "env" {
  type = string
}

variable "s3_lake_arns" {
  description = "Map of zone name -> bucket ARN."
  type        = map(string)
}
