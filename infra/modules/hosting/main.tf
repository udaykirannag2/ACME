# ── ECR Repository ────────────────────────────────────────────────────────────

resource "aws_ecr_repository" "api" {
  name                 = "acme-finance-${var.env}-api"
  image_tag_mutability = "MUTABLE"
  force_delete         = true

  image_scanning_configuration { scan_on_push = true }

  tags = { Component = "api" }
}

resource "aws_ecr_lifecycle_policy" "api" {
  repository = aws_ecr_repository.api.name
  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep last 3 images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 3
      }
      action = { type = "expire" }
    }]
  })
}

# ── IAM Role for Lambda ───────────────────────────────────────────────────────

data "aws_iam_policy_document" "lambda_assume" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "api_lambda" {
  name               = "acme-finance-${var.env}-api-lambda"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume.json
  tags               = { Component = "api" }
}

resource "aws_iam_role_policy_attachment" "basic_execution" {
  role       = aws_iam_role.api_lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

data "aws_iam_policy_document" "api_permissions" {
  # Redshift Serverless
  statement {
    effect = "Allow"
    actions = [
      "redshift-data:ExecuteStatement",
      "redshift-serverless:GetCredentials",
    ]
    resources = [var.redshift_workgroup_arn]
  }
  statement {
    effect = "Allow"
    actions = [
      "redshift-data:DescribeStatement",
      "redshift-data:GetStatementResult",
      "redshift-data:ListStatements",
    ]
    resources = ["*"]
  }
  # Bedrock Agent — actual action is bedrock:InvokeAgent (not bedrock-agent-runtime:)
  statement {
    effect  = "Allow"
    actions = ["bedrock:InvokeAgent"]
    resources = [
      "arn:aws:bedrock:${var.aws_region}:*:agent/${var.bedrock_agent_id}",
      "arn:aws:bedrock:${var.aws_region}:*:agent-alias/${var.bedrock_agent_id}/*",
    ]
  }
  # AgentCore Memory
  statement {
    effect = "Allow"
    actions = [
      "bedrock-agentcore:RetrieveMemoryRecords",
      "bedrock-agentcore:BatchCreateMemoryRecords",
      "bedrock-agentcore:GetMemory",
      "bedrock-agentcore:ListMemoryRecords",
    ]
    resources = [var.agentcore_memory_arn]
  }
}

resource "aws_iam_role_policy" "api_permissions" {
  name   = "acme-finance-${var.env}-api-permissions"
  role   = aws_iam_role.api_lambda.id
  policy = data.aws_iam_policy_document.api_permissions.json
}

# ── Lambda Function ───────────────────────────────────────────────────────────

# Placeholder image — deploy.sh will update this via update-function-code
resource "aws_lambda_function" "api" {
  function_name = "acme-finance-${var.env}-api"
  role          = aws_iam_role.api_lambda.arn
  package_type  = "Image"
  image_uri     = "${aws_ecr_repository.api.repository_url}:latest"
  memory_size   = 512
  timeout       = 60

  environment {
    variables = {
      BEDROCK_AGENT_ID        = var.bedrock_agent_id
      BEDROCK_AGENT_ALIAS_ID  = var.bedrock_agent_alias_id
      AGENTCORE_MEMORY_ID     = var.agentcore_memory_id
      AGENTCORE_MEMORY_ARN    = var.agentcore_memory_arn
      AGENTCORE_STRATEGY_ID   = var.agentcore_strategy_id
      REDSHIFT_WORKGROUP      = var.redshift_workgroup_name
      REDSHIFT_DATABASE       = "dev"
      PORT                    = "8000"
      AWS_REGION_OVERRIDE     = var.aws_region
      COGNITO_USER_POOL_ID    = var.cognito_user_pool_id
      COGNITO_CLIENT_ID       = var.cognito_client_id
    }
  }

  lifecycle {
    ignore_changes = [image_uri]
  }

  tags = { Component = "api" }
}

# ── Lambda Function URL (public, fronted by CloudFront) ──────────────────────
# AuthType=NONE — public Function URL, accessed via CloudFront for caching/edge
# distribution. Application-level auth (Cognito JWT) layered on top when enabled.

resource "aws_lambda_function_url" "api" {
  function_name      = aws_lambda_function.api.function_name
  authorization_type = "NONE"
  invoke_mode        = "RESPONSE_STREAM"
}

# Two permissions required since AWS Lambda's Oct 2025 change:
# both lambda:InvokeFunctionUrl AND lambda:InvokeFunction must be granted.
# Without lambda:InvokeFunction with InvokedViaFunctionUrl=true, the URL returns
# 403 Forbidden even with a correct lambda:InvokeFunctionUrl permission.

resource "aws_lambda_permission" "api_url_invoke_url" {
  statement_id           = "PublicFunctionUrlAccess"
  action                 = "lambda:InvokeFunctionUrl"
  function_name          = aws_lambda_function.api.function_name
  principal              = "*"
  function_url_auth_type = "NONE"
}

# Per AWS Lambda's October 2025 change, public Function URLs also need a
# lambda:InvokeFunction permission with the InvokedViaFunctionUrl condition.
# The Terraform aws_lambda_permission resource doesn't expose this condition
# directly, so we add it via the AWS CLI through a null_resource.
resource "null_resource" "api_invoke_function_via_url" {
  triggers = {
    function_name = aws_lambda_function.api.function_name
  }

  provisioner "local-exec" {
    command = <<-EOT
      aws lambda add-permission \
        --function-name ${aws_lambda_function.api.function_name} \
        --statement-id PublicInvokeFunctionViaUrl \
        --action lambda:InvokeFunction \
        --principal '*' \
        --invoked-via-function-url \
        --region ${var.aws_region} \
        2>&1 | grep -v "ResourceConflictException" || true
    EOT
  }

  depends_on = [aws_lambda_permission.api_url_invoke_url]
}
