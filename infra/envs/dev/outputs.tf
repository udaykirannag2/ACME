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
  description = "Raw zone crawler names for `aws glue start-crawler`."
}

output "glue_curated_crawler" {
  value       = module.glue.curated_crawler_name
  description = "Curated zone crawler (Iceberg). Run after ETL job."
}

output "glue_etl_job" {
  value       = module.glue.etl_job_name
  description = "Glue ETL job name (raw -> curated Iceberg)."
}

# DMS outputs
output "dms_replication_config_arn" {
  value       = module.dms.replication_config_arn
  description = "DMS Serverless replication config ARN."
}

output "dms_replication_config_id" {
  value       = module.dms.replication_config_id
  description = "DMS replication config identifier (use with start-replication)."
}

# Step Functions outputs
output "sfn_state_machine_arn" {
  value       = module.step_functions.state_machine_arn
  description = "ARN of the daily refresh state machine."
}

output "sfn_schedule_rule" {
  value       = module.step_functions.schedule_rule_name
  description = "EventBridge rule name for the daily refresh."
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
