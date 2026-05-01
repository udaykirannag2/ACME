"""Phase 2C — Payroll: cash compensation AP invoices + SBC pending journals.

Two outputs:
  1. Semi-monthly AP invoices to "ACME Payroll Services Inc." for cash comp
     (salaries + benefits + payroll taxes). Each cost center gets one invoice
     per pay period covering its FTE allocation.
  2. PendingJournalSpec entries for stock-based compensation. SBC is a non-cash
     expense (debit SBC account, credit Additional Paid-in Capital), so it never
     hits AP. These get auto-posted to GL in Phase 2D.

FTE counts are linearly grown from FY23 BoP to FY25 EOP:
  - HEADCOUNT_BY_FUNCTION × FUNCTION_ENTITY_WEIGHTS gives the EOP distribution
  - We linearly interpolate from a smaller starting headcount

Comp distribution:
  - 70% cash comp (AP invoices) — matches what would actually pay through payroll
  - 15% benefits/payroll taxes (rolled into the AP invoice for simplicity)
  - 15% SBC (PendingJournalSpec)
"""
from __future__ import annotations

import uuid
from collections import defaultdict
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta, timezone

import numpy as np
from dateutil.relativedelta import relativedelta

from . import config as cfg
from .types import (
    APInvoiceRow,
    APPaymentRow,
    ChartOfAccountsRow,
    CostCenterRow,
    PendingJournalLineSpec,
    PendingJournalSpec,
    VendorRow,
)


# =============================================================================
# Calibration knobs
# =============================================================================

# Splits of fully-loaded annual cost per FTE.
CASH_COMP_SHARE = 0.85       # cash + benefits + payroll taxes (paid via AP)
SBC_SHARE = 0.15             # stock-based comp (no cash, journal-only)

# Headcount linear growth: FY23 BoP starts at this fraction of FY25 EOP.
FY23_BOP_HEADCOUNT_RATIO = 0.65

# Pay periods per month (semi-monthly = 2)
PAY_PERIODS_PER_MONTH = 2

# Account name → COA account_id mappings used by payroll
SALARY_ACCOUNTS_BY_FUNCTION: dict[str, str] = {
    "sales":            "Sales Salaries and Benefits",
    "marketing":        "Marketing Salaries and Benefits",
    "rd":               "Engineering Salaries and Benefits",  # default; product is similar
    "customer_success": "Customer Success Cost - Sales Cloud",  # unusual but matches COA
    "ga":               "Executive Salaries and Benefits",     # umbrella for G&A salary
    "it":               "IT Salaries and Benefits",
}

# SBC account by rollup
SBC_ACCOUNTS_BY_ROLLUP: dict[str, str] = {
    "sm":   "Stock-Based Compensation - S&M",
    "rd":   "Stock-Based Compensation - R&D",
    "ga":   "Stock-Based Compensation - G&A",
    # COGS rollup doesn't have a separate SBC line in our COA; bucket under R&D SBC
    # for customer-success, and G&A SBC for IT.
}

# What rollup each function lands in (for SBC bucketing)
FUNCTION_TO_ROLLUP: dict[str, str] = {
    "sales":            "sm",
    "marketing":        "sm",
    "rd":               "rd",
    "customer_success": "rd",   # bucket SBC into R&D rollup
    "ga":               "ga",
    "it":               "ga",   # bucket SBC into G&A rollup
}

# G&A function -> finer salary account map (bonus mapping; falls back to default)
GA_SALARY_ACCOUNT_MAP: dict[str, str] = {
    # Currently we tag all G&A FTEs to "Executive Salaries and Benefits" since
    # we don't model HR/finance/legal/IT separately at the cost-center level.
    # In future we could expand this.
}


# =============================================================================
# Public artifacts type
# =============================================================================

@dataclass(slots=True)
class PayrollArtifacts:
    payroll_vendor_id: str
    ap_invoices: list[APInvoiceRow]
    ap_payments: list[APPaymentRow]
    sbc_journals: list[PendingJournalSpec]
    # FTE counts by (period, cost_center) for downstream EPM headcount plan
    fte_by_period_cc: dict[tuple[int, str], float]


# =============================================================================
# Helpers
# =============================================================================

def _to_dt(d: date) -> datetime:
    return datetime.combine(d, time.min, tzinfo=timezone.utc)


def _round_money(x: float) -> float:
    return round(x, 2)


def _account_id_for_name(coa: list[ChartOfAccountsRow], name: str) -> str | None:
    for a in coa:
        if a.account_name == name:
            return a.account_id
    return None


def _last_day_of_month(year: int, month: int) -> int:
    if month == 12:
        return 31
    return (date(year, month + 1, 1) - timedelta(days=1)).day


# =============================================================================
# Step 1 — FTE allocation by (period, cost_center)
# =============================================================================

def _build_fte_matrix(
    cost_centers: list[CostCenterRow],
    fiscal_years: list[int],
    scale: float,
) -> dict[tuple[int, str], float]:
    """Linearly grow FTEs from FY23 BoP to FY25 EOP, scaled by mode.

    Returns dict (period_yyyymm, cost_center_id) -> fte count.
    """
    eop_target = cfg.TOTAL_HEADCOUNT_FY25 * scale
    bop_target = round(eop_target * FY23_BOP_HEADCOUNT_RATIO)

    # EOP HC per (function, entity) by HEADCOUNT_BY_FUNCTION × FUNCTION_ENTITY_WEIGHTS
    eop_by_fn_entity: dict[tuple[str, str], float] = {}
    for fn, fn_share in cfg.HEADCOUNT_BY_FUNCTION.items():
        ent_w = cfg.FUNCTION_ENTITY_WEIGHTS[fn]
        for entity_id, ew in ent_w.items():
            eop_by_fn_entity[(fn, entity_id)] = eop_target * fn_share * ew

    bop_by_fn_entity = {k: v * FY23_BOP_HEADCOUNT_RATIO for k, v in eop_by_fn_entity.items()}

    # Distribute (fn, entity) HC across cost centers in that bucket equally
    cc_by_fn_entity: dict[tuple[str, str], list[str]] = defaultdict(list)
    for cc in cost_centers:
        cc_by_fn_entity[(cc.function, cc.entity_id)].append(cc.cost_center_id)

    # Build period list
    periods = []
    cursor = cfg.fy_start(min(fiscal_years))
    end = cfg.fy_end(max(fiscal_years))
    while cursor <= end:
        periods.append(cfg.period_yyyymm(cursor))
        cursor = cursor + relativedelta(months=1)

    n_periods = len(periods)
    matrix: dict[tuple[int, str], float] = {}

    for i, period in enumerate(periods):
        # Linear interpolation between BoP and EOP
        t = i / max(1, n_periods - 1)
        for (fn, entity_id), eop_hc in eop_by_fn_entity.items():
            bop_hc = bop_by_fn_entity[(fn, entity_id)]
            current_hc = bop_hc + (eop_hc - bop_hc) * t
            ccs = cc_by_fn_entity.get((fn, entity_id), [])
            if not ccs:
                continue
            per_cc = current_hc / len(ccs)
            for cc_id in ccs:
                matrix[(period, cc_id)] = per_cc
    return matrix


# =============================================================================
# Step 2 — Cash-comp AP invoices (semi-monthly)
# =============================================================================

def _generate_payroll_ap_invoices(
    rng: np.random.Generator,
    coa: list[ChartOfAccountsRow],
    cost_centers: list[CostCenterRow],
    fte_matrix: dict[tuple[int, str], float],
    payroll_vendor: VendorRow,
) -> list[APInvoiceRow]:
    """One AP invoice per (cost_center × pay-period) covering cash comp."""
    cc_by_id = {cc.cost_center_id: cc for cc in cost_centers}
    invoices: list[APInvoiceRow] = []
    counter = 0

    # Annual cash cost per FTE by function
    annual_cash_per_fte = {
        fn: cfg.ANNUAL_FTE_COST_BY_FUNCTION[fn] * CASH_COMP_SHARE
        for fn in cfg.ANNUAL_FTE_COST_BY_FUNCTION
    }

    # Pay dates: 15th and last day of each month
    for (period, cc_id), fte in fte_matrix.items():
        if fte <= 0:
            continue
        cc = cc_by_id[cc_id]
        salary_acct_name = SALARY_ACCOUNTS_BY_FUNCTION[cc.function]
        salary_acct_id = _account_id_for_name(coa, salary_acct_name)
        if salary_acct_id is None:
            continue

        annual_cost = annual_cash_per_fte[cc.function] * fte
        per_pay_period = annual_cost / 12.0 / PAY_PERIODS_PER_MONTH

        year = period // 100
        month = period % 100
        last_day = _last_day_of_month(year, month)
        pay_dates = [date(year, month, 15), date(year, month, last_day)]

        for pd_date in pay_dates:
            counter += 1
            invoices.append(APInvoiceRow(
                ap_invoice_id=str(uuid.uuid4()),
                vendor_id=payroll_vendor.vendor_id,
                invoice_number=f"PAY-{year}-{counter:08d}",
                invoice_date=pd_date,
                due_date=pd_date + timedelta(days=2),  # payroll usually pays in 2 days
                amount=_round_money(per_pay_period),
                account_id=salary_acct_id,
                cost_center_id=cc_id,
                status="paid",   # payroll is always paid promptly
                created_at=_to_dt(pd_date),
            ))
    return invoices


def _generate_payroll_payments(invoices: list[APInvoiceRow]) -> list[APPaymentRow]:
    payments = []
    for inv in invoices:
        payments.append(APPaymentRow(
            ap_payment_id=str(uuid.uuid4()),
            ap_invoice_id=inv.ap_invoice_id,
            payment_date=inv.due_date,
            amount=inv.amount,
        ))
    return payments


# =============================================================================
# Step 3 — SBC pending journals (monthly, by cost center)
# =============================================================================

def _generate_sbc_journals(
    coa: list[ChartOfAccountsRow],
    cost_centers: list[CostCenterRow],
    fte_matrix: dict[tuple[int, str], float],
) -> list[PendingJournalSpec]:
    """One journal per (period × entity) aggregating SBC across CCs in that entity.

    Each journal:
       DR  Stock-Based Comp expense (for each CC's allocation, with cost_center_id)
       CR  Additional Paid-in Capital (single equity line, no cost center)
    """
    cc_by_id = {cc.cost_center_id: cc for cc in cost_centers}
    apic_id = _account_id_for_name(coa, "Additional Paid-in Capital")
    if apic_id is None:
        return []

    # Aggregate SBC by (period, entity_id) → list of (cc_id, amount, sbc_acct_id)
    by_period_entity: dict[tuple[int, str], list[tuple[str, float, str]]] = defaultdict(list)

    for (period, cc_id), fte in fte_matrix.items():
        if fte <= 0:
            continue
        cc = cc_by_id[cc_id]
        sbc_rollup = FUNCTION_TO_ROLLUP[cc.function]
        sbc_acct_name = SBC_ACCOUNTS_BY_ROLLUP.get(sbc_rollup)
        if not sbc_acct_name:
            continue
        sbc_acct_id = _account_id_for_name(coa, sbc_acct_name)
        if sbc_acct_id is None:
            continue
        annual_sbc = cfg.ANNUAL_FTE_COST_BY_FUNCTION[cc.function] * SBC_SHARE * fte
        monthly = annual_sbc / 12.0
        by_period_entity[(period, cc.entity_id)].append((cc_id, monthly, sbc_acct_id))

    journals: list[PendingJournalSpec] = []
    for (period, entity_id), rows in by_period_entity.items():
        if not rows:
            continue
        year = period // 100
        month = period % 100
        last_day = _last_day_of_month(year, month)
        posting_date = date(year, month, last_day)

        lines: list[PendingJournalLineSpec] = []
        total_sbc = 0.0
        for cc_id, amt, sbc_acct_id in rows:
            rounded = _round_money(amt)
            lines.append(PendingJournalLineSpec(
                account_id=sbc_acct_id,
                cost_center_id=cc_id,
                debit_amount=rounded,
                credit_amount=0.0,
                memo="SBC monthly accrual",
            ))
            total_sbc += rounded   # sum of rounded amounts to keep journal balanced

        # Balancing credit to APIC (no cost center)
        lines.append(PendingJournalLineSpec(
            account_id=apic_id,
            cost_center_id=None,
            debit_amount=0.0,
            credit_amount=_round_money(total_sbc),
            memo="SBC offset to APIC",
        ))

        journals.append(PendingJournalSpec(
            posting_date=posting_date,
            period_yyyymm=period,
            entity_id=entity_id,
            journal_type="manual",
            description=f"Stock-based compensation accrual - {entity_id} - {period}",
            created_by="system_payroll",
            lines=lines,
        ))
    return journals


# =============================================================================
# Public entry point
# =============================================================================

def generate_payroll(
    rng: np.random.Generator,
    coa: list[ChartOfAccountsRow],
    cost_centers: list[CostCenterRow],
    payroll_vendor: VendorRow,
    fiscal_years: list[int],
    scale: float = 1.0,
) -> PayrollArtifacts:
    fte_matrix = _build_fte_matrix(cost_centers, fiscal_years, scale)
    invoices = _generate_payroll_ap_invoices(rng, coa, cost_centers, fte_matrix, payroll_vendor)
    payments = _generate_payroll_payments(invoices)
    sbc = _generate_sbc_journals(coa, cost_centers, fte_matrix)

    return PayrollArtifacts(
        payroll_vendor_id=payroll_vendor.vendor_id,
        ap_invoices=invoices,
        ap_payments=payments,
        sbc_journals=sbc,
        fte_by_period_cc=fte_matrix,
    )
