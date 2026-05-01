"""Phase 2 entry point — regenerate all ACME data deterministically.

Stub. Implement in Phase 2. Will produce:
  - ERP tables (loaded into RDS Postgres)
  - EPM Parquet files (under generators/_out/epm/)
  - CRM Parquet files (under generators/_out/crm/)

Then a separate script uploads to S3.

Usage:
    uv run acme-generate --seed 20260501 --years 2023,2024,2025 --out-dir _out
"""
from __future__ import annotations

import click
from rich.console import Console

console = Console()


@click.command()
@click.option("--seed", type=int, default=20260501, help="Random seed for deterministic output.")
@click.option("--years", default="2023,2024,2025", help="Comma-separated fiscal years to generate.")
@click.option("--out-dir", default="_out", help="Output directory for Parquet files.")
def main(seed: int, years: str, out_dir: str) -> None:
    """Regenerate all ACME synthetic data."""
    console.print("[yellow]Phase 2 stub — not implemented yet.[/yellow]")
    console.print(f"Would generate FY{years} with seed={seed} into ./{out_dir}/")
    console.print("\nTo be implemented:")
    for stage in [
        "1. Generate revenue trajectory and segment mix from CRM 10-K shape",
        "2. Generate CRM accounts, opportunities, ARR movements",
        "3. Generate AR invoices + receipts from closed_won opportunities",
        "4. Generate AP invoices for opex (S&M, R&D, G&A) at target ratios",
        "5. Generate payroll, depreciation, and intercompany journals",
        "6. Generate EPM budget v1 (ahead of FY) and Q1/Q3 forecasts",
        "7. Insert anomalies (EMEA S&M overspend, aged AR, FA disposal)",
        "8. Validate: GL balances per period sum to zero",
    ]:
        console.print(f"   {stage}")


if __name__ == "__main__":
    main()
