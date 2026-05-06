with source as (
    select * from {{ source('curated_erp', 'gl_journal_line') }}
),

header as (
    select * from {{ source('curated_erp', 'gl_journal_header') }}
),

joined as (
    select
        l.journal_line_id,
        l.journal_id,
        l.line_number,
        l.account_id,
        l.cost_center_id,
        l.debit_amount,
        l.credit_amount,
        l.debit_amount - l.credit_amount                    as net_amount,
        l.memo,
        l.reference_doc_type,
        l.reference_doc_id,

        -- from header
        h.journal_number,
        h.posting_date,
        h.period_yyyymm,
        h.entity_id,
        h.journal_type,
        h.description                                       as journal_description,

        -- fiscal year/quarter derived from posting_date
        -- FY ends Jan 31: Feb = Q1, May = Q2, Aug = Q3, Nov = Q4
        case
            when extract(month from h.posting_date::date) >= 2
            then extract(year from h.posting_date::date)
            else extract(year from h.posting_date::date) - 1
        end                                                 as fiscal_year,

        case
            when extract(month from h.posting_date::date) in (2, 3, 4)  then 1
            when extract(month from h.posting_date::date) in (5, 6, 7)  then 2
            when extract(month from h.posting_date::date) in (8, 9, 10) then 3
            else 4
        end                                                 as fiscal_quarter,

        l._ingest_date,
        l._ingest_run_id

    from source l
    inner join header h on l.journal_id = h.journal_id
)

select * from joined
