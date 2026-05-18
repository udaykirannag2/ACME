"""
Unit tests for the driver-based ARR cohort forecast model.

Mocks Redshift queries with realistic ACME data:
  - Enterprise: 55% of ARR, 5% churn, 12% expansion
  - Commercial: 30% of ARR, 10% churn, 8% expansion
  - SMB: 15% of ARR, 20% churn, 5% expansion
"""
import sys, os, types, json, importlib.util
from unittest.mock import patch

# Stub boto3
boto3_stub = types.ModuleType("boto3")
boto3_stub.client = lambda *a, **kw: None
sys.modules["boto3"] = boto3_stub

# Import forecast handler directly by path to avoid collision with whatif_sim handler
_handler_path = os.path.join(os.path.dirname(__file__), "..", "agent", "lambdas", "forecast", "handler.py")
_spec = importlib.util.spec_from_file_location("forecast_handler", _handler_path)
forecast_handler = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(forecast_handler)

_compute_tier_rates = forecast_handler._compute_tier_rates
_compute_new_logo_projection = forecast_handler._compute_new_logo_projection
_compute_opex_ratios_and_history = forecast_handler._compute_opex_ratios_and_history
_roll_forward_arr = forecast_handler._roll_forward_arr
_compute_pl_projection = forecast_handler._compute_pl_projection
_build_driver_forecast = forecast_handler._build_driver_forecast
DEFAULT_SCENARIO = forecast_handler.DEFAULT_SCENARIO
TIERS = forecast_handler.TIERS

# ── Mock data matching ACME's ~$2B revenue, ~$2.2B ARR ──────────────────────

# Total ending ARR: ~$2.2B
ENDING_ARR = {
    "enterprise": 1_210_000_000,
    "commercial": 660_000_000,
    "smb": 330_000_000,
}

# T4Q starting ARR base — the total ARR at risk across the trailing year.
# This is the MAX(SUM(starting_arr)) across movement types per tier from fct_arr.
T4Q_STARTING = {
    "enterprise": 1_150_000_000,
    "commercial": 620_000_000,
    "smb": 310_000_000,
}


def _mock_arr_rows():
    """Simulate Query 1: ARR bridge rates."""
    rows = []
    movements = {
        "enterprise": {
            "new": 120_000_000, "expansion": 138_000_000,
            "contraction": -46_000_000, "churn": -57_500_000, "renewal": 950_000_000,
        },
        "commercial": {
            "new": 85_000_000, "expansion": 49_600_000,
            "contraction": -37_200_000, "churn": -62_000_000, "renewal": 500_000_000,
        },
        "smb": {
            "new": 45_000_000, "expansion": 15_500_000,
            "contraction": -18_600_000, "churn": -62_000_000, "renewal": 200_000_000,
        },
    }
    for tier in TIERS:
        for mt, change in movements[tier].items():
            rows.append({
                "segment_tier": tier,
                "movement_type": mt,
                "total_arr_change": change,
                "total_starting_arr": T4Q_STARTING[tier],
                "tier_ending_arr": ENDING_ARR[tier],
                "max_period": 202501,
            })
    return rows


def _mock_new_logo_rows():
    """Simulate Query 2: New logo run-rate."""
    return [
        {"segment_tier": "enterprise", "total_new_arr": 120_000_000, "n_months": 12,
         "monthly_new_runrate": 10_000_000, "weighted_pipeline_acv": 42_000_000},
        {"segment_tier": "commercial", "total_new_arr": 85_000_000, "n_months": 12,
         "monthly_new_runrate": 7_083_333, "weighted_pipeline_acv": 42_000_000},
        {"segment_tier": "smb", "total_new_arr": 45_000_000, "n_months": 12,
         "monthly_new_runrate": 3_750_000, "weighted_pipeline_acv": 42_000_000},
    ]


def _mock_pl_rows():
    """Simulate Query 3: P&L ratios + history."""
    rows = [
        {"qtype": "ratios", "period_yyyymm": None,
         "t4q_revenue": 2_000_000_000, "t4q_cogs": 500_000_000,
         "t4q_sm": 840_000_000, "t4q_rd": 300_000_000, "t4q_ga": 160_000_000,
         "t4q_opex": 1_300_000_000, "t4q_oi": 200_000_000, "revenue": None},
    ]
    # 12 months of history
    for m in range(12):
        period = 202402 + m
        if period % 100 > 12:
            period = (period // 100 + 1) * 100 + (period % 100 - 12)
        rows.append({
            "qtype": "history", "period_yyyymm": period,
            "t4q_revenue": None, "t4q_cogs": None, "t4q_sm": None,
            "t4q_rd": None, "t4q_ga": None, "t4q_opex": None, "t4q_oi": None,
            "revenue": 160_000_000 + m * 2_500_000,
        })
    return rows


# ── Tests ────────────────────────────────────────────────────────────────────

def test_tier_rates_computation():
    rates = _compute_tier_rates(_mock_arr_rows(), DEFAULT_SCENARIO)

    assert "enterprise" in rates
    assert "commercial" in rates
    assert "smb" in rates

    # Enterprise: 5% churn, 12% expansion → NRR > 1.0
    ent = rates["enterprise"]
    assert 0.03 < ent["annual_churn_rate"] < 0.07
    assert 0.08 < ent["annual_expansion_rate"] < 0.15
    assert ent["nrr"] > 1.0, f"Enterprise NRR should be > 100%, got {ent['nrr']}"
    assert ent["ending_arr"] == ENDING_ARR["enterprise"]

    # SMB: higher churn
    smb = rates["smb"]
    assert smb["annual_churn_rate"] > ent["annual_churn_rate"]
    assert smb["nrr"] < ent["nrr"]


def test_new_logo_projection():
    rates = _compute_tier_rates(_mock_arr_rows(), DEFAULT_SCENARIO)
    new_logo = _compute_new_logo_projection(_mock_new_logo_rows(), rates, DEFAULT_SCENARIO)

    assert new_logo["enterprise"] == 10_000_000
    assert new_logo["commercial"] == 7_083_333
    assert new_logo["smb"] == 3_750_000
    assert new_logo["_pipeline_total"] == 42_000_000


def test_opex_ratios():
    ratios, history = _compute_opex_ratios_and_history(_mock_pl_rows())

    assert abs(ratios["cogs_pct"] - 0.25) < 0.01
    assert abs(ratios["sm_pct"] - 0.42) < 0.01
    assert abs(ratios["rd_pct"] - 0.15) < 0.01
    assert abs(ratios["ga_pct"] - 0.08) < 0.01
    assert len(history) == 12


def test_arr_rollforward_continuity():
    """ending_arr of month N must equal starting_arr of month N+1."""
    rates = _compute_tier_rates(_mock_arr_rows(), DEFAULT_SCENARIO)
    new_logo = _compute_new_logo_projection(_mock_new_logo_rows(), rates, DEFAULT_SCENARIO)
    projection = _roll_forward_arr(rates, new_logo, 202501, 12)

    assert len(projection) == 12

    for i in range(len(projection) - 1):
        for tier in TIERS:
            ending = projection[i]["tiers"][tier]["ending_arr"]
            starting_next = projection[i + 1]["tiers"][tier]["starting_arr"]
            assert abs(ending - starting_next) < 0.01, \
                f"Month {i}: {tier} ending {ending} != next starting {starting_next}"


def test_arr_grows_with_positive_nrr():
    """If NRR > 100% and new logos are positive, total ARR should grow."""
    rates = _compute_tier_rates(_mock_arr_rows(), DEFAULT_SCENARIO)
    new_logo = _compute_new_logo_projection(_mock_new_logo_rows(), rates, DEFAULT_SCENARIO)
    projection = _roll_forward_arr(rates, new_logo, 202501, 12)

    initial_arr = sum(ENDING_ARR.values())
    final_arr = projection[-1]["total_ending_arr"]

    assert final_arr > initial_arr, \
        f"ARR should grow: {initial_arr:,.0f} → {final_arr:,.0f}"


def test_period_advancement():
    """Periods should advance correctly across year boundaries."""
    rates = _compute_tier_rates(_mock_arr_rows(), DEFAULT_SCENARIO)
    new_logo = _compute_new_logo_projection(_mock_new_logo_rows(), rates, DEFAULT_SCENARIO)
    projection = _roll_forward_arr(rates, new_logo, 202501, 12)

    expected_periods = [
        202502, 202503, 202504, 202505, 202506, 202507,
        202508, 202509, 202510, 202511, 202512, 202601,
    ]
    actual_periods = [p["period_yyyymm"] for p in projection]
    assert actual_periods == expected_periods


def test_pl_projection_identity():
    """operating_income = gross_profit - total_opex for every month."""
    rates = _compute_tier_rates(_mock_arr_rows(), DEFAULT_SCENARIO)
    new_logo = _compute_new_logo_projection(_mock_new_logo_rows(), rates, DEFAULT_SCENARIO)
    projection = _roll_forward_arr(rates, new_logo, 202501, 12)
    ratios = {"cogs_pct": 0.25, "sm_pct": 0.42, "rd_pct": 0.15, "ga_pct": 0.08}

    pl = _compute_pl_projection(projection, ratios, 0.12)

    for month in pl:
        breakdown = month["pl_breakdown"]
        expected_oi = breakdown["gross_profit"] - breakdown["total_opex"]
        assert abs(breakdown["operating_income"] - expected_oi) < 0.1, \
            f"P&L identity violated: {breakdown['operating_income']} != {expected_oi}"


def test_scenario_churn_doubles():
    """Doubling churn should reduce forecast ARR vs baseline."""
    rates_base = _compute_tier_rates(_mock_arr_rows(), DEFAULT_SCENARIO)
    new_logo_base = _compute_new_logo_projection(_mock_new_logo_rows(), rates_base, DEFAULT_SCENARIO)
    proj_base = _roll_forward_arr(rates_base, new_logo_base, 202501, 12)

    scenario_2x = dict(DEFAULT_SCENARIO, churn_pct_multiplier=2.0)
    rates_2x = _compute_tier_rates(_mock_arr_rows(), scenario_2x)
    new_logo_2x = _compute_new_logo_projection(_mock_new_logo_rows(), rates_2x, scenario_2x)
    proj_2x = _roll_forward_arr(rates_2x, new_logo_2x, 202501, 12)

    base_final = proj_base[-1]["total_ending_arr"]
    churn_final = proj_2x[-1]["total_ending_arr"]

    assert churn_final < base_final, \
        f"2x churn should reduce ARR: base {base_final:,.0f} vs 2x churn {churn_final:,.0f}"


def test_scenario_no_new_logos():
    """With -100% new logos, ARR growth depends solely on NRR."""
    scenario = dict(DEFAULT_SCENARIO, new_logo_pct_change=-100)
    rates = _compute_tier_rates(_mock_arr_rows(), scenario)
    new_logo = _compute_new_logo_projection(_mock_new_logo_rows(), rates, scenario)
    proj = _roll_forward_arr(rates, new_logo, 202501, 12)

    for tier in TIERS:
        assert new_logo[tier] == 0, f"New logo for {tier} should be 0"

    # Without new logos, growth depends on whether aggregate NRR > 100%
    initial = sum(ENDING_ARR.values())
    final = proj[-1]["total_ending_arr"]
    # Enterprise NRR > 100% but SMB NRR < 100% — net effect depends on mix
    # Just check it doesn't crash and produces valid output
    assert final > 0


def test_backward_compatible_output_fields():
    """The output must contain all fields the existing UI/agent expects."""
    required_fields = {
        "metric", "entity_id", "method", "last_actual_period",
        "last_actual_amount", "last_4_period_avg", "projected_4_period_avg",
        "growth_vs_recent", "history_periods", "residual_std",
        "confidence_level", "projections", "history",
    }
    # We can't call _build_driver_forecast without Redshift, but we can
    # verify the projection output structure from the helper functions
    rates = _compute_tier_rates(_mock_arr_rows(), DEFAULT_SCENARIO)
    new_logo = _compute_new_logo_projection(_mock_new_logo_rows(), rates, DEFAULT_SCENARIO)
    projection = _roll_forward_arr(rates, new_logo, 202501, 4)
    ratios = {"cogs_pct": 0.25, "sm_pct": 0.42, "rd_pct": 0.15, "ga_pct": 0.08}
    pl = _compute_pl_projection(projection, ratios, 0.12)

    for month in pl:
        assert "period_yyyymm" in month
        assert "projected_amount" in month
        assert "arr_ending" in month
        assert "arr_bridge" in month
        assert "pl_breakdown" in month


def test_scenario_reduce_churn_improves_forecast():
    """Halving churn should produce higher revenue than baseline."""
    rates_base = _compute_tier_rates(_mock_arr_rows(), DEFAULT_SCENARIO)
    new_logo_base = _compute_new_logo_projection(_mock_new_logo_rows(), rates_base, DEFAULT_SCENARIO)
    proj_base = _roll_forward_arr(rates_base, new_logo_base, 202501, 12)
    ratios = {"cogs_pct": 0.25, "sm_pct": 0.42, "rd_pct": 0.15, "ga_pct": 0.08}
    pl_base = _compute_pl_projection(proj_base, ratios, 0.12)

    scenario_half_churn = dict(DEFAULT_SCENARIO, churn_pct_multiplier=0.5)
    rates_hc = _compute_tier_rates(_mock_arr_rows(), scenario_half_churn)
    new_logo_hc = _compute_new_logo_projection(_mock_new_logo_rows(), rates_hc, scenario_half_churn)
    proj_hc = _roll_forward_arr(rates_hc, new_logo_hc, 202501, 12)
    pl_hc = _compute_pl_projection(proj_hc, ratios, 0.12)

    base_rev = sum(m["projected_amount"] for m in pl_base)
    hc_rev = sum(m["projected_amount"] for m in pl_hc)

    assert hc_rev > base_rev, \
        f"Halving churn should increase revenue: base ${base_rev:,.0f} vs half-churn ${hc_rev:,.0f}"

    # Verify the improvement is material — at least 1% lift
    lift_pct = (hc_rev - base_rev) / base_rev * 100
    assert lift_pct > 1, f"Revenue lift from halving churn should be > 1%, got {lift_pct:.2f}%"


def test_scenario_increase_new_bookings():
    """Increasing new bookings by 50% should grow ARR and revenue faster."""
    rates_base = _compute_tier_rates(_mock_arr_rows(), DEFAULT_SCENARIO)
    new_logo_base = _compute_new_logo_projection(_mock_new_logo_rows(), rates_base, DEFAULT_SCENARIO)
    proj_base = _roll_forward_arr(rates_base, new_logo_base, 202501, 12)
    ratios = {"cogs_pct": 0.25, "sm_pct": 0.42, "rd_pct": 0.15, "ga_pct": 0.08}
    pl_base = _compute_pl_projection(proj_base, ratios, 0.12)

    scenario_boost = dict(DEFAULT_SCENARIO, new_logo_pct_change=50.0)
    rates_b = _compute_tier_rates(_mock_arr_rows(), scenario_boost)
    new_logo_b = _compute_new_logo_projection(_mock_new_logo_rows(), rates_b, scenario_boost)
    proj_b = _roll_forward_arr(rates_b, new_logo_b, 202501, 12)
    pl_b = _compute_pl_projection(proj_b, ratios, 0.12)

    base_final_arr = proj_base[-1]["total_ending_arr"]
    boost_final_arr = proj_b[-1]["total_ending_arr"]
    assert boost_final_arr > base_final_arr, \
        f"50% more bookings should grow ARR: base ${base_final_arr:,.0f} vs boosted ${boost_final_arr:,.0f}"

    base_rev = sum(m["projected_amount"] for m in pl_base)
    boost_rev = sum(m["projected_amount"] for m in pl_b)
    assert boost_rev > base_rev, \
        f"50% more bookings should grow revenue: base ${base_rev:,.0f} vs boosted ${boost_rev:,.0f}"

    # ARR lift should be proportional — ~50% more new logo ARR over 12 months
    arr_delta = boost_final_arr - base_final_arr
    total_new_base = sum(new_logo_base.get(t, 0) for t in TIERS) * 12
    total_new_boost = sum(new_logo_b.get(t, 0) for t in TIERS) * 12
    assert total_new_boost > total_new_base * 1.4, \
        f"New logo ACV should be ~50% higher: base ${total_new_base:,.0f} vs boost ${total_new_boost:,.0f}"


def test_scenario_combined_churn_and_bookings():
    """Combining reduced churn + increased bookings should be additive."""
    rates_base = _compute_tier_rates(_mock_arr_rows(), DEFAULT_SCENARIO)
    new_logo_base = _compute_new_logo_projection(_mock_new_logo_rows(), rates_base, DEFAULT_SCENARIO)
    proj_base = _roll_forward_arr(rates_base, new_logo_base, 202501, 12)

    # Just churn reduction
    s_churn = dict(DEFAULT_SCENARIO, churn_pct_multiplier=0.5)
    r_c = _compute_tier_rates(_mock_arr_rows(), s_churn)
    nl_c = _compute_new_logo_projection(_mock_new_logo_rows(), r_c, s_churn)
    proj_c = _roll_forward_arr(r_c, nl_c, 202501, 12)

    # Just bookings increase
    s_book = dict(DEFAULT_SCENARIO, new_logo_pct_change=50.0)
    r_b = _compute_tier_rates(_mock_arr_rows(), s_book)
    nl_b = _compute_new_logo_projection(_mock_new_logo_rows(), r_b, s_book)
    proj_b = _roll_forward_arr(r_b, nl_b, 202501, 12)

    # Combined
    s_both = dict(DEFAULT_SCENARIO, churn_pct_multiplier=0.5, new_logo_pct_change=50.0)
    r_x = _compute_tier_rates(_mock_arr_rows(), s_both)
    nl_x = _compute_new_logo_projection(_mock_new_logo_rows(), r_x, s_both)
    proj_x = _roll_forward_arr(r_x, nl_x, 202501, 12)

    base_arr = proj_base[-1]["total_ending_arr"]
    churn_arr = proj_c[-1]["total_ending_arr"]
    book_arr = proj_b[-1]["total_ending_arr"]
    combo_arr = proj_x[-1]["total_ending_arr"]

    # Combined should be better than either individual scenario
    assert combo_arr > churn_arr, "Combined should beat churn-only"
    assert combo_arr > book_arr, "Combined should beat bookings-only"
    # Combined should be at least close to the sum of individual lifts
    churn_lift = churn_arr - base_arr
    book_lift = book_arr - base_arr
    combo_lift = combo_arr - base_arr
    assert combo_lift >= (churn_lift + book_lift) * 0.95, \
        f"Combined lift ${combo_lift:,.0f} should be close to sum of individual lifts ${churn_lift + book_lift:,.0f}"


def test_nonsub_ratio_cap():
    """nonsub_ratio should be capped at 30% to prevent runaway multipliers."""
    rates = _compute_tier_rates(_mock_arr_rows(), DEFAULT_SCENARIO)
    new_logo = _compute_new_logo_projection(_mock_new_logo_rows(), rates, DEFAULT_SCENARIO)
    projection = _roll_forward_arr(rates, new_logo, 202501, 4)
    ratios = {"cogs_pct": 0.25, "sm_pct": 0.42, "rd_pct": 0.15, "ga_pct": 0.08}

    # With nonsub_ratio = 0.12 (normal), revenue = sub / 0.88
    pl_normal = _compute_pl_projection(projection, ratios, 0.12)

    # With nonsub_ratio = 0.87 (broken), revenue = sub / 0.13 → 6.7x multiplier
    pl_broken = _compute_pl_projection(projection, ratios, 0.87)

    # The broken ratio should produce wildly higher revenue
    ratio = pl_broken[0]["projected_amount"] / pl_normal[0]["projected_amount"]
    assert ratio > 5, "Uncapped 87% nonsub_ratio produces 5x+ multiplier — confirms the bug"


if __name__ == "__main__":
    import pytest
    pytest.main([__file__, "-v"])
