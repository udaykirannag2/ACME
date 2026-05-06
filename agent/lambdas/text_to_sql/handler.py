import json
import time
import boto3

WORKGROUP = "acme-finance-dev"
DATABASE = "dev"
REGION = "us-east-1"
MAX_ROWS = 100
POLL_INTERVAL = 1
MAX_POLLS = 60

SCHEMA_DEFINITION = {
    "schema": "analytics_dev_marts",
    "fiscal_calendar": (
        "Fiscal year ends Jan 31. FY2024 = Feb 2023–Jan 2024. "
        "Q1=Feb-Apr, Q2=May-Jul, Q3=Aug-Oct, Q4=Nov-Jan. "
        "period_yyyymm is an integer like 202302 (Feb 2023)."
    ),
    "entities": ["US", "EMEA", "APAC"],
    "tables": {
        "mart_pl": {
            "description": "P&L summary: revenue, COGS, gross profit, OpEx, operating income",
            "columns": {
                "entity_id": "VARCHAR — US | EMEA | APAC",
                "fiscal_year": "INT — e.g. 2024",
                "fiscal_quarter": "INT — 1-4",
                "period_yyyymm": "BIGINT — e.g. 202302",
                "total_revenue": "FLOAT",
                "cogs": "FLOAT",
                "gross_profit": "FLOAT",
                "gross_margin_pct": "FLOAT — 0 to 1, multiply by 100 for %",
                "sales_marketing": "FLOAT",
                "research_dev": "FLOAT",
                "general_admin": "FLOAT",
                "total_opex": "FLOAT",
                "operating_income": "FLOAT",
                "operating_margin_pct": "FLOAT — 0 to 1, multiply by 100 for %",
            },
        },
        "fct_revenue": {
            "description": "Monthly revenue by entity and segment",
            "columns": {
                "entity_id": "VARCHAR",
                "segment": "VARCHAR",
                "pnl_rollup": "VARCHAR",
                "period_yyyymm": "BIGINT",
                "fiscal_year": "INT",
                "fiscal_quarter": "INT",
                "revenue_amount": "FLOAT",
                "journal_count": "BIGINT",
                "line_count": "BIGINT",
            },
        },
        "fct_expense": {
            "description": "Monthly expenses by entity, cost center, account",
            "columns": {
                "entity_id": "VARCHAR",
                "cost_center_id": "VARCHAR",
                "cc_function": "VARCHAR",
                "account_id": "VARCHAR",
                "account_name": "VARCHAR",
                "pnl_rollup": "VARCHAR",
                "period_yyyymm": "BIGINT",
                "fiscal_year": "INT",
                "fiscal_quarter": "INT",
                "expense_amount": "FLOAT",
                "line_count": "BIGINT",
            },
        },
        "fct_gl_entries": {
            "description": "Atomic GL journal lines — source of truth",
            "columns": {
                "journal_line_id": "VARCHAR",
                "posting_date": "VARCHAR — cast with ::date if filtering by date",
                "period_yyyymm": "BIGINT",
                "fiscal_year": "INT",
                "fiscal_quarter": "INT",
                "entity_id": "VARCHAR",
                "journal_type": "VARCHAR",
                "account_id": "VARCHAR",
                "account_name": "VARCHAR",
                "account_type": "VARCHAR — asset|liability|equity|revenue|expense",
                "pnl_rollup": "VARCHAR",
                "cost_center_id": "VARCHAR",
                "cost_center_name": "VARCHAR",
                "cc_function": "VARCHAR",
                "debit_amount": "FLOAT",
                "credit_amount": "FLOAT",
                "net_amount": "FLOAT",
                "is_revenue": "BOOLEAN",
                "is_expense": "BOOLEAN",
                "is_balance_sheet": "BOOLEAN",
            },
        },
        "fct_arr": {
            "description": "ARR movements: new, expansion, contraction, churn",
            "columns": {
                "arr_movement_id": "VARCHAR",
                "customer_id": "VARCHAR",
                "customer_name": "VARCHAR",
                "segment": "VARCHAR",
                "segment_tier": "VARCHAR",
                "region": "VARCHAR",
                "movement_type": "VARCHAR — new|expansion|contraction|churn",
                "arr_change": "FLOAT",
                "starting_arr": "FLOAT",
                "ending_arr": "FLOAT",
                "period_yyyymm": "VARCHAR — YYYYMM string",
                "fiscal_year": "INT",
            },
        },
        "mart_ar_aging": {
            "description": "AR aging buckets for open invoices",
            "columns": {
                "ar_invoice_id": "VARCHAR",
                "customer_id": "VARCHAR",
                "customer_name": "VARCHAR",
                "segment_tier": "VARCHAR",
                "region": "VARCHAR",
                "invoice_number": "VARCHAR",
                "amount": "FLOAT",
                "days_overdue": "BIGINT",
                "aging_bucket": "VARCHAR — 0-30|31-60|61-90|90+",
                "fiscal_year": "INT",
            },
        },
        "dim_entity": {
            "description": "Legal entities",
            "columns": {
                "entity_id": "VARCHAR — US|EMEA|APAC",
                "entity_name": "VARCHAR",
                "functional_currency": "VARCHAR",
                "is_parent_entity": "BOOLEAN",
            },
        },
        "dim_account": {
            "description": "Chart of accounts",
            "columns": {
                "account_id": "VARCHAR",
                "account_number": "BIGINT",
                "account_name": "VARCHAR",
                "account_type": "VARCHAR — asset|liability|equity|revenue|expense",
                "pnl_rollup": "VARCHAR",
                "is_revenue": "BOOLEAN",
                "is_expense": "BOOLEAN",
            },
        },
        "dim_cost_center": {
            "description": "Cost centers with entity rollup",
            "columns": {
                "cost_center_id": "VARCHAR",
                "cost_center_name": "VARCHAR",
                "function": "VARCHAR",
                "entity_id": "VARCHAR",
                "entity_name": "VARCHAR",
            },
        },
        "dim_customer": {
            "description": "Customer dimension with region",
            "columns": {
                "customer_id": "VARCHAR",
                "customer_name": "VARCHAR",
                "segment_tier": "VARCHAR",
                "billing_country": "VARCHAR",
                "region": "VARCHAR",
            },
        },
        "dim_date": {
            "description": "Calendar and fiscal date spine",
            "columns": {
                "date_day": "TIMESTAMP",
                "calendar_year": "INT",
                "calendar_month": "INT",
                "fiscal_year": "INT",
                "fiscal_quarter": "INT",
                "period_yyyymm": "INT",
                "month_name": "VARCHAR",
                "is_weekend": "BOOLEAN",
            },
        },
    },
}


def lambda_handler(event, context):
    action_group = event.get("actionGroup", "")
    function_name = event.get("function", "")
    params = {p["name"]: p["value"] for p in event.get("parameters", [])}

    try:
        if function_name == "execute_sql":
            result = execute_sql(params.get("sql_query", ""))
        elif function_name == "describe_schema":
            result = SCHEMA_DEFINITION
        else:
            result = {"error": f"Unknown function: {function_name}"}
    except Exception as exc:
        result = {"error": str(exc)}

    return {
        "actionGroup": action_group,
        "function": function_name,
        "functionResponse": {
            "responseBody": {
                "TEXT": {"body": json.dumps(result, default=str)}
            }
        },
    }


def execute_sql(sql: str) -> dict:
    if not sql or not sql.strip():
        return {"error": "sql_query is required"}

    client = boto3.client("redshift-data", region_name=REGION)

    resp = client.execute_statement(
        WorkgroupName=WORKGROUP,
        Database=DATABASE,
        Sql=sql,
    )
    stmt_id = resp["Id"]

    for _ in range(MAX_POLLS):
        time.sleep(POLL_INTERVAL)
        status = client.describe_statement(Id=stmt_id)
        if status["Status"] in ("FINISHED", "FAILED", "ABORTED"):
            break

    if status["Status"] != "FINISHED":
        return {"error": status.get("Error", f"Query {status['Status']}")}

    total_rows = status.get("ResultRows", 0)
    if total_rows == 0:
        return {"columns": [], "rows": [], "row_count": 0}

    page = client.get_statement_result(Id=stmt_id)
    columns = [c["name"] for c in page["ColumnMetadata"]]

    rows = []
    while True:
        for record in page["Records"]:
            if len(rows) >= MAX_ROWS:
                break
            row = {}
            for col, val in zip(columns, record):
                row[col] = list(val.values())[0] if val else None
            rows.append(row)
        if len(rows) >= MAX_ROWS:
            break
        next_token = page.get("NextToken")
        if not next_token:
            break
        page = client.get_statement_result(Id=stmt_id, NextToken=next_token)

    return {
        "columns": columns,
        "rows": rows,
        "row_count": total_rows,
        "returned_rows": len(rows),
        "truncated": total_rows > MAX_ROWS,
    }
