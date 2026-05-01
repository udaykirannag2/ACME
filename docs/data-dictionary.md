# ACME SaaS Solutions — Data Dictionary

Defines the canonical schema for ACME's three source systems and the warehouse marts. Modeled on Salesforce's (CRM) public filings: segments, revenue mix, opex ratios, geographic split.

**Conventions**
- All monetary amounts in USD with 2-decimal precision (`numeric(18,2)`).
- All `*_id` columns are surrogate keys (UUID v7 strings) unless noted.
- All `*_date` columns are `date`. All `*_at` columns are `timestamptz`.
- Fiscal year ends **January 31** (FY25 = Feb 1, 2024 → Jan 31, 2025).
- Period grain is calendar month (`yyyymm`, e.g. `202509`).
- `entity_id` ∈ {`US`, `EMEA`, `APAC`} — three legal entities.

---

## Source 1: ERP (NetSuite-style)

Stored in: RDS Postgres `acme_erp` (Phase 3). Extracted via DMS to S3 (Phase 4).

### `entity`
| Column | Type | Notes |
|---|---|---|
| entity_id | varchar(8) PK | `US`, `EMEA`, `APAC` |
| entity_name | varchar(64) | "ACME US Inc.", "ACME EMEA Ltd.", "ACME APAC Pte." |
| functional_currency | char(3) | All `USD` for v1 |
| parent_entity_id | varchar(8) FK→entity | NULL for `US` (top of consolidation) |

### `chart_of_accounts`
| Column | Type | Notes |
|---|---|---|
| account_id | varchar(16) PK | e.g. `4000-SALES-CLOUD` |
| account_number | varchar(8) | e.g. `4000` |
| account_name | varchar(128) | e.g. "Subscription Revenue — Sales Cloud" |
| account_type | varchar(16) | `asset` \| `liability` \| `equity` \| `revenue` \| `expense` |
| pnl_rollup | varchar(32) | `revenue`, `cogs`, `sm`, `rd`, `ga`, `other_income`, `tax`. Drives P&L marts. |
| segment | varchar(32) NULL | Only for revenue/COGS: `sales_cloud`, `service_cloud`, `platform`, `marketing_commerce` |
| is_active | boolean | |

**~140 accounts**: revenue (8 per segment × 4 segments × 3 channels), COGS, S&M (sub-buckets: salaries, marketing programs, T&E), R&D, G&A, balance-sheet accounts (cash, AR, AP, fixed assets, accumulated depreciation, equity).

### `cost_center`
| Column | Type | Notes |
|---|---|---|
| cost_center_id | varchar(16) PK | e.g. `CC-SALES-EMEA` |
| cost_center_name | varchar(128) | |
| function | varchar(32) | `sales`, `marketing`, `rd`, `customer_success`, `ga`, `it` |
| entity_id | varchar(8) FK→entity | |

**~25 cost centers** across 3 entities × 6 functions (some functions only at US HQ).

### `gl_journal_header`
| Column | Type | Notes |
|---|---|---|
| journal_id | varchar(36) PK | UUID v7 |
| journal_number | varchar(16) | Human-readable, e.g. `JE-2025-001234` |
| posting_date | date | |
| period_yyyymm | int | Derived from posting_date |
| entity_id | varchar(8) FK→entity | |
| journal_type | varchar(16) | `manual`, `auto_revrec`, `auto_dep`, `auto_ar`, `auto_ap`, `intercompany` |
| description | text | |
| created_by | varchar(64) | |
| created_at | timestamptz | |

### `gl_journal_line`
| Column | Type | Notes |
|---|---|---|
| journal_line_id | varchar(36) PK | |
| journal_id | varchar(36) FK→gl_journal_header | |
| line_number | int | 1-based within journal |
| account_id | varchar(16) FK→chart_of_accounts | |
| cost_center_id | varchar(16) FK→cost_center NULL | NULL for balance-sheet accounts |
| debit_amount | numeric(18,2) | Mutually exclusive with credit_amount |
| credit_amount | numeric(18,2) | |
| memo | text | |
| reference_doc_type | varchar(16) NULL | `ap_invoice`, `ar_invoice`, `fa_dep`, etc. |
| reference_doc_id | varchar(36) NULL | FK to source doc |

**Invariant**: per `journal_id`, sum(debit) = sum(credit). Per `period_yyyymm`, sum(debit) = sum(credit). Phase 5 dbt test enforces this.

### `vendor`
| Column | Type | Notes |
|---|---|---|
| vendor_id | varchar(36) PK | |
| vendor_name | varchar(256) | |
| vendor_category | varchar(32) | `cloud_infra`, `marketing_agency`, `contractor`, `saas_tool`, `office`, `legal`, `payroll_provider` |
| payment_terms | varchar(8) | `NET30`, `NET45`, `NET60` |
| entity_id | varchar(8) FK→entity | |
| created_at | timestamptz | |

### `customer`
| Column | Type | Notes |
|---|---|---|
| customer_id | varchar(36) PK | Same value as `crm.account.account_id` for reconciliation |
| customer_name | varchar(256) | |
| billing_country | char(2) | ISO-2 |
| segment_tier | varchar(16) | `enterprise`, `commercial`, `smb` |
| created_at | timestamptz | |

### `ap_invoice`
| Column | Type | Notes |
|---|---|---|
| ap_invoice_id | varchar(36) PK | |
| vendor_id | varchar(36) FK→vendor | |
| invoice_number | varchar(64) | |
| invoice_date | date | |
| due_date | date | |
| amount | numeric(18,2) | Gross |
| account_id | varchar(16) FK→chart_of_accounts | The expense account |
| cost_center_id | varchar(16) FK→cost_center | |
| status | varchar(16) | `open`, `partial`, `paid`, `voided` |
| created_at | timestamptz | |

### `ap_payment`
| Column | Type | Notes |
|---|---|---|
| ap_payment_id | varchar(36) PK | |
| ap_invoice_id | varchar(36) FK→ap_invoice | |
| payment_date | date | |
| amount | numeric(18,2) | |

### `ar_invoice`
| Column | Type | Notes |
|---|---|---|
| ar_invoice_id | varchar(36) PK | |
| customer_id | varchar(36) FK→customer | |
| invoice_number | varchar(64) | |
| invoice_date | date | |
| due_date | date | |
| amount | numeric(18,2) | |
| service_period_start | date | For ratable rev rec |
| service_period_end | date | |
| segment | varchar(32) | Revenue segment (matches `chart_of_accounts.segment`) |
| status | varchar(16) | `open`, `partial`, `paid`, `voided` |
| opportunity_id | varchar(36) NULL | FK→crm.opportunity for traceability |
| created_at | timestamptz | |

### `ar_receipt`
| Column | Type | Notes |
|---|---|---|
| ar_receipt_id | varchar(36) PK | |
| ar_invoice_id | varchar(36) FK→ar_invoice | |
| receipt_date | date | |
| amount | numeric(18,2) | |

### `fixed_asset`
| Column | Type | Notes |
|---|---|---|
| fixed_asset_id | varchar(36) PK | |
| asset_tag | varchar(32) | Human-readable, e.g. `FA-LAPTOP-00123` |
| asset_class | varchar(32) | `laptop`, `server`, `office_furniture`, `leasehold_improvement`, `software` |
| acquisition_date | date | |
| acquisition_cost | numeric(18,2) | |
| useful_life_months | int | `36` for laptops, `60` for servers, etc. |
| salvage_value | numeric(18,2) | |
| depreciation_method | varchar(16) | `straight_line` only in v1 |
| entity_id | varchar(8) FK→entity | |
| cost_center_id | varchar(16) FK→cost_center | |
| disposal_date | date NULL | |
| disposal_proceeds | numeric(18,2) NULL | |
| status | varchar(16) | `active`, `disposed`, `fully_depreciated` |

### `fa_depreciation`
| Column | Type | Notes |
|---|---|---|
| fa_depreciation_id | varchar(36) PK | |
| fixed_asset_id | varchar(36) FK→fixed_asset | |
| period_yyyymm | int | |
| depreciation_amount | numeric(18,2) | Monthly straight-line |
| accumulated_depreciation | numeric(18,2) | After this period |
| net_book_value | numeric(18,2) | |

---

## Source 2: EPM (Anaplan/Hyperion-style)

Stored in: S3 Parquet drops at `s3://acme-lake-raw/epm/`. Mimics typical EPM exports.

### `budget_version`
| Column | Type | Notes |
|---|---|---|
| budget_version_id | varchar(36) PK | |
| version_name | varchar(64) | e.g. `FY25 Budget v1`, `FY25 Budget v2 (Q1 RF)`, `FY25 Q3 Re-forecast` |
| version_type | varchar(16) | `budget` \| `forecast` \| `actuals_snapshot` |
| fiscal_year | int | `2025` |
| created_date | date | |
| is_current | boolean | One per fiscal_year + version_type |

### `forecast_version`
Same shape as `budget_version` but separate table for clarity (some teams version forecasts independently).

### `plan_line`
| Column | Type | Notes |
|---|---|---|
| plan_line_id | varchar(36) PK | |
| version_id | varchar(36) | FK to either budget_version or forecast_version (resolved by version_type) |
| version_type | varchar(16) | `budget` \| `forecast` |
| account_id | varchar(16) FK→erp.chart_of_accounts | Same COA as ERP — critical for BvA |
| cost_center_id | varchar(16) FK→erp.cost_center | |
| entity_id | varchar(8) FK→erp.entity | |
| period_yyyymm | int | |
| amount | numeric(18,2) | Planned debit (expenses positive, revenue stored as positive too — see semantic layer) |
| segment | varchar(32) NULL | For revenue lines |

**Grain**: one row per (version, account, cost_center, entity, period). Typical row count: ~140 accounts × 25 cost_centers × 12 months × 5 versions ≈ 210K rows for FY25.

### `headcount_plan`
| Column | Type | Notes |
|---|---|---|
| headcount_plan_id | varchar(36) PK | |
| version_id | varchar(36) | |
| cost_center_id | varchar(16) FK | |
| period_yyyymm | int | |
| planned_headcount | numeric(8,2) | Decimal allows for FTEs |
| planned_salary_cost | numeric(18,2) | Fully-loaded |

### `driver_assumption`
| Column | Type | Notes |
|---|---|---|
| driver_assumption_id | varchar(36) PK | |
| version_id | varchar(36) | |
| driver_name | varchar(64) | `arr_growth_pct`, `gross_churn_pct`, `sm_pct_of_revenue`, `rd_pct_of_revenue`, `ga_pct_of_revenue`, `gross_margin_pct`, `dso_days`, `dpo_days` |
| period_yyyymm | int | |
| value | numeric(10,4) | Percentages as decimals (0.45 = 45%) |
| segment | varchar(32) NULL | For segment-specific drivers |

This table powers the what-if engine in Phase 9.

---

## Source 3: CRM (Salesforce-style)

Stored in: S3 Parquet drops at `s3://acme-lake-raw/crm/`. Mimics a Salesforce Bulk API export.

### `account`
| Column | Type | Notes |
|---|---|---|
| account_id | varchar(36) PK | Matches `erp.customer.customer_id` |
| account_name | varchar(256) | |
| industry | varchar(64) | |
| billing_country | char(2) | |
| segment_tier | varchar(16) | `enterprise`, `commercial`, `smb` |
| owner_name | varchar(128) | Sales rep |
| created_date | date | |

### `contact`
| Column | Type | Notes |
|---|---|---|
| contact_id | varchar(36) PK | |
| account_id | varchar(36) FK→account | |
| email | varchar(256) | |
| title | varchar(128) | |

### `opportunity`
| Column | Type | Notes |
|---|---|---|
| opportunity_id | varchar(36) PK | |
| account_id | varchar(36) FK→account | |
| name | varchar(256) | |
| stage | varchar(32) | `prospecting`, `qualification`, `proposal`, `negotiation`, `closed_won`, `closed_lost` |
| amount | numeric(18,2) | Total ACV |
| close_date | date | |
| probability_pct | int | 0–100 |
| segment | varchar(32) | Matches revenue segment |
| owner_name | varchar(128) | |
| created_date | date | |
| modified_date | date | |

### `opportunity_line`
| Column | Type | Notes |
|---|---|---|
| opportunity_line_id | varchar(36) PK | |
| opportunity_id | varchar(36) FK→opportunity | |
| product_code | varchar(32) | e.g. `SC-ENT`, `SVC-COM`, `PLAT-SMB` |
| segment | varchar(32) | |
| acv_amount | numeric(18,2) | |
| seats | int | |

### `pipeline_snapshot`
Daily snapshot of every open opportunity — enables historical pipeline analysis.

| Column | Type | Notes |
|---|---|---|
| snapshot_date | date | |
| opportunity_id | varchar(36) FK→opportunity | |
| stage | varchar(32) | At snapshot time |
| amount | numeric(18,2) | At snapshot time |
| close_date | date | At snapshot time |
| probability_pct | int | |

PK: (snapshot_date, opportunity_id).

### `closed_won`
Materialized view of opportunities where `stage = 'closed_won'`. Convenient for revenue reconciliation.

### `arr_movement`
ARR roll-forward by month. Source-of-truth for ARR-based metrics.

| Column | Type | Notes |
|---|---|---|
| arr_movement_id | varchar(36) PK | |
| period_yyyymm | int | |
| account_id | varchar(36) FK→account | |
| segment | varchar(32) | |
| movement_type | varchar(16) | `new`, `expansion`, `contraction`, `churn`, `renewal` |
| arr_change | numeric(18,2) | + for new/expansion/renewal, − for contraction/churn |
| starting_arr | numeric(18,2) | Account ARR at start of period |
| ending_arr | numeric(18,2) | After this movement |

---

## Warehouse marts (Phase 5 preview)

Built with dbt over the curated zone. Documented now so generators target them correctly.

### `dim_date`
Standard date dimension keyed by `date_key` (yyyymmdd). Includes `period_yyyymm`, `fiscal_year`, `fiscal_quarter`, `fiscal_month_no` (1–12 with Feb=1).

### `dim_account`
| Column | Source |
|---|---|
| account_id | erp.chart_of_accounts |
| pnl_rollup | erp.chart_of_accounts |
| pnl_sort_order | derived (revenue=10, cogs=20, sm=30, rd=40, ga=50, other=60, tax=70) |
| segment | erp.chart_of_accounts |

### `dim_cost_center`, `dim_entity`
Direct from ERP.

### `fct_gl_balance`
Grain: account × cost_center × entity × period × scenario (`actual` only from GL; budget/forecast scenarios filled from EPM).
Measures: `debit_total`, `credit_total`, `net_amount` (signed by account_type).

### `fct_pnl_monthly`
Grain: pnl_rollup × segment × entity × period × scenario.
The agent's primary surface for "show me the P&L" queries.

### `fct_bva`
Pre-computed budget vs actual variances.
Grain: account × cost_center × entity × period × comparison (`actual_vs_budget`, `actual_vs_forecast`, `forecast_vs_budget`).
Measures: `actual_amount`, `comparison_amount`, `variance`, `variance_pct`.

### `fct_ar_aging`
Grain: customer × period_yyyymm × aging_bucket (`current`, `1_30`, `31_60`, `61_90`, `over_90`).
Measures: `outstanding_amount`, `invoice_count`.

### `fct_fa_register`
Grain: fixed_asset × period.
Measures: `cost`, `accumulated_depreciation`, `net_book_value`, `depreciation_this_period`.

### `fct_arr_movement`
Direct from CRM `arr_movement` plus rollups by segment, entity (derived from account billing country).

### `fct_pipeline_snapshot`
Direct from CRM `pipeline_snapshot`, joined with `opportunity` for current values.

---

## Anomalies seeded by generators (Phase 2)

Documented up front so the agent's eval harness can verify they're detected.

| Anomaly | Where | What the agent should find |
|---|---|---|
| Q3 FY25 EMEA S&M overspend | `gl_journal_line` posts ~$8M extra to S&M cost centers in EMEA, Sep–Oct 2024 | "EMEA S&M is $8M over budget in Q3 driven by marketing programs cost center." |
| Aged AR > 90 days | One enterprise customer's $2.4M invoice goes unpaid >90 days | "Customer X has $2.4M aged >90 days; days outstanding 112." |
| Mid-year fixed asset disposal | A server cluster disposed Aug 2024 with $300K loss | "Disposal of FA-SERVER-CLUSTER-A in Aug 2024 generated a $300K loss recognized in other expense." |
| Stalled pipeline | 3 enterprise opportunities stuck in `negotiation` for >120 days | "Three enterprise opps totaling $14M ACV are stalled in negotiation." |
| Forecast bias on S&M | Forecast under-calls S&M actuals by 5–8% in H2 | "Forecast for S&M has been consistently low by ~6% over the last six periods." |

---

## Open questions (lock these before Phase 2)

1. **Multi-currency**: USD-only is assumed. If ACME should be multi-currency (FX revaluation, gain/loss on translation), say so before Phase 2 — it adds materially to scope.
2. **Intercompany**: Should EMEA/APAC have intercompany payables to US for IP royalties? Default: **yes**, simple cost-plus model, ~3% of segment revenue. Adds intercompany journals and elimination logic in marts.
3. **Equity / cash flow**: Do we need a full statement of cash flows and equity? Default: **stub only** — we'll generate cash & equity opening balances and the indirect-method CFS in marts, but won't model stock comp expense in detail.
4. **Stock-based compensation**: Default: **simple flat % of payroll** (~15%, in line with SaaS norms), one journal per period.
5. **Taxes**: Default: **simplified** — apply 23% effective tax rate to operating income, single deferred-tax balance, no jurisdiction detail.
