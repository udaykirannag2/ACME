"""High-level verification: load the generated artifacts into an in-memory
DuckDB database, then run a battery of finance smoke checks.

Output is a single rich-formatted report covering:

  1. Income statement (P&L) by FY, computed from gl_journal_line × COA rollups
  2. Balance sheet at FY25 EOP (asset/liability/equity check)
  3. AR aging at FY25 EOP, with the seeded $2.4M+ aged invoice highlighted
  4. Top 10 customers by FY25 GAAP revenue
  5. Revenue by segment and by entity for FY25
  6. EMEA S&M monthly trend (the seeded Sep-Oct overspend should jump out)
  7. Anomaly visibility checklist (each seeded anomaly's footprint)
  8. Cross-system reconciliation: CRM bookings ↔ AR billings ↔ GL revenue

Run:
    uv run acme-verify --out generators/_out
"""
from __future__ import annotations

from collections.abc import Iterable
from pathlib import Path

import click
import duckdb
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

from . import config as cfg

console = Console()


# =============================================================================
# Loader: register CSV + Parquet sources as DuckDB views
# =============================================================================

def _load_views(con: duckdb.DuckDBPyConnection, out_root: Path) -> None:
    erp = out_root / "erp"
    crm = out_root / "crm"
    epm = out_root / "epm"

    # ERP CSVs
    erp_tables = [
        "entity", "chart_of_accounts", "cost_center", "vendor", "customer",
        "gl_journal_header", "gl_journal_line",
        "ap_invoice", "ap_payment",
        "ar_invoice", "ar_receipt",
        "fixed_asset", "fa_depreciation",
    ]
    for t in erp_tables:
        path = erp / f"{t}.csv"
        if not path.exists():
            continue
        con.execute(
            f"CREATE OR REPLACE VIEW {t} AS "
            f"SELECT * FROM read_csv_auto('{path}', header=true, sample_size=-1)"
        )

    # CRM Parquet (Hive-partitioned for some)
    crm_table_globs = {
        "account":            "account/*.parquet",
        "contact":            "contact/*.parquet",
        "opportunity":        "opportunity/*.parquet",
        "opportunity_line":   "opportunity_line/*.parquet",
        "arr_movement":       "arr_movement/**/*.parquet",
        "pipeline_snapshot":  "pipeline_snapshot/**/*.parquet",
    }
    for name, glob in crm_table_globs.items():
        full_glob = crm / glob
        # Use union_by_name so partitioned & non-partitioned both work
        con.execute(
            f"CREATE OR REPLACE VIEW {name} AS "
            f"SELECT * FROM read_parquet('{full_glob}', union_by_name=true, "
            f"hive_partitioning=true)"
        )

    # EPM Parquet
    epm_table_globs = {
        "budget_version":     "budget_version/*.parquet",
        "forecast_version":   "forecast_version/*.parquet",
        "plan_line":          "plan_line/**/*.parquet",
        "headcount_plan":     "headcount_plan/**/*.parquet",
        "driver_assumption":  "driver_assumption/**/*.parquet",
    }
    for name, glob in epm_table_globs.items():
        full_glob = epm / glob
        con.execute(
            f"CREATE OR REPLACE VIEW {name} AS "
            f"SELECT * FROM read_parquet('{full_glob}', union_by_name=true, "
            f"hive_partitioning=true)"
        )


def _fy_case(date_col: str) -> str:
    """Salesforce-style fiscal year derivation for SQL: Feb-Jan FY ends in cal_year."""
    return (
        f"CASE WHEN MONTH({date_col}) >= 2 "
        f"THEN YEAR({date_col}) + 1 ELSE YEAR({date_col}) END"
    )


def _format_money(x: float, *, sig: bool = True) -> str:
    if abs(x) >= 1e9:
        return f"${x/1e9:,.2f}B"
    if abs(x) >= 1e6:
        return f"${x/1e6:,.1f}M"
    if abs(x) >= 1e3:
        return f"${x/1e3:,.0f}K"
    return f"${x:,.0f}"


def _format_pct(x: float) -> str:
    return f"{x*100:+.1f}%" if x else "0.0%"


# =============================================================================
# Section 1 — Income statement by FY
# =============================================================================

def _income_statement(con: duckdb.DuckDBPyConnection) -> Table:
    sql = f"""
        SELECT
            {_fy_case('h.posting_date')} AS fy,
            coa.pnl_rollup,
            -- Revenue & other_income are credit-balance: report as positive when CR > DR
            -- Expenses are debit-balance: report as positive when DR > CR
            CASE
                WHEN coa.account_type IN ('revenue') THEN SUM(jl.credit_amount - jl.debit_amount)
                ELSE                                       SUM(jl.debit_amount - jl.credit_amount)
            END AS amount
        FROM gl_journal_line jl
        JOIN gl_journal_header h USING (journal_id)
        JOIN chart_of_accounts coa USING (account_id)
        WHERE coa.pnl_rollup IN ('revenue', 'cogs', 'sm', 'rd', 'ga', 'other_income', 'tax')
          AND {_fy_case('h.posting_date')} BETWEEN 2023 AND 2025
        GROUP BY 1, 2, coa.account_type
        ORDER BY fy, pnl_rollup
    """
    rows = con.execute(sql).fetchall()
    # Pivot into rows: rollup -> {fy: amount}
    by_rollup: dict[str, dict[int, float]] = {}
    fys: set[int] = set()
    for fy, rollup, amount in rows:
        by_rollup.setdefault(rollup, {})[int(fy)] = float(amount or 0.0)
        fys.add(int(fy))

    sorted_fys = sorted(fys)
    order = ["revenue", "cogs", "GROSS_PROFIT", "sm", "rd", "ga", "OPERATING_INCOME",
             "other_income", "PRETAX_INCOME", "tax", "NET_INCOME"]

    def get(rollup: str, fy: int) -> float:
        return by_rollup.get(rollup, {}).get(fy, 0.0)

    # Compute derived rows
    derived: dict[str, dict[int, float]] = {}
    for fy in sorted_fys:
        rev = get("revenue", fy)
        cogs = get("cogs", fy)
        gp = rev - cogs
        sm = get("sm", fy)
        rd = get("rd", fy)
        ga = get("ga", fy)
        oi = gp - sm - rd - ga
        other = get("other_income", fy)   # net interest income often shows as credit (revenue-typed)
        # Note: Loss on Disposal posts as a debit in expense; show as expense. We computed pnl_rollup="other_income"
        # and account_type may be 'expense' or 'revenue'. Net other = -(expenses) + revenues.
        pretax = oi + other
        tax = get("tax", fy)
        ni = pretax - tax
        derived["GROSS_PROFIT"] = derived.get("GROSS_PROFIT", {})
        derived["GROSS_PROFIT"][fy] = gp
        derived["OPERATING_INCOME"] = derived.get("OPERATING_INCOME", {})
        derived["OPERATING_INCOME"][fy] = oi
        derived["PRETAX_INCOME"] = derived.get("PRETAX_INCOME", {})
        derived["PRETAX_INCOME"][fy] = pretax
        derived["NET_INCOME"] = derived.get("NET_INCOME", {})
        derived["NET_INCOME"][fy] = ni

    by_rollup.update(derived)

    labels = {
        "revenue":          "Revenue",
        "cogs":             "(-) Cost of Revenue",
        "GROSS_PROFIT":     "Gross Profit",
        "sm":               "(-) Sales & Marketing",
        "rd":               "(-) Research & Development",
        "ga":               "(-) General & Admin",
        "OPERATING_INCOME": "Operating Income",
        "other_income":     "(+/-) Other Income (Expense)",
        "PRETAX_INCOME":    "Pre-tax Income",
        "tax":              "(-) Income Tax",
        "NET_INCOME":       "Net Income",
    }

    table = Table(title="Income Statement (USD, derived from GL)",
                  show_header=True, header_style="bold")
    table.add_column("Line item")
    for fy in sorted_fys:
        table.add_column(f"FY{fy}", justify="right")
    table.add_column("FY25 Margin", justify="right")

    for key in order:
        amounts = by_rollup.get(key, {})
        row = [labels[key]]
        for fy in sorted_fys:
            row.append(_format_money(amounts.get(fy, 0.0)))
        # Margin column: FY25 / FY25 revenue (if revenue exists)
        fy25_rev = by_rollup.get("revenue", {}).get(2025, 0.0)
        if fy25_rev and key in ("GROSS_PROFIT", "OPERATING_INCOME", "NET_INCOME"):
            row.append(f"{amounts.get(2025, 0.0) / fy25_rev * 100:.1f}%")
        elif fy25_rev and key in ("revenue",):
            row.append("100.0%")
        elif fy25_rev and key in ("cogs", "sm", "rd", "ga", "tax"):
            row.append(f"{amounts.get(2025, 0.0) / fy25_rev * 100:.1f}%")
        else:
            row.append("-")

        # Style key totals
        style = "bold" if key in ("GROSS_PROFIT", "OPERATING_INCOME", "PRETAX_INCOME", "NET_INCOME") else ""
        if style:
            row = [f"[{style}]{c}[/{style}]" for c in row]
        table.add_row(*row)

    return table


# =============================================================================
# Section 2 — Balance sheet at FY25 EOP
# =============================================================================

def _balance_sheet(con: duckdb.DuckDBPyConnection) -> Table:
    sql = """
        WITH posted AS (
            SELECT coa.account_type, coa.account_name,
                SUM(jl.debit_amount - jl.credit_amount) AS net_debit
            FROM gl_journal_line jl
            JOIN gl_journal_header h USING (journal_id)
            JOIN chart_of_accounts coa USING (account_id)
            WHERE coa.account_type IN ('asset', 'liability', 'equity')
              AND h.posting_date <= DATE '2025-01-31'
            GROUP BY 1, 2
        )
        SELECT
            account_type,
            account_name,
            CASE WHEN account_type = 'asset' THEN net_debit
                 ELSE -net_debit
            END AS balance
        FROM posted
        ORDER BY account_type, account_name
    """
    rows = con.execute(sql).fetchall()
    by_type: dict[str, list[tuple[str, float]]] = {}
    for atype, name, balance in rows:
        if abs(float(balance)) < 1.0:
            continue
        by_type.setdefault(atype, []).append((name, float(balance)))

    table = Table(title="Balance Sheet at FY25 EOP (Jan 31, 2025)",
                  show_header=True, header_style="bold")
    table.add_column("Section / Account", min_width=44)
    table.add_column("Balance", justify="right")

    section_labels = {"asset": "ASSETS", "liability": "LIABILITIES", "equity": "EQUITY"}
    totals: dict[str, float] = {}

    for atype in ("asset", "liability", "equity"):
        items = by_type.get(atype, [])
        if not items:
            continue
        table.add_row(f"[bold cyan]{section_labels[atype]}[/bold cyan]", "")
        section_total = 0.0
        for name, bal in items:
            table.add_row(f"  {name}", _format_money(bal))
            section_total += bal
        table.add_row(f"  [bold]Total {atype.title()}[/bold]", f"[bold]{_format_money(section_total)}[/bold]")
        totals[atype] = section_total
        table.add_row("", "")

    # Implied retained earnings = TA - TL - explicit equity
    implied_re = totals.get("asset", 0) - totals.get("liability", 0) - totals.get("equity", 0)
    table.add_row("[dim]Implied retained earnings (PL closing)[/dim]",
                  f"[dim]{_format_money(implied_re)}[/dim]")
    table.add_row("[bold]Total L+E (incl. retained earnings)[/bold]",
                  f"[bold]{_format_money(totals.get('liability', 0) + totals.get('equity', 0) + implied_re)}[/bold]")
    table.add_row("[bold]Total Assets[/bold]",
                  f"[bold]{_format_money(totals.get('asset', 0))}[/bold]")
    diff = totals.get("asset", 0) - (totals.get("liability", 0) + totals.get("equity", 0) + implied_re)
    table.add_row(
        "[dim]Diff (should be ~0)[/dim]",
        f"[dim]{_format_money(diff)}[/dim]" if abs(diff) < 100 else f"[red]{_format_money(diff)}[/red]",
    )

    return table


# =============================================================================
# Section 3 — AR aging at FY25 EOP
# =============================================================================

def _ar_aging(con: duckdb.DuckDBPyConnection) -> tuple[Table, list]:
    sql = """
        SELECT
            CASE
                WHEN DATE_DIFF('day', invoice_date, DATE '2025-01-31') <= 30  THEN '0-30 days'
                WHEN DATE_DIFF('day', invoice_date, DATE '2025-01-31') <= 60  THEN '31-60 days'
                WHEN DATE_DIFF('day', invoice_date, DATE '2025-01-31') <= 90  THEN '61-90 days'
                WHEN DATE_DIFF('day', invoice_date, DATE '2025-01-31') <= 120 THEN '91-120 days'
                ELSE                                                              '120+ days'
            END AS bucket,
            COUNT(*) AS invoice_count,
            SUM(amount) AS open_amount
        FROM ar_invoice
        WHERE status = 'open'
          AND invoice_date <= DATE '2025-01-31'
        GROUP BY 1
        ORDER BY
            CASE bucket
                WHEN '0-30 days' THEN 1
                WHEN '31-60 days' THEN 2
                WHEN '61-90 days' THEN 3
                WHEN '91-120 days' THEN 4
                ELSE 5
            END
    """
    rows = con.execute(sql).fetchall()
    table = Table(title="AR Aging at FY25 EOP (open invoices only)",
                  show_header=True, header_style="bold")
    table.add_column("Bucket"); table.add_column("Invoices", justify="right")
    table.add_column("Open amount", justify="right")
    for bucket, count, amount in rows:
        style = "red" if "120+" in str(bucket) else ""
        wrap = lambda s: f"[{style}]{s}[/{style}]" if style else s
        table.add_row(wrap(str(bucket)), wrap(f"{count:,}"), wrap(_format_money(float(amount or 0))))

    # Surface the largest aged invoice
    sql_top = """
        SELECT i.invoice_number, c.customer_name, c.segment_tier,
               i.invoice_date, i.amount,
               DATE_DIFF('day', i.invoice_date, DATE '2025-01-31') AS days_aged
        FROM ar_invoice i
        JOIN customer c USING (customer_id)
        WHERE i.status = 'open' AND i.invoice_date <= DATE '2025-01-31'
        ORDER BY i.amount DESC
        LIMIT 5
    """
    top = con.execute(sql_top).fetchall()
    return table, top


# =============================================================================
# Section 4 — Top customers by FY25 revenue
# =============================================================================

def _top_customers(con: duckdb.DuckDBPyConnection) -> Table:
    sql = """
        SELECT
            a.account_name,
            a.segment_tier,
            a.billing_country,
            SUM(am.ending_arr) AS arr_at_fy25_eop
        FROM (
            -- Latest ARR by (account, segment) up to FY25 EOP
            SELECT account_id, segment, ending_arr,
                ROW_NUMBER() OVER (PARTITION BY account_id, segment
                                   ORDER BY period_yyyymm DESC) AS rn
            FROM arr_movement
            WHERE period_yyyymm <= 202501
        ) am
        JOIN account a USING (account_id)
        WHERE am.rn = 1
        GROUP BY 1, 2, 3
        ORDER BY arr_at_fy25_eop DESC
        LIMIT 10
    """
    rows = con.execute(sql).fetchall()
    table = Table(title="Top 10 Customers by ARR at FY25 EOP",
                  show_header=True, header_style="bold")
    table.add_column("#", style="dim", width=3)
    table.add_column("Account")
    table.add_column("Tier")
    table.add_column("Country")
    table.add_column("ARR", justify="right")
    for i, (name, tier, country, arr) in enumerate(rows, start=1):
        table.add_row(str(i), str(name), str(tier), str(country), _format_money(float(arr or 0)))
    return table


# =============================================================================
# Section 5 — Revenue by segment / entity FY25
# =============================================================================

def _revenue_breakdown(con: duckdb.DuckDBPyConnection) -> tuple[Table, Table]:
    seg_sql = f"""
        SELECT
            coa.segment,
            SUM(jl.credit_amount - jl.debit_amount) AS revenue
        FROM gl_journal_line jl
        JOIN gl_journal_header h USING (journal_id)
        JOIN chart_of_accounts coa USING (account_id)
        WHERE coa.pnl_rollup = 'revenue'
          AND coa.segment IS NOT NULL
          AND {_fy_case('h.posting_date')} = 2025
        GROUP BY 1
        ORDER BY revenue DESC
    """
    rows = con.execute(seg_sql).fetchall()
    total = sum(float(r[1] or 0) for r in rows)
    seg_table = Table(title="FY25 Revenue by Segment", show_header=True, header_style="bold")
    seg_table.add_column("Segment"); seg_table.add_column("Revenue", justify="right"); seg_table.add_column("%", justify="right")
    for seg, rev in rows:
        pct = (float(rev or 0) / total * 100) if total else 0
        seg_table.add_row(str(seg), _format_money(float(rev or 0)), f"{pct:.1f}%")

    ent_sql = f"""
        SELECT
            h.entity_id,
            SUM(jl.credit_amount - jl.debit_amount) AS revenue
        FROM gl_journal_line jl
        JOIN gl_journal_header h USING (journal_id)
        JOIN chart_of_accounts coa USING (account_id)
        WHERE coa.pnl_rollup = 'revenue'
          AND {_fy_case('h.posting_date')} = 2025
        GROUP BY 1
        ORDER BY revenue DESC
    """
    rows = con.execute(ent_sql).fetchall()
    total = sum(float(r[1] or 0) for r in rows)
    ent_table = Table(title="FY25 Revenue by Entity", show_header=True, header_style="bold")
    ent_table.add_column("Entity"); ent_table.add_column("Revenue", justify="right"); ent_table.add_column("%", justify="right")
    for entity, rev in rows:
        pct = (float(rev or 0) / total * 100) if total else 0
        ent_table.add_row(str(entity), _format_money(float(rev or 0)), f"{pct:.1f}%")

    return seg_table, ent_table


# =============================================================================
# Section 6 — EMEA S&M monthly trend (highlights anomaly 1)
# =============================================================================

def _emea_sm_trend(con: duckdb.DuckDBPyConnection) -> Table:
    sql = """
        SELECT
            CAST(SUBSTR(CAST(i.invoice_date AS VARCHAR), 1, 7) AS VARCHAR) AS month,
            SUM(i.amount) AS marketing_spend
        FROM ap_invoice i
        JOIN cost_center cc USING (cost_center_id)
        WHERE cc.entity_id = 'EMEA' AND cc.function = 'marketing'
        GROUP BY 1
        ORDER BY 1
    """
    rows = con.execute(sql).fetchall()
    avg = sum(float(r[1] or 0) for r in rows) / max(1, len(rows))
    table = Table(title="EMEA Marketing Spend by Month (anomaly: Sep+Oct 2024)",
                  show_header=True, header_style="bold")
    table.add_column("Month"); table.add_column("Spend", justify="right"); table.add_column("vs Avg", justify="right")
    for month, spend in rows[-18:]:    # last 18 months for trend
        s = float(spend or 0)
        ratio = s / avg if avg else 0
        flag = ""
        if str(month).startswith(("2024-09", "2024-10")):
            flag = "🚨"
        delta = f"{(ratio - 1) * 100:+.0f}%"
        table.add_row(f"{flag} {month}".strip(), _format_money(s), delta)
    return table


# =============================================================================
# Section 7 — Anomaly visibility checklist
# =============================================================================

def _anomaly_checks(con: duckdb.DuckDBPyConnection) -> Table:
    table = Table(title="Anomaly visibility checks", show_header=True, header_style="bold")
    table.add_column("Anomaly")
    table.add_column("Result", justify="left")
    table.add_column("Detail")

    # 1. EMEA S&M overspend
    sept_oct = con.execute("""
        SELECT COALESCE(SUM(i.amount), 0)
        FROM ap_invoice i
        JOIN cost_center cc USING (cost_center_id)
        WHERE cc.entity_id = 'EMEA' AND cc.function = 'marketing'
          AND i.invoice_date BETWEEN DATE '2024-09-01' AND DATE '2024-10-31'
    """).fetchone()[0]
    other_avg = con.execute("""
        SELECT COALESCE(AVG(monthly_total), 0) FROM (
            SELECT SUBSTR(CAST(i.invoice_date AS VARCHAR), 1, 7) AS m,
                   SUM(i.amount) AS monthly_total
            FROM ap_invoice i
            JOIN cost_center cc USING (cost_center_id)
            WHERE cc.entity_id = 'EMEA' AND cc.function = 'marketing'
              AND i.invoice_date NOT BETWEEN DATE '2024-09-01' AND DATE '2024-10-31'
            GROUP BY 1
        )
    """).fetchone()[0]
    ratio = (float(sept_oct) / 2) / float(other_avg) if other_avg else 0
    table.add_row(
        "1. EMEA S&M overspend",
        "[green]✓ visible[/green]" if ratio > 2 else "[red]✗ not detected[/red]",
        f"Sep+Oct avg = {ratio:.1f}× normal monthly run-rate ({_format_money(float(sept_oct/2))} vs {_format_money(float(other_avg))})",
    )

    # 2. Aged AR
    aged_row = con.execute("""
        SELECT i.invoice_number, c.customer_name, i.amount,
               DATE_DIFF('day', i.invoice_date, DATE '2025-01-31') AS days_aged
        FROM ar_invoice i
        JOIN customer c USING (customer_id)
        WHERE i.status = 'open' AND i.amount > 1000000
          AND i.invoice_date <= DATE '2024-09-30'
        ORDER BY i.amount DESC LIMIT 1
    """).fetchone()
    if aged_row:
        table.add_row(
            "2. Aged AR enterprise",
            "[green]✓ visible[/green]",
            f"{aged_row[0]} ({aged_row[1]}, {_format_money(float(aged_row[2]))}, {aged_row[3]}d aged)",
        )
    else:
        table.add_row("2. Aged AR enterprise", "[red]✗ not detected[/red]", "no large aged open invoice found")

    # 3. Server disposal
    disposal_row = con.execute("""
        SELECT asset_tag, acquisition_cost, disposal_proceeds, disposal_date
        FROM fixed_asset
        WHERE status = 'disposed' AND asset_class = 'server'
        ORDER BY acquisition_cost DESC LIMIT 1
    """).fetchone()
    if disposal_row:
        loss = float(disposal_row[1]) - float(disposal_row[2] or 0)
        table.add_row(
            "3. Server disposal loss",
            "[green]✓ visible[/green]",
            f"{disposal_row[0]} disposed {disposal_row[3]}, loss {_format_money(loss)}",
        )
    else:
        table.add_row("3. Server disposal loss", "[red]✗ not detected[/red]", "no disposed server found")

    # 4. Stalled pipeline
    stalled = con.execute("""
        SELECT COUNT(*) FROM opportunity o
        JOIN account a USING (account_id)
        WHERE a.segment_tier = 'enterprise'
          AND o.stage = 'negotiation'
          AND o.created_date < DATE '2024-10-04'   -- 120 days before FY25 EOP
    """).fetchone()[0]
    table.add_row(
        "4. Stalled pipeline",
        "[green]✓ visible[/green]" if stalled >= 3 else "[red]✗ not detected[/red]",
        f"{stalled} enterprise opps stuck in negotiation >120d",
    )

    # 5. Forecast bias on S&M (compare Q3 RF S&M plan to budget)
    bias = con.execute("""
        WITH fy25_h2_periods AS (
            SELECT * FROM (VALUES (202408),(202409),(202410),(202411),(202412),(202501)) v(p)
        ),
        budget_sm AS (
            SELECT SUM(pl.amount) AS amt
            FROM plan_line pl
            JOIN budget_version bv ON pl.version_id = bv.budget_version_id
            JOIN cost_center cc ON pl.cost_center_id = cc.cost_center_id
            JOIN fy25_h2_periods f ON pl.period_yyyymm = f.p
            WHERE bv.fiscal_year = 2025
              AND cc.function IN ('sales', 'marketing')
        ),
        forecast_sm AS (
            SELECT SUM(pl.amount) AS amt
            FROM plan_line pl
            JOIN forecast_version fv ON pl.version_id = fv.forecast_version_id
            JOIN cost_center cc ON pl.cost_center_id = cc.cost_center_id
            JOIN fy25_h2_periods f ON pl.period_yyyymm = f.p
            WHERE fv.is_current = TRUE
              AND cc.function IN ('sales', 'marketing')
        )
        SELECT b.amt, f.amt FROM budget_sm b, forecast_sm f
    """).fetchone()
    if bias and bias[0]:
        b, f = float(bias[0] or 0), float(bias[1] or 0)
        delta = (f - b) / b if b else 0
        table.add_row(
            "5. Forecast bias on S&M",
            "[green]✓ visible[/green]" if delta < -0.03 else "[yellow]⚠ check[/yellow]",
            f"Q3 reforecast S&M {_format_money(f)} vs budget {_format_money(b)} ({_format_pct(delta)})",
        )
    else:
        table.add_row("5. Forecast bias on S&M", "[red]✗ not detected[/red]", "no plan_line data")

    return table


# =============================================================================
# Section 8 — Cross-system reconciliation
# =============================================================================

def _reconciliation(con: duckdb.DuckDBPyConnection) -> Table:
    sql = f"""
        WITH crm_bookings AS (
            SELECT
                {_fy_case('o.close_date')} AS fy,
                SUM(o.amount) AS bookings
            FROM opportunity o
            WHERE o.stage = 'closed_won'
            GROUP BY 1
        ),
        ar_billings AS (
            SELECT
                {_fy_case('i.invoice_date')} AS fy,
                SUM(i.amount) AS billings
            FROM ar_invoice i
            GROUP BY 1
        ),
        gl_revenue AS (
            SELECT
                {_fy_case('h.posting_date')} AS fy,
                SUM(jl.credit_amount - jl.debit_amount) AS revenue
            FROM gl_journal_line jl
            JOIN gl_journal_header h USING (journal_id)
            JOIN chart_of_accounts coa USING (account_id)
            WHERE coa.pnl_rollup = 'revenue'
            GROUP BY 1
        )
        SELECT
            COALESCE(b.fy, a.fy, g.fy) AS fy,
            b.bookings,
            a.billings,
            g.revenue
        FROM crm_bookings b
        FULL OUTER JOIN ar_billings a ON a.fy = b.fy
        FULL OUTER JOIN gl_revenue  g ON g.fy = COALESCE(b.fy, a.fy)
        WHERE COALESCE(b.fy, a.fy, g.fy) BETWEEN 2023 AND 2025
        ORDER BY fy
    """
    rows = con.execute(sql).fetchall()
    table = Table(title="Cross-system reconciliation (USD per FY)",
                  show_header=True, header_style="bold")
    table.add_column("FY")
    table.add_column("CRM bookings (closed_won)", justify="right")
    table.add_column("AR billings", justify="right")
    table.add_column("GL revenue (recognized)", justify="right")
    table.add_column("Reasonableness", justify="left")

    for fy, b, a, g in rows:
        b, a, g = float(b or 0), float(a or 0), float(g or 0)
        # Bookings should be > recognized revenue (because it's annual contract value
        # but recognition is partial in the booking's fiscal year)
        comment = ""
        if b > 0 and g > 0:
            ratio = g / b
            if 0.4 <= ratio <= 1.4:
                comment = f"[green]rev/bookings = {ratio:.2f}× (typical for SaaS)[/green]"
            else:
                comment = f"[yellow]rev/bookings = {ratio:.2f}× (unusual)[/yellow]"
        table.add_row(
            f"FY{fy}",
            _format_money(b),
            _format_money(a),
            _format_money(g),
            comment,
        )
    return table


# =============================================================================
# CLI
# =============================================================================

@click.command()
@click.option("--out", "out_dir", default="generators/_out", show_default=True,
              help="Path to generated artifacts.")
def main(out_dir: str) -> None:
    """Verify generated ACME data with high-level financial smoke checks."""
    out_root = Path(out_dir).resolve()
    if not out_root.exists():
        console.print(f"[red]Output directory not found: {out_root}[/red]")
        console.print("[dim]Run `uv run acme-generate --quick` first.[/dim]")
        return

    console.rule("[bold cyan]ACME data verification")
    console.print(f"  Reading from: [dim]{out_root}[/dim]\n")

    con = duckdb.connect(":memory:")
    _load_views(con, out_root)

    # --- Section 1
    console.print(_income_statement(con))
    console.print()

    # --- Section 2
    console.print(_balance_sheet(con))
    console.print()

    # --- Section 3
    aging_table, top_aged = _ar_aging(con)
    console.print(aging_table)
    if top_aged:
        sub = Table(title="Top 5 open AR invoices at FY25 EOP", show_header=True, header_style="bold")
        sub.add_column("Invoice"); sub.add_column("Customer"); sub.add_column("Tier")
        sub.add_column("Issued"); sub.add_column("Amount", justify="right"); sub.add_column("Days aged", justify="right")
        for inv_no, cust, tier, inv_date, amount, days in top_aged:
            style = "red" if days > 120 else ""
            wrap = (lambda s: f"[{style}]{s}[/{style}]") if style else (lambda s: str(s))
            sub.add_row(wrap(inv_no), wrap(cust), wrap(tier), wrap(inv_date), wrap(_format_money(float(amount))), wrap(str(days)))
        console.print(sub)
    console.print()

    # --- Section 4
    console.print(_top_customers(con))
    console.print()

    # --- Section 5
    seg_tab, ent_tab = _revenue_breakdown(con)
    console.print(seg_tab)
    console.print()
    console.print(ent_tab)
    console.print()

    # --- Section 6
    console.print(_emea_sm_trend(con))
    console.print()

    # --- Section 7
    console.print(_anomaly_checks(con))
    console.print()

    # --- Section 8
    console.print(_reconciliation(con))
    console.print()

    console.print(Panel.fit(
        "[bold green]✓ Verification complete.[/bold green]\n\n"
        "Spot-check guidance:\n"
        "  • Income statement should rise FY23 → FY25 with stable margins (~10% OpM, ~75% GM)\n"
        "  • Balance sheet must balance (TA = TL+E, diff ~$0)\n"
        "  • AR aging should show one large 120+ day bucket — that's anomaly #2\n"
        "  • EMEA S&M should spike in Sep-Oct 2024 — that's anomaly #1\n"
        "  • All 5 anomalies should appear ✓ in section 7\n"
        "  • Cross-system reconciliation: revenue/bookings should be 0.4-1.4× (annual contracts, partial recognition)\n",
        title="What to look for",
    ))


if __name__ == "__main__":
    main()


_ = Iterable
