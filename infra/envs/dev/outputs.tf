output "s3_lake_buckets" {
  description = "S3 lake bucket names (raw, curated, kb)."
  value       = module.s3_lake.bucket_names
}

output "vpc_id" {
  value = module.network.vpc_id
}

output "private_subnet_ids" {
  value = module.network.private_subnet_ids
}

# Phase 3 outputs
output "erp_endpoint" {
  value       = module.rds_erp.endpoint
  description = "RDS Postgres hostname for the ERP simulator."
}

output "erp_secret_arn" {
  value       = module.rds_erp.secret_arn
  description = "Secrets Manager ARN holding ERP master credentials."
}

output "erp_instance_id" {
  value       = module.rds_erp.instance_id
  description = "RDS instance identifier (for start/stop)."
}
