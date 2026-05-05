with source as (
    select * from {{ source('curated_crm', 'arr_movement') }}
)

select
    *,
    case
        when extract(month from movement_date) >= 2
        then extract(year from movement_date)
        else extract(year from movement_date) - 1
    end                                                     as fiscal_year

from source
