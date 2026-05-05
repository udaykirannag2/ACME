select
    customer_id,
    customer_name,
    billing_country,
    segment_tier,
    customer_since_date,

    -- region grouping
    case
        when billing_country in ('US','CA','MX','BR')            then 'Americas'
        when billing_country in ('GB','DE','FR','NL','SE','IE')  then 'EMEA'
        else 'APAC'
    end                                                     as region

from {{ ref('stg_erp__customer') }}
