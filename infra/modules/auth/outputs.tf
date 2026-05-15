output "user_pool_id" { value = aws_cognito_user_pool.main.id }
output "client_id"    { value = aws_cognito_user_pool_client.react_app.id }

output "hosted_ui_domain" {
  value = "https://${aws_cognito_user_pool_domain.main.domain}.auth.${var.aws_region}.amazoncognito.com"
}

output "jwks_uri" {
  value = "https://cognito-idp.${var.aws_region}.amazonaws.com/${aws_cognito_user_pool.main.id}/.well-known/jwks.json"
}

# ── SAML values to use when registering the IAM Identity Center SAML app ──────
# After first apply, run: terraform output saml_acs_url
#                          terraform output saml_entity_id
# Paste these into the IAM Identity Center SAML application settings.

output "saml_acs_url" {
  description = "SAML ACS URL — paste as 'Application ACS URL' in IAM Identity Center"
  value       = "https://${aws_cognito_user_pool_domain.main.domain}.auth.${var.aws_region}.amazoncognito.com/saml2/idpresponse"
}

output "saml_entity_id" {
  description = "SAML Entity ID (SP) — paste as 'Application SAML audience' in IAM Identity Center"
  value       = "urn:amazon:cognito:sp:${aws_cognito_user_pool.main.id}"
}
