with source as (
    select * from {{ source('curated_erp', 'ar_invoice') }}
)

select
    ar_invoice_id,
    customer_id,
    invoice_number,
    invoice_date,
    due_date,
    amount,
    service_period_start,
    service_period_end,
    segment,
    status,
    opportunity_id,

    -- days outstanding
    datediff('day', invoice_date, current_date)             as days_since_invoice,
    datediff('day', due_date, current_date)                 as days_overdue,
    case when status = 'open' and current_date > due_date
         then true else false end                           as is_overdue,

    -- fiscal year from invoice date
    case
        when extract(month from invoice_date) >= 2
        then extract(year from invoice_date)
        else extract(year from invoice_date) - 1
    end                                                     as fiscal_year,

    _ingest_date,
    _ingest_run_id

from source
where status != 'voided'
