output "endpoint" {
  description = "Hostname (no port) for the RDS instance."
  value       = aws_db_instance.erp.address
}

output "port" {
  value = aws_db_instance.erp.port
}

output "database_name" {
  value = var.database_name
}

output "master_username" {
  value = var.master_username
}

output "instance_id" {
  description = "RDS instance identifier — use with aws rds start-db-instance / stop-db-instance."
  value       = aws_db_instance.erp.id
}

output "secret_arn" {
  description = "Secrets Manager ARN holding {username, password, host, port, dbname}."
  value       = aws_secretsmanager_secret.erp_master.arn
}

output "parameter_group_name" {
  value = aws_db_parameter_group.erp.name
}
