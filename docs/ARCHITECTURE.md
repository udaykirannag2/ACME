# ACME Finance Architecture

**Status:** Phases 0-4 Complete | Phase 5 In Progress  
**Last Updated:** 2026-05-05  

This document is the canonical reference for ACME Finance system design. It evolves as each phase completes—see phase-specific docs for deep dives.

## System Overview

ACME Finance is an end-to-end AI-driven finance analytics platform built on AWS. Data flows from operational sources (RDS ERP, S3 EPM/CRM drops) through a medallion-architecture warehouse (raw → curated → marts) into a Bedrock + Claude agent for natural-language finance queries.

```
┌─────────────────────────────────────────────────────────────────┐
│                    ACME FINANCE SYSTEM                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Phase 3: RDS Postgres ERP                                      │
│  ├─ GL, AR, AP, Payroll, Fixed Assets (791K rows)              │
│  └─ Encrypted, backed up, cost-optimized                       │
│                                                                 │
│  Phase 4: Data Ingestion Pipeline ─────────────────────────→  │
│  ├─ DMS Serverless (RDS → S3 raw)                             │
│  ├─ Glue Crawlers (S3 → Glue Catalog)                         │
│  ├─ Glue ETL (Iceberg transformation)                         │
│  ├─ S3 Curated (Iceberg data lake)                            │
│  └─ Redshift Serverless (query engine + Spectrum)             │
│                                                                 │
│  Phase 5: Warehouse Modeling (dbt) ──→  Analytics-ready marts │
│  ├─ Staging (clean, deduplicated)                             │
│  ├─ Intermediate (business logic)                              │
│  └─ Marts (P&L, balance sheet, cash flow)                     │
│                                                                 │
│  Phase 6: Bedrock Agent (NLP-to-SQL) ──→  Finance Chatbot     │
│  ├─ Claude Sonnet 4.6 (reasoning)                             │
│  ├─ Knowledge Base (finance docs)                              │
│  └─ Lambda action groups (SQL execution)                       │
│                                                                 │
│  Phase 7-10: Analytics & UI                                    │
│  ├─ Phase 7: Variance + root-cause analysis                    │
│  ├─ Phase 8: Predictive forecasting                            │
│  ├─ Phase 9: What-if scenarios                                 │
│  └─ Phase 10: Streamlit chat UI                                │
│                                                                 │
│  Phase 11: Observability (ongoing)                              │
│  └─ CloudWatch dashboards, cost tracking, evals                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Phases

### Phase 0: Foundations ✅ Complete
**Repo skeleton, AWS hygiene, IaC bootstrap**

- Terraform infrastructure-as-code (S3, VPC, IAM, KMS)
- 36 AWS resources provisioned in us-east-1
- Cost tagging strategy
- Secrets Manager integration

### Phase 1: Data Model ✅ Complete
**ERP/EPM/CRM schemas, raw DDL**

- Dimensional model (facts + dimensions)
- GL, AR, AP, Payroll, Fixed Assets schemas
- CRM accounts, opportunities, ARR
- EPM budgets, forecasts
- Data dictionary with 200+ field definitions

### Phase 2: Synthetic Data ✅ Complete
**3 fiscal years, Salesforce-shaped**

- 791K GL entries, 8K customers, 6.5K headcount (FY25)
- FY23 $1.6B → FY24 $2.0B → FY25 $2.3B revenue growth
- Revenue recognition engine (subscription model)
- Anomalies for variance testing

### Phase 3: Source Systems ✅ Complete
**RDS Postgres ERP + S3 EPM/CRM**

- RDS Postgres (t3.small, 100GB, encrypted, backed up)
- DMS replication task configured
- S3 raw zone structure (erp/, epm/, crm/)
- Data validation queries

### Phase 4: Ingestion Pipeline ✅ Complete
**DMS → S3 → Glue → Redshift**

See **[Phase 4 Architecture](./phases/PHASE-4.md)** for full details.

**Key components:**
- **DMS Serverless:** RDS Postgres → S3 Parquet (full-load, pay-per-DCU)
- **Glue Crawlers:** S3 schema discovery → Glue Catalog
- **Glue ETL:** Raw Parquet → Curated Iceberg (dedup, audit columns)
- **Iceberg:** ACID tables, schema evolution, time travel
- **Redshift Serverless:** Auto-scaling query engine (8–32 RPU)
- **Spectrum:** Query Iceberg in S3 without copying

**Cost:** ~$20/month (ETL) | $30–40/month (active queries) | $51/month (idle, Redshift paused)

### Phase 5: dbt Warehouse Modeling 🚧 In Progress
**Staging → Intermediate → Marts**

See **[Phase 5 Architecture](./phases/PHASE-5.md)** for planned details.

**Scope:**
- Staging layer (raw → cleaned, deduplicated)
- Intermediate layer (business logic, SCDs)
- Marts layer (P&L, balance sheet, cash flow, revenue drill-down)
- Semantic layer (dbt semantic model for agent)
- dbt tests (>95% coverage)

### Phase 6: Bedrock Agent
**NLP-to-SQL, Knowledge Base integration**

See **[Phase 6 Architecture](./phases/PHASE-6.md)** (TBD).

### Phase 7–11: Analytics & Observability
See **[Phase 7+](./phases/)** docs (TBD).

---

## Technology Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Cloud** | AWS (us-east-1) | Cost-effective, strong AI/data services (Bedrock, Glue, Redshift) |
| **IaC** | Terraform 1.9+ | Declarative, state management, modular |
| **Ingestion** | DMS Serverless | Managed, serverless, no maintenance |
| **Schema Catalog** | Glue Data Catalog | Native to AWS, auto-discovery, integrated with Spectrum |
| **ETL** | Apache Spark on Glue | Distributed, cost-effective, battle-tested |
| **Table Format** | Apache Iceberg | ACID, schema evolution, time travel, Spectrum-native |
| **Data Lake** | S3 (raw + curated) | Durable, cost-effective, flexible format support |
| **Warehouse** | Redshift Serverless | Auto-scaling, ACID, Spectrum for S3 queries |
| **Transformation** | dbt-redshift (Phase 5) | Version control, testing, lineage, semantic layer |
| **AI/Agent** | Bedrock + Claude (Phase 6) | Managed LLM, fine-tuning ready, Knowledge Base integration |
| **Frontend** | Streamlit (Phase 10) | Rapid iteration, Python-native, low ops burden |

---

## Architectural Patterns

### 1. Medallion Architecture (Bronze → Silver → Gold)

```
Bronze (Raw)
├─ DMS replicates RDS Postgres → S3 Parquet
├─ Data generators upload ERP/EPM/CRM to S3
└─ No transformations; immutable

Silver (Curated)
├─ Glue ETL deduplicates, adds audit columns
├─ Writes Iceberg (ACID, schema evolution)
├─ One table = one source
└─ Single source of truth

Gold (Marts)
├─ dbt models: staging → intermediate → marts
├─ Business logic, aggregations, dimensions
├─ Ready for BI + agent queries
└─ Versioned, tested, documented
```

### 2. Serverless-First Design

- **DMS Serverless:** Pay-per-DCU-second; idles to $0.
- **Glue ETL:** Job-based; no standing cluster.
- **Redshift Serverless:** RPU auto-scales; pauses when idle.
- **Lambda:** Agent action groups (Phase 6+).

**Benefit:** Cost proportional to usage; no over-provisioning.

### 3. Immutable Data Lake

- S3 is the source of truth; never modified.
- Versioning enabled; Iceberg snapshots provide time travel.
- Redshift + dbt are query engines, not storage.

**Benefit:** Audit trail, reproducibility, easy rollback.

### 4. Spectrum for Cost-Efficient Analytics

- Curated tables live in S3 (Iceberg).
- Redshift queries S3 directly via Spectrum (no copy).
- Only charged per MB scanned, not stored.

**Benefit:** Decouples storage from compute; scales independently.

---

## Data Flow: High-Level

### Daily Refresh (Phase 4F, Step Functions)

```
06:00 UTC (EventBridge cron)
  ↓
Step Functions state machine
  ├─ Parallel: ETL_ERP, ETL_EPM, ETL_CRM (3 Glue jobs)
  │  ├─ Each reads raw database
  │  ├─ Adds audit columns (_ingest_date, _ingest_run_id)
  │  └─ Writes Iceberg to curated zone
  │
  └─ Sequential: Run Curated Crawler
     └─ Registers new tables in Glue Catalog
         ↓
      Redshift + agent can query latest data
```

**Cost:** ~$0.025 per execution (365/year = ~$9/year)

### Query Path (Phases 5+)

```
User question (e.g., "Q4 revenue by segment")
  ↓
Bedrock Agent (Phase 6)
  ├─ Read Knowledge Base (finance docs)
  ├─ Generate SQL against dbt marts
  └─ Execute via Lambda → Redshift
      ↓
Redshift resolves:
  ├─ Local tables (P&L, balance sheet marts)
  ├─ Spectrum queries to Iceberg in S3 (if raw drill-down needed)
  └─ Returns result to agent
      ↓
Agent formats response → Streamlit UI (Phase 10)
```

---

## Security & Governance

### Authentication
- **Secrets Manager:** RDS + Redshift admin credentials (never in code).
- **IAM roles:** DMS, Glue, Redshift have minimal required permissions.
- **VPC:** Private subnets for RDS/Redshift; public subnets for operator access (IP allowlist).

### Encryption
- **At rest:** S3, RDS, Redshift encrypted with KMS CMK.
- **In transit:** TLS for RDS/Redshift/S3 connections.
- **Keys:** Separate CMK per environment (dev, prod).

### Data Lineage & Audits
- **dbt docs:** Model relationships, column-level lineage (Phase 5+).
- **Iceberg snapshots:** Time-travel via `_ingest_run_id`.
- **CloudWatch:** All DMS, Glue, Redshift logs centralized.
- **Bedrock audit logs:** Agent queries logged for compliance (Phase 6+).

---

## Cost Optimization

### Current (Phase 4)
- **Idle:** ~$51/month (Redshift running 24/7)
- **Active:** ~$77–86/month (Redshift + ETL queries)

### Levers to <$50/month Target
1. **Pause Redshift** when not analyzing (saves $20/month).
2. **Pause RDS** between refresh windows (saves $25/month).
3. **Snapshot DMS** after full load; resume only for incremental (saves $5/month).

### Phase 5+ Opportunities
- **dbt incremental models:** Only process changed rows (saves compute).
- **Redshift auto-pause:** 15-min inactivity threshold (built-in).
- **S3 lifecycle:** Archive Iceberg snapshots older than 30 days.

---

## Monitoring & Observability

### Dashboards (Phase 11)
- **Pipeline health:** DMS % complete, Glue job success rate, crawler table count.
- **Cost:** RPU utilization, S3 scan volume, Glue DPU usage, forecast vs. actual.
- **Query performance:** Redshift p50/p95 latency, Spectrum scan efficiency.

### Alerting
- DMS task failure → SNS → ops.
- Glue job failure → Slack #data-eng.
- Redshift CPU >80% → escalate.
- Cost overrun (>$60/month) → pause and investigate.

### Logging
- DMS/Glue/Redshift logs → CloudWatch Logs.
- Application logs → CloudWatch Insights (Phase 10+).
- Bedrock audit logs → separate CloudWatch group (Phase 6+).

---

## Related Documents

| Document | Purpose |
|----------|---------|
| [PLAN.md](./PLAN.md) | 11-phase delivery roadmap + company defaults |
| [data-dictionary.md](./data-dictionary.md) | GL accounts, dimensions, facts (200+ fields) |
| [cost-guardrails.md](./cost-guardrails.md) | Cost targets, pause scripts, monthly budget |
| [Phase 4 Architecture](./phases/PHASE-4.md) | Deep dive: DMS, Glue, Iceberg, Redshift |
| [Phase 5 Architecture](./phases/PHASE-5.md) | TBD: dbt modeling, semantic layer |
| [ADRs](./adr/) | Locked architectural decisions (AWS region, AI stack, etc.) |

---

## Maintenance & Evolution

### Adding Components (Phase 5+)
1. Create new phase doc: `docs/phases/PHASE-N.md`
2. Link from this main ARCHITECTURE.md under the phase section
3. Update System Overview diagram
4. Add cost estimate to cost-guardrails.md

### Updating Phase 4
- If DMS config changes, update `Phase 4 Architecture` doc.
- If Glue job logic changes, update both repo code + doc.
- Sync with Linear issue (CLO-16) acceptance criteria.

### Archiving Old Phases
- Keep all phase docs; never delete.
- Mark archived phases with ✅ status badge.
- Link to commit SHA where phase was completed.

---

## Quick Links

- **GitHub repo:** [acme-finance](https://github.com/udayn/acme-finance)
- **Linear project:** [Acme SaaS solution](https://linear.app/cloudacity/project/acme-saas-solution-f29e551ecb20)
- **Terraform modules:** `infra/modules/{network,s3-lake,iam-roles,glue,redshift-serverless,dms,step-functions}`
- **Glue job code:** `pipelines/glue_jobs/raw_to_curated.py`
- **Data generators:** `generators/{reference_data,crm,erp,epm}.py`

---

**Last Updated:** 2026-05-05 | **Next Review:** 2026-05-12 (Phase 5 kickoff)
