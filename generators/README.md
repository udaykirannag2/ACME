# Generators

Synthetic data generators for ACME SaaS Solutions, shaped by Salesforce's public 10-K.

## Module map (planned for Phase 2)

| Module | Produces | Drives |
|---|---|---|
| `config.py` | Tunable parameters (revenue trajectory, segment mix, ratios) | Everything |
| `entities.py` | `entity`, `cost_center`, `chart_of_accounts` | All ERP/EPM tables |
| `crm.py` | `account`, `contact`, `opportunity`, `opportunity_line`, `pipeline_snapshot`, `arr_movement` | Bookings → ARR → revenue |
| `ar.py` | `customer`, `ar_invoice`, `ar_receipt` | Top of revenue cash flow |
| `ap.py` | `vendor`, `ap_invoice`, `ap_payment` | Opex |
| `payroll.py` | Payroll-related AP invoices and accruals | S&M / R&D / G&A salaries |
| `fixed_assets.py` | `fixed_asset`, `fa_depreciation` | Depreciation expense |
| `gl.py` | `gl_journal_header`, `gl_journal_line` (auto-posts from AR/AP/payroll/FA/intercompany) | The general ledger |
| `epm.py` | `budget_version`, `forecast_version`, `plan_line`, `headcount_plan`, `driver_assumption` | Budgets and forecasts |
| `anomalies.py` | Seeds the documented anomalies (EMEA S&M overspend, aged AR, FA disposal) | Eval cases for the agent |
| `validate.py` | Asserts GL balances, cross-system FK integrity | CI |
| `run_all.py` | Single CLI entry point | Reproducible regeneration |

## Reproducibility

All randomness routes through `numpy.random.default_rng(seed)`. The `--seed` flag (default `20260501`) makes runs deterministic — same seed → byte-identical Parquet output.

## Output

```
generators/_out/
  erp/                    # CSV files for direct Postgres COPY
    entity.csv
    chart_of_accounts.csv
    ...
  epm/<table>/period_yyyymm=NNNNNN/part-0.parquet
  crm/<table>/.../part-0.parquet
```
