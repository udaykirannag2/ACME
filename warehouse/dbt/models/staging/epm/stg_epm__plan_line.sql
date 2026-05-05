with source as (
    select * from {{ source('curated_epm', 'plan_line') }}
),

budget_versions as (
    select * from {{ source('curated_epm', 'budget_version') }}
)

select
    pl.plan_line_id,
    pl.budget_version_id,
    bv.version_name,
    bv.version_type,
    bv.fiscal_year,
    pl.period_yyyymm,
    pl.account_id,
    pl.cost_center_id,
    pl.entity_id,
    pl.amount,
    pl._ingest_date

from source pl
inner join budget_versions bv on pl.budget_version_id = bv.budget_version_id
