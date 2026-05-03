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
  # Location_uri is what Iceberg uses to derive each table's data file location
  # when a table is created without an explicit `location` property.
  location_uri = "s3://${var.curated_bucket_name}/iceberg/"
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

# Crawler over the curated zone so the freshly written Iceberg tables show up
# in Spectrum after each ETL run. Iceberg tables are auto-detected by Glue
# crawlers via the metadata.json marker file.
resource "aws_glue_crawler" "curated" {
  name          = "acme-finance-${var.env}-crawler-curated"
  database_name = aws_glue_catalog_database.curated.name
  role          = var.glue_role_arn
  description   = "Crawls curated Iceberg tables under s3://...curated/iceberg/"

  s3_target {
    path = "s3://${var.curated_bucket_name}/iceberg/"
  }

  configuration = local.crawler_configuration

  schema_change_policy {
    update_behavior = "UPDATE_IN_DATABASE"
    delete_behavior = "LOG"
  }
}

# =============================================================================
# ETL job — reads Glue Catalog raw, writes Iceberg into curated
# =============================================================================

resource "aws_s3_object" "etl_script" {
  bucket = var.curated_bucket_name
  key    = "_glue_scripts/raw_to_curated.py"
  source = "${path.root}/../../../pipelines/glue_jobs/raw_to_curated.py"
  etag   = filemd5("${path.root}/../../../pipelines/glue_jobs/raw_to_curated.py")
}

resource "aws_glue_job" "raw_to_curated" {
  name              = "acme-finance-${var.env}-raw-to-curated"
  role_arn          = var.glue_role_arn
  glue_version      = "4.0"
  worker_type       = "G.1X"
  number_of_workers = 2
  execution_class   = "STANDARD"
  timeout           = 30 # minutes
  max_retries       = 0

  # Allow the 3 parallel ETL invocations from Step Functions (one per source db).
  # Set to 5 with headroom because Glue's API can briefly count a STOPPING job
  # as "active" against the limit.
  execution_property {
    max_concurrent_runs = 5
  }

  command {
    name            = "glueetl"
    script_location = "s3://${var.curated_bucket_name}/${aws_s3_object.etl_script.key}"
    python_version  = "3"
  }

  default_arguments = {
    "--datalake-formats"                 = "iceberg"
    "--enable-glue-datacatalog"          = "true"
    "--enable-metrics"                   = "true"
    "--enable-continuous-cloudwatch-log" = "true"
    "--target_database"                  = aws_glue_catalog_database.curated.name
    "--target_warehouse_path"            = "s3://${var.curated_bucket_name}/iceberg/"
    # Explicit Iceberg + Glue catalog config (Glue 4.0 auto-config doesn't always
    # set the warehouse path correctly).
    "--conf"                             = "spark.sql.catalog.glue_iceberg=org.apache.iceberg.spark.SparkCatalog --conf spark.sql.catalog.glue_iceberg.catalog-impl=org.apache.iceberg.aws.glue.GlueCatalog --conf spark.sql.catalog.glue_iceberg.warehouse=s3://${var.curated_bucket_name}/iceberg/ --conf spark.sql.catalog.glue_iceberg.io-impl=org.apache.iceberg.aws.s3.S3FileIO"
    # --source_database is supplied at run time
  }
}
