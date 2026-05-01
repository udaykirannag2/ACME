"""Typed row schemas for every ACME table.

These dataclasses are the single source of truth for column names and types.
Each module's generator returns a list[Row] of one of these types, and
output.py converts them to CSV (for Postgres COPY) or Parquet (for S3).

Convention: all monetary fields are Decimal-like floats with 2-decimal precision
(actual rounding happens in the writer). All IDs are str (UUIDs as strings to
keep CSV/Parquet portable).
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime


# =============================================================================
# ERP — reference / dimension
# =============================================================================

@dataclass(slots=True)
class EntityRow:
    entity_id: str
    entity_name: str
    functional_currency: str
    parent_entity_id: str | None


@dataclass(slots=True)
class ChartOfAccountsRow:
    account_id: str
    account_number: str
    account_name: str
    account_type: str       # asset|liability|equity|revenue|expense
    pnl_rollup: str
    segment: str | None
    is_active: bool


@dataclass(slots=True)
class CostCenterRow:
    cost_center_id: str
    cost_center_name: str
    function: str
    entity_id: str


@dataclass(slots=True)
class VendorRow:
    vendor_id: str
    vendor_name: str
    vendor_category: str
    payment_terms: str       # NET30|NET45|NET60
    entity_id: str
    created_at: datetime


@dataclass(slots=True)
class CustomerRow:
    customer_id: str
    customer_name: str
    billing_country: str
    segment_tier: str        # enterprise|commercial|smb
    created_at: datetime


# =============================================================================
# ERP — General Ledger
# =============================================================================

@dataclass(slots=True)
class GLJournalHeaderRow:
    journal_id: str
    journal_number: str
    posting_date: date
    period_yyyymm: int
    entity_id: str
    journal_type: str        # manual|auto_revrec|auto_dep|auto_ar|auto_ap|intercompany
    description: str
    created_by: str
    created_at: datetime


@dataclass(slots=True)
class GLJournalLineRow:
    journal_line_id: str
    journal_id: str
    line_number: int
    account_id: str
    cost_center_id: str | None
    debit_amount: float
    credit_amount: float
    memo: str
    reference_doc_type: str | None
    reference_doc_id: str | None


# =============================================================================
# ERP — Accounts Payable
# =============================================================================

@dataclass(slots=True)
class APInvoiceRow:
    ap_invoice_id: str
    vendor_id: str
    invoice_number: str
    invoice_date: date
    due_date: date
    amount: float
    account_id: str
    cost_center_id: str
    status: str             # open|partial|paid|voided
    created_at: datetime


@dataclass(slots=True)
class APPaymentRow:
    ap_payment_id: str
    ap_invoice_id: str
    payment_date: date
    amount: float


# =============================================================================
# ERP — Accounts Receivable
# =============================================================================

@dataclass(slots=True)
class ARInvoiceRow:
    ar_invoice_id: str
    customer_id: str
    invoice_number: str
    invoice_date: date
    due_date: date
    amount: float
    service_period_start: date
    service_period_end: date
    segment: str
    status: str             # open|partial|paid|voided
    opportunity_id: str | None
    created_at: datetime


@dataclass(slots=True)
class ARReceiptRow:
    ar_receipt_id: str
    ar_invoice_id: str
    receipt_date: date
    amount: float


# =============================================================================
# ERP — Fixed Assets
# =============================================================================

@dataclass(slots=True)
class FixedAssetRow:
    fixed_asset_id: str
    asset_tag: str
    asset_class: str
    acquisition_date: date
    acquisition_cost: float
    useful_life_months: int
    salvage_value: float
    depreciation_method: str
    entity_id: str
    cost_center_id: str
    disposal_date: date | None
    disposal_proceeds: float | None
    status: str             # active|disposed|fully_depreciated


@dataclass(slots=True)
class FADepreciationRow:
    fa_depreciation_id: str
    fixed_asset_id: str
    period_yyyymm: int
    depreciation_amount: float
    accumulated_depreciation: float
    net_book_value: float


# =============================================================================
# EPM
# =============================================================================

@dataclass(slots=True)
class BudgetVersionRow:
    budget_version_id: str
    version_name: str
    version_type: str        # budget
    fiscal_year: int
    created_date: date
    is_current: bool


@dataclass(slots=True)
class ForecastVersionRow:
    forecast_version_id: str
    version_name: str
    version_type: str        # forecast
    fiscal_year: int
    created_date: date
    is_current: bool


@dataclass(slots=True)
class PlanLineRow:
    plan_line_id: str
    version_id: str
    version_type: str
    account_id: str
    cost_center_id: str
    entity_id: str
    period_yyyymm: int
    amount: float
    segment: str | None


@dataclass(slots=True)
class HeadcountPlanRow:
    headcount_plan_id: str
    version_id: str
    cost_center_id: str
    period_yyyymm: int
    planned_headcount: float
    planned_salary_cost: float


@dataclass(slots=True)
class DriverAssumptionRow:
    driver_assumption_id: str
    version_id: str
    driver_name: str
    period_yyyymm: int
    value: float
    segment: str | None


# =============================================================================
# CRM
# =============================================================================

@dataclass(slots=True)
class AccountRow:
    account_id: str
    account_name: str
    industry: str
    billing_country: str
    segment_tier: str
    owner_name: str
    created_date: date


@dataclass(slots=True)
class ContactRow:
    contact_id: str
    account_id: str
    email: str
    title: str


@dataclass(slots=True)
class OpportunityRow:
    opportunity_id: str
    account_id: str
    name: str
    stage: str               # prospecting|qualification|proposal|negotiation|closed_won|closed_lost
    amount: float
    close_date: date
    probability_pct: int
    segment: str
    owner_name: str
    created_date: date
    modified_date: date


@dataclass(slots=True)
class OpportunityLineRow:
    opportunity_line_id: str
    opportunity_id: str
    product_code: str
    segment: str
    acv_amount: float
    seats: int


@dataclass(slots=True)
class PipelineSnapshotRow:
    snapshot_date: date
    opportunity_id: str
    stage: str
    amount: float
    close_date: date
    probability_pct: int


@dataclass(slots=True)
class ARRMovementRow:
    arr_movement_id: str
    period_yyyymm: int
    account_id: str
    segment: str
    movement_type: str       # new|expansion|contraction|churn|renewal
    arr_change: float
    starting_arr: float
    ending_arr: float
