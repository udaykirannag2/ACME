# Phase 4E — DMS Serverless: RDS Postgres → S3 raw zone (Parquet).
#
# Demonstrates the relational-source → S3 ingestion pattern for Phase 4 of the
# warehouse. Full-load only in this module (CDC is a one-line change to
# replication_type but adds operational complexity — deferred).
#
# DMS Serverless is pay-per-active-DCU. Idle = $0.

terraform {
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.70" }
  }
}

# =============================================================================
# Pre-requisite IAM roles for DMS (account-wide, AWS-managed names)
# =============================================================================

# These two roles MUST exist with these exact names for DMS to function in any
# capacity in the account. They're created automatically when you first use DMS
# in the AWS console; for Terraform we create them explicitly so apply is
# idempotent across fresh accounts.

data "aws_iam_policy_document" "dms_assume" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["dms.amazonaws.com", "dms.${data.aws_region.current.name}.amazonaws.com"]
    }
  }
}

data "aws_region" "current" {}
data "aws_caller_identity" "current" {}

resource "aws_iam_role" "dms_vpc_role" {
  name               = "dms-vpc-role"
  assume_role_policy = data.aws_iam_policy_document.dms_assume.json
  tags = { managed-by = "terraform" }
}

resource "aws_iam_role_policy_attachment" "dms_vpc_role_policy" {
  role       = aws_iam_role.dms_vpc_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonDMSVPCManagementRole"
}

resource "aws_iam_role" "dms_cloudwatch_logs_role" {
  name               = "dms-cloudwatch-logs-role"
  assume_role_policy = data.aws_iam_policy_document.dms_assume.json
  tags = { managed-by = "terraform" }
}

resource "aws_iam_role_policy_attachment" "dms_cloudwatch_logs_role_policy" {
  role       = aws_iam_role.dms_cloudwatch_logs_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonDMSCloudWatchLogsRole"
}

# =============================================================================
# Custom IAM role: DMS access to the S3 target bucket + KMS decrypt
# =============================================================================

resource "aws_iam_role" "dms_s3_target" {
  name               = "acme-finance-${var.env}-dms-s3-target"
  assume_role_policy = data.aws_iam_policy_document.dms_assume.json
}

data "aws_iam_policy_document" "dms_s3_target_access" {
  statement {
    effect = "Allow"
    actions = [
      "s3:PutObject", "s3:DeleteObject", "s3:PutObjectTagging",
      "s3:GetObject", "s3:ListBucket",
    ]
    resources = [var.raw_bucket_arn, "${var.raw_bucket_arn}/*"]
  }
  statement {
    effect    = "Allow"
    actions   = ["kms:Decrypt", "kms:DescribeKey", "kms:GenerateDataKey", "kms:Encrypt"]
    resources = [var.kms_key_arn]
  }
}

resource "aws_iam_policy" "dms_s3_target_access" {
  name   = "acme-finance-${var.env}-dms-s3-target-access"
  policy = data.aws_iam_policy_document.dms_s3_target_access.json
}

resource "aws_iam_role_policy_attachment" "dms_s3_target_access" {
  role       = aws_iam_role.dms_s3_target.name
  policy_arn = aws_iam_policy.dms_s3_target_access.arn
}

# Allow DMS to read the RDS master credentials secret
data "aws_iam_policy_document" "dms_secrets_access" {
  statement {
    effect    = "Allow"
    actions   = ["secretsmanager:GetSecretValue"]
    resources = [var.source_secret_arn]
  }
  statement {
    effect    = "Allow"
    actions   = ["kms:Decrypt"]
    resources = ["*"]
    condition {
      test     = "StringEquals"
      variable = "kms:ViaService"
      values   = ["secretsmanager.${data.aws_region.current.name}.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "dms_source_secrets" {
  name               = "acme-finance-${var.env}-dms-source-secrets"
  assume_role_policy = data.aws_iam_policy_document.dms_assume.json
}

resource "aws_iam_policy" "dms_source_secrets" {
  name   = "acme-finance-${var.env}-dms-source-secrets"
  policy = data.aws_iam_policy_document.dms_secrets_access.json
}

resource "aws_iam_role_policy_attachment" "dms_source_secrets" {
  role       = aws_iam_role.dms_source_secrets.name
  policy_arn = aws_iam_policy.dms_source_secrets.arn
}

# =============================================================================
# Source endpoint (RDS Postgres)
# =============================================================================

resource "aws_dms_endpoint" "source_rds" {
  endpoint_id   = "acme-finance-${var.env}-source-rds"
  endpoint_type = "source"
  engine_name   = "postgres"

  postgres_settings {
    capture_ddls                = false
    ddl_artifacts_schema        = "public"
    execute_timeout             = 60
    fail_tasks_on_lob_truncation = false
    heartbeat_enable            = false
    plugin_name                 = "pglogical"
  }

  secrets_manager_access_role_arn = aws_iam_role.dms_source_secrets.arn
  secrets_manager_arn             = var.source_secret_arn
  database_name                   = var.source_database_name
  ssl_mode                        = "require"

  tags = { Name = "acme-finance-${var.env}-source-rds" }
}

# =============================================================================
# Target endpoint (S3 raw zone, Parquet)
# =============================================================================

resource "aws_dms_endpoint" "target_s3" {
  endpoint_id   = "acme-finance-${var.env}-target-s3"
  endpoint_type = "target"
  engine_name   = "s3"

  s3_settings {
    bucket_name             = var.raw_bucket_name
    bucket_folder           = "dms_erp"
    service_access_role_arn = aws_iam_role.dms_s3_target.arn
    data_format             = "parquet"
    parquet_version         = "parquet-2-0"
    compression_type        = "GZIP"
    include_op_for_full_load = true
    timestamp_column_name   = "_dms_timestamp"
    add_column_name         = true
    encryption_mode         = "SSE_KMS"
    server_side_encryption_kms_key_id = var.kms_key_arn
  }

  tags = { Name = "acme-finance-${var.env}-target-s3" }
}

# =============================================================================
# Replication subnet group (uses private subnets)
# =============================================================================

resource "aws_dms_replication_subnet_group" "main" {
  replication_subnet_group_id          = "acme-finance-${var.env}-dms-subnet-group"
  replication_subnet_group_description = "Subnets for DMS Serverless replication"
  subnet_ids                           = var.subnet_ids

  depends_on = [aws_iam_role_policy_attachment.dms_vpc_role_policy]
}

# =============================================================================
# DMS Serverless replication config
# =============================================================================

# Replicate all tables in the raw_erp Postgres schema as Parquet to S3.
locals {
  table_mappings = jsonencode({
    rules = [
      {
        rule-type = "selection"
        rule-id   = "1"
        rule-name = "select-raw-erp"
        object-locator = {
          schema-name = "raw_erp"
          table-name  = "%"
        }
        rule-action = "include"
      },
    ]
  })

  replication_settings = jsonencode({
    Logging = {
      EnableLogging = true
    }
    FullLoadSettings = {
      TargetTablePrepMode = "DROP_AND_CREATE"
      MaxFullLoadSubTasks = 8
    }
  })
}

resource "aws_dms_replication_config" "rds_to_s3" {
  replication_config_identifier = "acme-finance-${var.env}-rds-to-s3"
  replication_type              = "full-load"
  source_endpoint_arn           = aws_dms_endpoint.source_rds.endpoint_arn
  target_endpoint_arn           = aws_dms_endpoint.target_s3.endpoint_arn
  table_mappings                = local.table_mappings
  replication_settings          = local.replication_settings
  start_replication             = false # we'll trigger manually
  resource_identifier           = "acme-finance-${var.env}-erp-dms"

  compute_config {
    replication_subnet_group_id  = aws_dms_replication_subnet_group.main.id
    max_capacity_units           = 4
    min_capacity_units           = 1
    multi_az                     = false
    preferred_maintenance_window = "sun:09:00-sun:11:00"
    vpc_security_group_ids       = var.security_group_ids
  }

  tags = { Name = "acme-finance-${var.env}-rds-to-s3" }
}
