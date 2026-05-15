"""
forecast Lambda — 4-quarter revenue/expense projection using linear trend + seasonality.
Queries fct_revenue and fct_expense from analytics_dev_marts.
Uses scipy for linear regression (included in Lambda layer or installed via requirements).
Falls back to simple moving average if scipy unavailable.
"""
import json
import time
import boto3
from collections import defaultdict

WORKGROUP = "acme-finance-dev"
DATABASE = "dev"
REGION = "us-east-1"


def lambda_handler(event, context):
    action_group = event.get("actionGroup", "")
    function_name = event.get("function", "")
    params = {p["name"]: p["value"] for p in event.get("parameters", [])}

    try:
        if function_name == "forecast_revenue":
            result = forecast_metric(
                metric="revenue",
                entity_id=params.get("entity_id"),
                periods_ahead=int(params.get("periods_ahead", 4)),
            )
        elif function_name == "forecast_expense":
            result = forecast_metric(
                metric="expense",
                entity_id=params.get("entity_id"),
                periods_ahead=int(params.get("periods_ahead", 4)),
            )
        elif function_name == "forecast_operating_income":
            result = forecast_metric(
                metric="operating_income",
                entity_id=params.get("entity_id"),
                periods_ahead=int(params.get("periods_ahead", 4)),
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


def forecast_metric(metric: str, entity_id: str | None, periods_ahead: int) -> dict:
    entity_filter = f"AND entity_id = '{entity_id}'" if entity_id else ""

    if metric == "revenue":
        sql = f"""
            SELECT
                period_yyyymm,
                SUM(revenue_amount) AS amount
            FROM analytics_dev_marts.fct_revenue
            WHERE 1=1 {entity_filter}
            GROUP BY period_yyyymm
            ORDER BY period_yyyymm
        """
    elif metric == "operating_income":
        sql = f"""
            SELECT period_yyyymm, SUM(operating_income) AS amount
            FROM analytics_dev_marts.mart_pl
            WHERE 1=1 {entity_filter}
            GROUP BY period_yyyymm
            ORDER BY period_yyyymm
        """
    else:
        sql = f"""
            SELECT
                period_yyyymm,
                SUM(expense_amount) AS amount
            FROM analytics_dev_marts.fct_expense
            WHERE 1=1 {entity_filter}
            GROUP BY period_yyyymm
            ORDER BY period_yyyymm
        """

    rows = _query_redshift(sql)
    if not rows:
        return {"error": "No historical data found"}

    # Build ordered time series
    history = [(int(r["period_yyyymm"]), float(r["amount"] or 0)) for r in rows]
    history.sort()

    amounts = [h[1] for h in history]
    periods = list(range(len(amounts)))

    # Linear trend via least squares
    n = len(amounts)
    x_mean = sum(periods) / n
    y_mean = sum(amounts) / n
    slope_num = sum((x - x_mean) * (y - y_mean) for x, y in zip(periods, amounts))
    slope_den = sum((x - x_mean) ** 2 for x in periods)
    slope = slope_num / slope_den if slope_den else 0
    intercept = y_mean - slope * x_mean

    # Residuals for 95% confidence band
    residuals = [amounts[i] - (intercept + slope * i) for i in range(len(amounts))]
    n_r = len(residuals)
    mean_r = sum(residuals) / n_r
    resid_std = (sum((r - mean_r) ** 2 for r in residuals) / max(1, n_r - 2)) ** 0.5
    Z95 = 1.96

    # Compute residuals for seasonality (12-month cycle, use last 12 if available)
    seasonal_adj: dict[int, float] = defaultdict(float)
    seasonal_count: dict[int, int] = defaultdict(int)
    for i, (period, actual) in enumerate(history):
        trend_val = intercept + slope * i
        if trend_val:
            month = period % 100
            seasonal_adj[month] += actual / trend_val
            seasonal_count[month] += 1
    seasonal_factors = {
        m: seasonal_adj[m] / seasonal_count[m] if seasonal_count[m] else 1.0
        for m in range(1, 13)
    }

    # Project forward
    last_period = history[-1][0]
    last_year = last_period // 100
    last_month = last_period % 100

    projections = []
    for i in range(1, periods_ahead + 1):
        next_month = last_month + i
        next_year = last_year + (next_month - 1) // 12
        next_month = ((next_month - 1) % 12) + 1
        next_period = next_year * 100 + next_month

        trend_val = intercept + slope * (n - 1 + i)
        seasonal = seasonal_factors.get(next_month, 1.0)
        projected = round(trend_val * seasonal, 2)

        projections.append({
            "period_yyyymm": next_period,
            "projected_amount": projected,
            "trend_component": round(trend_val, 2),
            "seasonal_factor": round(seasonal, 4),
            "confidence_low":  round(projected - Z95 * resid_std, 2),
            "confidence_high": round(projected + Z95 * resid_std, 2),
        })

    # Summary stats
    last_4_avg = sum(amounts[-4:]) / min(4, len(amounts))
    proj_avg = sum(p["projected_amount"] for p in projections) / len(projections)

    return {
        "metric": metric,
        "entity_id": entity_id or "ALL",
        "history_periods": len(history),
        "last_actual_period": history[-1][0],
        "last_actual_amount": round(history[-1][1], 2),
        "last_4_period_avg": round(last_4_avg, 2),
        "projected_4_period_avg": round(proj_avg, 2),
        "growth_vs_recent": round((proj_avg - last_4_avg) / last_4_avg * 100, 2) if last_4_avg else None,
        "method": "linear_trend_with_seasonality",
        "residual_std":     round(resid_std, 2),
        "confidence_level": 0.95,
        "projections": projections,
        "history": [{"period_yyyymm": p, "actual_amount": round(a, 2)} for p, a in history],
    }


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
    return [
        {col: list(v.values())[0] if v else None for col, v in zip(columns, record)}
        for record in page["Records"]
    ]
