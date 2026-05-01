# Service-linked roles created here. Each downstream module attaches additional
# policies as needed. Phase 0 only needs the Glue role (used in Phase 4).

# Glue execution role (used by Glue crawlers and ETL jobs in Phase 4)
data "aws_iam_policy_document" "glue_assume" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["glue.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "glue" {
  name               = "acme-finance-${var.env}-glue-role"
  assume_role_policy = data.aws_iam_policy_document.glue_assume.json
}

resource "aws_iam_role_policy_attachment" "glue_service" {
  role       = aws_iam_role.glue.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSGlueServiceRole"
}

# Allow Glue to read/write the lake buckets
data "aws_iam_policy_document" "glue_lake_access" {
  statement {
    effect  = "Allow"
    actions = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject", "s3:ListBucket"]
    resources = concat(
      [for arn in values(var.s3_lake_arns) : arn],
      [for arn in values(var.s3_lake_arns) : "${arn}/*"],
    )
  }
}

resource "aws_iam_policy" "glue_lake_access" {
  name   = "acme-finance-${var.env}-glue-lake-access"
  policy = data.aws_iam_policy_document.glue_lake_access.json
}

resource "aws_iam_role_policy_attachment" "glue_lake_access" {
  role       = aws_iam_role.glue.name
  policy_arn = aws_iam_policy.glue_lake_access.arn
}
