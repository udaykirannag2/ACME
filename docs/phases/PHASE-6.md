# Phase 6: Bedrock Agent — NLP-to-SQL Finance Analyst

**Status:** 🚧 In Progress  
**Depends on:** Phase 5 (dbt marts live in Redshift)

---

## Overview

Phase 6 deploys an **AI finance analyst** that answers natural-language questions by querying the dbt mart layer in Redshift. A user can ask *"What was EMEA operating margin in FY2024?"* and the agent translates it into SQL, executes it, and returns a formatted answer.

```
User (natural language)
        │
        ▼
  Bedrock Agent
  (Claude 3.5 Sonnet)
  ┌──────────────────────────────────────────────┐
  │  System prompt: role, table schemas, rules    │
  │  1. Reasons about which tables to use        │
  │  2. Writes a SELECT statement                │
  │  3. Calls action group → Lambda              │
  │  4. Receives results                         │
  │  5. Synthesizes answer in plain English      │
  └──────────────────────────────────────────────┘
        │ action group call
        ▼
  Lambda: text_to_sql
  ┌─────────────────────┐
  │ execute_sql(query)  │──→  Redshift Data API  ──→  analytics_dev_marts.*
  │ describe_schema()   │
  └─────────────────────┘
```

---

## Architecture Components

### 1. Bedrock Agent (`aws_bedrockagent_agent`)

| Attribute | Value |
|-----------|-------|
| Foundation model | `us.anthropic.claude-3-5-sonnet-20241022-v2:0` |
| Session TTL | 15 minutes |
| Instruction | Embedded system prompt with fiscal calendar, table schemas, query rules |

The agent uses Claude as both the reasoning engine and the SQL writer. It receives the user question, decides which tables to query, writes SQL, calls the Lambda, and synthesizes the final answer.

**Why no separate Knowledge Base for Phase 6?**  
A vector Knowledge Base (OpenSearch Serverless) costs ~$700/month minimum (2 OCUs). For Phase 6, table schemas are embedded directly in the agent instruction — sufficient for structured query tasks. A Knowledge Base will be added in Phase 7 for unstructured finance documents (contracts, footnotes).

### 2. Action Group: `QueryFinanceData`

Two functions the agent can call:

| Function | Purpose |
|----------|---------|
| `execute_sql(sql_query)` | Execute a SELECT statement, return up to 100 rows |
| `describe_schema()` | Return full table/column catalog so Claude can write correct SQL |

The agent decides autonomously when to call `describe_schema` (when uncertain about column names) vs. going straight to `execute_sql`.

### 3. Lambda: `text_to_sql`

**File:** `agent/lambdas/text_to_sql/handler.py`  
**Runtime:** Python 3.12  
**Timeout:** 90 seconds (Redshift async poll)

Flow:
1. Receive Bedrock event `{actionGroup, function, parameters}`
2. Call `redshift-data:ExecuteStatement` (async)
3. Poll `DescribeStatement` until `FINISHED` or `FAILED`
4. Call `GetStatementResult` with pagination
5. Return `{columns, rows, row_count, truncated}` as JSON

Safety: Lambda IAM policy only allows `redshift-data:Execute*` and `GetStatementResult` — no DDL possible from the agent path.

### 4. Agent Alias (`aws_bedrockagent_agent_alias`)

Named `live`. Aliases decouple API callers from agent versions. The Phase 7 UI and API call `agentId + agentAliasId` — if we update the agent instruction, we bump the alias without changing the caller.

---

## IAM Design

```
Bedrock Agent Role (AmazonBedrockExecutionRoleForAgents_acme-finance-dev)
  ├── bedrock:InvokeModel  →  Claude 3.5 Sonnet FM
  └── lambda:InvokeFunction  →  text_to_sql Lambda

Lambda Execution Role (acme-finance-dev-text-to-sql-lambda)
  ├── AWSLambdaBasicExecutionRole  (CloudWatch Logs)
  ├── redshift-data:ExecuteStatement  →  acme-finance-dev workgroup
  ├── redshift-data:DescribeStatement  →  *
  └── redshift-data:GetStatementResult  →  *
```

`DescribeStatement` and `GetStatementResult` must be `Resource: *` because the resource is the statement ID (UUID), not a workgroup ARN.

---

## Deployed Resources

| Resource | Terraform | Cost |
|----------|-----------|------|
| Bedrock Agent | `aws_bedrockagent_agent` | Pay-per-token |
| Agent Alias | `aws_bedrockagent_agent_alias` | Free |
| Action Group | `aws_bedrockagent_agent_action_group` | Free |
| Lambda (text_to_sql) | `aws_lambda_function` | ~$0 at dev volume |
| IAM Roles (×2) | `aws_iam_role` | Free |

**Bedrock pricing:** Claude 3.5 Sonnet = $3 / 1M input tokens, $15 / 1M output tokens. A typical finance question is ~2K tokens in, ~500 out ≈ $0.01 per query.

---

## Fiscal Calendar Reference

| FY | Calendar Range | Q1 | Q2 | Q3 | Q4 |
|----|---------------|----|----|----|----|
| FY2023 | Feb 2022 – Jan 2023 | Feb–Apr 2022 | May–Jul 2022 | Aug–Oct 2022 | Nov 2022–Jan 2023 |
| FY2024 | Feb 2023 – Jan 2024 | Feb–Apr 2023 | May–Jul 2023 | Aug–Oct 2023 | Nov 2023–Jan 2024 |
| FY2025 | Feb 2024 – Jan 2025 | Feb–Apr 2024 | May–Jul 2024 | Aug–Oct 2024 | Nov 2024–Jan 2025 |

`period_yyyymm` is stored as `BIGINT` (e.g. `202302` = Feb 2023 = FY2024 Q1).

---

## Available Tables (analytics_dev_marts)

| Table | Grain | Key Metrics |
|-------|-------|-------------|
| `mart_pl` | entity / fiscal period | total_revenue, cogs, gross_profit, gross_margin_pct, operating_income, operating_margin_pct |
| `fct_revenue` | entity / segment / period | revenue_amount |
| `fct_expense` | entity / cost_center / account / period | expense_amount |
| `fct_gl_entries` | journal line | debit_amount, credit_amount, net_amount |
| `fct_arr` | ARR movement event | arr_change, movement_type (new/expansion/contraction/churn) |
| `mart_ar_aging` | open invoice | amount, days_overdue, aging_bucket (0-30/31-60/61-90/90+) |
| `dim_entity` | entity | entity_id (US/EMEA/APAC) |
| `dim_account` | account | account_type, pnl_rollup, is_revenue, is_expense |
| `dim_cost_center` | cost center | function, entity_id |
| `dim_customer` | customer | segment_tier, region, billing_country |
| `dim_date` | calendar day | fiscal_year, fiscal_quarter, period_yyyymm |

---

## Deployment

```bash
cd infra/envs/dev

# Initialize (picks up new bedrock module)
terraform init

# Preview changes
terraform plan -out=phase6.tfplan

# Apply
terraform apply phase6.tfplan
```

After apply, note the outputs:
```
bedrock_agent_id       = "XXXXXXXXXX"
bedrock_agent_alias_id = "YYYYYYYYYY"
```

---

## Testing the Agent

### AWS Console
1. Open **Amazon Bedrock → Agents → acme-finance-dev-finance-analyst**
2. Click **Test** in the right panel
3. Try: *"Show me the P&L for all entities in FY2024 Q4"*

### AWS CLI
```bash
aws bedrock-agent-runtime invoke-agent \
  --agent-id <AGENT_ID> \
  --agent-alias-id <ALIAS_ID> \
  --session-id sess-$(date +%s) \
  --input-text "What was the gross margin for the US entity in FY2024?" \
  --profile acme-admin --region us-east-1 \
  --output json | jq -r '.completion'
```

### Example Questions the Agent Can Answer

| Question | Tables Used |
|----------|-------------|
| What was total revenue in FY2024? | mart_pl |
| Break down OpEx by cost center for EMEA in Q3 FY2024 | fct_expense |
| Which customers have invoices 60+ days overdue? | mart_ar_aging, dim_customer |
| What was our net ARR change in Q2 FY2025? | fct_arr |
| Show me gross margin trend by quarter for FY2024 | mart_pl |
| What is the top 5 revenue-generating segment? | fct_revenue |

---

## Next: Phase 7 — Analytics API & UI

Phase 7 wraps the Bedrock Agent in a FastAPI layer and adds a Streamlit dashboard with pre-built finance charts (P&L waterfall, ARR bridge, AR aging heatmap).
