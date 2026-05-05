select
    account_id,
    account_number,
    account_name,
    account_type,
    pnl_rollup,
    segment,
    is_revenue,
    is_expense,
    is_balance_sheet,
    is_pnl

from {{ ref('stg_erp__chart_of_accounts') }}
