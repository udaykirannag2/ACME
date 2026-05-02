-- =============================================================================
-- ACME ERP — sample queries for DBeaver
--
-- These match the analyses produced by `uv run acme-verify`, but run directly
-- against the Postgres ERP database. Open each one in DBeaver, hit Cmd+Enter.
--
-- Connection: acme-erp-dev.cxcqwk6kulo4.us-east-1.rds.amazonaws.com / acme_erp
-- =============================================================================


-- =============================================================================
-- 1. INCOME STATEMENT (P&L) — three fiscal years side by side
--
-- Salesforce-style fiscal year: FY ends January 31.
--   FY25 = Feb 1, 2024 → Jan 31, 2025
-- =============================================================================
WITH gl_pl AS (
    SELECT
        CASE WHEN EXTRACT(MONTH FROM h.posting_date) >= 2
             THEN EXTRACT(YEAR FROM h.posting_date)::int + 1
             ELSE EXTRACT(YEAR FROM h.posting_date)::int
        END AS fy,
        coa.pnl_rollup,
        coa.account_type,
        -- Revenue normally has credit balance (CR > DR); expenses have debit balance.
        SUM(CASE WHEN coa.account_type = 'revenue'
                 THEN jl.credit_amount - jl.debit_amount
                 ELSE jl.debit_amount  - jl.credit_amount
            END) AS amount
    FROM raw_erp.gl_journal_line jl
    JOIN raw_erp.gl_journal_header h USING (journal_id)
    JOIN raw_erp.chart_of_accounts coa USING (account_id)
    WHERE coa.pnl_rollup IN ('revenue','cogs','sm','rd','ga','other_income','tax')
    GROUP BY 1, 2, 3
),
pivoted AS (
    SELECT pnl_rollup,
           SUM(CASE WHEN fy = 2023 THEN amount END) AS fy23,
           SUM(CASE WHEN fy = 2024 THEN amount END) AS fy24,
           SUM(CASE WHEN fy = 2025 THEN amount END) AS fy25
    FROM gl_pl
    WHERE fy BETWEEN 2023 AND 2025
    GROUP BY 1
),
all_lines AS (
    -- Direct rollups
    SELECT 10 AS sort, 'Revenue'                       AS line_item,
           COALESCE((SELECT fy23 FROM pivoted WHERE pnl_rollup='revenue'), 0) AS fy23,
           COALESCE((SELECT fy24 FROM pivoted WHERE pnl_rollup='revenue'), 0) AS fy24,
           COALESCE((SELECT fy25 FROM pivoted WHERE pnl_rollup='revenue'), 0) AS fy25
    UNION ALL
    SELECT 20, '(-) Cost of Revenue',
           COALESCE((SELECT fy23 FROM pivoted WHERE pnl_rollup='cogs'), 0),
           COALESCE((SELECT fy24 FROM pivoted WHERE pnl_rollup='cogs'), 0),
           COALESCE((SELECT fy25 FROM pivoted WHERE pnl_rollup='cogs'), 0)
    UNION ALL
    -- Gross profit
    SELECT 30, '== GROSS PROFIT ==',
           COALESCE((SELECT fy23 FROM pivoted WHERE pnl_rollup='revenue'), 0)
              - COALESCE((SELECT fy23 FROM pivoted WHERE pnl_rollup='cogs'), 0),
           COALESCE((SELECT fy24 FROM pivoted WHERE pnl_rollup='revenue'), 0)
              - COALESCE((SELECT fy24 FROM pivoted WHERE pnl_rollup='cogs'), 0),
           COALESCE((SELECT fy25 FROM pivoted WHERE pnl_rollup='revenue'), 0)
              - COALESCE((SELECT fy25 FROM pivoted WHERE pnl_rollup='cogs'), 0)
    UNION ALL
    SELECT 40, '(-) Sales & Marketing',
           COALESCE((SELECT fy23 FROM pivoted WHERE pnl_rollup='sm'), 0),
           COALESCE((SELECT fy24 FROM pivoted WHERE pnl_rollup='sm'), 0),
           COALESCE((SELECT fy25 FROM pivoted WHERE pnl_rollup='sm'), 0)
    UNION ALL
    SELECT 50, '(-) Research & Development',
           COALESCE((SELECT fy23 FROM pivoted WHERE pnl_rollup='rd'), 0),
           COALESCE((SELECT fy24 FROM pivoted WHERE pnl_rollup='rd'), 0),
           COALESCE((SELECT fy25 FROM pivoted WHERE pnl_rollup='rd'), 0)
    UNION ALL
    SELECT 60, '(-) General & Admin',
           COALESCE((SELECT fy23 FROM pivoted WHERE pnl_rollup='ga'), 0),
           COALESCE((SELECT fy24 FROM pivoted WHERE pnl_rollup='ga'), 0),
           COALESCE((SELECT fy25 FROM pivoted WHERE pnl_rollup='ga'), 0)
    UNION ALL
    -- Operating income = GP - SM - RD - GA
    SELECT 70, '== OPERATING INCOME ==',
           COALESCE((SELECT fy23 FROM pivoted WHERE pnl_rollup='revenue'), 0)
              - COALESCE((SELECT fy23 FROM pivoted WHERE pnl_rollup='cogs'), 0)
              - COALESCE((SELECT fy23 FROM pivoted WHERE pnl_rollup='sm'), 0)
              - COALESCE((SELECT fy23 FROM pivoted WHERE pnl_rollup='rd'), 0)
              - COALESCE((SELECT fy23 FROM pivoted WHERE pnl_rollup='ga'), 0),
           COALESCE((SELECT fy24 FROM pivoted WHERE pnl_rollup='revenue'), 0)
              - COALESCE((SELECT fy24 FROM pivoted WHERE pnl_rollup='cogs'), 0)
              - COALESCE((SELECT fy24 FROM pivoted WHERE pnl_rollup='sm'), 0)
              - COALESCE((SELECT fy24 FROM pivoted WHERE pnl_rollup='rd'), 0)
              - COALESCE((SELECT fy24 FROM pivoted WHERE pnl_rollup='ga'), 0),
           COALESCE((SELECT fy25 FROM pivoted WHERE pnl_rollup='revenue'), 0)
              - COALESCE((SELECT fy25 FROM pivoted WHERE pnl_rollup='cogs'), 0)
              - COALESCE((SELECT fy25 FROM pivoted WHERE pnl_rollup='sm'), 0)
              - COALESCE((SELECT fy25 FROM pivoted WHERE pnl_rollup='rd'), 0)
              - COALESCE((SELECT fy25 FROM pivoted WHERE pnl_rollup='ga'), 0)
    UNION ALL
    SELECT 80, '(+/-) Other Income / (Expense)',
           COALESCE((SELECT fy23 FROM pivoted WHERE pnl_rollup='other_income'), 0),
           COALESCE((SELECT fy24 FROM pivoted WHERE pnl_rollup='other_income'), 0),
           COALESCE((SELECT fy25 FROM pivoted WHERE pnl_rollup='other_income'), 0)
    UNION ALL
    SELECT 90, '(-) Income Tax',
           COALESCE((SELECT fy23 FROM pivoted WHERE pnl_rollup='tax'), 0),
           COALESCE((SELECT fy24 FROM pivoted WHERE pnl_rollup='tax'), 0),
           COALESCE((SELECT fy25 FROM pivoted WHERE pnl_rollup='tax'), 0)
    UNION ALL
    -- Net income
    SELECT 100, '== NET INCOME ==',
           COALESCE((SELECT fy23 FROM pivoted WHERE pnl_rollup='revenue'), 0)
              - COALESCE((SELECT fy23 FROM pivoted WHERE pnl_rollup='cogs'), 0)
              - COALESCE((SELECT fy23 FROM pivoted WHERE pnl_rollup='sm'), 0)
              - COALESCE((SELECT fy23 FROM pivoted WHERE pnl_rollup='rd'), 0)
              - COALESCE((SELECT fy23 FROM pivoted WHERE pnl_rollup='ga'), 0)
              + COALESCE((SELECT fy23 FROM pivoted WHERE pnl_rollup='other_income'), 0)
              - COALESCE((SELECT fy23 FROM pivoted WHERE pnl_rollup='tax'), 0),
           COALESCE((SELECT fy24 FROM pivoted WHERE pnl_rollup='revenue'), 0)
              - COALESCE((SELECT fy24 FROM pivoted WHERE pnl_rollup='cogs'), 0)
              - COALESCE((SELECT fy24 FROM pivoted WHERE pnl_rollup='sm'), 0)
              - COALESCE((SELECT fy24 FROM pivoted WHERE pnl_rollup='rd'), 0)
              - COALESCE((SELECT fy24 FROM pivoted WHERE pnl_rollup='ga'), 0)
              + COALESCE((SELECT fy24 FROM pivoted WHERE pnl_rollup='other_income'), 0)
              - COALESCE((SELECT fy24 FROM pivoted WHERE pnl_rollup='tax'), 0),
           COALESCE((SELECT fy25 FROM pivoted WHERE pnl_rollup='revenue'), 0)
              - COALESCE((SELECT fy25 FROM pivoted WHERE pnl_rollup='cogs'), 0)
              - COALESCE((SELECT fy25 FROM pivoted WHERE pnl_rollup='sm'), 0)
              - COALESCE((SELECT fy25 FROM pivoted WHERE pnl_rollup='rd'), 0)
              - COALESCE((SELECT fy25 FROM pivoted WHERE pnl_rollup='ga'), 0)
              + COALESCE((SELECT fy25 FROM pivoted WHERE pnl_rollup='other_income'), 0)
              - COALESCE((SELECT fy25 FROM pivoted WHERE pnl_rollup='tax'), 0)
)
SELECT line_item,
       ROUND(fy23::numeric, 0)::bigint AS fy23,
       ROUND(fy24::numeric, 0)::bigint AS fy24,
       ROUND(fy25::numeric, 0)::bigint AS fy25,
       ROUND((fy25 / NULLIF((SELECT fy25 FROM pivoted WHERE pnl_rollup='revenue'), 0) * 100)::numeric, 1)
           AS fy25_pct_of_rev
FROM all_lines
ORDER BY sort;


-- =============================================================================
-- 2. BALANCE SHEET at FY25 EOP (January 31, 2025)
-- =============================================================================
WITH bs AS (
    SELECT
        coa.account_type,
        coa.account_name,
        SUM(jl.debit_amount - jl.credit_amount) AS net_debit
    FROM raw_erp.gl_journal_line jl
    JOIN raw_erp.gl_journal_header h USING (journal_id)
    JOIN raw_erp.chart_of_accounts coa USING (account_id)
    WHERE coa.account_type IN ('asset','liability','equity')
      AND h.posting_date <= DATE '2025-01-31'
    GROUP BY 1, 2
),
balances AS (
    SELECT account_type, account_name,
           CASE WHEN account_type = 'asset' THEN net_debit
                ELSE -net_debit
           END AS balance
    FROM bs
    WHERE ABS(net_debit) > 1.0
)
SELECT
    CASE account_type
        WHEN 'asset' THEN '01_ASSETS'
        WHEN 'liability' THEN '02_LIABILITIES'
        WHEN 'equity' THEN '03_EQUITY'
    END AS section,
    account_name,
    ROUND(balance::numeric, 0)::bigint AS balance_usd
FROM balances
ORDER BY section, account_name;


-- =============================================================================
-- 2b. BALANCE SHEET totals + retained-earnings reconciliation
-- =============================================================================
WITH bs AS (
    SELECT
        coa.account_type,
        SUM(jl.debit_amount - jl.credit_amount) AS net_debit
    FROM raw_erp.gl_journal_line jl
    JOIN raw_erp.gl_journal_header h USING (journal_id)
    JOIN raw_erp.chart_of_accounts coa USING (account_id)
    WHERE coa.account_type IN ('asset','liability','equity')
      AND h.posting_date <= DATE '2025-01-31'
    GROUP BY 1
)
SELECT
    'Total Assets'                              AS metric,
    ROUND((SELECT net_debit FROM bs WHERE account_type='asset')::numeric, 0)::bigint AS amount_usd
UNION ALL
SELECT 'Total Liabilities',
    ROUND(-(SELECT net_debit FROM bs WHERE account_type='liability')::numeric, 0)::bigint
UNION ALL
SELECT 'Total Explicit Equity (CommonStock + APIC + OCI)',
    ROUND(-(SELECT net_debit FROM bs WHERE account_type='equity')::numeric, 0)::bigint
UNION ALL
SELECT 'Implied Retained Earnings  (TA - TL - Equity)',
    ROUND(((SELECT net_debit FROM bs WHERE account_type='asset')
        + (SELECT net_debit FROM bs WHERE account_type='liability')
        + (SELECT net_debit FROM bs WHERE account_type='equity'))::numeric, 0)::bigint
UNION ALL
SELECT 'Diff (should be ~0)',
    ROUND(((SELECT net_debit FROM bs WHERE account_type='asset')
        + (SELECT net_debit FROM bs WHERE account_type='liability')
        + (SELECT net_debit FROM bs WHERE account_type='equity')
        - ((SELECT net_debit FROM bs WHERE account_type='asset')
            + (SELECT net_debit FROM bs WHERE account_type='liability')
            + (SELECT net_debit FROM bs WHERE account_type='equity')))::numeric, 0)::bigint;


-- =============================================================================
-- 3. AR AGING at FY25 EOP
-- =============================================================================
SELECT
    CASE
        WHEN (DATE '2025-01-31' - i.invoice_date) <= 30  THEN '0-30 days'
        WHEN (DATE '2025-01-31' - i.invoice_date) <= 60  THEN '31-60 days'
        WHEN (DATE '2025-01-31' - i.invoice_date) <= 90  THEN '61-90 days'
        WHEN (DATE '2025-01-31' - i.invoice_date) <= 120 THEN '91-120 days'
        ELSE                                                  '120+ days'
    END AS bucket,
    COUNT(*)                                AS open_invoices,
    ROUND(SUM(i.amount)::numeric, 0)::bigint AS open_usd
FROM raw_erp.ar_invoice i
WHERE i.status = 'open'
  AND i.invoice_date <= DATE '2025-01-31'
GROUP BY 1
ORDER BY
    CASE bucket
        WHEN '0-30 days'   THEN 1
        WHEN '31-60 days'  THEN 2
        WHEN '61-90 days'  THEN 3
        WHEN '91-120 days' THEN 4
        ELSE                    5
    END;


-- 3b. Top 10 oldest open AR invoices (where the seeded anomaly will surface)
SELECT
    i.invoice_number,
    c.customer_name,
    c.segment_tier,
    i.invoice_date,
    DATE '2025-01-31' - i.invoice_date AS days_aged,
    ROUND(i.amount::numeric, 0)::bigint AS amount_usd
FROM raw_erp.ar_invoice i
JOIN raw_erp.customer c USING (customer_id)
WHERE i.status = 'open'
  AND i.invoice_date <= DATE '2025-01-31'
ORDER BY i.invoice_date ASC
LIMIT 10;


-- =============================================================================
-- 4. TOP CUSTOMERS by FY25 billings
-- =============================================================================
SELECT
    c.customer_name,
    c.segment_tier,
    c.billing_country,
    COUNT(i.ar_invoice_id)                AS invoices_in_fy25,
    ROUND(SUM(i.amount)::numeric, 0)::bigint AS billed_usd
FROM raw_erp.ar_invoice i
JOIN raw_erp.customer c USING (customer_id)
WHERE i.invoice_date BETWEEN DATE '2024-02-01' AND DATE '2025-01-31'
GROUP BY 1, 2, 3
ORDER BY billed_usd DESC
LIMIT 10;


-- =============================================================================
-- 5. REVENUE by SEGMENT (FY25)
-- =============================================================================
SELECT
    coa.segment,
    ROUND(SUM(jl.credit_amount - jl.debit_amount)::numeric, 0)::bigint AS revenue_usd,
    ROUND(SUM(jl.credit_amount - jl.debit_amount)::numeric
        / SUM(SUM(jl.credit_amount - jl.debit_amount)) OVER () * 100, 1) AS pct
FROM raw_erp.gl_journal_line jl
JOIN raw_erp.gl_journal_header h USING (journal_id)
JOIN raw_erp.chart_of_accounts coa USING (account_id)
WHERE coa.pnl_rollup = 'revenue'
  AND coa.segment IS NOT NULL
  AND h.posting_date BETWEEN DATE '2024-02-01' AND DATE '2025-01-31'
GROUP BY 1
ORDER BY revenue_usd DESC;


-- =============================================================================
-- 6. REVENUE by ENTITY (FY25)
-- =============================================================================
SELECT
    h.entity_id,
    ROUND(SUM(jl.credit_amount - jl.debit_amount)::numeric, 0)::bigint AS revenue_usd,
    ROUND(SUM(jl.credit_amount - jl.debit_amount)::numeric
        / SUM(SUM(jl.credit_amount - jl.debit_amount)) OVER () * 100, 1) AS pct
FROM raw_erp.gl_journal_line jl
JOIN raw_erp.gl_journal_header h USING (journal_id)
JOIN raw_erp.chart_of_accounts coa USING (account_id)
WHERE coa.pnl_rollup = 'revenue'
  AND h.posting_date BETWEEN DATE '2024-02-01' AND DATE '2025-01-31'
GROUP BY 1
ORDER BY revenue_usd DESC;


-- =============================================================================
-- 7. EMEA MARKETING SPEND BY MONTH — anomaly check (Sep+Oct 2024 spike)
-- =============================================================================
SELECT
    TO_CHAR(i.invoice_date, 'YYYY-MM')              AS month,
    ROUND(SUM(i.amount)::numeric, 0)::bigint        AS marketing_spend_usd,
    COUNT(*)                                         AS invoice_count
FROM raw_erp.ap_invoice i
JOIN raw_erp.cost_center cc USING (cost_center_id)
WHERE cc.entity_id = 'EMEA'
  AND cc.function = 'marketing'
GROUP BY 1
ORDER BY 1;


-- =============================================================================
-- 8. GL TRIAL BALANCE — must show 0 imbalances
-- =============================================================================
SELECT
    h.period_yyyymm,
    h.entity_id,
    ROUND(SUM(jl.debit_amount)::numeric, 2)  AS total_debits,
    ROUND(SUM(jl.credit_amount)::numeric, 2) AS total_credits,
    ROUND((SUM(jl.debit_amount) - SUM(jl.credit_amount))::numeric, 2) AS imbalance
FROM raw_erp.gl_journal_line jl
JOIN raw_erp.gl_journal_header h USING (journal_id)
GROUP BY 1, 2
HAVING ABS(SUM(jl.debit_amount) - SUM(jl.credit_amount)) > 1.0
ORDER BY 1, 2;
-- This should return ZERO rows. If it does, your books balance.


-- =============================================================================
-- BONUS: monthly P&L for FY25 (variance-style view)
-- =============================================================================
SELECT
    h.period_yyyymm,
    coa.pnl_rollup,
    ROUND(SUM(CASE WHEN coa.account_type = 'revenue'
                   THEN jl.credit_amount - jl.debit_amount
                   ELSE jl.debit_amount  - jl.credit_amount
              END)::numeric, 0)::bigint AS amount_usd
FROM raw_erp.gl_journal_line jl
JOIN raw_erp.gl_journal_header h USING (journal_id)
JOIN raw_erp.chart_of_accounts coa USING (account_id)
WHERE coa.pnl_rollup IN ('revenue','cogs','sm','rd','ga')
  AND h.posting_date BETWEEN DATE '2024-02-01' AND DATE '2025-01-31'
GROUP BY 1, 2
ORDER BY 1, 2;
