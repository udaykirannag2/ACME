-- GL journal lines enriched with account type, cost center, entity
-- This is the central fact driving all P&L and balance sheet marts

with gl as (
    select * from {{ ref('stg_erp__gl_journal_line') }}
),

coa as (
    select * from {{ ref('stg_erp__chart_of_accounts') }}
),

cc as (
    select * from {{ ref('stg_erp__cost_center') }}
),

enriched as (
    select
        gl.journal_line_id,
        gl.journal_id,
        gl.journal_number,
        gl.posting_date,
        gl.period_yyyymm,
        gl.fiscal_year,
        gl.fiscal_quarter,
        gl.entity_id,
        gl.journal_type,
        gl.account_id,
        gl.cost_center_id,
        gl.debit_amount,
        gl.credit_amount,
        gl.net_amount,
        gl.reference_doc_type,
        gl.reference_doc_id,

        -- account dimension
        coa.account_number,
        coa.account_name,
        coa.account_type,
        coa.pnl_rollup,
        coa.segment                                         as account_segment,
        coa.is_revenue,
        coa.is_expense,
        coa.is_balance_sheet,
        coa.is_pnl,

        -- cost center dimension
        cc.cost_center_name,
        cc.function                                         as cc_function

    from gl
    left join coa on gl.account_id = coa.account_id
    left join cc  on gl.cost_center_id = cc.cost_center_id
)

select * from enriched
