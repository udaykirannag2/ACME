# Phase 4 — Glue Catalog database, crawlers, ETL jobs.
# Stub.

variable "env" {
  type = string
}

variable "s3_lake_arns" {
  type = map(string)
}

# TODO Phase 4:
# - aws_glue_catalog_database "raw" and "curated"
# - aws_glue_crawler over s3://acme-lake-raw/{erp,epm,crm}/
# - aws_glue_job for raw → curated PySpark and Python Shell jobs
