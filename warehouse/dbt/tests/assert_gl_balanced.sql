-- Per GL journal, debits must equal credits (double-entry invariant).
-- Returns rows where the journal is out of balance — must return 0 rows.

select
    journal_id,
    journal_number,
    sum(debit_amount)                                       as total_debits,
    sum(credit_amount)                                      as total_credits,
    abs(sum(debit_amount) - sum(credit_amount))             as imbalance

from {{ ref('fct_gl_entries') }}
group by 1, 2
having abs(sum(debit_amount) - sum(credit_amount)) > 0.01
