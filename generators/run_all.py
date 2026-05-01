"""ACME generator orchestrator and CLI entry point.

In Phase 2A this only generates the reference tables (entities, COA, cost
centers). Subsequent phases (2B-2E) plug in CRM, AR/AP, GL, EPM, and anomaly
generators behind this same CLI surface.

Usage:
    uv run acme-generate                           # full mode, default seed
    uv run acme-generate --quick                   # 10% scale for fast dev
    uv run acme-generate --years 2024,2025         # subset of fiscal years
    uv run acme-generate --out _out --seed 42
"""
from __future__ import annotations

from pathlib import Path

import click
from rich.console import Console
from rich.table import Table

from . import config as cfg
from . import entities
from .output import write_erp_table

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

    counts = Table(title="Reference data written", show_header=True, header_style="bold")
    counts.add_column("Table")
    counts.add_column("Rows", justify="right")
    counts.add_column("Path")
    counts.add_row("entity",            str(n_entities), str(out_root / "erp" / "entity.csv"))
    counts.add_row("chart_of_accounts", str(n_coa),      str(out_root / "erp" / "chart_of_accounts.csv"))
    counts.add_row("cost_center",       str(n_cc),       str(out_root / "erp" / "cost_center.csv"))
    console.print(counts)

    # ------------------------------------------------------------------------
    # Future phases will hook in here
    # ------------------------------------------------------------------------
    console.print()
    console.print("[yellow]Phase 2B-2E not yet implemented.[/yellow] Coming next:")
    console.print("  • [dim]2B[/dim] CRM accounts, opportunities, ARR movements")
    console.print("  • [dim]2C[/dim] AR invoices/receipts, AP invoices/payments, payroll, fixed assets")
    console.print("  • [dim]2D[/dim] GL journals (auto-posted) + balance assertions")
    console.print("  • [dim]2E[/dim] EPM budgets/forecasts, seeded anomalies, S3 upload")

    console.rule("[bold green]Done")


if __name__ == "__main__":
    main()
