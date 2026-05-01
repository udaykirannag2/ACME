"""ACME generator orchestrator and CLI entry point.

Phase 2A: reference data (entities, COA, cost centers).
Phase 2B: CRM (accounts, contacts, opps, opp_lines, ARR movements, pipeline snapshots).
Phase 2C-2E: AR/AP/payroll/FA, GL auto-posting, EPM, anomalies.

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
from faker import Faker
from rich.console import Console
from rich.table import Table

from . import config as cfg
from . import crm as crm_module
from . import entities
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
@click.option(
    "--seed", type=int, default=cfg.DEFAULT_SEED,
    help="Random seed for deterministic output. Default: 20260501.",
)
@click.option(
    "--years", default="2023,2024,2025",
    help="Comma-separated fiscal years to generate. Default: 2023,2024,2025.",
)
@click.option(
    "--out", "out_dir", default="generators/_out",
    help="Output directory (relative to repo root). Default: generators/_out.",
)
@click.option(
    "--quick", is_flag=True,
    help="Quick mode (10%% scale) for fast iteration.",
)
def main(seed: int, years: str, out_dir: str, quick: bool) -> None:
    """Regenerate ACME synthetic data."""
    fiscal_years = _parse_years(years)
    out_root = Path(out_dir).resolve()
    mode = cfg.MODE_QUICK if quick else cfg.MODE_FULL

    # Single seeded RNG — sub-streams via spawn() for module independence
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
    summary.add_row("Currency",      "USD")
    summary.add_row("Entities",      ", ".join(e.entity_id for e in cfg.ENTITIES))
    summary.add_row("Segments",      ", ".join(s.code for s in cfg.SEGMENTS))
    console.print(summary)
    console.print()

    # ------------------------------------------------------------------------
    # Phase 2A — reference tables
    # ------------------------------------------------------------------------
    console.rule("[cyan]Phase 2A: Reference data")

    entities_rows = entities.gen_entities()
    coa_rows = entities.gen_chart_of_accounts()
    cc_rows = entities.gen_cost_centers()

    entities.assert_reference_invariants(entities_rows, coa_rows, cc_rows)

    n_entities = write_erp_table(entities_rows, out_root, "entity")
    n_coa = write_erp_table(coa_rows, out_root, "chart_of_accounts")
    n_cc = write_erp_table(cc_rows, out_root, "cost_center")

    counts_a = Table(title="Reference data written", show_header=True, header_style="bold")
    counts_a.add_column("Table")
    counts_a.add_column("Rows", justify="right")
    counts_a.add_column("Path")
    counts_a.add_row("entity",            str(n_entities), "erp/entity.csv")
    counts_a.add_row("chart_of_accounts", str(n_coa),      "erp/chart_of_accounts.csv")
    counts_a.add_row("cost_center",       str(n_cc),       "erp/cost_center.csv")
    console.print(counts_a)
    console.print()

    # ------------------------------------------------------------------------
    # Phase 2B — CRM
    # ------------------------------------------------------------------------
    console.rule("[cyan]Phase 2B: CRM")

    crm_rng = np.random.default_rng(rng.integers(0, 2**31))
    crm = crm_module.generate_crm(crm_rng, faker, mode)

    n_accounts = write_crm_table(crm.accounts, out_root, "account")
    n_contacts = write_crm_table(crm.contacts, out_root, "contact")
    n_opps = write_crm_table(
        crm.opportunities, out_root, "opportunity",
    )
    n_opp_lines = write_crm_table(crm.opportunity_lines, out_root, "opportunity_line")
    n_arr = write_crm_table(
        crm.arr_movements, out_root, "arr_movement",
        partition_by="period_yyyymm",
    )
    n_snap = write_crm_table(
        crm.pipeline_snapshots, out_root, "pipeline_snapshot",
        partition_by="snapshot_date",
    )

    counts_b = Table(title="CRM data written", show_header=True, header_style="bold")
    counts_b.add_column("Table")
    counts_b.add_column("Rows", justify="right")
    counts_b.add_column("Path")
    counts_b.add_row("account",            f"{n_accounts:,}",  "crm/account/")
    counts_b.add_row("contact",            f"{n_contacts:,}",  "crm/contact/")
    counts_b.add_row("opportunity",        f"{n_opps:,}",      "crm/opportunity/")
    counts_b.add_row("opportunity_line",   f"{n_opp_lines:,}", "crm/opportunity_line/")
    counts_b.add_row("arr_movement",       f"{n_arr:,}",       "crm/arr_movement/period_yyyymm=*/")
    counts_b.add_row("pipeline_snapshot",  f"{n_snap:,}",      "crm/pipeline_snapshot/snapshot_date=*/")
    console.print(counts_b)

    # CRM tie-out: ARR trajectory vs target
    console.print()
    console.print("[bold]ARR trajectory tie-out[/bold]")
    tie = Table(show_header=True, header_style="bold")
    tie.add_column("Period")
    tie.add_column("Generated ARR", justify="right")
    tie.add_column("Implied annual revenue", justify="right")
    tie.add_column("Target FY revenue", justify="right")
    tie.add_column("Δ", justify="right")
    for fy in fiscal_years:
        eop_period = cfg.period_yyyymm(cfg.fy_end(fy))
        gen_arr = crm.arr_by_period.get(eop_period, 0.0)
        # Implied subscription revenue for that FY = avg ARR over its 12 months × 0.88 (sub share)
        bop_period = cfg.period_yyyymm(cfg.fy_start(fy))
        # Average over 12 monthly snapshots
        periods = []
        d = cfg.fy_start(fy)
        while d <= cfg.fy_end(fy):
            periods.append(cfg.period_yyyymm(d))
            d += __import__("dateutil.relativedelta", fromlist=["relativedelta"]).relativedelta(months=1)
        avg_arr = sum(crm.arr_by_period.get(p, 0.0) for p in periods) / max(len(periods), 1)
        # Target = subscription portion (~88% of total revenue per data dictionary)
        # Scale target by customer_scale so quick-mode comparisons are sensible.
        target_total = cfg.REVENUE_BY_FY[fy] * mode.customer_scale
        target_sub = target_total * 0.88
        delta_pct = (avg_arr - target_sub) / target_sub * 100 if target_sub else 0.0
        tie.add_row(
            f"FY{fy} EOP",
            _format_money(gen_arr),
            _format_money(avg_arr),
            _format_money(target_sub),
            f"{delta_pct:+.1f}%",
        )
    console.print(tie)

    # ------------------------------------------------------------------------
    # Future phases
    # ------------------------------------------------------------------------
    console.print()
    console.print("[yellow]Phase 2C-2E not yet implemented.[/yellow] Coming next:")
    console.print("  • [dim]2C[/dim] AR invoices/receipts, AP invoices/payments, payroll, fixed assets")
    console.print("  • [dim]2D[/dim] GL journals (auto-posted) + balance assertions")
    console.print("  • [dim]2E[/dim] EPM budgets/forecasts, seeded anomalies, S3 upload")

    console.rule("[bold green]Done")


if __name__ == "__main__":
    main()
