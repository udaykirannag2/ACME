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

# Phase 4 outputs
output "glue_databases" {
  value       = module.glue.all_database_names
  description = "Glue Catalog databases for raw_erp, raw_epm, raw_crm, curated."
}

output "glue_crawlers" {
  value       = module.glue.crawler_names
  description = "Crawler names for `aws glue start-crawler`."
}

output "redshift_workgroup" {
  value       = module.redshift_serverless.workgroup_name
  description = "Redshift Serverless workgroup name."
}

output "redshift_endpoint" {
  value       = module.redshift_serverless.endpoint
  description = "Redshift Serverless endpoint hostname."
}

output "redshift_secret_arn" {
  value       = module.redshift_serverless.secret_arn
  description = "Secrets Manager ARN with Redshift admin credentials."
}

output "redshift_spectrum_role_arn" {
  value       = module.redshift_serverless.spectrum_role_arn
  description = "IAM role ARN that Redshift uses for Spectrum (external schemas)."
}
