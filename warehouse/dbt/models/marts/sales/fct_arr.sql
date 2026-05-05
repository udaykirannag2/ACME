-- ARR Movements: new, expansion, contraction, churn by period
-- Grain: one row per ARR movement event

with arr as (
    select * from {{ ref('stg_crm__arr_movement') }}
),

customers as (
    select * from {{ ref('dim_customer') }}
)

select
    arr.*,
    c.customer_name,
    c.segment_tier,
    c.region,
    c.billing_country

from arr
left join customers c on arr.customer_id = c.customer_id
