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

variable "my_ip_cidr" {
  description = "Operator's public IPv4 in CIDR /32. Used to allowlist RDS access. Null disables public ingress."
  type        = string
  default     = null
}

variable "idc_saml_metadata_url" {
  type    = string
  default = ""
}

# Set after first hosting apply (see terraform output cloudfront_domain).
# Used by module.auth to build Cognito callback URLs. Avoids dependency cycle
# (auth → hosting → lambda_url → cloudfront → auth).
variable "cloudfront_domain_static" {
  type    = string
  default = ""
}
