"""
ACME Finance — Board Pack PDF Generator (Phase 10)
Generates a multi-section CFO board pack PDF using reportlab.

Public API:
    generate_boardpack_pdf(period, entity, month_label, pl_data, arr_data, ar_data, commentary) -> bytes
"""

import io
from datetime import date

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.lib.utils import ImageReader
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    HRFlowable,
    KeepTogether,
    NextPageTemplate,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

# ── Brand colours ─────────────────────────────────────────────────────────────

C_NAVY   = colors.HexColor("#1e293b")
C_BLUE   = colors.HexColor("#2563eb")
C_GREEN  = colors.HexColor("#16a34a")
C_RED    = colors.HexColor("#dc2626")
C_AMBER  = colors.HexColor("#f59e0b")
C_LGRAY  = colors.HexColor("#f8fafc")   # alternating row background
C_TEXT   = colors.HexColor("#334155")   # body text
C_FOOTER = colors.HexColor("#94a3b8")   # small footer text
C_WHITE  = colors.white

# ── Page constants ────────────────────────────────────────────────────────────

PAGE_W, PAGE_H = letter            # 612 × 792 pts
MARGIN         = 0.75 * inch
CONTENT_W      = PAGE_W - 2 * MARGIN


# ── Paragraph styles ──────────────────────────────────────────────────────────

_base = getSampleStyleSheet()

STYLE_BODY = ParagraphStyle(
    "acme_body",
    fontName="Helvetica",
    fontSize=10,
    leading=14,
    textColor=C_TEXT,
    spaceAfter=6,
)

STYLE_SECTION_HDR = ParagraphStyle(
    "acme_section_hdr",
    fontName="Helvetica-Bold",
    fontSize=14,
    leading=18,
    textColor=C_NAVY,
    spaceBefore=8,
    spaceAfter=4,
)

STYLE_FOOTER = ParagraphStyle(
    "acme_footer",
    fontName="Helvetica",
    fontSize=8,
    leading=10,
    textColor=C_FOOTER,
    alignment=2,   # right
)

# ── Helpers ───────────────────────────────────────────────────────────────────

def _fmt_m(val) -> str:
    """Format a numeric value (raw dollars) as $X.XM."""
    try:
        return f"${float(val) / 1_000_000:.1f}M"
    except (TypeError, ValueError):
        return "—"


def _fmt_pct(val) -> str:
    """Format a value already expressed as a percentage (e.g. 42.3) as X.X%."""
    try:
        return f"{float(val):.1f}%"
    except (TypeError, ValueError):
        return "—"


def _alternating_style(data_rows: int, col_count: int, header_rows: int = 1) -> list:
    """Return TableStyle commands for alternating row shading, navy header."""
    cmds = [
        # Header
        ("BACKGROUND",  (0, 0),              (col_count - 1, header_rows - 1), C_NAVY),
        ("TEXTCOLOR",   (0, 0),              (col_count - 1, header_rows - 1), C_WHITE),
        ("FONTNAME",    (0, 0),              (col_count - 1, header_rows - 1), "Helvetica-Bold"),
        ("FONTSIZE",    (0, 0),              (col_count - 1, header_rows - 1), 9),
        ("ROWBACKGROUND", (0, 0),            (col_count - 1, header_rows - 1), C_NAVY),
        # Body font
        ("FONTNAME",    (0, header_rows),    (col_count - 1, -1), "Helvetica"),
        ("FONTSIZE",    (0, header_rows),    (col_count - 1, -1), 9),
        ("TEXTCOLOR",   (0, header_rows),    (col_count - 1, -1), C_TEXT),
        # Padding
        ("TOPPADDING",  (0, 0),              (col_count - 1, -1), 5),
        ("BOTTOMPADDING", (0, 0),            (col_count - 1, -1), 5),
        ("LEFTPADDING", (0, 0),              (col_count - 1, -1), 8),
        ("RIGHTPADDING", (0, 0),             (col_count - 1, -1), 8),
        # Grid
        ("GRID",        (0, 0),              (col_count - 1, -1), 0.4, colors.HexColor("#e2e8f0")),
        ("LINEBELOW",   (0, header_rows - 1), (col_count - 1, header_rows - 1), 1.5, C_BLUE),
    ]
    # Alternating rows
    for i in range(header_rows, header_rows + data_rows):
        bg = C_LGRAY if i % 2 == 0 else C_WHITE
        cmds.append(("BACKGROUND", (0, i), (col_count - 1, i), bg))
    return cmds


def _section_header(title: str) -> list:
    """Return a list of flowables: section title + blue underline rule."""
    return [
        Paragraph(title, STYLE_SECTION_HDR),
        HRFlowable(width=CONTENT_W, thickness=2, color=C_BLUE, spaceAfter=8),
    ]


# ── Cover-page canvas callback ────────────────────────────────────────────────

def _draw_cover(canvas, doc):
    """Draw the navy cover page background, title, subtitle, and blue accent bar."""
    canvas.saveState()

    # Full-page navy background
    canvas.setFillColor(C_NAVY)
    canvas.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)

    # Blue accent bar — top 6 pt strip
    canvas.setFillColor(C_BLUE)
    canvas.rect(0, PAGE_H - 6, PAGE_W, 6, fill=1, stroke=0)

    # Blue accent bar — bottom 40 pt strip
    canvas.setFillColor(C_BLUE)
    canvas.rect(0, 0, PAGE_W, 40, fill=1, stroke=0)

    # Company name (small caps style)
    canvas.setFillColor(colors.HexColor("#94a3b8"))
    canvas.setFont("Helvetica", 12)
    canvas.drawCentredString(PAGE_W / 2, PAGE_H * 0.68, "ACME FINANCE")

    # Main title
    canvas.setFillColor(C_WHITE)
    canvas.setFont("Helvetica-Bold", 32)
    canvas.drawCentredString(PAGE_W / 2, PAGE_H * 0.58, "ACME Finance Board Pack")

    # Subtitle
    canvas.setFillColor(colors.HexColor("#cbd5e1"))
    canvas.setFont("Helvetica", 14)
    canvas.drawCentredString(PAGE_W / 2, PAGE_H * 0.51, doc.cover_subtitle)

    # Horizontal divider
    canvas.setStrokeColor(C_BLUE)
    canvas.setLineWidth(1.5)
    canvas.line(MARGIN * 2, PAGE_H * 0.48, PAGE_W - MARGIN * 2, PAGE_H * 0.48)

    # Generated date
    canvas.setFillColor(colors.HexColor("#64748b"))
    canvas.setFont("Helvetica", 10)
    canvas.drawCentredString(
        PAGE_W / 2, PAGE_H * 0.44,
        f"Generated {date.today().strftime('%B %d, %Y')}   ·   CONFIDENTIAL"
    )

    # Bottom bar text
    canvas.setFillColor(C_WHITE)
    canvas.setFont("Helvetica", 9)
    canvas.drawCentredString(PAGE_W / 2, 14, f"ACME Finance  ·  CONFIDENTIAL  ·  {getattr(doc, 'footer_period', '')}")

    canvas.restoreState()


# ── Content-page canvas callback ──────────────────────────────────────────────

def _draw_content_page(canvas, doc):
    """Draw header rule and right-aligned footer on every content page."""
    canvas.saveState()

    # Thin blue top rule
    canvas.setStrokeColor(C_BLUE)
    canvas.setLineWidth(2)
    canvas.line(MARGIN, PAGE_H - MARGIN + 6, PAGE_W - MARGIN, PAGE_H - MARGIN + 6)

    # Footer text
    footer_text = f"ACME Finance  ·  Confidential  ·  {getattr(doc, 'footer_period', '')}"
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(C_FOOTER)
    canvas.drawRightString(PAGE_W - MARGIN, MARGIN / 2, footer_text)

    # Page number
    canvas.drawString(MARGIN, MARGIN / 2, f"Page {doc.page}")

    canvas.restoreState()


# ── Main PDF builder ──────────────────────────────────────────────────────────

def generate_boardpack_pdf(
    period: str,
    entity: str,
    month_label: str,
    pl_data: list[dict],
    arr_data: list[dict],
    ar_data: list[dict],
    commentary: str,
) -> bytes:
    """
    Build the full board-pack PDF and return it as bytes.

    Parameters
    ----------
    period      : YYYYMM string, e.g. "202409"
    entity      : "US" | "EMEA" | "APAC" | "ALL"
    month_label : human-readable label e.g. "September 2024"
    pl_data     : rows from mart_pl (each dict has total_revenue, cogs, … fields)
    arr_data    : rows from fct_arr  (movement_type, arr_change, …)
    ar_data     : rows from mart_ar_aging (aging_bucket, total_amount, …)
    commentary  : plain-text management commentary string
    """

    buf = io.BytesIO()

    # ── Document setup ────────────────────────────────────────────────────────

    doc = BaseDocTemplate(
        buf,
        pagesize=letter,
        leftMargin=MARGIN,
        rightMargin=MARGIN,
        topMargin=MARGIN,
        bottomMargin=MARGIN,
        title=f"ACME Finance Board Pack — {month_label}",
        author="ACME Finance",
    )

    # Attach custom attributes used by canvas callbacks
    doc.cover_subtitle = f"Period: {month_label}  ·  Entity: {entity}"
    doc.footer_period  = period

    # Two page templates: cover (no frame drawn) and content
    cover_template = PageTemplate(
        id="cover",
        frames=[Frame(0, 0, PAGE_W, PAGE_H, leftPadding=0, rightPadding=0,
                      topPadding=0, bottomPadding=0)],
        onPage=_draw_cover,
    )
    content_template = PageTemplate(
        id="content",
        frames=[Frame(MARGIN, MARGIN + 20, CONTENT_W, PAGE_H - 2 * MARGIN - 20,
                      leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)],
        onPage=_draw_content_page,
    )
    doc.addPageTemplates([cover_template, content_template])

    story = []

    # ── 1. Cover page ─────────────────────────────────────────────────────────
    # _draw_cover draws everything directly on the canvas; the Spacer just
    # ensures the cover frame gets "used" so reportlab renders page 1.
    # NextPageTemplate locks ALL subsequent pages to the content template —
    # without this, BaseDocTemplate would cycle back to the cover template
    # on page 3, causing the cover artwork to bleed through as a ghost overlay.
    story.append(Spacer(1, 1))
    story.append(NextPageTemplate("content"))
    story.append(PageBreak())

    # ── 2. P&L Summary ───────────────────────────────────────────────────────
    story.extend(_section_header("P&L Summary"))

    pl_rows = _build_pl_rows(pl_data)
    if pl_rows:
        # mart_pl carries actuals only; show a clean 2-column actuals table
        col_w = [CONTENT_W * 0.65, CONTENT_W * 0.35]
        table_data = [["Metric", "Actual ($M)"]]
        style_extra = []
        for i, row in enumerate(pl_rows):
            table_data.append([row["metric"], row["actual"]])
            # Bold the summary rows
            if row.get("bold"):
                data_row = i + 1
                style_extra += [("FONTNAME", (0, data_row), (1, data_row), "Helvetica-Bold")]

        tbl = Table(table_data, colWidths=col_w, repeatRows=1)
        tbl.setStyle(TableStyle(_alternating_style(len(pl_rows), 2) + style_extra))
        story.append(tbl)
    else:
        story.append(Paragraph("No P&L data available for the selected period.", STYLE_BODY))

    story.append(Spacer(1, 16))

    # ── 3. ARR Waterfall ──────────────────────────────────────────────────────
    story.extend(_section_header("ARR Waterfall"))

    arr_rows = _build_arr_rows(arr_data)
    if arr_rows:
        col_w_arr = [CONTENT_W * 0.6, CONTENT_W * 0.4]
        table_data_arr = [["Movement Type", "ARR ($M)"]]
        style_arr_extra = []
        for i, row in enumerate(arr_rows):
            table_data_arr.append([row["label"], row["value"]])
            data_row = i + 1
            if row.get("bold"):
                style_arr_extra += [
                    ("FONTNAME", (0, data_row), (1, data_row), "Helvetica-Bold"),
                    ("BACKGROUND", (0, data_row), (1, data_row), colors.HexColor("#e2e8f0")),
                ]

        tbl_arr = Table(table_data_arr, colWidths=col_w_arr, repeatRows=1)
        tbl_arr.setStyle(TableStyle(_alternating_style(len(arr_rows), 2) + style_arr_extra))
        story.append(tbl_arr)
    else:
        story.append(Paragraph("No ARR data available for the selected period.", STYLE_BODY))

    story.append(Spacer(1, 16))

    # ── 4. AR Aging ───────────────────────────────────────────────────────────
    story.extend(_section_header("AR Aging"))

    ar_rows = _build_ar_rows(ar_data)
    if ar_rows:
        col_w_ar = [CONTENT_W * 0.4, CONTENT_W * 0.3, CONTENT_W * 0.3]
        table_data_ar = [["Aging Bucket", "Balance ($M)", "% of Total"]]
        for row in ar_rows:
            table_data_ar.append([row["bucket"], row["balance"], row["pct"]])

        tbl_ar = Table(table_data_ar, colWidths=col_w_ar, repeatRows=1)
        tbl_ar.setStyle(TableStyle(_alternating_style(len(ar_rows), 3)))
        story.append(tbl_ar)
        story.append(Paragraph(
            f"<i>AR aging as of fiscal year {period[:4]}. "
            "Aging buckets shown reflect overdue tiers present in the data for this period. "
            "Tiers with zero balance are excluded.</i>",
            ParagraphStyle("acme_note", parent=STYLE_BODY, fontSize=8,
                           textColor=C_FOOTER, spaceBefore=4),
        ))
    else:
        story.append(Paragraph("No AR aging data available for the selected period.", STYLE_BODY))

    story.append(Spacer(1, 16))

    # ── 5. Management Commentary ──────────────────────────────────────────────
    # KeepTogether ensures the section header never appears alone at page bottom
    if commentary and commentary.strip():
        paragraphs = [p.strip() for p in commentary.split("\n\n") if p.strip()]
        if not paragraphs:
            paragraphs = [commentary.strip()]
        first_para = Paragraph(paragraphs[0], STYLE_BODY)
        story.append(KeepTogether(
            _section_header("Management Commentary") + [first_para, Spacer(1, 6)]
        ))
        for para in paragraphs[1:]:
            story.append(Paragraph(para, STYLE_BODY))
            story.append(Spacer(1, 6))
    else:
        story.extend(_section_header("Management Commentary"))
        story.append(Paragraph("Commentary not available.", STYLE_BODY))

    # ── Build PDF ─────────────────────────────────────────────────────────────
    doc.build(story)
    return buf.getvalue()


# ── Data transformation helpers ───────────────────────────────────────────────

def _build_pl_rows(pl_data: list[dict]) -> list[dict]:
    """
    Aggregate pl_data rows (one row per entity/period) into a single summary,
    then return display rows matching the board-pack P&L structure.
    """
    if not pl_data:
        return []

    def _sum(field: str) -> float:
        return sum(float(r.get(field) or 0) for r in pl_data)

    rev     = _sum("total_revenue")
    cogs    = _sum("cogs")
    gp      = _sum("gross_profit")
    sm      = _sum("sales_marketing")
    rd      = _sum("research_dev")
    ga      = _sum("general_admin")
    opex    = _sum("total_opex")
    oi      = _sum("operating_income")

    gm_pct = (gp / rev * 100) if rev else 0.0
    om_pct = (oi / rev * 100) if rev else 0.0

    # Actuals-only rows (mart_pl has no plan columns)
    rows = [
        {"metric": "Revenue",           "actual": _fmt_m(rev),     "bold": False},
        {"metric": "COGS",              "actual": _fmt_m(cogs),    "bold": False},
        {"metric": "Gross Profit",      "actual": _fmt_m(gp),      "bold": True},
        {"metric": "Gross Margin %",    "actual": _fmt_pct(gm_pct),"bold": False},
        {"metric": "S&M",               "actual": _fmt_m(sm),      "bold": False},
        {"metric": "R&D",               "actual": _fmt_m(rd),      "bold": False},
        {"metric": "G&A",               "actual": _fmt_m(ga),      "bold": False},
        {"metric": "Total OpEx",        "actual": _fmt_m(opex),    "bold": True},
        {"metric": "Operating Income",  "actual": _fmt_m(oi),      "bold": True},
        {"metric": "Operating Margin %","actual": _fmt_pct(om_pct),"bold": False},
    ]
    return rows


def _build_arr_rows(arr_data: list[dict]) -> list[dict]:
    """
    Summarise arr_data by movement_type (summing arr_change) and produce
    the waterfall display order: Beginning ARR, New, Expansion, Contraction,
    Churn, Net Change, Ending ARR.
    """
    if not arr_data:
        return []

    totals: dict[str, float] = {}
    for row in arr_data:
        mt = str(row.get("movement_type", "")).lower().strip()
        val = float(row.get("arr_change") or 0)
        totals[mt] = totals.get(mt, 0.0) + val

    new_val     = totals.get("new", 0.0)
    exp_val     = totals.get("expansion", 0.0)
    con_val     = totals.get("contraction", 0.0)   # typically negative
    churn_val   = totals.get("churn", 0.0)          # typically negative
    renewal_val = totals.get("renewal", 0.0)
    # Net change = sum of all period movements
    net_val = new_val + exp_val + con_val + churn_val + renewal_val

    rows = [
        {"label": "  New",          "value": _fmt_m(new_val),     "bold": False},
        {"label": "  Expansion",    "value": _fmt_m(exp_val),     "bold": False},
        {"label": "  Renewal",      "value": _fmt_m(renewal_val), "bold": False},
        {"label": "  Contraction",  "value": _fmt_m(con_val),     "bold": False},
        {"label": "  Churn",        "value": _fmt_m(churn_val),   "bold": False},
        {"label": "Net ARR Change", "value": _fmt_m(net_val),     "bold": True},
    ]
    # Drop zero-value rows (e.g. renewal = $0.0M in periods with none)
    rows = [r for r in rows if r["value"] != "$0.0M" or r["bold"]]
    return rows


def _build_ar_rows(ar_data: list[dict]) -> list[dict]:
    """
    Aggregate ar_data by aging_bucket, compute % of total, return in bucket order.
    """
    if not ar_data:
        return []

    bucket_totals: dict[str, float] = {}
    for row in ar_data:
        bucket = str(row.get("aging_bucket", "Unknown"))
        amount = float(row.get("total_amount") or 0)
        bucket_totals[bucket] = bucket_totals.get(bucket, 0.0) + amount

    total = sum(bucket_totals.values())
    # Canonical ordering — normalized comparison handles naming variations
    # (e.g. "0-30 days" vs "0-30", "90+ days" vs "90+")
    def _bucket_sort_key(b: str) -> int:
        b_lower = b.lower()
        if "0-30" in b_lower or b_lower.startswith("0"):
            return 0
        if "31-60" in b_lower:
            return 1
        if "61-90" in b_lower:
            return 2
        if "90+" in b_lower or "90 " in b_lower:
            return 3
        return 99   # unknown buckets last

    rows = []
    for bucket in sorted(bucket_totals.keys(), key=_bucket_sort_key):
        val = bucket_totals[bucket]
        pct = (val / total * 100) if total else 0.0
        rows.append({
            "bucket":  bucket,
            "balance": _fmt_m(val),
            "pct":     _fmt_pct(pct),
        })
    # Total row
    rows.append({
        "bucket":  "Total",
        "balance": _fmt_m(total),
        "pct":     "100.0%",
    })
    return rows
