# Phase 9 — Management Commentary Automation

**Status:** Complete  
**Delivered:** 2026-05-09  
**Built on:** Phase 8 (AgentCore Gateway + Memory, 5 Lambda tools)

---

## What Phase 9 Adds

Management commentary automation: the AI chains `variance_rca` + `text_to_sql` to draft
the written numbers section of the monthly board pack — the highest-value FP&A use case
in the ACME roadmap.

Previously, FP&A analysts spent 2–4 hours per month manually extracting variance data
and writing the narrative paragraph. Phase 9 reduces that to ~45 seconds.

---

## Architecture

```
Streamlit "Commentary" tab
        │
        ▼ POST /commentary {period, entity, memory_id, extra_context}
FastAPI /commentary endpoint
        │
        ▼ invoke_agent(structured_prompt)
Bedrock Agent (Claude Sonnet 4.6)
        │
        ├─▶ variance_rca Lambda  ──→ top 5 budget variance drivers
        └─▶ text_to_sql Lambda   ──→ mart_pl P&L summary for period
        │
        ▼ drafts 4-paragraph CFO narrative
FastAPI returns CommentaryResponse
        │
        ▼
Streamlit renders commentary + download button
```

---

## New Files

| File | Purpose |
|------|---------|
| _(none)_ | No new Lambdas — agent orchestrates existing tools |

## Modified Files

| File | Change |
|------|--------|
| `ui/api/main.py` | Added `CommentaryRequest`, `CommentaryResponse`, `POST /commentary` |
| `ui/app.py` | Added 5th tab "📝 Commentary" with period/entity selector and output display |
| `docs/phases/PHASE-9.md` | This file |

---

## API Contract

### `POST /commentary`

**Request:**
```json
{
  "period": "202409",
  "entity": "EMEA",
  "memory_id": "user-abc123",
  "extra_context": "One-time restructuring charge of $12M in Sep"
}
```

**Response:**
```json
{
  "commentary": "Revenue for September 2024 came in at $152.3M...",
  "period": "202409",
  "entity": "EMEA",
  "session_id": "commentary-202409-ab3c1f82"
}
```

**Parameters:**
- `period` — YYYYMM (required)
- `entity` — `US | EMEA | APAC | ALL` (default: `ALL`)
- `memory_id` — optional; routes through AgentCore Memory for cross-session recall
- `extra_context` — optional analyst notes appended to the prompt

---

## Commentary Prompt Design

The endpoint constructs a structured 5-step prompt:

1. Call `variance_rca` → top 5 variances for the period/entity
2. Call `text_to_sql` → P&L metrics from `mart_pl` ordered by `|variance_pct|`
3. Draft 4 paragraphs covering: Revenue · Gross Margin · OpEx · Operating Margin + Outlook
4. Format: board-level language, numbers in $M (1dp), percentages to 1dp
5. Reference specific cost centers and accounts from the variance output

---

## Streamlit UI

**Tab:** 📝 Commentary (5th tab)

**Left panel:**
- Period selector (Jan 2024 – Dec 2024)
- Entity selector (ALL / US / EMEA / APAC)
- Optional analyst context textarea

**Right panel:**
- Generated commentary rendered as paragraphs
- Metadata badge: period, entity, session ID
- Download button (`.txt` file for pasting into board pack)

---

## Testing

```bash
# Start servers
PYTHONPATH=. .venv/bin/uvicorn ui.api.main:app --port 8000
PYTHONPATH=. .venv/bin/streamlit run ui/app.py

# Test API directly
curl -s -X POST http://localhost:8000/commentary \
  -H "Content-Type: application/json" \
  -d '{"period":"202409","entity":"EMEA"}' | python3 -m json.tool

# Expected: commentary field with 4 paragraphs referencing EMEA variance drivers
```

---

## Verification Checklist

- [ ] `POST /commentary` returns 4-paragraph narrative in <45 seconds
- [ ] Commentary references specific variance drivers from `variance_rca` output
- [ ] Numbers match P&L mart (cross-check: gross margin ~77.5% for FY2024)
- [ ] Entity filter works: EMEA commentary mentions EMEA cost centers
- [ ] `extra_context` appears reflected in the narrative when provided
- [ ] Download button produces a valid `.txt` file
- [ ] Memory ID flows through: commentary session recalls prior analyst context

---

## What Does NOT Change

- All Phase 8 Lambdas (`text_to_sql`, `forecast`, `variance_rca`, `describe_metric`, `whatif_sim`)
- AgentCore Gateway and Memory resources
- All Terraform infrastructure
- dbt models and Redshift schemas
- Existing P&L, ARR, AR Aging dashboard tabs

---

## Next: Phase 10

**Board Pack Generator** — full multi-section PDF: cover page + P&L summary table +
ARR waterfall + AR aging + commentary narrative, exported as a formatted PDF.
Uses Phase 9 commentary + all dashboard metrics.
