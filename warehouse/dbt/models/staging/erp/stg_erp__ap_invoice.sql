with source as (
    select * from {{ source('curated_erp', 'ap_invoice') }}
)

select
    ap_invoice_id,
    vendor_id,
    invoice_number,
    invoice_date,
    due_date,
    amount,
    account_id,
    cost_center_id,
    status,

    datediff('day', invoice_date, current_date)             as days_since_invoice,
    datediff('day', due_date, current_date)                 as days_overdue,
    case when status = 'open' and current_date > due_date
         then true else false end                           as is_overdue,

    _ingest_date,
    _ingest_run_id

from source
where status != 'voided'
