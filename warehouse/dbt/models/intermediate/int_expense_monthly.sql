-- Monthly expenses from GL — COGS, S&M, R&D, G&A
-- Grain: entity_id × cost_center_id × pnl_rollup × period_yyyymm

with gl as (
    select * from {{ ref('int_gl_entries_enriched') }}
    where is_expense = true
)

select
    entity_id,
    cost_center_id,
    cc_function,
    account_id,
    account_name,
    pnl_rollup,
    period_yyyymm,
    fiscal_year,
    fiscal_quarter,

    -- Expense accounts: debit increases expense
    sum(debit_amount - credit_amount)                       as expense_amount,
    count(*)                                                as line_count

from gl
group by 1, 2, 3, 4, 5, 6, 7, 8, 9
