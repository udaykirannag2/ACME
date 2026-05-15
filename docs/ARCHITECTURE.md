# ACME Finance — Level 300 Architecture

**Status:** Phases 0–10 Complete | Authentication Deferred  
**Last Updated:** 2026-05-14  
**AWS Account:** 010928194453 | **Region:** us-east-1

This is the canonical architecture reference for ACME Finance — an end-to-end AI-driven finance analytics platform built on AWS. It covers every deployed component, data flow, security boundary, and deployment mechanism.

---

## Table of Contents

- [System Architecture](#system-architecture)
- [Component Deep Dives](#component-deep-dives)
  - [Presentation Layer](#1-presentation-layer)
  - [API Layer](#2-api-layer-fastapi-on-lambda)
  - [AI Agent Layer](#3-ai-agent-layer-bedrock--agentcore)
  - [Data Warehouse](#4-data-warehouse-redshift-serverless--dbt)
  - [Data Ingestion Pipeline](#5-data-ingestion-pipeline)
  - [Source Systems](#6-source-systems)
  - [Authentication & RBAC](#7-authentication--rbac-deferred)
- [Network Architecture](#network-architecture)
- [IAM & Security Model](#iam--security-model)
- [Deployment Pipeline](#deployment-pipeline)
- [Data Flow Diagrams](#data-flow-diagrams)
- [Terraform Module Map](#terraform-module-map)
- [Cost Analysis](#cost-analysis)
- [Key Decisions & Trade-offs](#key-decisions--trade-offs)
- [Troubleshooting Reference](#troubleshooting-reference)

---

## System Architecture

```
                              ┌─────────────────────────────────────────────┐
                              │            CloudFront (CDN)                 │
                              │  d12q69tjm17cex.cloudfront.net              │
                              │  PriceClass_100 (US + EU)                   │
                              ├──────────────┬──────────────────────────────┤
                              │  Default /*   │  /api/*                     │
                              │  S3 Origin    │  Lambda Origin              │
                              │  (OAC+sigv4)  │  (strip /api prefix)        │
                              └──────┬───────┴───────────┬──────────────────┘
                                     │                   │
                          ┌──────────▼──────────┐  ┌─────▼──────────────────────────┐
                          │  S3 Frontend Bucket  │  │  Lambda Function URL           │
                          │  React SPA (Vite)    │  │  RESPONSE_STREAM mode          │
                          │  acme-finance-dev-   │  │  AuthType=NONE                 │
                          │  frontend-01092...   │  │  l6s6l56d55zun6eehr4ooai2la..  │
                          └─────────────────────┘  └─────────┬──────────────────────┘
                                                             │
                                                   ┌─────────▼──────────────────────┐
                                                   │  Lambda Container (512MB/60s)   │
                                                   │  acme-finance-dev-api           │
                                                   │  ┌───────────────────────────┐  │
                                                   │  │ Lambda Web Adapter (LWA)  │  │
                                                   │  │ Intercepts invocations →  │  │
                                                   │  │ HTTP to uvicorn :8000     │  │
                                                   │  └───────────┬───────────────┘  │
                                                   │  ┌───────────▼───────────────┐  │
                                                   │  │ FastAPI + uvicorn         │  │
                                                   │  │ /health, /metrics/*       │  │
                                                   │  │ /chat, /chat/stream       │  │
                                                   │  │ /commentary, /boardpack   │  │
                                                   │  │ /metrics/forecast         │  │
                                                   │  │ /metrics/anomalies        │  │
                                                   │  └─────┬──────┬──────┬──────┘  │
                                                   └────────┼──────┼──────┼─────────┘
                                                            │      │      │
                         ┌──────────────────────────────────┘      │      └──────────────┐
                         ▼                                         ▼                      ▼
              ┌─────────────────────┐                ┌──────────────────────┐  ┌──────────────────┐
              │  Redshift Serverless │                │  Bedrock Agent       │  │  AgentCore Memory │
              │  Workgroup:          │                │  LUUHZWRDA4          │  │  acme_finance_dev │
              │  acme-finance-dev    │                │  Alias: WBNSSBJA88   │  │  _memory-F0GIOl.. │
              │  Database: dev       │                │  Claude Sonnet 4.6   │  │  Semantic recall  │
              │  Schema:             │                │  6 Action Groups     │  │  cross-session    │
              │  analytics_dev_marts │                └──────────────────────┘  └──────────────────┘
              └─────────────────────┘
```

---

## Component Deep Dives

### 1. Presentation Layer

#### React SPA (ui-react/)

| Attribute | Value |
|-----------|-------|
| Framework | React 18 + TypeScript + Vite |
| Routing | React Router v6 (client-side) |
| Charts | Recharts |
| S3 bucket | `acme-finance-dev-frontend-010928194453` |
| CDN | CloudFront `d12q69tjm17cex.cloudfront.net` |

**Pages:** P&L (`/pl`), ARR Bridge (`/arr`), AR Aging (`/ar-aging`), AI Chat (`/chat`), Commentary (`/commentary`), Board Pack (`/board-pack`), Forecast (`/forecast`), Anomalies (`/anomalies`)

**API Client (`src/api/client.ts`):**
- `VITE_API_URL` is injected at build time — resolves relative paths (`/api`) against `window.location.origin`
- Falls back to `http://localhost:8000` for local dev
- Auth header injection via dynamic import of `aws-amplify/auth` (tree-shaken when Cognito not configured)

**CloudFront behaviors:**
- `/*` → S3 origin (OAC + sigv4), 86400s default TTL for hashed Vite assets
- `/index.html` → S3 origin, TTL=0 (instant deploys)
- `/api/*` → Lambda origin, no cache, strips `/api` prefix via CloudFront Function
- 403/404 → 200 + `/index.html` (SPA routing via `custom_error_response`)

#### Streamlit Dashboard (ui/app.py)

Legacy/development dashboard. Tabs: P&L, ARR, AR Aging, AI Analyst, Commentary, Board Pack. Calls the same FastAPI backend on localhost:8000.

---

### 2. API Layer (FastAPI on Lambda)

#### Container Architecture

```
┌──────────────────────────────────────────────────────┐
│  ECR: acme-finance-dev-api                           │
│  Base: public.ecr.aws/docker/library/python:3.12-slim│
│                                                      │
│  /opt/extensions/lambda-adapter (LWA 0.9.1)          │
│  │   Intercepts Lambda invocations                   │
│  │   Forwards HTTP to uvicorn on port 8000           │
│  │   Supports RESPONSE_STREAM for SSE                │
│  │                                                   │
│  └─► uvicorn → FastAPI app (ui.api.main:app)         │
│       ├── /health              GET   (no auth)       │
│       ├── /metrics/pl          GET   (viewer+)       │
│       ├── /metrics/arr         GET   (viewer+)       │
│       ├── /metrics/ar_aging    GET   (viewer+)       │
│       ├── /metrics/revenue     GET   (viewer+)       │
│       ├── /metrics/forecast    GET   (viewer+)       │
│       ├── /metrics/anomalies   GET   (viewer+)       │
│       ├── /chat                POST  (viewer+)       │
│       ├── /chat/stream         GET   (viewer+, SSE)  │
│       ├── /commentary          POST  (admin)         │
│       └── /boardpack           POST  (admin, PDF)    │
└──────────────────────────────────────────────────────┘
```

**Why Lambda Web Adapter (not API Gateway):**
- Lambda Function URL with `RESPONSE_STREAM` is the only AWS-native path for unbuffered SSE (Server-Sent Events) — required by `/chat/stream`
- LWA translates Lambda invocations to HTTP requests — zero FastAPI code changes between local and Lambda
- No per-request API Gateway charge ($0 vs $1/M requests)

**Why container image (not zip):**
- Python dependencies (fastapi + boto3 + pandas + reportlab + uvicorn + PyJWT) exceed the 250MB zip limit
- Same Docker image runs locally and on Lambda

**Why standard Python image (not Lambda base image):**
- `public.ecr.aws/lambda/python:3.12` expects a handler function name as CMD — incompatible with LWA's HTTP forwarding pattern
- `python:3.12-slim` with LWA works correctly with shell-form CMD: `CMD exec uvicorn ...`

**Lambda configuration:**
| Setting | Value |
|---------|-------|
| Function name | `acme-finance-dev-api` |
| Memory | 512 MB |
| Timeout | 60 seconds |
| Package type | Image |
| Invoke mode | RESPONSE_STREAM |

**Environment variables:**
```
BEDROCK_AGENT_ID, BEDROCK_AGENT_ALIAS_ID,
AGENTCORE_MEMORY_ID, AGENTCORE_MEMORY_ARN, AGENTCORE_STRATEGY_ID,
REDSHIFT_WORKGROUP, REDSHIFT_DATABASE=dev, PORT=8000,
AWS_REGION_OVERRIDE=us-east-1,
COGNITO_USER_POOL_ID="", COGNITO_CLIENT_ID=""
```

**Redshift query execution (`ui/api/redshift.py`):**
- Uses `redshift-data:ExecuteStatement` with IAM authentication (no passwords)
- Adaptive poll schedule: 0.15s x5, 0.5s x5, then 1s until done (max 90 polls)
- Auto-provisioned Redshift user: `IAMR:acme-finance-dev-api-lambda`

**Startup warmup:**
- On Lambda cold start, a background thread fires `SELECT 1` to wake Redshift Serverless (which auto-pauses after idle) while the first real request is being processed

---

### 3. AI Agent Layer (Bedrock + AgentCore)

#### Bedrock Agent

| Attribute | Value |
|-----------|-------|
| Agent ID | `LUUHZWRDA4` |
| Alias ID | `WBNSSBJA88` |
| Model | `us.anthropic.claude-sonnet-4-6-20250514` |
| Knowledge Base | Finance domain docs in S3 |

**6 Action Groups (Lambda functions):**

| Action Group | Lambda | Purpose | Timeout |
|--------------|--------|---------|---------|
| QueryFinanceData | `text_to_sql` | NLP-to-SQL against Redshift marts | 60s |
| ForecastMetrics | `forecast` | Revenue/expense time-series forecasting | 120s |
| VarianceRCA | `variance_rca` | Actuals vs. budget root-cause analysis | 120s |
| WhatIfSimulation | `whatif_sim` | "What if R&D drops 15%?" scenarios | 120s |
| MetricGlossary | `describe_metric` | KPI definitions and formula lookup | 30s |
| AnomalyDetection | `anomaly_detect` | Financial anomaly scanning | 120s |

**Agent instruction includes tool selection guide** — the agent chooses which action group to invoke based on the user's question type (ad-hoc data → SQL, projections → forecast, anomalies → scan, etc.).

#### Forecasting Engine (Linear Trend + Seasonality)

The `ForecastMetrics` action group and the FastAPI `/metrics/forecast` endpoint share the same algorithm — a zero-dependency linear trend decomposition with multiplicative seasonal adjustment.

**Supported metrics:** `revenue` (from `fct_revenue`), `expense` (from `fct_expense`), `operating_income` (from `mart_pl`)

**Algorithm (4 steps):**

```
1. QUERY historical monthly actuals from Redshift
   → Returns time series: [(period_yyyymm, amount), ...]

2. FIT linear trend via ordinary least squares (OLS)
   → slope = Σ(xᵢ - x̄)(yᵢ - ȳ) / Σ(xᵢ - x̄)²
   → intercept = ȳ - slope × x̄
   → trend(t) = intercept + slope × t

3. COMPUTE multiplicative seasonal factors (12-month cycle)
   → For each month m: factor(m) = avg(actual / trend) across all years
   → If Q1 historically runs 5% above trend → factor = 1.05

4. PROJECT forward N periods (default: 4 for agent, 6 for API)
   → projected(t) = trend(t) × seasonal_factor(month(t))
   → 95% confidence band: projected ± 1.96 × residual_std_dev
```

**Output structure (per projected period):**

| Field | Description |
|-------|-------------|
| `projected_amount` | trend × seasonal factor |
| `trend_component` | linear trend value only |
| `seasonal_factor` | multiplicative adjustment (1.0 = no seasonality) |
| `confidence_low` | projected − 1.96 × σ |
| `confidence_high` | projected + 1.96 × σ |

**Summary stats returned:** last 4-period average, projected 4-period average, growth vs. recent (%).

**Two invocation paths:**

| Path | Parameters | Default periods |
|------|-----------|-----------------|
| Bedrock Agent → `forecast` Lambda | `entity_id?`, `periods_ahead?` | 4 |
| React SPA → `/metrics/forecast` API | `metric`, `entity_id?`, `periods_ahead?` | 6 |

Both paths query the same Redshift tables and run identical math. The Lambda version is invoked by the Bedrock Agent for natural-language questions ("forecast revenue for next 4 quarters"). The API version powers the React `/forecast` page with interactive charts (Recharts).

---

#### Variance RCA Engine (Actuals vs Budget)

The `VarianceRCA` action group answers the highest-value FP&A question: *why did actual results deviate from the budget?*

**File:** `agent/lambdas/variance_rca/handler.py`

**Algorithm:**

```
1. QUERY actuals from fct_gl_entries (aggregated by account_id)
   → Revenue entries: sign-flipped (GL credits → positive amounts)
   → Expense entries: kept as-is (GL debits)

2. QUERY plan from stg_epm__plan_line (filtered to version_type = 'budget')

3. JOIN actuals to plan on account_id
   → variance       = actual_amount - plan_amount
   → variance_pct   = variance / ABS(plan_amount) × 100

4. RANK by ABS(variance) descending, return top N drivers
```

**Parameters:**

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `fiscal_year` | Yes | 2024 | Which fiscal year to analyse |
| `fiscal_quarter` | No | — | Narrow to Q1–Q4 (mapped to period_yyyymm ranges using Jan 31 FY-end) |
| `entity_id` | No | ALL | Filter to US, EMEA, or APAC |
| `top_n` | No | 10 | Number of variance drivers to return |

**Quarter-to-month mapping (Jan 31 FY-end):** Q1 = Feb–Apr, Q2 = May–Jul, Q3 = Aug–Oct, Q4 = Nov–Jan (spans two calendar years).

**Output:** Ranked list of accounts with `actual_amount`, `plan_amount`, `variance`, `variance_pct`, and `pnl_rollup` classification. The Bedrock Agent uses this to narrate root-cause explanations to the analyst.

---

#### What-If Simulation Engine (P&L Scenarios)

The `WhatIfSimulation` action group enables hypothetical P&L modelling: *"What if we cut R&D by 15%?"*

**File:** `agent/lambdas/whatif_sim/handler.py`

**Algorithm:**

```
1. QUERY baseline P&L from mart_pl (aggregated across all periods for the fiscal year)
   → Columns: total_revenue, cogs, gross_profit, sales_marketing, research_dev,
              general_admin, total_opex, operating_income

2. APPLY percentage change to the target line item
   → delta   = baseline[line_item] × (pct_change / 100)
   → new_val = baseline[line_item] + delta

3. CASCADE downstream recalculations:
   → If revenue or COGS changed  → recalculate gross_profit
   → If S&M, R&D, or G&A changed → recalculate total_opex
   → Always: operating_income = gross_profit − total_opex

4. RETURN baseline vs scenario comparison with bps impact
```

**Valid line items (with aliases):**

| Line Item | Aliases |
|-----------|---------|
| `total_revenue` | revenue |
| `cogs` | cost of goods sold |
| `sales_marketing` | S&M, sales and marketing |
| `research_dev` | R&D, research and development |
| `general_admin` | G&A, general and administrative |
| `total_opex` | opex |

**Output per scenario:**

| Field | Description |
|-------|-------------|
| `baseline` | Revenue, gross profit, gross margin %, operating income, operating margin % |
| `scenario_result` | Same metrics after applying the change |
| `impact` | Delta on the changed line, operating income delta ($), operating margin delta (bps) |

**Important:** `total_opex` in `mart_pl` excludes COGS (S&M + R&D + G&A only). The formula `operating_income = gross_profit − total_opex` depends on this — see the COGS fix in commit `2a1a353`.

---

#### Anomaly Detection Engine (Financial Health Scanner)

The `AnomalyDetection` action group and the FastAPI `/metrics/anomalies` endpoint run 4 rule-based financial anomaly detectors in parallel, then return findings sorted by severity.

**Files:** `agent/lambdas/anomaly_detect/handler.py` (Bedrock Agent path), `ui/api/main.py` (API path — identical logic)

**4 Detectors:**

| Detector | Data Source | Trigger Rule | Severity |
|----------|------------|--------------|----------|
| **Aged AR** | `mart_ar_aging` | Invoice >90 days overdue AND >$500K | High if >120 days or >$1M; else Medium |
| **AP/Expense Spike** | `fct_gl_entries` (S&M, G&A) | Monthly spend >2× the 3-month rolling average | High if >3×; else Medium |
| **Asset Disposal Loss** | `fct_gl_entries` (Loss on Disposal) | Any disposal loss posted | High if >$200K; Medium if >$50K; else Low |
| **Budget Variance** | `fct_gl_entries` vs `stg_epm__plan_line` | Actual deviates >25% from plan AND plan >$100K | High if >50%; Medium if >35%; else Low |

**AP Spike detection detail:**

```sql
-- Rolling 3-month average (excluding current month)
AVG(month_amount) OVER (
    PARTITION BY entity_id, pnl_rollup
    ORDER BY period_yyyymm
    ROWS BETWEEN 3 PRECEDING AND 1 PRECEDING
) AS rolling_3m_avg

-- Flagged if current month > 2× rolling average
WHERE month_amount > 2 * rolling_3m_avg
```

**Output structure:**

```json
{
  "anomalies": [...],        // sorted by severity (high → medium → low)
  "total_count": 12,
  "high_severity": 3,
  "medium_severity": 6,
  "low_severity": 3
}
```

Each anomaly includes: `anomaly_type`, `severity`, `entity_id`, `amount`, human-readable `description`, and type-specific fields (e.g., `days_overdue`, `ratio`, `variance_pct`).

**Two invocation paths:**

| Path | Trigger |
|------|---------|
| Bedrock Agent → `anomaly_detect` Lambda | NL questions: "Any anomalies?", "Run a financial health check" |
| React SPA → `/metrics/anomalies` API | `/anomalies` page with severity badges and filtering |

---

#### Metric Glossary (Static KPI Definitions)

The `MetricGlossary` action group provides canonical business definitions so the agent can explain what metrics mean, not just return numbers.

**File:** `agent/lambdas/describe_metric/handler.py`

**No database access** — definitions are a static Python dictionary (14 metrics). This keeps the Lambda at 30s timeout and avoids unnecessary Redshift queries.

**Covered metrics:**

| Category | Metrics |
|----------|---------|
| Revenue | ARR, NRR, GRR, Churn Rate |
| Profitability | Gross Margin, Operating Margin, EBITDA Margin |
| Efficiency | CAC, Magic Number, Rule of 40 |
| Cash/AR | DSO, AR Aging |
| Expense | OpEx |

**Each metric entry includes:**

| Field | Example (ARR) |
|-------|---------------|
| `name` | Annual Recurring Revenue (ARR) |
| `definition` | Annualised value of all active subscription contracts |
| `formula` | `SUM(ending_arr)` for latest `period_yyyymm` |
| `table` | `fct_arr` |
| `unit` | USD |
| `good_direction` | higher |
| `benchmark` | *(where applicable)* |

**Lookup behaviour:** Exact match on normalised key → partial match → returns suggestions if multiple matches → error with full list of available metrics.

---

#### AgentCore Memory (Semantic)

| Attribute | Value |
|-----------|-------|
| Memory ID | `acme_finance_dev_memory-F0GIOl5mcE` |
| Strategy ID | `financeSemanticMemory-jg6xTm9BFx` |
| Type | Semantic (embedding-based retrieval) |
| Top-K | 5 records per query |

**How memory works in the chat flow:**
1. User sends question → FastAPI retrieves top-5 semantically relevant past Q&A pairs from AgentCore Memory
2. Memory context is prepended to the user's question before sending to Bedrock Agent
3. After the agent responds, the Q&A exchange is stored back to AgentCore Memory (fire-and-forget background thread)
4. The `memory_id` field (per-user namespace) enables per-user memory isolation

---

### 4. Data Warehouse (Redshift Serverless + dbt)

| Attribute | Value |
|-----------|-------|
| Workgroup | `acme-finance-dev` |
| Database | `dev` |
| Analytics schema | `analytics_dev_marts` |
| RPU range | 8–32 (auto-scaling) |
| Auto-pause | Enabled (idle timeout) |

**dbt model layers (`warehouse/dbt/`):**

```
Staging (stg_*)           Intermediate (int_*)        Marts (mart_*, fct_*, dim_*)
┌─────────────────┐       ┌────────────────────┐      ┌─────────────────────────┐
│ stg_erp__gl_... │──────►│ int_revenue        │──────►│ mart_pl (P&L)           │
│ stg_erp__inv... │──────►│ int_arr_movements  │──────►│ fct_arr (ARR waterfall) │
│ stg_erp__sub... │──────►│ int_ar_aging       │──────►│ mart_ar_aging           │
│ stg_epm__plan.. │──────►│ int_pl_components  │──────►│ fct_revenue, fct_expense│
│ stg_crm__acc... │       └────────────────────┘      │ fct_gl_entries          │
└─────────────────┘                                    │ dim_entity, dim_account │
                                                       │ dim_cost_center, dim_*  │
                                                       └─────────────────────────┘
```

**Key tables queried by FastAPI:**
- `mart_pl` — P&L by entity/fiscal_year/quarter/period (powers `/metrics/pl`)
- `fct_arr` — ARR movements: new, expansion, contraction, churn (powers `/metrics/arr`)
- `mart_ar_aging` — Open invoices by aging bucket (powers `/metrics/ar_aging`)
- `fct_gl_entries` — Atomic GL journal lines (consumed by variance-rca Lambda)

---

### 5. Data Ingestion Pipeline

```
EventBridge (06:00 UTC daily, currently disabled)
  └─► Step Functions state machine
       ├─► Parallel: 3 Glue ETL jobs
       │    ├─ ETL_ERP: RDS → S3 raw → Glue → S3 curated (Iceberg)
       │    ├─ ETL_EPM: S3 EPM drops → curated
       │    └─ ETL_CRM: S3 CRM drops → curated
       └─► Sequential: Curated Crawler → Glue Catalog update
```

| Component | Service | Purpose |
|-----------|---------|---------|
| Replication | DMS Serverless | RDS Postgres → S3 raw zone (Parquet) |
| Catalog | Glue Data Catalog | Schema discovery and metadata |
| ETL | Glue Spark | Raw → Curated (Iceberg, dedup, audit columns) |
| Table format | Apache Iceberg | ACID, schema evolution, time travel |
| Data lake | S3 (raw + curated) | Medallion architecture (bronze/silver/gold) |
| Orchestration | Step Functions + EventBridge | Daily refresh pipeline |

---

### 6. Source Systems

| System | Service | Data |
|--------|---------|------|
| ERP | RDS Postgres (`t3.small`) | GL entries, invoices, subscriptions, payroll, fixed assets (791K rows) |
| EPM | S3 drops | Budget/plan data (`stg_epm__plan_line`) |
| CRM | S3 drops | Customer accounts, opportunities, ARR |

**Synthetic data:** 3 fiscal years (FY23–FY25), FY23 $1.6B → FY24 $2.0B → FY25 $2.3B revenue, 8K customers, Salesforce-shaped.

---

### 7. Authentication & RBAC (Deferred)

Authentication infrastructure is fully provisioned but disabled. JWT validation is bypassed when `COGNITO_USER_POOL_ID=""`.

**Architecture when enabled:**

```
Browser → React (Amplify)
  → Check for valid Cognito tokens
  → Not authenticated → Cognito Hosted UI
  → "Sign in with AWS IAM Identity Center" (SAML 2.0)
  → IDC returns SAML assertion → Cognito issues JWT
  → React stores tokens, adds Authorization header to API calls
  → FastAPI validates JWT against Cognito JWKS
```

**Deployed resources (inactive):**
- Cognito User Pool: `us-east-1_OJ34jL9eM`
- Cognito Domain: `acme-finance-dev-010928194453.auth.us-east-1.amazoncognito.com`
- Groups: `admin` (full access), `viewer` (read-only)
- SAML IdP: Conditional (`count=0` until `idc_saml_metadata_url` is set)

**RBAC enforcement (3 layers):**
1. **IAM Identity Center:** Groups (`acme-finance-admin`, `acme-finance-viewer`) → mapped to Cognito groups
2. **Cognito:** `cognito:groups` claim in JWT carries group membership
3. **FastAPI:** `require_any_role` (viewer+admin) on read routes, `require_admin` on write routes (`/commentary`, `/boardpack`)

**To activate:** Set `idc_saml_metadata_url` and `cloudfront_domain_static` in `terraform.tfvars`, register SAML 2.0 app in IAM Identity Center console, `terraform apply`.

---

## Network Architecture

```
VPC: 10.42.0.0/16
├── Public Subnets (3 AZs)
│   ├── RDS Postgres (IP allowlist for operator access)
│   ├── Redshift Serverless (publicly accessible, IP allowlist)
│   └── NAT not required (Lambda runs outside VPC)
│
├── Private Subnets (3 AZs)
│   ├── DMS Serverless replication instances
│   └── VPC endpoints (Secrets Manager)
│
└── Security Groups
    ├── rds_sg: Postgres 5432 from operator IP + DMS SG
    └── redshift_sg: Redshift 5439 from operator IP

Lambda runs OUTSIDE VPC (default Lambda networking):
  → Redshift Data API (public endpoint, IAM auth)
  → Bedrock (public endpoint, IAM auth)
  → AgentCore (public endpoint, IAM auth)
```

**Why Lambda outside VPC:** All downstream services (Redshift Data API, Bedrock, AgentCore) are accessed via public AWS APIs with IAM authentication. Placing Lambda inside the VPC would require NAT Gateway ($32/month) with no security benefit.

---

## IAM & Security Model

### Lambda Execution Role: `acme-finance-dev-api-lambda`

```
Managed policy:
  └── AWSLambdaBasicExecutionRole (CloudWatch Logs)

Inline policy (acme-finance-dev-api-permissions):
  ├── redshift-data:ExecuteStatement        → Redshift workgroup ARN
  ├── redshift-serverless:GetCredentials    → Redshift workgroup ARN
  ├── redshift-data:DescribeStatement       → * (statement IDs aren't ARNs)
  ├── redshift-data:GetStatementResult      → *
  ├── redshift-data:ListStatements          → *
  ├── bedrock:InvokeAgent                   → Agent ARN + alias wildcard
  ├── bedrock-agentcore:RetrieveMemoryRecords → Memory ARN
  ├── bedrock-agentcore:BatchCreateMemoryRecords → Memory ARN
  ├── bedrock-agentcore:GetMemory           → Memory ARN
  └── bedrock-agentcore:ListMemoryRecords   → Memory ARN
```

### Lambda Function URL Permissions

Two permissions required (AWS October 2025 change):
1. `lambda:InvokeFunctionUrl` — standard FURL permission (via `aws_lambda_permission`)
2. `lambda:InvokeFunction` with condition `InvokedViaFunctionUrl=true` — new requirement (via `null_resource` + AWS CLI, since Terraform `aws_lambda_permission` doesn't support this condition)

### Encryption

| Layer | Method |
|-------|--------|
| S3 (data lake) | KMS CMK (per-environment key) |
| S3 (frontend) | SSE-S3 |
| RDS | KMS CMK |
| Redshift | KMS CMK |
| In transit | TLS everywhere (HTTPS, SSL connections) |
| Secrets | Secrets Manager (RDS credentials) |

### CloudFront → S3 Access

Origin Access Control (OAC) with sigv4 signing. S3 bucket policy allows `s3:GetObject` only from the CloudFront distribution ARN. No public access.

---

## Deployment Pipeline

### `scripts/deploy.sh`

```bash
./scripts/deploy.sh                  # full deploy
./scripts/deploy.sh --backend-only   # Lambda only
./scripts/deploy.sh --frontend-only  # React + S3 + CloudFront only
```

**Backend flow:**
1. Read Terraform outputs (ECR URL, Lambda name, etc.)
2. `aws ecr get-login-password | docker login`
3. `docker build --platform linux/amd64 -f ui/Dockerfile .`
4. Push with timestamp + latest tags
5. `aws lambda update-function-code --image-uri <timestamp-tag>`
6. `aws lambda wait function-updated`

**Frontend flow:**
1. `VITE_API_URL=/api npm run build` (Vite inlines env vars at build time)
2. `aws s3 sync dist/ s3://$BUCKET/ --delete --cache-control "public,max-age=31536000,immutable" --exclude index.html`
3. `aws s3 cp dist/index.html s3://$BUCKET/ --cache-control "no-cache"`
4. `aws cloudfront create-invalidation --paths "/*"`

**Key build flags:**
- `--platform linux/amd64` — Lambda runs x86_64
- `--provenance=false --sbom=false` — if using buildx, prevents OCI multi-arch manifest rejection by Lambda

---

## Data Flow Diagrams

### User Query Flow (Real-time)

```
1. Browser → CloudFront /api/metrics/pl?fiscal_year=2024
2. CloudFront Function strips /api → /metrics/pl?fiscal_year=2024
3. CloudFront → Lambda Function URL (AllViewerExceptHostHeader policy)
4. LWA → uvicorn → FastAPI route handler
5. FastAPI → redshift-data:ExecuteStatement (IAM auth, no password)
6. Poll DescribeStatement until FINISHED (adaptive: 0.15s → 0.5s → 1s)
7. GetStatementResult → JSON response
8. FastAPI returns JSON → LWA → Lambda → CloudFront → Browser
```

### AI Chat Flow (Streaming)

```
1. Browser → CloudFront /api/chat/stream?question=...&session_id=...&memory_id=...
2. CloudFront → Lambda FURL (RESPONSE_STREAM mode, no caching)
3. FastAPI:
   a. Retrieve top-5 semantically relevant memories from AgentCore Memory
   b. Prepend memory context to question
   c. invoke_agent(agentId, aliasId, sessionId, inputText, memoryId)
4. Bedrock Agent:
   a. Analyzes question → selects action group (e.g., QueryFinanceData)
   b. Invokes Lambda action group → executes SQL → returns data
   c. Formats response with Claude Sonnet 4.6
5. FastAPI streams response chunks → SSE → CloudFront → Browser
6. Background thread: store Q&A pair to AgentCore semantic memory
```

### Daily ETL Flow

```
EventBridge (06:00 UTC) → Step Functions
  ├─ Parallel:
  │   ├─ DMS: RDS → S3 raw (full load, Parquet)
  │   ├─ Glue ETL: S3 raw → S3 curated (Iceberg, dedup)
  │   └─ (EPM/CRM: S3 drops → curated)
  └─ Sequential: Glue Crawler → Catalog update
       └─ Redshift Spectrum can now query latest curated data
           └─ dbt run → refresh staging → intermediate → marts
```

---

## Terraform Module Map

```
infra/envs/dev/main.tf
  ├── module "network"            → VPC, subnets, security groups
  ├── module "s3_lake"            → S3 raw + curated + KB buckets, KMS key
  ├── module "iam_roles"          → Glue, DMS, Redshift roles
  ├── module "glue"               → Catalog databases, crawlers, ETL job
  ├── module "step_functions"     → State machine + EventBridge schedule
  ├── module "dms"                → DMS Serverless replication
  ├── module "redshift_serverless"→ Workgroup, namespace, Spectrum role
  ├── module "rds_erp"            → RDS Postgres instance
  ├── module "bedrock"            → Agent, KB, 6 action group Lambdas, AgentCore
  ├── module "hosting"            → ECR, Lambda, FURL, S3 frontend, CloudFront
  └── module "auth"               → Cognito User Pool, SAML IdP, groups
```

**State backend:** S3 (`acme-finance-tfstate-010928194453/envs/dev/terraform.tfstate`) with native S3 locking (Terraform 1.10+).

---

## Cost Analysis

### Current Monthly Cost

| Service | Monthly Cost | Notes |
|---------|-------------|-------|
| Redshift Serverless (8 RPU) | ~$20–30 | Auto-pauses when idle |
| RDS Postgres (t3.small) | ~$15 | Could pause between refreshes |
| VPC endpoints | ~$7 | Secrets Manager interface endpoint |
| Lambda (API) | ~$0.00 | Within free tier at lab traffic |
| Lambda Function URL | $0.00 | No per-request charge |
| ECR (3 images) | ~$0.09 | 3-image lifecycle policy |
| S3 frontend | ~$0.00 | ~5MB static files |
| CloudFront | ~$0.09 | PriceClass_100, minimal traffic |
| CloudWatch Logs | ~$0.03 | Lambda + Bedrock audit logs |
| Cognito | $0.00 | Free up to 50K MAU |
| Bedrock (Claude Sonnet) | ~$0.01–0.50 | Per-token pricing, lab usage |
| **Total** | **~$35–50/month** | |

### Cost Optimization Levers

1. Pause Redshift when not analyzing (saves ~$20/month)
2. Pause RDS between ETL windows (saves ~$15/month)
3. Snapshot DMS after full load (saves ~$5/month)
4. dbt incremental models (saves compute on large refreshes)

---

## Key Decisions & Trade-offs

### Lambda Function URL vs API Gateway

**Chose:** Lambda Function URL with `RESPONSE_STREAM`  
**Reason:** Only AWS-native path for unbuffered SSE streaming. API Gateway buffers responses (breaks `/chat/stream`). API Gateway REST costs $3.50/M requests; FURL is free.  
**Trade-off:** No built-in request validation, throttling, or usage plans. Application-level auth required.

### Lambda Web Adapter vs Custom Handler

**Chose:** LWA (aws-lambda-adapter 0.9.1)  
**Reason:** Zero code changes — same FastAPI app runs locally and on Lambda. LWA intercepts Lambda invocations and forwards as HTTP to uvicorn.  
**Trade-off:** Adds ~100ms cold start overhead. Requires standard Python base image (not Lambda base).

### CloudFront Same-Origin vs Separate Domains

**Chose:** Same-origin (frontend + API behind one CloudFront distribution)  
**Reason:** No CORS concerns, no need for public Lambda URL, simpler cookie/auth handling.  
**Trade-off:** CloudFront Function required to strip `/api` prefix. Path-based routing adds complexity.

### Managed Origin Request Policies vs forwarded_values

**Chose:** Managed policies for API behavior (`Managed-CachingDisabled` + `Managed-AllViewerExceptHostHeader`)  
**Reason:** Lambda FURLs reject requests where Host header doesn't match their domain. `AllViewerExceptHostHeader` lets CloudFront set the correct Host.  
**Trade-off:** Must use managed policy IDs (hardcoded UUIDs), less flexible than custom policies.

### SAML 2.0 vs OAuth 2.0 for IAM Identity Center

**Chose:** SAML 2.0  
**Reason:** OAuth 2.0 apps in IAM Identity Center are exclusively for Trusted Identity Propagation (token exchange to AWS managed services like Redshift, S3). SAML 2.0 is the correct protocol for federating external apps into Cognito.  
**Trade-off:** Requires manual SAML app registration in IAM Identity Center console (not automatable via Terraform).

### Lambda OLS Forecasting vs SageMaker

**Chose:** Zero-dependency linear trend + seasonality in Lambda (~60 lines of Python)  
**Reason (5 factors):**

1. **Cost** — A SageMaker real-time endpoint (ml.t3.medium) costs ~$50/month minimum, which alone hits the project's entire $50/month budget target. The Lambda forecast runs in <1s per invocation and costs effectively $0 at lab traffic.
2. **Data volume** — The time series is 36 monthly data points (3 fiscal years). OLS regression on 36 points is trivially fast; ML infrastructure is overkill.
3. **No training cycle** — OLS is deterministic and computed on every request from current warehouse data. There's no model to train, retrain, version, or deploy — no SageMaker training jobs, model registry, or endpoint management.
4. **Operational simplicity** — The forecast code runs inside the same Lambda + Redshift Data API pattern as every other tool. Adding SageMaker means a new IAM role, VPC endpoint or NAT Gateway (~$32/month), model artifact bucket, and endpoint auto-scaling configuration.
5. **Adequate accuracy** — For a finance planning tool showing directional trend + seasonality to a CFO, the linear decomposition method is standard practice (it's what most FP&A teams use in Excel). The 95% confidence band from residual std dev communicates uncertainty honestly.

**When SageMaker would be the right call:**
- Hundreds of SKU-level or customer-level time series requiring hierarchical forecasting (→ SageMaker Canvas or Amazon Forecast)
- Sub-daily granularity with complex exogenous variables (marketing spend, macro indicators)
- Production SLA requiring <50ms p99 latency on predictions (→ SageMaker real-time endpoint with model compilation)
- Model experimentation lifecycle where data scientists need notebooks, experiments, and A/B testing

**Trade-off:** The current approach won't capture non-linear patterns (market shocks, S-curves in adoption). If ACME's growth pattern becomes non-linear, upgrading to Prophet or statsforecast inside the same Lambda is the next step before reaching for SageMaker.

### Auth Disabled by Default

**Chose:** Ship with `COGNITO_USER_POOL_ID=""` (auth bypassed)  
**Reason:** Lab/course environment — reduces friction. Auth infrastructure is fully provisioned and ready to activate.  
**Trade-off:** Lambda Function URL is publicly accessible. Application-level auth is the only enforcement layer.

---

## Troubleshooting Reference

### Lambda Function URL Returns 403

**Cause:** AWS October 2025 change requires TWO permissions:
1. `lambda:InvokeFunctionUrl` (standard)
2. `lambda:InvokeFunction` with `InvokedViaFunctionUrl=true` condition

**Fix:**
```bash
aws lambda add-permission \
  --function-name acme-finance-dev-api \
  --statement-id PublicInvokeFunctionViaUrl \
  --action lambda:InvokeFunction \
  --principal '*' \
  --invoked-via-function-url
```

### CloudFront Returns S3 HTML Instead of API Response

**Causes:**
1. OAC attached to Lambda origin — remove `origin_access_control_id` from Lambda origin
2. Missing origin request policy — add `Managed-AllViewerExceptHostHeader`
3. Wrong origin request policy — `Managed-AllViewer` forwards viewer's Host header; Lambda FURL rejects it

### Redshift "Permission Denied for Schema"

**Cause:** Lambda's IAM role creates auto-provisioned user `IAMR:acme-finance-dev-api-lambda` which has no schema grants.

**Fix:**
```sql
GRANT USAGE ON SCHEMA analytics_dev_marts TO "IAMR:acme-finance-dev-api-lambda";
GRANT SELECT ON ALL TABLES IN SCHEMA analytics_dev_marts TO "IAMR:acme-finance-dev-api-lambda";
```

### Docker Image Rejected by Lambda

**Cause:** buildx produces OCI multi-arch manifest by default. Lambda requires Docker Image Manifest V2 Schema 2.

**Fix:** `docker build --provenance=false --sbom=false`

### Bedrock InvokeAgent "ARN Not Found"

**Causes:**
1. Wrong IAM action — use `bedrock:InvokeAgent` (not `bedrock-agent-runtime:InvokeAgent`)
2. Agent alias routes to deprecated model version — create new alias (snapshots DRAFT)

### React Blank Page After Deploy

**Causes:**
1. `aws-amplify` import at module load time causes runtime error when Cognito not configured — use dynamic import with `@vite-ignore`
2. `new URL('/api/metrics/pl')` throws for relative paths — prepend `window.location.origin`

---

## Related Documents

| Document | Purpose |
|----------|---------|
| [PLAN.md](./PLAN.md) | Phase delivery roadmap |
| [data-dictionary.md](./data-dictionary.md) | GL accounts, dimensions, facts (200+ fields) |
| [cost-guardrails.md](./cost-guardrails.md) | Cost targets and budget alerts |
| [Phase 4](./phases/PHASE-4.md) | DMS, Glue, Iceberg, Redshift deep dive |
| [Phase 8](./phases/PHASE-8.md) | Forecasting, variance RCA, AgentCore Memory |
| [Phase 9](./phases/PHASE-9.md) | What-if simulation, anomaly detection |
| [Phase 10](./phases/PHASE-10.md) | React SPA, Lambda hosting, CloudFront |
| [ADRs](./adr/) | Architecture Decision Records |
| [use-case-testing.md](./use-case-testing.md) | End-to-end test scenarios |

---

## Quick Reference

| Resource | Identifier |
|----------|-----------|
| CloudFront URL | `https://d12q69tjm17cex.cloudfront.net` |
| Lambda Function URL | `https://l6s6l56d55zun6eehr4ooai2la0ixvyx.lambda-url.us-east-1.on.aws/` |
| ECR Repository | `010928194453.dkr.ecr.us-east-1.amazonaws.com/acme-finance-dev-api` |
| S3 Frontend | `acme-finance-dev-frontend-010928194453` |
| CloudFront Distribution | `EQ4TP9OWQUES2` |
| Lambda Function | `acme-finance-dev-api` |
| Bedrock Agent | `LUUHZWRDA4` (alias `WBNSSBJA88`) |
| Redshift Workgroup | `acme-finance-dev` (database `dev`, schema `analytics_dev_marts`) |
| Cognito User Pool | `us-east-1_OJ34jL9eM` |
| AgentCore Memory | `acme_finance_dev_memory-F0GIOl5mcE` |
| Terraform State | `s3://acme-finance-tfstate-010928194453/envs/dev/terraform.tfstate` |
| Terraform Modules | `network`, `s3-lake`, `iam-roles`, `glue`, `step-functions`, `dms`, `redshift-serverless`, `rds-erp`, `bedrock`, `hosting`, `auth` |

---

**Last Updated:** 2026-05-14
