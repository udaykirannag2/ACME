"""Phase 2B tests: CRM generators.

Run with:
    uv run --with pytest pytest tests/test_crm.py -v

Quick-mode generation runs in <5s; we use it for the test fixture.
"""
from __future__ import annotations

import pytest
import numpy as np
from faker import Faker

from generators import config as cfg
from generators import crm as crm_module


@pytest.fixture(scope="module")
def crm_quick():
    """Generate a CRMArtifacts once for all tests in this module."""
    rng = np.random.default_rng(cfg.DEFAULT_SEED)
    Faker.seed(cfg.DEFAULT_SEED)
    faker = Faker(["en_US"])
    return crm_module.generate_crm(rng, faker, cfg.MODE_QUICK)


def test_account_count_matches_target(crm_quick) -> None:
    expected = round(cfg.ACTIVE_CUSTOMERS_FY25_EOY * cfg.MODE_QUICK.customer_scale)
    assert len(crm_quick.accounts) == expected


def test_account_ids_unique(crm_quick) -> None:
    ids = [a.account_id for a in crm_quick.accounts]
    assert len(set(ids)) == len(ids)


def test_account_tier_distribution_roughly_matches_config(crm_quick) -> None:
    counts: dict[str, int] = {}
    for a in crm_quick.accounts:
        counts[a.segment_tier] = counts.get(a.segment_tier, 0) + 1
    total = sum(counts.values())
    # Allow ±5pp tolerance per tier
    for tier in cfg.SEGMENT_TIERS:
        actual = counts.get(tier.code, 0) / total
        assert abs(actual - tier.customer_share) < 0.05, \
            f"{tier.code} share {actual:.2%} vs target {tier.customer_share:.2%}"


def test_contact_account_fk_valid(crm_quick) -> None:
    account_ids = {a.account_id for a in crm_quick.accounts}
    bad = [c for c in crm_quick.contacts if c.account_id not in account_ids]
    assert not bad, f"{len(bad)} contacts with invalid account_id"


def test_opportunity_account_fk_valid(crm_quick) -> None:
    account_ids = {a.account_id for a in crm_quick.accounts}
    bad = [o for o in crm_quick.opportunities if o.account_id not in account_ids]
    assert not bad


def test_opportunity_line_fk_valid(crm_quick) -> None:
    opp_ids = {o.opportunity_id for o in crm_quick.opportunities}
    bad = [ln for ln in crm_quick.opportunity_lines if ln.opportunity_id not in opp_ids]
    assert not bad


def test_opportunity_stages_valid(crm_quick) -> None:
    valid = {"prospecting", "qualification", "proposal", "negotiation",
             "closed_won", "closed_lost"}
    stages = {o.stage for o in crm_quick.opportunities}
    assert stages.issubset(valid), f"unexpected stages: {stages - valid}"


def test_arr_movement_account_fk_valid(crm_quick) -> None:
    account_ids = {a.account_id for a in crm_quick.accounts}
    bad = [m for m in crm_quick.arr_movements if m.account_id not in account_ids]
    assert not bad


def test_arr_movement_types_valid(crm_quick) -> None:
    valid = {"new", "expansion", "contraction", "churn", "renewal"}
    types = {m.movement_type for m in crm_quick.arr_movements}
    assert types.issubset(valid)


def test_arr_trajectory_within_target(crm_quick) -> None:
    """Subscription revenue (= avg ARR over each FY) should be within ±15% of
    target subscription revenue (= REVENUE_BY_FY × 0.88 × scale)."""
    from dateutil.relativedelta import relativedelta

    for fy in (2023, 2024, 2025):
        periods = []
        d = cfg.fy_start(fy)
        while d <= cfg.fy_end(fy):
            periods.append(cfg.period_yyyymm(d))
            d += relativedelta(months=1)
        avg_arr = sum(crm_quick.arr_by_period.get(p, 0.0) for p in periods) / len(periods)
        target = cfg.REVENUE_BY_FY[fy] * cfg.MODE_QUICK.customer_scale * 0.88
        delta_pct = abs(avg_arr - target) / target
        assert delta_pct < 0.15, (
            f"FY{fy} avg ARR {avg_arr:,.0f} vs target {target:,.0f} = "
            f"{delta_pct:+.1%}, exceeds ±15% band"
        )


def test_arr_movement_starting_ending_consistency(crm_quick) -> None:
    """Per (account, segment), each movement's starting_arr should equal the
    previous movement's ending_arr."""
    by_key: dict[tuple[str, str], list] = {}
    for m in crm_quick.arr_movements:
        key = (m.account_id, m.segment)
        by_key.setdefault(key, []).append(m)

    # Sort each list by period
    for key, movements in by_key.items():
        movements.sort(key=lambda m: m.period_yyyymm)
        prev_ending = 0.0
        for m in movements:
            assert abs(m.starting_arr - prev_ending) < 0.01, \
                f"{key} period {m.period_yyyymm}: starting {m.starting_arr} != " \
                f"prev ending {prev_ending}"
            prev_ending = m.ending_arr


def test_won_opp_amounts_positive(crm_quick) -> None:
    won = [o for o in crm_quick.opportunities if o.stage == "closed_won"]
    bad = [o for o in won if o.amount <= 0]
    assert not bad


def test_pipeline_snapshot_fk_valid(crm_quick) -> None:
    opp_ids = {o.opportunity_id for o in crm_quick.opportunities}
    bad = [s for s in crm_quick.pipeline_snapshots if s.opportunity_id not in opp_ids]
    assert not bad


def test_pipeline_snapshot_only_fy25(crm_quick) -> None:
    fy25_start = cfg.fy_start(2025)
    fy25_end = cfg.fy_end(2025)
    bad = [s for s in crm_quick.pipeline_snapshots
           if not (fy25_start <= s.snapshot_date <= fy25_end)]
    assert not bad, f"{len(bad)} snapshots outside FY25"


def test_pipeline_snapshot_stages_open_only(crm_quick) -> None:
    """Snapshots show in-flight stages, not closed states."""
    valid = {"prospecting", "qualification", "proposal", "negotiation"}
    stages = {s.stage for s in crm_quick.pipeline_snapshots}
    assert stages.issubset(valid)
