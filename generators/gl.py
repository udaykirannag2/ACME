"""Phase 2D — General Ledger auto-poster.

Reads artifacts produced by Phases 2C and emits gl_journal_header +
gl_journal_line. All journals balance per definition (sum debits = sum credits).
A separate validate.py asserts this and other invariants.

Aggregation strategy (chosen to keep journal count tractable while preserving
the slicing the agent needs):
  - AR invoice issuance:    aggregated per (period × entity)
  - Revenue recognition:    aggregated per (period × entity × segment)
  - AR receipts:            aggregated per (period × entity)
  - AP invoices:            aggregated per (period × entity × cost_center)
                            so cost-center attribution is preserved in GL
  - AP payments:            aggregated per (period × entity)
  - FA acquisitions:        aggregated per (period × entity × asset_class)
  - FA depreciation:        aggregated per (period × entity × cost_center)
  - SBC accruals:           pass-through from PendingJournalSpec
  - Tax accruals:           simplified — quarterly estimate, per entity
  - Opening balance sheet:  one journal per entity at FY23 BoP

Customer entity attribution is derived from billing_country via the inverse
of cfg.COUNTRY_WEIGHTS_BY_ENTITY.
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
    APInvoiceRow,
    APPaymentRow,
    AccountRow,
    ARInvoiceRow,
    ARReceiptRow,
    ChartOfAccountsRow,
    CostCenterRow,
    CustomerRow,
    EntityRow,
    FADepreciationRow,
    FixedAssetRow,
    GLJournalHeaderRow,
    GLJournalLineRow,
    PendingJournalSpec,
    VendorRow,
)


# =============================================================================
# Public artifacts
# =============================================================================

@dataclass(slots=True)
class GLArtifacts:
    headers: list[GLJournalHeaderRow]
    lines: list[GLJournalLineRow]


# =============================================================================
# Helpers
# =============================================================================

def _to_dt(d: date) -> datetime:
    return datetime.combine(d, time.min, tzinfo=timezone.utc)


def _round_money(x: float) -> float:
    return round(x, 2)


def _last_day(year: int, month: int) -> date:
    if month == 12:
        return date(year, 12, 31)
    return date(year, month + 1, 1) - timedelta(days=1)


def _period_to_date(period_yyyymm: int) -> date:
    """Return last day of the period for posting."""
    y, m = divmod(period_yyyymm, 100)
    return _last_day(y, m)


def _country_to_entity_map() -> dict[str, str]:
    """Inverse of cfg.COUNTRY_WEIGHTS_BY_ENTITY."""
    out: dict[str, str] = {}
    for entity_id, country_dist in cfg.COUNTRY_WEIGHTS_BY_ENTITY.items():
        for country in country_dist:
            out[country] = entity_id
    return out


# =============================================================================
# GL Builder — accumulates journals, emits final rows
# =============================================================================

class GLBuilder:
    """Accumulates journal headers and lines.

    add_journal() takes a list of line specs (account_id, cost_center_id,
    debit, credit, memo, ref_type, ref_id) and creates header + line rows.
    """

    def __init__(self, coa: list[ChartOfAccountsRow]) -> None:
        self.account_lookup_by_name: dict[str, str] = {a.account_name: a.account_id for a in coa}
        self.account_by_id: dict[str, ChartOfAccountsRow] = {a.account_id: a for a in coa}
        self.headers: list[GLJournalHeaderRow] = []
        self.lines: list[GLJournalLineRow] = []
        self._counter = 0

    def aid(self, account_name: str) -> str:
        out = self.account_lookup_by_name.get(account_name)
        if out is None:
            raise KeyError(f"account_name not in COA: {account_name!r}")
        return out

    def aid_starts_with(self, prefix: str) -> list[str]:
        return [a.account_id for n, a in self.account_lookup_by_name.items() if n.startswith(prefix)] \
            if False else [aid for name, aid in self.account_lookup_by_name.items() if name.startswith(prefix)]

    def add_journal(
        self,
        *,
        posting_date: date,
        entity_id: str,
        journal_type: str,
        description: str,
        lines: list[tuple],
        created_by: str = "system",
    ) -> str | None:
        """lines = list of (account_id, cost_center_id, debit, credit, memo,
        ref_type, ref_id). Lines with both debit and credit zero are dropped.
        If no non-zero lines remain, the journal is not created (returns None).
        """
        cleaned: list[tuple] = []
        for ln in lines:
            account_id, cc_id, debit, credit, memo, ref_type, ref_id = ln
            d = _round_money(debit) if debit else 0.0
            c = _round_money(credit) if credit else 0.0
            if d <= 0 and c <= 0:
                continue
            if d > 0 and c > 0:
                # Should never happen in our generators
                raise ValueError(f"line both debit and credit: {ln!r}")
            cleaned.append((account_id, cc_id, d, c, memo, ref_type, ref_id))

        if not cleaned:
            return None

        # Validate balanced
        sum_d = sum(ln[2] for ln in cleaned)
        sum_c = sum(ln[3] for ln in cleaned)
        if abs(sum_d - sum_c) > 0.05:
            raise ValueError(
                f"unbalanced journal {description!r}: debits {sum_d} vs credits {sum_c}"
            )

        # Tiny rounding fix: adjust the largest line by the residual penny
        residual = round(sum_d - sum_c, 2)
        if residual != 0.0:
            # Adjust the smallest non-zero line's debit-or-credit by residual
            largest_idx = max(
                range(len(cleaned)),
                key=lambda i: max(cleaned[i][2], cleaned[i][3]),
            )
            account_id, cc_id, d, c, memo, ref_type, ref_id = cleaned[largest_idx]
            if c > 0:   # increase credit if debits are higher
                c = round(c + residual, 2)
            else:
                d = round(d - residual, 2)
            cleaned[largest_idx] = (account_id, cc_id, d, c, memo, ref_type, ref_id)

        self._counter += 1
        journal_id = str(uuid.uuid4())
        period = posting_date.year * 100 + posting_date.month
        header = GLJournalHeaderRow(
            journal_id=journal_id,
            journal_number=f"JE-{posting_date.year}-{self._counter:08d}",
            posting_date=posting_date,
            period_yyyymm=period,
            entity_id=entity_id,
            journal_type=journal_type,
            description=description,
            created_by=created_by,
            created_at=_to_dt(posting_date),
        )
        self.headers.append(header)
        for i, (account_id, cc_id, d, c, memo, ref_type, ref_id) in enumerate(cleaned, start=1):
            self.lines.append(GLJournalLineRow(
                journal_line_id=str(uuid.uuid4()),
                journal_id=journal_id,
                line_number=i,
                account_id=account_id,
                cost_center_id=cc_id,
                debit_amount=d,
                credit_amount=c,
                memo=memo,
                reference_doc_type=ref_type,
                reference_doc_id=ref_id,
            ))
        return journal_id


# =============================================================================
# Step 1 — Opening balance sheet (FY23 BoP)
# =============================================================================

def _post_opening_balances(
    builder: GLBuilder,
    entities_list: list[EntityRow],
    scale: float,
) -> None:
    """One opening journal per entity. Cash + Goodwill on left, Common Stock + APIC on right."""
    bop = cfg.fy_start(2023) - timedelta(days=1)   # Jan 31, 2022 — opening balance posted day before FY23 starts

    cash_aid = builder.aid("Cash and Cash Equivalents")
    goodwill_aid = builder.aid("Goodwill")
    cs_aid = builder.aid("Common Stock")
    apic_aid = builder.aid("Additional Paid-in Capital")

    # Total opening assets = ~$200M × scale spread across entities
    total_opening_assets = 200_000_000 * scale

    for entity in entities_list:
        ent_share = next(e.geo_weight for e in cfg.ENTITIES if e.entity_id == entity.entity_id)
        cash_amount = _round_money(total_opening_assets * 0.7 * ent_share)
        goodwill_amount = _round_money(total_opening_assets * 0.3 * ent_share)
        cs_amount = _round_money(1_000_000 * ent_share)
        apic_amount = _round_money(cash_amount + goodwill_amount - cs_amount)

        builder.add_journal(
            posting_date=bop,
            entity_id=entity.entity_id,
            journal_type="manual",
            description=f"Opening balance sheet - {entity.entity_id}",
            lines=[
                (cash_aid,     None, cash_amount,     0,                "Opening cash",        None, None),
                (goodwill_aid, None, goodwill_amount, 0,                "Opening goodwill",    None, None),
                (cs_aid,       None, 0,               cs_amount,        "Founders stock",      None, None),
                (apic_aid,     None, 0,               apic_amount,      "Initial APIC",        None, None),
            ],
            created_by="system_opening",
        )


# =============================================================================
# Step 2 — AR invoice issuance
# =============================================================================

def _post_ar_invoices(
    builder: GLBuilder,
    invoices: list[ARInvoiceRow],
    customers: list[CustomerRow],
) -> None:
    """DR AR-Trade / CR Deferred Revenue. Aggregated per (period × entity)."""
    if not invoices:
        return

    country_to_entity = _country_to_entity_map()
    customer_entity = {c.customer_id: country_to_entity.get(c.billing_country, "US")
                       for c in customers}

    # Aggregate by (period, entity)
    by_pe: dict[tuple[int, str], float] = defaultdict(float)
    for inv in invoices:
        period = inv.invoice_date.year * 100 + inv.invoice_date.month
        entity_id = customer_entity.get(inv.customer_id, "US")
        by_pe[(period, entity_id)] += inv.amount

    ar_aid = builder.aid("Accounts Receivable - Trade")
    defrev_aid = builder.aid("Deferred Revenue - Current")

    for (period, entity_id), amount in by_pe.items():
        posting = _period_to_date(period)
        builder.add_journal(
            posting_date=posting,
            entity_id=entity_id,
            journal_type="auto_ar",
            description=f"AR invoice issuance - {entity_id} - {period}",
            lines=[
                (ar_aid,     None, amount, 0,      "Aggregated AR billings",  "ar_invoice_batch", None),
                (defrev_aid, None, 0,      amount, "Deferred revenue",         "ar_invoice_batch", None),
            ],
            created_by="system_ar",
        )


# =============================================================================
# Step 3 — Revenue recognition (ratable)
# =============================================================================

def _months_in_service_period(inv: ARInvoiceRow) -> list[int]:
    """Return list of yyyymm covered by the invoice's service period (inclusive)."""
    start = inv.service_period_start
    end = inv.service_period_end
    out = []
    cursor = date(start.year, start.month, 1)
    while cursor <= end:
        out.append(cursor.year * 100 + cursor.month)
        cursor = cursor + relativedelta(months=1)
    return out


def _post_revenue_recognition(
    builder: GLBuilder,
    invoices: list[ARInvoiceRow],
    customers: list[CustomerRow],
) -> None:
    """For each AR invoice, recognize revenue ratably over its service period.

    Aggregated by (period × entity × segment).
    """
    country_to_entity = _country_to_entity_map()
    customer_entity = {c.customer_id: country_to_entity.get(c.billing_country, "US")
                       for c in customers}

    # by (period, entity, segment) → recognized revenue
    by_pes: dict[tuple[int, str, str], float] = defaultdict(float)

    for inv in invoices:
        months = _months_in_service_period(inv)
        if not months:
            continue
        per_month = inv.amount / len(months)
        entity_id = customer_entity.get(inv.customer_id, "US")
        for period in months:
            by_pes[(period, entity_id, inv.segment)] += per_month

    defrev_aid = builder.aid("Deferred Revenue - Current")

    # Map segment code → revenue account (sub revenue, not PS)
    rev_acct_by_segment: dict[str, str] = {}
    for seg in cfg.SEGMENTS:
        # find "Subscription Revenue - <Segment Name>"
        name = f"Subscription Revenue - {seg.display_name}"
        try:
            rev_acct_by_segment[seg.code] = builder.aid(name)
        except KeyError:
            pass

    # Group by (period × entity) for journal aggregation
    grouped: dict[tuple[int, str], list[tuple[str, float]]] = defaultdict(list)
    for (period, entity_id, segment), amount in by_pes.items():
        rev_aid = rev_acct_by_segment.get(segment)
        if rev_aid is None:
            continue
        grouped[(period, entity_id)].append((rev_aid, amount))
        # also need to check segment

    for (period, entity_id), seg_amounts in grouped.items():
        posting = _period_to_date(period)
        total = sum(a for _, a in seg_amounts)
        lines = [
            (defrev_aid, None, total, 0, "Recognize revenue", "ar_invoice_batch", None),
        ]
        for rev_aid, amount in seg_amounts:
            lines.append(
                (rev_aid, None, 0, _round_money(amount), "Subscription revenue", "ar_invoice_batch", None)
            )
        builder.add_journal(
            posting_date=posting,
            entity_id=entity_id,
            journal_type="auto_revrec",
            description=f"Revenue recognition - {entity_id} - {period}",
            lines=lines,
            created_by="system_revrec",
        )


# =============================================================================
# Step 4 — AR receipts
# =============================================================================

def _post_ar_receipts(
    builder: GLBuilder,
    invoices: list[ARInvoiceRow],
    receipts: list[ARReceiptRow],
    customers: list[CustomerRow],
) -> None:
    if not receipts:
        return
    country_to_entity = _country_to_entity_map()
    customer_entity = {c.customer_id: country_to_entity.get(c.billing_country, "US")
                       for c in customers}
    inv_to_customer = {i.ar_invoice_id: i.customer_id for i in invoices}

    by_pe: dict[tuple[int, str], float] = defaultdict(float)
    for r in receipts:
        period = r.receipt_date.year * 100 + r.receipt_date.month
        cust_id = inv_to_customer.get(r.ar_invoice_id)
        if cust_id is None:
            continue
        entity_id = customer_entity.get(cust_id, "US")
        by_pe[(period, entity_id)] += r.amount

    cash_aid = builder.aid("Cash and Cash Equivalents")
    ar_aid = builder.aid("Accounts Receivable - Trade")

    for (period, entity_id), amount in by_pe.items():
        posting = _period_to_date(period)
        builder.add_journal(
            posting_date=posting,
            entity_id=entity_id,
            journal_type="auto_ar",
            description=f"AR receipts - {entity_id} - {period}",
            lines=[
                (cash_aid, None, amount, 0,      "Cash receipts",  "ar_receipt_batch", None),
                (ar_aid,   None, 0,      amount, "Clear AR",       "ar_receipt_batch", None),
            ],
            created_by="system_ar",
        )


# =============================================================================
# Step 5 — AP invoices (per period × cost_center for attribution)
# =============================================================================

def _post_ap_invoices(
    builder: GLBuilder,
    invoices: list[APInvoiceRow],
    cost_centers: list[CostCenterRow],
) -> None:
    if not invoices:
        return
    cc_by_id = {cc.cost_center_id: cc for cc in cost_centers}

    # Aggregate by (period, cost_center, account)
    by_key: dict[tuple[int, str, str], float] = defaultdict(float)
    for inv in invoices:
        period = inv.invoice_date.year * 100 + inv.invoice_date.month
        by_key[(period, inv.cost_center_id, inv.account_id)] += inv.amount

    ap_aid = builder.aid("Accounts Payable - Trade")

    # Group by (period, entity) for posting; one journal aggregates all CC×account in that bucket
    group: dict[tuple[int, str], list[tuple[str, str, float]]] = defaultdict(list)
    for (period, cc_id, account_id), amount in by_key.items():
        cc = cc_by_id.get(cc_id)
        if cc is None:
            continue
        group[(period, cc.entity_id)].append((cc_id, account_id, amount))

    for (period, entity_id), rows in group.items():
        posting = _period_to_date(period)
        total = sum(r[2] for r in rows)
        lines = []
        for cc_id, account_id, amount in rows:
            lines.append(
                (account_id, cc_id, _round_money(amount), 0, "Expense recognition", "ap_invoice_batch", None)
            )
        # Single AP credit balancing the entire journal
        lines.append(
            (ap_aid, None, 0, _round_money(total), "AP balancing", "ap_invoice_batch", None)
        )
        builder.add_journal(
            posting_date=posting,
            entity_id=entity_id,
            journal_type="auto_ap",
            description=f"AP invoice posting - {entity_id} - {period}",
            lines=lines,
            created_by="system_ap",
        )


# =============================================================================
# Step 6 — AP payments
# =============================================================================

def _post_ap_payments(
    builder: GLBuilder,
    invoices: list[APInvoiceRow],
    payments: list[APPaymentRow],
    cost_centers: list[CostCenterRow],
) -> None:
    if not payments:
        return
    cc_by_id = {cc.cost_center_id: cc for cc in cost_centers}
    inv_by_id = {i.ap_invoice_id: i for i in invoices}

    # Aggregate by (period, entity)
    by_pe: dict[tuple[int, str], float] = defaultdict(float)
    for p in payments:
        inv = inv_by_id.get(p.ap_invoice_id)
        if inv is None:
            continue
        cc = cc_by_id.get(inv.cost_center_id)
        if cc is None:
            continue
        period = p.payment_date.year * 100 + p.payment_date.month
        by_pe[(period, cc.entity_id)] += p.amount

    ap_aid = builder.aid("Accounts Payable - Trade")
    cash_aid = builder.aid("Cash and Cash Equivalents")

    for (period, entity_id), amount in by_pe.items():
        posting = _period_to_date(period)
        builder.add_journal(
            posting_date=posting,
            entity_id=entity_id,
            journal_type="auto_ap",
            description=f"AP payments - {entity_id} - {period}",
            lines=[
                (ap_aid,   None, amount, 0,      "Clear AP",         "ap_payment_batch", None),
                (cash_aid, None, 0,      amount, "Cash disbursed",   "ap_payment_batch", None),
            ],
            created_by="system_ap",
        )


# =============================================================================
# Step 7 — Fixed asset acquisitions
# =============================================================================

def _post_fa_acquisitions(
    builder: GLBuilder,
    assets: list[FixedAssetRow],
) -> None:
    """DR Fixed Assets-Cost / CR Cash (simplification: paid in cash)."""
    if not assets:
        return
    by_pe_class: dict[tuple[int, str, str], float] = defaultdict(float)
    for a in assets:
        period = a.acquisition_date.year * 100 + a.acquisition_date.month
        by_pe_class[(period, a.entity_id, a.asset_class)] += a.acquisition_cost

    fa_cost_aid = builder.aid("Fixed Assets - Cost")
    cash_aid = builder.aid("Cash and Cash Equivalents")

    # Group by (period, entity)
    group: dict[tuple[int, str], float] = defaultdict(float)
    for (period, entity_id, _), amount in by_pe_class.items():
        group[(period, entity_id)] += amount

    for (period, entity_id), amount in group.items():
        posting = _period_to_date(period)
        builder.add_journal(
            posting_date=posting,
            entity_id=entity_id,
            journal_type="manual",
            description=f"Fixed asset acquisitions - {entity_id} - {period}",
            lines=[
                (fa_cost_aid, None, amount, 0,      "Capitalize FA",  "fixed_asset_batch", None),
                (cash_aid,    None, 0,      amount, "Cash paid",      "fixed_asset_batch", None),
            ],
            created_by="system_fa",
        )


# =============================================================================
# Step 8 — Fixed asset depreciation
# =============================================================================

def _depreciation_account_for_function(builder: GLBuilder, function: str) -> str:
    """Map cost-center function to depreciation expense account."""
    name_map = {
        "sales":            "Depreciation - S&M",
        "marketing":        "Depreciation - S&M",
        "rd":               "Depreciation - R&D",
        "customer_success": "Depreciation - COGS",
        "ga":               "Depreciation - G&A",
        "it":               "Depreciation - G&A",
    }
    return builder.aid(name_map.get(function, "Depreciation - G&A"))


def _post_fa_depreciation(
    builder: GLBuilder,
    assets: list[FixedAssetRow],
    depreciation: list[FADepreciationRow],
    cost_centers: list[CostCenterRow],
) -> None:
    if not depreciation:
        return
    asset_by_id = {a.fixed_asset_id: a for a in assets}
    cc_by_id = {cc.cost_center_id: cc for cc in cost_centers}

    # Aggregate by (period, entity, cost_center)
    by_key: dict[tuple[int, str, str], float] = defaultdict(float)
    for d in depreciation:
        a = asset_by_id.get(d.fixed_asset_id)
        if a is None:
            continue
        by_key[(d.period_yyyymm, a.entity_id, a.cost_center_id)] += d.depreciation_amount

    accum_aid = builder.aid("Accumulated Depreciation")

    # Group by (period, entity)
    group: dict[tuple[int, str], list[tuple[str, float]]] = defaultdict(list)
    for (period, entity_id, cc_id), amount in by_key.items():
        group[(period, entity_id)].append((cc_id, amount))

    for (period, entity_id), rows in group.items():
        posting = _period_to_date(period)
        lines = []
        total = 0.0
        for cc_id, amount in rows:
            cc = cc_by_id.get(cc_id)
            if cc is None:
                continue
            dep_aid = _depreciation_account_for_function(builder, cc.function)
            lines.append(
                (dep_aid, cc_id, _round_money(amount), 0, "Monthly depreciation", "fa_depreciation_batch", None)
            )
            total += amount
        if not lines:
            continue
        lines.append(
            (accum_aid, None, 0, _round_money(total), "Accumulate depreciation", "fa_depreciation_batch", None)
        )
        builder.add_journal(
            posting_date=posting,
            entity_id=entity_id,
            journal_type="auto_dep",
            description=f"FA depreciation - {entity_id} - {period}",
            lines=lines,
            created_by="system_fa",
        )


# =============================================================================
# Step 9 — Pending journals (SBC accruals from payroll.py)
# =============================================================================

def _post_pending_journals(
    builder: GLBuilder,
    pendings: list[PendingJournalSpec],
) -> None:
    for p in pendings:
        lines = []
        for ln in p.lines:
            lines.append((
                ln.account_id,
                ln.cost_center_id,
                ln.debit_amount,
                ln.credit_amount,
                ln.memo,
                ln.reference_doc_type,
                ln.reference_doc_id,
            ))
        builder.add_journal(
            posting_date=p.posting_date,
            entity_id=p.entity_id,
            journal_type=p.journal_type,
            description=p.description,
            lines=lines,
            created_by=p.created_by,
        )


# =============================================================================
# Step 10 — Tax accruals (simplified: 23% effective rate on operating income proxy)
# =============================================================================

def _post_tax_accruals(
    builder: GLBuilder,
    entities_list: list[EntityRow],
    fiscal_years: list[int],
    scale: float,
) -> None:
    """Quarterly tax accrual posted on the last day of each fiscal quarter."""
    tax_curr_aid = builder.aid("Income Tax Expense - Current")
    tax_payable_aid = builder.aid("Income Tax Payable")

    # Quarter → last month of that quarter (end month)
    fq_end_months = {1: 4, 2: 7, 3: 10, 4: 1}    # Jan is FQ4 end (next calendar year)

    for fy in fiscal_years:
        annual_revenue = cfg.REVENUE_BY_FY[fy] * scale
        # Operating income proxy: 10% margin × revenue
        op_income = annual_revenue * 0.10
        annual_tax = op_income * cfg.OPEX_RATIOS.effective_tax_rate
        # Distribute across 4 quarters with seasonality (Q4 highest)
        q_weights = cfg.BOOKINGS_FQ_SEASONALITY
        for fq, w in q_weights.items():
            tax_amount = annual_tax * w
            # Posting date: last day of fiscal quarter
            end_month = fq_end_months[fq]
            # Q4's January is in the fiscal year (fy), Q1-Q3 are in (fy-1) calendar year
            cal_year = fy if fq == 4 else fy - 1
            posting = _last_day(cal_year, end_month)

            for entity in entities_list:
                ent_share = next(e.geo_weight for e in cfg.ENTITIES if e.entity_id == entity.entity_id)
                amt = _round_money(tax_amount * ent_share)
                if amt <= 0:
                    continue
                builder.add_journal(
                    posting_date=posting,
                    entity_id=entity.entity_id,
                    journal_type="manual",
                    description=f"Tax accrual - FY{fy} Q{fq} - {entity.entity_id}",
                    lines=[
                        (tax_curr_aid,    None, amt, 0,   "Tax expense",   "tax_accrual", None),
                        (tax_payable_aid, None, 0,   amt, "Tax payable",   "tax_accrual", None),
                    ],
                    created_by="system_tax",
                )


# =============================================================================
# Public entry point
# =============================================================================

def build_gl(
    coa: list[ChartOfAccountsRow],
    entities_list: list[EntityRow],
    cost_centers: list[CostCenterRow],
    customers: list[CustomerRow],
    ar_invoices: list[ARInvoiceRow],
    ar_receipts: list[ARReceiptRow],
    ap_invoices: list[APInvoiceRow],
    ap_payments: list[APPaymentRow],
    fixed_assets: list[FixedAssetRow],
    fa_depreciation: list[FADepreciationRow],
    sbc_pendings: list[PendingJournalSpec],
    fiscal_years: list[int],
    scale: float,
) -> GLArtifacts:
    builder = GLBuilder(coa)

    _post_opening_balances(builder, entities_list, scale)
    _post_ar_invoices(builder, ar_invoices, customers)
    _post_revenue_recognition(builder, ar_invoices, customers)
    _post_ar_receipts(builder, ar_invoices, ar_receipts, customers)
    _post_ap_invoices(builder, ap_invoices, cost_centers)
    _post_ap_payments(builder, ap_invoices, ap_payments, cost_centers)
    _post_fa_acquisitions(builder, fixed_assets)
    _post_fa_depreciation(builder, fixed_assets, fa_depreciation, cost_centers)
    _post_pending_journals(builder, sbc_pendings)
    _post_tax_accruals(builder, entities_list, fiscal_years, scale)

    return GLArtifacts(headers=builder.headers, lines=builder.lines)


# Touch unused
_ = Iterable
_ = AccountRow
_ = VendorRow
_ = np
