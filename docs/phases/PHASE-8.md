# Phase 8: AgentCore Gateway, Memory & Full Tool Suite

**Status:** ✅ Complete  
**Delivered:** 2026-05-08  
**Depends on:** Phase 6 (Bedrock Agent), Phase 7 (FastAPI + Streamlit)

---

## Overview

Phase 8 transforms the single-tool agent into a full **AI finance platform** with three additions:

1. **Four new Lambda tools** — forecast, variance_rca, describe_metric, whatif_sim
2. **AgentCore Gateway** — MCP-compatible tool registry replacing individual action group wiring
3. **AgentCore Memory** — cross-session persistent semantic memory so the agent recalls analyst context across browser sessions

```
Analyst (Streamlit / React SPA)
   ↓  memory_id + session_id
FastAPI /chat
   ├── Retrieve top-5 memories from AgentCore Memory (semantic search)
   ├── Prepend memory context to user question
   ↓
Bedrock Agent (Claude Sonnet 4.6)
   ↓  Selects action group based on question type
   ├── QueryFinanceData    → text_to_sql Lambda   → Redshift (NL → SQL)
   ├── ForecastMetrics     → forecast Lambda       → Redshift (projection)
   ├── VarianceRCA         → variance_rca Lambda   → Redshift (actuals vs plan)
   ├── WhatIfSimulation    → whatif_sim Lambda      → Redshift (P&L scenario)
   └── MetricGlossary      → describe_metric        → Static glossary (no DB)
   ↓
FastAPI stores Q&A to AgentCore Memory (fire-and-forget)

AgentCore Gateway (MCP-compatible tool registry)
   └── Routes agent tool calls to Lambda functions

AgentCore Memory (SEMANTIC)
   └── Per-analyst cross-session recall
```

---

## New Lambda Tools

### ForecastMetrics (`forecast`)

**File:** `agent/lambdas/forecast/handler.py`  
**Function name:** `acme-finance-dev-forecast`  
**Timeout:** 120s

| Function | Parameters | Data Source | Output |
|----------|-----------|-------------|--------|
| `forecast_revenue` | `entity_id?`, `periods_ahead?` (default 4) | `fct_revenue` | N-period projection with trend + seasonality |
| `forecast_expense` | `entity_id?`, `periods_ahead?` (default 4) | `fct_expense` | N-period expense projection |
| `forecast_operating_income` | `entity_id?`, `periods_ahead?` | `mart_pl` | N-period operating income projection |

**Algorithm:** Linear trend decomposition with seasonal adjustment. Falls back to simple moving average if insufficient data points. Returns:
- Historical data points (actual values by period)
- Projected data points with confidence intervals
- Trend component, seasonal factor
- Growth vs. recent average percentage

### VarianceRCA (`variance_rca`)

**File:** `agent/lambdas/variance_rca/handler.py`  
**Function name:** `acme-finance-dev-variance-rca`  
**Timeout:** 120s

| Function | Parameters | Data Source | Output |
|----------|-----------|-------------|--------|
| `variance_rca` | `fiscal_year` (required), `fiscal_quarter?`, `entity_id?`, `top_n?` (default 10) | `fct_gl_entries` vs `stg_epm__plan_line` | Top N variance drivers ranked by absolute gap |

**How it works:** Joins actuals (`fct_gl_entries` aggregated by account) with plan data (`stg_epm__plan_line`) and computes:
- `actual_amount - plan_amount = variance`
- `variance / plan_amount × 100 = variance_pct`
- Sorted by `ABS(variance)` descending

The agent uses this to explain *why* actual results deviated from budget — the highest-value FP&A question.

### MetricGlossary (`describe_metric`)

**File:** `agent/lambdas/describe_metric/handler.py`  
**Function name:** `acme-finance-dev-describe-metric`  
**Timeout:** 30s

| Function | Parameters | Data Source | Output |
|----------|-----------|-------------|--------|
| `describe_metric` | `metric_name` (required) | Static glossary (12 metrics) | Definition, formula, table, benchmark |
| `list_metrics` | None | Static glossary | All metric names with short descriptions |

**Glossary coverage:** ARR, NRR, GRR, churn_rate, gross_margin, operating_margin, EBITDA, revenue, operating_income, DSO, CAC, LTV. Each entry includes: full name, definition, formula, source table, unit, direction (higher/lower is better), and SaaS benchmark ranges.

### WhatIfSimulation (`whatif_sim`)

**File:** `agent/lambdas/whatif_sim/handler.py`  
**Function name:** `acme-finance-dev-whatif-sim`  
**Timeout:** 120s

| Function | Parameters | Data Source | Output |
|----------|-----------|-------------|--------|
| `whatif_sim` | `line_item` (required), `pct_change` (required), `fiscal_year?` (default 2024), `entity_id?` | `mart_pl` | Baseline vs scenario P&L with bps impact |

**Example:** "What if we cut R&D by 15%?"  
→ Reads baseline P&L from `mart_pl`  
→ Applies -15% to `research_dev`  
→ Recalculates `total_opex`, `operating_income`, `operating_margin_pct`  
→ Returns: +348 bps operating margin improvement, +$62.9M operating income gain

**Valid `line_item` values:** revenue, cogs, sales_marketing (S&M), research_dev (R&D), general_admin (G&A), opex, operating_income. Aliases accepted (e.g., "R&D", "cost of goods sold").

---

## Agent Instruction Updates

Phase 8 replaces the Phase 6 instruction with a **tool selection guide** at the top:

```
TOOL SELECTION GUIDE:
- Ad-hoc data questions → use QueryFinanceData (execute_sql / describe_schema)
- Revenue or expense projections → use ForecastMetrics (forecast_revenue / forecast_expense)
- Actual vs. budget gaps → use VarianceRCA (variance_rca)
- "What if we change X by Y%?" → use WhatIfSimulation (whatif_sim)
- Definition of a KPI or metric → use MetricGlossary (describe_metric / list_metrics)
- "Any anomalies?", "financial health check" → use AnomalyDetection (scan_anomalies)
```

This replaces the Phase 6 instruction which only described `QueryFinanceData`. The agent now routes to the correct tool without user prompting.

---

## AgentCore Gateway

Replaces the per-Lambda `aws_bedrockagent_agent_action_group` wiring with a single MCP-compatible endpoint. Benefits:

- **One IAM policy** on the agent role (`bedrock-agentcore:InvokeTool` on Gateway ARN)
- **Centralised rate limiting** — per-tool throttle protects Redshift from burst queries
- **Single CloudWatch namespace** — one dashboard covers all tool invocations
- **Tool discovery** — agent sees tools as named MCP targets, not opaque ARNs

### Terraform Resources

| Resource | Name |
|----------|------|
| `aws_bedrockagentcore_gateway` | `acme-finance-dev-finance-tools` |
| `aws_bedrockagentcore_gateway_target` × 5 | text_to_sql, forecast, variance_rca, describe_metric, whatif_sim |
| `aws_iam_role` (gateway) | `acme-finance-dev-agentcore-gateway` |
| `aws_iam_role_policy` (gateway) | `invoke-tool-lambdas` |
| `aws_iam_role_policy` (agent) | `invoke-agentcore-gateway` |
| `aws_lambda_permission` × 5 | `AllowAgentCoreGatewayInvoke` per Lambda |

### Gateway ID

```
Gateway: acme-finance-dev-finance-tools-rrlhpdtveg
URL:     https://acme-finance-dev-finance-tools-rrlhpdtveg.gateway.bedrock-agentcore.us-east-1.amazonaws.com
```

---

## AgentCore Memory

Provides **semantic cross-session memory** so analysts do not need to re-explain context at the start of every conversation.

### How It Works

1. **`memory_id`** — a stable per-analyst identifier (e.g., `user-abc123`)
2. On each `/chat` request, FastAPI calls `retrieve_memory_records` with the user's `memory_id` as namespace and the current question as search query
3. AgentCore returns top-5 semantically relevant past Q&A pairs
4. FastAPI prepends these as context before sending to the Bedrock Agent
5. After the agent responds, FastAPI stores the new Q&A pair to AgentCore Memory in a background thread (fire-and-forget)
6. Next session (new browser tab, next day): the agent recalls relevant context automatically

### Memory Configuration

| Attribute | Value |
|-----------|-------|
| Memory ID | `acme_finance_dev_memory-F0GIOl5mcE` |
| Strategy ID | `financeSemanticMemory-jg6xTm9BFx` |
| Type | Semantic (embedding-based vector retrieval) |
| Top-K | 5 records per query |
| Truncation | Question: 300 chars, Answer: 800 chars |

### Session vs Memory Model

| Field | Scope | What It Controls |
|-------|-------|-----------------|
| `session_id` | Per browser session (ephemeral) | Bedrock Agent's built-in conversation continuity within one tab |
| `memory_id` | Per analyst (persistent) | AgentCore semantic cross-session context recall |

### Terraform Resources

| Resource | Name |
|----------|------|
| `aws_bedrockagentcore_memory` | `acme-finance-dev-finance-memory` |
| `aws_iam_role_policy` (agent) | `agentcore-memory-access` |

---

## FastAPI Changes

### New Memory Integration in `/chat`

```python
# Step 1: Retrieve relevant past context
memory_context = _retrieve_memories(memory_id, req.question)  # top-5 semantic results
input_text = f"{memory_context}{req.question}" if memory_context else req.question

# Step 2: Invoke agent with memory-augmented input
response = client.invoke_agent(
    agentId=..., agentAliasId=..., sessionId=...,
    inputText=input_text,
    memoryId=memory_id,   # Also enables Bedrock's built-in short-term memory
)

# Step 3: Store exchange to semantic memory (background thread)
threading.Thread(target=_store_memory, args=(memory_id, question, answer), daemon=True).start()
```

### New Config Variables

```python
AGENTCORE_MEMORY_ID     = os.getenv("AGENTCORE_MEMORY_ID", "acme_finance_dev_memory-F0GIOl5mcE")
AGENTCORE_MEMORY_ARN    = os.getenv("AGENTCORE_MEMORY_ARN", "arn:aws:bedrock-agentcore:...")
AGENTCORE_STRATEGY_ID   = os.getenv("AGENTCORE_STRATEGY_ID", "financeSemanticMemory-jg6xTm9BFx")
AGENTCORE_MEMORY_TOP_K  = int(os.getenv("AGENTCORE_MEMORY_TOP_K", "5"))
```

---

## Files Changed

| File | Change |
|------|--------|
| `infra/modules/bedrock/main.tf` | Added 4 new Lambdas, 5 new action groups, Gateway, Memory, IAM |
| `infra/modules/bedrock/outputs.tf` | Added `gateway_id`, `gateway_arn`, `memory_arn` |
| `agent/lambdas/forecast/handler.py` | New — linear trend + seasonality forecasting |
| `agent/lambdas/variance_rca/handler.py` | New — actuals vs plan root-cause analysis |
| `agent/lambdas/describe_metric/handler.py` | New — 12-metric static glossary |
| `agent/lambdas/whatif_sim/handler.py` | New — cascading P&L scenario simulation |
| `ui/api/config.py` | Added AgentCore Memory config variables |
| `ui/api/main.py` | `memory_id` support, `_retrieve_memories`, `_store_memory` |
| `ui/app.py` | `st.session_state.memory_id` wired to `/chat` |

---

## Deployment

```bash
cd infra/envs/dev
terraform init    # pulls updated provider if needed
terraform plan    # review: ~12 new resources
terraform apply
```

**Expected new resources:** ~15 (Gateway, Gateway targets ×5, Memory, IAM roles/policies, Lambda permissions ×5, Lambdas ×4)

---

## Verification

```bash
# 1. Confirm Gateway registered all 5 tools
aws bedrockagentcore list-gateway-targets \
  --gateway-identifier $(terraform output -raw gateway_id)

# 2. Test variance RCA via agent
curl -s -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"question":"What are the top 5 variance drivers vs budget in FY2024?","memory_id":"user-test-001"}'

# 3. Test cross-session memory (run twice with same memory_id, second call references first)
# First call: "What was EMEA gross margin in Q3 FY2024?"
# Second call (new session_id, same memory_id): "What was the trend for that entity?"
# Agent should recall EMEA context without re-prompting.

# 4. Test what-if simulation
curl -s -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"question":"What if we cut R&D by 15%? Show operating margin impact.","memory_id":"user-test-001"}'
# Expected: +348 bps, +$62.9M operating income

# 5. Test forecast
curl -s -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"question":"Forecast revenue for the next 4 quarters for the US entity","memory_id":"user-test-001"}'
```

---

## Validation Numbers

| Metric | FY2024 Value | Source |
|--------|-------------|--------|
| Total Revenue | ~$1,807.9M | `mart_pl` |
| Gross Margin | ~77.5% | `mart_pl` |
| Operating Margin | ~-9.4% | `mart_pl` |
| R&D -15% impact | +348 bps, +$62.9M | `whatif_sim` Lambda |

---

## Next: Phase 9 — Management Commentary Automation
