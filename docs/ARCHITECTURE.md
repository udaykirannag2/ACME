# ACME Finance — Level 300 Architecture

**Status:** Phases 0–10 Complete | Authentication Deferred  
**Last Updated:** 2026-05-18  
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

#### Forecasting Engine (Driver-Based ARR Cohort Model)

The `ForecastMetrics` action group uses a driver-based SaaS ARR cohort model that forecasts revenue from underlying business drivers (churn, expansion, new logo bookings) rather than naive trend extrapolation. The FastAPI `/metrics/forecast` endpoint mirrors the same logic.

**Supported metrics:** `revenue` (primary — driver-based ARR), `expense` (from OpEx ratios), `operating_income` (from `mart_pl`)

**Algorithm — ARR Bridge (per tier, per month):**

```
1. QUERY trailing 4 quarters of fct_arr → compute tier-specific rates:
   → monthly_churn_rate, monthly_contraction_rate, monthly_expansion_rate
   → by segment_tier: enterprise, commercial, smb

2. QUERY new logo run-rate + weighted pipeline ACV
   → Blend: pipeline ACV for months 1-3 (near-term visibility)
   → Run-rate (historical average) for months 4-12
   → Cap at 25% annual new-logo growth (prevents unrealistic projections)

3. QUERY trailing 4 quarters of mart_pl → OpEx ratios:
   → COGS%, S&M%, R&D%, G&A% of revenue

4. ROLL FORWARD 12 months per tier:
   → Starting_ARR = prior Ending_ARR
   → Churn = -(Starting_ARR × monthly_churn)
   → Contraction = -(Starting_ARR × monthly_contraction)
   → Expansion = Starting_ARR × monthly_expansion
   → New Logo = blended monthly ACV
   → Ending_ARR = Starting + Churn + Contraction + Expansion + New

5. PROJECT revenue and P&L:
   → Monthly Revenue = (Total Ending_ARR / 12) × (1 + nonsub_uplift)
   → Expenses = Revenue × trailing OpEx ratios
   → Operating Income = Gross Profit - Total OpEx
   → 95% confidence band: ±1.96 × historical CoV
```

**Three tiers with independent dynamics:**

| Metric | Enterprise | Commercial | SMB |
|--------|-----------|-----------|-----|
| Net Revenue Retention | 107% | 89% | 49% |
| Gross Revenue Retention | 96% | 79% | 45% |
| Annual Churn Rate | ~0% | 17% | 49% |
| Annual Expansion | 11% | 9% | 4% |

**Scenario overrides (what-if on growth levers):**

| Parameter | Default | Effect |
|-----------|---------|--------|
| `churn_pct_multiplier` | 1.0 | 0.5 = halve churn → +4.5% revenue at month 12 |
| `contraction_pct_multiplier` | 1.0 | Adjust downsell rates |
| `expansion_pct_multiplier` | 1.0 | Adjust upsell/cross-sell rates |
| `new_logo_pct_change` | 0.0 | +50 = 50% more bookings → +23.5% revenue |

**Output structure (backward-compatible + new driver detail):**

| Field | Description |
|-------|-------------|
| `projections[]` | Monthly projected revenue, expenses, operating income |
| `history[]` | Trailing 24 months of actuals |
| `confidence_low/high` | ±1.96σ band from historical coefficient of variation |
| `growth_vs_recent` | Projected vs. last 4-period average (%) |
| `drivers.rates_by_tier` | Churn/expansion/contraction rates per tier |
| `drivers.new_logo_monthly_arr` | Blended new logo ACV per month |
| `drivers.opex_ratios` | COGS%, S&M%, R&D%, G&A% |
| `arr_bridge[]` | Per-month ARR bridge detail by tier |

**Two invocation paths:**

| Path | Parameters | Default periods |
|------|-----------|-----------------|
| Bedrock Agent → `forecast` Lambda | `entity_id?`, `periods_ahead?`, `scenario_overrides?` | 12 |
| React SPA → `/metrics/forecast` API | `metric`, `entity_id?`, `periods_ahead?` | 6 |

Both paths query the same Redshift tables and run the same driver-based model. The Lambda version is invoked by the Bedrock Agent for natural-language questions ("forecast revenue for next 12 months" or "forecast revenue if churn doubles"). The API version powers the React `/forecast` page with interactive charts (Recharts).

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

### 5. End-to-End Data Journey

This section walks through the complete data lifecycle — from source systems through ingestion, transformation, and consumption — at progressively deeper detail levels.

#### High-Level Data Flow (Level 200)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          SOURCE SYSTEMS                                     │
│                                                                             │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐                     │
│  │  ERP System   │   │  CRM System   │   │  EPM System   │                   │
│  │  (NetSuite /  │   │  (Salesforce)  │   │  (Anaplan /   │                   │
│  │   SAP-like)   │   │               │   │   Adaptive)   │                   │
│  │              │   │  Accounts     │   │              │                     │
│  │  GL Journals │   │  Opportunities │   │  Budgets     │                   │
│  │  AR/AP       │   │  ARR Movements │   │  Forecasts   │                   │
│  │  Customers   │   │  Pipeline     │   │  Headcount   │                     │
│  │  Fixed Assets│   │  Contacts     │   │  Drivers     │                     │
│  └──────┬───────┘   └──────┬───────┘   └──────┬───────┘                     │
│         │                  │                  │                              │
└─────────┼──────────────────┼──────────────────┼─────────────────────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      DATA LAKE (S3 — Medallion Architecture)                │
│                                                                             │
│  ┌── RAW ZONE (Bronze) ──────────────────────────────────────────────┐      │
│  │  s3://acme-lake-dev-raw-010928194453/                             │      │
│  │    erp/ → Parquet (GL journals, AR/AP invoices, customers, ...)   │      │
│  │    crm/ → Parquet (accounts, opps, arr_movement partitioned)     │      │
│  │    epm/ → Parquet (plan_lines, budgets, headcount)               │      │
│  └────────────────────────────────┬──────────────────────────────────┘      │
│                                   │ Glue ETL (PySpark + Iceberg)            │
│                                   ▼                                         │
│  ┌── CURATED ZONE (Silver) ──────────────────────────────────────────┐      │
│  │  s3://acme-lake-dev-curated-010928194453/iceberg/                 │      │
│  │    Iceberg tables with ACID guarantees + schema evolution         │      │
│  │    + audit columns (_ingest_date, _ingest_run_id)                 │      │
│  └────────────────────────────────┬──────────────────────────────────┘      │
│                                   │ Redshift Spectrum (external schema)      │
└───────────────────────────────────┼─────────────────────────────────────────┘
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                  DATA WAREHOUSE (Redshift Serverless + dbt)                  │
│                                                                             │
│  ┌── STAGING ──────┐  ┌── INTERMEDIATE ─────┐  ┌── MARTS ──────────────┐   │
│  │  stg_erp__*     │  │  int_gl_entries_    │  │  mart_pl (P&L)       │   │
│  │  stg_crm__*     │─►│    enriched         │─►│  fct_arr (ARR)       │   │
│  │  stg_epm__*     │  │  int_revenue_monthly│  │  fct_revenue         │   │
│  │                 │  │  int_expense_monthly │  │  fct_expense         │   │
│  │  (schema       │  │                     │  │  fct_gl_entries      │   │
│  │   conform)     │  │  (business logic    │  │  mart_ar_aging       │   │
│  │                 │  │   & joins)          │  │  dim_* (6 tables)    │   │
│  └─────────────────┘  └─────────────────────┘  └──────────┬───────────┘   │
│                                                            │               │
└────────────────────────────────────────────────────────────┼───────────────┘
                                                             │
                                                             ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      CONSUMPTION LAYER                                      │
│                                                                             │
│  ┌───────────────────┐  ┌──────────────────────┐  ┌────────────────────┐   │
│  │  React Dashboard  │  │   Bedrock AI Agent   │  │  Forecast Lambda   │   │
│  │  (CloudFront)     │  │   (6 Action Groups)  │  │  (Driver-based     │   │
│  │                   │  │                      │  │   ARR cohort)      │   │
│  │  P&L / ARR /     │  │  NL → SQL → Answer  │  │                    │   │
│  │  AR Aging /       │  │  Variance RCA       │  │  Scenarios:        │   │
│  │  Forecast /       │  │  What-If Sim        │  │  - Churn ↑↓        │   │
│  │  Anomalies        │  │  Anomaly Detection  │  │  - Bookings ↑↓     │   │
│  └───────────────────┘  └──────────────────────┘  │  - Expansion ↑↓    │   │
│                                                    └────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Source Systems Detail (Level 300)

| System | Simulated As | Tables | Records | Key Fields |
|--------|-------------|--------|---------|------------|
| **ERP** | Python generators → Parquet | `gl_journal_header`, `gl_journal_line`, `ar_invoice`, `ar_receipt`, `ap_invoice`, `ap_payment`, `customer`, `vendor`, `entity`, `chart_of_accounts`, `cost_center`, `fixed_asset`, `fa_depreciation` | ~800K rows | Salesforce-style fiscal calendar (FY ends Jan 31) |
| **CRM** | Python generators → Parquet | `account`, `contact`, `opportunity`, `opportunity_line`, `arr_movement` (partitioned), `pipeline_snapshot` (partitioned) | ~10K rows | UUIDs shared with ERP customer table |
| **EPM** | Python generators → Parquet | `budget_version`, `forecast_version`, `plan_line` (partitioned), `headcount_plan`, `driver_assumption` | ~6K rows | Account-level budget vs. forecast |

**Synthetic data characteristics:**
- 3 fiscal years (FY23–FY25): $1.6B → $2.0B → $2.3B revenue
- 800 customers (quick mode at 10% scale), 3 entities (US, EMEA, APAC)
- Ratable revenue recognition across service periods with fiscal year cutoff
- CRM `account_id` = ERP `customer_id` (same UUIDs for reconciliation)

**Data Generation Pipeline (Phase 2):**

```
Phase 2A: Reference Data
  └─ entities, chart_of_accounts, cost_centers

Phase 2B: CRM
  └─ accounts → contacts → opportunities → opp_lines → arr_movements → pipeline_snapshots

Phase 2C: AR / AP / Payroll / Fixed Assets
  └─ CRM accounts flow into AR customers (same UUIDs)
  └─ AP vendors, invoices, payments
  └─ Payroll as semi-monthly AP
  └─ Fixed assets + depreciation schedules

Phase 2D: GL Auto-Posting
  └─ Revenue recognition (ratable across service periods, capped at fiscal year boundary)
  └─ AR invoices/receipts → GL journals
  └─ AP invoices/payments → GL journals
  └─ Depreciation → GL journals
  └─ Balance assertions: every journal balances (debits = credits)

Phase 2E: EPM + Anomalies + Upload
  └─ Budget/forecast versions with plan lines
  └─ Seeded anomalies (aged AR, S&M overspend, asset disposal, stalled pipeline)
  └─ Upload to S3 raw zone
```

#### Data Ingestion & ETL (Level 400)

**Step 1: S3 Raw Zone Upload**

The generator pipeline writes files in the layout expected by Glue crawlers:

```
s3://acme-lake-dev-raw-010928194453/
├── erp/
│   ├── gl_journal_header/
│   │   ├── gl_journal_header.csv          ← Postgres COPY compatible
│   │   └── part-0.parquet                 ← Glue catalog reads this
│   ├── gl_journal_line/
│   │   └── part-0.parquet
│   ├── customer/
│   │   └── part-0.parquet
│   └── ... (13 tables)
├── crm/
│   ├── account/
│   │   └── part-0.parquet
│   ├── arr_movement/
│   │   ├── period_yyyymm=202302/part-0.parquet   ← Hive-style partitioning
│   │   ├── period_yyyymm=202303/part-0.parquet
│   │   └── ...
│   └── ... (6 tables)
└── epm/
    ├── plan_line/
    │   ├── period_yyyymm=202302/part-0.parquet
    │   └── ...
    └── ... (5 tables)
```

**Step 2: Glue Crawlers → Catalog Discovery**

4 crawlers (on-demand, triggered by Step Functions):

| Crawler | Source Path | Target Database | Behaviour |
|---------|-----------|-----------------|-----------|
| `crawler-erp` | `s3://.../erp/` | `acme_finance_raw_erp_dev` | Discover Parquet schemas, 2-level table detection |
| `crawler-crm` | `s3://.../crm/` | `acme_finance_raw_crm_dev` | Detect Hive partitions (period_yyyymm) |
| `crawler-epm` | `s3://.../epm/` | `acme_finance_raw_epm_dev` | Detect Hive partitions |
| `crawler-curated` | `s3://.../iceberg/` | `acme_finance_curated_dev` | Detect Iceberg tables via metadata.json |

**Step 3: Glue ETL Job — Raw → Curated (Iceberg)**

**Script:** `pipelines/glue_jobs/raw_to_curated.py`

```python
# Core ETL loop (per table):
for table_name in source_tables:
    # 1. Read via Glue DynamicFrame (handles partitions + schema)
    dyf = glueContext.create_dynamic_frame.from_catalog(
        database=source_database, table_name=table_name)
    df = dyf.toDF()

    # 2. Add audit columns
    df = df.withColumn("_ingest_date", current_date())
           .withColumn("_ingest_run_id", lit(run_id))

    # 3. Write as Iceberg (ACID upsert via createOrReplace)
    df.writeTo(f"glue_iceberg.{target_database}.{table_name}")
      .using("iceberg")
      .tableProperty("format-version", "2")
      .tableProperty("write.format.default", "parquet")
      .createOrReplace()
```

**Key architectural decisions:**

| Decision | Choice | Why |
|----------|--------|-----|
| Table format | Apache Iceberg v2 | ACID guarantees, schema evolution, time travel, Redshift Spectrum compatible |
| Write mode | `createOrReplace()` | Full refresh — simpler than CDC for lab workload. Iceberg handles metadata atomically |
| Catalog | Glue Data Catalog via `glue_iceberg` Spark catalog | Single metadata store for Glue ETL + Redshift Spectrum + crawlers |
| Workers | G.1X × 2 (4 vCPU, 16GB total) | Sufficient for ~22MB raw data; auto-scales if data grows |
| Spark config | `spark.sql.catalog.glue_iceberg.io-impl=S3FileIO` | Native S3 file I/O for Iceberg |

**Step 4: Step Functions Orchestration**

```
                    ┌──────────────────────────┐
                    │  EventBridge Rule         │
                    │  06:00 UTC daily          │
                    │  (currently disabled)     │
                    └────────────┬─────────────┘
                                 │
                    ┌────────────▼─────────────┐
                    │  Step Functions           │
                    │  acme-finance-dev-refresh │
                    └────────────┬─────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                  │
    ┌─────────▼──────┐  ┌───────▼────────┐  ┌──────▼─────────┐
    │  Glue ETL      │  │  Glue ETL      │  │  Glue ETL      │
    │  --source_db:  │  │  --source_db:  │  │  --source_db:  │
    │  raw_erp       │  │  raw_crm       │  │  raw_epm       │
    │  (13 tables)   │  │  (6 tables)    │  │  (5 tables)    │
    └────────┬───────┘  └───────┬────────┘  └──────┬─────────┘
              │                  │                  │
              └──────────────────┼──────────────────┘
                                 │  All 3 succeed (parallel)
                    ┌────────────▼─────────────┐
                    │  Glue Crawler             │
                    │  (curated — detects new   │
                    │   Iceberg table versions) │
                    └────────────┬─────────────┘
                                 │
                    ┌────────────▼─────────────┐
                    │  dbt run                  │
                    │  (23 models, 41 tests)    │
                    │  staging → intermediate   │
                    │  → marts                  │
                    └──────────────────────────┘
```

**Step 5: dbt Transformation — Redshift Serverless**

**Connection:** Redshift Spectrum external schema `acme_finance_curated_dev` reads Iceberg tables directly from S3 via Glue Catalog. No data copying — Spectrum pushes predicates to S3.

**Layer 1 — Staging (`analytics_dev_staging`)**

Purpose: 1:1 schema-conform views of curated tables. Rename columns, cast types, apply conventions.

```sql
-- Example: stg_crm__arr_movement.sql
SELECT
    arr_movement_id,
    account_id AS customer_id,    ← rename for downstream joins
    segment    AS product_segment,
    movement_type,
    arr_change,
    starting_arr,
    ending_arr,
    period_yyyymm
FROM {{ source('curated_crm', 'arr_movement') }}
```

**Layer 2 — Intermediate (`analytics_dev_intermediate`)**

Purpose: Business logic joins, enrichment, and aggregation.

```
int_gl_entries_enriched        ← GL lines + COA + cost center + entity
  │                              Adds: account_type, pnl_rollup, is_revenue,
  │                              is_expense, entity mapping
  │
  ├─► int_revenue_monthly      ← SUM(net_amount) WHERE is_revenue
  │                              GROUP BY entity, account_segment, period
  │
  └─► int_expense_monthly      ← SUM(net_amount) WHERE is_expense
                                 GROUP BY entity, pnl_rollup, period
```

**Layer 3 — Marts (`analytics_dev_marts`)**

Purpose: Consumption-ready facts and dimensions for dashboards and AI agent.

| Table | Grain | Key Columns | Powers |
|-------|-------|-------------|--------|
| `mart_pl` | entity × fiscal_year × quarter × period | total_revenue, cogs, gross_profit, sales_marketing, research_dev, general_admin, total_opex, operating_income | P&L dashboard, forecast baseline |
| `fct_arr` | customer × period × movement_type | starting_arr, arr_change, ending_arr, segment_tier, region | ARR waterfall, forecast driver rates |
| `fct_gl_entries` | journal_line (atomic) | debit_amount, credit_amount, net_amount, account_type, pnl_rollup | Variance RCA, anomaly detection |
| `fct_revenue` | entity × segment × period | revenue_amount | Revenue trend charts |
| `fct_expense` | entity × cost_center × pnl_rollup × period | expense_amount | Expense analysis |
| `mart_ar_aging` | invoice (open) | amount_due, days_overdue, aging_bucket | AR aging dashboard, anomaly detector |
| `dim_customer` | customer_id | customer_name, segment_tier, region, billing_country | ARR enrichment (LEFT JOIN from fct_arr) |
| `dim_account` | account_id | account_name, account_type, pnl_rollup | GL enrichment |
| `dim_entity` | entity_id | entity_name, currency | Filtering |
| `dim_cost_center` | cost_center_id | cc_name, cc_function, entity_id | Expense drill-down |
| `dim_date` | date_day | fiscal_year, fiscal_quarter, period_yyyymm | Calendar spine |

**dbt Tests (41 total):**
- Uniqueness: all primary keys (dim_*, fct_gl_entries)
- Not-null: all primary keys + critical amounts
- Accepted values: account_type ∈ {asset, liability, equity, revenue, expense}, entity_id ∈ {US, EMEA, APAC}
- Custom: `assert_gl_balanced` (debits = credits per journal), `assert_pl_identity` (operating_income = gross_profit - total_opex)

#### Forecasting Engine — Driver-Based ARR Cohort Model (Level 400)

The `ForecastMetrics` action group uses a proper SaaS driver model instead of naive trend extrapolation.

**ARR Bridge Formula (per tier, per month):**

```
Starting_ARR     = prior month's Ending_ARR
Churn            = -(Starting_ARR × monthly_churn_rate)
Contraction      = -(Starting_ARR × monthly_contraction_rate)
Expansion        = Starting_ARR × monthly_expansion_rate
New Logo         = blended monthly ACV (pipeline months 1-3, run-rate months 4-12)
Ending_ARR       = Starting_ARR + Churn + Contraction + Expansion + New Logo
Monthly Revenue  = (Total Ending_ARR / 12) / (1 - nonsub_ratio)
```

**Three tiers with independent dynamics:**

| Metric | Enterprise | Commercial | SMB |
|--------|-----------|-----------|-----|
| Net Revenue Retention | 107% | 89% | 49% |
| Gross Revenue Retention | 96% | 79% | 45% |
| Annual Churn Rate | 0% | 17% | 49% |
| Annual Expansion | 11% | 9% | 4% |

**Scenario overrides (what-if on growth levers):**

| Parameter | Default | Effect |
|-----------|---------|--------|
| `churn_pct_multiplier` | 1.0 | 0.5 = halve churn → +4.5% revenue at month 12 |
| `contraction_pct_multiplier` | 1.0 | Adjust downsell rates |
| `expansion_pct_multiplier` | 1.0 | Adjust upsell/cross-sell rates |
| `new_logo_pct_change` | 0.0 | +50 = 50% more new bookings → +23.5% revenue |

**Data flow through the forecast Lambda:**

```
Query 1: fct_arr (T4Q)              Query 2: fct_arr + opportunity    Query 3: mart_pl (T4Q)
├─ Churn rates by tier               ├─ New logo monthly run-rate      ├─ OpEx ratios (COGS%, S&M%,
├─ Contraction rates                 │   by tier                       │   R&D%, G&A%)
├─ Expansion rates                   └─ Weighted pipeline ACV          └─ Historical monthly revenue
└─ Ending ARR by tier                                                     (24 months)
         │                                    │                                    │
         └────────────────────────────────────┼────────────────────────────────────┘
                                              │
                                   ┌──────────▼──────────┐
                                   │  Roll Forward ARR   │
                                   │  12 months × 3 tiers│
                                   │  Apply scenario     │
                                   │  overrides           │
                                   └──────────┬──────────┘
                                              │
                                   ┌──────────▼──────────┐
                                   │  P&L Projection     │
                                   │  Revenue = ARR/12   │
                                   │  + nonsub uplift    │
                                   │  Expenses = Rev ×   │
                                   │  opex ratios        │
                                   │  OI = GP - OpEx     │
                                   └──────────┬──────────┘
                                              │
                                   ┌──────────▼──────────┐
                                   │  Confidence Bands   │
                                   │  ±1.96σ from        │
                                   │  historical CoV     │
                                   └─────────────────────┘
```

---

### 6. Source Systems

| System | Simulated Service | Tables | Records | Key Data |
|--------|---------|--------|---------|------|
| ERP | NetSuite/SAP-like (Python generators) | 13 tables | ~800K rows | GL journals (header + line), AR invoices/receipts, AP invoices/payments, customers, vendors, entities, chart of accounts, cost centers, fixed assets, depreciation |
| CRM | Salesforce (Python generators) | 6 tables | ~10K rows | Accounts, contacts, opportunities + line items, ARR movements (Hive-partitioned), pipeline snapshots (partitioned) |
| EPM | Anaplan/Adaptive (Python generators) | 5 tables | ~6K rows | Budget versions, forecast versions, plan lines (partitioned), headcount plan, driver assumptions |

**Synthetic data characteristics:**
- 3 fiscal years (FY23–FY25): $1.6B → $2.0B → $2.3B revenue (realistic SaaS growth trajectory)
- 800 customers (10% quick-mode scale), 3 entities (US, EMEA, APAC)
- Salesforce-shaped fiscal calendar (FY ends Jan 31)
- CRM `account_id` = ERP `customer_id` (shared UUIDs generated in Phase 2B, carried through Phase 2C)
- Ratable revenue recognition across service periods, capped at fiscal year boundary
- Every GL journal balances: SUM(debits) = SUM(credits) — enforced at generation time
- Seeded anomalies: aged AR (>90 days), S&M overspend (2× spike), asset disposal losses, stalled pipeline deals

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
EventBridge (06:00 UTC, configurable) → Step Functions (acme-finance-dev-refresh)
  │
  ├─ Parallel (3 branches):
  │   ├─ Glue ETL: raw_erp → curated (13 tables, Iceberg createOrReplace)
  │   ├─ Glue ETL: raw_crm → curated (6 tables, Hive-partitioned → Iceberg)
  │   └─ Glue ETL: raw_epm → curated (5 tables, Hive-partitioned → Iceberg)
  │
  ├─ Converge (all 3 succeed):
  │   └─ Glue Crawler (curated) → detect new Iceberg table versions
  │
  └─ Sequential:
      └─ dbt run (23 models, 41 tests)
          └─ staging → intermediate → marts
              └─ Consumption-ready data in analytics_dev_marts
```

**Idempotent:** Every branch uses `createOrReplace()` — re-run any step safely. Iceberg handles metadata atomically.

**Glue ETL detail:** PySpark reads via `DynamicFrame.from_catalog()`, adds audit columns (`_ingest_date`, `_ingest_run_id`), writes as Iceberg v2 with Parquet format. See `pipelines/glue_jobs/raw_to_curated.py`.

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

### Redshift Serverless vs Provisioned Cluster

**Chose:** Redshift Serverless (8–32 RPU auto-scaling, auto-pause)  
**Reason:** Lab/startup workload doesn't justify 24/7 provisioned cluster. Pay per query — auto-pauses when idle, auto-scales under load. No node management, patching, or resizing operations.  
**Trade-off:** Cold start after idle pause (~15–30s). Less control over compute/storage decoupling. No reserved instance pricing.

### Apache Iceberg vs Raw Parquet

**Chose:** Apache Iceberg v2 table format for curated zone  
**Reason:** ACID write guarantees (atomic metadata swap via `createOrReplace()`), schema evolution (add columns without rewriting data), time travel (query historical snapshots), and native Redshift Spectrum compatibility — zero-copy from S3 to Redshift queries.  
**Trade-off:** Adds metadata overhead (manifest files, snapshot history). Requires Glue Catalog as Iceberg catalog (`glue_iceberg` Spark catalog). More complex than plain Parquet directory reads.

### dbt vs Stored Procedures

**Chose:** dbt (data build tool) for Redshift transformations  
**Reason:** Version-controlled SQL in Git, built-in testing framework (41 tests on every run), lineage graph, incremental materialization support, and consistent staging → intermediate → marts modeling convention. Tests include custom GL balance assertions and P&L identity checks.  
**Trade-off:** Requires dbt CLI installation and profiles.yml configuration. No native Redshift scheduling (triggered via Step Functions). Additional learning curve vs. raw SQL.

### Glue ETL vs EMR

**Chose:** AWS Glue ETL (managed PySpark)  
**Reason:** Serverless — no cluster management. 2 G.1X workers sufficient for ~22MB raw data. Integrated with Glue Data Catalog for both source (raw) and target (Iceberg) tables. Auto-scales if data grows.  
**Trade-off:** Higher per-DPU cost than EMR. Less control over Spark configuration. Cold start on each job invocation (~1–2 min).

### Bedrock Agent vs Custom RAG Pipeline

**Chose:** Amazon Bedrock Agent with 6 action groups  
**Reason:** Managed agent orchestration — Bedrock handles tool selection, parameter extraction, and response synthesis. No vector DB to maintain (AgentCore Memory for semantic recall). Claude Sonnet for high-quality financial analysis responses. Each action group is a standalone Lambda with focused logic.  
**Trade-off:** Less control over prompt engineering within the agent loop. Action group response size limits. Vendor lock-in to Bedrock agent runtime.

### Synthetic Data vs Anonymized Production Data

**Chose:** Python-generated synthetic financial data  
**Reason:** Full control over data characteristics — 3 fiscal years of realistic SaaS growth ($1.6B → $2.3B), 800 customers across 3 entities, proper GL double-entry balancing, seeded anomalies for testing (aged AR, S&M overspend, asset disposal, stalled pipeline). CRM `account_id` = ERP `customer_id` via shared UUIDs.  
**Trade-off:** Doesn't capture real-world data quirks (encoding issues, missing fields, schema drift). Anomalies are deterministic, not emergent. Scale limited to 10% mode for fast iteration.

### Driver-Based ARR Forecast vs Linear Trend Extrapolation

**Chose:** Driver-based ARR cohort model with tier-specific rates  
**Reason:** Captures SaaS-specific dynamics (churn/contraction/expansion/new logo per tier) that linear trend misses. ARR bridge is the standard SaaS finance model — CFOs and investors understand it. Scenario overrides enable natural what-if analysis ("what if churn doubles?"). Rates computed from trailing 4 quarters of actual data.  
**Trade-off:** Requires more complex data pipeline (3 Redshift queries vs. 1). Assumes trailing rates are predictive. New-logo cap (25% annual) is a hard constraint that may underestimate hypergrowth scenarios.

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

### Lambda Driver-Based Forecast vs SageMaker

**Chose:** Driver-based ARR cohort model in Lambda — pure Python, zero ML dependencies  
**Reason (5 factors):**

1. **Cost** — A SageMaker real-time endpoint (ml.t3.medium) costs ~$50/month minimum, which alone hits the project's entire $50/month budget target. The Lambda forecast runs in <2s per invocation and costs effectively $0 at lab traffic.
2. **Business interpretability** — The ARR bridge model (churn/expansion/new logo per tier) speaks the language of SaaS finance. CFOs and investors understand tier-specific NRR, GRR, and new logo ACV — they don't need ML feature importance explanations.
3. **No training cycle** — Rates are computed from trailing 4 quarters on every request. There's no model to train, retrain, version, or deploy — no SageMaker training jobs, model registry, or endpoint management.
4. **Operational simplicity** — The forecast code runs inside the same Lambda + Redshift Data API pattern as every other action group. Adding SageMaker means a new IAM role, VPC endpoint or NAT Gateway (~$32/month), model artifact bucket, and endpoint auto-scaling configuration.
5. **Scenario overrides** — The driver-based model enables natural what-if analysis ("what if churn doubles?") by directly adjusting the input rates. ML models don't support this kind of counterfactual reasoning without retraining.

**When SageMaker would be the right call:**
- Hundreds of SKU-level or customer-level time series requiring hierarchical forecasting (→ SageMaker Canvas or Amazon Forecast)
- Sub-daily granularity with complex exogenous variables (marketing spend, macro indicators)
- Production SLA requiring <50ms p99 latency on predictions (→ SageMaker real-time endpoint with model compilation)
- Model experimentation lifecycle where data scientists need notebooks, experiments, and A/B testing

**Trade-off:** The current model assumes trailing rates are predictive — it won't capture step-function changes (new product launches, market shocks). The 25% annual new-logo cap prevents unrealistic projections but may underestimate hypergrowth. If growth patterns become non-linear, adding Prophet or statsforecast as an ensemble layer inside the same Lambda is the natural next step before reaching for SageMaker.

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

**Last Updated:** 2026-05-18
