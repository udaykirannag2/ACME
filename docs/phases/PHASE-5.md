# Phase 5: Warehouse Modeling with dbt (Staging → Intermediate → Marts)

**Status:** 🚧 In Progress  
**Planned Start:** 2026-05-06  
**Expected Completion:** 2026-05-20  

---

## Overview

Phase 5 builds the **analytics-ready data warehouse** on top of Phase 4's curated Iceberg tables. Using dbt-redshift, we implement the gold layer: staging (deduplicate, clean) → intermediate (business logic, SCDs) → marts (revenue, expense, P&L, balance sheet).

### High-Level Scope

```
Curated Iceberg (Phase 4)
    ↓
Staging Layer (raw → deduplicated, cleaned)
    ├─ stg_gl_journal       (GL entries, validated)
    ├─ stg_ar_invoice       (Revenue recognition)
    ├─ stg_ap_invoice       (Expenses)
    ├─ stg_customer_account (CRM dedup)
    └─ ... (12+ stg_* models)
    ↓
Intermediate Layer (business logic, SCDs)
    ├─ int_revenue_daily     (daily revenue by segment, customer)
    ├─ int_expense_daily     (daily expense by cost center)
    ├─ int_customer_scd      (slowly changing customer dimensions)
    └─ ... (8+ int_* models)
    ↓
Marts Layer (BI-ready aggregates)
    ├─ fct_revenue           (revenue fact table)
    ├─ fct_expense           (expense fact table)
    ├─ dim_customer          (customer dimension)
    ├─ dim_account           (GL account dimension)
    ├─ dim_cost_center       (cost center dimension)
    └─ mart_p_and_l          (P&L summary)
    ↓
dbt Tests + Documentation
    ├─ >95% coverage (uniqueness, not-null, relationships)
    ├─ dbt docs (auto-generated, lineage)
    └─ Semantic layer (dbt semantic model for Phase 6 agent)
```

---

## Key Components

### dbt Project Structure

```
warehouse/dbt/
├── dbt_project.yml          # Project config (version, models path, tests)
├── profiles.yml             # Redshift connection config
├── models/
│   ├── staging/
│   │   ├── stg_gl_journal.sql
│   │   ├── stg_ar_invoice.sql
│   │   ├── stg_ap_invoice.sql
│   │   └── ... (12+ staging models)
│   ├── intermediate/
│   │   ├── int_revenue_daily.sql
│   │   ├── int_expense_daily.sql
│   │   └── ... (8+ intermediate models)
│   └── marts/
│       ├── fct_revenue.sql
│       ├── fct_expense.sql
│       ├── dim_customer.sql
│       ├── dim_account.sql
│       ├── dim_cost_center.sql
│       └── mart_p_and_l.sql
├── tests/
│   ├── dbt_expectations/        # Data quality tests
│   ├── generic/                 # Reusable test macros
│   └── singular/                # Custom SQL tests
├── macros/
│   ├── scd_type2.sql            # Slowly changing dimension logic
│   └── ... (custom macros)
└── documentation/
    ├── model_docs.md            # Model descriptions
    └── semantic_model.yml       # dbt Semantic Layer
```

### Staging Models

**Purpose:** Clean, deduplicate, standardize raw data.

**Example: `stg_gl_journal.sql`**
```sql
WITH source AS (
    SELECT
        entity_id,
        cost_center_id,
        account_id,
        debit,
        credit,
        posted_date,
        _ingest_date,
        _ingest_run_id
    FROM {{ source('acme_finance_curated', 'gl_journal') }}
    WHERE posted_date >= '2023-01-01'  -- Filter to historical scope
),
validation AS (
    SELECT
        {{ dbt_utils.generate_surrogate_key(['entity_id', 'account_id', 'posted_date']) }} AS gl_journal_key,
        *,
        -- Flag invalid entries
        CASE
            WHEN debit < 0 OR credit < 0 THEN 'invalid_sign'
            WHEN entity_id IS NULL THEN 'missing_entity'
            WHEN account_id NOT IN (SELECT account_id FROM {{ ref('dim_account') }}) THEN 'invalid_account'
            ELSE 'valid'
        END AS validation_status
    FROM source
)
SELECT * FROM validation
WHERE validation_status = 'valid'
```

### Intermediate Models

**Purpose:** Business logic, slowly changing dimensions, joins.

**Example: `int_revenue_daily.sql`**
```sql
WITH gl_data AS (
    SELECT
        posted_date,
        entity_id,
        account_id,
        cost_center_id,
        DEBIT - CREDIT AS net_amount
    FROM {{ ref('stg_gl_journal') }}
),
account_mapping AS (
    SELECT
        account_id,
        account_type,
        segment_id
    FROM {{ ref('dim_account') }}
),
joined AS (
    SELECT
        gl.posted_date,
        gl.entity_id,
        acct.segment_id,
        SUM(gl.net_amount) AS revenue_amount,
        COUNT(*) AS transaction_count
    FROM gl_data gl
    JOIN account_mapping acct ON gl.account_id = acct.account_id
    WHERE acct.account_type = 'REVENUE'
    GROUP BY 1, 2, 3
)
SELECT
    posted_date,
    entity_id,
    segment_id,
    revenue_amount,
    transaction_count
FROM joined
```

### Marts (BI-Ready)

**Example: `mart_p_and_l.sql`**
```sql
WITH revenue AS (
    SELECT
        fiscal_month,
        entity_id,
        segment_id,
        SUM(revenue_amount) AS total_revenue
    FROM {{ ref('fct_revenue') }}
    GROUP BY 1, 2, 3
),
expense AS (
    SELECT
        fiscal_month,
        entity_id,
        SUM(expense_amount) AS total_expense
    FROM {{ ref('fct_expense') }}
    GROUP BY 1, 2
)
SELECT
    r.fiscal_month,
    r.entity_id,
    r.segment_id,
    r.total_revenue,
    COALESCE(e.total_expense, 0) AS total_expense,
    r.total_revenue - COALESCE(e.total_expense, 0) AS gross_profit,
    SAFE_DIVIDE(gross_profit, r.total_revenue) AS gross_margin_pct
FROM revenue r
LEFT JOIN expense e ON r.fiscal_month = e.fiscal_month AND r.entity_id = e.entity_id
ORDER BY 1 DESC, 2, 3
```

---

## dbt Tests

**Target:** >95% test coverage

| Test Type | Count | Example |
|-----------|-------|---------|
| **Uniqueness** | 5 | PK: (gl_journal_id) |
| **Not-null** | 20 | revenue.amount NOT NULL |
| **Referential Integrity** | 8 | revenue.account_id → dim_account.account_id |
| **Custom (SQL)** | 5 | P&L balance check: revenue - expense = net_income |

**Example test:**
```yaml
# tests/dbt_expectations/fct_revenue.yml
models:
  - name: fct_revenue
    tests:
      - dbt_expectations.expect_table_row_count_to_be_between:
          min_value: 50000
          max_value: 1000000
      - dbt_expectations.expect_column_mean_to_be_between:
          column_name: revenue_amount
          min_value: 500
          max_value: 50000
```

---

## dbt Semantic Layer

**Purpose:** Define metrics, dimensions, facts for Phase 6 Bedrock agent.

**Example: `semantic_model.yml`**
```yaml
semantic_models:
  - name: fct_revenue
    description: Daily revenue by customer, segment
    metrics:
      - name: total_revenue
        description: Sum of revenue_amount
        agg: sum
        agg_time_dimension: date
      - name: revenue_count
        description: Count of revenue transactions
        agg: count
    dimensions:
      - name: customer_id
      - name: segment_id
      - name: date

metrics:
  - name: monthly_revenue
    description: Total monthly revenue
    expr: "{{ ref('fct_revenue') }}.revenue_amount"
    time_grain: month
```

**Usage in Phase 6:**
- Agent queries semantic layer for available metrics + dimensions.
- Agent generates SQL: "SELECT monthly_revenue WHERE segment = 'Sales'"
- Agent executes → returns result.

---

## Configuration & Setup

### dbt Project Config (`dbt_project.yml`)

```yaml
name: 'acme_finance'
version: '1.0.0'
config-version: 2

# Target dev/prod based on profile
profile: 'acme_finance'

# Project paths
model-paths: ["models"]
analysis-paths: ["analyses"]
test-paths: ["tests"]
data-paths: ["data"]
macro-paths: ["macros"]
snapshot-paths: ["snapshots"]

# Default materialization + tests
models:
  acme_finance:
    staging:
      +materialized: view  # Fast iteration
    intermediate:
      +materialized: table  # Persist for reuse
    marts:
      +materialized: table  # BI-ready
      +tags: ["mart"]
    +on_schema_change: "fail"  # Detect schema mismatches

seeds:
  +quote_columns: false

vars:
  start_date: '2023-01-01'
```

### Redshift Connection (`profiles.yml`)

```yaml
acme_finance:
  target: dev
  outputs:
    dev:
      type: redshift
      host: "{{ env_var('REDSHIFT_HOST') }}"
      user: "{{ env_var('REDSHIFT_USER') }}"
      password: "{{ env_var('REDSHIFT_PASSWORD') }}"
      port: 5439
      dbname: dev
      schema: acme_finance_warehouse_dev
      threads: 4
      keepalives_idle: 0
      search_path: ['acme_finance_warehouse_dev', 'public']
```

---

## Development Workflow

### 1. Create Staging Model
```bash
dbt run -s stg_gl_journal
dbt test -s stg_gl_journal
```

### 2. Create Intermediate Model
```bash
dbt run -s int_revenue_daily
dbt test -s int_revenue_daily
```

### 3. Create Mart
```bash
dbt run -s fct_revenue
dbt test -s fct_revenue
```

### 4. Full Test Suite
```bash
dbt test  # All tests
```

### 5. Generate Docs
```bash
dbt docs generate
dbt docs serve  # Open http://localhost:8000
```

---

## Cost & Performance

### Model Materialization Strategy

| Layer | Materialization | Cost | Speed | Notes |
|-------|-----------------|------|-------|-------|
| **Staging** | View | Low | Fast | Re-queries raw each time (fine for small raw data) |
| **Intermediate** | Table | Medium | Fast | Materialized; reused by multiple marts |
| **Marts** | Table | Medium | Instant | Pre-aggregated; serves BI queries quickly |

### Expected Query Times (Phase 5)

| Query | Rows | Time | Cost |
|-------|------|------|------|
| `SELECT * FROM fct_revenue LIMIT 100` | 100 | <1s | <$0.01 |
| `SELECT SUM(revenue) FROM fct_revenue GROUP BY segment` | 4 | 2s | $0.05 |
| `SELECT ... FROM fct_revenue JOIN dim_customer ...` (monthly) | 10M | 10s | $0.50 |

---

## Phase 5 Deliverables

- [ ] dbt project created + configured
- [ ] 12+ staging models (GL, AR, AP, CRM, EPM, etc.)
- [ ] 8+ intermediate models (revenue, expense, dimensions)
- [ ] 6+ marts (fct_revenue, fct_expense, dim_*, mart_p_and_l)
- [ ] >95% test coverage
- [ ] Semantic model (for Phase 6 agent)
- [ ] dbt docs (auto-generated, lineage)
- [ ] Performance baselines (query latency <10s)
- [ ] Cost benchmarks (mart maintenance <$50/month)

---

## Phase 5 → Phase 6 Handoff

**Phase 6 (Bedrock Agent) will:**
1. Read dbt semantic model.
2. Understand available metrics + dimensions.
3. Generate SQL against marts.
4. Execute via Lambda → Redshift.
5. Return results to user.

**Phase 5 guarantees:**
- ✅ Marts are ACID (Phase 4 curated base).
- ✅ Columns are documented (dbt YAML).
- ✅ Data quality tested (>95% coverage).
- ✅ Lineage is clear (dbt docs).

---

## Related Documentation

- [Main Architecture](../ARCHITECTURE.md)
- [Phase 4 Architecture](./PHASE-4.md) — Curated Iceberg source data
- [data-dictionary.md](../data-dictionary.md) — GL accounts, field definitions
- [dbt documentation](https://docs.getdbt.com/docs/core/dbt-core-on-redshift) — dbt-redshift plugin

---

**Last Updated:** 2026-05-05 | **Phase Status:** 🚧 In Progress
