"""Single source of truth for ACME generator parameters.

All ratios and structural choices documented here are calibrated against
Salesforce Inc.'s (NYSE: CRM) most recent 10-K disclosure. Update Salesforce
filing reference below when re-tuning.

Reference filing: Salesforce Inc. 10-K for fiscal year ended Jan 31, 2025
(FY25) — segment, geography, and opex ratios drawn from MD&A and Note 16.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date


# =============================================================================
# Fiscal calendar
# =============================================================================

# Salesforce-aligned fiscal year: Feb 1 → Jan 31.
# Fiscal year is named after the calendar year it ends in.
#   FY25 = Feb 1, 2024 → Jan 31, 2025.
FISCAL_YEAR_END_MONTH = 1   # January
FISCAL_YEAR_END_DAY = 31


def fy_start(fiscal_year: int) -> date:
    """First day of fiscal year. FY25 starts Feb 1, 2024."""
    return date(fiscal_year - 1, 2, 1)


def fy_end(fiscal_year: int) -> date:
    """Last day of fiscal year. FY25 ends Jan 31, 2025."""
    return date(fiscal_year, 1, 31)


def period_yyyymm(d: date) -> int:
    """Calendar yyyymm key (matches calendar month, not fiscal month)."""
    return d.year * 100 + d.month


def fiscal_quarter(d: date) -> int:
    """Fiscal quarter (1-4) for a date in Salesforce-style fiscal calendar.

    Q1: Feb-Apr, Q2: May-Jul, Q3: Aug-Oct, Q4: Nov-Jan.
    """
    m = d.month
    if 2 <= m <= 4:
        return 1
    if 5 <= m <= 7:
        return 2
    if 8 <= m <= 10:
        return 3
    return 4  # 11, 12, 1


# =============================================================================
# Top-level company shape
# =============================================================================

# Annual revenue trajectory (USD). Three years of history for the warehouse.
# Smaller-than-Salesforce scale (~$2B) so ACME feels like a mid-cap SaaS.
REVENUE_BY_FY: dict[int, float] = {
    2023: 1_600_000_000,
    2024: 2_000_000_000,
    2025: 2_300_000_000,
}

# Quick-mode shrinks the dataset for fast iteration.
# Volume scales linearly with this factor; only generator counts apply,
# revenue ratios stay the same.
QUICK_MODE_SCALE = 0.10


# =============================================================================
# Segments — mirror Salesforce's four reported segments
# =============================================================================

@dataclass(frozen=True, slots=True)
class Segment:
    code: str
    display_name: str
    weight: float          # share of total revenue
    gross_margin: float    # GM at the segment level (Sales/Service heaviest)


SEGMENTS: list[Segment] = [
    Segment("sales_cloud",         "Sales Cloud",         0.35, 0.78),
    Segment("service_cloud",       "Service Cloud",       0.25, 0.77),
    Segment("platform",            "Platform & Other",    0.25, 0.74),
    Segment("marketing_commerce",  "Marketing & Commerce", 0.15, 0.70),
]


# =============================================================================
# Geography / entity split
# =============================================================================

# Modeled after Salesforce's geographic disclosure: Americas dominant,
# EMEA strong, APAC growing. ACME has 3 legal entities matching geos.
@dataclass(frozen=True, slots=True)
class Entity:
    entity_id: str             # legal-entity code, used as PK
    entity_name: str
    geo_weight: float          # share of total revenue
    parent_entity_id: str | None


ENTITIES: list[Entity] = [
    Entity("US",   "ACME US Inc.",        0.67, None),
    Entity("EMEA", "ACME EMEA Ltd.",      0.22, "US"),
    Entity("APAC", "ACME APAC Pte. Ltd.", 0.11, "US"),
]


# =============================================================================
# Customer / segment-tier shape
# =============================================================================

# Customer tier mix shapes ACV bands and churn behavior.
@dataclass(frozen=True, slots=True)
class SegmentTier:
    code: str
    customer_share: float      # share of customer count
    revenue_share: float       # share of revenue (enterprise carries more)
    median_acv: float          # median annual contract value
    annual_churn: float        # gross logo churn


SEGMENT_TIERS: list[SegmentTier] = [
    SegmentTier("enterprise",  0.10, 0.55,  450_000, 0.05),
    SegmentTier("commercial",  0.30, 0.30,   75_000, 0.08),
    SegmentTier("smb",         0.60, 0.15,   12_000, 0.18),
]

# Active customer count at end of FY25.
ACTIVE_CUSTOMERS_FY25_EOY = 8_000

# Customer name pool (will be mixed with Faker-generated names).
TOP_INDUSTRIES = [
    "Software",
    "Financial Services",
    "Healthcare",
    "Retail",
    "Manufacturing",
    "Telecommunications",
    "Media",
    "Education",
    "Energy",
    "Public Sector",
]

# Geographic distribution of customers (matches entity geo weights but with
# more granularity for billing_country).
COUNTRY_WEIGHTS_BY_ENTITY: dict[str, dict[str, float]] = {
    "US":   {"US": 0.85, "CA": 0.12, "MX": 0.03},
    "EMEA": {"GB": 0.30, "DE": 0.20, "FR": 0.15, "NL": 0.10, "IE": 0.08,
             "ES": 0.07, "IT": 0.05, "SE": 0.03, "AE": 0.02},
    "APAC": {"AU": 0.30, "JP": 0.25, "SG": 0.15, "IN": 0.15, "KR": 0.08, "HK": 0.07},
}


# =============================================================================
# Headcount shape (for cost-center sizing and payroll generation)
# =============================================================================

# FY25 EOY headcount.
TOTAL_HEADCOUNT_FY25 = 6_500

# Function-level headcount distribution (sum to 1.0).
HEADCOUNT_BY_FUNCTION: dict[str, float] = {
    "sales":             0.32,
    "marketing":         0.07,
    "rd":                0.30,
    "customer_success":  0.16,
    "ga":                0.10,
    "it":                0.05,
}

# Fully-loaded annual cost per FTE by function (USD, FY25).
# Includes salary, benefits (1.25x), payroll taxes, and stock-based comp at
# fully diluted run-rate (~15% of cash comp).
ANNUAL_FTE_COST_BY_FUNCTION: dict[str, float] = {
    "sales":             280_000,
    "marketing":         210_000,
    "rd":                340_000,
    "customer_success":  175_000,
    "ga":                250_000,
    "it":                240_000,
}

# Each function maintains presence in each entity at these weights.
# Sales is mostly in US, Marketing is mostly US, R&D follows global engineering.
FUNCTION_ENTITY_WEIGHTS: dict[str, dict[str, float]] = {
    "sales":             {"US": 0.65, "EMEA": 0.22, "APAC": 0.13},
    "marketing":         {"US": 0.80, "EMEA": 0.13, "APAC": 0.07},
    "rd":                {"US": 0.55, "EMEA": 0.20, "APAC": 0.25},
    "customer_success":  {"US": 0.60, "EMEA": 0.25, "APAC": 0.15},
    "ga":                {"US": 0.85, "EMEA": 0.10, "APAC": 0.05},
    "it":                {"US": 0.70, "EMEA": 0.20, "APAC": 0.10},
}


# =============================================================================
# Opex ratios (% of revenue) — calibrated to Salesforce 10-K
# =============================================================================

@dataclass(frozen=True, slots=True)
class OpexRatios:
    cogs_pct: float
    sm_pct: float          # sales & marketing
    rd_pct: float          # research & development
    ga_pct: float          # general & administrative
    other_income_net_pct: float
    effective_tax_rate: float


# Salesforce-shaped: gross margin ~75%, OpM ~13% (ACME has slightly lower
# operating margin to leave room for variance analysis later).
OPEX_RATIOS: OpexRatios = OpexRatios(
    cogs_pct=0.25,
    sm_pct=0.42,
    rd_pct=0.15,
    ga_pct=0.08,
    other_income_net_pct=-0.005,  # net interest income (cash > debt)
    effective_tax_rate=0.23,
)

# Note: cogs + sm + rd + ga = 0.90 → operating margin ~10%.
# Remainder of GM (75% - 25% = 50%? wait...). Verify with checker:
#   revenue 1.00, cogs 0.25 → gross margin 0.75
#   opex (sm+rd+ga) = 0.42 + 0.15 + 0.08 = 0.65
#   operating income = 0.75 - 0.65 = 0.10  (10% OpM)


# =============================================================================
# Working capital
# =============================================================================

DSO_DAYS_TARGET = 45      # Days Sales Outstanding (AR)
DPO_DAYS_TARGET = 38      # Days Payable Outstanding (AP)
DEFERRED_REVENUE_TURNS = 4.5  # Annual revenue / avg deferred revenue (SaaS norm)


# =============================================================================
# Subscription / billing mechanics
# =============================================================================

# Share of customers on each billing cadence.
BILLING_CADENCE: dict[str, float] = {
    "annual":   0.40,   # billed once at start of contract
    "quarterly": 0.20,
    "monthly":  0.40,
}

# Contract term distribution (months).
CONTRACT_TERM_MONTHS_DIST: dict[int, float] = {
    12: 0.55,
    24: 0.20,
    36: 0.20,
    1:  0.05,   # month-to-month
}


# =============================================================================
# Fixed assets
# =============================================================================

@dataclass(frozen=True, slots=True)
class AssetClass:
    code: str
    label: str
    useful_life_months: int
    pct_of_capex: float        # share of annual capex going to this class
    cost_per_unit_lo: float
    cost_per_unit_hi: float
    cost_center_function: str  # which function "owns" this class


ASSET_CLASSES: list[AssetClass] = [
    AssetClass("laptop",                 "Employee laptop",         36, 0.30,    1_500,    3_500, "rd"),
    AssetClass("server",                 "Server / hardware",       60, 0.25,   25_000,  150_000, "it"),
    AssetClass("office_furniture",       "Office furniture",        84, 0.10,    5_000,   30_000, "ga"),
    AssetClass("leasehold_improvement",  "Leasehold improvement",  120, 0.20,   50_000,  500_000, "ga"),
    AssetClass("software",               "Capitalized software",    36, 0.15,   25_000,  250_000, "rd"),
]

# Annual capex as % of revenue (Salesforce ~3-4%).
CAPEX_PCT_OF_REVENUE = 0.035


# =============================================================================
# Seasonality (fiscal-quarter weighting of bookings)
# =============================================================================

# Salesforce's Q4 is the heaviest bookings quarter. Q1 typically softest.
BOOKINGS_FQ_SEASONALITY: dict[int, float] = {
    1: 0.20,   # Feb-Apr
    2: 0.24,   # May-Jul
    3: 0.24,   # Aug-Oct
    4: 0.32,   # Nov-Jan (year-end push)
}


# =============================================================================
# Anomalies (Phase 2E will inject these; documented here for traceability)
# =============================================================================

@dataclass(frozen=True, slots=True)
class AnomalySpec:
    code: str
    description: str
    period_yyyymm: int | None   # None means a range
    parameters: dict[str, float | int | str] = field(default_factory=dict)


SEEDED_ANOMALIES: list[AnomalySpec] = [
    AnomalySpec(
        code="emea_sm_q3_overspend",
        description="EMEA S&M overspend in Q3 FY25 driven by marketing programs",
        period_yyyymm=None,  # 202409 + 202410
        parameters={"entity_id": "EMEA", "extra_amount": 8_000_000},
    ),
    AnomalySpec(
        code="aged_ar_enterprise",
        description="One enterprise customer's $2.4M AR invoice unpaid >120 days",
        period_yyyymm=202405,
        parameters={"amount": 2_400_000},
    ),
    AnomalySpec(
        code="server_disposal_loss",
        description="Server cluster disposed Aug 2024 with $300K loss",
        period_yyyymm=202408,
        parameters={"loss_amount": 300_000},
    ),
    AnomalySpec(
        code="stalled_pipeline",
        description="3 enterprise opps totaling $14M stalled in negotiation >120 days",
        period_yyyymm=None,
        parameters={"opp_count": 3, "total_acv": 14_000_000},
    ),
    AnomalySpec(
        code="forecast_bias_sm",
        description="Forecast under-calls S&M actuals by 5-8% in H2 FY25",
        period_yyyymm=None,
        parameters={"bias_pct": -0.06, "fiscal_year": 2025, "fiscal_half": 2},
    ),
]


# =============================================================================
# Generation modes
# =============================================================================

@dataclass(frozen=True, slots=True)
class GenerationMode:
    name: str
    customer_scale: float   # vs ACTIVE_CUSTOMERS_FY25_EOY
    description: str


MODE_QUICK = GenerationMode(
    name="quick",
    customer_scale=QUICK_MODE_SCALE,
    description="~800 customers; fast iteration during development (~30 sec).",
)
MODE_FULL = GenerationMode(
    name="full",
    customer_scale=1.0,
    description=f"~{ACTIVE_CUSTOMERS_FY25_EOY} customers; production data set (~3 min).",
)


# =============================================================================
# Default seed
# =============================================================================

DEFAULT_SEED = 20_260_501
