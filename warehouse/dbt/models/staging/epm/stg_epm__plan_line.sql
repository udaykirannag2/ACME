with source as (
    select * from {{ source('curated_epm', 'plan_line') }}
)

select
    plan_line_id,
    version_id,
    version_type,
    account_id,
    cost_center_id,
    entity_id,
    amount,
    segment,
    period_yyyymm,
    _ingest_date,
    _ingest_run_id,

    -- fiscal_year from period_yyyymm string (format YYYYMM)
    case
        when cast(right(period_yyyymm, 2) as integer) >= 2
        then cast(left(period_yyyymm, 4) as integer)
        else cast(left(period_yyyymm, 4) as integer) - 1
    end                                                     as fiscal_year

from source
