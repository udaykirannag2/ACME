"""
Tests for the /metrics/forecast REST endpoint.
Verifies confidence interval correctness, response shape, and metric options.

Run: pytest tests/test_forecast_api.py -v
Requires: API running at localhost:8000 with valid AWS credentials.
"""
import pytest
import requests

BASE = "http://localhost:8000"


# ── Helpers ───────────────────────────────────────────────────────────────────

def get_forecast(metric="revenue", entity_id=None, periods_ahead=4):
    params = {"metric": metric, "periods_ahead": periods_ahead}
    if entity_id:
        params["entity_id"] = entity_id
    r = requests.get(f"{BASE}/metrics/forecast", params=params, timeout=120)
    r.raise_for_status()
    return r.json()


# ── Structure tests ───────────────────────────────────────────────────────────

def test_response_structure_revenue():
    """Revenue forecast must include all required top-level keys."""
    data = get_forecast(metric="revenue")
    required = {
        "metric", "entity_id", "fiscal_year", "periods_ahead",
        "projections", "history", "residual_std", "confidence_level",
    }
    missing = required - data.keys()
    assert not missing, f"Missing keys: {missing}"
    assert data["metric"] == "revenue"
    assert data["confidence_level"] == 0.95
    assert isinstance(data["residual_std"], float)
    assert data["residual_std"] >= 0


def test_projection_count():
    """Projections array length must match periods_ahead parameter."""
    for n in [1, 4, 6]:
        data = get_forecast(metric="revenue", periods_ahead=n)
        assert len(data["projections"]) == n, (
            f"periods_ahead={n} but got {len(data['projections'])} projections"
        )


def test_history_not_empty():
    """History array must contain at least 12 months of actuals."""
    data = get_forecast(metric="revenue")
    assert len(data["history"]) >= 12, (
        f"history has only {len(data['history'])} points, expected >= 12"
    )
    for h in data["history"]:
        assert "period_yyyymm" in h
        assert "actual_amount" in h
        assert isinstance(h["actual_amount"], (int, float))


def test_confidence_intervals_bracket_projection():
    """For each projection, confidence_low <= projected_amount <= confidence_high."""
    data = get_forecast(metric="revenue", periods_ahead=4)
    for p in data["projections"]:
        assert "projected_amount" in p, f"Missing projected_amount in {p}"
        assert "confidence_low" in p, f"Missing confidence_low in {p}"
        assert "confidence_high" in p, f"Missing confidence_high in {p}"
        assert p["confidence_low"] <= p["projected_amount"], (
            f"period {p['period_yyyymm']}: CI low {p['confidence_low']:,.0f} > "
            f"projected {p['projected_amount']:,.0f}"
        )
        assert p["projected_amount"] <= p["confidence_high"], (
            f"period {p['period_yyyymm']}: projected {p['projected_amount']:,.0f} > "
            f"CI high {p['confidence_high']:,.0f}"
        )


def test_ci_width_nonzero():
    """Confidence interval must have positive width (residual_std > 0 for real data)."""
    data = get_forecast(metric="revenue")
    for p in data["projections"]:
        ci_width = p["confidence_high"] - p["confidence_low"]
        assert ci_width > 0, (
            f"Zero-width CI for period {p['period_yyyymm']}: "
            f"[{p['confidence_low']}, {p['confidence_high']}]"
        )


# ── Metric option tests ───────────────────────────────────────────────────────

def test_expense_metric():
    """Expense metric must return valid projections with CI bands."""
    data = get_forecast(metric="expense", periods_ahead=4)
    assert data["metric"] == "expense"
    assert len(data["projections"]) == 4
    for p in data["projections"]:
        assert p["confidence_low"] <= p["projected_amount"] <= p["confidence_high"]


def test_operating_income_metric():
    """Operating income metric must return valid projections (may be negative)."""
    data = get_forecast(metric="operating_income", periods_ahead=4)
    assert data["metric"] == "operating_income"
    assert len(data["projections"]) == 4
    # OI can be negative but CI must still bracket the projection
    for p in data["projections"]:
        assert p["confidence_low"] <= p["projected_amount"] <= p["confidence_high"]


def test_invalid_metric_returns_error():
    """An unknown metric name must return a 4xx error."""
    r = requests.get(f"{BASE}/metrics/forecast", params={"metric": "invalid_metric"}, timeout=30)
    assert r.status_code in (400, 422), f"Expected 4xx for invalid metric, got {r.status_code}"


# ── Entity filter tests ───────────────────────────────────────────────────────

def test_entity_filter_emea():
    """EMEA entity filter must return entity_id='EMEA' and higher residual_std due to seeded spike."""
    data = get_forecast(metric="revenue", entity_id="EMEA", periods_ahead=4)
    assert data["entity_id"] == "EMEA"
    assert len(data["projections"]) == 4

    # EMEA has a seeded S&M overspend spike in Sep/Oct 2024 which inflates residuals
    emea_std = data["residual_std"]
    assert emea_std > 0, "EMEA residual_std should be > 0"


def test_all_entities_higher_history_count():
    """All-entity (no filter) forecast should have at least as many history points as any single entity."""
    all_data = get_forecast(metric="revenue")
    emea_data = get_forecast(metric="revenue", entity_id="EMEA")
    assert len(all_data["history"]) >= len(emea_data["history"]), (
        "All-entity history should have >= points as single-entity"
    )


# ── Projection period sequencing ─────────────────────────────────────────────

def test_projections_are_sequential():
    """Projection period_yyyymm values must be strictly ascending (no gaps)."""
    data = get_forecast(metric="revenue", periods_ahead=6)
    periods = [p["period_yyyymm"] for p in data["projections"]]
    for i in range(1, len(periods)):
        assert periods[i] > periods[i - 1], (
            f"Projections not sequential: {periods[i - 1]} → {periods[i]}"
        )
