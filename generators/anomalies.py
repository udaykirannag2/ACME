"""Phase 2E — seeded anomalies.

Injects 5 documented anomalies into already-generated artifacts so the
agent's eval harness has concrete cases to detect:

  1. emea_sm_q3_overspend         — extra AP invoices in EMEA marketing in Q3 FY25
  2. aged_ar_enterprise           — one $2.4M+ AR invoice unpaid >120 days at FY25 EOP
  3. server_disposal_loss         — server cluster disposed Aug 2024 with $300K loss
  4. stalled_pipeline             — 3 enterprise opps stuck in negotiation >120 days
  5. forecast_bias_sm             — FY25 H2 S&M forecast under-calls actuals by ~6%

Anomaly mutations are recorded in `anomaly_log` so the agent's eval can verify.
"""
from __future__ import annotations

import uuid
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import date, datetime, time, timedelta, timezone

import numpy as np

from . import config as cfg
from . import gl as gl_module
from .ap import APArtifacts, AP_PAYMENT_CUTOFF
from .ar import ARArtifacts
from .crm import CRMArtifacts
from .epm import EPMArtifacts
from .fixed_assets import FAArtifacts
from .types import (
    APInvoiceRow,
    ChartOfAccountsRow,
    CostCenterRow,
    EntityRow,
    GLJournalHeaderRow,
    GLJournalLineRow,
    PlanLineRow,
    VendorRow,
)


# =============================================================================
# Anomaly application log
# =============================================================================

@dataclass(slots=True)
class AnomalyLogEntry:
    code: str
    description: str
    affected_artifacts: dict[str, int]    # table -> row count touched


@dataclass(slots=True)
class AnomalyLog:
    entries: list[AnomalyLogEntry] = field(default_factory=list)


# =============================================================================
# Helpers
# =============================================================================

def _to_dt(d: date) -> datetime:
    return datetime.combine(d, time.min, tzinfo=timezone.utc)


def _last_day(year: int, month: int) -> date:
    if month == 12:
        return date(year, 12, 31)
    return date(year, month + 1, 1) - timedelta(days=1)


def _aid(coa: list[ChartOfAccountsRow], name: str) -> str | None:
    for a in coa:
        if a.account_name == name:
            return a.account_id
    return None


# =============================================================================
# Anomaly 1 — EMEA S&M Q3 overspend
# =============================================================================

def _inject_emea_sm_overspend(
    rng: np.random.Generator,
    coa: list[ChartOfAccountsRow],
    cost_centers: list[CostCenterRow],
    vendors: list[VendorRow],
    ap: APArtifacts,
    scale: float,
) -> AnomalyLogEntry:
    """Add extra AP invoices in EMEA marketing programs across Sept-Oct 2024."""
    extra_amount_full = 8_000_000
    extra_amount = extra_amount_full * scale

    # Find the EMEA marketing cost center
    emea_marketing_ccs = [
        cc for cc in cost_centers
        if cc.function == "marketing" and cc.entity_id == "EMEA"
    ]
    if not emea_marketing_ccs:
        return AnomalyLogEntry("emea_sm_q3_overspend", "no EMEA marketing CC found", {})
    cc_id = emea_marketing_ccs[0].cost_center_id

    # Marketing programs accounts to spread overage across
    program_account_names = [
        "Marketing Programs - Digital",
        "Marketing Programs - Events",
        "Marketing Programs - Branding",
    ]
    program_account_ids = [aid for n in program_account_names if (aid := _aid(coa, n)) is not None]
    if not program_account_ids:
        return AnomalyLogEntry("emea_sm_q3_overspend", "no marketing accounts found", {})

    # Marketing-agency vendors
    agency_vendors = [v for v in vendors if v.vendor_category == "marketing_agency"]
    if not agency_vendors:
        return AnomalyLogEntry("emea_sm_q3_overspend", "no marketing agency vendors", {})

    new_invoices: list[APInvoiceRow] = []
    rows_per_account = 5
    months = [(2024, 9), (2024, 10)]
    invoices_per_month = 6
    per_invoice_amount = extra_amount / (len(months) * invoices_per_month)

    counter = 0
    for year, month in months:
        last = _last_day(year, month).day
        for _ in range(invoices_per_month):
            day = int(rng.integers(5, last - 4))
            inv_date = date(year, month, day)
            account_id = program_account_ids[int(rng.integers(0, len(program_account_ids)))]
            vendor = agency_vendors[int(rng.integers(0, len(agency_vendors)))]
            counter += 1
            inv_no = f"BILL-EMEA-OVRSPND-{year}{month:02d}-{counter:03d}"
            new_invoices.append(APInvoiceRow(
                ap_invoice_id=str(uuid.uuid4()),
                vendor_id=vendor.vendor_id,
                invoice_number=inv_no,
                invoice_date=inv_date,
                due_date=inv_date + timedelta(days=30),
                amount=round(per_invoice_amount, 2),
                account_id=account_id,
                cost_center_id=cc_id,
                status="paid",
                created_at=_to_dt(inv_date),
            ))

    ap.ap_invoices.extend(new_invoices)
    # Pay them all promptly
    for inv in new_invoices:
        from .types import APPaymentRow
        ap.ap_payments.append(APPaymentRow(
            ap_payment_id=str(uuid.uuid4()),
            ap_invoice_id=inv.ap_invoice_id,
            payment_date=inv.due_date,
            amount=inv.amount,
        ))

    return AnomalyLogEntry(
        code="emea_sm_q3_overspend",
        description=f"Added ${extra_amount:,.0f} in EMEA marketing programs across Sep-Oct 2024",
        affected_artifacts={"ap_invoice": len(new_invoices), "ap_payment": len(new_invoices)},
    )


# =============================================================================
# Anomaly 2 — Aged AR enterprise
# =============================================================================

def _inject_aged_ar(
    rng: np.random.Generator,
    crm: CRMArtifacts,
    ar: ARArtifacts,
) -> AnomalyLogEntry:
    """Pick the largest enterprise AR invoice issued before 2024-08-01 and
    mark it open, removing any associated receipt. This produces a >150d
    aging at FY25 EOP."""
    enterprise_account_ids = {
        a.account_id for a in crm.accounts if a.segment_tier == "enterprise"
    }
    cutoff = date(2024, 8, 1)
    candidates = [
        i for i in ar.ar_invoices
        if i.customer_id in enterprise_account_ids and i.invoice_date < cutoff
    ]
    if not candidates:
        return AnomalyLogEntry("aged_ar_enterprise", "no candidate enterprise invoice", {})

    candidates.sort(key=lambda i: i.amount, reverse=True)
    target = candidates[0]
    target.status = "open"
    # Drop any associated receipt
    pre = len(ar.ar_receipts)
    ar.ar_receipts = [r for r in ar.ar_receipts if r.ar_invoice_id != target.ar_invoice_id]
    receipts_removed = pre - len(ar.ar_receipts)

    return AnomalyLogEntry(
        code="aged_ar_enterprise",
        description=(
            f"AR invoice {target.invoice_number} ({target.customer_id[:8]}, "
            f"${target.amount:,.0f}) marked open; receipt removed. "
            f"Will age >{(cfg.fy_end(2025) - target.invoice_date).days} days at FY25 EOP."
        ),
        affected_artifacts={"ar_invoice": 1, "ar_receipt": receipts_removed},
    )


# =============================================================================
# Anomaly 3 — Server disposal loss
# =============================================================================

def _inject_server_disposal(
    rng: np.random.Generator,
    coa: list[ChartOfAccountsRow],
    fa: FAArtifacts,
    scale: float,
) -> AnomalyLogEntry:
    """Pick a US server, dispose it Aug 2024 with $300K loss vs net book value."""
    target_loss = 300_000 * scale
    cutoff_date = date(2024, 8, 1)

    us_servers = [
        a for a in fa.fixed_assets
        if a.asset_class == "server" and a.entity_id == "US"
        and a.acquisition_date <= cutoff_date
        and a.acquisition_cost > 80_000
    ]
    if not us_servers:
        return AnomalyLogEntry("server_disposal_loss", "no candidate US server", {})

    target = us_servers[int(rng.integers(0, min(5, len(us_servers))))]
    disposal_date = date(2024, 8, 15)
    # Find net book value at disposal
    deps = [d for d in fa.depreciation if d.fixed_asset_id == target.fixed_asset_id
            and d.period_yyyymm <= 202407]
    if deps:
        nbv = max(deps, key=lambda d: d.period_yyyymm).net_book_value
    else:
        nbv = target.acquisition_cost

    proceeds = max(0.0, nbv - target_loss)
    target.disposal_date = disposal_date
    target.disposal_proceeds = round(proceeds, 2)
    target.status = "disposed"

    # Remove future depreciation rows for this asset (after disposal)
    pre = len(fa.depreciation)
    fa.depreciation = [
        d for d in fa.depreciation
        if not (d.fixed_asset_id == target.fixed_asset_id and d.period_yyyymm > 202407)
    ]
    deps_removed = pre - len(fa.depreciation)

    return AnomalyLogEntry(
        code="server_disposal_loss",
        description=(
            f"Disposed {target.asset_tag} on {disposal_date}. "
            f"Acquired ${target.acquisition_cost:,.0f}, NBV ${nbv:,.0f}, "
            f"proceeds ${proceeds:,.0f}, loss ${nbv - proceeds:,.0f}"
        ),
        affected_artifacts={"fixed_asset": 1, "fa_depreciation": deps_removed},
    )


def _post_disposal_journal(
    coa: list[ChartOfAccountsRow],
    cost_centers: list[CostCenterRow],
    fa: FAArtifacts,
    headers: list[GLJournalHeaderRow],
    lines: list[GLJournalLineRow],
) -> int:
    """For each disposed asset, post a disposal journal:
       DR Cash (proceeds)
       DR Accumulated Depreciation (clear cumulative dep)
       DR Loss on Disposal (residual)
       CR Fixed Assets - Cost (original cost)
    """
    cash_aid = _aid(coa, "Cash and Cash Equivalents")
    accum_aid = _aid(coa, "Accumulated Depreciation")
    fa_cost_aid = _aid(coa, "Fixed Assets - Cost")
    loss_aid = _aid(coa, "Loss on Disposal of Fixed Assets")

    if not all([cash_aid, accum_aid, fa_cost_aid, loss_aid]):
        return 0

    # Build a temp builder instance to share the same number-bumping logic
    builder = gl_module.GLBuilder(coa)
    # Seed counter so it doesn't collide with already-generated journal numbers
    builder._counter = max((int(h.journal_number.split("-")[-1]) for h in headers), default=0) + 1

    journals_added = 0
    for asset in fa.fixed_assets:
        if asset.status != "disposed" or asset.disposal_date is None:
            continue
        # Determine NBV at disposal: cost - accumulated_dep at disposal_date period
        disposal_period = asset.disposal_date.year * 100 + asset.disposal_date.month
        deps = [d for d in fa.depreciation
                if d.fixed_asset_id == asset.fixed_asset_id
                and d.period_yyyymm < disposal_period]
        accum = max(deps, key=lambda d: d.period_yyyymm).accumulated_depreciation if deps else 0.0
        nbv = asset.acquisition_cost - accum
        proceeds = asset.disposal_proceeds or 0.0
        loss = nbv - proceeds

        builder.add_journal(
            posting_date=asset.disposal_date,
            entity_id=asset.entity_id,
            journal_type="manual",
            description=f"Fixed asset disposal - {asset.asset_tag}",
            lines=[
                (cash_aid,    None, proceeds,             0,                         "Disposal proceeds",      "fixed_asset", asset.fixed_asset_id),
                (accum_aid,   None, accum,                0,                         "Clear accum dep",        "fixed_asset", asset.fixed_asset_id),
                (loss_aid,    None, loss,                 0,                         "Loss on disposal",       "fixed_asset", asset.fixed_asset_id),
                (fa_cost_aid, None, 0,                    asset.acquisition_cost,    "Remove FA cost",         "fixed_asset", asset.fixed_asset_id),
            ],
            created_by="system_fa_disposal",
        )
        journals_added += 1

    headers.extend(builder.headers)
    lines.extend(builder.lines)
    return journals_added


# =============================================================================
# Anomaly 4 — Stalled pipeline
# =============================================================================

def _inject_stalled_pipeline(
    rng: np.random.Generator,
    crm: CRMArtifacts,
) -> AnomalyLogEntry:
    """Find 3 enterprise opps and force them to negotiation stage with old created_date."""
    enterprise_account_ids = {a.account_id for a in crm.accounts if a.segment_tier == "enterprise"}
    fy25_end = cfg.fy_end(2025)

    open_ent_opps = [
        o for o in crm.opportunities
        if o.account_id in enterprise_account_ids
        and o.stage in ("prospecting", "qualification", "proposal", "negotiation")
        and o.created_date <= fy25_end - timedelta(days=120)
    ]
    if len(open_ent_opps) < 3:
        # Fall back to any open enterprise opps; mutate their created_date
        any_open_ent = [
            o for o in crm.opportunities
            if o.account_id in enterprise_account_ids
            and o.stage in ("prospecting", "qualification", "proposal", "negotiation")
        ]
        if not any_open_ent:
            return AnomalyLogEntry("stalled_pipeline", "no candidate opps", {})
        any_open_ent.sort(key=lambda o: o.amount, reverse=True)
        chosen = any_open_ent[:3]
        for o in chosen:
            o.created_date = fy25_end - timedelta(days=int(rng.integers(125, 200)))
            o.stage = "negotiation"
            o.probability_pct = 80
    else:
        open_ent_opps.sort(key=lambda o: o.amount, reverse=True)
        chosen = open_ent_opps[:3]
        for o in chosen:
            o.stage = "negotiation"
            o.probability_pct = 80

    total_acv = sum(o.amount for o in chosen)
    return AnomalyLogEntry(
        code="stalled_pipeline",
        description=(
            f"Forced 3 enterprise opps to 'negotiation' with >120d age. "
            f"Total ACV ${total_acv:,.0f}"
        ),
        affected_artifacts={"opportunity": len(chosen)},
    )


# =============================================================================
# Anomaly 5 — Forecast bias on S&M
# =============================================================================

def _inject_forecast_bias_sm(
    epm: EPMArtifacts,
) -> AnomalyLogEntry:
    """Reduce FY25 H2 forecast S&M plan_lines by 6% so actuals exceed forecast."""
    bias_pct = -0.06   # forecast is 6% lower than it should be
    h2_periods = {202408, 202409, 202410, 202411, 202412, 202501}

    forecast_version_ids = {fv.forecast_version_id for fv in epm.forecast_versions}

    affected = 0
    sm_account_ids: set[str] = set()    # we'll populate as we scan
    # We don't have COA here directly — match by matching the segment + by name-pattern matching
    # is_sm_account: pnl_rollup == "sm". But epm doesn't have access to coa directly.
    # We'll detect by account_id being one of the planned S&M opex account_ids.
    # Practical approach: trust that opex_plan_lines for S&M are in S&M accounts.
    # We tag by examining account_id presence in plan_lines for opex with segment None and version_type "forecast".

    for ln in epm.plan_lines:
        if (ln.version_id in forecast_version_ids and ln.period_yyyymm in h2_periods
                and ln.cost_center_id is not None and ln.segment is None):
            # Heuristic: opex plan line for S&M is associated with sales/marketing CC
            # We'll just bias all opex forecast plan lines in H2; this bumps S&M, R&D, G&A all 6% low.
            # But the agent will look at S&M variance specifically; for cleaner anomaly, we'd need to
            # know rollup. Filter by cost_center_id pattern is the cleanest way given we don't have COA.
            if ln.cost_center_id.startswith("CC-SALES-") or ln.cost_center_id.startswith("CC-MARKETING-"):
                ln.amount = round(ln.amount * (1 + bias_pct), 2)
                affected += 1

    return AnomalyLogEntry(
        code="forecast_bias_sm",
        description=f"Reduced FY25 H2 S&M forecast plan_lines by {abs(bias_pct):.0%}",
        affected_artifacts={"plan_line": affected},
    )


# =============================================================================
# Public entry points — split by stage so each runs at the right point in
# the generation pipeline:
#
#   1. apply_pre_gl_anomalies()  — mutates AR/AP/FA/CRM raw data before GL posts
#   2. (build_gl runs here)
#   3. apply_post_gl_anomalies() — adds the disposal journal to GL
#   4. (epm.generate_epm runs here)
#   5. apply_epm_anomalies()     — adjusts forecast plan lines
# =============================================================================

def apply_pre_gl_anomalies(
    rng: np.random.Generator,
    coa: list[ChartOfAccountsRow],
    cost_centers: list[CostCenterRow],
    crm: CRMArtifacts,
    ar: ARArtifacts,
    ap: APArtifacts,
    fa: FAArtifacts,
    scale: float,
) -> AnomalyLog:
    log = AnomalyLog()
    log.entries.append(_inject_emea_sm_overspend(
        rng, coa, cost_centers, ap.vendors, ap, scale,
    ))
    log.entries.append(_inject_aged_ar(rng, crm, ar))
    log.entries.append(_inject_server_disposal(rng, coa, fa, scale))
    log.entries.append(_inject_stalled_pipeline(rng, crm))
    return log


def apply_post_gl_anomalies(
    coa: list[ChartOfAccountsRow],
    cost_centers: list[CostCenterRow],
    fa: FAArtifacts,
    headers: list[GLJournalHeaderRow],
    lines: list[GLJournalLineRow],
) -> AnomalyLog:
    log = AnomalyLog()
    n_disposal_journals = _post_disposal_journal(coa, cost_centers, fa, headers, lines)
    if n_disposal_journals:
        log.entries.append(AnomalyLogEntry(
            code="server_disposal_journal",
            description="Posted disposal journal(s) to GL",
            affected_artifacts={"gl_journal_header": n_disposal_journals},
        ))
    return log


def apply_epm_anomalies(epm: EPMArtifacts) -> AnomalyLog:
    log = AnomalyLog()
    log.entries.append(_inject_forecast_bias_sm(epm))
    return log
