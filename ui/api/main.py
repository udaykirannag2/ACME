"""
ACME Finance Analytics API — Phase 10
FastAPI server exposing:
  /chat            → Bedrock Agent (NLP-to-SQL) + AgentCore SEMANTIC memory
  /commentary      → AI-generated CFO board-pack commentary
  /metrics/pl      → P&L summary by entity / fiscal period
  /metrics/arr     → ARR waterfall (new, expansion, contraction, churn)
  /metrics/ar_aging → AR aging buckets
  /metrics/revenue  → Revenue by entity and segment
"""
import base64
import logging
import threading
import uuid
from collections import defaultdict
from datetime import datetime, timezone
import boto3
from botocore.config import Config
from botocore.exceptions import ClientError
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from ui.api import config
from ui.api.auth import require_admin, require_any_role, require_auth
from ui.api.redshift import query
from ui.api.boardpack import generate_boardpack_pdf

logger = logging.getLogger(__name__)

app = FastAPI(title="ACME Finance Analytics API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*", "Authorization"],
)


@app.on_event("startup")
def _warm_redshift():
    """Fire a trivial query so Redshift Serverless wakes up while the API starts.
    The workgroup auto-pauses when idle; the first real query can wait 30-60 s
    for the cluster to resume.  This background warmup amortises that cost.
    """
    def _run():
        try:
            query("SELECT 1")
            logger.info("Redshift warmup complete")
        except Exception as exc:  # noqa: BLE001
            logger.info("Redshift warmup skipped: %s", exc)
    threading.Thread(target=_run, daemon=True).start()

# ── Boto3 clients (lazy, module-level) ───────────────────────────────────────

_agent_client = None
_memory_client = None


def _get_agent_client():
    global _agent_client
    if _agent_client is None:
        session = boto3.Session(
            profile_name=config.AWS_PROFILE, region_name=config.AWS_REGION
        )
        _agent_client = session.client(
            "bedrock-agent-runtime",
            config=Config(read_timeout=300, connect_timeout=10),
        )
    return _agent_client


def _get_memory_client():
    """Lazy client for AgentCore Memory runtime (read/write semantic records)."""
    global _memory_client
    if _memory_client is None:
        session = boto3.Session(
            profile_name=config.AWS_PROFILE, region_name=config.AWS_REGION
        )
        _memory_client = session.client(
            "bedrock-agentcore",
            config=Config(read_timeout=30, connect_timeout=10),
        )
    return _memory_client


def _retrieve_memories(namespace: str, query_text: str) -> str:
    """
    Retrieve top-K semantically relevant memories for a user + query.
    Returns a formatted context string, or "" if none found or on error.
    """
    if not namespace:
        return ""
    try:
        resp = _get_memory_client().retrieve_memory_records(
            memoryId=config.AGENTCORE_MEMORY_ID,
            namespace=namespace,
            searchCriteria={"searchQuery": query_text[:500]},
        )
        records = resp.get("memoryRecordSummaries", [])
        if not records:
            return ""
        # Keep top-K by score (already ranked), format as bullet list
        top = records[: config.AGENTCORE_MEMORY_TOP_K]
        lines = "\n".join(f"- {r['content']['text']}" for r in top)
        return f"Relevant context from previous sessions:\n{lines}\n\n"
    except ClientError as e:
        logger.warning("AgentCore Memory retrieve failed: %s", e)
        return ""


def _store_memory(namespace: str, question: str, answer: str) -> None:
    """
    Persist a Q&A exchange to AgentCore SEMANTIC memory for future sessions.
    Truncates answer to 800 chars to stay within record size limits.
    Runs fire-and-forget; errors are logged, not raised.
    """
    if not namespace:
        return
    text = f"Q: {question[:300]}\nA: {answer[:800]}"
    try:
        _get_memory_client().batch_create_memory_records(
            memoryId=config.AGENTCORE_MEMORY_ID,
            records=[{
                "requestIdentifier": f"chat-{uuid.uuid4().hex[:12]}",
                "namespaces": [namespace],
                "content": {"text": text},
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "memoryStrategyId": config.AGENTCORE_STRATEGY_ID,
            }],
        )
    except ClientError as e:
        logger.warning("AgentCore Memory store failed: %s", e)


# ── Chat ──────────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    question: str
    session_id: str | None = None
    # memory_id is a stable per-user identifier for cross-session recall.
    # Leave None to use the default AgentCore memory for all users (single-tenant dev).
    memory_id: str | None = None


class ChatResponse(BaseModel):
    answer: str
    session_id: str
    memory_id: str | None = None


@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest, _user: dict = Depends(require_any_role)):
    session_id = req.session_id or f"sess-{uuid.uuid4().hex[:12]}"
    # memory_id is a stable per-user identifier (e.g. "user-abc123").
    # Used to namespace AgentCore SEMANTIC memory (cross-session, persistent)
    # AND passed as Bedrock Agent memoryId (24-hr built-in session context).
    memory_id = req.memory_id
    client = _get_agent_client()
    try:
        # ── Step 1: retrieve relevant past context from AgentCore Memory ──────
        memory_context = _retrieve_memories(memory_id, req.question)
        input_text = f"{memory_context}{req.question}" if memory_context else req.question

        invoke_kwargs: dict = dict(
            agentId=config.BEDROCK_AGENT_ID,
            agentAliasId=config.BEDROCK_AGENT_ALIAS_ID,
            sessionId=session_id,
            inputText=input_text,
        )
        # Pass per-user memoryId for Bedrock Agent's built-in short-term memory
        # Allowed pattern: [0-9a-zA-Z._:-]+  — no slashes or ARNs
        if memory_id:
            invoke_kwargs["memoryId"] = memory_id
        response = client.invoke_agent(**invoke_kwargs)
        answer = ""
        for event in response["completion"]:
            if "chunk" in event:
                answer += event["chunk"]["bytes"].decode("utf-8")

        # ── Step 2: persist this exchange to AgentCore SEMANTIC memory ────────
        # Fire-and-forget — memory write must not block the HTTP response.
        threading.Thread(
            target=_store_memory,
            args=(memory_id, req.question, answer),
            daemon=True,
        ).start()

        return ChatResponse(answer=answer, session_id=session_id, memory_id=memory_id)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/chat/stream")
def chat_stream(question: str, session_id: str, memory_id: str | None = None, _user: dict = Depends(require_any_role)):
    """Server-Sent Events stream — yields Bedrock Agent chunks as they arrive.
    The client sees text token-by-token rather than waiting for the full answer.
    """
    client = _get_agent_client()

    def generate():
        try:
            memory_context = _retrieve_memories(memory_id, question)
            input_text = f"{memory_context}{question}" if memory_context else question

            invoke_kwargs: dict = dict(
                agentId=config.BEDROCK_AGENT_ID,
                agentAliasId=config.BEDROCK_AGENT_ALIAS_ID,
                sessionId=session_id,
                inputText=input_text,
            )
            if memory_id:
                invoke_kwargs["memoryId"] = memory_id

            response = client.invoke_agent(**invoke_kwargs)
            full_answer = ""
            for event in response["completion"]:
                if "chunk" in event:
                    chunk_text = event["chunk"]["bytes"].decode("utf-8")
                    full_answer += chunk_text
                    yield chunk_text

            # Persist after all chunks — fire-and-forget
            threading.Thread(
                target=_store_memory,
                args=(memory_id, question, full_answer),
                daemon=True,
            ).start()

        except Exception as exc:  # noqa: BLE001
            yield f"\n\n⚠️ Error: {exc}"

    return StreamingResponse(generate(), media_type="text/plain")


# ── P&L ───────────────────────────────────────────────────────────────────────

@app.get("/metrics/pl")
def get_pl(fiscal_year: int | None = None, entity_id: str | None = None, _user: dict = Depends(require_any_role)):
    where = _build_where(fiscal_year=fiscal_year, entity_id=entity_id)
    sql = f"""
        SELECT
            entity_id,
            fiscal_year,
            fiscal_quarter,
            period_yyyymm,
            total_revenue,
            cogs,
            gross_profit,
            ROUND(gross_margin_pct * 100, 2)    AS gross_margin_pct,
            sales_marketing,
            research_dev,
            general_admin,
            total_opex,
            operating_income,
            ROUND(operating_margin_pct * 100, 2) AS operating_margin_pct
        FROM {config.MARTS_SCHEMA}.mart_pl
        {where}
        ORDER BY entity_id, fiscal_year, fiscal_quarter
    """
    return query(sql)


# ── ARR ───────────────────────────────────────────────────────────────────────

@app.get("/metrics/arr")
def get_arr(fiscal_year: int | None = None, _user: dict = Depends(require_any_role)):
    where = _build_where(fiscal_year=fiscal_year)
    sql = f"""
        SELECT
            period_yyyymm,
            fiscal_year,
            movement_type,
            SUM(arr_change)   AS arr_change,
            COUNT(*)          AS movement_count
        FROM {config.MARTS_SCHEMA}.fct_arr
        {where}
        GROUP BY period_yyyymm, fiscal_year, movement_type
        ORDER BY period_yyyymm, movement_type
    """
    return query(sql)


# ── AR Aging ──────────────────────────────────────────────────────────────────

@app.get("/metrics/ar_aging")
def get_ar_aging(fiscal_year: int | None = None, _user: dict = Depends(require_any_role)):
    where = _build_where(fiscal_year=fiscal_year, table_alias="a")
    sql = f"""
        SELECT
            a.aging_bucket,
            a.segment_tier,
            COUNT(*)              AS invoice_count,
            SUM(a.amount)         AS total_amount,
            AVG(a.days_overdue)   AS avg_days_overdue
        FROM {config.MARTS_SCHEMA}.mart_ar_aging a
        {where}
        GROUP BY a.aging_bucket, a.segment_tier
        ORDER BY a.aging_bucket, a.segment_tier
    """
    return query(sql)


# ── Revenue ───────────────────────────────────────────────────────────────────

@app.get("/metrics/revenue")
def get_revenue(fiscal_year: int | None = None, entity_id: str | None = None, _user: dict = Depends(require_any_role)):
    where = _build_where(fiscal_year=fiscal_year, entity_id=entity_id)
    sql = f"""
        SELECT
            entity_id,
            segment,
            fiscal_year,
            fiscal_quarter,
            period_yyyymm,
            revenue_amount
        FROM {config.MARTS_SCHEMA}.fct_revenue
        {where}
        ORDER BY entity_id, period_yyyymm
    """
    return query(sql)


# ── Forecast ─────────────────────────────────────────────────────────────────


@app.get("/metrics/forecast")
def get_forecast(
    metric: str = "revenue",
    entity_id: str | None = None,
    periods_ahead: int = 6,
    _user: dict = Depends(require_any_role),
):
    return _run_forecast(metric, entity_id, periods_ahead)


def _run_forecast(metric: str, entity_id: str | None, periods_ahead: int) -> dict:
    safe_entity = entity_id.upper().replace("'", "") if entity_id else None
    entity_filter = f"AND entity_id = '{safe_entity}'" if safe_entity else ""

    if metric == "revenue":
        sql = f"""
            SELECT period_yyyymm, SUM(revenue_amount) AS amount
            FROM {config.MARTS_SCHEMA}.fct_revenue
            WHERE 1=1 {entity_filter}
            GROUP BY period_yyyymm
            ORDER BY period_yyyymm
        """
    elif metric == "expense":
        sql = f"""
            SELECT period_yyyymm, SUM(expense_amount) AS amount
            FROM {config.MARTS_SCHEMA}.fct_expense
            WHERE 1=1 {entity_filter}
            GROUP BY period_yyyymm
            ORDER BY period_yyyymm
        """
    elif metric == "operating_income":
        sql = f"""
            SELECT period_yyyymm, SUM(operating_income) AS amount
            FROM {config.MARTS_SCHEMA}.mart_pl
            WHERE 1=1 {entity_filter}
            GROUP BY period_yyyymm
            ORDER BY period_yyyymm
        """
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown metric '{metric}'. Valid values: revenue, expense, operating_income."
        )

    rows = query(sql)
    if not rows:
        raise HTTPException(status_code=404, detail="No historical data found")

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

    # Seasonal factors (12-month cycle)
    seasonal_adj: dict = defaultdict(float)
    seasonal_count: dict = defaultdict(int)
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
        "entity_id": safe_entity or "ALL",
        "fiscal_year": history[-1][0] // 100 if history else None,
        "periods_ahead": periods_ahead,
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


# ── Anomalies ─────────────────────────────────────────────────────────────────


@app.get("/metrics/anomalies")
def get_anomalies(
    fiscal_year: int = 2024,
    period_yyyymm: str | None = None,
    entity_id: str | None = None,
    _user: dict = Depends(require_any_role),
):
    try:
        return _scan_anomalies_direct(fiscal_year, period_yyyymm, entity_id)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


def _scan_anomalies_direct(fiscal_year: int, period_yyyymm: str | None, entity_id: str | None) -> dict:
    safe_entity = entity_id.upper().replace("'", "") if entity_id else None
    findings = []
    findings.extend(_anomaly_aged_ar(fiscal_year, safe_entity))
    findings.extend(_anomaly_ap_spike(fiscal_year, period_yyyymm, safe_entity))
    findings.extend(_anomaly_disposal_loss(fiscal_year, safe_entity))
    findings.extend(_anomaly_forecast_variance(fiscal_year, period_yyyymm, safe_entity))
    order = {"high": 0, "medium": 1, "low": 2}
    findings.sort(key=lambda f: order.get(f["severity"], 9))
    return {
        "anomalies": findings,
        "scan_period": period_yyyymm or f"FY{fiscal_year}",
        "entity_filter": safe_entity or "ALL",
        "total_count": len(findings),
        "high_severity":   sum(1 for f in findings if f["severity"] == "high"),
        "medium_severity": sum(1 for f in findings if f["severity"] == "medium"),
        "low_severity":    sum(1 for f in findings if f["severity"] == "low"),
    }


def _anomaly_aged_ar(fiscal_year: int, entity_id: str | None) -> list:
    # mart_ar_aging is aggregated at the aging-bucket level — no entity_id column.
    # Entity filtering is not available for AR aging anomalies; results span all entities.
    sql = f"""
        SELECT customer_name, amount, days_overdue, aging_bucket, segment_tier, invoice_number
        FROM {config.MARTS_SCHEMA}.mart_ar_aging
        WHERE fiscal_year = {fiscal_year}
          AND days_overdue > 90
          AND amount > 500000
        ORDER BY amount DESC
        LIMIT 20
    """
    rows = query(sql)
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


def _anomaly_ap_spike(fiscal_year: int, period_yyyymm: str | None, entity_id: str | None) -> list:
    entity_filter_clause = f"AND entity_id = '{entity_id}'" if entity_id else ""
    period_filter_clause = f"AND period_yyyymm = '{period_yyyymm}'" if period_yyyymm else ""
    sql = f"""
        WITH monthly AS (
            SELECT entity_id, pnl_rollup, period_yyyymm,
                   SUM(net_amount) AS month_amount
            FROM {config.MARTS_SCHEMA}.fct_gl_entries
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
    rows = query(sql)
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


def _anomaly_disposal_loss(fiscal_year: int, entity_id: str | None) -> list:
    entity_filter_clause = f"AND entity_id = '{entity_id}'" if entity_id else ""
    sql = f"""
        SELECT entity_id, account_name, posting_date, period_yyyymm,
               SUM(net_amount) AS total_loss, COUNT(*) AS journal_lines
        FROM {config.MARTS_SCHEMA}.fct_gl_entries
        WHERE fiscal_year = {fiscal_year}
          AND account_name ILIKE '%Loss on Disposal%'
          AND net_amount > 0
          {entity_filter_clause}
        GROUP BY entity_id, account_name, posting_date, period_yyyymm
        ORDER BY total_loss DESC
        LIMIT 10
    """
    rows = query(sql)
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


def _anomaly_forecast_variance(fiscal_year: int, period_yyyymm: str | None, entity_id: str | None) -> list:
    entity_filter_a = f"AND entity_id = '{entity_id}'" if entity_id else ""
    entity_filter_p = f"AND entity_id = '{entity_id}'" if entity_id else ""
    # period_yyyymm filter inside the actuals CTE — no table alias prefix needed there
    period_filter_clause = f"AND period_yyyymm = '{period_yyyymm}'" if period_yyyymm else ""
    sql = f"""
        WITH actuals AS (
            SELECT entity_id, account_id, account_name, pnl_rollup, period_yyyymm,
                   SUM(CASE WHEN is_revenue THEN -net_amount ELSE net_amount END) AS actual_amount
            FROM {config.MARTS_SCHEMA}.fct_gl_entries
            WHERE fiscal_year = {fiscal_year}
              AND (is_revenue = true OR is_expense = true)
              {entity_filter_a}
              {period_filter_clause}
            GROUP BY entity_id, account_id, account_name, pnl_rollup, period_yyyymm
        ),
        plan AS (
            SELECT entity_id, account_id, period_yyyymm,
                   SUM(amount) AS plan_amount
            FROM analytics_dev_staging.stg_epm__plan_line
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
    rows = query(sql)
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


# ── Commentary ────────────────────────────────────────────────────────────────

# Maps YYYYMM → "Month YYYY" for prompt clarity
_MONTH_NAMES = {
    "01": "January", "02": "February", "03": "March", "04": "April",
    "05": "May", "06": "June", "07": "July", "08": "August",
    "09": "September", "10": "October", "11": "November", "12": "December",
}


class CommentaryRequest(BaseModel):
    period: str          # YYYYMM e.g. "202409"
    entity: str = "ALL"  # US | EMEA | APAC | ALL
    memory_id: str | None = None
    extra_context: str | None = None  # optional analyst notes to include


class CommentaryResponse(BaseModel):
    commentary: str
    period: str
    entity: str
    session_id: str


@app.post("/commentary", response_model=CommentaryResponse)
def generate_commentary(req: CommentaryRequest, _user: dict = Depends(require_admin)):
    """
    Invoke the Bedrock Agent with a structured board-pack commentary prompt.
    The agent calls variance_rca + text_to_sql, then drafts a CFO-ready narrative.
    """
    period = req.period.strip()
    entity = req.entity.strip().upper()
    month_label = _MONTH_NAMES.get(period[4:6], period[4:6]) + " " + period[:4] if len(period) == 6 else period
    entity_label = "All Entities" if entity == "ALL" else entity

    entity_filter = "" if entity == "ALL" else f" for the {entity} entity"
    extra = f"\n\nAdditional analyst context: {req.extra_context}" if req.extra_context else ""

    prompt = f"""You are drafting the Finance section of the ACME board pack for {month_label}{entity_filter}.

Follow these steps in order:

Step 1 — Call variance_rca to get the top 5 budget variances{entity_filter} for period {period}.

Step 2 — Call text_to_sql with this query:
SELECT metric, actual, plan, variance, variance_pct
FROM mart_pl
WHERE period_yyyymm = '{period}'{f" AND entity_id = '{entity}'" if entity != "ALL" else ""}
ORDER BY ABS(variance_pct) DESC
LIMIT 20

Step 3 — Draft a concise management commentary covering:
  a) Revenue: actual vs plan, key drivers, any seasonality
  b) Gross margin: actual %, vs plan %, notable cost-of-delivery movements
  c) Operating expenses: call out the top 2–3 variance drivers by name and $M amount
  d) Operating margin: actual %, vs plan %, vs prior period trend
  e) Forward outlook: one sentence on key risks or opportunities for the next period

Formatting rules:
- 4 paragraphs, each 100–150 words
- Board-level language: specific, professional, no filler phrases
- All dollar amounts in $M rounded to 1 decimal place
- All percentages to 1 decimal place
- Reference specific cost centers, accounts, or entities from the variance_rca output
- Return ONLY the commentary text — no headers, no bullets, no markdown formatting{extra}"""

    session_id = f"commentary-{period}-{uuid.uuid4().hex[:8]}"
    client = _get_agent_client()
    try:
        invoke_kwargs: dict = dict(
            agentId=config.BEDROCK_AGENT_ID,
            agentAliasId=config.BEDROCK_AGENT_ALIAS_ID,
            sessionId=session_id,
            inputText=prompt,
        )
        if req.memory_id:
            invoke_kwargs["memoryId"] = req.memory_id
        response = client.invoke_agent(**invoke_kwargs)
        commentary = ""
        for event in response["completion"]:
            if "chunk" in event:
                commentary += event["chunk"]["bytes"].decode("utf-8")
        return CommentaryResponse(
            commentary=commentary.strip(),
            period=period,
            entity=entity_label,
            session_id=session_id,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


# ── Board Pack ────────────────────────────────────────────────────────────────

class BoardPackRequest(BaseModel):
    period: str           # YYYYMM
    entity: str = "ALL"
    memory_id: str | None = None


class BoardPackResponse(BaseModel):
    pdf_base64: str
    filename: str
    period: str
    entity: str


@app.post("/boardpack", response_model=BoardPackResponse)
def generate_boardpack(req: BoardPackRequest, _user: dict = Depends(require_admin)):
    """
    Assemble a full CFO board pack PDF for the requested period and entity.
    Steps:
      1. Fetch P&L, ARR, and AR Aging data directly via Redshift query().
      2. Generate management commentary via the Bedrock Agent.
      3. Render the PDF with reportlab and return it as base64.
    """
    period = req.period.strip()
    entity = req.entity.strip().upper()
    month_label = (
        _MONTH_NAMES.get(period[4:6], period[4:6]) + " " + period[:4]
        if len(period) == 6
        else period
    )
    entity_label = "All Entities" if entity == "ALL" else entity

    # ── Step 1a: P&L data ─────────────────────────────────────────────────────
    entity_clause = f"AND entity_id = '{entity}'" if entity != "ALL" else ""
    pl_sql = f"""
        SELECT
            entity_id,
            fiscal_year,
            fiscal_quarter,
            period_yyyymm,
            total_revenue,
            cogs,
            gross_profit,
            ROUND(gross_margin_pct * 100, 2)     AS gross_margin_pct,
            sales_marketing,
            research_dev,
            general_admin,
            total_opex,
            operating_income,
            ROUND(operating_margin_pct * 100, 2)  AS operating_margin_pct
        FROM {config.MARTS_SCHEMA}.mart_pl
        WHERE period_yyyymm = {int(period)}
        {entity_clause}
        ORDER BY entity_id
    """
    try:
        pl_data = query(pl_sql)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"P&L query failed: {exc}") from exc

    # ── Step 1b: ARR data ─────────────────────────────────────────────────────
    arr_sql = f"""
        SELECT
            period_yyyymm,
            fiscal_year,
            movement_type,
            SUM(arr_change)  AS arr_change,
            COUNT(*)         AS movement_count
        FROM {config.MARTS_SCHEMA}.fct_arr
        WHERE period_yyyymm = {int(period)}
        GROUP BY period_yyyymm, fiscal_year, movement_type
        ORDER BY movement_type
    """
    try:
        arr_data = query(arr_sql)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"ARR query failed: {exc}") from exc

    # ── Step 1c: AR Aging data ────────────────────────────────────────────────
    # mart_ar_aging has fiscal_year, not period_yyyymm — filter by fiscal year extracted from period
    ar_fiscal_year = int(period[:4])
    ar_sql = f"""
        SELECT
            a.aging_bucket,
            a.segment_tier,
            COUNT(*)             AS invoice_count,
            SUM(a.amount)        AS total_amount,
            AVG(a.days_overdue)  AS avg_days_overdue
        FROM {config.MARTS_SCHEMA}.mart_ar_aging a
        WHERE a.fiscal_year = {ar_fiscal_year}
        GROUP BY a.aging_bucket, a.segment_tier
        ORDER BY a.aging_bucket, a.segment_tier
    """
    try:
        ar_data = query(ar_sql)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"AR Aging query failed: {exc}") from exc

    # ── Step 2: Management commentary ─────────────────────────────────────────
    try:
        commentary_resp = generate_commentary(
            CommentaryRequest(period=period, entity=entity, memory_id=req.memory_id),
            _user={},
        )
        commentary_text = commentary_resp.commentary
    except Exception as exc:
        # Commentary failure should not block the PDF — degrade gracefully
        logger.warning("Commentary generation failed for boardpack: %s", exc)
        commentary_text = (
            f"Management commentary for {month_label} ({entity_label}) "
            "could not be generated automatically. Please add narrative manually."
        )

    # ── Step 3: Render PDF ────────────────────────────────────────────────────
    try:
        pdf_bytes = generate_boardpack_pdf(
            period=period,
            entity=entity_label,
            month_label=month_label,
            pl_data=pl_data,
            arr_data=arr_data,
            ar_data=ar_data,
            commentary=commentary_text,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {exc}") from exc

    filename = f"acme_boardpack_{period}_{entity.replace(' ', '_')}.pdf"
    return BoardPackResponse(
        pdf_base64=base64.b64encode(pdf_bytes).decode("ascii"),
        filename=filename,
        period=period,
        entity=entity_label,
    )


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "agent_id": config.BEDROCK_AGENT_ID}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _build_where(
    fiscal_year: int | None = None,
    entity_id: str | None = None,
    table_alias: str = "",
) -> str:
    prefix = f"{table_alias}." if table_alias else ""
    clauses = []
    if fiscal_year:
        clauses.append(f"{prefix}fiscal_year = {int(fiscal_year)}")
    if entity_id:
        safe = entity_id.upper().replace("'", "")
        clauses.append(f"{prefix}entity_id = '{safe}'")
    return ("WHERE " + " AND ".join(clauses)) if clauses else ""
