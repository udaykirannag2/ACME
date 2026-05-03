# Phase 4B — Redshift Serverless namespace + workgroup with auto-pause + usage cap.
#
# 8 RPU base / 32 RPU max, $25/mo USD usage limit (~70 RPU-hours).
# Workgroup auto-pauses when there are no queries for some time (RS Serverless default).
# Public endpoint allowlisted to operator IP — same pattern as RDS.

terraform {
  required_providers {
    aws    = { source = "hashicorp/aws", version = "~> 5.70" }
    random = { source = "hashicorp/random", version = "~> 3.6" }
  }
}

# =============================================================================
# IAM role for Redshift Spectrum (read Glue Catalog + S3 lake)
# =============================================================================

data "aws_iam_policy_document" "spectrum_assume" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["redshift.amazonaws.com", "redshift-serverless.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "spectrum" {
  name               = "acme-finance-${var.env}-redshift-spectrum"
  assume_role_policy = data.aws_iam_policy_document.spectrum_assume.json
}

data "aws_iam_policy_document" "spectrum_access" {
  # Glue Catalog read
  statement {
    effect = "Allow"
    actions = [
      "glue:GetDatabase", "glue:GetDatabases",
      "glue:GetTable", "glue:GetTables",
      "glue:GetPartition", "glue:GetPartitions", "glue:BatchGetPartition",
    ]
    resources = ["*"]
  }
  # S3 read on lake buckets
  statement {
    effect = "Allow"
    actions = ["s3:GetObject", "s3:GetObjectVersion", "s3:ListBucket"]
    resources = concat(
      [for arn in values(var.s3_lake_arns) : arn],
      [for arn in values(var.s3_lake_arns) : "${arn}/*"],
    )
  }
  # KMS decrypt for the lake CMK
  statement {
    effect    = "Allow"
    actions   = ["kms:Decrypt", "kms:DescribeKey", "kms:GenerateDataKey"]
    resources = [var.kms_key_arn]
  }
  # Allow writing query results to S3 (Query Editor v2)
  statement {
    effect = "Allow"
    actions = ["s3:PutObject"]
    resources = ["${var.s3_lake_arns["curated"]}/redshift-query-results/*"]
  }
}

resource "aws_iam_policy" "spectrum_access" {
  name   = "acme-finance-${var.env}-redshift-spectrum-access"
  policy = data.aws_iam_policy_document.spectrum_access.json
}

resource "aws_iam_role_policy_attachment" "spectrum_access" {
  role       = aws_iam_role.spectrum.name
  policy_arn = aws_iam_policy.spectrum_access.arn
}

# =============================================================================
# Master credentials in Secrets Manager (separate from RDS)
# =============================================================================

resource "random_password" "admin" {
  length           = 32
  special          = true
  override_special = "!@#$%^&*-_=+"
}

resource "aws_secretsmanager_secret" "admin" {
  name                    = "acme-finance-${var.env}-redshift-admin"
  description             = "Master credentials for Redshift Serverless namespace"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "admin" {
  secret_id = aws_secretsmanager_secret.admin.id
  secret_string = jsonencode({
    username = var.admin_username
    password = random_password.admin.result
    engine   = "redshift"
    port     = 5439
    dbname   = var.database_name
    # host/endpoint are filled later (workgroup outputs)
  })
}

# =============================================================================
# Operator IP ingress on the redshift security group
# =============================================================================

resource "aws_security_group_rule" "redshift_from_my_ip" {
  count = var.my_ip_cidr != null ? 1 : 0

  type              = "ingress"
  from_port         = 5439
  to_port           = 5439
  protocol          = "tcp"
  cidr_blocks       = [var.my_ip_cidr]
  security_group_id = var.security_group_ids[0]
  description       = "Operator IP to Redshift Serverless"
}

# =============================================================================
# Namespace
# =============================================================================

resource "aws_redshiftserverless_namespace" "main" {
  namespace_name      = "acme-finance-${var.env}"
  admin_username      = var.admin_username
  admin_user_password = random_password.admin.result
  db_name             = var.database_name
  default_iam_role_arn = aws_iam_role.spectrum.arn
  iam_roles            = [aws_iam_role.spectrum.arn]
  kms_key_id           = var.kms_key_arn

  log_exports = ["userlog", "connectionlog", "useractivitylog"]

  tags = {
    Name = "acme-finance-${var.env}-namespace"
  }
}

# =============================================================================
# Workgroup
# =============================================================================

resource "aws_redshiftserverless_workgroup" "main" {
  namespace_name      = aws_redshiftserverless_namespace.main.namespace_name
  workgroup_name      = "acme-finance-${var.env}"
  base_capacity       = var.base_capacity_rpu
  max_capacity        = var.max_capacity_rpu
  publicly_accessible = var.publicly_accessible

  subnet_ids         = var.subnet_ids
  security_group_ids = var.security_group_ids

  config_parameter {
    parameter_key   = "auto_mv"
    parameter_value = "true"
  }
  config_parameter {
    parameter_key   = "enable_user_activity_logging"
    parameter_value = "true"
  }
  config_parameter {
    parameter_key   = "require_ssl"
    parameter_value = "true"
  }
  # Redshift Serverless workgroup auto-pauses when idle (no charge between queries)

  tags = {
    Name = "acme-finance-${var.env}-workgroup"
  }

  # AWS provider quirk: Terraform thinks config_parameter is "changed" on every
  # apply even when it isn't, then UpdateWorkgroup rejects with "no changes".
  # Ignoring drift on config_parameter avoids the spurious error.
  lifecycle {
    ignore_changes = [config_parameter]
  }
}

# =============================================================================
# Usage limit — caps RPU-hour spend
# =============================================================================

resource "aws_redshiftserverless_usage_limit" "compute" {
  resource_arn  = aws_redshiftserverless_workgroup.main.arn
  usage_type    = "serverless-compute"
  amount        = var.usage_limit_rpu_hours
  period        = "monthly"
  breach_action = "deactivate"
}

# Update secret with the workgroup endpoint
resource "aws_secretsmanager_secret_version" "admin_with_endpoint" {
  secret_id = aws_secretsmanager_secret.admin.id
  secret_string = jsonencode({
    username = var.admin_username
    password = random_password.admin.result
    engine   = "redshift"
    host     = aws_redshiftserverless_workgroup.main.endpoint[0].address
    port     = 5439
    dbname   = var.database_name
    workgroup = aws_redshiftserverless_workgroup.main.workgroup_name
  })

  depends_on = [aws_secretsmanager_secret_version.admin]
}
