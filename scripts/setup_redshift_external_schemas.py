"""Phase 4C — create external schemas in Redshift Serverless that point at the
Glue Data Catalog databases.

After this runs, you can query (from Redshift):

    SELECT COUNT(*) FROM raw_erp.entity_csv;
    SELECT COUNT(*) FROM raw_epm.plan_line;
    SELECT COUNT(*) FROM raw_crm.account;

Run:
    AWS_PROFILE=acme-admin uv run python scripts/setup_redshift_external_schemas.py
"""
from __future__ import annotations

import os
import sys
import time

import boto3

WORKGROUP = "acme-finance-dev"
DATABASE  = "acme"

# Maps external schema name -> Glue Catalog database name
EXTERNAL_SCHEMAS = {
    "raw_erp":     "acme_finance_raw_erp_dev",
    "raw_epm":     "acme_finance_raw_epm_dev",
    "raw_crm":     "acme_finance_raw_crm_dev",
    "curated":     "acme_finance_curated_dev",
}


def main() -> None:
    profile = os.environ.get("AWS_PROFILE")
    session = boto3.Session(profile_name=profile, region_name="us-east-1") if profile \
        else boto3.Session(region_name="us-east-1")
    rs_data = session.client("redshift-data")
    iam = session.client("iam")

    role_arn = iam.get_role(RoleName="acme-finance-dev-redshift-spectrum")["Role"]["Arn"]
    print(f"Using IAM role: {role_arn}\n")

    for schema_name, glue_db in EXTERNAL_SCHEMAS.items():
        print(f"Creating external schema {schema_name!r} -> {glue_db!r}")
        # Drop first (if exists) to be idempotent
        sql = (
            f"DROP SCHEMA IF EXISTS {schema_name};\n"
            f"CREATE EXTERNAL SCHEMA {schema_name}\n"
            f"  FROM DATA CATALOG\n"
            f"  DATABASE '{glue_db}'\n"
            f"  IAM_ROLE '{role_arn}'\n"
            f"  REGION 'us-east-1';"
        )
        run_sql(rs_data, sql)
        print(f"  [OK] {schema_name}")

    print("\nVerifying with row counts...\n")
    for schema_name, _ in EXTERNAL_SCHEMAS.items():
        if schema_name == "curated":
            continue   # empty until Phase 4D
        list_sql = (
            f"SELECT tablename FROM SVV_EXTERNAL_TABLES "
            f"WHERE schemaname = '{schema_name}' ORDER BY tablename;"
        )
        rows = run_sql_fetch(rs_data, list_sql)
        print(f"{schema_name}: {len(rows)} tables — {[r[0] for r in rows]}")

    # Cross-source query
    print("\n=== Cross-source verification: count rows in three sources ===")
    sql = """
    SELECT 'erp.gl_journal_line'        AS source, COUNT(*) AS row_count FROM raw_erp.gl_journal_line_csv
    UNION ALL
    SELECT 'epm.plan_line',                      COUNT(*) FROM raw_epm.plan_line
    UNION ALL
    SELECT 'crm.account',                        COUNT(*) FROM raw_crm.account;
    """
    rows = run_sql_fetch(rs_data, sql)
    for r in rows:
        print(f"  {r[0]:<32}  {r[1]:>10,}")


def run_sql(client, sql: str, retries: int = 60) -> None:
    """Submit SQL via Redshift Data API. Polls until completion. Raises on error."""
    resp = client.execute_statement(
        WorkgroupName=WORKGROUP,
        Database=DATABASE,
        Sql=sql,
    )
    sid = resp["Id"]
    for _ in range(retries):
        desc = client.describe_statement(Id=sid)
        st = desc["Status"]
        if st == "FINISHED":
            return
        if st in ("FAILED", "ABORTED"):
            print(f"  Statement {sid} {st}: {desc.get('Error', 'unknown')}", file=sys.stderr)
            print(f"  SQL: {sql}", file=sys.stderr)
            raise RuntimeError(desc.get("Error", st))
        time.sleep(2)
    raise TimeoutError(f"statement {sid} did not finish")


def run_sql_fetch(client, sql: str) -> list[tuple]:
    """Submit SQL and return rows."""
    resp = client.execute_statement(
        WorkgroupName=WORKGROUP, Database=DATABASE, Sql=sql,
    )
    sid = resp["Id"]
    for _ in range(60):
        desc = client.describe_statement(Id=sid)
        st = desc["Status"]
        if st == "FINISHED":
            break
        if st in ("FAILED", "ABORTED"):
            raise RuntimeError(desc.get("Error", st))
        time.sleep(2)
    out = []
    paginator = client.get_paginator("get_statement_result")
    for page in paginator.paginate(Id=sid):
        for record in page["Records"]:
            out.append(tuple(_field_value(f) for f in record))
    return out


def _field_value(field):
    for k in ("stringValue", "longValue", "doubleValue", "booleanValue"):
        if k in field:
            return field[k]
    if field.get("isNull"):
        return None
    return None


if __name__ == "__main__":
    main()
