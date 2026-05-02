#!/usr/bin/env bash
# When your home IP changes (Comcast renewal, coffee shop, etc.) re-run this
# to update the RDS allowlist. Idempotent: re-applying doesn't recreate RDS.
#
# Usage: AWS_PROFILE=acme-admin ./scripts/refresh-my-ip.sh
set -euo pipefail

REPO_ROOT=$(git -C "$(dirname "$0")" rev-parse --show-toplevel)
TFVARS="${REPO_ROOT}/infra/envs/dev/terraform.tfvars"

NEW_IP="$(curl -s -4 ifconfig.me)/32"
if [[ -z "${NEW_IP}" || "${NEW_IP}" == "/32" ]]; then
    echo "Couldn't fetch IPv4 address from ifconfig.me. Aborting."
    exit 1
fi

echo "Current public IP: ${NEW_IP}"

# Show current setting
CURRENT_IP=$(grep -E '^my_ip_cidr' "${TFVARS}" | sed -E 's/.*"([^"]+)".*/\1/')
if [[ "${CURRENT_IP}" == "${NEW_IP}" ]]; then
    echo "tfvars already set to ${NEW_IP}, no change needed."
    exit 0
fi

echo "Updating ${TFVARS}: ${CURRENT_IP} -> ${NEW_IP}"
# Replace the line
sed -i.bak -E "s|^(my_ip_cidr.*=.*\")[^\"]*(\".*)|\1${NEW_IP}\2|" "${TFVARS}"
rm "${TFVARS}.bak"

cd "${REPO_ROOT}/infra/envs/dev"
echo "Running terraform apply (only the SG rule will change)..."
terraform apply -auto-approve
