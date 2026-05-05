with source as (
    select * from {{ source('curated_erp', 'cost_center') }}
)

select
    cost_center_id,
    cost_center_name,
    function,
    entity_id

from source
