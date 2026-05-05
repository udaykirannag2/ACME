-- Fact: every GL journal line — the atomic finance grain
-- Powers all P&L, balance sheet, and variance analysis

select
    journal_line_id,
    journal_id,
    journal_number,
    posting_date,
    period_yyyymm,
    fiscal_year,
    fiscal_quarter,
    entity_id,
    journal_type,
    account_id,
    account_name,
    account_type,
    pnl_rollup,
    account_segment,
    cost_center_id,
    cost_center_name,
    cc_function,
    debit_amount,
    credit_amount,
    net_amount,
    reference_doc_type,
    reference_doc_id,
    is_revenue,
    is_expense,
    is_balance_sheet

from {{ ref('int_gl_entries_enriched') }}
