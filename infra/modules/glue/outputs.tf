output "raw_erp_database_name" {
  value = aws_glue_catalog_database.raw_erp.name
}

output "raw_epm_database_name" {
  value = aws_glue_catalog_database.raw_epm.name
}

output "raw_crm_database_name" {
  value = aws_glue_catalog_database.raw_crm.name
}

output "curated_database_name" {
  value = aws_glue_catalog_database.curated.name
}

output "all_database_names" {
  value = [
    aws_glue_catalog_database.raw_erp.name,
    aws_glue_catalog_database.raw_epm.name,
    aws_glue_catalog_database.raw_crm.name,
    aws_glue_catalog_database.curated.name,
  ]
}

output "crawler_names" {
  value = [
    aws_glue_crawler.erp.name,
    aws_glue_crawler.epm.name,
    aws_glue_crawler.crm.name,
  ]
}

output "curated_crawler_name" {
  value = aws_glue_crawler.curated.name
}

output "etl_job_name" {
  value = aws_glue_job.raw_to_curated.name
}

output "all_raw_database_names" {
  value = [
    aws_glue_catalog_database.raw_erp.name,
    aws_glue_catalog_database.raw_epm.name,
    aws_glue_catalog_database.raw_crm.name,
  ]
}
