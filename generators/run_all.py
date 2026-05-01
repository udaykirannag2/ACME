"""ACME generator orchestrator and CLI entry point.

Phase 2A: reference data (entities, COA, cost centers).
Phase 2B: CRM (accounts, contacts, opps, opp_lines, ARR movements, pipeline snapshots).
Phase 2C: AR (customers, invoices, receipts), AP (vendors, opex invoices, payments),
          payroll (semi-monthly AP), fixed assets (capex + depreciation).
Phase 2D: GL auto-posting + balance assertions (next).
Phase 2E: EPM + anomalies + S3 upload.

Usage:
    uv run acme-generate                           # full mode, default seed
    uv run acme-generate --quick                   # 10% scale for fast dev
    uv run acme-generate --years 2024,2025         # subset of fiscal years
    uv run acme-generate --out _out --seed 42
"""
from __future__ import annotations

from pathlib import Path

import click
import numpy as np
from dateutil.relativedelta import relativedelta
from faker import Faker
from rich.console import Console
from rich.table import Table

from . import ap as ap_module
from . import ar as ar_module
from . import config as cfg
from . import crm as crm_module
from . import entities
from . import fixed_assets as fa_module
from . import payroll as payroll_module
from .output import write_crm_table, write_erp_table

console = Console()


def _parse_years(years_str: str) -> list[int]:
    out = sorted({int(y.strip()) for y in years_str.split(",") if y.strip()})
    if not out:
        raise click.BadParameter("--years must have at least one year")
    for y in out:
        if y not in cfg.REVENUE_BY_FY:
            raise click.BadParameter(
                f"FY{y} not configured in REVENUE_BY_FY (valid: "
                f"{sorted(cfg.REVENUE_BY_FY.keys())})"
            )
    return out


def _format_money(x: float) -> str:
    if x >= 1e9:
        return f"${x/1e9:,.2f}B"
    if x >= 1e6:
        return f"${x/1e6:,.1f}M"
    if x >= 1e3:
        return f"${x/1e3:,.0f}K"
    return f"${x:,.0f}"


@click.command()
@click.option("--seed", type=int, default=cfg.DEFAULT_SEED)
@click.option("--years", default="2023,2024,2025")
@click.option("--out", "out_dir", default="generators/_out")
@click.option("--quick", is_flag=True)
def main(seed: int, years: str, out_dir: str, quick: bool) -> None:
    """Regenerate ACME synthetic data."""
    fiscal_years = _parse_years(years)
    out_root = Path(out_dir).resolve()
    mode = cfg.MODE_QUICK if quick else cfg.MODE_FULL

    rng = np.random.default_rng(seed)
    Faker.seed(seed)
    faker = Faker(["en_US"])

    console.rule("[bold cyan]ACME data generator")
    summary = Table(show_header=False, box=None, padding=(0, 2))
    summary.add_column(style="dim")
    summary.add_column()
    summary.add_row("Mode",          f"{mode.name}  [dim]({mode.description})[/dim]")
    summary.add_row("Fiscal years",  ", ".join(f"FY{y}" for y in fiscal_years))
    summary.add_row("Seed",          str(seed))
    summary.add_row("Output root",   str(out_root))
    console.print(summary)
    console.print()

    # ------------------------------------------------------------------------
    # Phase 2A — Reference
    # ------------------------------------------------------------------------
    console.rule("[cyan]Phase 2A: Reference data")

    entities_rows = entities.gen_entities()
    coa_rows = entities.gen_chart_of_accounts()
    cc_rows = entities.gen_cost_centers()
    entities.assert_reference_invariants(entities_rows, coa_rows, cc_rows)

    write_erp_table(entities_rows, out_root, "entity")
    write_erp_table(coa_rows, out_root, "chart_of_accounts")
    write_erp_table(cc_rows, out_root, "cost_center")

    a_table = Table(title="Reference data", show_header=True, header_style="bold")
    a_table.add_column("Table"); a_table.add_column("Rows", justify="right")
    a_table.add_row("entity",            f"{len(entities_rows):,}")
    a_table.add_row("chart_of_accounts", f"{len(coa_rows):,}")
    a_table.add_row("cost_center",       f"{len(cc_rows):,}")
    console.print(a_table)
    console.print()

    # ------------------------------------------------------------------------
    # Phase 2B — CRM
    # ------------------------------------------------------------------------
    console.rule("[cyan]Phase 2B: CRM")

    crm_rng = np.random.default_rng(rng.integers(0, 2**31))
    crm = crm_module.generate_crm(crm_rng, faker, mode)

    write_crm_table(crm.accounts, out_root, "account")
    write_crm_table(crm.contacts, out_root, "contact")
    write_crm_table(crm.opportunities, out_root, "opportunity")
    write_crm_table(crm.opportunity_lines, out_root, "opportunity_line")
    write_crm_table(crm.arr_movements, out_root, "arr_movement", partition_by="period_yyyymm")
    write_crm_table(crm.pipeline_snapshots, out_root, "pipeline_snapshot", partition_by="snapshot_date")

    b_table = Table(title="CRM data", show_header=True, header_style="bold")
    b_table.add_column("Table"); b_table.add_column("Rows", justify="right")
    b_table.add_row("account",            f"{len(crm.accounts):,}")
    b_table.add_row("contact",            f"{len(crm.contacts):,}")
    b_table.add_row("opportunity",        f"{len(crm.opportunities):,}")
    b_table.add_row("opportunity_line",   f"{len(crm.opportunity_lines):,}")
    b_table.add_row("arr_movement",       f"{len(crm.arr_movements):,}")
    b_table.add_row("pipeline_snapshot",  f"{len(crm.pipeline_snapshots):,}")
    console.print(b_table)
    console.print()

    # ------------------------------------------------------------------------
    # Phase 2C — AR / AP / Payroll / Fixed Assets
    # ------------------------------------------------------------------------
    console.rule("[cyan]Phase 2C: AR / AP / Payroll / Fixed Assets")

    # ----- AR -----
    ar_rng = np.random.default_rng(rng.integers(0, 2**31))
    ar = ar_module.generate_ar(ar_rng, crm.accounts, crm.opportunities)
    write_erp_table(ar.customers, out_root, "customer")
    write_erp_table(ar.ar_invoices, out_root, "ar_invoice")
    write_erp_table(ar.ar_receipts, out_root, "ar_receipt")

    # ----- AP non-payroll opex -----
    ap_rng = np.random.default_rng(rng.integers(0, 2**31))
    ap = ap_module.generate_ap(
        ap_rng, faker, coa_rows, cc_rows, fiscal_years,
        scale=mode.customer_scale,
    )

    # ----- Payroll (cash comp + SBC) -----
    # Find the payroll vendor (created by ap_module.generate_vendors)
    payroll_vendors = [v for v in ap.vendors if v.vendor_category == "payroll_provider"]
    if not payroll_vendors:
        raise RuntimeError("payroll provider vendor missing — check VENDORS_PER_CATEGORY")
    payroll_vendor = payroll_vendors[0]

    payroll_rng = np.random.default_rng(rng.integers(0, 2**31))
    payroll = payroll_module.generate_payroll(
        payroll_rng, coa_rows, cc_rows, payroll_vendor, fiscal_years,
        scale=mode.customer_scale,
    )

    all_ap_invoices = ap.ap_invoices + payroll.ap_invoices
    all_ap_payments = ap.ap_payments + payroll.ap_payments

    write_erp_table(ap.vendors, out_root, "vendor")
    write_erp_table(all_ap_invoices, out_root, "ap_invoice")
    write_erp_table(all_ap_payments, out_root, "ap_payment")

    # ----- Fixed Assets -----
    fa_rng = np.random.default_rng(rng.integers(0, 2**31))
    fa = fa_module.generate_fixed_assets(fa_rng, cc_rows, fiscal_years, scale=mode.customer_scale)
    write_erp_table(fa.fixed_assets, out_root, "fixed_asset")
    write_erp_table(fa.depreciation, out_root, "fa_depreciation")

    # SBC pending journals will be consumed by Phase 2D (GL auto-poster).
    # For now, just expose count for visibility.

    c_table = Table(title="ERP transactional data", show_header=True, header_style="bold")
    c_table.add_column("Table"); c_table.add_column("Rows", justify="right")
    c_table.add_row("customer",         f"{len(ar.customers):,}")
    c_table.add_row("vendor",           f"{len(ap.vendors):,}")
    c_table.add_row("ar_invoice",       f"{len(ar.ar_invoices):,}")
    c_table.add_row("ar_receipt",       f"{len(ar.ar_receipts):,}")
    c_table.add_row("ap_invoice",       f"{len(all_ap_invoices):,}")
    c_table.add_row("ap_payment",       f"{len(all_ap_payments):,}")
    c_table.add_row("fixed_asset",      f"{len(fa.fixed_assets):,}")
    c_table.add_row("fa_depreciation",  f"{len(fa.depreciation):,}")
    c_table.add_row("[dim]sbc_pending_journals[/dim]", f"[dim]{len(payroll.sbc_journals):,}[/dim]")
    console.print(c_table)

    # Tie-out: AP opex actuals vs target ratios
    console.print()
    console.print("[bold]Opex tie-out (AP non-payroll + payroll cash, $ per FY)[/bold]")

    # Aggregate AP invoice amounts by FY and pnl_rollup
    coa_by_id = {a.account_id: a for a in coa_rows}
    by_fy_rollup: dict[tuple[int, str], float] = {}
    for inv in all_ap_invoices:
        rollup = coa_by_id[inv.account_id].pnl_rollup
        # FY: Feb-Jan. Compute fiscal year for this invoice.
        m, y = inv.invoice_date.month, inv.invoice_date.year
        fy_year = y + 1 if m >= 2 else y
        by_fy_rollup[(fy_year, rollup)] = by_fy_rollup.get((fy_year, rollup), 0.0) + inv.amount

    # Total revenue per FY scaled by mode
    tie = Table(show_header=True, header_style="bold")
    tie.add_column("FY")
    tie.add_column("Rollup")
    tie.add_column("AP actual", justify="right")
    tie.add_column("Target (cash, ex SBC)", justify="right")
    tie.add_column("Δ", justify="right")

    target_pct = {
        "cogs": cfg.OPEX_RATIOS.cogs_pct,
        "sm":   cfg.OPEX_RATIOS.sm_pct,
        "rd":   cfg.OPEX_RATIOS.rd_pct,
        "ga":   cfg.OPEX_RATIOS.ga_pct,
    }
    # Cash AP = cash_payroll + non_payroll. SBC is 15% of cash_payroll (no AP).
    # If non_payroll_share = N of total opex, then cash_payroll = (1-N) / 1.15 of total
    # and cash AP = (1-N)/1.15 + N of total.
    # NOTE: COGS shows ~20-25% gap because ACME's model has no "professional
    # services delivery" function whose salaries would post to COGS accounts.
    # Customer Success function carries the COGS payroll alone (16% of HC).
    non_payroll_share = {"cogs": 0.55, "sm": 0.45, "rd": 0.30, "ga": 0.50}

    for fy in fiscal_years:
        rev = cfg.REVENUE_BY_FY[fy] * mode.customer_scale
        for rollup in ("cogs", "sm", "rd", "ga"):
            actual = by_fy_rollup.get((fy, rollup), 0.0)
            n = non_payroll_share[rollup]
            cash_ap_share = (1 - n) / 1.15 + n   # = total opex × this ratio
            target = rev * target_pct[rollup] * cash_ap_share
            delta = (actual - target) / target * 100 if target else 0.0
            tie.add_row(
                f"FY{fy}",
                rollup,
                _format_money(actual),
                _format_money(target),
                f"{delta:+.1f}%",
            )
    console.print(tie)

    # Capex tie-out
    console.print()
    capex_by_fy: dict[int, float] = {}
    for asset in fa.fixed_assets:
        m, y = asset.acquisition_date.month, asset.acquisition_date.year
        fy_year = y + 1 if m >= 2 else y
        capex_by_fy[fy_year] = capex_by_fy.get(fy_year, 0.0) + asset.acquisition_cost

    cap_table = Table(title="Capex tie-out", show_header=True, header_style="bold")
    cap_table.add_column("FY"); cap_table.add_column("Capex actual", justify="right")
    cap_table.add_column("Target", justify="right"); cap_table.add_column("Δ", justify="right")
    for fy in fiscal_years:
        rev = cfg.REVENUE_BY_FY[fy] * mode.customer_scale
        actual = capex_by_fy.get(fy, 0.0)
        target = rev * cfg.CAPEX_PCT_OF_REVENUE
        delta = (actual - target) / target * 100 if target else 0.0
        cap_table.add_row(
            f"FY{fy}",
            _format_money(actual),
            _format_money(target),
            f"{delta:+.1f}%",
        )
    console.print(cap_table)

    # ------------------------------------------------------------------------
    # Future phases
    # ------------------------------------------------------------------------
    console.print()
    console.print("[yellow]Phase 2D-2E not yet implemented.[/yellow] Coming next:")
    console.print("  • [dim]2D[/dim] GL journals (auto-posted from AR/AP/FA + SBC pending) + balance assertions")
    console.print("  • [dim]2E[/dim] EPM budgets/forecasts, seeded anomalies, S3 upload")

    console.rule("[bold green]Done")


if __name__ == "__main__":
    main()


# Keep imports
_ = relativedelta
