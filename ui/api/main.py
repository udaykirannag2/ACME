"""
ACME Finance Analytics API — Phase 7
FastAPI server exposing:
  /chat            → Bedrock Agent (NLP-to-SQL)
  /metrics/pl      → P&L summary by entity / fiscal period
  /metrics/arr     → ARR waterfall (new, expansion, contraction, churn)
  /metrics/ar_aging → AR aging buckets
  /metrics/revenue  → Revenue by entity and segment
"""
import uuid
import boto3
from botocore.config import Config
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from ui.api import config
from ui.api.redshift import query

app = FastAPI(title="ACME Finance Analytics API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Bedrock agent client (lazy, module-level) ─────────────────────────────────

_agent_client = None


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


# ── Chat ──────────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    question: str
    session_id: str | None = None


class ChatResponse(BaseModel):
    answer: str
    session_id: str


@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    session_id = req.session_id or f"sess-{uuid.uuid4().hex[:12]}"
    client = _get_agent_client()
    try:
        response = client.invoke_agent(
            agentId=config.BEDROCK_AGENT_ID,
            agentAliasId=config.BEDROCK_AGENT_ALIAS_ID,
            sessionId=session_id,
            inputText=req.question,
        )
        answer = ""
        for event in response["completion"]:
            if "chunk" in event:
                answer += event["chunk"]["bytes"].decode("utf-8")
        return ChatResponse(answer=answer, session_id=session_id)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


# ── P&L ───────────────────────────────────────────────────────────────────────

@app.get("/metrics/pl")
def get_pl(fiscal_year: int | None = None, entity_id: str | None = None):
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
def get_arr(fiscal_year: int | None = None):
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
def get_ar_aging(fiscal_year: int | None = None):
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
def get_revenue(fiscal_year: int | None = None, entity_id: str | None = None):
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
