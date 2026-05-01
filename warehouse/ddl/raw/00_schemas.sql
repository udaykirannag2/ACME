-- Raw-zone schemas. Run on RDS Postgres (acme_erp database) for the ERP simulator
-- and on Redshift external schemas for read-back of S3 EPM/CRM drops.
--
-- For the ERP RDS Postgres: this file creates the schema where DMS sources data.
-- For Redshift: external schemas are created via CREATE EXTERNAL SCHEMA against Glue Catalog;
-- see warehouse/ddl/raw/02_redshift_external.sql.

CREATE SCHEMA IF NOT EXISTS raw_erp;
CREATE SCHEMA IF NOT EXISTS raw_epm;
CREATE SCHEMA IF NOT EXISTS raw_crm;

COMMENT ON SCHEMA raw_erp IS 'Raw zone for ERP source (RDS Postgres acme_erp). DMS targets S3 from here.';
COMMENT ON SCHEMA raw_epm IS 'Raw zone for EPM Parquet drops (S3 → Glue Catalog → Redshift Spectrum).';
COMMENT ON SCHEMA raw_crm IS 'Raw zone for CRM Parquet drops (S3 → Glue Catalog → Redshift Spectrum).';
