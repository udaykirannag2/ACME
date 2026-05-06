locals {
  name_prefix = "acme-finance-${var.env}"

  agent_instruction = <<-EOT
    You are a finance data analyst for ACME Finance. Your job is to answer questions about
    revenue, expenses, P&L, accounts receivable, and ARR by querying the data warehouse.

    IMPORTANT RULES:
    - Always call describe_schema first if you are unsure which table or column to use.
    - Always qualify table names: analytics_dev_marts.<table_name>
    - Use fiscal_year (not calendar year) for year-over-year comparisons.
    - Fiscal year ends January 31. FY2024 = Feb 2023 through Jan 2024.
    - Fiscal quarters: Q1=Feb-Apr, Q2=May-Jul, Q3=Aug-Oct, Q4=Nov-Jan.
    - period_yyyymm is an integer like 202302 (Feb 2023 = FY2024 Q1).
    - Monetary columns are in USD. Percentages are stored as 0-1 (multiply by 100 for display).
    - Entities are: US, EMEA, APAC.
    - Cap result sets to 20 rows unless the user asks for more.
    - Round monetary values to 2 decimal places in your answer.
    - If a query fails, inspect the error, adjust the SQL, and retry once.
    - Never modify data. Only SELECT statements are allowed.

    KEY TABLES (schema: analytics_dev_marts):
    - mart_pl          P&L by entity/fiscal_year/fiscal_quarter/period_yyyymm
    - fct_revenue      Revenue by entity/segment/period
    - fct_expense      Expenses by entity/cost_center/account/period
    - fct_gl_entries   Atomic GL journal lines (source of truth)
    - fct_arr          ARR movements (new, expansion, contraction, churn)
    - mart_ar_aging    Open AR invoices with aging buckets (0-30, 31-60, 61-90, 90+)
    - dim_entity       Entity dimension (US, EMEA, APAC)
    - dim_account      Chart of accounts (account_type, pnl_rollup, is_revenue, is_expense)
    - dim_cost_center  Cost centers with function and entity rollup
    - dim_customer     Customer dimension (segment_tier, region, billing_country)
    - dim_date         Fiscal and calendar date spine

    Always present numbers clearly, use tables for multi-row results, and explain
    what the data means in plain English after showing the figures.
  EOT
}

# ── IAM: Lambda execution role ────────────────────────────────────────────────

resource "aws_iam_role" "lambda_exec" {
  name = "${local.name_prefix}-text-to-sql-lambda"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "lambda_redshift" {
  name = "redshift-data-access"
  role = aws_iam_role.lambda_exec.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "redshift-data:ExecuteStatement",
          "redshift-data:DescribeStatement",
          "redshift-data:GetStatementResult",
          "redshift-serverless:GetCredentials",
        ]
        Resource = [var.redshift_workgroup_arn]
      },
      {
        # DescribeStatement and GetStatementResult don't accept resource ARNs
        Effect   = "Allow"
        Action   = ["redshift-data:DescribeStatement", "redshift-data:GetStatementResult"]
        Resource = "*"
      },
    ]
  })
}

# ── Lambda: text_to_sql ───────────────────────────────────────────────────────

data "archive_file" "text_to_sql" {
  type        = "zip"
  source_dir  = var.lambda_source_dir
  output_path = "${path.module}/.build/text_to_sql.zip"
  excludes    = ["requirements.txt", "__pycache__", "*.pyc"]
}

resource "aws_lambda_function" "text_to_sql" {
  function_name    = "${local.name_prefix}-text-to-sql"
  role             = aws_iam_role.lambda_exec.arn
  handler          = "handler.lambda_handler"
  runtime          = "python3.12"
  timeout          = 90
  filename         = data.archive_file.text_to_sql.output_path
  source_code_hash = data.archive_file.text_to_sql.output_base64sha256

  environment {
    variables = {
      ENV = var.env
    }
  }

  tags = {
    Phase = "6"
    Env   = var.env
  }
}

resource "aws_lambda_permission" "bedrock_invoke" {
  statement_id  = "AllowBedrockAgentInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.text_to_sql.function_name
  principal     = "bedrock.amazonaws.com"
  source_arn    = aws_bedrockagent_agent.finance.agent_arn
}

# ── IAM: Bedrock Agent execution role ────────────────────────────────────────

resource "aws_iam_role" "bedrock_agent" {
  name = "AmazonBedrockExecutionRoleForAgents_${local.name_prefix}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "bedrock.amazonaws.com" }
      Action    = "sts:AssumeRole"
      Condition = {
        StringEquals = {
          "aws:SourceAccount" = data.aws_caller_identity.current.account_id
        }
      }
    }]
  })
}

resource "aws_iam_role_policy" "bedrock_agent_fm" {
  name = "invoke-foundation-model"
  role = aws_iam_role.bedrock_agent.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"]
      Resource = "arn:aws:bedrock:us-east-1::foundation-model/${var.foundation_model_id}"
    }]
  })
}

resource "aws_iam_role_policy" "bedrock_agent_lambda" {
  name = "invoke-action-lambda"
  role = aws_iam_role.bedrock_agent.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["lambda:InvokeFunction"]
      Resource = aws_lambda_function.text_to_sql.arn
    }]
  })
}

data "aws_caller_identity" "current" {}

# ── Bedrock Agent ─────────────────────────────────────────────────────────────

resource "aws_bedrockagent_agent" "finance" {
  agent_name              = "${local.name_prefix}-finance-analyst"
  agent_resource_role_arn = aws_iam_role.bedrock_agent.arn
  foundation_model        = var.foundation_model_id
  instruction             = local.agent_instruction

  idle_session_ttl_in_seconds = 900

  tags = {
    Phase = "6"
    Env   = var.env
  }
}

# ── Action Group: QueryFinanceData ────────────────────────────────────────────

resource "aws_bedrockagent_agent_action_group" "query_finance" {
  agent_id          = aws_bedrockagent_agent.finance.agent_id
  agent_version     = "DRAFT"
  action_group_name = "QueryFinanceData"
  description       = "Execute SQL queries and retrieve schema for the ACME Finance data warehouse"

  action_group_executor {
    lambda = aws_lambda_function.text_to_sql.arn
  }

  function_schema {
    member_functions {
      functions {
        name        = "execute_sql"
        description = "Execute a read-only SQL SELECT statement against the Redshift analytics warehouse and return the results"
        parameters {
          map_block_key = "sql_query"
          type          = "string"
          description   = "A valid Redshift SQL SELECT statement. Use schema prefix analytics_dev_marts. Only SELECT is allowed."
          required      = true
        }
      }

      functions {
        name        = "describe_schema"
        description = "Return the full schema of all available tables — column names, types, and descriptions. Call this before writing a query when unsure about column names."
      }
    }
  }

  depends_on = [aws_bedrockagent_agent.finance]
}

# ── Agent Alias (versioned deployment target) ─────────────────────────────────

resource "aws_bedrockagent_agent_alias" "live" {
  agent_id         = aws_bedrockagent_agent.finance.agent_id
  agent_alias_name = "live"
  description      = "Stable alias for the finance analyst agent"

  depends_on = [aws_bedrockagent_agent_action_group.query_finance]
}
