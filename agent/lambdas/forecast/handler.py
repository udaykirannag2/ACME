"""
forecast Lambda — driver-based SaaS revenue and expense projection.

Uses an ARR cohort model:
  1. Compute tier-specific retention/expansion/churn rates from trailing 4 quarters
  2. Blend new-logo ACV from pipeline + historical run-rate
  3. Roll forward ARR by tier for N months
  4. Derive revenue (ARR/12), expenses (revenue × opex ratios), operating income

Replaces the earlier OLS linear trend approach with a proper SaaS driver model.
"""
import json
import time
import boto3
from collections import defaultdict

WORKGROUP = "acme-finance-dev"
DATABASE = "dev"
REGION = "us-east-1"

# Tiers in display order
TIERS = ("enterprise", "commercial", "smb")

# Default scenario (no overrides)
DEFAULT_SCENARIO = {
    "churn_pct_multiplier": 1.0,
    "contraction_pct_multiplier": 1.0,
    "expansion_pct_multiplier": 1.0,
    "new_logo_pct_change": 0.0,
}

# Entity-to-region mapping for filtering fct_arr via dim_customer
ENTITY_TO_REGION = {"US": "Americas", "EMEA": "EMEA", "APAC": "APAC"}


def lambda_handler(event, context):
    action_group = event.get("actionGroup", "")
    function_name = event.get("function", "")
    params = {p["name"]: p["value"] for p in event.get("parameters", [])}

    try:
        # Parse optional scenario overrides
        scenario = dict(DEFAULT_SCENARIO)
        raw_overrides = params.get("scenario_overrides", "")
        if raw_overrides:
            try:
                overrides = json.loads(raw_overrides)
                for k in DEFAULT_SCENARIO:
                    if k in overrides:
                        scenario[k] = float(overrides[k])
            except (json.JSONDecodeError, ValueError):
                pass

        entity_id = params.get("entity_id")
        periods_ahead = int(params.get("periods_ahead", 12))

        if function_name in ("forecast_revenue", "forecast_expense", "forecast_operating_income"):
            result = _build_driver_forecast(
                metric=function_name.replace("forecast_", ""),
                entity_id=entity_id,
                periods_ahead=periods_ahead,
                scenario=scenario,
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


# =============================================================================
# Core forecast engine
# =============================================================================

def _build_driver_forecast(
    metric: str,
    entity_id: str | None,
    periods_ahead: int,
    scenario: dict,
) -> dict:
    """Build a full driver-based forecast. Returns backward-compatible JSON."""

    entity_filter_arr = ""
    entity_filter_pl = ""
    if entity_id:
        region = ENTITY_TO_REGION.get(entity_id.upper(), entity_id)
        entity_filter_arr = f"AND a.region = '{region}'"
        entity_filter_pl = f"AND entity_id = '{entity_id}'"

    # ── Query 1: ARR bridge rates by tier (trailing 4 quarters) ──────────
    arr_sql = f"""
        WITH t4q AS (
            SELECT DISTINCT period_yyyymm
            FROM analytics_dev_marts.fct_arr
            ORDER BY period_yyyymm DESC
            LIMIT 12
        ),
        last_period AS (
            SELECT MAX(period_yyyymm) AS max_period
            FROM analytics_dev_marts.fct_arr
        ),
        movements AS (
            SELECT
                a.segment_tier,
                a.movement_type,
                SUM(a.arr_change)   AS total_arr_change,
                SUM(a.starting_arr) AS total_starting_arr
            FROM analytics_dev_marts.fct_arr a
            INNER JOIN t4q ON a.period_yyyymm = t4q.period_yyyymm
            WHERE a.movement_type IN ('new','expansion','contraction','churn','renewal')
            {entity_filter_arr}
            GROUP BY a.segment_tier, a.movement_type
        ),
        ending AS (
            SELECT
                a.segment_tier,
                SUM(a.ending_arr) AS tier_ending_arr
            FROM analytics_dev_marts.fct_arr a
            CROSS JOIN last_period lp
            WHERE a.period_yyyymm = lp.max_period
              AND a.movement_type IN ('new','expansion','contraction','churn','renewal')
            {entity_filter_arr}
            GROUP BY a.segment_tier
        )
        SELECT
            COALESCE(m.segment_tier, e.segment_tier) AS segment_tier,
            m.movement_type,
            m.total_arr_change,
            m.total_starting_arr,
            e.tier_ending_arr,
            lp.max_period
        FROM movements m
        FULL OUTER JOIN ending e ON m.segment_tier = e.segment_tier
        CROSS JOIN last_period lp
        ORDER BY segment_tier, movement_type
    """

    # ── Query 2: New logo run-rate by tier ────────────────────────────────
    new_logo_sql = f"""
        WITH t4q AS (
            SELECT DISTINCT period_yyyymm
            FROM analytics_dev_marts.fct_arr
            ORDER BY period_yyyymm DESC
            LIMIT 12
        ),
        new_bookings AS (
            SELECT
                a.segment_tier,
                SUM(a.arr_change)   AS total_new_arr,
                COUNT(DISTINCT a.period_yyyymm) AS n_months
            FROM analytics_dev_marts.fct_arr a
            INNER JOIN t4q ON a.period_yyyymm = t4q.period_yyyymm
            WHERE a.movement_type = 'new'
            {entity_filter_arr}
            GROUP BY a.segment_tier
        ),
        pipeline AS (
            SELECT
                SUM(o.amount * o.probability_pct / 100.0) AS weighted_pipeline_acv
            FROM acme_finance_curated_dev.opportunity o
            WHERE o.stage IN ('prospecting','qualification','proposal','negotiation')
        )
        SELECT
            nb.segment_tier,
            nb.total_new_arr,
            nb.n_months,
            nb.total_new_arr / NULLIF(nb.n_months, 0) AS monthly_new_runrate,
            p.weighted_pipeline_acv
        FROM new_bookings nb
        CROSS JOIN pipeline p
        ORDER BY nb.segment_tier
    """

    # ── Query 3: P&L opex ratios (T4Q) + historical revenue ─────────────
    pl_sql = f"""
        WITH t4q AS (
            SELECT DISTINCT period_yyyymm
            FROM analytics_dev_marts.mart_pl
            WHERE fiscal_year IN (2023, 2024, 2025)
            ORDER BY period_yyyymm DESC
            LIMIT 12
        ),
        ratios AS (
            SELECT
                SUM(total_revenue)    AS t4q_revenue,
                SUM(cogs)             AS t4q_cogs,
                SUM(sales_marketing)  AS t4q_sm,
                SUM(research_dev)     AS t4q_rd,
                SUM(general_admin)    AS t4q_ga,
                SUM(total_opex)       AS t4q_opex,
                SUM(operating_income) AS t4q_oi
            FROM analytics_dev_marts.mart_pl
            WHERE period_yyyymm IN (SELECT period_yyyymm FROM t4q)
            {entity_filter_pl}
        ),
        history AS (
            SELECT
                period_yyyymm,
                SUM(total_revenue) AS revenue
            FROM analytics_dev_marts.mart_pl
            WHERE fiscal_year IN (2023, 2024, 2025)
            {entity_filter_pl}
            GROUP BY period_yyyymm
            ORDER BY period_yyyymm
        )
        SELECT 'ratios' AS qtype, NULL AS period_yyyymm,
               t4q_revenue, t4q_cogs, t4q_sm, t4q_rd, t4q_ga, t4q_opex, t4q_oi,
               NULL AS revenue
        FROM ratios
        UNION ALL
        SELECT 'history' AS qtype, period_yyyymm,
               NULL, NULL, NULL, NULL, NULL, NULL, NULL,
               revenue
        FROM history
        ORDER BY qtype, period_yyyymm
    """

    # Execute queries
    arr_rows = _query_redshift(arr_sql)
    new_logo_rows = _query_redshift(new_logo_sql)
    pl_rows = _query_redshift(pl_sql)

    # ── Parse results ────────────────────────────────────────────────────
    rates_by_tier = _compute_tier_rates(arr_rows, scenario)
    new_logo = _compute_new_logo_projection(new_logo_rows, rates_by_tier, scenario)
    opex_ratios, history = _compute_opex_ratios_and_history(pl_rows)

    # ── Determine last actual period ─────────────────────────────────────
    last_period = 0
    for row in arr_rows:
        mp = row.get("max_period")
        if mp:
            last_period = max(last_period, int(mp))
    if not last_period and history:
        last_period = history[-1][0]

    # ── Roll forward ARR ─────────────────────────────────────────────────
    arr_projection = _roll_forward_arr(
        rates_by_tier, new_logo, last_period, periods_ahead,
    )

    # ── Non-subscription revenue uplift ──────────────────────────────────
    # fct_arr is subscription-only (~88% of revenue). Compute uplift
    # from historical total_revenue vs subscription ARR.
    total_ending_arr = sum(
        r.get("ending_arr", 0) for r in rates_by_tier.values()
    )
    sub_monthly = total_ending_arr / 12 if total_ending_arr else 0
    last_actual_rev = history[-1][1] if history else sub_monthly
    nonsub_ratio = max(0, (last_actual_rev - sub_monthly) / last_actual_rev) if last_actual_rev > 0 else 0.12

    # ── Build projections ────────────────────────────────────────────────
    projections = _compute_pl_projection(arr_projection, opex_ratios, nonsub_ratio)

    # ── Confidence intervals from historical residuals ───────────────────
    resid_std = _compute_residual_std(history, rates_by_tier)
    Z95 = 1.96
    for i, p in enumerate(projections):
        width = resid_std * (1 + 0.02 * (i + 1))
        p["confidence_low"] = round(p["projected_amount"] - Z95 * width, 2)
        p["confidence_high"] = round(p["projected_amount"] + Z95 * width, 2)

    # ── Pick the right metric for output ─────────────────────────────────
    if metric == "expense":
        for p in projections:
            p["projected_amount"] = p.pop("total_expense")
    elif metric == "operating_income":
        for p in projections:
            p["projected_amount"] = p.pop("operating_income_projected")
    else:  # revenue (default)
        pass  # projected_amount is already revenue

    # ── Backward-compatible summary stats ────────────────────────────────
    amounts_hist = [h[1] for h in history]
    last_4_avg = sum(amounts_hist[-4:]) / min(4, len(amounts_hist)) if amounts_hist else 0
    proj_amounts = [p["projected_amount"] for p in projections]
    proj_avg = sum(proj_amounts) / len(proj_amounts) if proj_amounts else 0

    return {
        "metric": metric,
        "entity_id": entity_id or "ALL",
        "method": "driver_based_arr_cohort",
        "last_actual_period": last_period,
        "last_actual_amount": round(history[-1][1], 2) if history else None,
        "last_4_period_avg": round(last_4_avg, 2),
        "projected_4_period_avg": round(proj_avg, 2),
        "growth_vs_recent": round(
            (proj_avg - last_4_avg) / last_4_avg * 100, 2
        ) if last_4_avg else None,
        "history_periods": len(history),
        "residual_std": round(resid_std, 2),
        "confidence_level": 0.95,
        "drivers": {
            "rates_by_tier": {
                tier: {
                    "ending_arr": round(data["ending_arr"], 2),
                    "annual_churn_rate": round(data["annual_churn_rate"], 4),
                    "annual_contraction_rate": round(data["annual_contraction_rate"], 4),
                    "annual_expansion_rate": round(data["annual_expansion_rate"], 4),
                    "nrr": round(data["nrr"], 4),
                    "grr": round(data["grr"], 4),
                }
                for tier, data in rates_by_tier.items()
            },
            "new_logo_monthly_arr": round(
                sum(v for v in new_logo.values()), 2
            ),
            "nonsub_revenue_pct": round(nonsub_ratio * 100, 2),
            "opex_ratios": {k: round(v, 4) for k, v in opex_ratios.items()},
        },
        "scenario": scenario,
        "projections": projections,
        "history": [
            {"period_yyyymm": p, "actual_amount": round(a, 2)}
            for p, a in history
        ],
    }


# =============================================================================
# Helper: compute tier-level ARR rates from query results
# =============================================================================

def _compute_tier_rates(arr_rows: list[dict], scenario: dict) -> dict:
    """Parse ARR bridge query results into annual rates by tier."""
    tier_data: dict[str, dict] = {}

    for row in arr_rows:
        tier = row.get("segment_tier")
        if not tier:
            continue
        if tier not in tier_data:
            tier_data[tier] = {
                "ending_arr": 0,
                "movements": {},
                "total_starting_arr": 0,
            }

        ending = row.get("tier_ending_arr")
        if ending is not None:
            tier_data[tier]["ending_arr"] = float(ending)

        mt = row.get("movement_type")
        if mt:
            tier_data[tier]["movements"][mt] = float(row.get("total_arr_change") or 0)
            starting = float(row.get("total_starting_arr") or 0)
            if starting > tier_data[tier]["total_starting_arr"]:
                tier_data[tier]["total_starting_arr"] = starting

    result = {}
    for tier in TIERS:
        data = tier_data.get(tier, {})
        starting = data.get("total_starting_arr", 0)
        movements = data.get("movements", {})

        if starting > 0:
            churn_rate = abs(movements.get("churn", 0)) / starting
            contraction_rate = abs(movements.get("contraction", 0)) / starting
            expansion_rate = movements.get("expansion", 0) / starting
        else:
            churn_rate = 0.05
            contraction_rate = 0.03
            expansion_rate = 0.10

        # Apply scenario overrides
        churn_rate *= scenario.get("churn_pct_multiplier", 1.0)
        contraction_rate *= scenario.get("contraction_pct_multiplier", 1.0)
        expansion_rate *= scenario.get("expansion_pct_multiplier", 1.0)

        grr = 1.0 - churn_rate - contraction_rate
        nrr = grr + expansion_rate

        result[tier] = {
            "ending_arr": data.get("ending_arr", 0),
            "annual_churn_rate": churn_rate,
            "annual_contraction_rate": contraction_rate,
            "annual_expansion_rate": expansion_rate,
            "monthly_churn_rate": churn_rate / 12,
            "monthly_contraction_rate": contraction_rate / 12,
            "monthly_expansion_rate": expansion_rate / 12,
            "grr": grr,
            "nrr": nrr,
        }

    return result


# =============================================================================
# Helper: compute new logo projection
# =============================================================================

def _compute_new_logo_projection(
    new_logo_rows: list[dict],
    rates_by_tier: dict,
    scenario: dict,
) -> dict:
    """Compute monthly new-logo ACV by tier."""
    tier_runrate: dict[str, float] = {}
    pipeline_total = 0.0

    for row in new_logo_rows:
        tier = row.get("segment_tier")
        if tier:
            runrate = float(row.get("monthly_new_runrate") or 0)
            tier_runrate[tier] = runrate
        pipeline = row.get("weighted_pipeline_acv")
        if pipeline is not None:
            pipeline_total = float(pipeline)

    # Apply scenario override
    pct_change = scenario.get("new_logo_pct_change", 0.0)
    multiplier = 1.0 + (pct_change / 100.0)

    result = {}
    for tier in TIERS:
        result[tier] = tier_runrate.get(tier, 0) * multiplier

    # Store pipeline for potential near-term blending
    result["_pipeline_total"] = pipeline_total * multiplier

    return result


# =============================================================================
# Helper: compute opex ratios and history
# =============================================================================

def _compute_opex_ratios_and_history(pl_rows: list[dict]) -> tuple[dict, list]:
    """Parse P&L query results into opex ratios and revenue history."""
    ratios = {"cogs_pct": 0.25, "sm_pct": 0.42, "rd_pct": 0.15, "ga_pct": 0.08}
    history = []

    for row in pl_rows:
        qtype = row.get("qtype")
        if qtype == "ratios":
            rev = float(row.get("t4q_revenue") or 0)
            if rev > 0:
                ratios["cogs_pct"] = float(row.get("t4q_cogs") or 0) / rev
                ratios["sm_pct"] = float(row.get("t4q_sm") or 0) / rev
                ratios["rd_pct"] = float(row.get("t4q_rd") or 0) / rev
                ratios["ga_pct"] = float(row.get("t4q_ga") or 0) / rev
        elif qtype == "history":
            period = int(row.get("period_yyyymm") or 0)
            revenue = float(row.get("revenue") or 0)
            if period:
                history.append((period, revenue))

    history.sort()
    return ratios, history


# =============================================================================
# Helper: roll forward ARR by tier
# =============================================================================

def _roll_forward_arr(
    rates_by_tier: dict,
    new_logo: dict,
    last_period: int,
    periods_ahead: int,
) -> list[dict]:
    """Roll forward ARR for each tier over N months."""
    # Initialize current ARR by tier
    current_arr = {tier: data["ending_arr"] for tier, data in rates_by_tier.items()}

    # Pipeline blending: months 1-3 use pipeline, months 4+ use run-rate
    pipeline_total = new_logo.get("_pipeline_total", 0)
    tier_shares = {}
    total_runrate = sum(new_logo.get(t, 0) for t in TIERS)
    for tier in TIERS:
        tier_shares[tier] = (new_logo.get(tier, 0) / total_runrate) if total_runrate > 0 else (1 / len(TIERS))

    # Advance period
    last_year = last_period // 100
    last_month = last_period % 100

    projections = []
    for i in range(1, periods_ahead + 1):
        next_month = last_month + i
        next_year = last_year + (next_month - 1) // 12
        next_month = ((next_month - 1) % 12) + 1
        next_period = next_year * 100 + next_month

        month_detail = {"period_yyyymm": next_period, "tiers": {}}
        total_ending = 0

        for tier in TIERS:
            starting = current_arr[tier]
            rates = rates_by_tier[tier]

            churn_amt = -(starting * rates["monthly_churn_rate"])
            contraction_amt = -(starting * rates["monthly_contraction_rate"])
            expansion_amt = starting * rates["monthly_expansion_rate"]

            # Blend new logo: pipeline-weighted for months 1-3, run-rate for 4+
            if i <= 3 and pipeline_total > 0:
                # Spread pipeline over 3 months, blend 70/30 with run-rate
                pipeline_monthly = (pipeline_total / 3) * tier_shares[tier]
                runrate = new_logo.get(tier, 0)
                new_amt = pipeline_monthly * 0.7 + runrate * 0.3
            else:
                new_amt = new_logo.get(tier, 0)

            ending = starting + churn_amt + contraction_amt + expansion_amt + new_amt

            month_detail["tiers"][tier] = {
                "starting_arr": round(starting, 2),
                "churn": round(churn_amt, 2),
                "contraction": round(contraction_amt, 2),
                "expansion": round(expansion_amt, 2),
                "new": round(new_amt, 2),
                "ending_arr": round(ending, 2),
            }

            current_arr[tier] = ending
            total_ending += ending

        month_detail["total_ending_arr"] = round(total_ending, 2)
        projections.append(month_detail)

    return projections


# =============================================================================
# Helper: compute full P&L projection from ARR
# =============================================================================

def _compute_pl_projection(
    arr_projections: list[dict],
    opex_ratios: dict,
    nonsub_ratio: float,
) -> list[dict]:
    """Convert ARR projections to full P&L forecasts."""
    result = []

    for month in arr_projections:
        sub_revenue = month["total_ending_arr"] / 12
        total_revenue = sub_revenue / (1 - nonsub_ratio) if nonsub_ratio < 1 else sub_revenue

        cogs = total_revenue * opex_ratios["cogs_pct"]
        gross_profit = total_revenue - cogs
        sm = total_revenue * opex_ratios["sm_pct"]
        rd = total_revenue * opex_ratios["rd_pct"]
        ga = total_revenue * opex_ratios["ga_pct"]
        total_opex = sm + rd + ga
        operating_income = gross_profit - total_opex

        result.append({
            "period_yyyymm": month["period_yyyymm"],
            "projected_amount": round(total_revenue, 2),
            "total_expense": round(cogs + total_opex, 2),
            "operating_income_projected": round(operating_income, 2),
            "arr_ending": month["total_ending_arr"],
            "arr_bridge": month["tiers"],
            "pl_breakdown": {
                "revenue": round(total_revenue, 2),
                "cogs": round(cogs, 2),
                "gross_profit": round(gross_profit, 2),
                "sales_marketing": round(sm, 2),
                "research_dev": round(rd, 2),
                "general_admin": round(ga, 2),
                "total_opex": round(total_opex, 2),
                "operating_income": round(operating_income, 2),
            },
        })

    return result


# =============================================================================
# Helper: compute residual std from historical back-cast
# =============================================================================

def _compute_residual_std(history: list[tuple], rates_by_tier: dict) -> float:
    """Estimate residual std from historical revenue volatility.

    Uses coefficient of variation of trailing monthly revenue as a proxy,
    since we can't back-cast the driver model without full historical ARR
    positions for each month.
    """
    if len(history) < 4:
        return 0

    amounts = [h[1] for h in history[-12:]]  # last 12 months
    n = len(amounts)
    mean = sum(amounts) / n
    if mean == 0:
        return 0
    variance = sum((a - mean) ** 2 for a in amounts) / max(1, n - 1)
    return variance ** 0.5


# =============================================================================
# Redshift Data API helper (unchanged)
# =============================================================================

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
