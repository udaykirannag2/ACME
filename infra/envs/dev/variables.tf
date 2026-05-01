variable "aws_region" {
  description = "AWS region for all resources."
  type        = string
  default     = "us-east-1"
}

variable "env" {
  description = "Environment name (used in resource names and tags)."
  type        = string
  default     = "dev"
}

variable "owner" {
  description = "Owner tag value (your name or alias)."
  type        = string
  default     = "uday"
}

variable "budget_alert_email" {
  description = "Email address for AWS Budgets alarms ($50 actual, $100 forecasted)."
  type        = string
  # Set in terraform.tfvars (gitignored) or via TF_VAR_budget_alert_email.
}
