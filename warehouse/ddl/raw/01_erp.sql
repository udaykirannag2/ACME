-- ERP source schema (RDS Postgres acme_erp, schema raw_erp).
-- See docs/data-dictionary.md for grain, semantics, and invariants.

SET search_path TO raw_erp;

-- =====================================================================
-- Reference / dimension tables
-- =====================================================================

CREATE TABLE IF NOT EXISTS entity (
    entity_id            varchar(8)   PRIMARY KEY,
    entity_name          varchar(64)  NOT NULL,
    functional_currency  char(3)      NOT NULL DEFAULT 'USD',
    parent_entity_id     varchar(8)   REFERENCES entity(entity_id)
);

CREATE TABLE IF NOT EXISTS chart_of_accounts (
    account_id      varchar(16)   PRIMARY KEY,
    account_number  varchar(8)    NOT NULL,
    account_name    varchar(128)  NOT NULL,
    account_type    varchar(16)   NOT NULL CHECK (account_type IN ('asset','liability','equity','revenue','expense')),
    pnl_rollup      varchar(32)   NOT NULL,
    segment         varchar(32),
    is_active       boolean       NOT NULL DEFAULT true
);
CREATE INDEX IF NOT EXISTS idx_coa_pnl_rollup ON chart_of_accounts (pnl_rollup);

CREATE TABLE IF NOT EXISTS cost_center (
    cost_center_id    varchar(16)   PRIMARY KEY,
    cost_center_name  varchar(128)  NOT NULL,
    function          varchar(32)   NOT NULL,
    entity_id         varchar(8)    NOT NULL REFERENCES entity(entity_id)
);
CREATE INDEX IF NOT EXISTS idx_cc_entity ON cost_center (entity_id);

CREATE TABLE IF NOT EXISTS vendor (
    vendor_id        varchar(36)   PRIMARY KEY,
    vendor_name      varchar(256)  NOT NULL,
    vendor_category  varchar(32)   NOT NULL,
    payment_terms    varchar(8)    NOT NULL DEFAULT 'NET30',
    entity_id        varchar(8)    NOT NULL REFERENCES entity(entity_id),
    created_at       timestamptz   NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vendor_category ON vendor (vendor_category);

CREATE TABLE IF NOT EXISTS customer (
    customer_id       varchar(36)   PRIMARY KEY,
    customer_name     varchar(256)  NOT NULL,
    billing_country   char(2)       NOT NULL,
    segment_tier      varchar(16)   NOT NULL CHECK (segment_tier IN ('enterprise','commercial','smb')),
    created_at        timestamptz   NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_customer_country ON customer (billing_country);

-- =====================================================================
-- General Ledger
-- =====================================================================

CREATE TABLE IF NOT EXISTS gl_journal_header (
    journal_id      varchar(36)   PRIMARY KEY,
    journal_number  varchar(16)   NOT NULL UNIQUE,
    posting_date    date          NOT NULL,
    period_yyyymm   integer       NOT NULL,
    entity_id       varchar(8)    NOT NULL REFERENCES entity(entity_id),
    journal_type    varchar(16)   NOT NULL CHECK (journal_type IN ('manual','auto_revrec','auto_dep','auto_ar','auto_ap','intercompany')),
    description     text,
    created_by      varchar(64)   NOT NULL,
    created_at      timestamptz   NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gl_jh_period ON gl_journal_header (period_yyyymm);
CREATE INDEX IF NOT EXISTS idx_gl_jh_entity_period ON gl_journal_header (entity_id, period_yyyymm);

CREATE TABLE IF NOT EXISTS gl_journal_line (
    journal_line_id      varchar(36)    PRIMARY KEY,
    journal_id           varchar(36)    NOT NULL REFERENCES gl_journal_header(journal_id) ON DELETE CASCADE,
    line_number          integer        NOT NULL,
    account_id           varchar(16)    NOT NULL REFERENCES chart_of_accounts(account_id),
    cost_center_id       varchar(16)    REFERENCES cost_center(cost_center_id),
    debit_amount         numeric(18,2)  NOT NULL DEFAULT 0,
    credit_amount        numeric(18,2)  NOT NULL DEFAULT 0,
    memo                 text,
    reference_doc_type   varchar(16),
    reference_doc_id     varchar(36),
    CONSTRAINT chk_jl_one_side CHECK (
        (debit_amount > 0 AND credit_amount = 0) OR
        (credit_amount > 0 AND debit_amount = 0)
    ),
    UNIQUE (journal_id, line_number)
);
CREATE INDEX IF NOT EXISTS idx_gl_jl_account ON gl_journal_line (account_id);
CREATE INDEX IF NOT EXISTS idx_gl_jl_cc ON gl_journal_line (cost_center_id);
CREATE INDEX IF NOT EXISTS idx_gl_jl_ref ON gl_journal_line (reference_doc_type, reference_doc_id);

-- =====================================================================
-- Accounts Payable
-- =====================================================================

CREATE TABLE IF NOT EXISTS ap_invoice (
    ap_invoice_id     varchar(36)    PRIMARY KEY,
    vendor_id         varchar(36)    NOT NULL REFERENCES vendor(vendor_id),
    invoice_number    varchar(64)    NOT NULL,
    invoice_date      date           NOT NULL,
    due_date          date           NOT NULL,
    amount            numeric(18,2)  NOT NULL CHECK (amount > 0),
    account_id        varchar(16)    NOT NULL REFERENCES chart_of_accounts(account_id),
    cost_center_id    varchar(16)    NOT NULL REFERENCES cost_center(cost_center_id),
    status            varchar(16)    NOT NULL DEFAULT 'open' CHECK (status IN ('open','partial','paid','voided')),
    created_at        timestamptz    NOT NULL DEFAULT now(),
    UNIQUE (vendor_id, invoice_number)
);
CREATE INDEX IF NOT EXISTS idx_ap_inv_status ON ap_invoice (status);
CREATE INDEX IF NOT EXISTS idx_ap_inv_date ON ap_invoice (invoice_date);

CREATE TABLE IF NOT EXISTS ap_payment (
    ap_payment_id  varchar(36)    PRIMARY KEY,
    ap_invoice_id  varchar(36)    NOT NULL REFERENCES ap_invoice(ap_invoice_id),
    payment_date   date           NOT NULL,
    amount         numeric(18,2)  NOT NULL CHECK (amount > 0)
);
CREATE INDEX IF NOT EXISTS idx_ap_pmt_invoice ON ap_payment (ap_invoice_id);

-- =====================================================================
-- Accounts Receivable
-- =====================================================================

CREATE TABLE IF NOT EXISTS ar_invoice (
    ar_invoice_id          varchar(36)    PRIMARY KEY,
    customer_id            varchar(36)    NOT NULL REFERENCES customer(customer_id),
    invoice_number         varchar(64)    NOT NULL UNIQUE,
    invoice_date           date           NOT NULL,
    due_date               date           NOT NULL,
    amount                 numeric(18,2)  NOT NULL CHECK (amount > 0),
    service_period_start   date           NOT NULL,
    service_period_end     date           NOT NULL,
    segment                varchar(32)    NOT NULL,
    status                 varchar(16)    NOT NULL DEFAULT 'open' CHECK (status IN ('open','partial','paid','voided')),
    opportunity_id         varchar(36),
    created_at             timestamptz    NOT NULL DEFAULT now(),
    CHECK (service_period_end >= service_period_start)
);
CREATE INDEX IF NOT EXISTS idx_ar_inv_status ON ar_invoice (status);
CREATE INDEX IF NOT EXISTS idx_ar_inv_customer ON ar_invoice (customer_id);
CREATE INDEX IF NOT EXISTS idx_ar_inv_date ON ar_invoice (invoice_date);

CREATE TABLE IF NOT EXISTS ar_receipt (
    ar_receipt_id  varchar(36)    PRIMARY KEY,
    ar_invoice_id  varchar(36)    NOT NULL REFERENCES ar_invoice(ar_invoice_id),
    receipt_date   date           NOT NULL,
    amount         numeric(18,2)  NOT NULL CHECK (amount > 0)
);
CREATE INDEX IF NOT EXISTS idx_ar_rcpt_invoice ON ar_receipt (ar_invoice_id);

-- =====================================================================
-- Fixed Assets
-- =====================================================================

CREATE TABLE IF NOT EXISTS fixed_asset (
    fixed_asset_id        varchar(36)    PRIMARY KEY,
    asset_tag             varchar(32)    NOT NULL UNIQUE,
    asset_class           varchar(32)    NOT NULL,
    acquisition_date      date           NOT NULL,
    acquisition_cost      numeric(18,2)  NOT NULL CHECK (acquisition_cost > 0),
    useful_life_months    integer        NOT NULL CHECK (useful_life_months > 0),
    salvage_value         numeric(18,2)  NOT NULL DEFAULT 0,
    depreciation_method   varchar(16)    NOT NULL DEFAULT 'straight_line',
    entity_id             varchar(8)     NOT NULL REFERENCES entity(entity_id),
    cost_center_id        varchar(16)    NOT NULL REFERENCES cost_center(cost_center_id),
    disposal_date         date,
    disposal_proceeds     numeric(18,2),
    status                varchar(16)    NOT NULL DEFAULT 'active' CHECK (status IN ('active','disposed','fully_depreciated'))
);
CREATE INDEX IF NOT EXISTS idx_fa_status ON fixed_asset (status);
CREATE INDEX IF NOT EXISTS idx_fa_class ON fixed_asset (asset_class);

CREATE TABLE IF NOT EXISTS fa_depreciation (
    fa_depreciation_id          varchar(36)    PRIMARY KEY,
    fixed_asset_id              varchar(36)    NOT NULL REFERENCES fixed_asset(fixed_asset_id),
    period_yyyymm               integer        NOT NULL,
    depreciation_amount         numeric(18,2)  NOT NULL CHECK (depreciation_amount >= 0),
    accumulated_depreciation    numeric(18,2)  NOT NULL CHECK (accumulated_depreciation >= 0),
    net_book_value              numeric(18,2)  NOT NULL CHECK (net_book_value >= 0),
    UNIQUE (fixed_asset_id, period_yyyymm)
);
CREATE INDEX IF NOT EXISTS idx_fa_dep_period ON fa_depreciation (period_yyyymm);
