with source as (
    select * from {{ source('curated_crm', 'arr_movement') }}
)

select
    arr_movement_id,
    account_id                                              as customer_id,
    segment,
    movement_type,
    arr_change,
    starting_arr,
    ending_arr,
    period_yyyymm,
    _ingest_date,
    _ingest_run_id,

    -- fiscal_year from period_yyyymm string (format YYYYMM)
    -- FY ends Jan 31: month >= 2 stays in same year, month = 1 rolls back
    case
        when cast(right(period_yyyymm, 2) as integer) >= 2
        then cast(left(period_yyyymm, 4) as integer)
        else cast(left(period_yyyymm, 4) as integer) - 1
    end                                                     as fiscal_year

from source
