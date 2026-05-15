# Phase 9 — Management Commentary, Anomaly Detection & Financial Health

**Status:** ✅ Complete  
**Delivered:** 2026-05-09  
**Depends on:** Phase 8 (AgentCore Gateway + Memory, 5 Lambda tools)

---

## Overview

Phase 9 adds two capabilities that complete the AI analyst's toolkit:

1. **Management Commentary Automation** — the AI chains `variance_rca` + `text_to_sql` to draft the written numbers section of the monthly board pack. Previously 2–4 hours of FP&A analyst time per month → now ~45 seconds.

2. **Anomaly Detection** — a new `anomaly_detect` Lambda scans financial data for irregularities across four detectors: aged AR, expense spikes, asset disposal losses, and forecast-vs-actual variance. Exposed as the 6th Bedrock Agent action group and as a standalone FastAPI endpoint.

```
                     ┌──────────────────────────────────────┐
                     │          Phase 9 Additions           │
                     ├──────────────────────────────────────┤
                     │                                      │
  Commentary ──────► │  POST /commentary                    │
  (AI-drafted)       │    → invoke_agent (structured prompt) │
                     │    → Agent chains: variance_rca +    │
                     │      text_to_sql → 4-paragraph       │
                     │      CFO narrative                   │
                     │                                      │
  Anomalies ───────► │  GET /metrics/anomalies              │
  (Automated scan)   │    → anomaly_detect Lambda directly  │
                     │    → 4 SQL-based detectors           │
                     │    → Ranked findings by severity     │
                     │                                      │
  Agent ───────────► │  AnomalyDetection action group       │
  (NL queries)       │    → "Any anomalies in FY2024?"      │
                     │    → Agent calls scan_anomalies      │
                     └──────────────────────────────────────┘
```

---

## Management Commentary

### Architecture

```
Streamlit "Commentary" tab / React /commentary page
        │
        ▼ POST /commentary {period_yyyymm, entity_id?, session_id?}
FastAPI /commentary endpoint
        │
        ▼ invoke_agent(structured_prompt)
Bedrock Agent (Claude Sonnet 4.6)
        │
        ├─▶ variance_rca Lambda  ──→ top 5 budget variance drivers
        └─▶ text_to_sql Lambda   ──→ mart_pl P&L summary for period
        │
        ▼ drafts 4-paragraph CFO narrative
FastAPI returns commentary text
        │
        ▼
UI renders commentary + download button
```

### API Contract

**`POST /commentary`**

Request:
```json
{
  "period_yyyymm": "202409",
  "entity_id": "EMEA",
  "session_id": "optional-session-id"
}
```

Response:
```json
{
  "commentary": "Revenue for September 2024 came in at $152.3M...",
  "answer": "Revenue for September 2024..."
}
```

**Parameters:**
- `period_yyyymm` — YYYYMM string (required)
- `entity_id` — `US | EMEA | APAC` (optional, default: all entities)
- `session_id` — optional; for memory continuity

### Commentary Prompt Design

The endpoint constructs a structured 5-step prompt sent to the Bedrock Agent:

1. Call `variance_rca` → top 5 variances for the period/entity
2. Call `text_to_sql` → P&L metrics from `mart_pl` ordered by `|variance_pct|`
3. Draft 4 paragraphs covering: **Revenue · Gross Margin · OpEx · Operating Margin + Outlook**
4. Format: board-level language, numbers in $M (1dp), percentages to 1dp
5. Reference specific cost centers and accounts from the variance output

### RBAC

Commentary generation requires **admin** role (`Depends(require_admin)`) when authentication is enabled. This reflects the real-world pattern: only FP&A leads and controllers should generate official commentary that may be included in board materials.

---

## Anomaly Detection

### New Lambda: `anomaly_detect`

**File:** `agent/lambdas/anomaly_detect/handler.py`  
**Function name:** `acme-finance-dev-anomaly-detect`  
**Runtime:** Python 3.12  
**Timeout:** 120s

### Four SQL-Based Detectors

| Detector | What It Finds | Severity Logic | Data Source |
|----------|--------------|----------------|-------------|
| **Aged AR** | Customer invoices 90+ days overdue with amount > $100K | High: >$500K, Medium: >$200K, Low: >$100K | `mart_ar_aging` |
| **Expense Spike** | Monthly expense in any account >2× the trailing 3-month average | High: >3× avg, Medium: >2.5×, Low: >2× | `fct_gl_entries` |
| **Disposal Loss** | Fixed asset write-offs or disposal journal entries | High: >$1M, Medium: >$500K, Low: >$100K | `fct_gl_entries` |
| **Forecast Variance** | Actuals vs plan gap >15% for any P&L line | High: >30%, Medium: >20%, Low: >15% | `fct_gl_entries` vs `stg_epm__plan_line` |

### Action Group: `AnomalyDetection`

| Function | Parameters | Output |
|----------|-----------|--------|
| `scan_anomalies` | `fiscal_year` (required), `period_yyyymm?`, `entity_id?` | Ranked anomaly findings with severity, amounts, descriptions |

**Response structure:**
```json
{
  "anomalies": [
    {
      "anomaly_type": "aged_ar",
      "severity": "high",
      "entity_id": "US",
      "amount": 750000,
      "description": "Customer ACME Corp has $750K in invoices 120+ days overdue",
      "customer_name": "ACME Corp",
      "days_overdue": 120
    }
  ],
  "scan_period": "FY2024",
  "entity_filter": "ALL",
  "total_count": 12,
  "high_severity": 3,
  "medium_severity": 5,
  "low_severity": 4
}
```

### FastAPI Endpoint

**`GET /metrics/anomalies`**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `fiscal_year` | int | 2024 | Fiscal year to scan |
| `period_yyyymm` | string | — | Optional month filter |
| `entity_id` | string | — | Optional entity filter |

This endpoint calls the `anomaly_detect` Lambda directly (not through the Bedrock Agent) for the React dashboard's Anomalies page. The agent can also invoke it via the `AnomalyDetection` action group for natural-language queries like *"Are there any financial anomalies?"*

### React Anomalies Page (`/anomalies`)

- Severity badge counts (high/medium/low) at the top
- Filterable table of all findings
- Color-coded severity indicators
- Entity and period filter controls

---

## Files Changed / Created

### New Files

| File | Purpose |
|------|---------|
| `agent/lambdas/anomaly_detect/handler.py` | 4-detector anomaly scanning Lambda |

### Modified Files

| File | Change |
|------|--------|
| `infra/modules/bedrock/main.tf` | Added `anomaly_detect` Lambda + `AnomalyDetection` action group |
| `ui/api/main.py` | Added `POST /commentary`, `GET /metrics/anomalies`, anomaly types/interfaces |
| `ui/app.py` | Added "📝 Commentary" tab (5th tab) |
| `ui-react/src/pages/Anomalies.tsx` | React anomalies page |
| `ui-react/src/pages/Commentary.tsx` | React commentary page |
| `ui-react/src/api/client.ts` | `getAnomalies()` and `generateCommentary()` API functions |

---

## Terraform Resources Added

| Resource | Type |
|----------|------|
| `aws_lambda_function.anomaly_detect` | Lambda function (Phase 9 tag) |
| `aws_bedrockagent_agent_action_group.anomaly_detection` | Bedrock Agent action group |
| `aws_lambda_permission.bedrock_invoke_phase8["anomaly_detect"]` | Permission for Bedrock to invoke |

---

## Testing

```bash
# Test commentary API directly
curl -s -X POST http://localhost:8000/commentary \
  -H "Content-Type: application/json" \
  -d '{"period_yyyymm":"202409","entity_id":"EMEA"}' | python3 -m json.tool

# Expected: commentary field with 4 paragraphs referencing EMEA variance drivers

# Test anomaly scanning
curl -s "http://localhost:8000/metrics/anomalies?fiscal_year=2024" | python3 -m json.tool

# Expected: anomalies array with findings sorted by severity

# Test anomaly detection via agent
curl -s -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"question":"Are there any financial anomalies or unusual items in FY2024?"}'
```

## Verification Checklist

- [ ] `POST /commentary` returns 4-paragraph narrative in <45 seconds
- [ ] Commentary references specific variance drivers from `variance_rca` output
- [ ] Numbers match P&L mart (cross-check: gross margin ~77.5% for FY2024)
- [ ] Entity filter works: EMEA commentary mentions EMEA cost centers
- [ ] `GET /metrics/anomalies` returns structured anomaly findings
- [ ] Anomaly severity ranking is correct (high → medium → low)
- [ ] Agent correctly routes "any anomalies?" to `AnomalyDetection` action group
- [ ] Memory ID flows through: commentary session recalls prior analyst context

---

## What Does NOT Change

- Phase 8 Lambdas (text_to_sql, forecast, variance_rca, describe_metric, whatif_sim)
- AgentCore Gateway and Memory resources
- dbt models and Redshift schemas
- Existing P&L, ARR, AR Aging dashboard tabs

---

## Agent Tool Suite Summary (End of Phase 9)

| # | Action Group | Lambda | Functions | Phase |
|---|-------------|--------|-----------|-------|
| 1 | QueryFinanceData | text_to_sql | execute_sql, describe_schema | 6 |
| 2 | ForecastMetrics | forecast | forecast_revenue, forecast_expense, forecast_operating_income | 8 |
| 3 | VarianceRCA | variance_rca | variance_rca | 8 |
| 4 | MetricGlossary | describe_metric | describe_metric, list_metrics | 8 |
| 5 | WhatIfSimulation | whatif_sim | whatif_sim | 8 |
| 6 | AnomalyDetection | anomaly_detect | scan_anomalies | 9 |

---

## Next: Phase 10 — Board Pack PDF Generator & React SPA
