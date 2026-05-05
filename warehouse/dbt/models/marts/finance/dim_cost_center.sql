select
    cc.cost_center_id,
    cc.cost_center_name,
    cc.function,
    cc.entity_id,
    e.entity_name

from {{ ref('stg_erp__cost_center') }} cc
left join {{ ref('stg_erp__entity') }} e on cc.entity_id = e.entity_id
