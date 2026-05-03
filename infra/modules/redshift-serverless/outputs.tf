output "workgroup_name" {
  value = aws_redshiftserverless_workgroup.main.workgroup_name
}

output "namespace_name" {
  value = aws_redshiftserverless_namespace.main.namespace_name
}

output "endpoint" {
  description = "Workgroup endpoint hostname (resolves only when not paused)."
  value       = aws_redshiftserverless_workgroup.main.endpoint[0].address
}

output "port" {
  value = aws_redshiftserverless_workgroup.main.endpoint[0].port
}

output "database_name" {
  value = var.database_name
}

output "admin_username" {
  value = var.admin_username
}

output "secret_arn" {
  value = aws_secretsmanager_secret.admin.arn
}

output "spectrum_role_arn" {
  description = "IAM role ARN that Redshift uses for Spectrum / external schema access."
  value       = aws_iam_role.spectrum.arn
}
