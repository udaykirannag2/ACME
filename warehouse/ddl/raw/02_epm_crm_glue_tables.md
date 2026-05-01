# EPM and CRM table definitions (Glue Catalog / Iceberg)

EPM and CRM data lands as Parquet in S3 — no Postgres tables. Schemas are registered in the Glue Data Catalog (Phase 4) so Redshift Spectrum can read them as external tables.

This file documents the Parquet schema. Glue table definitions are generated programmatically from these specs in `pipelines/glue_jobs/register_raw_tables.py`.

## EPM (raw_epm)

S3 layout: `s3://acme-lake-raw/epm/<table>/period_yyyymm=<NNNNNN>/part-*.parquet` (Hive-style partition for budget/plan tables; non-partitioned for version tables).

### `budget_version` and `forecast_version`
Same shape:
```
budget_version_id   string  (UUID v7)
version_name        string
version_type        string  -- 'budget' | 'forecast' | 'actuals_snapshot'
fiscal_year         int
created_date        date
is_current          boolean
```

### `plan_line` (partition key: `period_yyyymm`)
```
plan_line_id     string
version_id       string
version_type     string
account_id       string   -- joins to erp.chart_of_accounts.account_id
cost_center_id   string
entity_id        string
period_yyyymm    int      -- partition column
amount           decimal(18,2)
segment          string   -- nullable for non-revenue
```

### `headcount_plan` (partition key: `period_yyyymm`)
```
headcount_plan_id      string
version_id             string
cost_center_id         string
period_yyyymm          int
planned_headcount      decimal(8,2)
planned_salary_cost    decimal(18,2)
```

### `driver_assumption` (partition key: `period_yyyymm`)
```
driver_assumption_id  string
version_id            string
driver_name           string
period_yyyymm         int
value                 decimal(10,4)
segment               string  -- nullable
```

## CRM (raw_crm)

S3 layout: `s3://acme-lake-raw/crm/<table>/[partition=...]/part-*.parquet`.

### `account` (no partition)
```
account_id       string
account_name     string
industry         string
billing_country  string
segment_tier     string
owner_name       string
created_date     date
```

### `contact` (no partition)
```
contact_id   string
account_id   string
email        string
title        string
```

### `opportunity` (partition key: `created_year_month` derived from created_date)
```
opportunity_id   string
account_id       string
name             string
stage            string
amount           decimal(18,2)
close_date       date
probability_pct  int
segment          string
owner_name       string
created_date     date
modified_date    date
```

### `opportunity_line` (no partition)
```
opportunity_line_id  string
opportunity_id       string
product_code         string
segment              string
acv_amount           decimal(18,2)
seats                int
```

### `pipeline_snapshot` (partition key: `snapshot_date` as `yyyymmdd` int)
```
snapshot_date       date
opportunity_id      string
stage               string
amount              decimal(18,2)
close_date          date
probability_pct     int
```
PK at warehouse layer: (snapshot_date, opportunity_id).

### `arr_movement` (partition key: `period_yyyymm`)
```
arr_movement_id  string
period_yyyymm    int
account_id       string
segment          string
movement_type    string
arr_change       decimal(18,2)
starting_arr     decimal(18,2)
ending_arr       decimal(18,2)
```

## Iceberg vs vanilla Parquet

For the **curated zone** (Phase 4 output), we use **Apache Iceberg** tables — gives time-travel and ACID upserts, supported natively by Glue and Redshift Spectrum.

For the **raw zone**, plain Parquet is fine — it's append-only synthetic data, no need for ACID.
