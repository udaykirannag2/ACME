"""Phase 2C — Accounts Receivable: customers, AR invoices, AR receipts.

Sourced from CRM artifacts:
  - One CustomerRow per CRM account (same account_id, mirrored as customer_id)
  - AR invoices generated from each closed_won opportunity, using the account's
    billing cadence (annual / quarterly / monthly per cfg.BILLING_CADENCE)
  - Each opp's contract term is INFERRED from the gap to the next won opp for
    the same (account, segment); the last opp in a series defaults to 12 months.
  - Most invoices are paid within DSO ± 15 days; some pay late, ~5% remain
    unpaid as of FY25 EOP for realistic AR aging.
"""
from __future__ import annotations

import uuid
from collections import defaultdict
from collections.abc import Iterable
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta, timezone

import numpy as np
from dateutil.relativedelta import relativedelta

from . import config as cfg
from .types import (
    AccountRow,
    ARInvoiceRow,
    ARReceiptRow,
    CustomerRow,
    OpportunityRow,
)


# =============================================================================
# Calibration knobs
# =============================================================================

# What fraction of invoices age past due_date before being paid.
# Keeps DSO realistic (~45 days) at FY25 EOP.
PAYMENT_BEHAVIOR = {
    "on_time":   0.65,    # paid within (due_date - 5d, due_date + 5d)
    "early":     0.10,    # paid in (invoice_date, due_date - 5d)
    "late":      0.20,    # paid in (due_date + 5d, due_date + 60d)
    "very_late": 0.03,    # paid in (due_date + 60d, due_date + 120d)
    "unpaid":    0.02,    # still open at FY25 EOP
}

# Net payment terms (days from invoice_date to due_date) by tier.
# Enterprise customers usually negotiate longer terms.
PAYMENT_TERMS_DAYS_BY_TIER: dict[str, int] = {
    "enterprise": 45,
    "commercial": 30,
    "smb":        15,
}

# Cutoff for receipt generation. Anything not paid by this date contributes
# to AR aging at FY25 close.
AR_RECEIPT_CUTOFF = cfg.fy_end(2025) + timedelta(days=14)  # ~Feb 14 2025


# =============================================================================
# Public artifacts type
# =============================================================================

@dataclass(slots=True)
class ARArtifacts:
    customers: list[CustomerRow]
    ar_invoices: list[ARInvoiceRow]
    ar_receipts: list[ARReceiptRow]


# =============================================================================
# Helpers
# =============================================================================

def _to_dt(d: date) -> datetime:
    return datetime.combine(d, time.min, tzinfo=timezone.utc)


def _add_months(d: date, n: int) -> date:
    return d + relativedelta(months=n)


def _months_between(d1: date, d2: date) -> int:
    return (d2.year - d1.year) * 12 + (d2.month - d1.month)


def _round_money(x: float) -> float:
    return round(x, 2)


def _weighted_choice(rng: np.random.Generator, choices, weights):
    total = sum(weights)
    probs = [w / total for w in weights]
    return rng.choice(choices, p=probs)


# =============================================================================
# Step 1 — Customer rows (mirror CRM accounts)
# =============================================================================

def _generate_customers(accounts: list[AccountRow]) -> list[CustomerRow]:
    return [
        CustomerRow(
            customer_id=a.account_id,        # same ID for reconciliation
            customer_name=a.account_name,
            billing_country=a.billing_country,
            segment_tier=a.segment_tier,
            created_at=_to_dt(a.created_date),
        )
        for a in accounts
    ]


# =============================================================================
# Step 2 — Infer contract term per closed_won opp
# =============================================================================

def _infer_contract_terms(opps: list[OpportunityRow]) -> dict[str, int]:
    """For each closed_won opp, infer its term in months as the gap to the
    next closed_won opp for the same (account, segment).

    For the last opp in a series, default to 12 months.
    """
    terms: dict[str, int] = {}
    won_by_key: dict[tuple[str, str], list[OpportunityRow]] = defaultdict(list)
    for o in opps:
        if o.stage == "closed_won":
            won_by_key[(o.account_id, o.segment)].append(o)

    for opp_list in won_by_key.values():
        opp_list.sort(key=lambda o: o.close_date)
        for i, opp in enumerate(opp_list):
            if i + 1 < len(opp_list):
                months = _months_between(opp.close_date, opp_list[i + 1].close_date)
                terms[opp.opportunity_id] = max(1, months)
            else:
                terms[opp.opportunity_id] = 12
    return terms


# =============================================================================
# Step 3 — Assign billing cadence per account (deterministic from rng)
# =============================================================================

def _assign_billing_cadence(
    rng: np.random.Generator,
    accounts: list[AccountRow],
) -> dict[str, str]:
    cadences = list(cfg.BILLING_CADENCE.keys())
    weights = list(cfg.BILLING_CADENCE.values())
    out: dict[str, str] = {}
    for a in accounts:
        out[a.account_id] = str(_weighted_choice(rng, cadences, weights))
    return out


# =============================================================================
# Step 4 — Generate AR invoices for a single opp
# =============================================================================

def _build_billing_schedule(
    opp: OpportunityRow,
    term_months: int,
    cadence: str,
) -> list[tuple[date, date, date, float]]:
    """Returns list of (invoice_date, service_period_start, service_period_end, amount)
    for one closed_won opportunity.

    For each cadence, we slice the term into invoice periods:
      - annual:    chunks of 12 months (last chunk may be partial)
      - quarterly: chunks of 3 months
      - monthly:   chunks of 1 month

    Each invoice's amount = ACV/12 × months_in_chunk (= one-twelfth of ACV per month).
    """
    chunk_months = {"annual": 12, "quarterly": 3, "monthly": 1}[cadence]
    per_month = opp.amount / 12.0

    schedule: list[tuple[date, date, date, float]] = []
    cursor = opp.close_date
    months_remaining = term_months
    while months_remaining > 0:
        m = min(chunk_months, months_remaining)
        start = cursor
        end = _add_months(cursor, m) - timedelta(days=1)
        amount = _round_money(per_month * m)
        schedule.append((cursor, start, end, amount))
        cursor = _add_months(cursor, m)
        months_remaining -= m
    return schedule


def _generate_ar_invoices(
    rng: np.random.Generator,
    opps: list[OpportunityRow],
    accounts_by_id: dict[str, AccountRow],
    terms_by_opp: dict[str, int],
    cadence_by_account: dict[str, str],
) -> list[ARInvoiceRow]:
    invoices: list[ARInvoiceRow] = []
    invoice_counter = 0
    for opp in opps:
        if opp.stage != "closed_won":
            continue
        acct = accounts_by_id[opp.account_id]
        cadence = cadence_by_account[opp.account_id]
        term = terms_by_opp.get(opp.opportunity_id, 12)
        net_days = PAYMENT_TERMS_DAYS_BY_TIER[acct.segment_tier]

        for inv_date, sp_start, sp_end, amount in _build_billing_schedule(
            opp, term, cadence
        ):
            invoice_counter += 1
            invoice_number = f"INV-{inv_date.year}-{invoice_counter:08d}"
            due_date = inv_date + timedelta(days=net_days)
            invoices.append(ARInvoiceRow(
                ar_invoice_id=str(uuid.uuid4()),
                customer_id=opp.account_id,
                invoice_number=invoice_number,
                invoice_date=inv_date,
                due_date=due_date,
                amount=amount,
                service_period_start=sp_start,
                service_period_end=sp_end,
                segment=opp.segment,
                status="open",            # updated later when receipts post
                opportunity_id=opp.opportunity_id,
                created_at=_to_dt(inv_date),
            ))
    return invoices


# =============================================================================
# Step 5 — Generate receipts and update invoice status
# =============================================================================

def _generate_receipts(
    rng: np.random.Generator,
    invoices: list[ARInvoiceRow],
) -> list[ARReceiptRow]:
    receipts: list[ARReceiptRow] = []
    behaviors = list(PAYMENT_BEHAVIOR.keys())
    weights = list(PAYMENT_BEHAVIOR.values())

    for inv in invoices:
        # Skip if invoice is post-cutoff (no chance to pay yet)
        if inv.invoice_date > AR_RECEIPT_CUTOFF:
            continue

        behavior = str(_weighted_choice(rng, behaviors, weights))
        if behavior == "unpaid":
            inv.status = "open"
            continue

        if behavior == "on_time":
            jitter = int(rng.integers(-5, 6))
            pay_date = inv.due_date + timedelta(days=jitter)
        elif behavior == "early":
            days = int(rng.integers(1, max(2, (inv.due_date - inv.invoice_date).days - 5)))
            pay_date = inv.invoice_date + timedelta(days=days)
        elif behavior == "late":
            pay_date = inv.due_date + timedelta(days=int(rng.integers(5, 61)))
        else:  # very_late
            pay_date = inv.due_date + timedelta(days=int(rng.integers(60, 121)))

        # Cap at cutoff; if would extend past, mark unpaid
        if pay_date > AR_RECEIPT_CUTOFF:
            inv.status = "open"
            continue

        receipts.append(ARReceiptRow(
            ar_receipt_id=str(uuid.uuid4()),
            ar_invoice_id=inv.ar_invoice_id,
            receipt_date=pay_date,
            amount=inv.amount,
        ))
        inv.status = "paid"

    return receipts


# =============================================================================
# Public entry point
# =============================================================================

def generate_ar(
    rng: np.random.Generator,
    accounts: list[AccountRow],
    opportunities: list[OpportunityRow],
) -> ARArtifacts:
    accounts_by_id = {a.account_id: a for a in accounts}

    customers = _generate_customers(accounts)
    terms = _infer_contract_terms(opportunities)
    cadences = _assign_billing_cadence(rng, accounts)
    invoices = _generate_ar_invoices(rng, opportunities, accounts_by_id, terms, cadences)
    receipts = _generate_receipts(rng, invoices)

    return ARArtifacts(
        customers=customers,
        ar_invoices=invoices,
        ar_receipts=receipts,
    )


# Keep imports
_ = Iterable
_ = datetime
