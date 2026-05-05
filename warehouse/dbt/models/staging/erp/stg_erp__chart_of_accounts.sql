with source as (
    select * from {{ source('curated_erp', 'chart_of_accounts') }}
)

select
    account_id,
    account_number,
    account_name,
    account_type,
    pnl_rollup,
    segment,
    is_active,

    -- derived flags for mart filtering
    account_type = 'revenue'                                as is_revenue,
    account_type = 'expense'                                as is_expense,
    account_type in ('asset', 'liability', 'equity')        as is_balance_sheet,
    pnl_rollup in ('revenue', 'cogs', 'sm', 'rd', 'ga')    as is_pnl

from source
where is_active = true
