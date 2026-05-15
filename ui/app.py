"""
ACME Finance Dashboard — Phase 8
Run: streamlit run ui/app.py
"""
import uuid
import requests
import pandas as pd
import plotly.graph_objects as go
import plotly.express as px
import streamlit as st

API_BASE = "http://localhost:8000"

st.set_page_config(
    page_title="ACME Finance",
    page_icon="💰",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ── Sidebar controls ──────────────────────────────────────────────────────────

with st.sidebar:
    st.title("💰 ACME Finance")
    st.caption("AI-powered finance analytics")
    st.divider()
    fiscal_year = st.selectbox("Fiscal Year", [2025, 2024, 2023], index=1)
    entity_filter = st.selectbox("Entity", ["All", "US", "EMEA", "APAC"])
    entity_id = None if entity_filter == "All" else entity_filter
    st.divider()
    st.caption("Phases 0–8 on AWS · dbt + Bedrock AgentCore")

# ── Helpers ───────────────────────────────────────────────────────────────────

@st.cache_data(ttl=300, show_spinner=False)
def fetch(path: str, **params) -> list[dict]:
    params = {k: v for k, v in params.items() if v is not None}
    try:
        r = requests.get(f"{API_BASE}{path}", params=params, timeout=120)
        r.raise_for_status()
        return r.json()
    except Exception as exc:
        st.error(f"API error: {exc}")
        return []


def df(data: list[dict]) -> pd.DataFrame:
    return pd.DataFrame(data) if data else pd.DataFrame()


ENTITY_COLORS = {"US": "#2563eb", "EMEA": "#16a34a", "APAC": "#dc2626"}
BUCKET_ORDER = ["0-30", "31-60", "61-90", "90+"]
MOVEMENT_COLORS = {
    "new": "#16a34a",
    "expansion": "#2563eb",
    "contraction": "#f59e0b",
    "churn": "#dc2626",
}

# ── Tabs ──────────────────────────────────────────────────────────────────────

tab_pl, tab_arr, tab_ar, tab_chat, tab_commentary, tab_boardpack = st.tabs(
    ["📊 P&L", "📈 ARR", "💳 AR Aging", "🤖 AI Analyst", "📝 Commentary", "📋 Board Pack"]
)

# ═══════════════════════════════════════════════════════════════
# P&L Tab
# ═══════════════════════════════════════════════════════════════

with tab_pl:
    st.header(f"P&L Summary — FY{fiscal_year}")
    raw = fetch("/metrics/pl", fiscal_year=fiscal_year, entity_id=entity_id)
    pl = df(raw)

    if pl.empty:
        st.info("No data returned. Check API connection.")
        st.stop()

    # ── KPI cards ──────────────────────────────────────────────
    total = pl.groupby("fiscal_year")[
        ["total_revenue", "gross_profit", "operating_income", "total_opex"]
    ].sum().reset_index()

    rev = total["total_revenue"].iloc[0]
    gp = total["gross_profit"].iloc[0]
    oi = total["operating_income"].iloc[0]
    gm_pct = (gp / rev * 100) if rev else 0
    oi_pct = (oi / rev * 100) if rev else 0

    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Total Revenue", f"${rev/1e6:.1f}M")
    c2.metric("Gross Profit", f"${gp/1e6:.1f}M", f"{gm_pct:.1f}% margin")
    c3.metric("Operating Income", f"${oi/1e6:.1f}M", f"{oi_pct:.1f}% margin")
    c4.metric("Total OpEx", f"${total['total_opex'].iloc[0]/1e6:.1f}M")

    st.divider()

    col_left, col_right = st.columns(2)

    # ── Quarterly revenue by entity ────────────────────────────
    with col_left:
        st.subheader("Revenue by Entity & Quarter")
        qrev = pl.groupby(["entity_id", "fiscal_quarter"])["total_revenue"].sum().reset_index()
        fig = px.bar(
            qrev,
            x="fiscal_quarter",
            y="total_revenue",
            color="entity_id",
            barmode="group",
            color_discrete_map=ENTITY_COLORS,
            labels={"total_revenue": "Revenue ($)", "fiscal_quarter": "Quarter", "entity_id": "Entity"},
        )
        fig.update_yaxes(tickformat="$,.0f")
        fig.update_layout(height=350, margin=dict(t=20))
        st.plotly_chart(fig, use_container_width=True)

    # ── P&L waterfall (full-year) ──────────────────────────────
    with col_right:
        st.subheader("P&L Waterfall (Full Year)")
        s = pl[["total_revenue", "cogs", "gross_profit", "sales_marketing",
                 "research_dev", "general_admin", "operating_income"]].sum()
        labels = ["Revenue", "COGS", "Gross Profit", "S&M", "R&D", "G&A", "Op. Income"]
        values = [s.total_revenue, -s.cogs, s.gross_profit,
                  -s.sales_marketing, -s.research_dev, -s.general_admin, s.operating_income]
        measures = ["absolute", "relative", "total", "relative", "relative", "relative", "total"]

        fig = go.Figure(go.Waterfall(
            name="P&L",
            orientation="v",
            measure=measures,
            x=labels,
            y=values,
            connector={"line": {"color": "rgb(63,63,63)"}},
            increasing={"marker": {"color": "#16a34a"}},
            decreasing={"marker": {"color": "#dc2626"}},
            totals={"marker": {"color": "#2563eb"}},
            texttemplate="%{y:$,.0f}",
            textposition="outside",
        ))
        fig.update_yaxes(tickformat="$,.0f")
        fig.update_layout(height=350, margin=dict(t=20))
        st.plotly_chart(fig, use_container_width=True)

    # ── Margin trend ───────────────────────────────────────────
    st.subheader("Margin Trend by Quarter")
    margin = pl.groupby("fiscal_quarter").apply(
        lambda g: pd.Series({
            "gross_margin_pct": (g.gross_profit.sum() / g.total_revenue.sum() * 100),
            "operating_margin_pct": (g.operating_income.sum() / g.total_revenue.sum() * 100),
        })
    ).reset_index()

    fig = go.Figure()
    fig.add_trace(go.Scatter(
        x=margin.fiscal_quarter, y=margin.gross_margin_pct,
        name="Gross Margin", mode="lines+markers+text",
        texttemplate="%{y:.1f}%", textposition="top center",
        line=dict(color="#2563eb", width=2),
    ))
    fig.add_trace(go.Scatter(
        x=margin.fiscal_quarter, y=margin.operating_margin_pct,
        name="Op. Margin", mode="lines+markers+text",
        texttemplate="%{y:.1f}%", textposition="bottom center",
        line=dict(color="#16a34a", width=2),
    ))
    fig.update_layout(
        xaxis_title="Quarter",
        yaxis_title="Margin %",
        yaxis_ticksuffix="%",
        height=300,
        margin=dict(t=20),
    )
    st.plotly_chart(fig, use_container_width=True)

# ═══════════════════════════════════════════════════════════════
# ARR Bridge Tab
# ═══════════════════════════════════════════════════════════════

with tab_arr:
    st.header(f"ARR Bridge — FY{fiscal_year}")
    raw = fetch("/metrics/arr", fiscal_year=fiscal_year)
    arr = df(raw)

    if arr.empty:
        st.info("No ARR data.")
        st.stop()

    arr["period_yyyymm"] = arr["period_yyyymm"].astype(str)

    # ── KPI cards ──────────────────────────────────────────────
    new_arr = arr[arr.movement_type == "new"]["arr_change"].sum()
    exp_arr = arr[arr.movement_type == "expansion"]["arr_change"].sum()
    con_arr = arr[arr.movement_type == "contraction"]["arr_change"].sum()
    churn_arr = arr[arr.movement_type == "churn"]["arr_change"].sum()
    net_arr = new_arr + exp_arr + con_arr + churn_arr

    c1, c2, c3, c4, c5 = st.columns(5)
    c1.metric("New ARR", f"${new_arr/1e6:.1f}M")
    c2.metric("Expansion", f"${exp_arr/1e6:.1f}M")
    c3.metric("Contraction", f"${con_arr/1e6:.1f}M")
    c4.metric("Churn", f"${churn_arr/1e6:.1f}M")
    c5.metric("Net New ARR", f"${net_arr/1e6:.1f}M",
              delta=f"{'▲' if net_arr >= 0 else '▼'} {abs(net_arr)/1e6:.1f}M")

    st.divider()

    # ── Stacked bar: ARR movement by period ────────────────────
    pivot = arr.pivot_table(
        index="period_yyyymm", columns="movement_type", values="arr_change", aggfunc="sum"
    ).fillna(0).reset_index()

    fig = go.Figure()
    for mv, color in MOVEMENT_COLORS.items():
        if mv in pivot.columns:
            fig.add_trace(go.Bar(
                name=mv.title(),
                x=pivot.period_yyyymm,
                y=pivot[mv],
                marker_color=color,
            ))

    fig.update_layout(
        barmode="relative",
        xaxis_title="Period",
        yaxis_title="ARR Change ($)",
        yaxis_tickformat="$,.0f",
        height=380,
        margin=dict(t=20),
        legend=dict(orientation="h", yanchor="bottom", y=1.02),
    )
    st.plotly_chart(fig, use_container_width=True)

    # ── Movement breakdown table ────────────────────────────────
    st.subheader("Movement Summary by Type")
    summary = (
        arr.groupby("movement_type")
        .agg(arr_change=("arr_change", "sum"), movement_count=("movement_count", "sum"))
        .reset_index()
        .sort_values("arr_change", ascending=False)
    )
    summary["arr_change"] = summary["arr_change"].map("${:,.0f}".format)
    st.dataframe(summary, hide_index=True, use_container_width=True)

# ═══════════════════════════════════════════════════════════════
# AR Aging Tab
# ═══════════════════════════════════════════════════════════════

with tab_ar:
    st.header(f"AR Aging — FY{fiscal_year}")
    raw = fetch("/metrics/ar_aging", fiscal_year=fiscal_year)
    aging = df(raw)

    if aging.empty:
        st.info("No AR aging data.")
        st.stop()

    # ── KPI cards ──────────────────────────────────────────────
    total_ar = aging["total_amount"].sum()
    overdue = aging[aging.aging_bucket != "0-30"]["total_amount"].sum()
    pct_overdue = (overdue / total_ar * 100) if total_ar else 0

    c1, c2, c3 = st.columns(3)
    c1.metric("Total Open AR", f"${total_ar/1e6:.1f}M")
    c2.metric("Past Due (31+ days)", f"${overdue/1e6:.1f}M", f"{pct_overdue:.1f}%")
    c3.metric("Invoices", f"{int(aging['invoice_count'].sum()):,}")

    st.divider()
    col_left, col_right = st.columns(2)

    # ── Pie: AR by aging bucket ─────────────────────────────────
    with col_left:
        st.subheader("AR by Aging Bucket")
        bucket_totals = (
            aging.groupby("aging_bucket")["total_amount"].sum()
            .reindex(BUCKET_ORDER).fillna(0).reset_index()
        )
        fig = px.pie(
            bucket_totals,
            values="total_amount",
            names="aging_bucket",
            color="aging_bucket",
            color_discrete_map={
                "0-30": "#16a34a", "31-60": "#f59e0b",
                "61-90": "#ea580c", "90+": "#dc2626",
            },
            hole=0.4,
        )
        fig.update_layout(height=350, margin=dict(t=20))
        st.plotly_chart(fig, use_container_width=True)

    # ── Heatmap: amount by bucket × segment ────────────────────
    with col_right:
        st.subheader("Amount by Bucket & Segment")
        heat = aging.pivot_table(
            index="aging_bucket", columns="segment_tier",
            values="total_amount", aggfunc="sum"
        ).reindex(BUCKET_ORDER).fillna(0)

        fig = px.imshow(
            heat / 1e6,
            text_auto=".1f",
            aspect="auto",
            color_continuous_scale="RdYlGn_r",
            labels=dict(color="Amount ($M)"),
        )
        fig.update_layout(height=350, margin=dict(t=20))
        st.plotly_chart(fig, use_container_width=True)

# ═══════════════════════════════════════════════════════════════
# AI Analyst Chat Tab
# ═══════════════════════════════════════════════════════════════

with tab_chat:
    # ── Session state init ────────────────────────────────────────
    if "messages" not in st.session_state:
        st.session_state.messages = []
    if "chat_session_id" not in st.session_state:
        st.session_state.chat_session_id = f"sess-{uuid.uuid4().hex[:12]}"
    # memory_id is stable per browser session — persists across conversation clears
    if "memory_id" not in st.session_state:
        st.session_state.memory_id = f"user-{uuid.uuid4().hex[:16]}"

    # ── Header row with Clear button ──────────────────────────────
    hdr_col, clear_col = st.columns([5, 1])
    with hdr_col:
        st.header("🤖 AI Finance Analyst")
        st.caption(
            "Ask anything about revenue, expenses, P&L, ARR, forecasts, or what-if scenarios. "
            "Powered by Bedrock Agent + Claude Sonnet 4.6 · AgentCore Memory."
        )
    with clear_col:
        st.write("")  # spacer to push button down
        if st.session_state.messages:
            if st.button("🗑️ Clear", type="secondary", use_container_width=True):
                st.session_state.messages = []
                st.session_state.chat_session_id = f"sess-{uuid.uuid4().hex[:12]}"
                st.rerun()

    SUGGESTED = [
        "What was the gross margin trend by quarter in FY2024?",
        "Give me a 4-quarter revenue forecast",
        "What are the top 5 variance drivers vs budget in FY2024?",
        "What if we cut R&D spend by 15%? Impact on operating margin?",
        "Which customers have invoices more than 60 days overdue?",
        "What is NRR and how is it calculated?",
    ]

    # ── Scrollable message history ────────────────────────────────
    msg_container = st.container(height=520, border=False)
    with msg_container:
        if not st.session_state.messages:
            # Suggested questions inside the message area
            st.markdown(
                "<div style='padding-top:2rem; text-align:center; color:#6b7280; font-size:0.9rem;'>"
                "💡 <b>Get started with a question below, or type your own</b></div>",
                unsafe_allow_html=True,
            )
            st.write("")
            cols = st.columns(2)
            for i, q in enumerate(SUGGESTED):
                if cols[i % 2].button(q, use_container_width=True, key=f"sug_{i}"):
                    st.session_state.messages.append({"role": "user", "content": q})
                    st.rerun()
        else:
            for msg in st.session_state.messages:
                with st.chat_message(msg["role"]):
                    st.markdown(msg["content"])

    # ── Input pinned below the message area ───────────────────────
    if prompt := st.chat_input("Ask a finance question…"):
        st.session_state.messages.append({"role": "user", "content": prompt})

        # Write the new user message + streaming reply *inside* the same scrollable
        # container so everything stays in one place while the answer streams in.
        with msg_container:
            with st.chat_message("user"):
                st.markdown(prompt)

            def _stream_response():
                try:
                    with requests.get(
                        f"{API_BASE}/chat/stream",
                        params={
                            "question": prompt,
                            "session_id": st.session_state.chat_session_id,
                            "memory_id": st.session_state.memory_id,
                        },
                        stream=True,
                        timeout=300,
                    ) as r:
                        r.raise_for_status()
                        for chunk in r.iter_content(chunk_size=None, decode_unicode=True):
                            if chunk:
                                yield chunk
                except Exception as exc:  # noqa: BLE001
                    yield f"\n\n⚠️ Error: {exc}"

            with st.chat_message("assistant"):
                answer = st.write_stream(_stream_response())

        st.session_state.messages.append({"role": "assistant", "content": answer})
        st.rerun()

    # ── Memory expander (below input, out of the way) ─────────────
    with st.expander("💾 Memory", expanded=False):
        st.caption(
            "AgentCore Memory is active. The agent recalls context from previous sessions. "
            f"Your memory ID: `{st.session_state.memory_id}`"
        )
        if st.button("Reset memory ID (new user context)", type="secondary"):
            st.session_state.memory_id = f"user-{uuid.uuid4().hex[:16]}"
            st.session_state.messages = []
            st.session_state.chat_session_id = f"sess-{uuid.uuid4().hex[:12]}"
            st.rerun()

# ── Commentary tab ────────────────────────────────────────────────────────────

PERIODS = [f"2024{m:02d}" for m in range(1, 13)]
PERIOD_LABELS = {
    "202401": "Jan 2024", "202402": "Feb 2024", "202403": "Mar 2024",
    "202404": "Apr 2024", "202405": "May 2024", "202406": "Jun 2024",
    "202407": "Jul 2024", "202408": "Aug 2024", "202409": "Sep 2024",
    "202410": "Oct 2024", "202411": "Nov 2024", "202412": "Dec 2024",
}

with tab_commentary:
    st.header("📝 Management Commentary")
    st.caption(
        "Generate a CFO-ready board-pack narrative for any period. "
        "The AI queries variance_rca and the P&L mart, then drafts a 4-paragraph commentary."
    )

    col_left, col_right = st.columns([1, 2])

    with col_left:
        st.subheader("Parameters")
        selected_period = st.selectbox(
            "Period",
            options=PERIODS,
            index=len(PERIODS) - 1,  # default to Dec 2024
            format_func=lambda p: PERIOD_LABELS.get(p, p),
            key="commentary_period",
        )
        selected_entity = st.selectbox(
            "Entity",
            options=["ALL", "US", "EMEA", "APAC"],
            index=0,
            key="commentary_entity",
        )
        extra_context = st.text_area(
            "Additional context (optional)",
            placeholder="e.g. 'EMEA headcount restructuring completed in Sep, one-time charge of $12M expected'",
            height=100,
            key="commentary_extra",
        )
        generate_btn = st.button(
            "Generate Commentary",
            type="primary",
            use_container_width=True,
            key="commentary_generate",
        )

    with col_right:
        st.subheader("Board Pack Commentary")

        if "commentary_output" not in st.session_state:
            st.session_state.commentary_output = None
            st.session_state.commentary_meta = {}

        if generate_btn:
            with st.spinner("Querying variance data and drafting commentary…"):
                try:
                    resp = requests.post(
                        f"{API_BASE}/commentary",
                        json={
                            "period": selected_period,
                            "entity": selected_entity,
                            "memory_id": st.session_state.get("memory_id"),
                            "extra_context": extra_context or None,
                        },
                        timeout=300,
                    )
                    resp.raise_for_status()
                    data = resp.json()
                    st.session_state.commentary_output = data["commentary"]
                    st.session_state.commentary_meta = {
                        "period": data["period"],
                        "entity": data["entity"],
                        "session_id": data["session_id"],
                    }
                except Exception as exc:
                    st.error(f"⚠️ Error generating commentary: {exc}")

        if st.session_state.commentary_output:
            meta = st.session_state.commentary_meta
            st.caption(
                f"Period: **{PERIOD_LABELS.get(meta.get('period',''), meta.get('period',''))}**  ·  "
                f"Entity: **{meta.get('entity', '')}**  ·  "
                f"Session: `{meta.get('session_id', '')}`"
            )
            st.markdown("---")

            # Display each paragraph separated by blank line
            paragraphs = [p.strip() for p in st.session_state.commentary_output.split("\n\n") if p.strip()]
            for para in paragraphs:
                st.markdown(para)
                st.write("")

            st.markdown("---")
            col_copy, col_dl = st.columns(2)
            with col_dl:
                period_label = PERIOD_LABELS.get(meta.get("period", ""), meta.get("period", ""))
                entity_label = meta.get("entity", "ALL")
                filename = f"commentary_{meta.get('period', 'unknown')}_{entity_label.replace(' ', '_')}.txt"
                st.download_button(
                    label="⬇️ Download as .txt",
                    data=st.session_state.commentary_output,
                    file_name=filename,
                    mime="text/plain",
                    use_container_width=True,
                )
            with col_copy:
                st.info("💡 Use the download button to save, then paste into your board pack template.")
        else:
            st.info(
                "Select a period and entity, then click **Generate Commentary** to produce "
                "a CFO-ready board-pack narrative powered by the AI Analyst."
            )

# ── Board Pack tab ────────────────────────────────────────────────────────────

with tab_boardpack:
    st.header("📋 Board Pack Generator")
    st.caption(
        "Generate a complete CFO board pack PDF for any period — "
        "P&L summary, ARR waterfall, AR aging, and AI commentary in one document."
    )
    col1, col2 = st.columns([1, 2])
    with col1:
        bp_period = st.selectbox(
            "Period", options=PERIODS, index=len(PERIODS)-1,
            format_func=lambda p: PERIOD_LABELS.get(p, p), key="bp_period"
        )
        bp_entity = st.selectbox(
            "Entity", options=["ALL", "US", "EMEA", "APAC"], key="bp_entity"
        )
        bp_btn = st.button("Generate Board Pack", type="primary",
                           use_container_width=True, key="bp_generate")
    with col2:
        if "bp_output" not in st.session_state:
            st.session_state.bp_output = None
        if bp_btn:
            with st.spinner("Assembling board pack (fetching data + generating commentary)…"):
                try:
                    resp = requests.post(
                        f"{API_BASE}/boardpack",
                        json={"period": bp_period, "entity": bp_entity,
                              "memory_id": st.session_state.get("memory_id")},
                        timeout=300,
                    )
                    resp.raise_for_status()
                    st.session_state.bp_output = resp.json()
                except Exception as exc:
                    st.error(f"⚠️ {exc}")
        if st.session_state.bp_output:
            import base64
            data = st.session_state.bp_output
            pdf_bytes = base64.b64decode(data["pdf_base64"])
            st.success(f"✅ Board pack ready — {len(pdf_bytes)//1024}KB")
            st.download_button(
                label="⬇️ Download PDF",
                data=pdf_bytes,
                file_name=data["filename"],
                mime="application/pdf",
                use_container_width=True,
            )
            period_lbl = PERIOD_LABELS.get(data["period"], data["period"])
            st.caption(f"Period: **{period_lbl}** · Entity: **{data['entity']}**")
        else:
            st.info("Select a period and entity, then click **Generate Board Pack**.")
