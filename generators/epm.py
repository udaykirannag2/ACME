"""Phase 2E — EPM (Anaplan/Hyperion-style) budget + forecast generation.

Versions emitted:
  - FY23 Budget v1   (created Dec 2021, before FY23)
  - FY24 Budget v1   (created Dec 2022, before FY24)
  - FY25 Budget v1   (created Dec 2023, before FY25)
  - FY25 Q1 Reforecast (created May 2024, mid-FY25)
  - FY25 Q3 Reforecast (created Nov 2024, late FY25)

Plan structure:
  - Revenue plan_lines: per (period × entity × segment), one per subscription channel
  - Opex plan_lines:    per (period × entity × cost_center × account)
  - Headcount plan:     per (period × cost_center)
  - Driver assumptions: per (period × driver_name, optionally segment)

Methodology:
  Plans are derived from cfg targets with Gaussian noise. Budget noise is wider
  (±10%) since budgets are set 6-12 months ahead. Reforecast noise is narrower
  (±3-5%). Phase 2E.anomalies will inject a forecast bias on S&M H2 to give
  the agent a real "forecast vs actuals" eval case.
"""
from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import date

import numpy as np
from dateutil.relativedelta import relativedelta

from . import config as cfg
from .types import (
    BudgetVersionRow,
    ChartOfAccountsRow,
    CostCenterRow,
    DriverAssumptionRow,
    EntityRow,
    ForecastVersionRow,
    HeadcountPlanRow,
    PlanLineRow,
)


# =============================================================================
# Noise levels
# =============================================================================

BUDGET_NOISE_SIGMA = 0.10           # ±10% one-sigma
FORECAST_Q1_NOISE_SIGMA = 0.05
FORECAST_Q3_NOISE_SIGMA = 0.03


# =============================================================================
# Public artifacts
# =============================================================================

@dataclass(slots=True)
class EPMArtifacts:
    budget_versions: list[BudgetVersionRow]
    forecast_versions: list[ForecastVersionRow]
    plan_lines: list[PlanLineRow]
    headcount_plans: list[HeadcountPlanRow]
    driver_assumptions: list[DriverAssumptionRow]


# =============================================================================
# Helpers
# =============================================================================

def _round_money(x: float) -> float:
    return round(x, 2)


def _periods_in_fy(fy: int) -> list[int]:
    out = []
    cursor = cfg.fy_start(fy)
    while cursor <= cfg.fy_end(fy):
        out.append(cursor.year * 100 + cursor.month)
        cursor = cursor + relativedelta(months=1)
    return out


def _seasonality_weight(period: int) -> float:
    """Quarter-level seasonality applied to monthly revenue."""
    m = period % 100
    quarter_weight = cfg.BOOKINGS_FQ_SEASONALITY[
        cfg.fiscal_quarter(date(period // 100, m, 15))
    ]
    return quarter_weight / 0.25     # normalize so avg = 1.0


def _aid(coa: list[ChartOfAccountsRow], account_name: str) -> str | None:
    for a in coa:
        if a.account_name == account_name:
            return a.account_id
    return None


# =============================================================================
# Step 1 — Build version rows
# =============================================================================

def _build_versions(
    fiscal_years: list[int],
) -> tuple[list[BudgetVersionRow], list[ForecastVersionRow], dict[str, str]]:
    """Returns budget_versions, forecast_versions, and a lookup map
    version_key -> version_id for easy reference.
    """
    budgets: list[BudgetVersionRow] = []
    forecasts: list[ForecastVersionRow] = []
    lookup: dict[str, str] = {}

    for fy in fiscal_years:
        budget_id = str(uuid.uuid4())
        budgets.append(BudgetVersionRow(
            budget_version_id=budget_id,
            version_name=f"FY{fy} Budget v1",
            version_type="budget",
            fiscal_year=fy,
            created_date=date(fy - 1, 12, 1),    # set 2 months before FY start
            is_current=(fy == max(fiscal_years)),
        ))
        lookup[f"budget_fy{fy}"] = budget_id

    # Reforecasts only for the latest FY
    if 2025 in fiscal_years:
        q1_id = str(uuid.uuid4())
        forecasts.append(ForecastVersionRow(
            forecast_version_id=q1_id,
            version_name="FY25 Q1 Reforecast",
            version_type="forecast",
            fiscal_year=2025,
            created_date=date(2024, 5, 15),
            is_current=False,
        ))
        lookup["forecast_fy25_q1"] = q1_id

        q3_id = str(uuid.uuid4())
        forecasts.append(ForecastVersionRow(
            forecast_version_id=q3_id,
            version_name="FY25 Q3 Reforecast",
            version_type="forecast",
            fiscal_year=2025,
            created_date=date(2024, 11, 15),
            is_current=True,
        ))
        lookup["forecast_fy25_q3"] = q3_id

    return budgets, forecasts, lookup


# =============================================================================
# Step 2 — Plan lines
# =============================================================================

def _generate_revenue_plan_lines(
    rng: np.random.Generator,
    version_id: str,
    version_type: str,
    fy: int,
    sigma: float,
    coa: list[ChartOfAccountsRow],
    entities_list: list[EntityRow],
    scale: float,
) -> list[PlanLineRow]:
    """Revenue plans by (period × entity × segment). Two channels per segment
    (Subscription + Professional Services); we only plan Subscription here.
    """
    out: list[PlanLineRow] = []
    annual_revenue = cfg.REVENUE_BY_FY.get(fy, 0.0) * scale * 0.88   # subscription portion
    monthly_avg = annual_revenue / 12.0

    for seg in cfg.SEGMENTS:
        rev_aid = _aid(coa, f"Subscription Revenue - {seg.display_name}")
        if rev_aid is None:
            continue
        seg_total = monthly_avg * 12.0 * seg.weight
        for entity in entities_list:
            ent_share = entity.geo_weight if hasattr(entity, "geo_weight") else next(
                e.geo_weight for e in cfg.ENTITIES if e.entity_id == entity.entity_id
            )
            ent_total = seg_total * ent_share
            for period in _periods_in_fy(fy):
                # Seasonality + noise
                seasonal = _seasonality_weight(period)
                noise = float(np.exp(rng.normal(0, sigma)))
                amount = (ent_total / 12.0) * seasonal * noise
                out.append(PlanLineRow(
                    plan_line_id=str(uuid.uuid4()),
                    version_id=version_id,
                    version_type=version_type,
                    account_id=rev_aid,
                    cost_center_id=None,
                    entity_id=entity.entity_id,
                    period_yyyymm=period,
                    amount=_round_money(amount),
                    segment=seg.code,
                ))
    return out


# Distribution of opex by rollup × cost-center function (matches AP module logic)
_OPEX_PLAN_DISTRIBUTION: dict[str, dict[str, float]] = {
    # rollup -> function -> share of rollup total
    "cogs": {"customer_success": 0.40, "it": 0.60},
    "sm":   {"sales": 0.30, "marketing": 0.70},
    "rd":   {"rd": 1.00},
    "ga":   {"ga": 1.00},
}

# Account names for opex plan lines, by (rollup, function). We pick one representative
# account per cell to keep plan_line counts manageable.
_OPEX_PLAN_ACCOUNTS: dict[tuple[str, str], list[str]] = {
    ("cogs", "customer_success"): [
        "Hosting & Infrastructure - Sales Cloud",
        "Customer Success Cost - Sales Cloud",
    ],
    ("cogs", "it"): [
        "Hosting & Infrastructure - Service Cloud",
        "Hosting & Infrastructure - Platform & Other",
    ],
    ("sm", "sales"): [
        "Sales Salaries and Benefits",
        "Sales Travel and Entertainment",
    ],
    ("sm", "marketing"): [
        "Marketing Salaries and Benefits",
        "Marketing Programs - Digital",
        "Marketing Programs - Events",
    ],
    ("rd", "rd"): [
        "Engineering Salaries and Benefits",
        "Cloud Infrastructure - R&D",
        "R&D Software and Tooling",
    ],
    ("ga", "ga"): [
        "Executive Salaries and Benefits",
        "Legal and Professional Fees",
        "Office and Facilities",
    ],
}


def _generate_opex_plan_lines(
    rng: np.random.Generator,
    version_id: str,
    version_type: str,
    fy: int,
    sigma: float,
    coa: list[ChartOfAccountsRow],
    cost_centers: list[CostCenterRow],
    scale: float,
) -> list[PlanLineRow]:
    out: list[PlanLineRow] = []
    annual_revenue = cfg.REVENUE_BY_FY.get(fy, 0.0) * scale

    rollup_to_pct = {
        "cogs": cfg.OPEX_RATIOS.cogs_pct,
        "sm":   cfg.OPEX_RATIOS.sm_pct,
        "rd":   cfg.OPEX_RATIOS.rd_pct,
        "ga":   cfg.OPEX_RATIOS.ga_pct,
    }

    # CC index by (function, entity)
    cc_by_fn_entity: dict[tuple[str, str], list[str]] = {}
    for cc in cost_centers:
        cc_by_fn_entity.setdefault((cc.function, cc.entity_id), []).append(cc.cost_center_id)

    for rollup, fn_dist in _OPEX_PLAN_DISTRIBUTION.items():
        rollup_total = annual_revenue * rollup_to_pct[rollup]
        for fn, fn_share in fn_dist.items():
            account_names = _OPEX_PLAN_ACCOUNTS.get((rollup, fn), [])
            account_ids = [aid for n in account_names if (aid := _aid(coa, n)) is not None]
            if not account_ids:
                continue
            fn_total = rollup_total * fn_share
            entity_weights = cfg.FUNCTION_ENTITY_WEIGHTS.get(fn, {})
            for entity_id, ent_w in entity_weights.items():
                ccs = cc_by_fn_entity.get((fn, entity_id), [])
                if not ccs:
                    continue
                ent_total = fn_total * ent_w
                # Equal split among accounts and CCs
                per_acct_cc = ent_total / (len(account_ids) * len(ccs))
                for cc_id in ccs:
                    for aid in account_ids:
                        for period in _periods_in_fy(fy):
                            noise = float(np.exp(rng.normal(0, sigma)))
                            monthly = (per_acct_cc / 12.0) * noise
                            out.append(PlanLineRow(
                                plan_line_id=str(uuid.uuid4()),
                                version_id=version_id,
                                version_type=version_type,
                                account_id=aid,
                                cost_center_id=cc_id,
                                entity_id=entity_id,
                                period_yyyymm=period,
                                amount=_round_money(monthly),
                                segment=None,
                            ))
    return out


# =============================================================================
# Step 3 — Headcount plan
# =============================================================================

def _generate_headcount_plans(
    rng: np.random.Generator,
    version_id: str,
    fy: int,
    sigma: float,
    cost_centers: list[CostCenterRow],
    scale: float,
) -> list[HeadcountPlanRow]:
    out: list[HeadcountPlanRow] = []
    eop = cfg.TOTAL_HEADCOUNT_FY25 * scale
    # FY-anchored headcount: smaller for earlier years
    fy_share = {2023: 0.65, 2024: 0.83, 2025: 1.00}.get(fy, 1.0)
    target_eop_for_fy = eop * fy_share

    cc_by_fn_entity: dict[tuple[str, str], list[str]] = {}
    for cc in cost_centers:
        cc_by_fn_entity.setdefault((cc.function, cc.entity_id), []).append(cc.cost_center_id)

    for fn, fn_share in cfg.HEADCOUNT_BY_FUNCTION.items():
        salary_per_fte = cfg.ANNUAL_FTE_COST_BY_FUNCTION[fn]
        fn_eop_hc = target_eop_for_fy * fn_share
        for entity_id, ent_w in cfg.FUNCTION_ENTITY_WEIGHTS[fn].items():
            ccs = cc_by_fn_entity.get((fn, entity_id), [])
            if not ccs:
                continue
            ent_hc_eop = fn_eop_hc * ent_w
            per_cc = ent_hc_eop / len(ccs)
            for cc_id in ccs:
                for i, period in enumerate(_periods_in_fy(fy)):
                    # Linear ramp from 0.85 at start to 1.0 at end of FY
                    ramp = 0.85 + (1.0 - 0.85) * (i / 11.0)
                    noise = float(np.exp(rng.normal(0, sigma)))
                    hc = per_cc * ramp * noise
                    out.append(HeadcountPlanRow(
                        headcount_plan_id=str(uuid.uuid4()),
                        version_id=version_id,
                        cost_center_id=cc_id,
                        period_yyyymm=period,
                        planned_headcount=round(hc, 2),
                        planned_salary_cost=_round_money(hc * salary_per_fte / 12.0),
                    ))
    return out


# =============================================================================
# Step 4 — Driver assumptions
# =============================================================================

_DRIVERS = [
    ("arr_growth_pct",   0.20),
    ("gross_churn_pct",  0.10),
    ("sm_pct_of_revenue", cfg.OPEX_RATIOS.sm_pct),
    ("rd_pct_of_revenue", cfg.OPEX_RATIOS.rd_pct),
    ("ga_pct_of_revenue", cfg.OPEX_RATIOS.ga_pct),
    ("gross_margin_pct", 1.0 - cfg.OPEX_RATIOS.cogs_pct),
    ("dso_days",         cfg.DSO_DAYS_TARGET),
    ("dpo_days",         cfg.DPO_DAYS_TARGET),
]


def _generate_driver_assumptions(
    rng: np.random.Generator,
    version_id: str,
    fy: int,
    sigma: float,
) -> list[DriverAssumptionRow]:
    out: list[DriverAssumptionRow] = []
    for driver_name, base_value in _DRIVERS:
        for period in _periods_in_fy(fy):
            noise = float(np.exp(rng.normal(0, sigma * 0.5)))   # drivers are stickier than amounts
            value = base_value * noise
            out.append(DriverAssumptionRow(
                driver_assumption_id=str(uuid.uuid4()),
                version_id=version_id,
                driver_name=driver_name,
                period_yyyymm=period,
                value=round(value, 4),
                segment=None,
            ))
    return out


# =============================================================================
# Public entry point
# =============================================================================

def generate_epm(
    rng: np.random.Generator,
    coa: list[ChartOfAccountsRow],
    cost_centers: list[CostCenterRow],
    entities_list: list[EntityRow],
    fiscal_years: list[int],
    scale: float = 1.0,
) -> EPMArtifacts:
    budgets, forecasts, lookup = _build_versions(fiscal_years)

    plan_lines: list[PlanLineRow] = []
    headcount_plans: list[HeadcountPlanRow] = []
    drivers: list[DriverAssumptionRow] = []

    # Budgets per FY
    for fy in fiscal_years:
        version_id = lookup[f"budget_fy{fy}"]
        plan_lines.extend(_generate_revenue_plan_lines(
            rng, version_id, "budget", fy, BUDGET_NOISE_SIGMA, coa, entities_list, scale,
        ))
        plan_lines.extend(_generate_opex_plan_lines(
            rng, version_id, "budget", fy, BUDGET_NOISE_SIGMA, coa, cost_centers, scale,
        ))
        headcount_plans.extend(_generate_headcount_plans(
            rng, version_id, fy, BUDGET_NOISE_SIGMA, cost_centers, scale,
        ))
        drivers.extend(_generate_driver_assumptions(
            rng, version_id, fy, BUDGET_NOISE_SIGMA,
        ))

    # FY25 reforecasts
    if 2025 in fiscal_years:
        for vkey, sigma in [("forecast_fy25_q1", FORECAST_Q1_NOISE_SIGMA),
                            ("forecast_fy25_q3", FORECAST_Q3_NOISE_SIGMA)]:
            version_id = lookup[vkey]
            plan_lines.extend(_generate_revenue_plan_lines(
                rng, version_id, "forecast", 2025, sigma, coa, entities_list, scale,
            ))
            plan_lines.extend(_generate_opex_plan_lines(
                rng, version_id, "forecast", 2025, sigma, coa, cost_centers, scale,
            ))
            headcount_plans.extend(_generate_headcount_plans(
                rng, version_id, 2025, sigma, cost_centers, scale,
            ))
            drivers.extend(_generate_driver_assumptions(
                rng, version_id, 2025, sigma,
            ))

    return EPMArtifacts(
        budget_versions=budgets,
        forecast_versions=forecasts,
        plan_lines=plan_lines,
        headcount_plans=headcount_plans,
        driver_assumptions=drivers,
    )
