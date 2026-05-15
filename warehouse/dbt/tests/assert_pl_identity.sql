-- P&L identity: operating_income must equal gross_profit minus total_opex
-- Returns failing rows (should return zero rows to pass)
select
    entity_id,
    fiscal_year,
    period_yyyymm,
    gross_profit,
    total_opex,
    operating_income,
    gross_profit - total_opex as expected_operating_income
from {{ ref('mart_pl') }}
where abs(operating_income - (gross_profit - total_opex)) > 0.01
