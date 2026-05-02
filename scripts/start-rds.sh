#!/usr/bin/env bash
# Start the ACME ERP RDS instance.
# Usage: AWS_PROFILE=acme-admin ./scripts/start-rds.sh
set -euo pipefail

INSTANCE_ID="acme-erp-dev"
echo "Starting RDS instance ${INSTANCE_ID}..."
aws rds start-db-instance --db-instance-identifier "${INSTANCE_ID}" --output json | head -5
echo "Waiting for instance to become available (typically 3-5 minutes)..."
aws rds wait db-instance-available --db-instance-identifier "${INSTANCE_ID}"
endpoint=$(aws rds describe-db-instances --db-instance-identifier "${INSTANCE_ID}" \
    --query 'DBInstances[0].Endpoint.Address' --output text)
echo "Ready: ${endpoint}"
