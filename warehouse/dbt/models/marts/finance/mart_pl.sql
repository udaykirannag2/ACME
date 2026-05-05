-- P&L Summary: Revenue vs Expense by period and entity
-- Grain: entity_id × fiscal_year × fiscal_quarter × period_yyyymm × pnl_rollup

with revenue as (
    select
        entity_id,
        fiscal_year,
        fiscal_quarter,
        period_yyyymm,
        sum(revenue_amount)                                 as total_revenue
    from {{ ref('fct_revenue') }}
    group by 1, 2, 3, 4
),

expense as (
    select
        entity_id,
        fiscal_year,
        fiscal_quarter,
        period_yyyymm,
        pnl_rollup,
        sum(expense_amount)                                 as total_expense
    from {{ ref('fct_expense') }}
    group by 1, 2, 3, 4, 5
),

expense_pivoted as (
    select
        entity_id,
        fiscal_year,
        fiscal_quarter,
        period_yyyymm,
        sum(case when pnl_rollup = 'cogs' then total_expense else 0 end) as cogs,
        sum(case when pnl_rollup = 'sm'   then total_expense else 0 end) as sales_marketing,
        sum(case when pnl_rollup = 'rd'   then total_expense else 0 end) as research_dev,
        sum(case when pnl_rollup = 'ga'   then total_expense else 0 end) as general_admin,
        sum(total_expense)                                               as total_opex
    from expense
    group by 1, 2, 3, 4
),

final as (
    select
        r.entity_id,
        r.fiscal_year,
        r.fiscal_quarter,
        r.period_yyyymm,
        r.total_revenue,
        e.cogs,
        r.total_revenue - e.cogs                            as gross_profit,
        case when r.total_revenue > 0
             then (r.total_revenue - e.cogs) / r.total_revenue
             else null end                                  as gross_margin_pct,
        e.sales_marketing,
        e.research_dev,
        e.general_admin,
        e.total_opex,
        r.total_revenue - e.total_opex                     as operating_income,
        case when r.total_revenue > 0
             then (r.total_revenue - e.total_opex) / r.total_revenue
             else null end                                  as operating_margin_pct

    from revenue r
    left join expense_pivoted e
        on  r.entity_id     = e.entity_id
        and r.period_yyyymm = e.period_yyyymm
)

select * from final
