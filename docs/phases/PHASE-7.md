# Phase 7: Analytics API & Dashboard

**Status:** ✅ Complete  
**Delivered:** 2026-05-06  
**Depends on:** Phase 5 (dbt marts), Phase 6 (Bedrock Agent)

---

## Overview

Phase 7 wraps the data warehouse and AI agent in a two-tier web application: a **FastAPI backend** that exposes REST endpoints for finance data and AI chat, and a **Streamlit dashboard** for interactive exploration. This phase establishes the application layer that all subsequent phases build on.

```
Browser (Streamlit :8501)
   ↓  HTTP / REST
FastAPI (uvicorn :8000)
   ├── /health           → Liveness check
   ├── /chat             → Bedrock Agent (Claude Sonnet 4.6) — single-response
   ├── /chat/stream      → Bedrock Agent — SSE streaming response
   ├── /metrics/pl       → Redshift Data API → mart_pl
   ├── /metrics/arr      → Redshift Data API → fct_arr
   ├── /metrics/ar_aging → Redshift Data API → mart_ar_aging
   └── /metrics/revenue  → Redshift Data API → fct_revenue
```

---

## Files

| File | Purpose |
|------|---------|
| `ui/api/main.py` | FastAPI app — all endpoints, Bedrock Agent client, AgentCore Memory integration |
| `ui/api/redshift.py` | Redshift Data API helper — async-poll wrapper with adaptive timing |
| `ui/api/config.py` | Env-var driven config (agent IDs, workgroup, schema, Cognito, AgentCore) |
| `ui/app.py` | Streamlit dashboard — multi-tab finance UI |

---

## FastAPI Backend

### Redshift Query Helper (`redshift.py`)

The `query()` function wraps the Redshift Data API's async execution model:

1. `ExecuteStatement` — submits SQL (returns immediately with statement ID)
2. Poll `DescribeStatement` until `FINISHED`/`FAILED`/`ABORTED`
3. `GetStatementResult` — fetch rows

**Adaptive poll schedule** (not fixed 1s intervals):
```
0.15s × 5 polls  →  fast check for simple queries (0–0.75s)
0.50s × 5 polls  →  moderate wait (0.75–3.25s)
1.00s × ∞ polls  →  steady state (3.25s+, up to max_polls=90)
```

This reduces latency for fast queries (which dominate in dashboards) while still handling long-running analytical queries.

**IAM authentication:** Uses `WorkgroupName` only (no `SecretArn` or `DbUser`). Redshift auto-creates user `IAMR:<role-name>` which needs explicit `GRANT USAGE/SELECT` on the marts schema.

### Configuration (`config.py`)

All config is environment-variable driven with sensible defaults for local dev:

```python
AWS_PROFILE = None if os.getenv("AWS_LAMBDA_FUNCTION_NAME") else os.getenv("AWS_PROFILE", "acme-admin")
AWS_REGION  = os.getenv("AWS_REGION", "us-east-1")

BEDROCK_AGENT_ID       = os.getenv("BEDROCK_AGENT_ID", "LUUHZWRDA4")
BEDROCK_AGENT_ALIAS_ID = os.getenv("BEDROCK_AGENT_ALIAS_ID", "TSTALIASID")

REDSHIFT_WORKGROUP = os.getenv("REDSHIFT_WORKGROUP", "acme-finance-dev")
REDSHIFT_DATABASE  = os.getenv("REDSHIFT_DATABASE", "dev")
MARTS_SCHEMA       = "analytics_dev_marts"

AGENTCORE_MEMORY_ID   = os.getenv("AGENTCORE_MEMORY_ID", "acme_finance_dev_memory-F0GIOl5mcE")
AGENTCORE_STRATEGY_ID = os.getenv("AGENTCORE_STRATEGY_ID", "financeSemanticMemory-jg6xTm9BFx")

COGNITO_USER_POOL_ID = os.getenv("COGNITO_USER_POOL_ID", "")
COGNITO_CLIENT_ID    = os.getenv("COGNITO_CLIENT_ID", "")
```

**Lambda detection:** When `AWS_LAMBDA_FUNCTION_NAME` is set (automatically by Lambda runtime), `AWS_PROFILE` is set to `None` — boto3 uses the execution role's credentials instead of a named profile. This single line makes all boto3 calls work in both local and Lambda environments.

### Startup Warmup

On application start, a background thread fires `SELECT 1` to wake Redshift Serverless (which auto-pauses after idle). This amortises the 30–60s cold-start penalty across the first real user request.

---

## API Reference

### Data Endpoints

| Endpoint | Method | Query Params | Returns |
|----------|--------|-------------|---------|
| `/health` | GET | — | `{status: "ok", agent_id}` |
| `/metrics/pl` | GET | `fiscal_year`, `entity_id` | P&L rows from `mart_pl` |
| `/metrics/arr` | GET | `fiscal_year` | ARR movement rows from `fct_arr` |
| `/metrics/ar_aging` | GET | `fiscal_year` | AR aging rows from `mart_ar_aging` |
| `/metrics/revenue` | GET | `fiscal_year`, `entity_id` | Revenue rows from `fct_revenue` |

All `/metrics/*` endpoints use the same pattern:
1. Build SQL with optional WHERE filters
2. Call `redshift.query(sql, max_rows=500)`
3. Return the result set as JSON array

### Chat Endpoints

| Endpoint | Method | Body/Params | Returns |
|----------|--------|-------------|---------|
| `/chat` | POST | `{question, session_id?, memory_id?}` | `{answer, session_id, memory_id}` |
| `/chat/stream` | GET | `question`, `session_id`, `memory_id?` | SSE text stream |

**Chat flow (Phase 8 enhanced):**
1. Retrieve top-5 semantically relevant past Q&A pairs from AgentCore Memory (using `memory_id` as namespace)
2. Prepend memory context to the user's question
3. Call `invoke_agent()` with `agentId`, `agentAliasId`, `sessionId`, `inputText`, and optionally `memoryId`
4. Stream or collect the response
5. Background thread: store the Q&A exchange to AgentCore semantic memory

**Streaming (`/chat/stream`):** Uses `StreamingResponse` with `text/event-stream` content type. On Lambda, this requires `RESPONSE_STREAM` invoke mode and Lambda Web Adapter's `AWS_LWA_INVOKE_MODE=response_stream` setting. Tokens arrive progressively — not buffered.

---

## Streamlit Dashboard (`ui/app.py`)

### 📊 P&L Tab
- **KPI cards**: Total Revenue, Gross Profit (w/ margin %), Operating Income, Total OpEx
- **Bar chart**: Revenue by entity × quarter (grouped, color-coded US/EMEA/APAC)
- **Waterfall chart**: Full-year P&L decomposition (Revenue → COGS → Gross Profit → S&M/R&D/G&A → Op. Income)
- **Line chart**: Gross margin and operating margin trend by quarter

### 📈 ARR Bridge Tab
- **KPI cards**: New ARR, Expansion, Contraction, Churn, Net New ARR
- **Stacked bar**: ARR movement by period (green/blue/amber/red for new/expansion/contraction/churn)
- **Summary table**: Total ARR change and movement count by type

### 💳 AR Aging Tab
- **KPI cards**: Total Open AR, Past Due (31+ days), Invoice count
- **Donut chart**: AR split by aging bucket (0-30 / 31-60 / 61-90 / 90+)
- **Heatmap**: AR amount ($M) by bucket × customer segment tier

### 🤖 AI Analyst Tab
- Conversational chat powered by Phase 6 Bedrock Agent
- Maintains session continuity across questions (single `session_id` per browser session)
- AgentCore Memory integration (`memory_id` stored in `st.session_state`)
- Suggested starter questions rendered as buttons on first load
- Answers formatted with markdown tables and analysis

### 📝 Commentary Tab (Added in Phase 9)
- Period and entity selector
- AI-generated CFO management commentary
- Download as `.txt` file

### 📋 Board Pack Tab (Added in Phase 10)
- One-click PDF generation: P&L + ARR + AR Aging + Commentary
- Download as branded PDF

---

## Running Locally

### 1. Start the FastAPI backend
```bash
cd /path/to/acme-finance
PYTHONPATH=. .venv/bin/uvicorn ui.api.main:app --reload --port 8000
```

### 2. Start the Streamlit dashboard
```bash
cd /path/to/acme-finance
PYTHONPATH=. .venv/bin/streamlit run ui/app.py --server.port 8501
```

### 3. Open the browser
- Dashboard: http://localhost:8501
- API docs: http://localhost:8000/docs

### Environment Variables (all have defaults for dev)

| Variable | Default | Description |
|----------|---------|-------------|
| `AWS_PROFILE` | `acme-admin` (auto `None` on Lambda) | AWS CLI profile |
| `AWS_REGION` | `us-east-1` | AWS region |
| `BEDROCK_AGENT_ID` | `LUUHZWRDA4` | Bedrock Agent ID |
| `BEDROCK_AGENT_ALIAS_ID` | `TSTALIASID` | Agent alias (TSTALIASID = test alias for DRAFT) |
| `REDSHIFT_WORKGROUP` | `acme-finance-dev` | Redshift Serverless workgroup |
| `REDSHIFT_DATABASE` | `dev` | Redshift database |
| `AGENTCORE_MEMORY_ID` | `acme_finance_dev_memory-F0GIOl5mcE` | AgentCore Memory ID |
| `AGENTCORE_STRATEGY_ID` | `financeSemanticMemory-jg6xTm9BFx` | Semantic memory strategy |
| `COGNITO_USER_POOL_ID` | `""` (disabled) | Cognito User Pool ID for JWT validation |
| `COGNITO_CLIENT_ID` | `""` (disabled) | Cognito App Client ID |

---

## Dependencies

```toml
# pyproject.toml
[project.dependencies]
fastapi = ">=0.115.0"
uvicorn = {version = ">=0.30.0", extras = ["standard"]}
boto3 = ">=1.35.0"
botocore = ">=1.35.0"
pydantic = ">=2.9.0"
pandas = ">=2.2.0"
reportlab = ">=4.2.0"    # Board pack PDF generation (Phase 10)
PyJWT = {version = ">=2.8.0", extras = ["crypto"]}  # JWT validation (deferred auth)
httpx = ">=0.27.0"       # JWKS key fetch (deferred auth)
```

---

## What Does NOT Change from Phase 6

- Bedrock Agent configuration and instruction
- text_to_sql Lambda function
- Redshift schemas and dbt models
- S3 data lake and Glue catalog
- All Terraform infrastructure

---

## Next: Phase 8 — AgentCore Gateway, Memory & Full Tool Suite
