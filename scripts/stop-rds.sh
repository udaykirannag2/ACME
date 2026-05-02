#!/usr/bin/env bash
# Stop the ACME ERP RDS instance to save ~70% on cost.
# RDS auto-restarts after 7 days; rerun start-rds.sh to bring it back manually.
# Usage: AWS_PROFILE=acme-admin ./scripts/stop-rds.sh
set -euo pipefail

INSTANCE_ID="acme-erp-dev"
echo "Stopping RDS instance ${INSTANCE_ID}..."
aws rds stop-db-instance --db-instance-identifier "${INSTANCE_ID}" --output json | head -5
echo "Stop initiated. Storage and backups still incur cost (~$2.30/mo for 20 GB)."
