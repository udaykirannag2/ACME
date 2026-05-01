"""Phase 2D — invariant validation across all generated artifacts.

Run after every generation. Raises ValidationError on the first violation.
"""
from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from typing import Any

from .types import (
    APInvoiceRow,
    APPaymentRow,
    ARInvoiceRow,
    ARReceiptRow,
    AccountRow,
    ChartOfAccountsRow,
    ContactRow,
    CostCenterRow,
    CustomerRow,
    EntityRow,
    FADepreciationRow,
    FixedAssetRow,
    GLJournalHeaderRow,
    GLJournalLineRow,
    OpportunityLineRow,
    OpportunityRow,
    VendorRow,
)


class ValidationError(AssertionError):
    pass


@dataclass(slots=True)
class ValidationReport:
    journals_checked: int
    lines_checked: int
    period_entity_balances_checked: int
    fk_violations: list[str]
    balance_violations: list[str]


def _approx_zero(x: float, tol: float = 0.10) -> bool:
    return abs(x) < tol


# =============================================================================
# Per-journal balance: sum(debits) == sum(credits)
# =============================================================================

def assert_journals_balanced(
    headers: list[GLJournalHeaderRow], lines: list[GLJournalLineRow],
    *, tol: float = 0.10,
) -> int:
    """Returns count of journals checked. Raises on first imbalance."""
    sums: dict[str, tuple[float, float]] = defaultdict(lambda: (0.0, 0.0))
    for ln in lines:
        d, c = sums[ln.journal_id]
        sums[ln.journal_id] = (d + ln.debit_amount, c + ln.credit_amount)

    for h in headers:
        d, c = sums.get(h.journal_id, (0.0, 0.0))
        if not _approx_zero(d - c, tol):
            raise ValidationError(
                f"unbalanced journal {h.journal_number} ({h.description}): "
                f"DR={d:,.2f} CR={c:,.2f} diff={d - c:,.2f}"
            )
    return len(headers)


# =============================================================================
# Per (period × entity) balance — books must close per accounting rule
# =============================================================================

def assert_period_entity_balanced(
    headers: list[GLJournalHeaderRow], lines: list[GLJournalLineRow],
    *, tol: float = 1.0,
) -> int:
    """For each (period_yyyymm × entity_id), sum(debits)==sum(credits) across all journals.

    Returns count of (period × entity) keys checked.
    """
    header_by_id = {h.journal_id: h for h in headers}
    sums: dict[tuple[int, str], tuple[float, float]] = defaultdict(lambda: (0.0, 0.0))
    for ln in lines:
        h = header_by_id.get(ln.journal_id)
        if h is None:
            continue
        key = (h.period_yyyymm, h.entity_id)
        d, c = sums[key]
        sums[key] = (d + ln.debit_amount, c + ln.credit_amount)

    for key, (d, c) in sums.items():
        if not _approx_zero(d - c, tol):
            raise ValidationError(
                f"unbalanced period × entity {key}: DR={d:,.2f} CR={c:,.2f} diff={d - c:,.2f}"
            )
    return len(sums)


# =============================================================================
# Foreign key checks
# =============================================================================

def collect_fk_violations(
    *,
    entities_list: list[EntityRow],
    coa: list[ChartOfAccountsRow],
    cost_centers: list[CostCenterRow],
    customers: list[CustomerRow],
    vendors: list[VendorRow],
    accounts: list[AccountRow],
    contacts: list[ContactRow],
    opportunities: list[OpportunityRow],
    opp_lines: list[OpportunityLineRow],
    ar_invoices: list[ARInvoiceRow],
    ar_receipts: list[ARReceiptRow],
    ap_invoices: list[APInvoiceRow],
    ap_payments: list[APPaymentRow],
    fixed_assets: list[FixedAssetRow],
    fa_depreciation: list[FADepreciationRow],
    headers: list[GLJournalHeaderRow],
    lines: list[GLJournalLineRow],
) -> list[str]:
    violations: list[str] = []

    entity_ids = {e.entity_id for e in entities_list}
    account_ids = {a.account_id for a in coa}
    cc_ids = {cc.cost_center_id for cc in cost_centers}
    customer_ids = {c.customer_id for c in customers}
    vendor_ids = {v.vendor_id for v in vendors}
    acct_ids = {a.account_id for a in accounts}
    opp_ids = {o.opportunity_id for o in opportunities}
    inv_ids_ar = {i.ar_invoice_id for i in ar_invoices}
    inv_ids_ap = {i.ap_invoice_id for i in ap_invoices}
    fa_ids = {a.fixed_asset_id for a in fixed_assets}
    journal_ids = {h.journal_id for h in headers}

    def _add(label: str, count: int, sample: Any) -> None:
        if count > 0:
            violations.append(f"{label}: {count} (sample: {sample!r})")

    # CRM
    bad = [c for c in contacts if c.account_id not in acct_ids]
    _add("contact.account_id not in account", len(bad), bad[0] if bad else None)
    bad = [o for o in opportunities if o.account_id not in acct_ids]
    _add("opportunity.account_id not in account", len(bad), bad[0] if bad else None)
    bad = [ln for ln in opp_lines if ln.opportunity_id not in opp_ids]
    _add("opportunity_line.opportunity_id not in opportunity", len(bad), bad[0] if bad else None)

    # Customers ↔ Accounts (1:1)
    if customer_ids != acct_ids:
        only_cust = customer_ids - acct_ids
        only_acct = acct_ids - customer_ids
        if only_cust:
            violations.append(f"customer_id not in account_id: {len(only_cust)}")
        if only_acct:
            violations.append(f"account_id not in customer_id: {len(only_acct)}")

    # AR
    bad = [i for i in ar_invoices if i.customer_id not in customer_ids]
    _add("ar_invoice.customer_id not in customer", len(bad), bad[0] if bad else None)
    bad = [r for r in ar_receipts if r.ar_invoice_id not in inv_ids_ar]
    _add("ar_receipt.ar_invoice_id not in ar_invoice", len(bad), bad[0] if bad else None)
    bad = [i for i in ar_invoices if i.opportunity_id and i.opportunity_id not in opp_ids]
    _add("ar_invoice.opportunity_id not in opportunity", len(bad), bad[0] if bad else None)

    # AP
    bad = [i for i in ap_invoices if i.vendor_id not in vendor_ids]
    _add("ap_invoice.vendor_id not in vendor", len(bad), bad[0] if bad else None)
    bad = [i for i in ap_invoices if i.account_id not in account_ids]
    _add("ap_invoice.account_id not in chart_of_accounts", len(bad), bad[0] if bad else None)
    bad = [i for i in ap_invoices if i.cost_center_id not in cc_ids]
    _add("ap_invoice.cost_center_id not in cost_center", len(bad), bad[0] if bad else None)
    bad = [p for p in ap_payments if p.ap_invoice_id not in inv_ids_ap]
    _add("ap_payment.ap_invoice_id not in ap_invoice", len(bad), bad[0] if bad else None)

    # Vendors
    bad = [v for v in vendors if v.entity_id not in entity_ids]
    _add("vendor.entity_id not in entity", len(bad), bad[0] if bad else None)

    # Fixed assets
    bad = [a for a in fixed_assets if a.entity_id not in entity_ids]
    _add("fixed_asset.entity_id not in entity", len(bad), bad[0] if bad else None)
    bad = [a for a in fixed_assets if a.cost_center_id not in cc_ids]
    _add("fixed_asset.cost_center_id not in cost_center", len(bad), bad[0] if bad else None)
    bad = [d for d in fa_depreciation if d.fixed_asset_id not in fa_ids]
    _add("fa_depreciation.fixed_asset_id not in fixed_asset", len(bad), bad[0] if bad else None)

    # GL
    bad = [h for h in headers if h.entity_id not in entity_ids]
    _add("gl_journal_header.entity_id not in entity", len(bad), bad[0] if bad else None)
    bad = [ln for ln in lines if ln.journal_id not in journal_ids]
    _add("gl_journal_line.journal_id not in gl_journal_header", len(bad), bad[0] if bad else None)
    bad = [ln for ln in lines if ln.account_id not in account_ids]
    _add("gl_journal_line.account_id not in chart_of_accounts", len(bad), bad[0] if bad else None)
    bad = [ln for ln in lines if ln.cost_center_id and ln.cost_center_id not in cc_ids]
    _add("gl_journal_line.cost_center_id not in cost_center", len(bad), bad[0] if bad else None)

    return violations


# =============================================================================
# Top-level validator
# =============================================================================

def validate_all(**kwargs: Any) -> ValidationReport:
    """Runs all validations. Raises on first hard violation; returns a report
    summarizing what was checked.
    """
    headers = kwargs["headers"]
    lines = kwargs["lines"]

    # FKs first (cheap and informative)
    fk_violations = collect_fk_violations(**kwargs)
    if fk_violations:
        msg = "FK violations:\n  " + "\n  ".join(fk_violations)
        raise ValidationError(msg)

    journals_checked = assert_journals_balanced(headers, lines)
    pe_checked = assert_period_entity_balanced(headers, lines)

    return ValidationReport(
        journals_checked=journals_checked,
        lines_checked=len(lines),
        period_entity_balances_checked=pe_checked,
        fk_violations=[],
        balance_violations=[],
    )
