"""ACME generator orchestrator and CLI entry point.

Phase 2A: reference data (entities, COA, cost centers).
Phase 2B: CRM (accounts, contacts, opps, opp_lines, ARR movements, pipeline snapshots).
Phase 2C: AR (customers, invoices, receipts), AP (vendors, opex invoices, payments),
          payroll (semi-monthly AP), fixed assets (capex + depreciation).
Phase 2D: GL auto-posting + balance assertions.
Phase 2E: EPM (budgets/forecasts/drivers), seeded anomalies, S3 upload.

Usage:
    uv run acme-generate                                # full mode, default seed
    uv run acme-generate --quick                        # 10% scale, fast iteration
    uv run acme-generate --years 2024,2025              # subset of fiscal years
    uv run acme-generate --no-anomalies                 # skip anomaly injection
    uv run acme-generate --upload --s3-bucket BUCKET    # upload to S3 after gen
"""
from __future__ import annotations

import os
from pathlib import Path

import click
import numpy as np
from dateutil.relativedelta import relativedelta
from faker import Faker
from rich.console import Console
from rich.table import Table

from . import anomalies as anomalies_module
from . import ap as ap_module
from . import ar as ar_module
from . import config as cfg
from . import crm as crm_module
from . import entities
from . import epm as epm_module
from . import fixed_assets as fa_module
from . import gl as gl_module
from . import payroll as payroll_module
from . import s3_upload as s3_module
from . import validate as validate_module
from .output import write_crm_table, write_epm_table, write_erp_table

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
@click.option("--no-anomalies", is_flag=True, help="Skip anomaly injection.")
@click.option("--upload", is_flag=True, help="Upload generated artifacts to S3.")
@click.option("--s3-bucket", default=None, help="S3 bucket name for upload.")
@click.option("--aws-profile", default=None, help="AWS profile name (env: AWS_PROFILE).")
def main(
    seed: int,
    years: str,
    out_dir: str,
    quick: bool,
    no_anomalies: bool,
    upload: bool,
    s3_bucket: str | None,
    aws_profile: str | None,
) -> None:
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
    summary.add_row("Anomalies",     "[red]disabled[/red]" if no_anomalies else "[green]enabled[/green]")
    summary.add_row("Upload to S3",  "[green]yes[/green]" if upload else "[dim]no[/dim]")
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
    console.print(f"  entity={len(entities_rows)}  chart_of_accounts={len(coa_rows)}  cost_center={len(cc_rows)}")
    console.print()

    # ------------------------------------------------------------------------
    # Phase 2B — CRM
    # ------------------------------------------------------------------------
    console.rule("[cyan]Phase 2B: CRM")
    crm_rng = np.random.default_rng(rng.integers(0, 2**31))
    crm = crm_module.generate_crm(crm_rng, faker, mode)

    # ------------------------------------------------------------------------
    # Phase 2C — AR / AP / Payroll / FA
    # ------------------------------------------------------------------------
    console.rule("[cyan]Phase 2C: AR / AP / Payroll / Fixed Assets")
    ar_rng = np.random.default_rng(rng.integers(0, 2**31))
    ar = ar_module.generate_ar(ar_rng, crm.accounts, crm.opportunities)

    ap_rng = np.random.default_rng(rng.integers(0, 2**31))
    ap = ap_module.generate_ap(
        ap_rng, faker, coa_rows, cc_rows, fiscal_years, scale=mode.customer_scale,
    )

    payroll_vendor = next(v for v in ap.vendors if v.vendor_category == "payroll_provider")
    payroll_rng = np.random.default_rng(rng.integers(0, 2**31))
    payroll = payroll_module.generate_payroll(
        payroll_rng, coa_rows, cc_rows, payroll_vendor, fiscal_years,
        scale=mode.customer_scale,
    )

    # Combine payroll AP with non-payroll AP for downstream consumers
    all_ap_invoices = ap.ap_invoices + payroll.ap_invoices
    all_ap_payments = ap.ap_payments + payroll.ap_payments
    ap.ap_invoices = all_ap_invoices       # mutate so anomalies can extend
    ap.ap_payments = all_ap_payments

    fa_rng = np.random.default_rng(rng.integers(0, 2**31))
    fa = fa_module.generate_fixed_assets(
        fa_rng, cc_rows, fiscal_years, scale=mode.customer_scale,
    )

    # ------------------------------------------------------------------------
    # Phase 2E.pre — Anomalies that mutate raw data BEFORE GL is posted
    # ------------------------------------------------------------------------
    if not no_anomalies:
        console.rule("[cyan]Phase 2E.pre: Pre-GL anomalies")
        anom_rng = np.random.default_rng(rng.integers(0, 2**31))
        pre_log = anomalies_module.apply_pre_gl_anomalies(
            anom_rng, coa_rows, cc_rows, crm, ar, ap, fa, mode.customer_scale,
        )
        for entry in pre_log.entries:
            console.print(f"  [yellow]✦[/yellow] {entry.code}: {entry.description}")
        console.print()

    # ------------------------------------------------------------------------
    # Persist raw data (after pre-GL anomalies, before GL build)
    # ------------------------------------------------------------------------
    write_crm_table(crm.accounts, out_root, "account")
    write_crm_table(crm.contacts, out_root, "contact")
    write_crm_table(crm.opportunities, out_root, "opportunity")
    write_crm_table(crm.opportunity_lines, out_root, "opportunity_line")
    write_crm_table(crm.arr_movements, out_root, "arr_movement", partition_by="period_yyyymm")
    write_crm_table(crm.pipeline_snapshots, out_root, "pipeline_snapshot", partition_by="snapshot_date")

    write_erp_table(ar.customers, out_root, "customer")
    write_erp_table(ar.ar_invoices, out_root, "ar_invoice")
    write_erp_table(ar.ar_receipts, out_root, "ar_receipt")
    write_erp_table(ap.vendors, out_root, "vendor")
    write_erp_table(ap.ap_invoices, out_root, "ap_invoice")
    write_erp_table(ap.ap_payments, out_root, "ap_payment")
    write_erp_table(fa.fixed_assets, out_root, "fixed_asset")
    write_erp_table(fa.depreciation, out_root, "fa_depreciation")

    # ------------------------------------------------------------------------
    # Phase 2D — GL auto-posting
    # ------------------------------------------------------------------------
    console.rule("[cyan]Phase 2D: GL auto-posting")
    gl = gl_module.build_gl(
        coa=coa_rows,
        entities_list=entities_rows,
        cost_centers=cc_rows,
        customers=ar.customers,
        ar_invoices=ar.ar_invoices,
        ar_receipts=ar.ar_receipts,
        ap_invoices=ap.ap_invoices,
        ap_payments=ap.ap_payments,
        fixed_assets=fa.fixed_assets,
        fa_depreciation=fa.depreciation,
        sbc_pendings=payroll.sbc_journals,
        fiscal_years=fiscal_years,
        scale=mode.customer_scale,
    )

    # ------------------------------------------------------------------------
    # Phase 2E.post — Disposal journal (if anomalies disposed an asset)
    # ------------------------------------------------------------------------
    if not no_anomalies:
        post_log = anomalies_module.apply_post_gl_anomalies(
            coa_rows, cc_rows, fa, gl.headers, gl.lines,
        )
        for entry in post_log.entries:
            console.print(f"  [yellow]✦[/yellow] {entry.code}: {entry.description}")

    write_erp_table(gl.headers, out_root, "gl_journal_header")
    write_erp_table(gl.lines, out_root, "gl_journal_line")
    console.print(f"  gl_journal_header={len(gl.headers):,}  gl_journal_line={len(gl.lines):,}")
    console.print()

    # ------------------------------------------------------------------------
    # Phase 2D.validate — assert journals balance
    # ------------------------------------------------------------------------
    console.print("[bold]Running validation...[/bold]")
    report = validate_module.validate_all(
        entities_list=entities_rows,
        coa=coa_rows,
        cost_centers=cc_rows,
        customers=ar.customers,
        vendors=ap.vendors,
        accounts=crm.accounts,
        contacts=crm.contacts,
        opportunities=crm.opportunities,
        opp_lines=crm.opportunity_lines,
        ar_invoices=ar.ar_invoices,
        ar_receipts=ar.ar_receipts,
        ap_invoices=ap.ap_invoices,
        ap_payments=ap.ap_payments,
        fixed_assets=fa.fixed_assets,
        fa_depreciation=fa.depreciation,
        headers=gl.headers,
        lines=gl.lines,
    )
    val_table = Table(show_header=False, box=None, padding=(0, 2))
    val_table.add_column(style="dim"); val_table.add_column()
    val_table.add_row("Journals balanced",            f"{report.journals_checked:,}")
    val_table.add_row("GL lines",                     f"{report.lines_checked:,}")
    val_table.add_row("Period × entity balanced",     f"{report.period_entity_balances_checked:,}")
    val_table.add_row("FK violations",                "[green]none[/green]")
    console.print(val_table)
    console.print()

    # ------------------------------------------------------------------------
    # Phase 2E — EPM
    # ------------------------------------------------------------------------
    console.rule("[cyan]Phase 2E: EPM")
    epm_rng = np.random.default_rng(rng.integers(0, 2**31))
    epm = epm_module.generate_epm(
        epm_rng, coa_rows, cc_rows, entities_rows, fiscal_years,
        scale=mode.customer_scale,
    )

    # EPM-only anomaly: forecast bias on S&M
    if not no_anomalies:
        epm_log = anomalies_module.apply_epm_anomalies(epm)
        for entry in epm_log.entries:
            console.print(f"  [yellow]✦[/yellow] {entry.code}: {entry.description}")

    write_epm_table(epm.budget_versions, out_root, "budget_version")
    write_epm_table(epm.forecast_versions, out_root, "forecast_version")
    write_epm_table(epm.plan_lines, out_root, "plan_line", partition_by="period_yyyymm")
    write_epm_table(epm.headcount_plans, out_root, "headcount_plan", partition_by="period_yyyymm")
    write_epm_table(epm.driver_assumptions, out_root, "driver_assumption", partition_by="period_yyyymm")

    e_table = Table(title="EPM data", show_header=True, header_style="bold")
    e_table.add_column("Table"); e_table.add_column("Rows", justify="right")
    e_table.add_row("budget_version",    f"{len(epm.budget_versions):,}")
    e_table.add_row("forecast_version",  f"{len(epm.forecast_versions):,}")
    e_table.add_row("plan_line",         f"{len(epm.plan_lines):,}")
    e_table.add_row("headcount_plan",    f"{len(epm.headcount_plans):,}")
    e_table.add_row("driver_assumption", f"{len(epm.driver_assumptions):,}")
    console.print(e_table)
    console.print()

    # ------------------------------------------------------------------------
    # Optional: S3 upload
    # ------------------------------------------------------------------------
    if upload:
        bucket = s3_bucket or os.environ.get("ACME_LAKE_RAW_BUCKET")
        if not bucket:
            console.print("[red]--upload set but no --s3-bucket given (or ACME_LAKE_RAW_BUCKET env var)[/red]")
            return
        console.rule(f"[cyan]Uploading to s3://{bucket}/")
        result = s3_module.upload_to_s3(
            out_root, bucket,
            profile=aws_profile or os.environ.get("AWS_PROFILE"),
        )
        console.print(f"  Files uploaded: {result.files_uploaded:,}")
        console.print(f"  Bytes:          {result.bytes_uploaded:,}")

    console.rule("[bold green]Done")


if __name__ == "__main__":
    main()


_ = relativedelta
