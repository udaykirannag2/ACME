#!/usr/bin/env bash
# Creates the S3 bucket + DynamoDB table that Terraform uses for remote state.
# Run once per AWS account, before the first `terraform init` in infra/envs/dev.
#
# Usage: AWS_PROFILE=acme-finance ./scripts/bootstrap-tf-backend.sh

set -euo pipefail

AWS_REGION="${AWS_REGION:-us-east-1}"
ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
BUCKET="acme-finance-tfstate-${ACCOUNT_ID}"
TABLE="acme-finance-tflock"

echo "Account: ${ACCOUNT_ID}"
echo "Region:  ${AWS_REGION}"
echo "Bucket:  ${BUCKET}"
echo "Table:   ${TABLE}"
echo

# --- S3 bucket for state -----------------------------------------------------
if aws s3api head-bucket --bucket "${BUCKET}" 2>/dev/null; then
  echo "Bucket ${BUCKET} already exists, skipping creation."
else
  echo "Creating S3 bucket ${BUCKET}..."
  if [[ "${AWS_REGION}" == "us-east-1" ]]; then
    aws s3api create-bucket --bucket "${BUCKET}" --region "${AWS_REGION}"
  else
    aws s3api create-bucket --bucket "${BUCKET}" --region "${AWS_REGION}" \
      --create-bucket-configuration LocationConstraint="${AWS_REGION}"
  fi
  aws s3api put-bucket-versioning --bucket "${BUCKET}" \
    --versioning-configuration Status=Enabled
  aws s3api put-bucket-encryption --bucket "${BUCKET}" \
    --server-side-encryption-configuration '{
      "Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]
    }'
  aws s3api put-public-access-block --bucket "${BUCKET}" \
    --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
fi

# --- DynamoDB table for state lock ------------------------------------------
if aws dynamodb describe-table --table-name "${TABLE}" --region "${AWS_REGION}" >/dev/null 2>&1; then
  echo "Table ${TABLE} already exists, skipping creation."
else
  echo "Creating DynamoDB table ${TABLE}..."
  aws dynamodb create-table \
    --table-name "${TABLE}" \
    --attribute-definitions AttributeName=LockID,AttributeType=S \
    --key-schema AttributeName=LockID,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region "${AWS_REGION}" >/dev/null
  aws dynamodb wait table-exists --table-name "${TABLE}" --region "${AWS_REGION}"
fi

echo
echo "Done. Now uncomment the backend block in infra/envs/dev/main.tf with these values:"
echo "  bucket         = \"${BUCKET}\""
echo "  dynamodb_table = \"${TABLE}\""
echo "Then run: cd infra/envs/dev && terraform init"
