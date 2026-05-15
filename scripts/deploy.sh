#!/usr/bin/env bash
# deploy.sh — Build and deploy ACME Finance to AWS
# Usage:
#   ./scripts/deploy.sh                  # full deploy (backend + frontend)
#   ./scripts/deploy.sh --backend-only   # only Lambda image update
#   ./scripts/deploy.sh --frontend-only  # only React build + S3 sync
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TF_DIR="$REPO_ROOT/infra/envs/dev"
DEPLOY_BACKEND=true
DEPLOY_FRONTEND=true

# Parse flags
for arg in "$@"; do
  case $arg in
    --backend-only)  DEPLOY_FRONTEND=false ;;
    --frontend-only) DEPLOY_BACKEND=false  ;;
  esac
done

echo "🚀 ACME Finance Deploy"
echo "   Backend:  $DEPLOY_BACKEND"
echo "   Frontend: $DEPLOY_FRONTEND"
echo ""

# ── Read Terraform outputs ────────────────────────────────────────────────────
echo "📋 Reading Terraform outputs..."
cd "$TF_DIR"
ECR_REPO_URL=$(terraform output -raw ecr_repository_url 2>/dev/null || echo "")
LAMBDA_FUNCTION=$(terraform output -raw lambda_function_name 2>/dev/null || echo "")
LAMBDA_URL=$(terraform output -raw api_lambda_url 2>/dev/null || echo "")
S3_BUCKET=$(terraform output -raw frontend_bucket 2>/dev/null || echo "")
CF_DIST_ID=$(terraform output -raw cf_distribution_id 2>/dev/null || echo "")
CF_DOMAIN=$(terraform output -raw cloudfront_domain 2>/dev/null || echo "")
COGNITO_POOL_ID=$(terraform output -raw cognito_pool_id 2>/dev/null || echo "")
COGNITO_CLIENT_ID=$(terraform output -raw cognito_client_id 2>/dev/null || echo "")
COGNITO_DOMAIN=$(terraform output -raw cognito_domain 2>/dev/null || echo "")
cd "$REPO_ROOT"

if [[ -z "$ECR_REPO_URL" ]]; then
  echo "❌ Could not read Terraform outputs. Run 'terraform apply -target=module.hosting' first."
  exit 1
fi

AWS_REGION="${AWS_DEFAULT_REGION:-us-east-1}"
AWS_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
TIMESTAMP=$(date +%Y%m%d%H%M%S)
IMAGE_TAG="${ECR_REPO_URL}:${TIMESTAMP}"
IMAGE_LATEST="${ECR_REPO_URL}:latest"

# ── Backend: Build + push Docker image, update Lambda ────────────────────────
if [[ "$DEPLOY_BACKEND" == "true" ]]; then
  echo ""
  echo "🐳 Building Docker image..."
  aws ecr get-login-password --region "$AWS_REGION" | \
    docker login --username AWS --password-stdin "${ECR_REPO_URL%%/*}"

  docker build \
    --platform linux/amd64 \
    -f ui/Dockerfile \
    -t "$IMAGE_TAG" \
    -t "$IMAGE_LATEST" \
    .

  echo "📤 Pushing image to ECR..."
  docker push "$IMAGE_TAG"
  docker push "$IMAGE_LATEST"

  echo "⚡ Updating Lambda function code..."
  aws lambda update-function-code \
    --function-name "$LAMBDA_FUNCTION" \
    --image-uri "$IMAGE_TAG" \
    --region "$AWS_REGION" \
    --output json | jq -r '"   Version: \(.Version // "n/a")"'

  echo "⏳ Waiting for Lambda update to complete..."
  aws lambda wait function-updated \
    --function-name "$LAMBDA_FUNCTION" \
    --region "$AWS_REGION"

  echo "✅ Backend deployed: $LAMBDA_URL"
fi

# ── Frontend: Build React, sync to S3, invalidate CloudFront ─────────────────
if [[ "$DEPLOY_FRONTEND" == "true" ]]; then
  if [[ -z "$S3_BUCKET" ]]; then
    echo "❌ S3 bucket name not found in Terraform outputs."
    exit 1
  fi

  echo ""
  echo "⚛️  Building React app..."
  cd "$REPO_ROOT/ui-react"

  VITE_API_URL="$LAMBDA_URL" \
  VITE_COGNITO_USER_POOL_ID="$COGNITO_POOL_ID" \
  VITE_COGNITO_CLIENT_ID="$COGNITO_CLIENT_ID" \
  VITE_COGNITO_DOMAIN="$COGNITO_DOMAIN" \
  VITE_APP_CALLBACK_URL="https://${CF_DOMAIN}/" \
  npm run build

  echo "📤 Syncing static assets to S3 (long-lived cache)..."
  aws s3 sync dist/ "s3://$S3_BUCKET/" \
    --delete \
    --exclude "index.html" \
    --cache-control "public,max-age=31536000,immutable"

  echo "📤 Uploading index.html (no-cache)..."
  aws s3 cp dist/index.html "s3://$S3_BUCKET/index.html" \
    --cache-control "no-cache,no-store,must-revalidate" \
    --content-type "text/html"

  echo "🔄 Invalidating CloudFront..."
  aws cloudfront create-invalidation \
    --distribution-id "$CF_DIST_ID" \
    --paths "/*" \
    --output json | jq -r '"   Invalidation: \(.Invalidation.Id)"'

  cd "$REPO_ROOT"
  echo "✅ Frontend deployed: https://$CF_DOMAIN"
fi

echo ""
echo "🎉 Deploy complete!"
if [[ "$DEPLOY_BACKEND" == "true" ]]; then
  echo "   API:      $LAMBDA_URL"
fi
if [[ "$DEPLOY_FRONTEND" == "true" ]]; then
  echo "   Frontend: https://$CF_DOMAIN"
fi
