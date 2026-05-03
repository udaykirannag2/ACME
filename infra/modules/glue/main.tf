# Phase 4A — Glue Data Catalog: 4 databases (raw_erp, raw_epm, raw_crm, curated)
# plus 3 crawlers that auto-detect schemas in s3://...raw/{erp,epm,crm}/.
#
# Crawlers are on-demand only (no schedule) — invoke via:
#   aws glue start-crawler --name acme-finance-dev-crawler-erp
# Step Functions in Phase 4F will orchestrate them on a daily cron.

terraform {
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.70" }
  }
}

# =============================================================================
# Catalog databases
# =============================================================================

resource "aws_glue_catalog_database" "raw_erp" {
  name        = "acme_finance_raw_erp_${var.env}"
  description = "ERP raw zone — registered from s3://...raw/erp/ via DMS (Phase 4E) or direct CSV upload (Phase 2)"
}

resource "aws_glue_catalog_database" "raw_epm" {
  name        = "acme_finance_raw_epm_${var.env}"
  description = "EPM raw zone — Parquet from generators/_out/epm/ uploaded via acme-generate --upload"
}

resource "aws_glue_catalog_database" "raw_crm" {
  name        = "acme_finance_raw_crm_${var.env}"
  description = "CRM raw zone — Parquet from generators/_out/crm/ uploaded via acme-generate --upload"
}

resource "aws_glue_catalog_database" "curated" {
  name        = "acme_finance_curated_${var.env}"
  description = "Curated zone — Iceberg tables produced by Phase 4D Glue ETL jobs"
}

# =============================================================================
# Crawlers — one per source
# =============================================================================

locals {
  # TableLevelConfiguration = 2 means: the folder one level below the crawl path
  # is the table boundary. So s3://...raw/erp/entity/* -> table "entity",
  # s3://...raw/erp/ar_invoice/* -> table "ar_invoice", etc.
  crawler_configuration = jsonencode({
    Version = 1.0
    CrawlerOutput = {
      Partitions = { AddOrUpdateBehavior = "InheritFromTable" }
      Tables     = { AddOrUpdateBehavior = "MergeNewColumns" }
    }
    Grouping = {
      TableLevelConfiguration = 2
    }
  })
}

resource "aws_glue_crawler" "erp" {
  name          = "acme-finance-${var.env}-crawler-erp"
  database_name = aws_glue_catalog_database.raw_erp.name
  role          = var.glue_role_arn
  description   = "Crawls ERP CSVs (or Parquet from DMS in Phase 4E) under s3://...raw/erp/"

  s3_target {
    path = "s3://${var.raw_bucket_name}/erp/"
  }

  configuration = local.crawler_configuration

  schema_change_policy {
    update_behavior = "UPDATE_IN_DATABASE"
    delete_behavior = "LOG"
  }
}

resource "aws_glue_crawler" "epm" {
  name          = "acme-finance-${var.env}-crawler-epm"
  database_name = aws_glue_catalog_database.raw_epm.name
  role          = var.glue_role_arn
  description   = "Crawls EPM Parquet under s3://...raw/epm/ (Hive-partitioned)"

  s3_target {
    path = "s3://${var.raw_bucket_name}/epm/"
  }

  configuration = local.crawler_configuration

  schema_change_policy {
    update_behavior = "UPDATE_IN_DATABASE"
    delete_behavior = "LOG"
  }
}

resource "aws_glue_crawler" "crm" {
  name          = "acme-finance-${var.env}-crawler-crm"
  database_name = aws_glue_catalog_database.raw_crm.name
  role          = var.glue_role_arn
  description   = "Crawls CRM Parquet under s3://...raw/crm/ (some tables Hive-partitioned)"

  s3_target {
    path = "s3://${var.raw_bucket_name}/crm/"
  }

  configuration = local.crawler_configuration

  schema_change_policy {
    update_behavior = "UPDATE_IN_DATABASE"
    delete_behavior = "LOG"
  }
}
