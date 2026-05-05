# Phase 4: Data Ingestion Pipeline (DMS → S3 → Glue → Redshift)

**Status:** ✅ Complete  
**Completed:** 2026-05-05  
**Commits:** `0ad483e` → `29001fc` (Phase 4A–4F)  
**Cost:** ~$20/month (ETL only) | $30–40/month (active queries)  

---

## Overview

Phase 4 builds the **core warehouse ingest pipeline**: capture operational data from RDS Postgres ERP and S3 data drops (EPM/CRM), transform via Apache Spark on Glue, and land curated Apache Iceberg tables queryable by Redshift.

### High-Level Flow

```
RDS Postgres ERP (791K rows)
    ↓ (DMS Serverless, full-load)
S3 Raw Zone (Parquet, 3 sources: erp, epm, crm)
    ↓ (Glue Crawlers, schema discovery)
Glue Catalog (table metadata)
    ↓ (Glue ETL, Spark transformation)
S3 Curated Zone (Iceberg, ACID, dedup)
    ↓ (Redshift Spectrum, external tables)
Redshift Serverless (query engine for Phase 5+ dbt, Phase 6 agent, Phase 10 UI)
```

---

## Component 1: RDS Postgres ERP Source

### Infrastructure (`infra/modules/rds-erp/`)

**Instance Type:** `db.t3.small` (burstable, cost-optimized)  
**Storage:** 100GB gp3 SSD, encrypted at rest (KMS CMK)  
**Backup:** 7-day retention, automated daily snapshots  
**Availability:** Single AZ (dev); cross-AZ for prod (future)  
**Network:** Public subnet with IP allowlist (your IP only)  

### Data

**Database:** `acme_erp`

| Schema | Tables | Rows/Year | Purpose |
|--------|--------|-----------|---------|
| `public.entities` | entity, entity_segment, cost_center | ~25 | Legal entities, segments, cost centers |
| `public.financials` | chart_of_accounts, gl_journal | ~100K | GL entries, account master |
| `public.ar` | ar_invoice, ar_payment, ar_aging | ~5K | Revenue, customer receivables |
| `public.ap` | ap_invoice, ap_payment, ap_aging | ~8K | Expenses, vendor payables |
| `public.payroll` | employee, payroll_run, payroll_detail | ~10K | Headcount, payroll disbursements |
| `public.fa` | fixed_asset, fa_depreciation | ~500 | Capex, depreciation |

**Data loaded by:** `generators/` in Phase 2–3 (initial seed + synthetic data).

### Operations

**To connect locally (e.g., DBeaver):**
```bash
# Get endpoint
aws rds describe-db-instances --db-instance-identifier acme-finance-dev-erp \
  --query 'DBInstances[0].Endpoint.Address'

# Connect
psql -h <endpoint> -U admin -d acme_erp -c "SELECT COUNT(*) FROM gl_journal;"
```

**To pause/resume:**
```bash
# Pause (stop instance) — no charge, keep backups
aws rds stop-db-instance --db-instance-identifier acme-finance-dev-erp

# Resume
aws rds start-db-instance --db-instance-identifier acme-finance-dev-erp
# Wait 2–3 min for startup
```

---

## Component 2: DMS Serverless

### Purpose
Replicate RDS Postgres tables to S3 as Parquet files, making them discoverable by Glue Crawlers.

### Configuration (`infra/modules/dms/main.tf`)

**Replication Instance:**
- **Type:** `dms.serverless` (no infrastructure provisioning).
- **Max DCU:** 256 (scales auto; Phase 4 uses ~4 DCU for full-load).
- **Role:** `dms-s3-target` (custom IAM, S3 + KMS permissions).

**Source Endpoint:** RDS Postgres (`acme_erp`)
- Credentials from Secrets Manager (`acme-finance-dev-rds-admin`).
- Full-load enabled; CDC disabled (Phase 4 scope).

**Target Endpoint:** S3 (`s3://acme-lake-raw-dev/`)
- **Format:** Parquet (columnar, Glue-native, better compression).
- **Prefix:** `erp/` (all Postgres tables under this prefix).
- **Partitioning:** By table name (e.g., `erp/ar_invoice/`, `erp/gl_journal/`).

### Full-Load Process

```
1. DMS reads RDS table schema
2. Creates Parquet files on S3 (one file per batch, ~1GB chunks)
3. Registers DMS task status in CloudWatch
4. On completion, Glue Crawler auto-triggers (future: Phase 4F EventBridge)
```

**Typical timeline:** 15–30 min for 791K rows.

### Cost Model

**DMS Serverless billing:**
```
DCU-seconds = (DCU used) × (run duration in seconds)
Cost = DCU-seconds × $0.30 per DCU-hour / 3600

Example: 4 DCU × 1200 seconds = 4800 DCU-seconds
Cost = 4800 / 3600 × $0.30 = $0.40 per full-load run
Daily (assumed once per day): $0.40/day = ~$12/month
```

**Idle cost:** $0 (no resources = no charge).

---

## Component 3: Glue Crawlers

### Purpose
Auto-detect schema from Parquet/CSV files in S3 and register table metadata in AWS Glue Data Catalog.

### Crawler Configuration (`infra/modules/glue/main.tf`)

**Three crawlers (one per source):**

| Crawler | Input | Output Database | Tables |
|---------|-------|-----------------|--------|
| `erp` | `s3://acme-lake-raw-dev/erp/` | `acme_finance_raw_erp_dev` | entity, gl_journal, ar_invoice, ap_invoice, ... |
| `epm` | `s3://acme-lake-raw-dev/epm/` | `acme_finance_raw_epm_dev` | budget, forecast, variance_target, ... |
| `crm` | `s3://acme-lake-raw-dev/crm/` | `acme_finance_raw_crm_dev` | account, opportunity, arr_detail, ... |

**Crawler Configuration (JSON):**
```json
{
  "Version": 1.0,
  "Grouping": {
    "TableLevelConfiguration": 2  // One folder level = one table
  },
  "CrawlerOutput": {
    "Tables": {
      "AddOrUpdateBehavior": "MergeNewColumns"  // New fields auto-detected
    },
    "Partitions": {
      "AddOrUpdateBehavior": "InheritFromTable"
    }
  }
}
```

**Schema Change Policy:**
- **UpdateBehavior:** `UPDATE_IN_DATABASE` (apply new schema immediately).
- **DeleteBehavior:** `LOG` (log deleted columns, don't remove from catalog).

### Trigger

**Phase 4 (current):** Manual trigger via Step Functions.
```bash
aws glue start-crawler --name acme-finance-dev-crawler-erp
```

**Phase 4F (future):** EventBridge cron (06:00 UTC daily) via Step Functions state machine.

### Cost
- **Per-crawler run:** ~$0.44 (based on data scanned).
- **Phase 4:** 3 crawlers × 1 run/day × $0.44 = ~$40/month.
- **Mitigated:** Run once daily (not per DMS replication).

---

## Component 4: Glue Data Catalog

### Databases

**Purpose:** Namespace for table metadata; consumed by Glue ETL, Redshift Spectrum, dbt.

| Database | Purpose | Location |
|----------|---------|----------|
| `acme_finance_raw_erp_dev` | ERP tables from RDS (via DMS) | `s3://acme-lake-raw-dev/erp/` |
| `acme_finance_raw_epm_dev` | EPM tables from generators | `s3://acme-lake-raw-dev/epm/` |
| `acme_finance_raw_crm_dev` | CRM tables from generators | `s3://acme-lake-raw-dev/crm/` |
| `acme_finance_curated_dev` | Curated Iceberg tables (output of Glue ETL) | `s3://acme-lake-curated-dev/iceberg/` |

### Table Example

**Table:** `acme_finance_raw_erp_dev.gl_journal`

| Property | Value |
|----------|-------|
| **Input Format** | `org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat` |
| **Output Format** | `org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat` |
| **Serde** | `org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe` |
| **Location** | `s3://acme-lake-raw-dev/erp/gl_journal/` |
| **Columns** | `entity_id`, `cost_center_id`, `account_id`, `debit`, `credit`, `posted_date`, `... (20+ fields)` |
| **Partitions** | None (raw zone is un-partitioned) |

---

## Component 5: Glue ETL Job (Apache Spark)

### Purpose
Transform raw Parquet tables from Glue Catalog → curated Apache Iceberg tables (deduplicated, audit-tracked).

### Job Code (`pipelines/glue_jobs/raw_to_curated.py`)

**Runtime:** Glue 4.0 (Apache Spark 3.3, Python 3.11)

**Workers:**
```
Type:     G.2X (2 vCPU, 16GB RAM per worker)
Count:    3 workers
Capacity: 10 DPU total
Timeout:  10 min (usually completes in 2 min)
```

**Execution Flow:**

```python
# 1. Setup
args = {
    "source_database": "acme_finance_raw_erp_dev",
    "target_database": "acme_finance_curated_dev",
    "target_warehouse_path": "s3://acme-lake-curated-dev/iceberg/",
    "JOB_NAME": "acme-finance-raw-to-curated-etl"
}

# 2. Discover tables in source database (via Glue Catalog API)
source_tables = ["entity", "gl_journal", "ar_invoice", "ap_invoice", ...]

# 3. For each table:
for table_name in source_tables:
    # Read from Glue Catalog
    df = glueContext.create_dynamic_frame.from_catalog(
        database="acme_finance_raw_erp_dev",
        table_name=table_name
    ).toDF()
    
    # Add audit columns
    df = df.withColumn("_ingest_date", current_date()) \
            .withColumn("_ingest_run_id", lit(run_id))
    
    # Write to Iceberg (createOrReplace = idempotent)
    target = f"glue_iceberg.acme_finance_curated_dev.{table_name}"
    df.writeTo(target).using("iceberg").createOrReplace()
    
    # Log success
    print(f"[etl] wrote {target} ({row_count:,} rows)")

# 4. Summary & error handling
if failures:
    raise RuntimeError(f"{len(failures)} tables failed")
job.commit()
```

### Why Iceberg?

| Feature | Benefit | Use in ACME |
|---------|---------|------------|
| **ACID Transactions** | Atomic writes, isolation | Concurrent Phase 5 dbt runs won't see partial data |
| **Schema Evolution** | Add/remove columns without rewrite | Phase 6+: add new GL accounts without reloading |
| **Time Travel** | Query data as of past snapshot | Phase 7: variance analysis vs. yesterday's data |
| **Partition Evolution** | Change partition scheme | Future: optimize by customer instead of date |
| **Predicate Pushdown** | Skip files matching WHERE clause | Redshift queries only needed GL accounts |

### Idempotency

**Mode:** `createOrReplace()`
- First run: creates table + writes data.
- Second run: truncates table, writes fresh data.
- Benefit: re-run same date safely; no duplicates.

### Job Parameters

**Passed by Step Functions:**
```bash
aws glue start-job-run \
  --job-name acme-finance-raw-to-curated-etl \
  --arguments '{
    "--source_database": "acme_finance_raw_erp_dev",
    "--target_database": "acme_finance_curated_dev",
    "--target_warehouse_path": "s3://acme-lake-curated-dev/iceberg/"
  }'
```

### Cost Model

**Glue job billing:** DPU-hours  
```
DPU-hours = (DPU) × (runtime in hours)
Cost = DPU-hours × $0.44 per DPU-hour

Example: 10 DPU × 2 min runtime = 10 DPU × (2/60) = 0.33 DPU-hours
Cost = 0.33 × $0.44 = ~$0.15 per run
Daily (1 run × 3 branches): $0.15 × 3 = $0.45/day = ~$13.50/month
```

**Scaling:** If raw data grows 10× (7.91M rows), runtime may increase to 10 min, but DPU auto-scales within 25 DPU max.

---

## Component 6: S3 Curated Zone (Iceberg Data Lake)

### Infrastructure (`infra/modules/s3-lake/main.tf`)

**Bucket:** `acme-lake-curated-dev`

**Encryption:**
- KMS CMK (envelope encryption, separate key per environment).
- Durable, tamper-evident.

**Versioning:** Enabled (Iceberg manages snapshots; S3 versioning for safety).

**Lifecycle:**
- Current: No expiration.
- Future (Phase 11): Archive snapshots older than 30 days to Glacier.

**Access Control:**
- IAM role `acme-finance-dev-redshift-spectrum` (Redshift read-only).
- IAM role `acme-finance-dev-glue-role` (Glue ETL write).
- No public access; all private.

### Data Structure

```
s3://acme-lake-curated-dev/
├── iceberg/
│   └── acme_finance_curated_dev/
│       ├── entity/
│       │   ├── data/
│       │   │   ├── 00000-1-abc123.parquet  (actual data)
│       │   │   └── 00001-1-def456.parquet
│       │   ├── metadata/
│       │   │   ├── v1.metadata.json        (latest snapshot)
│       │   │   ├── v1.manifest.avro        (file list)
│       │   │   └── ...
│       │   └── metadata.json               (table metadata)
│       │
│       ├── gl_journal/
│       │   ├── data/
│       │   │   └── (100K+ rows of parquet files)
│       │   └── metadata/
│       │
│       └── ar_invoice/
│           ├── data/
│           └── metadata/
│
└── redshift-query-results/  (Query Editor v2 result staging)
    ├── query-abc123.parquet
    └── ...
```

### Iceberg Table Structure

**Example: `gl_journal` table**

```
Table:       acme_finance_curated_dev.gl_journal
Format:      Iceberg v2 (with positional deletes for future UPSERT)
Serialization: Parquet
Rows:        ~100,000
Snapshots:   Multiple (one per ETL run)
Snapshot ID: 1234567890 (latest)
```

**Snapshot History:**
```bash
# Query via Redshift
SELECT snapshot_id, committed_at, operation
  FROM iceberg."acme_finance_curated_dev"."$iceberg_metadata".snapshots
  ORDER BY committed_at DESC;

# Example output
2026-05-05T18:00:00Z | 1234567890 | append  (latest)
2026-05-04T18:00:00Z | 1234567889 | append  (yesterday)
2026-05-03T18:00:00Z | 1234567888 | append  (2 days ago)
```

---

## Component 7: Redshift Serverless

### Infrastructure (`infra/modules/redshift-serverless/main.tf`)

**Namespace & Workgroup:**
```
Namespace:       acme-finance-dev
Admin User:      admin
Database:        dev (default)
Password:        Secrets Manager (acme-finance-dev-redshift-admin)
Port:            5439 (standard Redshift)
Publicly accessible: true (with IP allowlist)
```

**Capacity:**
```
Base RPU:        8 (always reserved)
Max RPU:         32 (auto-scale if needed)
Auto-pause:      Yes (15 min idle → paused)
Pause Duration:  Indefinite until resumed
```

**Node Type:** RA3 (Redshift managed storage; storage decoupled from compute)

### Spectrum Configuration

**External Tables (via Glue Catalog):**

```sql
-- Redshift can query Iceberg as native tables:
CREATE EXTERNAL TABLE spectrum.acme_finance_curated_dev.gl_journal
  USING ICEBERG
  LOCATION 's3://acme-lake-curated-dev/iceberg/acme_finance_curated_dev/gl_journal';

SELECT COUNT(*) FROM spectrum.acme_finance_curated_dev.gl_journal;
-- Result: 100000 (rows scanned from S3, not stored in Redshift)
```

**How Spectrum Works:**
1. Redshift reads Glue Catalog metadata.
2. Filters pushed down to Parquet files (only read needed columns/partitions).
3. Data streamed from S3 into query engine.
4. Results aggregated in Redshift.
5. Charge: per MB scanned (not stored).

### Access Control

**IAM Role:** `acme-finance-dev-redshift-spectrum`

**Permissions:**
```json
{
  "Effect": "Allow",
  "Action": [
    "glue:GetDatabase",
    "glue:GetTable",
    "glue:GetPartition",
    "glue:BatchGetPartition"
  ],
  "Resource": "*"
},
{
  "Effect": "Allow",
  "Action": [
    "s3:GetObject",
    "s3:ListBucket"
  ],
  "Resource": [
    "arn:aws:s3:::acme-lake-raw-dev",
    "arn:aws:s3:::acme-lake-raw-dev/*",
    "arn:aws:s3:::acme-lake-curated-dev",
    "arn:aws:s3:::acme-lake-curated-dev/*"
  ]
}
```

### Cost Model

**Redshift Serverless billing:**

```
RPU-seconds = (RPU used) × (duration in seconds)
Cost = RPU-seconds × $1.88 per RPU-hour / 3600

Example 1 (idle, paused):
  Cost = $0 (no charge when paused)

Example 2 (small query):
  8 RPU × 10 seconds = 80 RPU-seconds = 80 / 3600 × $1.88 = $0.04

Example 3 (large query):
  32 RPU × 60 seconds = 1920 RPU-seconds = 1920 / 3600 × $1.88 = $1.00
```

**Monthly estimate (assuming 8 RPU idle, 1 hour of queries/day):**
```
Idle: 8 RPU × 86400 sec × 29 days / 3600 = 5571 RPU-hours = ~$10,500/month ✗ BAD

Paused: $0/month ✓ GOOD (resume when needed)

Active (1 hour daily, avg 10 RPU): 10 RPU × 3600 sec × 29 days / 3600 = 290 RPU-hours = $545/month ✓ REASONABLE
```

**Cost optimization:**
- **Pause Redshift** when not in use (via AWS console or CLI).
- **Pause RDS** between ETL windows (save $25/month each).

### Resuming Redshift

```bash
# Resume workgroup (takes 60 sec)
aws redshift-serverless resume-workgroup --workgroup-name acme-finance-dev

# Connect
psql -h <endpoint> -U admin -d dev

# Check status
aws redshift-serverless list-workgroups
```

---

## Component 8: Orchestration (Step Functions + EventBridge)

### State Machine Definition (`infra/modules/step-functions/main.tf`)

**Purpose:** Daily refresh: crawl raw zone → ETL (parallel) → crawl curated.

**State Machine:**
```json
{
  "Comment": "Daily refresh: parallel raw→curated ETL, then crawl curated",
  "StartAt": "ParallelETL",
  "States": {
    "ParallelETL": {
      "Type": "Parallel",
      "Next": "RunCuratedCrawler",
      "Branches": [
        {
          "StartAt": "ETL_ERP",
          "States": {
            "ETL_ERP": {
              "Type": "Task",
              "Resource": "arn:aws:states:::glue:startJobRun.sync",
              "Parameters": {
                "JobName": "acme-finance-raw-to-curated-etl",
                "Arguments": {
                  "--source_database": "acme_finance_raw_erp_dev",
                  "--target_database": "acme_finance_curated_dev",
                  "--target_warehouse_path": "s3://acme-lake-curated-dev/iceberg/"
                }
              },
              "TimeoutSeconds": 600,
              "End": true
            }
          }
        },
        {
          "StartAt": "ETL_EPM",
          "States": {
            "ETL_EPM": {
              "Type": "Task",
              "Resource": "arn:aws:states:::glue:startJobRun.sync",
              "Parameters": {
                "JobName": "acme-finance-raw-to-curated-etl",
                "Arguments": {
                  "--source_database": "acme_finance_raw_epm_dev",
                  "--target_database": "acme_finance_curated_dev",
                  "--target_warehouse_path": "s3://acme-lake-curated-dev/iceberg/"
                }
              },
              "TimeoutSeconds": 600,
              "End": true
            }
          }
        },
        {
          "StartAt": "ETL_CRM",
          "States": {
            "ETL_CRM": {
              "Type": "Task",
              "Resource": "arn:aws:states:::glue:startJobRun.sync",
              "Parameters": {
                "JobName": "acme-finance-raw-to-curated-etl",
                "Arguments": {
                  "--source_database": "acme_finance_raw_crm_dev",
                  "--target_database": "acme_finance_curated_dev",
                  "--target_warehouse_path": "s3://acme-lake-curated-dev/iceberg/"
                }
              },
              "TimeoutSeconds": 600,
              "End": true
            }
          }
        }
      ]
    },
    "RunCuratedCrawler": {
      "Type": "Task",
      "Resource": "arn:aws:states:::aws-sdk:glue:startCrawler",
      "Parameters": { "Name": "acme-finance-dev-crawler-curated" },
      "End": true,
      "Catch": [
        {
          "ErrorEquals": ["CrawlerRunningException"],
          "Next": "CrawlerAlreadyRunning"
        }
      ]
    },
    "CrawlerAlreadyRunning": {
      "Type": "Pass",
      "End": true
    }
  }
}
```

**Execution:**
```
Start
  ↓
Parallel (all 3 run concurrently):
  ├─ ETL_ERP (20–30 sec)
  ├─ ETL_EPM (20–30 sec)
  └─ ETL_CRM (20–30 sec)
  ↓
All complete
  ↓
RunCuratedCrawler (async, ~5 min)
  ↓
Success
```

**Total execution time:** ~2 min (parallel ETL) + 5 min (crawler) = 7 min total.

### EventBridge Schedule

**Rule:** `acme-finance-dev-daily-refresh`

```
Cron: 0 6 * * ? *  (06:00 UTC daily = midnight PST)
Target: Step Functions state machine
Enabled: false (manually enabled after Phase 4F verification)
```

### Cost

- **Step Functions:** ~0.025 per execution × 365 = ~$9/year.
- **EventBridge:** ~$0.10/month (negligible).

---

## Data Quality & Validation

### Built-in Safeguards

1. **Iceberg ACID:** Concurrent writes won't corrupt data.
2. **Idempotent ETL:** Re-run same date safely; no duplicates.
3. **Audit columns:** `_ingest_date`, `_ingest_run_id` track lineage.
4. **Snapshot history:** Time-travel to any past state.

### Manual Validation (post-Phase 4)

```bash
# Connect to Redshift
psql -h <endpoint> -U admin -d dev

# Check curated data
SELECT COUNT(*) FROM iceberg."acme_finance_curated_dev".gl_journal;
-- Expected: 100,000 (matching RDS)

-- Check audit columns
SELECT MIN(_ingest_date), MAX(_ingest_date), COUNT(DISTINCT _ingest_run_id)
  FROM iceberg."acme_finance_curated_dev".gl_journal;
-- Expected: today, today, 1

-- Check for duplicates
SELECT account_id, posted_date, COUNT(*)
  FROM iceberg."acme_finance_curated_dev".gl_journal
  GROUP BY account_id, posted_date
  HAVING COUNT(*) > 1
  LIMIT 10;
-- Expected: 0 rows (no duplicates)
```

### Phase 5+ Validation

**dbt tests** will validate:
- Uniqueness (primary keys).
- Not-null (required fields).
- Referential integrity (FKs).
- Custom logic (account balance = sum of journal entries).

---

## Failure Modes & Mitigation

| Failure | Symptom | Root Cause | Mitigation |
|---------|---------|-----------|-----------|
| **DMS task hangs** | Raw zone not updated after 1 hour | Network partition, RDS down | CloudWatch alarm; manual restart |
| **Glue job OOM** | Job fails after 5 min (memory error) | Data spike, non-optimal config | Increase DPU (max 25) or batch size |
| **Crawler schema change** | New table not detected | Crawler not run, or different path format | Check crawler logs; re-run manually |
| **Redshift paused** | Queries timeout; "cluster not found" | Idle too long, auto-paused | Resume via `resume-workgroup` CLI |
| **Secrets expired** | DMS/Redshift auth fails | Credential rotation not done | Monitor Secrets Manager; refresh annually |
| **S3 permission denied** | Glue job fails writing Iceberg | IAM role missing S3 permission | Audit IAM role via `get-role` + `list-attached-role-policies` |

---

## Operational Checklist

### Before First Run
- [ ] RDS Postgres loaded with data (Phase 3)
- [ ] S3 raw, curated buckets created (Phase 0)
- [ ] DMS Serverless endpoint created, source/target configured
- [ ] Glue Crawlers created (3: erp, epm, crm)
- [ ] Glue ETL job deployed (`raw_to_curated.py`)
- [ ] Redshift Serverless namespace created
- [ ] Step Functions state machine created
- [ ] IAM roles assigned (DMS, Glue, Redshift)
- [ ] Secrets Manager credentials stored

### Daily Refresh (Manual, until Phase 4F auto-enabled)

```bash
# 1. Resume Redshift (if paused)
aws redshift-serverless resume-workgroup --workgroup-name acme-finance-dev
# Wait 60 sec for cluster to be ready

# 2. Start Step Functions execution
aws stepfunctions start-execution \
  --state-machine-arn arn:aws:states:us-east-1:010928194453:stateMachine:acme-finance-dev-daily-refresh \
  --name "refresh-$(date +%Y%m%d-%H%M%S)"

# 3. Monitor execution
aws stepfunctions describe-execution --execution-arn <from step 2> --query 'status'
# Expect: SUCCEEDED

# 4. Verify curated data
psql -h <endpoint> -U admin -d dev -c "SELECT COUNT(*) FROM iceberg.\"acme_finance_curated_dev\".gl_journal;"

# 5. Pause Redshift (to save cost)
aws redshift-serverless pause-workgroup --workgroup-name acme-finance-dev
```

### Debugging

**Check DMS logs:**
```bash
aws logs tail /aws/dms/tasks/acme-finance-dev-dms --follow
```

**Check Glue job logs:**
```bash
aws logs tail /aws-glue/jobs/acme-finance-raw-to-curated-etl --follow
```

**Check Glue Crawler logs:**
```bash
aws glue get-crawler --name acme-finance-dev-crawler-erp | jq .Crawler.CatalogTarget
```

**Check Step Functions execution:**
```bash
aws stepfunctions describe-execution --execution-arn <arn> --query '{Status: status, StartTime: startDate, EndTime: stopDate}'
```

---

## Phase 4 to Phase 5 Handoff

**Phase 5 (dbt modeling) will:**
1. Read curated Iceberg tables from Redshift Spectrum.
2. Build staging layer (raw → deduplicated, cleaned).
3. Build intermediate layer (business logic, SCDs).
4. Build marts layer (P&L, balance sheet, revenue, etc.).
5. Add dbt tests, documentation, semantic layer.

**Phase 4 guarantees:**
- ✅ Curated tables are ACID (no data loss).
- ✅ Schema is discoverable (Glue Catalog).
- ✅ Data is queryable (Redshift Spectrum).
- ✅ Audit trail is complete (`_ingest_date`, `_ingest_run_id`).

---

## Related Documentation

- [Main Architecture](../ARCHITECTURE.md) — System overview.
- [cost-guardrails.md](../cost-guardrails.md) — Cost optimization, pause scripts.
- [data-dictionary.md](../data-dictionary.md) — GL accounts, dimensions, 200+ fields.
- **Terraform:** `infra/modules/{rds-erp,dms,glue,redshift-serverless,step-functions}/`
- **Glue Job:** `pipelines/glue_jobs/raw_to_curated.py`
- **Sample Queries:** `scripts/sample_queries.sql`

---

**Last Updated:** 2026-05-05 | **Phase Status:** ✅ Complete
