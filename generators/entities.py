"""Reference-data generators: legal entities, chart of accounts, cost centers.

These are the deterministic spine of ACME — same on every run, no randomness.
The only "random" thing is the ordering of cost centers (we iterate functions
× entities) which is also deterministic.

Outputs are returned as lists of typed rows; the caller writes them to disk
via output.py.
"""
from __future__ import annotations

from datetime import datetime, timezone

from . import config as cfg
from .types import (
    ChartOfAccountsRow,
    CostCenterRow,
    EntityRow,
)


# =============================================================================
# Legal entities
# =============================================================================

def gen_entities() -> list[EntityRow]:
    return [
        EntityRow(
            entity_id=e.entity_id,
            entity_name=e.entity_name,
            functional_currency="USD",
            parent_entity_id=e.parent_entity_id,
        )
        for e in cfg.ENTITIES
    ]


# =============================================================================
# Chart of accounts
# =============================================================================

def gen_chart_of_accounts() -> list[ChartOfAccountsRow]:
    """Build the ~140-account chart of accounts.

    Structure:
      1xxx — Assets
      2xxx — Liabilities
      3xxx — Equity
      4xxx — Revenue (one block per segment)
      5xxx — COGS
      6xxx — S&M
      7xxx — R&D
      8xxx — G&A
      9xxx — Other / non-operating / tax

    pnl_rollup values match docs/data-dictionary.md and drive `dim_account`
    in the warehouse layer.
    """
    rows: list[ChartOfAccountsRow] = []

    def add(num: str, name: str, atype: str, rollup: str, segment: str | None = None) -> None:
        # account_id format: <number>-<short-slug>
        slug = "-".join(name.upper().split()[:3])
        # Strip non-alphanumeric (keep dashes), collapse repeats, trim edges
        slug = "".join(c for c in slug if c.isalnum() or c == "-")
        while "--" in slug:
            slug = slug.replace("--", "-")
        slug = slug.strip("-")[:24]
        rows.append(
            ChartOfAccountsRow(
                account_id=f"{num}-{slug}",
                account_number=num,
                account_name=name,
                account_type=atype,
                pnl_rollup=rollup,
                segment=segment,
                is_active=True,
            )
        )

    # ----- 1xxx Assets -----
    add("1010", "Cash and Cash Equivalents",        "asset", "balance_sheet")
    add("1020", "Short-term Investments",           "asset", "balance_sheet")
    add("1100", "Accounts Receivable - Trade",      "asset", "balance_sheet")
    add("1110", "Allowance for Doubtful Accounts",  "asset", "balance_sheet")
    add("1200", "Prepaid Expenses",                 "asset", "balance_sheet")
    add("1210", "Deferred Commissions",             "asset", "balance_sheet")
    add("1300", "Fixed Assets - Cost",              "asset", "balance_sheet")
    add("1310", "Accumulated Depreciation",         "asset", "balance_sheet")
    add("1400", "Capitalized Software",             "asset", "balance_sheet")
    add("1500", "Goodwill",                         "asset", "balance_sheet")
    add("1510", "Intangibles - Net",                "asset", "balance_sheet")
    add("1600", "Operating Lease ROU Assets",       "asset", "balance_sheet")
    add("1700", "Deferred Tax Asset",               "asset", "balance_sheet")
    add("1800", "Intercompany Receivable",          "asset", "balance_sheet")

    # ----- 2xxx Liabilities -----
    add("2010", "Accounts Payable - Trade",         "liability", "balance_sheet")
    add("2020", "Accrued Compensation",             "liability", "balance_sheet")
    add("2030", "Accrued Expenses",                 "liability", "balance_sheet")
    add("2040", "Accrued Marketing",                "liability", "balance_sheet")
    add("2050", "Income Tax Payable",               "liability", "balance_sheet")
    add("2100", "Deferred Revenue - Current",       "liability", "balance_sheet")
    add("2110", "Deferred Revenue - Long Term",     "liability", "balance_sheet")
    add("2200", "Operating Lease Liability",        "liability", "balance_sheet")
    add("2300", "Long-term Debt",                   "liability", "balance_sheet")
    add("2400", "Intercompany Payable",             "liability", "balance_sheet")

    # ----- 3xxx Equity -----
    add("3010", "Common Stock",                     "equity", "balance_sheet")
    add("3020", "Additional Paid-in Capital",       "equity", "balance_sheet")
    add("3030", "Retained Earnings",                "equity", "balance_sheet")
    add("3040", "Accumulated OCI",                  "equity", "balance_sheet")

    # ----- 4xxx Revenue (per segment, two channels each) -----
    revenue_channels = ["Subscription", "Professional Services"]
    rev_num = 4000
    for seg in cfg.SEGMENTS:
        for chan in revenue_channels:
            rev_num += 10
            add(
                f"{rev_num}",
                f"{chan} Revenue - {seg.display_name}",
                "revenue",
                "revenue",
                segment=seg.code,
            )

    # ----- 5xxx COGS (per segment) -----
    cogs_num = 5000
    for seg in cfg.SEGMENTS:
        cogs_num += 10
        add(f"{cogs_num}", f"Hosting & Infrastructure - {seg.display_name}",
            "expense", "cogs", segment=seg.code)
        cogs_num += 10
        add(f"{cogs_num}", f"Customer Success Cost - {seg.display_name}",
            "expense", "cogs", segment=seg.code)
        cogs_num += 10
        add(f"{cogs_num}", f"Professional Services Cost - {seg.display_name}",
            "expense", "cogs", segment=seg.code)
    cogs_num += 10
    add(f"{cogs_num}", "Depreciation - COGS",                       "expense", "cogs")

    # ----- 6xxx S&M -----
    add("6010", "Sales Salaries and Benefits",       "expense", "sm")
    add("6020", "Sales Commissions",                 "expense", "sm")
    add("6030", "Sales Travel and Entertainment",    "expense", "sm")
    add("6040", "Sales Tooling",                     "expense", "sm")
    add("6110", "Marketing Salaries and Benefits",   "expense", "sm")
    add("6120", "Marketing Programs - Digital",      "expense", "sm")
    add("6130", "Marketing Programs - Events",       "expense", "sm")
    add("6140", "Marketing Programs - Branding",     "expense", "sm")
    add("6150", "Marketing Tooling",                 "expense", "sm")
    add("6200", "Stock-Based Compensation - S&M",    "expense", "sm")
    add("6210", "Depreciation - S&M",                "expense", "sm")

    # ----- 7xxx R&D -----
    add("7010", "Engineering Salaries and Benefits",  "expense", "rd")
    add("7020", "Product Salaries and Benefits",      "expense", "rd")
    add("7030", "Cloud Infrastructure - R&D",         "expense", "rd")
    add("7040", "R&D Software and Tooling",           "expense", "rd")
    add("7050", "R&D Contractors",                    "expense", "rd")
    add("7200", "Stock-Based Compensation - R&D",     "expense", "rd")
    add("7210", "Depreciation - R&D",                 "expense", "rd")

    # ----- 8xxx G&A -----
    add("8010", "Executive Salaries and Benefits",    "expense", "ga")
    add("8020", "Finance Salaries and Benefits",      "expense", "ga")
    add("8030", "HR Salaries and Benefits",           "expense", "ga")
    add("8040", "Legal Salaries and Benefits",        "expense", "ga")
    add("8050", "IT Salaries and Benefits",           "expense", "ga")
    add("8110", "Legal and Professional Fees",        "expense", "ga")
    add("8120", "Audit and Tax Fees",                 "expense", "ga")
    add("8130", "Office and Facilities",              "expense", "ga")
    add("8140", "Insurance",                          "expense", "ga")
    add("8150", "G&A Software and Tooling",           "expense", "ga")
    add("8200", "Stock-Based Compensation - G&A",     "expense", "ga")
    add("8210", "Depreciation - G&A",                 "expense", "ga")

    # ----- 9xxx Other / non-operating / tax -----
    add("9010", "Interest Income",                    "revenue", "other_income")
    add("9020", "Interest Expense",                   "expense", "other_income")
    add("9030", "Other Income",                       "revenue", "other_income")
    add("9040", "Loss on Disposal of Fixed Assets",   "expense", "other_income")
    add("9050", "Foreign Exchange Gain/Loss",         "expense", "other_income")
    add("9900", "Income Tax Expense - Current",       "expense", "tax")
    add("9910", "Income Tax Expense - Deferred",      "expense", "tax")

    return rows


# =============================================================================
# Cost centers
# =============================================================================

def gen_cost_centers() -> list[CostCenterRow]:
    """One cost center per (function, entity) pair.

    Sales has sub-centers per region for variance analysis. Other functions
    keep one cost center per entity. Total ~25 cost centers.
    """
    rows: list[CostCenterRow] = []

    # Sales gets sub-centers (Enterprise / Commercial / SMB) per entity to
    # mirror real-world sales org structures and enable segment-level RCA.
    sales_subteams = ["enterprise", "commercial", "smb"]
    sales_display = {"enterprise": "Enterprise", "commercial": "Commercial", "smb": "SMB"}
    for entity in cfg.ENTITIES:
        for sub in sales_subteams:
            cc_id = f"CC-SALES-{sub.upper()}-{entity.entity_id}"
            cc_name = f"Sales - {sales_display[sub]} - {entity.entity_name}"
            rows.append(CostCenterRow(
                cost_center_id=cc_id,
                cost_center_name=cc_name,
                function="sales",
                entity_id=entity.entity_id,
            ))

    # Marketing, R&D, Customer Success, G&A, IT — one CC per (function, entity)
    other_functions = ["marketing", "rd", "customer_success", "ga", "it"]
    for fn in other_functions:
        for entity in cfg.ENTITIES:
            cc_id = f"CC-{fn.upper().replace('_', '-')}-{entity.entity_id}"
            cc_name = f"{fn.replace('_', ' ').title()} - {entity.entity_name}"
            rows.append(CostCenterRow(
                cost_center_id=cc_id,
                cost_center_name=cc_name,
                function=fn,
                entity_id=entity.entity_id,
            ))

    return rows


# =============================================================================
# Sanity checks (cheap; called from validate.py too)
# =============================================================================

def assert_reference_invariants(
    entities: list[EntityRow],
    coa: list[ChartOfAccountsRow],
    cost_centers: list[CostCenterRow],
) -> None:
    # Entities: exactly 3, US is parent of others
    assert len(entities) == 3, f"expected 3 entities, got {len(entities)}"
    parents = {e.entity_id: e.parent_entity_id for e in entities}
    assert parents["US"] is None, "US should be top of consolidation"
    assert parents["EMEA"] == "US"
    assert parents["APAC"] == "US"

    # COA: every account_id unique; pnl_rollup values are from the allowed set
    ids = [a.account_id for a in coa]
    assert len(set(ids)) == len(ids), "duplicate account_id in COA"
    allowed_rollups = {"balance_sheet", "revenue", "cogs", "sm", "rd",
                       "ga", "other_income", "tax"}
    bad = [a.account_id for a in coa if a.pnl_rollup not in allowed_rollups]
    assert not bad, f"unknown pnl_rollup: {bad[:5]}"

    # Cost centers: every entity has at least 6 CCs (sales x3 + other x5 = 8)
    cc_by_entity: dict[str, int] = {}
    for cc in cost_centers:
        cc_by_entity[cc.entity_id] = cc_by_entity.get(cc.entity_id, 0) + 1
    for entity_id in ("US", "EMEA", "APAC"):
        assert cc_by_entity.get(entity_id, 0) >= 6, \
            f"{entity_id} has too few cost centers: {cc_by_entity.get(entity_id, 0)}"

    # Functions covered: sales/marketing/rd/customer_success/ga/it
    functions = {cc.function for cc in cost_centers}
    expected_fns = {"sales", "marketing", "rd", "customer_success", "ga", "it"}
    assert functions == expected_fns, \
        f"unexpected functions: {functions - expected_fns} | missing: {expected_fns - functions}"


# Touch datetime to silence lint about unused import (used as type annotation upstream)
_ = datetime  # noqa: F841
_ = timezone  # noqa: F841
