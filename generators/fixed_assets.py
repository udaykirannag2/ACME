"""Phase 2C — Fixed Assets: assets + monthly depreciation runs.

For each fiscal year:
  total_capex = revenue × CAPEX_PCT_OF_REVENUE
  Distribute across asset classes per cfg.ASSET_CLASSES.pct_of_capex.
  For each class, generate N assets with cost in [cost_per_unit_lo, hi]
  whose sum ≈ class capex budget.
  Each asset gets a cost_center based on the class's cost_center_function,
  spread across entities by FUNCTION_ENTITY_WEIGHTS.

Depreciation:
  Straight-line over useful_life_months. One row per asset per period from
  acquisition to today (or disposal).
"""
from __future__ import annotations

import uuid
from collections import defaultdict
from dataclasses import dataclass
from datetime import date, timedelta

import numpy as np
from dateutil.relativedelta import relativedelta

from . import config as cfg
from .types import (
    CostCenterRow,
    FADepreciationRow,
    FixedAssetRow,
)


# =============================================================================
# Public artifacts type
# =============================================================================

@dataclass(slots=True)
class FAArtifacts:
    fixed_assets: list[FixedAssetRow]
    depreciation: list[FADepreciationRow]


# =============================================================================
# Helpers
# =============================================================================

def _periods_through(start: date, end: date) -> list[int]:
    out = []
    cursor = start.replace(day=1)
    while cursor <= end:
        out.append(cfg.period_yyyymm(cursor))
        cursor = cursor + relativedelta(months=1)
    return out


def _round_money(x: float) -> float:
    return round(x, 2)


# =============================================================================
# Step 1 — Generate fixed assets
# =============================================================================

def _generate_fixed_assets(
    rng: np.random.Generator,
    cost_centers: list[CostCenterRow],
    fiscal_years: list[int],
    scale: float,
) -> list[FixedAssetRow]:
    cc_by_fn_entity: dict[tuple[str, str], list[str]] = defaultdict(list)
    for cc in cost_centers:
        cc_by_fn_entity[(cc.function, cc.entity_id)].append(cc.cost_center_id)

    assets: list[FixedAssetRow] = []
    counter = 0
    asset_classes = cfg.ASSET_CLASSES

    for fy in fiscal_years:
        annual_revenue = cfg.REVENUE_BY_FY.get(fy, 0.0) * scale
        total_capex = annual_revenue * cfg.CAPEX_PCT_OF_REVENUE
        fy_window_start = cfg.fy_start(fy)
        fy_window_end = cfg.fy_end(fy)

        for asset_class in asset_classes:
            class_budget = total_capex * asset_class.pct_of_capex
            spent = 0.0
            entity_weights = cfg.FUNCTION_ENTITY_WEIGHTS[asset_class.cost_center_function]

            # Generate assets until budget is hit. Cap is generous because
            # laptop class can need 10K+ assets in full mode.
            iteration_cap = 50_000
            while spent < class_budget and iteration_cap > 0:
                iteration_cap -= 1
                cost = float(rng.uniform(asset_class.cost_per_unit_lo, asset_class.cost_per_unit_hi))
                cost = _round_money(cost)
                # If single asset would overshoot by >50%, scale it down
                if (spent + cost) > class_budget * 1.05:
                    # Take whatever's left if material, else stop
                    remaining = class_budget - spent
                    if remaining < asset_class.cost_per_unit_lo:
                        break
                    cost = _round_money(remaining)

                # Pick entity
                entity_codes = list(entity_weights.keys())
                entity_probs = list(entity_weights.values())
                entity = str(rng.choice(entity_codes, p=np.array(entity_probs) / sum(entity_probs)))

                cc_options = cc_by_fn_entity.get((asset_class.cost_center_function, entity), [])
                if not cc_options:
                    spent += cost
                    continue
                cc_id = cc_options[int(rng.integers(0, len(cc_options)))]

                # Acquisition date uniform in fiscal year
                days_in_fy = (fy_window_end - fy_window_start).days
                acq_date = fy_window_start + timedelta(days=int(rng.integers(0, days_in_fy + 1)))

                counter += 1
                tag = f"FA-{asset_class.code.upper()}-{counter:06d}"

                # Salvage value: 0 for laptops/software, 5% of cost for furniture/leasehold/server
                salvage_pct = {
                    "laptop": 0.0,
                    "server": 0.05,
                    "office_furniture": 0.05,
                    "leasehold_improvement": 0.0,
                    "software": 0.0,
                }.get(asset_class.code, 0.0)
                salvage_value = _round_money(cost * salvage_pct)

                assets.append(FixedAssetRow(
                    fixed_asset_id=str(uuid.uuid4()),
                    asset_tag=tag,
                    asset_class=asset_class.code,
                    acquisition_date=acq_date,
                    acquisition_cost=cost,
                    useful_life_months=asset_class.useful_life_months,
                    salvage_value=salvage_value,
                    depreciation_method="straight_line",
                    entity_id=entity,
                    cost_center_id=cc_id,
                    disposal_date=None,
                    disposal_proceeds=None,
                    status="active",
                ))
                spent += cost
    return assets


# =============================================================================
# Step 2 — Generate depreciation rows
# =============================================================================

def _generate_depreciation(
    assets: list[FixedAssetRow],
    fiscal_years: list[int],
) -> list[FADepreciationRow]:
    rows: list[FADepreciationRow] = []
    horizon = cfg.fy_end(max(fiscal_years))

    for asset in assets:
        # Monthly depreciation amount
        depreciable_base = asset.acquisition_cost - asset.salvage_value
        monthly_dep = depreciable_base / asset.useful_life_months

        # First period in which depreciation runs: month after acquisition
        first_period_date = asset.acquisition_date.replace(day=1)
        if asset.acquisition_date.day > 15:
            first_period_date = first_period_date + relativedelta(months=1)

        # Walk forward
        cursor = first_period_date
        accumulated = 0.0
        period_no = 0
        while cursor <= horizon and period_no < asset.useful_life_months:
            period_no += 1
            accumulated += monthly_dep
            if accumulated > depreciable_base:
                # Last period — adjust
                this_dep = monthly_dep - (accumulated - depreciable_base)
                accumulated = depreciable_base
            else:
                this_dep = monthly_dep
            net_book_value = asset.acquisition_cost - accumulated
            rows.append(FADepreciationRow(
                fa_depreciation_id=str(uuid.uuid4()),
                fixed_asset_id=asset.fixed_asset_id,
                period_yyyymm=cfg.period_yyyymm(cursor),
                depreciation_amount=_round_money(this_dep),
                accumulated_depreciation=_round_money(accumulated),
                net_book_value=_round_money(net_book_value),
            ))
            cursor = cursor + relativedelta(months=1)

    return rows


# =============================================================================
# Public entry point
# =============================================================================

def generate_fixed_assets(
    rng: np.random.Generator,
    cost_centers: list[CostCenterRow],
    fiscal_years: list[int],
    scale: float = 1.0,
) -> FAArtifacts:
    assets = _generate_fixed_assets(rng, cost_centers, fiscal_years, scale)
    depreciation = _generate_depreciation(assets, fiscal_years)
    return FAArtifacts(fixed_assets=assets, depreciation=depreciation)
