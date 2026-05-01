# PLAN — ACME SaaS Solutions Finance Transformation

This is a copy of the approved plan for in-repo reference. The canonical source is `~/.claude/plans/i-want-to-learn-parsed-willow.md`.

## Phases

- **Phase 0** — Foundations: repo skeleton, AWS hygiene, IaC bootstrap.
- **Phase 1** — Data model: ERP/EPM/CRM schemas, data dictionary, raw DDL.
- **Phase 2** — Synthetic data generation (3 fiscal years, shaped by Salesforce 10-K).
- **Phase 3** — Source-system simulation (RDS Postgres ERP + S3 drops for EPM/CRM).
- **Phase 4** — Ingestion pipelines (DMS → S3 raw → Glue → S3 curated → Redshift).
- **Phase 5** — Warehouse modeling with dbt (staging → marts + semantic layer).
- **Phase 6** — Bedrock + Claude agent: NLP-to-SQL with Knowledge Base.
- **Phase 7** — Variance + root-cause analysis tool.
- **Phase 8** — Predictive forecasting (statsforecast + Prophet).
- **Phase 9** — What-if scenario engine.
- **Phase 10** — Streamlit chat UI on App Runner.
- **Phase 11** — Observability, evals, cost guardrails (ongoing).

## Decisions (locked)

| Decision | Choice |
|---|---|
| AWS region | us-east-1 |
| AI stack | Bedrock + Claude (Sonnet 4.6 + Haiku 4.5) |
| Data grounding | Synthetic, shaped by Salesforce (CRM) 10-K/10-Q |
| Cost target | ~$50/month |
| IaC | Terraform |
| Python | 3.12 via uv |
| Warehouse | Redshift Serverless (paused when idle) |
| Orchestration | Step Functions + EventBridge (not MWAA) |
| Modeling | dbt-redshift |
| Front-end | Streamlit on App Runner |

## ACME company defaults (override in Phase 1 if desired)

| Attribute | Value |
|---|---|
| Annual revenue | FY23 $1.6B → FY24 $2.0B → FY25 $2.3B |
| Fiscal year end | January 31 (mirrors Salesforce) |
| Currency | USD only |
| Legal entities | 3 (US parent, EMEA, APAC) |
| Cost centers | ~25 |
| Segments | Sales / Service / Platform / Marketing & Commerce |
| Subscription model | Annual contracts, monthly billing, ratable revenue |
| DSO target | ~45 days |
| Customers (FY25 EOY) | ~8,000 active |
| Headcount FY25 | ~6,500 |
