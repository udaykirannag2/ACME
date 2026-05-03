output "replication_config_arn" {
  value = aws_dms_replication_config.rds_to_s3.arn
}

output "replication_config_id" {
  value = aws_dms_replication_config.rds_to_s3.replication_config_identifier
}

output "source_endpoint_arn" {
  value = aws_dms_endpoint.source_rds.endpoint_arn
}

output "target_endpoint_arn" {
  value = aws_dms_endpoint.target_s3.endpoint_arn
}

output "s3_target_role_arn" {
  value = aws_iam_role.dms_s3_target.arn
}
