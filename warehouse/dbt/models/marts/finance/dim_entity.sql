select
    entity_id,
    entity_name,
    functional_currency,
    parent_entity_id,
    is_parent_entity

from {{ ref('stg_erp__entity') }}
