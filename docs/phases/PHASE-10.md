# Phase 10 — Board Pack PDF Generator

**Status:** Complete  
**Delivered:** 2026-05-09  
**Built on:** Phase 9 (Management Commentary), Phase 8 (AgentCore Memory)

---

## What Phase 10 Adds

End-to-end board pack generation: a single API call assembles P&L actuals, ARR waterfall,
AR aging, and AI-written management commentary into a branded, print-ready PDF — the
deliverable that previously took FP&A 3–5 hours to produce manually each month.

The board pack is now a one-click download from the Streamlit dashboard.

---

## Architecture

```
Streamlit "Board Pack" tab
        │
        ▼ POST /boardpack {period, entity, memory_id}
FastAPI /boardpack endpoint
        │
        ├─► POST /commentary  (reuses Phase 9 commentary chain)
        │         │
        │         └─► Bedrock Agent → variance_rca + text_to_sql → narrative text
        │
        ├─► Redshift Data API  (P&L actuals: mart_pl)
        ├─► Redshift Data API  (ARR waterfall: fct_arr)
        └─► Redshift Data API  (AR aging: mart_ar_aging)
                │
                ▼
        boardpack.py: generate_boardpack_pdf()
                │
                ▼ bytes (PDF)
        FastAPI → base64-encoded JSON response
                │
                ▼
        Streamlit → decode → st.download_button("Download PDF")
```

---

## New Files

| File | Purpose |
|------|---------|
| `ui/api/boardpack.py` | Pure function `generate_boardpack_pdf(...)` → PDF bytes |

---

## Modified Files

| File | Change |
|------|--------|
| `ui/api/main.py` | Added `BoardPackRequest`, `BoardPackResponse`, `POST /boardpack` endpoint |
| `ui/app.py` | Added 6th "📋 Board Pack" Streamlit tab |

---

## API Contract

### `POST /boardpack`

**Request:**
```json
{
  "period": "202409",
  "entity": "EMEA",
  "memory_id": "user-abc123"
}
```

**Response:**
```json
{
  "pdf_base64": "<base64-encoded bytes>",
  "filename": "ACME_BoardPack_EMEA_202409.pdf",
  "size_bytes": 7767
}
```

- `period` — 6-digit YYYYMM string (e.g. `202409` for Sep 2024)
- `entity` — one of `US`, `EMEA`, `APAC`; `ALL` aggregates all entities
- `memory_id` — passed through to the `/commentary` sub-call for memory-augmented narrative

---

## PDF Structure

### Page 1 — Cover
- Dark navy background (`#1e293b`)
- ACME Finance branding, "Board Pack" title, entity + period label
- Generated-by attribution, generation timestamp

### Page 2 — P&L Summary
- Two-column actuals-only table: **Metric | Actual ($M)**
- Rows: Revenue, COGS, Gross Profit, Gross Margin %, S&M, R&D, G&A, Total OpEx,
  Operating Income, Operating Margin %, EBITDA
- Note: `mart_pl` stores actuals only — no plan columns → no fake variance

### Page 3 — ARR Waterfall + AR Aging
- **ARR Waterfall** table: movement types from `fct_arr`
  (`new`, `expansion`, `renewal`, `contraction`, `churn`) + Net ARR Change
  - No Beginning/Ending ARR rows (not stored in `fct_arr`)
- **AR Aging** table: buckets from `mart_ar_aging` present in the selected fiscal year
  - Footnote: "Tiers with zero balance are excluded"

### Page 4+ — Management Commentary
- 4-paragraph CFO-ready narrative (reuses Phase 9 commentary)
- Sections: Performance Overview, Revenue & ARR Analysis, Expense & Margin Analysis,
  Outlook & Key Risks
- `KeepTogether` wrapping prevents section header orphaning at page bottom

---

## PDF Rendering — Key Implementation Notes

### Two-template pattern (cover + content)
```python
doc = BaseDocTemplate(buf, pagesize=A4)
cover_template  = PageTemplate(id="cover",  frames=[frame], onPage=_draw_cover)
content_template = PageTemplate(id="content", frames=[frame], onPage=_draw_content_page)
doc.addPageTemplates([cover_template, content_template])
```

**Critical**: `BaseDocTemplate` cycles through templates on each page break.
Without an explicit `NextPageTemplate("content")` flowable before the first `PageBreak`,
page 3 reverts to the cover template and draws the navy background + cover text as a
ghost overlay over content.

Fix — added after the cover spacer, before `PageBreak()`:
```python
story.append(NextPageTemplate("content"))   # lock all subsequent pages to content
story.append(PageBreak())
```

### KeepTogether for section headers
```python
from reportlab.platypus import KeepTogether

story.append(KeepTogether(
    _section_header("Management Commentary") + [first_para, Spacer(1, 6)]
))
```
Prevents the "Management Commentary" heading orphaning at the bottom of a content page.

---

## Data Limitations (Synthetic Dataset)

| Limitation | Cause | Handling |
|-----------|-------|---------|
| AR aging shows only "90+ days" for FY2024 | Synthetic data has only one populated bucket | Footnote; display whatever buckets have data |
| No ARR beginning/ending balance | `fct_arr` movement types don't include `beginning`/`ending_arr` | Show available movements + Net ARR Change |
| P&L has no plan/variance | `mart_pl` stores actuals only | Actuals-only 2-column table |

These are dataset characteristics, not code bugs. The boardpack adapts to data shape
at runtime — adding more buckets or movement types will appear automatically.

---

## Streamlit Tab

Location: **Tab 6 — 📋 Board Pack** in `ui/app.py`

Controls:
- Period selector (dropdown, same `PERIODS` dict as Commentary tab)
- Entity selector (`US`, `EMEA`, `APAC`)
- "📥 Generate Board Pack" button
- After generation: file size display + `st.download_button` with correct MIME type
  (`application/pdf`)

---

## Verification Checklist

- [ ] `POST /boardpack` returns `200` with `pdf_base64` field
- [ ] Decoded bytes start with `%PDF` (valid PDF header)
- [ ] PDF opens without errors in system viewer
- [ ] Cover page shows correct entity + period label
- [ ] Page 2 shows P&L actuals (no $0.0M variance column)
- [ ] Page 3 ARR waterfall shows `new`, `expansion`, etc. (no $0.0M beginning/ending)
- [ ] Page 4 commentary is 4 paragraphs, references selected entity
- [ ] "Management Commentary" heading is not stranded at bottom of a page
- [ ] Download button in Streamlit saves a readable PDF

### Test command
```bash
curl -s -X POST http://localhost:8000/boardpack \
  -H "Content-Type: application/json" \
  -d '{"period":"202403","entity":"US","memory_id":"test"}' \
  | python3 -c "
import sys, json, base64
r = json.load(sys.stdin)
pdf = base64.b64decode(r['pdf_base64'])
print(f'Size: {r[\"size_bytes\"]} bytes')
print(f'Valid PDF: {pdf[:4] == b\"%PDF\"}')
open('/tmp/test_boardpack.pdf','wb').write(pdf)
print('Saved to /tmp/test_boardpack.pdf')
"
```

---

## Phase Roadmap Position

```
Phase 1-5:  Data pipeline (ERP → S3 → Glue → Redshift → dbt)
Phase 6:    Bedrock Agent + text_to_sql Lambda + FastAPI + Streamlit
Phase 7:    5-tab Streamlit dashboard (P&L, ARR, AR Aging)
Phase 8:    AgentCore Gateway (5 tools) + Memory (cross-session recall)
Phase 9:    Management Commentary (variance_rca chain → narrative)
Phase 10:   Board Pack PDF (P&L + ARR + AR Aging + Commentary → PDF) ← HERE
```

**Phase 10 completes the FP&A automation loop.** The full monthly workflow —
data refresh → variance analysis → commentary drafting → board pack assembly —
is now fully automated end-to-end.
