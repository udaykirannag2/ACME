-- AR Aging: open invoices bucketed by days overdue
-- Grain: one row per open AR invoice with aging bucket

with ar as (
    select * from {{ ref('stg_erp__ar_invoice') }}
    where status = 'open'
),

customers as (
    select * from {{ ref('dim_customer') }}
)

select
    ar.ar_invoice_id,
    ar.customer_id,
    c.customer_name,
    c.segment_tier,
    c.region,
    ar.invoice_number,
    ar.invoice_date,
    ar.due_date,
    ar.amount,
    ar.segment,
    ar.days_overdue,

    -- Standard AR aging buckets
    case
        when ar.days_overdue <= 0  then 'Current'
        when ar.days_overdue <= 30 then '1-30 days'
        when ar.days_overdue <= 60 then '31-60 days'
        when ar.days_overdue <= 90 then '61-90 days'
        else '90+ days'
    end                                                     as aging_bucket,

    ar.fiscal_year

from ar
left join customers c on ar.customer_id = c.customer_id
