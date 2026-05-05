with source as (
    select * from {{ source('curated_erp', 'entity') }}
)

select
    entity_id,
    entity_name,
    functional_currency,
    parent_entity_id,
    parent_entity_id is null                                as is_parent_entity

from source
