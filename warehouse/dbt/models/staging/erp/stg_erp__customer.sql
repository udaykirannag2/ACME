with source as (
    select * from {{ source('curated_erp', 'customer') }}
)

select
    customer_id,
    customer_name,
    billing_country,
    segment_tier,
    created_at::date                                        as customer_since_date

from source
