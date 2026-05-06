# Phase 7: Analytics API & Dashboard

**Status:** ✅ Complete  
**Depends on:** Phase 5 (dbt marts), Phase 6 (Bedrock Agent)

---

## Overview

Phase 7 wraps the data warehouse and AI agent in a two-tier web application:

```
Browser (Streamlit)
   ↓  HTTP / REST
FastAPI (port 8000)
   ├── /chat          → Bedrock Agent (Claude Sonnet 4.6)
   ├── /metrics/pl    → Redshift Data API → analytics_dev_marts.mart_pl
   ├── /metrics/arr   → Redshift Data API → analytics_dev_marts.fct_arr
   ├── /metrics/ar_aging → Redshift Data API → analytics_dev_marts.mart_ar_aging
   └── /metrics/revenue  → Redshift Data API → analytics_dev_marts.fct_revenue
```

---

## Files

| File | Purpose |
|------|---------|
| [ui/api/main.py](../../ui/api/main.py) | FastAPI app — 5 endpoints |
| [ui/api/redshift.py](../../ui/api/redshift.py) | Redshift Data API helper (async-poll wrapper) |
| [ui/api/config.py](../../ui/api/config.py) | Env-var driven config (agent IDs, workgroup, schema) |
| [ui/app.py](../../ui/app.py) | Streamlit dashboard — 4 tabs |

---

## Dashboard Tabs

### 📊 P&L Tab
- **KPI cards**: Total Revenue, Gross Profit (w/ margin %), Operating Income, Total OpEx
- **Bar chart**: Revenue by entity × quarter (grouped, color-coded US/EMEA/APAC)
- **Waterfall chart**: Full-year P&L decomposition (Revenue → COGS → Gross Profit → S&M/R&D/G&A → Op. Income)
- **Line chart**: Gross margin and operating margin trend by quarter

### 📈 ARR Bridge Tab
- **KPI cards**: New ARR, Expansion, Contraction, Churn, Net New ARR
- **Stacked bar**: ARR movement by period (green/blue/amber/red for new/expansion/contraction/churn)
- **Summary table**: Total ARR change and movement count by type

### 🧾 AR Aging Tab
- **KPI cards**: Total Open AR, Past Due (31+ days), Invoice count
- **Donut chart**: AR split by aging bucket (0-30 / 31-60 / 61-90 / 90+)
- **Heatmap**: AR amount ($M) by bucket × customer segment tier

### 🤖 AI Analyst Tab
- Conversational chat powered by Phase 6 Bedrock Agent
- Maintains session continuity across questions (single session ID per browser session)
- Suggested starter questions rendered as buttons on first load
- Answers return formatted tables and analysis in markdown

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

### Environment variables (all have defaults for dev)
| Variable | Default | Description |
|----------|---------|-------------|
| `AWS_PROFILE` | `acme-admin` | AWS CLI profile |
| `AWS_REGION` | `us-east-1` | AWS region |
| `BEDROCK_AGENT_ID` | `LUUHZWRDA4` | Bedrock Agent ID |
| `BEDROCK_AGENT_ALIAS_ID` | `TSTALIASID` | Agent alias (TSTALIASID = latest prepared DRAFT) |
| `REDSHIFT_WORKGROUP` | `acme-finance-dev` | Redshift Serverless workgroup |
| `REDSHIFT_DATABASE` | `dev` | Redshift database |

---

## API Reference

| Endpoint | Method | Query Params | Returns |
|----------|--------|-------------|---------|
| `/health` | GET | — | `{status, agent_id}` |
| `/chat` | POST | — | `{answer, session_id}` |
| `/metrics/pl` | GET | `fiscal_year`, `entity_id` | P&L rows |
| `/metrics/arr` | GET | `fiscal_year` | ARR movement rows |
| `/metrics/ar_aging` | GET | `fiscal_year` | AR aging rows |
| `/metrics/revenue` | GET | `fiscal_year`, `entity_id` | Revenue rows |

---

## Next: Phase 8 — Forecasting & Variance RCA

Phase 8 adds statistical forecasting (revenue/expense projections) and a variance root-cause analysis engine. These will be exposed as additional Lambda action groups and dashboard tabs.
