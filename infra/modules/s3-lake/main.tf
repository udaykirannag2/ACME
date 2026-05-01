# Three-bucket data lake: raw, curated, kb (knowledge base for Bedrock).
# All KMS-encrypted with a single shared CMK. Versioning on. Lifecycle to IA after 30d.

data "aws_caller_identity" "current" {}

resource "aws_kms_key" "lake" {
  description             = "ACME finance lake CMK"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = {
    Name = "acme-finance-${var.env}-lake-cmk"
  }
}

resource "aws_kms_alias" "lake" {
  name          = "alias/acme-finance-${var.env}-lake"
  target_key_id = aws_kms_key.lake.key_id
}

locals {
  zones = {
    raw      = "acme-lake-${var.env}-raw-${data.aws_caller_identity.current.account_id}"
    curated  = "acme-lake-${var.env}-curated-${data.aws_caller_identity.current.account_id}"
    kb       = "acme-lake-${var.env}-kb-${data.aws_caller_identity.current.account_id}"
  }
}

resource "aws_s3_bucket" "lake" {
  for_each      = local.zones
  bucket        = each.value
  force_destroy = true

  tags = {
    Name = each.value
    zone = each.key
  }
}

resource "aws_s3_bucket_versioning" "lake" {
  for_each = aws_s3_bucket.lake
  bucket   = each.value.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "lake" {
  for_each = aws_s3_bucket.lake
  bucket   = each.value.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.lake.arn
      sse_algorithm     = "aws:kms"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "lake" {
  for_each                = aws_s3_bucket.lake
  bucket                  = each.value.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "raw" {
  bucket = aws_s3_bucket.lake["raw"].id

  rule {
    id     = "transition-raw-to-ia"
    status = "Enabled"
    filter {}

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }
    transition {
      days          = 90
      storage_class = "GLACIER_IR"
    }
    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }
}
