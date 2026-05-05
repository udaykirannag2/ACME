-- Monthly revenue aggregated from GL — source of truth for P&L revenue line
-- Grain: entity_id × account_segment × period_yyyymm

with gl as (
    select * from {{ ref('int_gl_entries_enriched') }}
    where is_revenue = true
)

select
    entity_id,
    account_segment                                         as segment,
    pnl_rollup,
    period_yyyymm,
    fiscal_year,
    fiscal_quarter,

    -- Revenue accounts: credit increases revenue
    sum(credit_amount - debit_amount)                       as revenue_amount,
    count(distinct journal_id)                              as journal_count,
    count(*)                                                as line_count

from gl
group by 1, 2, 3, 4, 5, 6
