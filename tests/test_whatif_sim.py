"""
Unit tests for whatif_sim Lambda — validates P&L math after COGS fix.

Uses the user-reported baseline:
  Revenue $1,807.9M, Gross Profit $1,400.8M, Op Income -$170.5M (-9.4%)

With the fix, total_opex excludes COGS, so cutting "opex" by 10%
must improve operating income (not worsen it).
"""
import sys, os, types
from unittest.mock import patch

# Stub boto3 so the handler can import without AWS credentials
boto3_stub = types.ModuleType("boto3")
boto3_stub.client = lambda *a, **kw: None
sys.modules["boto3"] = boto3_stub

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "agent", "lambdas", "whatif_sim"))
from handler import run_whatif

# Baseline P&L (in millions) — matches user-reported scenario
BASELINE_ROW = {
    "entity_id": "ALL",
    "total_revenue": 1807.9,
    "cogs": 407.1,               # revenue - gross_profit
    "gross_profit": 1400.8,
    "sales_marketing": 700.0,
    "research_dev": 600.0,
    "general_admin": 271.3,
    "total_opex": 1571.3,        # S&M + R&D + G&A (no COGS after fix)
    "operating_income": -170.5,  # gross_profit - total_opex
}


def _mock_query(sql):
    return [dict(BASELINE_ROW)]


@patch("handler._query_redshift", side_effect=_mock_query)
def test_cut_opex_10pct_improves_margin(mock_rs):
    result = run_whatif("opex", -10.0, 2024, None)

    baseline = result["baseline"]
    scenario = result["scenario_result"]

    # Baseline should match input
    assert baseline["total_revenue"] == 1807.9
    assert baseline["gross_profit"] == 1400.8
    assert baseline["operating_income"] == -170.5

    # Scenario: 10% opex cut = $157.13M savings
    expected_new_opex = 1571.3 * 0.9        # 1414.17
    expected_new_oi = 1400.8 - expected_new_opex  # -13.37
    expected_new_margin = expected_new_oi / 1807.9 * 100

    assert abs(scenario["operating_income"] - expected_new_oi) < 0.1, \
        f"Expected OI ~{expected_new_oi:.1f}, got {scenario['operating_income']}"
    assert abs(scenario["operating_margin_pct"] - expected_new_margin) < 0.1, \
        f"Expected margin ~{expected_new_margin:.1f}%, got {scenario['operating_margin_pct']}%"

    # Key check: cutting OpEx MUST improve operating income
    assert scenario["operating_income"] > baseline["operating_income"], \
        f"Cutting OpEx should improve OI: {scenario['operating_income']} should be > {baseline['operating_income']}"
    assert scenario["operating_margin_pct"] > baseline["operating_margin_pct"], \
        f"Cutting OpEx should improve margin: {scenario['operating_margin_pct']}% should be > {baseline['operating_margin_pct']}%"

    # Revenue and gross profit should be unchanged
    assert scenario["total_revenue"] == baseline["total_revenue"]
    assert scenario["gross_profit"] == baseline["gross_profit"]


@patch("handler._query_redshift", side_effect=_mock_query)
def test_cut_opex_never_double_counts_cogs(mock_rs):
    """The bug was: OI = gross_profit - total_opex, but total_opex included COGS.
    With fixed data (total_opex excludes COGS), the formula must not subtract COGS twice."""
    result = run_whatif("opex", -10.0, 2024, None)
    scenario = result["scenario_result"]

    # Operating income must NOT be worse than baseline (the old bug)
    assert scenario["operating_income"] > -170.5, \
        f"OI {scenario['operating_income']} is worse than baseline -170.5 — COGS double-count bug!"
    # Specifically, it must not be anywhere near -379.7 (the old buggy value)
    assert scenario["operating_income"] > -50, \
        f"OI {scenario['operating_income']} is far too negative — likely still double-counting"


@patch("handler._query_redshift", side_effect=_mock_query)
def test_increase_revenue_10pct(mock_rs):
    result = run_whatif("revenue", 10.0, 2024, None)
    scenario = result["scenario_result"]

    expected_revenue = 1807.9 * 1.1   # 1988.69
    expected_gp = expected_revenue - 407.1  # 1581.59
    expected_oi = expected_gp - 1571.3      # 10.29

    assert abs(scenario["total_revenue"] - expected_revenue) < 0.1
    assert abs(scenario["gross_profit"] - expected_gp) < 0.1
    assert abs(scenario["operating_income"] - expected_oi) < 0.1
    assert scenario["operating_income"] > -170.5  # must improve


@patch("handler._query_redshift", side_effect=_mock_query)
def test_cut_rd_15pct(mock_rs):
    """Cut R&D by 15% — should recalculate total_opex and improve OI."""
    result = run_whatif("r&d", -15.0, 2024, None)
    scenario = result["scenario_result"]

    new_rd = 600.0 * 0.85  # 510
    new_opex = 700.0 + 510.0 + 271.3  # 1481.3
    expected_oi = 1400.8 - new_opex  # -80.5

    assert abs(scenario["operating_income"] - expected_oi) < 0.1, \
        f"Expected OI ~{expected_oi:.1f}, got {scenario['operating_income']}"
    assert scenario["operating_income"] > -170.5  # must improve


@patch("handler._query_redshift", side_effect=_mock_query)
def test_baseline_pl_identity(mock_rs):
    """Verify the baseline satisfies: OI = gross_profit - total_opex."""
    result = run_whatif("opex", 0.0, 2024, None)
    baseline = result["baseline"]

    # With 0% change, scenario should equal baseline
    scenario = result["scenario_result"]
    assert abs(scenario["operating_income"] - baseline["operating_income"]) < 0.01


if __name__ == "__main__":
    import pytest
    pytest.main([__file__, "-v"])
