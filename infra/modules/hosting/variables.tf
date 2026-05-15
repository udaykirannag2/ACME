variable "env" {
  type = string
}

variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "bedrock_agent_id" {
  type = string
}

variable "bedrock_agent_alias_id" {
  type = string
}

variable "agentcore_memory_id" {
  type = string
}

variable "agentcore_memory_arn" {
  type = string
}

variable "agentcore_strategy_id" {
  type = string
}

variable "redshift_workgroup_name" {
  type = string
}

variable "redshift_workgroup_arn" {
  type = string
}

variable "cognito_user_pool_id" {
  type    = string
  default = ""
}

variable "cognito_client_id" {
  type    = string
  default = ""
}
