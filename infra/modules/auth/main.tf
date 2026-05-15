data "aws_caller_identity" "current" {}

# ── Cognito User Pool ─────────────────────────────────────────────────────────

resource "aws_cognito_user_pool" "main" {
  name = "acme-finance-${var.env}"

  # Users come exclusively from IAM Identity Center — no self-signup
  admin_create_user_config {
    allow_admin_create_user_only = true
  }

  # IAM Identity Center already verified email
  auto_verified_attributes = ["email"]

  # Standard attributes
  schema {
    name                = "email"
    attribute_data_type = "String"
    required            = true
    mutable             = true
  }

  # Custom attribute to receive IDC group memberships at federation time
  schema {
    name                = "groups"
    attribute_data_type = "String"
    required            = false
    mutable             = true
    string_attribute_constraints {
      max_length = "2048"
    }
  }

  tags = {}
}

# ── Cognito Domain (deterministic — based on account ID) ──────────────────────

resource "aws_cognito_user_pool_domain" "main" {
  domain       = "acme-finance-${var.env}-${data.aws_caller_identity.current.account_id}"
  user_pool_id = aws_cognito_user_pool.main.id
}

# ── IAM Identity Center as SAML 2.0 Identity Provider ────────────────────────
# Created only after idc_saml_metadata_url is populated (second apply).
# Phase 1: leave idc_saml_metadata_url = "" → User Pool is created, IdP is skipped.
# Phase 2: set idc_saml_metadata_url in terraform.tfvars → IdP is wired up.

resource "aws_cognito_identity_provider" "idc" {
  count = var.idc_saml_metadata_url != "" ? 1 : 0

  user_pool_id  = aws_cognito_user_pool.main.id
  provider_name = "IAMIdentityCenter"
  provider_type = "SAML"

  provider_details = {
    MetadataURL = var.idc_saml_metadata_url
    IDPSignout  = "false"
  }

  # Map SAML assertion attributes → Cognito user pool attributes.
  # These names must match what IAM Identity Center sends in the SAML assertion
  # (configure the same names in the IDC application attribute mappings).
  attribute_mapping = {
    email           = "email"
    name            = "name"
    username        = "NameID"
    "custom:groups" = "memberOf"
  }
}

# ── Cognito App Client (React SPA — public client) ────────────────────────────

resource "aws_cognito_user_pool_client" "react_app" {
  name         = "acme-finance-web"
  user_pool_id = aws_cognito_user_pool.main.id

  # Public client (SPA cannot store secrets)
  generate_secret = false

  # OAuth2 PKCE code flow
  allowed_oauth_flows                  = ["code"]
  allowed_oauth_scopes                 = ["openid", "email", "profile"]
  allowed_oauth_flows_user_pool_client = true

  # Phase 1 (no SAML IdP yet): fall back to COGNITO so Terraform doesn't error.
  # Phase 2 (SAML IdP exists): only allow sign-in through IAM Identity Center.
  supported_identity_providers = (
    var.idc_saml_metadata_url != "" ? ["IAMIdentityCenter"] : ["COGNITO"]
  )

  callback_urls = [
    "https://${var.cloudfront_domain}/",
    "http://localhost:5173/",
  ]
  logout_urls = [
    "https://${var.cloudfront_domain}/login",
    "http://localhost:5173/login",
  ]

  # Token validity
  token_validity_units {
    access_token  = "hours"
    id_token      = "hours"
    refresh_token = "days"
  }
  access_token_validity  = 1
  id_token_validity      = 1
  refresh_token_validity = 30

  depends_on = [aws_cognito_identity_provider.idc]
}

# ── Cognito Groups (receive IDC-federated members) ────────────────────────────

resource "aws_cognito_user_group" "admin" {
  name         = "admin"
  user_pool_id = aws_cognito_user_pool.main.id
  description  = "Full access — FP&A leads, controllers, finance managers"
}

resource "aws_cognito_user_group" "viewer" {
  name         = "viewer"
  user_pool_id = aws_cognito_user_pool.main.id
  description  = "Read-only — analysts, stakeholders, exec observers"
}
