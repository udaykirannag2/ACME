# Phase 6: Bedrock Agent — NLP-to-SQL Finance Analyst

**Status:** ✅ Complete  
**Delivered:** 2026-05-06  
**Depends on:** Phase 5 (dbt marts live in Redshift)

---

## Overview

Phase 6 deploys an **AI finance analyst** that answers natural-language questions by querying the dbt mart layer in Redshift Serverless. A user asks *"What was EMEA operating margin in FY2024?"* and the agent translates it into SQL, executes it against `analytics_dev_marts`, and returns a formatted answer with business context.

```
User (natural language)
        │
        ▼
  Bedrock Agent
  (Claude Sonnet 4.6 — us.anthropic.claude-sonnet-4-6-20250514)
  ┌──────────────────────────────────────────────────────────────┐
  │  System prompt: fiscal calendar, table schemas, query rules  │
  │  1. Reasons about which tables to use                       │
  │  2. Optionally calls describe_schema() to confirm columns   │
  │  3. Writes a SELECT statement                               │
  │  4. Calls action group → text_to_sql Lambda                 │
  │  5. Receives results as JSON                                │
  │  6. Synthesizes answer in plain English with tables          │
  └──────────────────────────────────────────────────────────────┘
        │ action group call
        ▼
  Lambda: text_to_sql (Python 3.12, 90s timeout)
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
| Agent name | `acme-finance-dev-finance-analyst` |
| Agent ID | `LUUHZWRDA4` |
| Foundation model | `us.anthropic.claude-sonnet-4-6-20250514` (cross-region inference) |
| Session TTL | 900 seconds (15 minutes) |
| Agent alias (Terraform) | `live` (auto-snapshots DRAFT on create) |
| Agent alias (production) | `WBNSSBJA88` (manually created via CLI, points to latest version) |

The agent uses Claude as both the reasoning engine and the SQL writer. It receives the user question, decides which tables to query, writes SQL, calls the Lambda, and synthesizes the final answer.

**Agent instruction** is embedded directly in the Terraform resource. Key sections:
- Tool selection guide (which action group to call for each question type)
- Query rules (schema prefix, fiscal calendar, percentage format, row limits)
- Key table list (mart_pl, fct_revenue, fct_expense, fct_gl_entries, fct_arr, mart_ar_aging, dimensions)
- Presentation rules (markdown tables, business significance, drill-down offers)

**Why no vector Knowledge Base in Phase 6?**  
OpenSearch Serverless (the KB storage backend) costs ~$700/month minimum (2 OCUs). For Phase 6, table schemas are embedded directly in the agent instruction — sufficient for structured query tasks. The Knowledge Base (`acme-finance-dev-finance-kb`) was provisioned with an S3 data source for future unstructured document retrieval (contracts, footnotes) but is not actively used.

### 2. Action Group: `QueryFinanceData`

Two functions the agent can call:

| Function | Purpose | Parameters |
|----------|---------|------------|
| `execute_sql(sql_query)` | Execute a read-only SELECT against Redshift, return up to 100 rows | `sql_query` (string, required) |
| `describe_schema()` | Return full table/column catalog so Claude can write correct SQL | None |

The agent decides autonomously when to call `describe_schema` (when uncertain about column names) vs. going straight to `execute_sql`.

### 3. Lambda: `text_to_sql`

**File:** `agent/lambdas/text_to_sql/handler.py`  
**Runtime:** Python 3.12  
**Timeout:** 90 seconds (Redshift async poll)  
**Function name:** `acme-finance-dev-text-to-sql`

**Flow:**
1. Receive Bedrock event `{actionGroup, function, parameters}`
2. If `describe_schema` → return hardcoded `SCHEMA_DEFINITION` dict (table names, columns, types, fiscal calendar)
3. If `execute_sql`:
   a. Call `redshift-data:ExecuteStatement` (async — returns immediately with statement ID)
   b. Poll `DescribeStatement` every 1s until `FINISHED` or `FAILED` (max 60 polls)
   c. Call `GetStatementResult` with pagination
   d. Return `{columns, rows, row_count, truncated}` as JSON

**Schema definition** includes all 11 tables in `analytics_dev_marts` with column-level descriptions. This serves as the agent's "describe_schema" response — a static catalog that avoids a round-trip to `INFORMATION_SCHEMA`.

**Safety:** Lambda IAM policy only allows `redshift-data:Execute*`, `DescribeStatement`, and `GetStatementResult` — no DDL possible from the agent path.

### 4. Agent Alias

Named `live` in Terraform. Aliases decouple API callers from agent versions. The Phase 7+ UI and API call `agentId + agentAliasId` — if we update the agent instruction, we create a new alias version without changing the caller code.

**Important:** The Terraform `aws_bedrockagent_agent_alias` resource creates a snapshot of the DRAFT version on creation. If you update the agent instruction (DRAFT), the alias still points to the old snapshot until you `taint` the alias or create a new one. The production alias `WBNSSBJA88` was created via AWS CLI to snapshot the DRAFT after updating the model to Claude Sonnet 4.6.

---

## IAM Design

```
Bedrock Agent Role (AmazonBedrockExecutionRoleForAgents_acme-finance-dev)
  ├── bedrock:InvokeModel           →  Foundation model ARN (wildcard for cross-region)
  ├── bedrock:InvokeModelWithResponseStream  →  Same
  └── lambda:InvokeFunction         →  text_to_sql Lambda ARN
                                         + forecast, variance_rca, describe_metric,
                                           whatif_sim, anomaly_detect (added in Phase 8–9)

Lambda Execution Role (acme-finance-dev-text-to-sql-lambda)
  ├── AWSLambdaBasicExecutionRole   (CloudWatch Logs — managed policy)
  ├── redshift-data:ExecuteStatement    →  acme-finance-dev workgroup ARN
  ├── redshift-serverless:GetCredentials →  acme-finance-dev workgroup ARN
  ├── redshift-data:DescribeStatement   →  * (statement IDs aren't ARNs)
  ├── redshift-data:GetStatementResult  →  *
  └── redshift-data:ListStatements      →  *
```

`DescribeStatement` and `GetStatementResult` must be `Resource: *` because the resource identifier is a UUID statement ID, not a workgroup ARN.

**Note on IAM action name:** The correct action for invoking the agent from the FastAPI application is `bedrock:InvokeAgent` (NOT `bedrock-agent-runtime:InvokeAgent`). The `bedrock-agent-runtime` prefix is used in the SDK service client name but the IAM action belongs to the `bedrock` namespace.

---

## Deployed Resources

| Resource | Terraform Reference | Cost |
|----------|---------------------|------|
| Bedrock Agent | `aws_bedrockagent_agent.finance` | Pay-per-token |
| Agent Alias | `aws_bedrockagent_agent_alias.live` | Free |
| Action Group | `aws_bedrockagent_agent_action_group.query_finance` | Free |
| Lambda (text_to_sql) | `aws_lambda_function.text_to_sql` | ~$0 at dev volume |
| Knowledge Base | `aws_bedrockagent_knowledge_base.finance` | Free (no OSS backing) |
| IAM Roles (×2) | Agent role + Lambda role | Free |

**Bedrock pricing (Claude Sonnet 4.6):** ~$3 / 1M input tokens, ~$15 / 1M output tokens. A typical finance question is ~2K tokens in, ~500 out ≈ $0.01 per query.

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
| `fct_revenue` | entity / segment / period | revenue_amount, journal_count |
| `fct_expense` | entity / cost_center / account / period | expense_amount, line_count |
| `fct_gl_entries` | journal line | debit_amount, credit_amount, net_amount |
| `fct_arr` | ARR movement event | arr_change, movement_type (new/expansion/contraction/churn) |
| `mart_ar_aging` | open invoice | amount, days_overdue, aging_bucket (0-30/31-60/61-90/90+) |
| `dim_entity` | entity | entity_id (US/EMEA/APAC) |
| `dim_account` | account | account_type, pnl_rollup, is_revenue, is_expense |
| `dim_cost_center` | cost center | function, entity_id |
| `dim_customer` | customer | segment_tier, region, billing_country |
| `dim_date` | calendar day | fiscal_year, fiscal_quarter, period_yyyymm |

---

## Example Questions the Agent Can Answer

| Question | Action Group | Tables Used |
|----------|-------------|-------------|
| What was total revenue in FY2024? | QueryFinanceData | mart_pl |
| Break down OpEx by cost center for EMEA in Q3 FY2024 | QueryFinanceData | fct_expense |
| Which customers have invoices 60+ days overdue? | QueryFinanceData | mart_ar_aging, dim_customer |
| What was our net ARR change in Q2 FY2025? | QueryFinanceData | fct_arr |
| Show me gross margin trend by quarter for FY2024 | QueryFinanceData | mart_pl |
| What is the top 5 revenue-generating segment? | QueryFinanceData | fct_revenue |

---

## Deployment

```bash
cd infra/envs/dev
terraform init
terraform plan -out=phase6.tfplan
terraform apply phase6.tfplan
```

After apply, note the outputs:
```
bedrock_agent_id       = "LUUHZWRDA4"
bedrock_agent_alias_id = "<ALIAS_ID>"   # Terraform-managed alias
```

---

## Testing

### AWS Console
1. Open **Amazon Bedrock → Agents → acme-finance-dev-finance-analyst**
2. Click **Test** in the right panel
3. Try: *"Show me the P&L for all entities in FY2024 Q4"*

### AWS CLI
```bash
aws bedrock-agent-runtime invoke-agent \
  --agent-id LUUHZWRDA4 \
  --agent-alias-id WBNSSBJA88 \
  --session-id sess-$(date +%s) \
  --input-text "What was the gross margin for the US entity in FY2024?" \
  --profile acme-admin --region us-east-1
```

### Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| `resourceNotFoundException` on InvokeAgent | Alias points to version using deprecated model | Create new alias via CLI: `aws bedrock-agent create-agent-alias` |
| Redshift query returns empty | Lambda IAM user has no schema grants | `GRANT USAGE ON SCHEMA analytics_dev_marts TO "IAMR:<role-name>"` |
| Agent returns "I don't have access to that table" | Schema not in agent instruction | Update the `agent_instruction` local in Terraform |

---

## Next: Phase 7 — Analytics API & Dashboard
