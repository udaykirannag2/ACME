-- Fact: monthly expenses by entity × cost center × category
-- Grain: entity_id × cost_center_id × pnl_rollup × period_yyyymm

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
    expense_amount,
    line_count

from {{ ref('int_expense_monthly') }}
