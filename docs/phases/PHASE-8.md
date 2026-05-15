# Phase 8: AgentCore Gateway, Memory & Full Tool Suite

**Status:** ✅ Complete  
**Depends on:** Phase 6 (Bedrock Agent), Phase 7 (FastAPI + Streamlit)

---

## Overview

Phase 8 completes the ACME Finance AI platform with three additions:

1. **Four new Lambda tools** — forecast, variance_rca, describe_metric, whatif_sim
2. **AgentCore Gateway** — MCP-compatible tool registry replacing individual action group wiring
3. **AgentCore Memory** — cross-session persistent memory so the agent recalls analyst context across browser sessions

```
Analyst (Streamlit)
   ↓  memory_id + session_id
FastAPI /chat
   ↓
Bedrock Agent (Claude Sonnet)
   ↓  bedrock-agentcore:InvokeTool
AgentCore Gateway
   ├── text_to_sql Lambda   → Redshift (NL → SQL)
   ├── forecast Lambda      → Redshift (4-quarter projection)
   ├── variance_rca Lambda  → Redshift (actuals vs plan)
   ├── whatif_sim Lambda    → Redshift (P&L scenario)
   └── describe_metric      → Static glossary (no DB)

AgentCore Memory (SEMANTIC)
   └── Per-analyst cross-session recall
```

---

## New Lambda Tools

| Lambda | Function(s) | Data Sources | Key Output |
|--------|------------|--------------|-----------|
| `forecast` | `forecast_revenue`, `forecast_expense` | `fct_revenue`, `fct_expense` | 4-quarter projection with trend + seasonality |
| `variance_rca` | `variance_rca` | `fct_gl_entries` vs `stg_epm__plan_line` | Top N variance drivers ranked by absolute gap |
| `describe_metric` | `describe_metric`, `list_metrics` | Static glossary (12 metrics) | Definition, formula, table, benchmark |
| `whatif_sim` | `whatif_sim` | `mart_pl` | Baseline vs scenario P&L with bps impact |

---

## AgentCore Gateway

Replaces the per-Lambda `aws_bedrockagent_agent_action_group` wiring with a single
MCP-compatible endpoint. Benefits:

- **One IAM policy** on the agent role (`bedrock-agentcore:InvokeTool` on Gateway ARN)
- **Centralised rate limiting** — per-tool throttle protects Redshift from burst queries
- **Single CloudWatch namespace** — one dashboard covers all 5 tool invocations
- **Tool discovery** — agent sees tools as named MCP targets, not opaque ARNs

### Terraform resources added

| Resource | Name |
|----------|------|
| `aws_bedrockagentcore_gateway` | `acme-finance-dev-finance-tools` |
| `aws_bedrockagentcore_gateway_target` × 5 | text_to_sql, forecast, variance_rca, describe_metric, whatif_sim |
| `aws_iam_role` | `acme-finance-dev-agentcore-gateway` |
| `aws_iam_role_policy` (gateway) | `invoke-tool-lambdas` |
| `aws_iam_role_policy` (agent) | `invoke-agentcore-gateway` |
| `aws_lambda_permission` × 5 | `AllowAgentCoreGatewayInvoke` per Lambda |

---

## AgentCore Memory

Provides semantic cross-session memory so analysts do not need to re-explain context
at the start of every conversation.

### How it works

- **`memory_id`** — a stable per-analyst UUID stored in `st.session_state.memory_id`
- Streamlit sends `memory_id` with every `/chat` POST to FastAPI
- FastAPI passes it as `memoryId` in `invoke_agent()` calls
- AgentCore stores conversation summaries and recalled facts under that ID
- On the next session (new browser tab, next day), the agent can recall: *"Last week you
  asked about EMEA R&D variance — the trend has continued into Q4."*

### Session vs memory model

| Field | Scope | What it controls |
|-------|-------|-----------------|
| `session_id` | Per browser session (ephemeral) | Conversation continuity within one tab |
| `memory_id` | Per analyst (persistent, `localStorage`-equivalent) | Cross-session context recall |

### Terraform resources added

| Resource | Name |
|----------|------|
| `aws_bedrockagentcore_memory` | `acme-finance-dev-finance-memory` |
| `aws_iam_role_policy` (agent) | `agentcore-memory-access` |

---

## Files Changed

| File | Change |
|------|--------|
| `infra/modules/bedrock/main.tf` | Added Gateway, Memory, IAM roles/policies, Lambda permissions |
| `infra/modules/bedrock/outputs.tf` | Added `gateway_id`, `gateway_arn`, `memory_arn` |
| `agent/lambdas/forecast/handler.py` | Full implementation (linear trend + seasonality) |
| `agent/lambdas/variance_rca/handler.py` | Full implementation (actuals vs plan, ranked) |
| `agent/lambdas/describe_metric/handler.py` | Full implementation (12-metric glossary) |
| `agent/lambdas/whatif_sim/handler.py` | Full implementation (cascading P&L delta) |
| `ui/api/main.py` | `memory_id` support in `/chat` — already present from Phase 7 prep |
| `ui/app.py` | `st.session_state.memory_id` wired to `/chat` — already present from Phase 7 prep |

---

## Deployment

```bash
cd infra/envs/dev
terraform init    # pulls updated provider if needed
terraform plan    # review: ~12 new resources
terraform apply
```

**Expected new resources:**
- `aws_bedrockagentcore_gateway.finance_tools`
- `aws_bedrockagentcore_gateway_target.tools["text_to_sql"]` (×5)
- `aws_bedrockagentcore_memory.finance`
- `aws_iam_role.gateway`
- `aws_iam_role_policy.gateway_invoke_lambdas`
- `aws_iam_role_policy.bedrock_agent_gateway`
- `aws_iam_role_policy.bedrock_agent_memory`
- `aws_lambda_permission.gateway_invoke["text_to_sql"]` (×5)

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
```

---

## Next: Phase 9 — Management Commentary Automation

Phase 9 will add automated first-draft commentary for the management report:
the agent chains `variance_rca` + `text_to_sql` to write the numbers section of the
monthly board pack, which FP&A then reviews and edits.
