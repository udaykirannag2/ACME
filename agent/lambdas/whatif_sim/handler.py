"""
whatif_sim Lambda — applies a hypothetical % change to a cost or revenue line
and returns the downstream P&L impact.
e.g. "What if we cut R&D spend by 15%? What happens to operating margin?"
"""
import json
import time
import boto3

WORKGROUP = "acme-finance-dev"
DATABASE = "dev"
REGION = "us-east-1"

# Mapping from friendly pnl_rollup names to mart_pl columns
PNL_LINE_MAP = {
    "revenue": "total_revenue",
    "total_revenue": "total_revenue",
    "cogs": "cogs",
    "cost of goods sold": "cogs",
    "gross profit": "gross_profit",
    "sales_marketing": "sales_marketing",
    "s&m": "sales_marketing",
    "sales and marketing": "sales_marketing",
    "research_dev": "research_dev",
    "r&d": "research_dev",
    "research and development": "research_dev",
    "general_admin": "general_admin",
    "g&a": "general_admin",
    "general and administrative": "general_admin",
    "opex": "total_opex",
    "total_opex": "total_opex",
    "operating income": "operating_income",
}


def lambda_handler(event, context):
    action_group = event.get("actionGroup", "")
    function_name = event.get("function", "")
    params = {p["name"]: p["value"] for p in event.get("parameters", [])}

    try:
        if function_name == "whatif_sim":
            result = run_whatif(
                line_item=params.get("line_item", ""),
                pct_change=float(params.get("pct_change", 0)),
                fiscal_year=int(params.get("fiscal_year", 2024)),
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


def run_whatif(
    line_item: str,
    pct_change: float,
    fiscal_year: int,
    entity_id: str | None,
) -> dict:
    col = PNL_LINE_MAP.get(line_item.lower())
    if not col:
        return {
            "error": f"Unknown line item: '{line_item}'",
            "valid_line_items": list(set(PNL_LINE_MAP.keys())),
        }

    entity_filter = f"AND entity_id = '{entity_id}'" if entity_id else ""
    sql = f"""
        SELECT
            entity_id,
            SUM(total_revenue)     AS total_revenue,
            SUM(cogs)              AS cogs,
            SUM(gross_profit)      AS gross_profit,
            SUM(sales_marketing)   AS sales_marketing,
            SUM(research_dev)      AS research_dev,
            SUM(general_admin)     AS general_admin,
            SUM(total_opex)        AS total_opex,
            SUM(operating_income)  AS operating_income
        FROM analytics_dev_marts.mart_pl
        WHERE fiscal_year = {fiscal_year}
        {entity_filter}
        GROUP BY entity_id
        ORDER BY entity_id
    """

    rows = _query_redshift(sql)
    if not rows:
        return {"error": f"No P&L data for FY{fiscal_year}"}

    # Aggregate across entities if no filter
    if not entity_id:
        agg: dict[str, float] = {
            "total_revenue": 0, "cogs": 0, "gross_profit": 0,
            "sales_marketing": 0, "research_dev": 0, "general_admin": 0,
            "total_opex": 0, "operating_income": 0,
        }
        for r in rows:
            for k in agg:
                agg[k] += float(r.get(k) or 0)
        base = agg
    else:
        base = {k: float(rows[0].get(k) or 0) for k in rows[0]}

    # Apply change to the target line
    delta = base[col] * (pct_change / 100.0)
    new_val = base[col] + delta

    # Recompute downstream
    new_pl = dict(base)
    new_pl[col] = new_val

    # Recalculate gross profit if revenue or COGS changed
    if col in ("total_revenue", "cogs"):
        new_pl["gross_profit"] = new_pl["total_revenue"] - new_pl["cogs"]

    # Recalculate opex if any opex line changed
    if col in ("sales_marketing", "research_dev", "general_admin"):
        new_pl["total_opex"] = (
            new_pl["sales_marketing"] + new_pl["research_dev"] + new_pl["general_admin"]
        )

    # Recalculate operating income
    new_pl["operating_income"] = new_pl["gross_profit"] - new_pl["total_opex"]

    def margin(num, den): return round(num / den * 100, 2) if den else None

    return {
        "scenario": f"{line_item} {'+' if pct_change >= 0 else ''}{pct_change}%",
        "fiscal_year": fiscal_year,
        "entity_id": entity_id or "ALL",
        "baseline": {
            "total_revenue": round(base["total_revenue"], 2),
            "gross_profit": round(base["gross_profit"], 2),
            "gross_margin_pct": margin(base["gross_profit"], base["total_revenue"]),
            "operating_income": round(base["operating_income"], 2),
            "operating_margin_pct": margin(base["operating_income"], base["total_revenue"]),
        },
        "scenario_result": {
            "total_revenue": round(new_pl["total_revenue"], 2),
            "gross_profit": round(new_pl["gross_profit"], 2),
            "gross_margin_pct": margin(new_pl["gross_profit"], new_pl["total_revenue"]),
            "operating_income": round(new_pl["operating_income"], 2),
            "operating_margin_pct": margin(new_pl["operating_income"], new_pl["total_revenue"]),
        },
        "impact": {
            col: round(delta, 2),
            "operating_income_delta": round(new_pl["operating_income"] - base["operating_income"], 2),
            "operating_margin_delta_bps": round(
                (margin(new_pl["operating_income"], new_pl["total_revenue"]) or 0)
                - (margin(base["operating_income"], base["total_revenue"]) or 0),
                2,
            ),
        },
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
