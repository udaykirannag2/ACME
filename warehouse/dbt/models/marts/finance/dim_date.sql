-- Calendar + fiscal date spine: Feb 2023 → Jan 2026 (FY23–FY25)
-- Fiscal year ends Jan 31. FY25 = Feb 1 2024 → Jan 31 2025.

{{ config(materialized='table') }}

with date_spine as (
    {{ dbt_utils.date_spine(
        datepart="day",
        start_date="cast('2023-02-01' as date)",
        end_date="cast('2026-02-01' as date)"
    ) }}
),

final as (
    select
        date_day                                            as date_day,
        extract(year  from date_day)::int                  as calendar_year,
        extract(month from date_day)::int                  as calendar_month,
        extract(quarter from date_day)::int                as calendar_quarter,
        to_char(date_day, 'YYYYMM')::int                   as period_yyyymm,
        to_char(date_day, 'Month YYYY')                    as month_name,
        date_trunc('month', date_day)::date                as month_start_date,

        -- Fiscal year logic: FY ends Jan 31
        case
            when extract(month from date_day) >= 2
            then extract(year from date_day)::int
            else extract(year from date_day)::int - 1
        end                                                 as fiscal_year,

        case
            when extract(month from date_day) in (2,3,4)  then 1
            when extract(month from date_day) in (5,6,7)  then 2
            when extract(month from date_day) in (8,9,10) then 3
            else 4
        end                                                 as fiscal_quarter,

        case extract(dow from date_day)
            when 0 then 'Sunday'
            when 1 then 'Monday'
            when 2 then 'Tuesday'
            when 3 then 'Wednesday'
            when 4 then 'Thursday'
            when 5 then 'Friday'
            when 6 then 'Saturday'
        end                                                 as day_of_week,

        extract(dow from date_day) in (0, 6)               as is_weekend

    from date_spine
)

select * from final
