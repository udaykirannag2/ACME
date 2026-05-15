"""
variance_rca Lambda — compares actuals vs plan and ranks top variance drivers.
Queries fct_gl_entries (actuals) vs stg_epm__plan_line (budget/plan).
"""
import json
import time
import boto3

WORKGROUP = "acme-finance-dev"
DATABASE = "dev"
REGION = "us-east-1"
MAX_ROWS = 50


def lambda_handler(event, context):
    action_group = event.get("actionGroup", "")
    function_name = event.get("function", "")
    params = {p["name"]: p["value"] for p in event.get("parameters", [])}

    try:
        if function_name == "variance_rca":
            result = run_variance_rca(
                fiscal_year=int(params.get("fiscal_year", 2024)),
                fiscal_quarter=params.get("fiscal_quarter"),
                entity_id=params.get("entity_id"),
                top_n=int(params.get("top_n", 10)),
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


def run_variance_rca(
    fiscal_year: int,
    fiscal_quarter: str | None,
    entity_id: str | None,
    top_n: int = 10,
) -> dict:
    """
    Compare actuals (fct_gl_entries) vs plan (stg_epm__plan_line) by account.
    Returns top N drivers sorted by absolute variance descending.
    """
    entity_filter_actuals = f"AND entity_id = '{entity_id}'" if entity_id else ""
    entity_filter_plan = f"AND entity_id = '{entity_id}'" if entity_id else ""
    quarter_filter_actuals = f"AND fiscal_quarter = {int(fiscal_quarter)}" if fiscal_quarter else ""
    quarter_filter_plan = ""
    if fiscal_quarter:
        # Map fiscal_quarter to period_yyyymm range
        # FY ends Jan 31: Q1=Feb-Apr, Q2=May-Jul, Q3=Aug-Oct, Q4=Nov-Jan
        fy = fiscal_year
        q_month_ranges = {
            1: [2, 3, 4], 2: [5, 6, 7], 3: [8, 9, 10], 4: [11, 12, 1],
        }
        q = int(fiscal_quarter)
        months = q_month_ranges.get(q, [])
        if months and 1 in months:  # Q4 spans two calendar years
            periods = [fy * 100 + 11, fy * 100 + 12, (fy + 1) * 100 + 1]
        else:
            periods = [fy * 100 + m for m in months]
        if periods:
            period_list = ",".join(str(p) for p in periods)
            quarter_filter_plan = f"AND CAST(period_yyyymm AS BIGINT) IN ({period_list})"

    sql = f"""
    WITH actuals AS (
        SELECT
            account_id,
            account_name,
            pnl_rollup,
            -- Revenue entries are credits (negative net_amount in double-entry GL).
            -- Flip the sign so revenue appears positive, matching the plan table.
            SUM(CASE WHEN is_revenue = true THEN -net_amount ELSE net_amount END)
                AS actual_amount
        FROM analytics_dev_marts.fct_gl_entries
        WHERE fiscal_year = {fiscal_year}
          AND (is_revenue = true OR is_expense = true)
          {quarter_filter_actuals}
          {entity_filter_actuals}
        GROUP BY account_id, account_name, pnl_rollup
    ),
    plan AS (
        SELECT
            account_id,
            SUM(amount) AS plan_amount
        FROM analytics_dev_staging.stg_epm__plan_line
        WHERE fiscal_year = {fiscal_year}
          AND version_type = 'budget'
          {quarter_filter_plan}
          {entity_filter_plan}
        GROUP BY account_id
    ),
    joined AS (
        SELECT
            a.account_id,
            a.account_name,
            a.pnl_rollup,
            COALESCE(a.actual_amount, 0)  AS actual_amount,
            COALESCE(p.plan_amount, 0)    AS plan_amount,
            COALESCE(a.actual_amount, 0) - COALESCE(p.plan_amount, 0) AS variance,
            CASE
                WHEN COALESCE(p.plan_amount, 0) <> 0
                THEN ROUND((COALESCE(a.actual_amount, 0) - COALESCE(p.plan_amount, 0))
                           / ABS(p.plan_amount) * 100, 2)
                ELSE NULL
            END AS variance_pct
        FROM actuals a
        LEFT JOIN plan p ON a.account_id = p.account_id
    )
    SELECT *
    FROM joined
    WHERE ABS(variance) > 0
    ORDER BY ABS(variance) DESC
    LIMIT {top_n}
    """

    rows = _query_redshift(sql)

    total_variance = sum(r.get("variance", 0) or 0 for r in rows)
    return {
        "fiscal_year": fiscal_year,
        "fiscal_quarter": fiscal_quarter,
        "entity_id": entity_id,
        "top_variance_drivers": rows,
        "total_variance_in_top_n": round(total_variance, 2),
        "row_count": len(rows),
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
        for record in page["Records"][:MAX_ROWS]
    ]
