-- Fact: monthly revenue by entity × segment
-- Grain: entity_id × segment × period_yyyymm

select
    entity_id,
    segment,
    pnl_rollup,
    period_yyyymm,
    fiscal_year,
    fiscal_quarter,
    revenue_amount,
    journal_count,
    line_count

from {{ ref('int_revenue_monthly') }}
