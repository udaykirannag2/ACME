"""
anomaly_detect Lambda — 4 SQL-based financial health detectors.
Called by Bedrock Agent for financial health checks and anomaly scans.
"""
import json
import time
import boto3

WORKGROUP = "acme-finance-dev"
DATABASE  = "dev"
REGION    = "us-east-1"
MARTS     = "analytics_dev_marts"
STAGING   = "analytics_dev_staging"


def lambda_handler(event, context):
    action_group  = event.get("actionGroup", "")
    function_name = event.get("function", "")
    params = {p["name"]: p["value"] for p in event.get("parameters", [])}
    try:
        if function_name == "scan_anomalies":
            result = scan_anomalies(
                fiscal_year=int(params.get("fiscal_year", 2024)),
                period_yyyymm=params.get("period_yyyymm"),
                entity_id=params.get("entity_id"),
            )
        else:
            result = {"error": f"Unknown function: {function_name}"}
    except Exception as exc:
        result = {"error": str(exc)}
    return {
        "messageVersion": "1.0",
        "response": {
            "actionGroup": action_group,
            "function": function_name,
            "functionResponse": {
                "responseBody": {"TEXT": {"body": json.dumps(result, default=str)}}
            },
        },
    }


def scan_anomalies(fiscal_year: int, period_yyyymm: str | None, entity_id: str | None) -> dict:
    findings = []
    findings.extend(_detect_aged_ar(fiscal_year, entity_id))
    findings.extend(_detect_ap_spike(fiscal_year, period_yyyymm, entity_id))
    findings.extend(_detect_disposal_loss(fiscal_year, entity_id))
    findings.extend(_detect_forecast_variance(fiscal_year, period_yyyymm, entity_id))
    # Sort: high first
    order = {"high": 0, "medium": 1, "low": 2}
    findings.sort(key=lambda f: order.get(f["severity"], 9))
    return {
        "anomalies": findings,
        "scan_period": period_yyyymm or f"FY{fiscal_year}",
        "entity_filter": entity_id or "ALL",
        "total_count": len(findings),
        "high_severity":   sum(1 for f in findings if f["severity"] == "high"),
        "medium_severity": sum(1 for f in findings if f["severity"] == "medium"),
        "low_severity":    sum(1 for f in findings if f["severity"] == "low"),
    }


def _detect_aged_ar(fiscal_year: int, entity_id: str | None) -> list:
    entity_filter_clause = f"AND entity_id = '{entity_id}'" if entity_id else ""
    sql = f"""
        SELECT customer_name, amount, days_overdue, aging_bucket, segment_tier, invoice_number
        FROM {MARTS}.mart_ar_aging
        WHERE fiscal_year = {fiscal_year}
          AND days_overdue > 90
          AND amount > 500000
          {entity_filter_clause}
        ORDER BY amount DESC
        LIMIT 20
    """
    rows = _query_redshift(sql)
    findings = []
    for r in rows:
        days_overdue = float(r.get("days_overdue") or 0)
        amount = float(r.get("amount") or 0)
        severity = "high" if days_overdue > 120 or amount > 1_000_000 else "medium"
        findings.append({
            "anomaly_type": "aged_ar",
            "severity": severity,
            "entity_id": entity_id or "ALL",
            "amount": amount,
            "description": (
                f"Invoice {r.get('invoice_number')} from {r.get('customer_name')} "
                f"({r.get('segment_tier')}) is {int(days_overdue)} days overdue "
                f"(bucket: {r.get('aging_bucket')})"
            ),
            "period": str(fiscal_year),
            "customer_name": r.get("customer_name"),
            "days_overdue": days_overdue,
        })
    return findings


def _detect_ap_spike(fiscal_year: int, period_yyyymm: str | None, entity_id: str | None) -> list:
    entity_filter_clause = f"AND entity_id = '{entity_id}'" if entity_id else ""
    period_filter_clause = f"AND period_yyyymm = '{period_yyyymm}'" if period_yyyymm else ""
    sql = f"""
        WITH monthly AS (
            SELECT entity_id, pnl_rollup, period_yyyymm,
                   SUM(net_amount) AS month_amount
            FROM {MARTS}.fct_gl_entries
            WHERE fiscal_year = {fiscal_year}
              AND pnl_rollup IN ('S&M', 'G&A')
              AND is_expense = true
              {entity_filter_clause}
            GROUP BY entity_id, pnl_rollup, period_yyyymm
        ),
        with_rolling AS (
            SELECT *, AVG(month_amount) OVER (
                PARTITION BY entity_id, pnl_rollup
                ORDER BY period_yyyymm
                ROWS BETWEEN 3 PRECEDING AND 1 PRECEDING
            ) AS rolling_3m_avg
            FROM monthly
        )
        SELECT * FROM with_rolling
        WHERE rolling_3m_avg > 0
          AND month_amount > 2 * rolling_3m_avg
          {period_filter_clause}
        ORDER BY (month_amount / rolling_3m_avg) DESC
        LIMIT 10
    """
    rows = _query_redshift(sql)
    findings = []
    for r in rows:
        month_amount = float(r.get("month_amount") or 0)
        rolling_3m_avg = float(r.get("rolling_3m_avg") or 1)
        ratio = month_amount / rolling_3m_avg if rolling_3m_avg else 0
        severity = "high" if ratio > 3 else "medium"
        findings.append({
            "anomaly_type": "ap_spike",
            "severity": severity,
            "entity_id": r.get("entity_id"),
            "amount": month_amount,
            "description": (
                f"{r.get('pnl_rollup')} expense for {r.get('entity_id')} in period "
                f"{r.get('period_yyyymm')} is {ratio:.1f}x the 3-month rolling average "
                f"(${month_amount:,.0f} vs avg ${rolling_3m_avg:,.0f})"
            ),
            "period": str(r.get("period_yyyymm")),
            "pnl_rollup": r.get("pnl_rollup"),
            "rolling_3m_avg": rolling_3m_avg,
            "ratio": round(ratio, 2),
        })
    return findings


def _detect_disposal_loss(fiscal_year: int, entity_id: str | None) -> list:
    entity_filter_clause = f"AND entity_id = '{entity_id}'" if entity_id else ""
    sql = f"""
        SELECT entity_id, account_name, posting_date, period_yyyymm,
               SUM(net_amount) AS total_loss, COUNT(*) AS journal_lines
        FROM {MARTS}.fct_gl_entries
        WHERE fiscal_year = {fiscal_year}
          AND account_name ILIKE '%Loss on Disposal%'
          AND net_amount > 0
          {entity_filter_clause}
        GROUP BY entity_id, account_name, posting_date, period_yyyymm
        ORDER BY total_loss DESC
        LIMIT 10
    """
    rows = _query_redshift(sql)
    findings = []
    for r in rows:
        loss = float(r.get("total_loss") or 0)
        severity = "high" if loss > 200_000 else ("medium" if loss > 50_000 else "low")
        findings.append({
            "anomaly_type": "disposal_loss",
            "severity": severity,
            "entity_id": r.get("entity_id"),
            "amount": loss,
            "description": (
                f"Asset disposal loss of ${loss:,.0f} posted on {r.get('posting_date')} "
                f"for {r.get('entity_id')} (account: {r.get('account_name')})"
            ),
            "period": str(r.get("period_yyyymm")),
            "posting_date": str(r.get("posting_date")),
            "journal_lines": r.get("journal_lines"),
        })
    return findings


def _detect_forecast_variance(fiscal_year: int, period_yyyymm: str | None, entity_id: str | None) -> list:
    entity_filter_a = f"AND entity_id = '{entity_id}'" if entity_id else ""
    entity_filter_p = f"AND entity_id = '{entity_id}'" if entity_id else ""
    period_filter_clause = f"AND a.period_yyyymm = '{period_yyyymm}'" if period_yyyymm else ""
    sql = f"""
        WITH actuals AS (
            SELECT entity_id, account_id, account_name, pnl_rollup, period_yyyymm,
                   SUM(CASE WHEN is_revenue THEN -net_amount ELSE net_amount END) AS actual_amount
            FROM {MARTS}.fct_gl_entries
            WHERE fiscal_year = {fiscal_year}
              AND (is_revenue = true OR is_expense = true)
              {entity_filter_a}
              {period_filter_clause}
            GROUP BY entity_id, account_id, account_name, pnl_rollup, period_yyyymm
        ),
        plan AS (
            SELECT entity_id, account_id, period_yyyymm,
                   SUM(amount) AS plan_amount
            FROM {STAGING}.stg_epm__plan_line
            WHERE fiscal_year = {fiscal_year} AND version_type = 'budget'
              {entity_filter_p}
            GROUP BY entity_id, account_id, period_yyyymm
        )
        SELECT a.entity_id, a.account_name, a.pnl_rollup, a.period_yyyymm,
               a.actual_amount, p.plan_amount,
               (a.actual_amount - p.plan_amount) AS budget_variance,
               ROUND(ABS(a.actual_amount - p.plan_amount) / NULLIF(ABS(p.plan_amount), 0) * 100, 2) AS variance_pct
        FROM actuals a
        JOIN plan p ON a.entity_id = p.entity_id
                   AND a.account_id = p.account_id
                   AND a.period_yyyymm = p.period_yyyymm
        WHERE ABS(p.plan_amount) > 100000
          AND ABS(a.actual_amount - p.plan_amount) / NULLIF(ABS(p.plan_amount), 0) > 0.25
        ORDER BY ABS(a.actual_amount - p.plan_amount) DESC
        LIMIT 20
    """
    rows = _query_redshift(sql)
    findings = []
    for r in rows:
        actual_amount = float(r.get("actual_amount") or 0)
        plan_amount = float(r.get("plan_amount") or 0)
        variance = float(r.get("budget_variance") or 0)
        variance_pct = float(r.get("variance_pct") or 0)
        severity = "high" if variance_pct > 50 else ("medium" if variance_pct > 35 else "low")
        findings.append({
            "anomaly_type": "forecast_variance",
            "severity": severity,
            "entity_id": r.get("entity_id"),
            "amount": abs(variance),
            "description": (
                f"{r.get('account_name')} ({r.get('pnl_rollup')}) for {r.get('entity_id')} "
                f"in period {r.get('period_yyyymm')}: actual ${actual_amount:,.0f} vs plan "
                f"${plan_amount:,.0f} ({variance:+,.0f}, {variance_pct:.1f}% variance)"
            ),
            "period": str(r.get("period_yyyymm")),
            "actual_amount": actual_amount,
            "plan_amount": plan_amount,
            "variance": variance,
            "variance_pct": variance_pct,
        })
    return findings


def _query_redshift(sql: str) -> list[dict]:
    client = boto3.client("redshift-data", region_name=REGION)
    resp = client.execute_statement(WorkgroupName=WORKGROUP, Database=DATABASE, Sql=sql)
    stmt_id = resp["Id"]

    for _ in range(90):
        time.sleep(1)
        status = client.describe_statement(Id=stmt_id)
        if status["Status"] in ("FINISHED", "FAILED", "ABORTED"):
            break

    if status["Status"] != "FINISHED":
        raise RuntimeError(status.get("Error", f"Query {status['Status']}"))

    if status.get("ResultRows", 0) == 0:
        return []

    page = client.get_statement_result(Id=stmt_id)
    columns = [c["name"] for c in page["ColumnMetadata"]]
    rows = []
    while True:
        rows.extend([
            {col: list(v.values())[0] if v else None for col, v in zip(columns, record)}
            for record in page["Records"]
        ])
        if len(rows) >= 50 or "NextToken" not in page:
            break
        page = client.get_statement_result(Id=stmt_id, NextToken=page["NextToken"])
    return rows[:50]
