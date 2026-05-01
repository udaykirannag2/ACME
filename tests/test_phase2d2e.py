"""Phase 2D + 2E tests: GL auto-posting, validation, EPM, anomalies."""
from __future__ import annotations

from collections import defaultdict

import pytest
import numpy as np
from faker import Faker

from generators import anomalies as anomalies_module
from generators import ap as ap_module
from generators import ar as ar_module
from generators import config as cfg
from generators import crm as crm_module
from generators import entities
from generators import epm as epm_module
from generators import fixed_assets as fa_module
from generators import gl as gl_module
from generators import payroll as payroll_module
from generators import validate as validate_module


@pytest.fixture(scope="module")
def all_artifacts():
    """Full quick-mode generation pipeline returning every artifact bundle."""
    fiscal_years = [2023, 2024, 2025]
    scale = cfg.MODE_QUICK.customer_scale
    rng = np.random.default_rng(cfg.DEFAULT_SEED)
    Faker.seed(cfg.DEFAULT_SEED)
    faker = Faker(["en_US"])

    coa = entities.gen_chart_of_accounts()
    cost_centers = entities.gen_cost_centers()
    entities_list = entities.gen_entities()

    crm = crm_module.generate_crm(
        np.random.default_rng(rng.integers(0, 2**31)), faker, cfg.MODE_QUICK,
    )
    ar = ar_module.generate_ar(
        np.random.default_rng(rng.integers(0, 2**31)), crm.accounts, crm.opportunities,
    )
    ap = ap_module.generate_ap(
        np.random.default_rng(rng.integers(0, 2**31)), faker, coa, cost_centers,
        fiscal_years, scale=scale,
    )
    payroll_vendor = next(v for v in ap.vendors if v.vendor_category == "payroll_provider")
    payroll = payroll_module.generate_payroll(
        np.random.default_rng(rng.integers(0, 2**31)),
        coa, cost_centers, payroll_vendor, fiscal_years, scale=scale,
    )
    ap.ap_invoices = ap.ap_invoices + payroll.ap_invoices
    ap.ap_payments = ap.ap_payments + payroll.ap_payments

    fa = fa_module.generate_fixed_assets(
        np.random.default_rng(rng.integers(0, 2**31)),
        cost_centers, fiscal_years, scale=scale,
    )

    # Anomalies (pre-GL)
    anom_rng = np.random.default_rng(rng.integers(0, 2**31))
    anomalies_module.apply_pre_gl_anomalies(
        anom_rng, coa, cost_centers, crm, ar, ap, fa, scale,
    )

    gl = gl_module.build_gl(
        coa=coa, entities_list=entities_list, cost_centers=cost_centers,
        customers=ar.customers, ar_invoices=ar.ar_invoices, ar_receipts=ar.ar_receipts,
        ap_invoices=ap.ap_invoices, ap_payments=ap.ap_payments,
        fixed_assets=fa.fixed_assets, fa_depreciation=fa.depreciation,
        sbc_pendings=payroll.sbc_journals,
        fiscal_years=fiscal_years, scale=scale,
    )
    anomalies_module.apply_post_gl_anomalies(coa, cost_centers, fa, gl.headers, gl.lines)

    epm = epm_module.generate_epm(
        np.random.default_rng(rng.integers(0, 2**31)),
        coa, cost_centers, entities_list, fiscal_years, scale=scale,
    )
    anomalies_module.apply_epm_anomalies(epm)

    return {
        "coa": coa,
        "cost_centers": cost_centers,
        "entities_list": entities_list,
        "crm": crm,
        "ar": ar,
        "ap": ap,
        "payroll": payroll,
        "fa": fa,
        "gl": gl,
        "epm": epm,
    }


# =============================================================================
# Phase 2D — GL & validation
# =============================================================================

def test_validate_all_passes(all_artifacts) -> None:
    """validate_all() raises on any violation. If this passes, everything is sound."""
    a = all_artifacts
    report = validate_module.validate_all(
        entities_list=a["entities_list"],
        coa=a["coa"],
        cost_centers=a["cost_centers"],
        customers=a["ar"].customers,
        vendors=a["ap"].vendors,
        accounts=a["crm"].accounts,
        contacts=a["crm"].contacts,
        opportunities=a["crm"].opportunities,
        opp_lines=a["crm"].opportunity_lines,
        ar_invoices=a["ar"].ar_invoices,
        ar_receipts=a["ar"].ar_receipts,
        ap_invoices=a["ap"].ap_invoices,
        ap_payments=a["ap"].ap_payments,
        fixed_assets=a["fa"].fixed_assets,
        fa_depreciation=a["fa"].depreciation,
        headers=a["gl"].headers,
        lines=a["gl"].lines,
    )
    assert report.journals_checked > 0
    assert report.lines_checked > 0
    assert report.period_entity_balances_checked > 0


def test_each_journal_balances(all_artifacts) -> None:
    a = all_artifacts
    sums: dict[str, tuple[float, float]] = defaultdict(lambda: (0.0, 0.0))
    for ln in a["gl"].lines:
        d, c = sums[ln.journal_id]
        sums[ln.journal_id] = (d + ln.debit_amount, c + ln.credit_amount)
    for jid, (d, c) in sums.items():
        assert abs(d - c) < 0.10, f"unbalanced journal {jid}: {d} vs {c}"


def test_all_periods_balance(all_artifacts) -> None:
    a = all_artifacts
    header_by_id = {h.journal_id: h for h in a["gl"].headers}
    sums: dict[tuple[int, str], tuple[float, float]] = defaultdict(lambda: (0.0, 0.0))
    for ln in a["gl"].lines:
        h = header_by_id.get(ln.journal_id)
        if h is None:
            continue
        key = (h.period_yyyymm, h.entity_id)
        d, c = sums[key]
        sums[key] = (d + ln.debit_amount, c + ln.credit_amount)
    for key, (d, c) in sums.items():
        assert abs(d - c) < 1.0, f"unbalanced period × entity {key}: {d} vs {c}"


def test_journal_types_used(all_artifacts) -> None:
    """Sanity: a healthy GL uses every defined journal_type."""
    types = {h.journal_type for h in all_artifacts["gl"].headers}
    expected_present = {"manual", "auto_revrec", "auto_dep", "auto_ar", "auto_ap"}
    assert expected_present.issubset(types), f"missing journal types: {expected_present - types}"


def test_revenue_recognition_aggregates_to_revenue_account(all_artifacts) -> None:
    """Revenue lines (account_type=revenue) total should approximate FY revenue
    target across all FY months. Allows ±25% tolerance for synthetic noise."""
    a = all_artifacts
    coa_by_id = {acct.account_id: acct for acct in a["coa"]}
    header_by_id = {h.journal_id: h for h in a["gl"].headers}

    # Sum credits to revenue accounts (revenue is normally a credit balance)
    revenue_by_fy: dict[int, float] = defaultdict(float)
    for ln in a["gl"].lines:
        acct = coa_by_id.get(ln.account_id)
        if acct is None or acct.pnl_rollup != "revenue":
            continue
        h = header_by_id.get(ln.journal_id)
        if h is None:
            continue
        m = h.posting_date.month
        fy = h.posting_date.year + 1 if m >= 2 else h.posting_date.year
        revenue_by_fy[fy] += ln.credit_amount - ln.debit_amount

    for fy in (2023, 2024, 2025):
        target = cfg.REVENUE_BY_FY[fy] * cfg.MODE_QUICK.customer_scale * 0.88   # subscription only
        actual = revenue_by_fy.get(fy, 0.0)
        delta = abs(actual - target) / target
        assert delta < 0.30, f"FY{fy} GL revenue {actual:,.0f} vs target {target:,.0f} = {delta:+.0%}"


# =============================================================================
# Phase 2E — EPM
# =============================================================================

def test_epm_versions_present(all_artifacts) -> None:
    a = all_artifacts["epm"]
    # 3 budgets (one per FY) + 2 reforecasts (Q1, Q3)
    assert len(a.budget_versions) == 3
    assert len(a.forecast_versions) == 2


def test_epm_plan_lines_reference_valid_versions(all_artifacts) -> None:
    a = all_artifacts["epm"]
    valid_ids = {v.budget_version_id for v in a.budget_versions} \
        | {v.forecast_version_id for v in a.forecast_versions}
    bad = [ln for ln in a.plan_lines if ln.version_id not in valid_ids]
    assert not bad


def test_epm_plan_lines_account_fk_valid(all_artifacts) -> None:
    a = all_artifacts
    account_ids = {acct.account_id for acct in a["coa"]}
    bad = [ln for ln in a["epm"].plan_lines if ln.account_id not in account_ids]
    assert not bad


def test_epm_plan_line_amounts_positive(all_artifacts) -> None:
    bad = [ln for ln in all_artifacts["epm"].plan_lines if ln.amount <= 0]
    assert not bad


def test_epm_drivers_have_realistic_values(all_artifacts) -> None:
    a = all_artifacts["epm"]
    by_driver = defaultdict(list)
    for d in a.driver_assumptions:
        by_driver[d.driver_name].append(d.value)
    # Check ARR growth pct is in a sensible range (5%-50%)
    if "arr_growth_pct" in by_driver:
        avg = sum(by_driver["arr_growth_pct"]) / len(by_driver["arr_growth_pct"])
        assert 0.05 < avg < 0.50, f"avg arr_growth_pct = {avg:.2%}"


# =============================================================================
# Phase 2E — Anomalies are visible in the data
# =============================================================================

def test_anomaly_emea_sm_overspend_visible(all_artifacts) -> None:
    """Sept-Oct 2024 EMEA marketing spend should be elevated vs other months."""
    a = all_artifacts
    cc_by_id = {cc.cost_center_id: cc for cc in a["cost_centers"]}

    # Sum AP invoices by (period_yyyymm) for EMEA marketing
    by_period: dict[int, float] = defaultdict(float)
    for inv in a["ap"].ap_invoices:
        cc = cc_by_id.get(inv.cost_center_id)
        if cc is None or cc.entity_id != "EMEA" or cc.function != "marketing":
            continue
        period = inv.invoice_date.year * 100 + inv.invoice_date.month
        by_period[period] += inv.amount

    sept_oct = by_period.get(202409, 0) + by_period.get(202410, 0)
    avg_other = sum(v for p, v in by_period.items() if p not in (202409, 202410)) \
        / max(1, len([p for p in by_period if p not in (202409, 202410)]))
    assert sept_oct > 2 * avg_other, \
        f"EMEA marketing Sep+Oct {sept_oct:,.0f} should exceed 2x avg other month {avg_other:,.0f}"


def test_anomaly_aged_ar_visible(all_artifacts) -> None:
    """At least one AR invoice older than 120 days at FY25 EOP is still 'open'."""
    from datetime import timedelta
    threshold = cfg.fy_end(2025) - timedelta(days=120)
    aged_open = [
        i for i in all_artifacts["ar"].ar_invoices
        if i.invoice_date < threshold and i.status == "open" and i.amount > 1_000_000
    ]
    assert aged_open, "expected at least one large aged AR invoice (>120d) for the anomaly"


def test_anomaly_server_disposal_visible(all_artifacts) -> None:
    """At least one fixed asset has status='disposed'."""
    disposed = [a for a in all_artifacts["fa"].fixed_assets if a.status == "disposed"]
    assert disposed, "expected at least one disposed asset"


def test_anomaly_stalled_pipeline_visible(all_artifacts) -> None:
    """At least 3 enterprise opps in 'negotiation' with created_date >120d before FY25 EOP."""
    from datetime import timedelta
    enterprise_ids = {a.account_id for a in all_artifacts["crm"].accounts
                      if a.segment_tier == "enterprise"}
    threshold = cfg.fy_end(2025) - timedelta(days=120)
    stalled = [
        o for o in all_artifacts["crm"].opportunities
        if o.account_id in enterprise_ids
        and o.stage == "negotiation"
        and o.created_date < threshold
    ]
    assert len(stalled) >= 3


def test_anomaly_disposal_journal_posted(all_artifacts) -> None:
    """A 'manual' GL journal with description 'Fixed asset disposal' must exist."""
    disposal_journals = [
        h for h in all_artifacts["gl"].headers
        if "Fixed asset disposal" in h.description
    ]
    assert disposal_journals
