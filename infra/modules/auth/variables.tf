variable "env" {
  type = string
}

variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "cloudfront_domain" {
  type = string
}

# SAML metadata URL from IAM Identity Center — paste after registering the SAML app.
# Leave empty ("") on first apply to create the User Pool alone.
# Re-apply after registration to wire up the SAML IdP.
variable "idc_saml_metadata_url" {
  type    = string
  default = ""
}
