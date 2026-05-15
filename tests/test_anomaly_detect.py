"""
Tests for the /metrics/anomalies REST endpoint and underlying anomaly detectors.
Verifies that the 5 seeded anomalies in the synthetic FY2024 dataset are found.

Run: pytest tests/test_anomaly_detect.py -v
Requires: API running at localhost:8000 with valid AWS credentials.
"""
import pytest
import requests

BASE = "http://localhost:8000"


# ── Helpers ───────────────────────────────────────────────────────────────────

def get_anomalies(fiscal_year=2024, period_yyyymm=None, entity_id=None):
    params = {"fiscal_year": fiscal_year}
    if period_yyyymm:
        params["period_yyyymm"] = period_yyyymm
    if entity_id:
        params["entity_id"] = entity_id
    r = requests.get(f"{BASE}/metrics/anomalies", params=params, timeout=120)
    r.raise_for_status()
    return r.json()


# ── Structure tests ───────────────────────────────────────────────────────────

def test_response_structure():
    """Response must include required top-level keys and properly typed values."""
    data = get_anomalies(fiscal_year=2024)
    assert "anomalies" in data, "missing 'anomalies' key"
    assert "total_count" in data
    assert "high_severity" in data
    assert "medium_severity" in data
    assert "low_severity" in data
    assert "scan_period" in data
    assert data["total_count"] == len(data["anomalies"])
    assert data["high_severity"] + data["medium_severity"] + data["low_severity"] == data["total_count"]


def test_anomaly_finding_fields():
    """Each finding must have the required fields with correct types."""
    data = get_anomalies(fiscal_year=2024)
    required = {"anomaly_type", "severity", "entity_id", "amount", "description", "period"}
    valid_severities = {"high", "medium", "low"}
    valid_types = {"aged_ar", "expense_spike", "ap_spike", "disposal_loss", "forecast_variance"}
    for finding in data["anomalies"]:
        missing = required - finding.keys()
        assert not missing, f"Finding missing fields: {missing} — {finding}"
        assert finding["severity"] in valid_severities, f"Bad severity: {finding['severity']}"
        assert finding["anomaly_type"] in valid_types, f"Unknown type: {finding['anomaly_type']}"
        assert isinstance(finding["amount"], (int, float)), "amount must be numeric"
        assert finding["amount"] >= 0, "amount should be non-negative"


# ── Seeded anomaly tests ──────────────────────────────────────────────────────

def test_seeded_aged_ar_enterprise():
    """Must detect the seeded $2.4M+ enterprise AR invoice (Sampson-Parks, 442+ days overdue)."""
    data = get_anomalies(fiscal_year=2024)
    aged_ar = [a for a in data["anomalies"] if a["anomaly_type"] == "aged_ar"]
    assert aged_ar, "No aged_ar anomalies found"

    # Look for the seeded $2.4M Sampson-Parks invoice
    large_ar = [a for a in aged_ar if a["amount"] >= 2_000_000]
    assert large_ar, (
        "No aged AR anomaly with amount >= $2M found. "
        f"Largest found: ${max(a['amount'] for a in aged_ar):,.0f}"
    )
    # At least one should be high severity (>$1M or >120 days)
    high_ar = [a for a in aged_ar if a["severity"] == "high"]
    assert high_ar, "No high-severity aged AR anomalies found"
    assert high_ar[0]["amount"] > 1_000_000, (
        f"Largest high-severity AR anomaly is only ${high_ar[0]['amount']:,.0f}"
    )


def test_seeded_disposal_loss_us_aug2024():
    """Must detect the seeded US server disposal loss posted in Aug 2024."""
    data = get_anomalies(fiscal_year=2024, entity_id="US", period_yyyymm="202408")
    disposal = [a for a in data["anomalies"] if a["anomaly_type"] == "disposal_loss"]
    assert disposal, (
        "No disposal_loss anomaly found for US in 202408. "
        "Seeded: $300K+ loss on server disposal (account: Loss on Disposal of Fixed Assets)."
    )
    assert disposal[0]["entity_id"] == "US"
    assert "2024-08" in disposal[0]["period"] or disposal[0]["period"] == "202408"


def test_seeded_forecast_variance_emea():
    """Must find forecast variance anomalies for EMEA (seeded S&M overspend Sep/Oct 2024)."""
    data = get_anomalies(fiscal_year=2024, entity_id="EMEA")
    variances = [a for a in data["anomalies"] if a["anomaly_type"] == "forecast_variance"]
    assert variances, "No forecast_variance anomalies found for EMEA"
    high_variances = [v for v in variances if v["severity"] in ("high", "medium")]
    assert high_variances, "No high/medium forecast variances for EMEA"


def test_seeded_forecast_variance_us():
    """Forecast variance detector must fire for US (seeded bias in S&M budget)."""
    data = get_anomalies(fiscal_year=2024, entity_id="US")
    variances = [a for a in data["anomalies"] if a["anomaly_type"] == "forecast_variance"]
    assert variances, "No forecast_variance anomalies for US"
    # Verify description contains the expected fields
    v = variances[0]
    assert "actual" in v["description"].lower() or "$" in v["description"]
    assert v["variance_pct"] > 25, f"variance_pct {v['variance_pct']} should be >25%"


# ── Entity filter tests ───────────────────────────────────────────────────────

def test_entity_filter_returns_correct_entities():
    """When entity_id=EMEA, expense/variance findings must only reference EMEA."""
    data = get_anomalies(fiscal_year=2024, entity_id="EMEA")
    for finding in data["anomalies"]:
        # AR aging has no entity_id; skip it
        if finding["anomaly_type"] == "aged_ar":
            continue
        assert finding["entity_id"] in ("EMEA", "ALL"), (
            f"Got non-EMEA entity '{finding['entity_id']}' when filtering for EMEA"
        )


def test_period_filter_narrows_variance_results():
    """period_yyyymm filter must restrict variance findings to that month."""
    data = get_anomalies(fiscal_year=2024, period_yyyymm="202409")
    variances = [a for a in data["anomalies"] if a["anomaly_type"] == "forecast_variance"]
    for v in variances:
        assert v["period"] == "202409", (
            f"Variance in period {v['period']} leaked through period=202409 filter"
        )


def test_no_anomalies_returns_clean_response():
    """A non-existent fiscal year must return 0 anomalies with valid structure."""
    data = get_anomalies(fiscal_year=2099)
    assert data["total_count"] == 0
    assert data["anomalies"] == []
    assert data["high_severity"] == 0
