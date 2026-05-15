# ACME Finance — Use Case Testing Guide

**App URL:** http://localhost:5173 (React)  
**API URL:** http://localhost:8000  
**Data:** FY2024 synthetic dataset modeled on Salesforce 10-K  

---

## Starting the App

```bash
cd /Users/udayn/Developer/acme-finance

# 1 — Authenticate (required for Redshift + Bedrock)
aws sso login --profile acme-admin

# 2 — Start API  (Redshift warmup fires automatically on startup)
PYTHONPATH=. .venv/bin/uvicorn ui.api.main:app --port 8000

# 3 — Start React UI
cd ui-react && npm run dev
```

> **First chat question takes 30–60 s** if Redshift Serverless was idle — the cluster
> auto-pauses after inactivity. The API fires a warmup query on startup; subsequent
> queries are 5–10 s.

---

## Ground Truth — FY2024 Actuals

Use these to validate any response the agent gives you.

| Metric | Value |
|--------|-------|
| Total Revenue | ~$1,807.9M |
| COGS | ~$406.5M |
| Gross Profit | ~$1,401.4M |
| **Gross Margin %** | **~77.5%** |
| Sales & Marketing | ~$650M |
| Research & Development | ~$419M |
| General & Administrative | ~$502M |
| Total OpEx | ~$1,571.8M |
| **Operating Income** | **~−$170.4M** |
| **Operating Margin %** | **~−9.4%** |
| Entities | US · EMEA · APAC |
| Fiscal quarters | Q1–Q4 (FY ends Jan 31) |
| Period range | 202402–202501 |

---

## Use Case 1 — P&L Dashboard

**Route:** `/pl`  
**What it does:** Quarterly P&L by entity — Revenue, Gross Margin, OpEx, Operating Income trend charts and table.

**API test:**
```bash
# All entities
curl "http://localhost:8000/metrics/pl?fiscal_year=2024" | python3 -m json.tool

# Single entity
curl "http://localhost:8000/metrics/pl?fiscal_year=2024&entity_id=EMEA" | python3 -m json.tool
```

**What to verify:**
- [ ] Gross Margin % is ~77.5% aggregated across all entities
- [ ] Operating Margin % is ~−9.4% for ALL
- [ ] Entity filter returns only rows for that entity (US / EMEA / APAC)
- [ ] Four fiscal quarters appear (Q1–Q4)

---

## Use Case 2 — ARR Waterfall

**Route:** `/arr`  
**What it does:** Monthly ARR movements — new, expansion, contraction, churn — visualised as a stacked bar chart.

**API test:**
```bash
curl "http://localhost:8000/metrics/arr?fiscal_year=2024" | python3 -m json.tool
```

**What to verify:**
- [ ] Four `movement_type` values present: `new`, `expansion`, `contraction`, `churn`
- [ ] `new` and `expansion` have positive `arr_change`
- [ ] `contraction` and `churn` have negative `arr_change`
- [ ] Rows span 202402–202501 (12 periods)

---

## Use Case 3 — AR Aging

**Route:** `/ar-aging`  
**What it does:** Open invoices bucketed by days overdue — 0-30, 31-60, 61-90, 90+.

**API test:**
```bash
curl "http://localhost:8000/metrics/ar_aging?fiscal_year=2024" | python3 -m json.tool
```

**What to verify:**
- [ ] `aging_bucket` values match: `0-30`, `31-60`, `61-90`, `90+`
- [ ] Table is sortable by `days_overdue` descending (worst accounts first)
- [ ] `amount` values are positive (AR = money owed to ACME)

> **Note:** Synthetic dataset mostly populates the `90+` bucket — this is a data
> characteristic, not a bug.

---

## Use Case 4 — AI Analyst Chat

**Route:** `/chat`  
**What it does:** Natural language Q&A over the data warehouse. Bedrock Agent + Claude Sonnet 4.6 + five Lambda tools + AgentCore Memory.

**Tools the agent can invoke:**

| Tool | Triggered by |
|------|-------------|
| `text_to_sql` | Any specific data question (revenue, AR, ARR) |
| `variance_rca` | "variance drivers", "vs budget", "what went wrong" |
| `whatif_sim` | "what if", "impact of", "scenario" |
| `forecast` | "forecast", "predict", "next quarter" |
| `describe_metric` | "what is NRR", "explain ARR", "define DSO" |

### Progression test sequence

Run these in order — each tests a more complex capability:

| # | Question | Capability tested | Expected |
|---|----------|-------------------|----------|
| 1 | `What was gross margin % for FY2024?` | Basic mart query | ~77.5% |
| 2 | `Break down revenue by entity for Q3 FY2024` | Entity + quarter filter | Three rows: US, EMEA, APAC |
| 3 | `What are the top 5 variance drivers vs budget in FY2024?` | `variance_rca` Lambda | Ranked accounts with +/− variance ($M) |
| 4 | `Which customers have invoices more than 60 days overdue?` | AR aging query | Customer list with amounts, `61-90` or `90+` buckets |
| 5 | `Give me a 4-quarter revenue forecast` | `forecast` Lambda | Q1–Q4 projections with trend commentary |
| 6 | `What is NRR and how is ACME tracking against it?` | `describe_metric` Lambda | NRR definition + ACME data |
| 7 | `Compare EMEA vs APAC operating margin for FY2024` | Multi-entity comparison | Side-by-side margin % |
| 8 | `What if we cut R&D spend by 15%?` | `whatif_sim` Lambda — see full example below |

**API test (streaming):**
```bash
curl -s "http://localhost:8000/chat/stream?question=What+was+gross+margin+in+FY2024&session_id=test-001"
# Should stream text chunks immediately — you see tokens arriving, not one block
```

**Memory test (cross-session recall):**
1. Ask: *"What if we cut R&D by 15%? Show me the operating margin impact."*
2. Note the answer.
3. Close the tab, reopen http://localhost:5173/chat (new session).
4. Ask: *"What was the R&D scenario we ran last time?"*
5. AgentCore Memory should surface the prior result without re-running the simulation.

---

## Use Case 5 — What-If Scenario Analysis (detailed example)

**The question to ask the agent:**

> *"We're planning for next year. If we reduce R&D spend by 15% and simultaneously increase sales & marketing by 10%, what is the combined impact on operating margin and operating income for FY2024? Show me the before and after."*

**What the agent does:**
1. Calls `whatif_sim` with `line_item=r&d, pct_change=-15`
2. Calls `whatif_sim` again with `line_item=s&m, pct_change=+10`
3. Chains the results to show the combined scenario
4. Interprets the business implications

**Expected result (based on FY2024 actuals):**

| | Baseline | R&D −15% only | S&M +10% only | Combined |
|--|----------|---------------|----------------|---------|
| R&D spend | ~$419M | ~$356M (−$63M) | ~$419M | ~$356M |
| S&M spend | ~$650M | ~$650M | ~$715M (+$65M) | ~$715M |
| Total OpEx | ~$1,572M | ~$1,509M | ~$1,637M | ~$1,574M |
| Operating Income | ~−$170M | ~−$107M | ~−$235M | ~−$172M |
| **Operating Margin** | **−9.4%** | **−5.9% (+348 bps)** | **−13.0% (−356 bps)** | **−9.5% (−8 bps)** |

**Interpretation the agent should surface:**
- R&D cut alone improves margin by ~348 bps and adds ~$63M to operating income
- S&M increase alone costs ~$65M and reduces margin by ~356 bps
- Combined, they nearly cancel out — net margin impact is negligible (−8 bps)
- The business case for the combined move depends on whether the S&M investment drives enough ARR growth to offset the cost — the static what-if cannot model that; it would need a revenue growth assumption

**Other what-if questions to try:**

```
# Infrastructure efficiency play
"What if we cut COGS by 10% through infrastructure optimisation?"
Expected: Gross margin improves from 77.5% → ~79.8% (+230 bps), operating income +$40.7M

# Revenue upside scenario
"What if revenue grows by 8% next year, all else equal?"
Expected: Operating income improves by ~$144.6M, margin goes from −9.4% → ~−1.4%

# G&A efficiency (common CFO ask)
"What if we reduce G&A by 20% through process automation?"
Expected: Operating income +$100M, margin improves ~+554 bps

# Hiring freeze scenario
"What if we freeze S&M headcount and hold S&M flat year-over-year?"
→ Model as S&M 0% change — agent should explain this is already the baseline
```

**Valid line items for `whatif_sim`:**
`revenue` · `cogs` · `r&d` · `s&m` · `g&a` · `opex` · `gross profit` · `operating income`

---

## Use Case 6 — Management Commentary

**Route:** `/commentary`  
**What it does:** Generates a CFO-ready 4-paragraph board pack narrative. Chains `variance_rca` → `text_to_sql` → Claude Sonnet. Replaces ~2–4 hours of manual FP&A writing.

**API test:**
```bash
curl -s -X POST http://localhost:8000/commentary \
  -H "Content-Type: application/json" \
  -d '{"period_yyyymm":"202409","entity_id":"EMEA"}' \
  | python3 -m json.tool
```

**Expected:** `commentary` field with four paragraphs:
1. Performance Overview (headline numbers)
2. Revenue & ARR Analysis
3. Expense & Margin Analysis
4. Outlook & Key Risks

**Validation:** Cross-check any dollar figures the agent cites against:
```bash
curl "http://localhost:8000/metrics/pl?fiscal_year=2024&entity_id=EMEA"
```

**What to verify:**
- [ ] Completes in under 60 seconds
- [ ] References specific variance drivers by name (not generic text)
- [ ] Dollar amounts match P&L mart within rounding
- [ ] Entity-specific — EMEA commentary should mention EMEA cost centres

---

## Use Case 7 — Board Pack PDF

**Route:** `/board-pack`  
**What it does:** One-click PDF — Cover page + P&L Summary + ARR Waterfall + AR Aging + 4-paragraph Commentary. Replaces 3–5 hours of monthly FP&A manual assembly.

**API test:**
```bash
curl -s -X POST http://localhost:8000/boardpack \
  -H "Content-Type: application/json" \
  -d '{"period":"202409","entity":"US","memory_id":"test"}' \
  | python3 -c "
import sys, json, base64
r = json.load(sys.stdin)
pdf = base64.b64decode(r['pdf_base64'])
print(f'Size: {r[\"size_bytes\"]} bytes')
print(f'Valid PDF: {pdf[:4] == b\"%PDF\"}')
open('/tmp/test_boardpack.pdf','wb').write(pdf)
print('Saved → /tmp/test_boardpack.pdf')
"
open /tmp/test_boardpack.pdf   # macOS
```

**PDF structure to verify:**
| Page | Content | Check |
|------|---------|-------|
| 1 | Cover — dark navy, ACME branding, entity + period | Entity and period label correct |
| 2 | P&L Summary table | Gross margin ~77.5%, no fake $0 variance column |
| 3 | ARR Waterfall + AR Aging | Movement types present; aging buckets shown |
| 4+ | Management Commentary | 4 paragraphs; "Management Commentary" header not stranded at page bottom |

**What to verify:**
- [ ] `POST /boardpack` returns `200` with `pdf_base64` field
- [ ] File opens without errors
- [ ] Numbers on page 2 match `/metrics/pl` API response
- [ ] Commentary on the final page references the selected entity

---

## Known Data Characteristics

These are properties of the synthetic dataset, not bugs:

| Observation | Reason |
|-------------|--------|
| AR aging shows mostly `90+` bucket | Synthetic data — only one bucket heavily populated |
| ARR waterfall has no beginning/ending balance | `fct_arr` stores movements only, not point-in-time snapshots |
| Revenue amounts were negative in variance report | Fixed — GL stores revenue as credits (negative `net_amount`); `variance_rca` Lambda now sign-flips correctly |
| P&L board pack page has no variance vs budget | `mart_pl` stores actuals only; plan data lives in `stg_epm__plan_line` — variance analysis is in the AI Analyst chat via `variance_rca` |

---

## Quick Smoke Test (all endpoints, 2 minutes)

```bash
BASE="http://localhost:8000"

echo "=== P&L ===" && curl -s "$BASE/metrics/pl?fiscal_year=2024" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'{len(d)} rows')"

echo "=== ARR ===" && curl -s "$BASE/metrics/arr?fiscal_year=2024" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'{len(d)} rows')"

echo "=== AR Aging ===" && curl -s "$BASE/metrics/ar_aging?fiscal_year=2024" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'{len(d)} rows')"

echo "=== Chat stream ===" && curl -s "$BASE/chat/stream?question=What+is+gross+margin+for+FY2024&session_id=smoke-test" | head -c 200

echo "=== Commentary ===" && curl -s -X POST "$BASE/commentary" -H "Content-Type: application/json" \
  -d '{"period_yyyymm":"202412","entity_id":"US"}' | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('commentary','ERROR')[:200])"
```

Expected output: row counts > 0 for the first three, streaming text for chat, paragraph text for commentary.
