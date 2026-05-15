"""
describe_metric Lambda — returns canonical business definitions for finance metrics.
Called by the Bedrock Agent when the user asks about a specific KPI or metric.
"""
import json

METRIC_GLOSSARY: dict[str, dict] = {
    # ── Revenue ──────────────────────────────────────────────────────────────
    "arr": {
        "name": "Annual Recurring Revenue (ARR)",
        "definition": "The annualised value of all active subscription contracts. "
                      "Calculated as sum of ending_arr for the most recent period.",
        "table": "fct_arr",
        "formula": "SUM(ending_arr) for latest period_yyyymm",
        "unit": "USD",
        "good_direction": "higher",
    },
    "nrr": {
        "name": "Net Revenue Retention (NRR)",
        "definition": "Revenue retained from existing customers including expansion, "
                      "contraction, and churn. NRR > 100% means expansion outpaces losses.",
        "table": "fct_arr",
        "formula": "(starting_arr + expansion + contraction + churn) / starting_arr * 100",
        "unit": "percent",
        "good_direction": "higher",
        "benchmark": "Best-in-class SaaS: >120%. Median: ~100-110%.",
    },
    "gross_revenue_retention": {
        "name": "Gross Revenue Retention (GRR)",
        "definition": "Revenue retained from existing customers excluding expansion. "
                      "Max value is 100%.",
        "table": "fct_arr",
        "formula": "(starting_arr + contraction + churn) / starting_arr * 100",
        "unit": "percent",
        "good_direction": "higher",
        "benchmark": "Best-in-class SaaS: >90%. Median: ~85%.",
    },
    "churn_rate": {
        "name": "Customer Churn Rate",
        "definition": "Percentage of ARR lost from customers who cancelled entirely.",
        "table": "fct_arr",
        "formula": "SUM(arr_change WHERE movement_type='churn') / starting_arr * 100",
        "unit": "percent",
        "good_direction": "lower",
    },
    # ── Profitability ─────────────────────────────────────────────────────────
    "gross_margin": {
        "name": "Gross Margin",
        "definition": "Revenue minus Cost of Goods Sold (COGS), expressed as a percentage. "
                      "Measures how much revenue remains after direct costs.",
        "table": "mart_pl",
        "formula": "(total_revenue - cogs) / total_revenue * 100",
        "unit": "percent",
        "good_direction": "higher",
        "benchmark": "SaaS: 70-80% is strong. Enterprise software can reach 80-85%.",
    },
    "operating_margin": {
        "name": "Operating Margin",
        "definition": "Operating income divided by revenue. Reflects profitability after "
                      "all operating expenses (COGS + S&M + R&D + G&A).",
        "table": "mart_pl",
        "formula": "operating_income / total_revenue * 100",
        "unit": "percent",
        "good_direction": "higher",
        "benchmark": "Rule of 40: (revenue growth % + operating margin %) >= 40 is healthy for SaaS.",
    },
    "ebitda_margin": {
        "name": "EBITDA Margin",
        "definition": "Earnings before interest, taxes, depreciation and amortisation as "
                      "a percentage of revenue. Proxy for operating cash generation.",
        "table": "mart_pl",
        "formula": "Approximated as operating_income / total_revenue * 100 (D&A excluded in this model)",
        "unit": "percent",
        "good_direction": "higher",
    },
    "cac": {
        "name": "Customer Acquisition Cost (CAC)",
        "definition": "Total S&M spend divided by new customers acquired in the period. "
                      "Not directly in the data model — approximated from fct_expense + fct_arr.",
        "table": "fct_expense + fct_arr",
        "formula": "SUM(expense_amount WHERE cc_function='Sales') / COUNT(new customers)",
        "unit": "USD per customer",
        "good_direction": "lower",
    },
    "magic_number": {
        "name": "Magic Number (Sales Efficiency)",
        "definition": "Net new ARR divided by prior-quarter S&M spend. > 0.75 is capital efficient.",
        "table": "fct_arr, fct_expense",
        "formula": "Net New ARR(Q) / S&M Spend(Q-1)",
        "unit": "ratio",
        "good_direction": "higher",
        "benchmark": "> 0.75 = capital efficient. > 1.5 = excellent.",
    },
    # ── Cash / AR ─────────────────────────────────────────────────────────────
    "dso": {
        "name": "Days Sales Outstanding (DSO)",
        "definition": "Average number of days to collect payment after a sale. "
                      "Lower DSO means faster cash collection.",
        "table": "mart_ar_aging",
        "formula": "AVG(days_since_invoice) for open invoices",
        "unit": "days",
        "good_direction": "lower",
        "benchmark": "SaaS: 30-45 days is typical.",
    },
    "ar_aging": {
        "name": "AR Aging",
        "definition": "Breakdown of outstanding invoices by how long they have been unpaid: "
                      "0-30 days (current), 31-60 (early overdue), 61-90 (late), 90+ (at-risk).",
        "table": "mart_ar_aging",
        "formula": "SUM(amount) GROUP BY aging_bucket",
        "unit": "USD",
        "good_direction": "more in 0-30 bucket",
    },
    # ── Expense ───────────────────────────────────────────────────────────────
    "opex": {
        "name": "Operating Expenses (OpEx)",
        "definition": "All operating costs below gross profit: Sales & Marketing (S&M), "
                      "Research & Development (R&D), and General & Administrative (G&A).",
        "table": "mart_pl",
        "formula": "sales_marketing + research_dev + general_admin",
        "unit": "USD",
        "good_direction": "context-dependent (invest to grow, control to profit)",
    },
    "rule_of_40": {
        "name": "Rule of 40",
        "definition": "Revenue growth rate % + operating margin % >= 40 indicates a healthy "
                      "balance between growth and profitability for SaaS companies.",
        "table": "mart_pl + fct_revenue",
        "formula": "(current_period_revenue - prior_period_revenue) / prior_period_revenue * 100 + operating_margin_pct",
        "unit": "score",
        "good_direction": "higher (>= 40 is healthy)",
    },
}


def lambda_handler(event, context):
    action_group = event.get("actionGroup", "")
    function_name = event.get("function", "")
    params = {p["name"]: p["value"] for p in event.get("parameters", [])}

    try:
        if function_name == "describe_metric":
            result = describe_metric(params.get("metric_name", ""))
        elif function_name == "list_metrics":
            result = list_metrics()
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


def describe_metric(metric_name: str) -> dict:
    if not metric_name:
        return {"error": "metric_name is required"}

    key = metric_name.lower().replace(" ", "_").replace("-", "_")
    # Try exact match first, then partial
    if key in METRIC_GLOSSARY:
        return METRIC_GLOSSARY[key]

    # Partial match
    matches = {k: v for k, v in METRIC_GLOSSARY.items() if key in k or key in v["name"].lower()}
    if len(matches) == 1:
        return list(matches.values())[0]
    if matches:
        return {"suggestions": list(matches.keys()), "message": f"Found {len(matches)} partial matches"}

    return {
        "error": f"Metric '{metric_name}' not found",
        "available_metrics": list(METRIC_GLOSSARY.keys()),
    }


def list_metrics() -> dict:
    return {
        "metrics": [
            {"key": k, "name": v["name"], "table": v["table"]}
            for k, v in METRIC_GLOSSARY.items()
        ]
    }
