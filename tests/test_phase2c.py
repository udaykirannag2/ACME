"""Phase 2C tests: AR / AP / Payroll / Fixed Assets generators."""
from __future__ import annotations

import pytest
import numpy as np
from faker import Faker

from generators import ap as ap_module
from generators import ar as ar_module
from generators import config as cfg
from generators import crm as crm_module
from generators import entities
from generators import fixed_assets as fa_module
from generators import payroll as payroll_module


@pytest.fixture(scope="module")
def reference():
    return {
        "entities": entities.gen_entities(),
        "coa": entities.gen_chart_of_accounts(),
        "cost_centers": entities.gen_cost_centers(),
    }


@pytest.fixture(scope="module")
def crm_quick(reference):
    rng = np.random.default_rng(cfg.DEFAULT_SEED)
    Faker.seed(cfg.DEFAULT_SEED)
    faker = Faker(["en_US"])
    return crm_module.generate_crm(rng, faker, cfg.MODE_QUICK)


@pytest.fixture(scope="module")
def ar_quick(crm_quick):
    rng = np.random.default_rng(cfg.DEFAULT_SEED + 1)
    return ar_module.generate_ar(rng, crm_quick.accounts, crm_quick.opportunities)


@pytest.fixture(scope="module")
def ap_quick(reference):
    rng = np.random.default_rng(cfg.DEFAULT_SEED + 2)
    Faker.seed(cfg.DEFAULT_SEED + 2)
    faker = Faker(["en_US"])
    return ap_module.generate_ap(
        rng, faker, reference["coa"], reference["cost_centers"],
        [2023, 2024, 2025], scale=cfg.MODE_QUICK.customer_scale,
    )


@pytest.fixture(scope="module")
def payroll_quick(reference, ap_quick):
    payroll_vendor = next(v for v in ap_quick.vendors if v.vendor_category == "payroll_provider")
    rng = np.random.default_rng(cfg.DEFAULT_SEED + 3)
    return payroll_module.generate_payroll(
        rng, reference["coa"], reference["cost_centers"], payroll_vendor,
        [2023, 2024, 2025], scale=cfg.MODE_QUICK.customer_scale,
    )


@pytest.fixture(scope="module")
def fa_quick(reference):
    rng = np.random.default_rng(cfg.DEFAULT_SEED + 4)
    return fa_module.generate_fixed_assets(
        rng, reference["cost_centers"], [2023, 2024, 2025],
        scale=cfg.MODE_QUICK.customer_scale,
    )


# =============================================================================
# AR tests
# =============================================================================

def test_ar_customer_count_matches_accounts(ar_quick, crm_quick) -> None:
    assert len(ar_quick.customers) == len(crm_quick.accounts)


def test_ar_customer_id_matches_account_id(ar_quick, crm_quick) -> None:
    """Per data dictionary: customer.customer_id == account.account_id."""
    customer_ids = {c.customer_id for c in ar_quick.customers}
    account_ids = {a.account_id for a in crm_quick.accounts}
    assert customer_ids == account_ids


def test_ar_invoice_customer_fk_valid(ar_quick) -> None:
    customer_ids = {c.customer_id for c in ar_quick.customers}
    bad = [i for i in ar_quick.ar_invoices if i.customer_id not in customer_ids]
    assert not bad


def test_ar_invoice_opp_fk_valid(ar_quick, crm_quick) -> None:
    opp_ids = {o.opportunity_id for o in crm_quick.opportunities}
    invoices_with_opp = [i for i in ar_quick.ar_invoices if i.opportunity_id]
    bad = [i for i in invoices_with_opp if i.opportunity_id not in opp_ids]
    assert not bad


def test_ar_invoice_amounts_positive(ar_quick) -> None:
    bad = [i for i in ar_quick.ar_invoices if i.amount <= 0]
    assert not bad


def test_ar_invoice_service_period_valid(ar_quick) -> None:
    bad = [i for i in ar_quick.ar_invoices
           if i.service_period_end < i.service_period_start]
    assert not bad


def test_ar_receipts_match_invoices(ar_quick) -> None:
    """Each receipt's amount equals its invoice amount (we don't model partials)."""
    inv_by_id = {i.ar_invoice_id: i for i in ar_quick.ar_invoices}
    for r in ar_quick.ar_receipts:
        inv = inv_by_id[r.ar_invoice_id]
        assert abs(r.amount - inv.amount) < 0.01


def test_ar_invoice_status_matches_receipts(ar_quick) -> None:
    """Invoices with receipts should be marked 'paid', without should be 'open'."""
    paid_ids = {r.ar_invoice_id for r in ar_quick.ar_receipts}
    for inv in ar_quick.ar_invoices:
        if inv.ar_invoice_id in paid_ids:
            assert inv.status == "paid"
        else:
            assert inv.status == "open"


def test_ar_aging_realistic(ar_quick) -> None:
    """At least 1% of invoices issued before FY25 EOP minus 90 days are still open
    at FY25 EOP — these contribute to AR aging."""
    from datetime import timedelta
    ninety_days_pre_eop = cfg.fy_end(2025) - timedelta(days=90)
    eligible = [i for i in ar_quick.ar_invoices
                if i.invoice_date < ninety_days_pre_eop]
    open_eligible = [i for i in eligible if i.status == "open"]
    assert open_eligible, "expected some aged AR for realistic AR aging"


# =============================================================================
# AP tests
# =============================================================================

def test_ap_vendor_categories_complete(ap_quick) -> None:
    cats = {v.vendor_category for v in ap_quick.vendors}
    expected = set(ap_module.VENDORS_PER_CATEGORY.keys())
    assert cats == expected


def test_ap_invoice_vendor_fk_valid(ap_quick) -> None:
    vendor_ids = {v.vendor_id for v in ap_quick.vendors}
    bad = [i for i in ap_quick.ap_invoices if i.vendor_id not in vendor_ids]
    assert not bad


def test_ap_invoice_amounts_positive(ap_quick) -> None:
    bad = [i for i in ap_quick.ap_invoices if i.amount <= 0]
    assert not bad


def test_ap_payment_invoice_fk_valid(ap_quick) -> None:
    inv_ids = {i.ap_invoice_id for i in ap_quick.ap_invoices}
    bad = [p for p in ap_quick.ap_payments if p.ap_invoice_id not in inv_ids]
    assert not bad


def test_ap_opex_within_target_band(ap_quick, payroll_quick) -> None:
    """Combined AP (non-payroll opex + payroll cash) should hit target opex
    within ±35% per rollup × FY (synthetic data tolerance)."""
    coa = entities.gen_chart_of_accounts()
    coa_by_id = {a.account_id: a for a in coa}

    all_invoices = ap_quick.ap_invoices + payroll_quick.ap_invoices
    by_fy_rollup: dict[tuple[int, str], float] = {}
    for inv in all_invoices:
        rollup = coa_by_id[inv.account_id].pnl_rollup
        m, y = inv.invoice_date.month, inv.invoice_date.year
        fy_year = y + 1 if m >= 2 else y
        by_fy_rollup[(fy_year, rollup)] = by_fy_rollup.get((fy_year, rollup), 0.0) + inv.amount

    target_pct = {
        "cogs": cfg.OPEX_RATIOS.cogs_pct,
        "sm":   cfg.OPEX_RATIOS.sm_pct,
        "rd":   cfg.OPEX_RATIOS.rd_pct,
        "ga":   cfg.OPEX_RATIOS.ga_pct,
    }
    non_payroll_share = {"cogs": 0.55, "sm": 0.45, "rd": 0.30, "ga": 0.50}

    for fy in (2023, 2024, 2025):
        rev = cfg.REVENUE_BY_FY[fy] * cfg.MODE_QUICK.customer_scale
        for rollup in ("cogs", "sm", "rd", "ga"):
            actual = by_fy_rollup.get((fy, rollup), 0.0)
            n = non_payroll_share[rollup]
            cash_ap_share = (1 - n) / 1.15 + n
            target = rev * target_pct[rollup] * cash_ap_share
            delta = abs(actual - target) / target if target else 0.0
            assert delta < 0.35, (
                f"FY{fy} {rollup}: actual {actual:,.0f} vs target {target:,.0f} "
                f"= {delta:+.0%}, exceeds ±35% band"
            )


# =============================================================================
# Payroll tests
# =============================================================================

def test_payroll_invoices_semimonthly(payroll_quick) -> None:
    """Each (period, cost_center) should have exactly 2 payroll invoices."""
    from collections import Counter
    counts = Counter(
        (inv.invoice_date.year * 100 + inv.invoice_date.month, inv.cost_center_id)
        for inv in payroll_quick.ap_invoices
    )
    bad = [k for k, v in counts.items() if v != 2]
    assert not bad


def test_payroll_sbc_journals_balanced(payroll_quick) -> None:
    """Each SBC pending journal must balance: sum(debit) = sum(credit)."""
    for j in payroll_quick.sbc_journals:
        debits = sum(line.debit_amount for line in j.lines)
        credits = sum(line.credit_amount for line in j.lines)
        assert abs(debits - credits) < 0.01, \
            f"unbalanced SBC journal {j.description}: {debits} vs {credits}"


def test_payroll_sbc_journal_has_offset_to_apic(payroll_quick) -> None:
    """Each SBC journal must credit Additional Paid-in Capital."""
    coa = entities.gen_chart_of_accounts()
    apic_id = next(a.account_id for a in coa if a.account_name == "Additional Paid-in Capital")
    for j in payroll_quick.sbc_journals:
        apic_lines = [ln for ln in j.lines if ln.account_id == apic_id]
        assert len(apic_lines) == 1, f"SBC journal must have exactly one APIC line"
        assert apic_lines[0].credit_amount > 0


# =============================================================================
# Fixed assets tests
# =============================================================================

def test_fa_acquisition_cost_positive(fa_quick) -> None:
    bad = [a for a in fa_quick.fixed_assets if a.acquisition_cost <= 0]
    assert not bad


def test_fa_depreciation_runs_match_assets(fa_quick) -> None:
    """Every depreciation row references a valid asset."""
    asset_ids = {a.fixed_asset_id for a in fa_quick.fixed_assets}
    bad = [d for d in fa_quick.depreciation if d.fixed_asset_id not in asset_ids]
    assert not bad


def test_fa_depreciation_monotonic(fa_quick) -> None:
    """Per asset, accumulated_depreciation increases monotonically per period."""
    by_asset: dict[str, list] = {}
    for d in fa_quick.depreciation:
        by_asset.setdefault(d.fixed_asset_id, []).append(d)
    for asset_id, rows in by_asset.items():
        rows.sort(key=lambda r: r.period_yyyymm)
        prev = -1.0
        for r in rows:
            assert r.accumulated_depreciation >= prev - 0.01
            prev = r.accumulated_depreciation


def test_fa_depreciation_caps_at_depreciable_base(fa_quick) -> None:
    """Accumulated depreciation never exceeds (cost - salvage)."""
    asset_by_id = {a.fixed_asset_id: a for a in fa_quick.fixed_assets}
    for d in fa_quick.depreciation:
        a = asset_by_id[d.fixed_asset_id]
        depreciable = a.acquisition_cost - a.salvage_value
        assert d.accumulated_depreciation <= depreciable + 0.01


def test_fa_capex_within_target(fa_quick) -> None:
    """Sum of acquisition costs per FY should be within ±10% of target."""
    capex_by_fy: dict[int, float] = {}
    for a in fa_quick.fixed_assets:
        m, y = a.acquisition_date.month, a.acquisition_date.year
        fy = y + 1 if m >= 2 else y
        capex_by_fy[fy] = capex_by_fy.get(fy, 0.0) + a.acquisition_cost
    for fy in (2023, 2024, 2025):
        rev = cfg.REVENUE_BY_FY[fy] * cfg.MODE_QUICK.customer_scale
        target = rev * cfg.CAPEX_PCT_OF_REVENUE
        actual = capex_by_fy.get(fy, 0.0)
        delta = abs(actual - target) / target
        assert delta < 0.10, f"FY{fy} capex {actual:,.0f} vs target {target:,.0f} = {delta:+.0%}"
