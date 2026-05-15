locals {
  name_prefix = "acme-finance-${var.env}"

  agent_instruction = <<-EOT
    You are a senior finance data analyst for ACME Finance. Your job is to answer questions
    about revenue, expenses, P&L, accounts receivable, ARR, and financial forecasts.

    TOOL SELECTION GUIDE:
    - Ad-hoc data questions → use QueryFinanceData (execute_sql / describe_schema)
    - Revenue or expense projections → use ForecastMetrics (forecast_revenue / forecast_expense)
    - Actual vs. budget gaps → use VarianceRCA (variance_rca)
    - "What if we change X by Y%?" → use WhatIfSimulation (whatif_sim)
    - Definition of a KPI or metric → use MetricGlossary (describe_metric / list_metrics)
    - "Any anomalies?", "financial health check", "anything unusual?" → use AnomalyDetection (scan_anomalies)

    QUERY RULES (QueryFinanceData):
    - Always call describe_schema first if unsure about columns.
    - Always qualify: analytics_dev_marts.<table_name>
    - Only SELECT statements allowed. Never modify data.
    - Fiscal year ends Jan 31. FY2024 = Feb 2023–Jan 2024.
    - Quarters: Q1=Feb-Apr, Q2=May-Jul, Q3=Aug-Oct, Q4=Nov-Jan.
    - period_yyyymm is BIGINT (e.g. 202302). Entities: US, EMEA, APAC.
    - Percentages stored as 0-1; multiply by 100 for display.
    - Cap to 20 rows unless user requests more. Retry once on SQL error.

    KEY TABLES (analytics_dev_marts):
    - mart_pl, fct_revenue, fct_expense, fct_gl_entries, fct_arr, mart_ar_aging
    - dim_entity, dim_account, dim_cost_center, dim_customer, dim_date

    RESPONSE FORMAT — Executive Style (mandatory):
    1. **Table first** — always lead with a compact markdown table showing the key numbers.
       Monetary values in $M (1dp). Percentages to 1dp. No raw decimals.
    2. **One-line takeaway** — immediately after the table, one bold sentence summarising
       the "so what" (e.g. "**Gross margin improved 210 bps YoY, driven by EMEA cost efficiencies.**")
    3. **Details (if needed)** — only add 2-3 sentences of context when the user's question
       warrants explanation. Keep it brief. No filler, no restating the table in prose.
    4. **Drill-down prompt** — end with a short suggestion: "Want to break this down by entity?"
       or "I can show the quarterly trend — want me to?"
    Keep responses under 200 words total. Finance executives scan, they don't read essays.
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
    Phase = "6-8"
    Env   = var.env
  }
}

# ── Phase 8 Lambdas ───────────────────────────────────────────────────────────

locals {
  phase8_lambdas = {
    forecast        = { dir = "forecast",        timeout = 120, phase = "8" }
    variance_rca    = { dir = "variance_rca",     timeout = 120, phase = "8" }
    describe_metric = { dir = "describe_metric",  timeout = 30,  phase = "8" }
    whatif_sim      = { dir = "whatif_sim",       timeout = 120, phase = "8" }
    anomaly_detect  = { dir = "anomaly_detect",   timeout = 120, phase = "9" }
  }
}

data "archive_file" "phase8" {
  for_each    = local.phase8_lambdas
  type        = "zip"
  source_dir  = "${path.root}/../../../agent/lambdas/${each.value.dir}"
  output_path = "${path.module}/.build/${each.key}.zip"
  excludes    = ["requirements.txt", "__pycache__", "*.pyc"]
}

resource "aws_lambda_function" "forecast" {
  function_name    = "${local.name_prefix}-forecast"
  role             = aws_iam_role.lambda_exec.arn
  handler          = "handler.lambda_handler"
  runtime          = "python3.12"
  timeout          = 120
  filename         = data.archive_file.phase8["forecast"].output_path
  source_code_hash = data.archive_file.phase8["forecast"].output_base64sha256
  environment { variables = { ENV = var.env } }
  tags = { Phase = "8", Env = var.env }
}

resource "aws_lambda_function" "variance_rca" {
  function_name    = "${local.name_prefix}-variance-rca"
  role             = aws_iam_role.lambda_exec.arn
  handler          = "handler.lambda_handler"
  runtime          = "python3.12"
  timeout          = 120
  filename         = data.archive_file.phase8["variance_rca"].output_path
  source_code_hash = data.archive_file.phase8["variance_rca"].output_base64sha256
  environment { variables = { ENV = var.env } }
  tags = { Phase = "8", Env = var.env }
}

resource "aws_lambda_function" "describe_metric" {
  function_name    = "${local.name_prefix}-describe-metric"
  role             = aws_iam_role.lambda_exec.arn
  handler          = "handler.lambda_handler"
  runtime          = "python3.12"
  timeout          = 30
  filename         = data.archive_file.phase8["describe_metric"].output_path
  source_code_hash = data.archive_file.phase8["describe_metric"].output_base64sha256
  environment { variables = { ENV = var.env } }
  tags = { Phase = "8", Env = var.env }
}

resource "aws_lambda_function" "whatif_sim" {
  function_name    = "${local.name_prefix}-whatif-sim"
  role             = aws_iam_role.lambda_exec.arn
  handler          = "handler.lambda_handler"
  runtime          = "python3.12"
  timeout          = 120
  filename         = data.archive_file.phase8["whatif_sim"].output_path
  source_code_hash = data.archive_file.phase8["whatif_sim"].output_base64sha256
  environment { variables = { ENV = var.env } }
  tags = { Phase = "8", Env = var.env }
}

resource "aws_lambda_function" "anomaly_detect" {
  function_name    = "${local.name_prefix}-anomaly-detect"
  role             = aws_iam_role.lambda_exec.arn
  handler          = "handler.lambda_handler"
  runtime          = "python3.12"
  timeout          = 120
  filename         = data.archive_file.phase8["anomaly_detect"].output_path
  source_code_hash = data.archive_file.phase8["anomaly_detect"].output_base64sha256
  environment { variables = { ENV = var.env } }
  tags = { Phase = "9", Env = var.env }
}

resource "aws_lambda_permission" "bedrock_invoke" {
  statement_id  = "AllowBedrockAgentInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.text_to_sql.function_name
  principal     = "bedrock.amazonaws.com"
  source_arn    = aws_bedrockagent_agent.finance.agent_arn
}

resource "aws_lambda_permission" "bedrock_invoke_phase8" {
  for_each = {
    forecast        = aws_lambda_function.forecast.function_name
    variance_rca    = aws_lambda_function.variance_rca.function_name
    describe_metric = aws_lambda_function.describe_metric.function_name
    whatif_sim      = aws_lambda_function.whatif_sim.function_name
    anomaly_detect  = aws_lambda_function.anomaly_detect.function_name
  }

  statement_id  = "AllowBedrockAgentInvoke"
  action        = "lambda:InvokeFunction"
  function_name = each.value
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
      Action = ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"]
      # Cross-region inference profiles (us.*) require both the foundation-model
      # and inference-profile ARN patterns; wildcard covers both cleanly.
      Resource = "*"
    }]
  })
}

resource "aws_iam_role_policy" "bedrock_agent_lambda" {
  name = "invoke-action-lambdas"
  role = aws_iam_role.bedrock_agent.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = ["lambda:InvokeFunction"]
      Resource = [
        aws_lambda_function.text_to_sql.arn,
        aws_lambda_function.forecast.arn,
        aws_lambda_function.variance_rca.arn,
        aws_lambda_function.describe_metric.arn,
        aws_lambda_function.whatif_sim.arn,
        aws_lambda_function.anomaly_detect.arn,
      ]
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

# ── Action Group: ForecastMetrics ────────────────────────────────────────────

resource "aws_bedrockagent_agent_action_group" "forecast_metrics" {
  agent_id          = aws_bedrockagent_agent.finance.agent_id
  agent_version     = "DRAFT"
  action_group_name = "ForecastMetrics"
  description       = "Generate 4-quarter revenue and expense projections using linear trend and seasonality"

  action_group_executor {
    lambda = aws_lambda_function.forecast.arn
  }

  function_schema {
    member_functions {
      functions {
        name        = "forecast_revenue"
        description = "Project revenue for the next N quarters using historical trend and seasonal patterns"
        parameters {
          map_block_key = "entity_id"
          type          = "string"
          description   = "Optional entity filter: US, EMEA, or APAC. Omit for all entities."
          required      = false
        }
        parameters {
          map_block_key = "periods_ahead"
          type          = "integer"
          description   = "Number of monthly periods to forecast (default 4)."
          required      = false
        }
      }

      functions {
        name        = "forecast_expense"
        description = "Project total expenses for the next N quarters using historical trend and seasonal patterns"
        parameters {
          map_block_key = "entity_id"
          type          = "string"
          description   = "Optional entity filter: US, EMEA, or APAC. Omit for all entities."
          required      = false
        }
        parameters {
          map_block_key = "periods_ahead"
          type          = "integer"
          description   = "Number of monthly periods to forecast (default 4)."
          required      = false
        }
      }
    }
  }

  depends_on = [aws_bedrockagent_agent.finance]
}

# ── Action Group: VarianceRCA ─────────────────────────────────────────────────

resource "aws_bedrockagent_agent_action_group" "variance_rca" {
  agent_id          = aws_bedrockagent_agent.finance.agent_id
  agent_version     = "DRAFT"
  action_group_name = "VarianceRCA"
  description       = "Compare actuals vs budget and identify top variance drivers by account"

  action_group_executor {
    lambda = aws_lambda_function.variance_rca.arn
  }

  function_schema {
    member_functions {
      functions {
        name        = "variance_rca"
        description = "Return the top N accounts driving the gap between actuals and budget, sorted by absolute variance descending"
        parameters {
          map_block_key = "fiscal_year"
          type          = "integer"
          description   = "Fiscal year (ACME FY ends Jan 31 — FY2024 = Feb 2023 to Jan 2024)."
          required      = true
        }
        parameters {
          map_block_key = "fiscal_quarter"
          type          = "integer"
          description   = "Optional fiscal quarter (1–4). Q1=Feb-Apr, Q2=May-Jul, Q3=Aug-Oct, Q4=Nov-Jan."
          required      = false
        }
        parameters {
          map_block_key = "entity_id"
          type          = "string"
          description   = "Optional entity filter: US, EMEA, or APAC."
          required      = false
        }
        parameters {
          map_block_key = "top_n"
          type          = "integer"
          description   = "Number of top variance drivers to return (default 10, max 50)."
          required      = false
        }
      }
    }
  }

  depends_on = [aws_bedrockagent_agent.finance]
}

# ── Action Group: MetricGlossary ──────────────────────────────────────────────

resource "aws_bedrockagent_agent_action_group" "metric_glossary" {
  agent_id          = aws_bedrockagent_agent.finance.agent_id
  agent_version     = "DRAFT"
  action_group_name = "MetricGlossary"
  description       = "Look up definitions, formulas, and business context for finance KPIs and metrics"

  action_group_executor {
    lambda = aws_lambda_function.describe_metric.arn
  }

  function_schema {
    member_functions {
      functions {
        name        = "describe_metric"
        description = "Return the definition, formula, and business context for a named metric or KPI (e.g. ARR, NRR, gross_margin, DSO)"
        parameters {
          map_block_key = "metric_name"
          type          = "string"
          description   = "Name or alias of the metric to look up (e.g. 'NRR', 'net retention rate', 'DSO', 'gross margin')."
          required      = true
        }
      }

      functions {
        name        = "list_metrics"
        description = "Return a list of all metrics available in the glossary with short descriptions"
      }
    }
  }

  depends_on = [aws_bedrockagent_agent.finance]
}

# ── Action Group: WhatIfSimulation ────────────────────────────────────────────

resource "aws_bedrockagent_agent_action_group" "whatif_simulation" {
  agent_id          = aws_bedrockagent_agent.finance.agent_id
  agent_version     = "DRAFT"
  action_group_name = "WhatIfSimulation"
  description       = "Run hypothetical P&L scenarios — apply a percentage change to any cost or revenue line and see downstream impact"

  action_group_executor {
    lambda = aws_lambda_function.whatif_sim.arn
  }

  function_schema {
    member_functions {
      functions {
        name        = "whatif_sim"
        description = "Apply a hypothetical % change to a P&L line item and return the impact on gross profit, operating income, and margins"
        parameters {
          map_block_key = "line_item"
          type          = "string"
          description   = "The P&L line to adjust. Valid values: revenue, cogs, sales_marketing, research_dev, general_admin, opex, operating_income."
          required      = true
        }
        parameters {
          map_block_key = "pct_change"
          type          = "number"
          description   = "Percentage change to apply (e.g. -15 for a 15% cut, 10 for a 10% increase)."
          required      = true
        }
        parameters {
          map_block_key = "fiscal_year"
          type          = "integer"
          description   = "Fiscal year to use as baseline (default 2024)."
          required      = false
        }
        parameters {
          map_block_key = "entity_id"
          type          = "string"
          description   = "Optional entity filter: US, EMEA, or APAC. Omit for consolidated view."
          required      = false
        }
      }
    }
  }

  depends_on = [aws_bedrockagent_agent.finance]
}

# ── Action Group: AnomalyDetection ───────────────────────────────────────────

resource "aws_bedrockagent_agent_action_group" "anomaly_detection" {
  agent_id          = aws_bedrockagent_agent.finance.agent_id
  agent_version     = "DRAFT"
  action_group_name = "AnomalyDetection"
  description       = "Scan financial data for anomalies: aged AR, expense spikes, disposal losses, and forecast variances"

  action_group_executor {
    lambda = aws_lambda_function.anomaly_detect.arn
  }

  function_schema {
    member_functions {
      functions {
        name        = "scan_anomalies"
        description = "Run automated anomaly detectors across AR aging, GL expenses, and actuals-vs-plan variance. Returns a ranked list of findings with severity (high/medium/low), amounts, and descriptions."
        parameters {
          map_block_key = "fiscal_year"
          type          = "integer"
          description   = "Fiscal year to scan (ACME FY ends Jan 31 — FY2024 = Feb 2023 to Jan 2024)."
          required      = true
        }
        parameters {
          map_block_key = "period_yyyymm"
          type          = "string"
          description   = "Optional 6-digit period filter (e.g. '202409'). Narrows expense-spike and variance detectors to that month."
          required      = false
        }
        parameters {
          map_block_key = "entity_id"
          type          = "string"
          description   = "Optional entity filter: US, EMEA, or APAC. Omit to scan all entities."
          required      = false
        }
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

  depends_on = [
    aws_bedrockagent_agent_action_group.query_finance,
    aws_bedrockagent_agent_action_group.forecast_metrics,
    aws_bedrockagent_agent_action_group.variance_rca,
    aws_bedrockagent_agent_action_group.metric_glossary,
    aws_bedrockagent_agent_action_group.whatif_simulation,
    aws_bedrockagent_agent_action_group.anomaly_detection,
  ]
}

# ─────────────────────────────────────────────────────────────────────────────
# Phase 8: AgentCore Gateway + Memory
# Requires AWS provider >= 5.90 (AgentCore GA, October 2025)
# ─────────────────────────────────────────────────────────────────────────────

# ── IAM: AgentCore Gateway execution role ────────────────────────────────────

resource "aws_iam_role" "gateway" {
  name = "${local.name_prefix}-agentcore-gateway"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "bedrock-agentcore.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = { Phase = "8" }
}

resource "aws_iam_role_policy" "gateway_invoke_lambdas" {
  name = "invoke-tool-lambdas"
  role = aws_iam_role.gateway.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = ["lambda:InvokeFunction"]
      Resource = [
        aws_lambda_function.text_to_sql.arn,
        aws_lambda_function.forecast.arn,
        aws_lambda_function.variance_rca.arn,
        aws_lambda_function.describe_metric.arn,
        aws_lambda_function.whatif_sim.arn,
      ]
    }]
  })
}

# ── AgentCore Gateway + Memory (deployed via AWS CLI; not in Terraform provider v5.x) ──
#
# Resources already provisioned (2026-05-08) via aws bedrock-agentcore-control CLI.
# The Terraform AWS provider (hashicorp/aws ~> 5.x) does not yet include
# aws_bedrockagentcore_gateway / aws_bedrockagentcore_memory resource types.
# ARNs are pinned here as locals so IAM policies and outputs reference them correctly.
#
# Gateway:  acme-finance-dev-finance-tools-rrlhpdtveg  (READY)
# Targets:  text-to-sql, forecast, variance-rca, describe-metric, whatif-sim (all READY)
# Memory:   acme_finance_dev_memory-F0GIOl5mcE          (ACTIVE)

locals {
  gateway_targets = {
    text_to_sql     = aws_lambda_function.text_to_sql.arn
    forecast        = aws_lambda_function.forecast.arn
    variance_rca    = aws_lambda_function.variance_rca.arn
    describe_metric = aws_lambda_function.describe_metric.arn
    whatif_sim      = aws_lambda_function.whatif_sim.arn
    anomaly_detect  = aws_lambda_function.anomaly_detect.arn
  }

  # Pinned ARNs for already-deployed AgentCore resources
  agentcore_gateway_id  = "acme-finance-dev-finance-tools-rrlhpdtveg"
  agentcore_gateway_arn = "arn:aws:bedrock-agentcore:us-east-1:010928194453:gateway/acme-finance-dev-finance-tools-rrlhpdtveg"
  agentcore_memory_arn  = "arn:aws:bedrock-agentcore:us-east-1:010928194453:memory/acme_finance_dev_memory-F0GIOl5mcE"
}

# Allow Gateway to invoke each Lambda (resource-based policy on each Lambda)
resource "aws_lambda_permission" "gateway_invoke" {
  for_each      = local.gateway_targets
  statement_id  = "AllowAgentCoreGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = each.value
  principal     = "bedrock-agentcore.amazonaws.com"
  source_arn    = local.agentcore_gateway_arn
}

# Bedrock Agent role: permission to invoke tools via Gateway
resource "aws_iam_role_policy" "bedrock_agent_gateway" {
  name = "invoke-agentcore-gateway"
  role = aws_iam_role.bedrock_agent.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["bedrock-agentcore:InvokeTool"]
      Resource = [local.agentcore_gateway_arn]
    }]
  })
}

# Bedrock Agent role: read/write AgentCore Memory
resource "aws_iam_role_policy" "bedrock_agent_memory" {
  name = "agentcore-memory-access"
  role = aws_iam_role.bedrock_agent.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "bedrock-agentcore:GetMemory",
        "bedrock-agentcore:PutMemoryRecord",
        "bedrock-agentcore:ListMemoryRecords",
        "bedrock-agentcore:DeleteMemoryRecord",
      ]
      Resource = [local.agentcore_memory_arn]
    }]
  })
}
