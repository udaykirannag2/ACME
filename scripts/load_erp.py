"""Phase 3 — load ACME ERP CSVs into RDS Postgres.

Steps:
  1. Read connection details from Secrets Manager (acme-finance-dev-erp-master).
  2. Run DDL: warehouse/ddl/raw/00_schemas.sql and 01_erp.sql.
  3. TRUNCATE all tables (idempotent reload).
  4. COPY each CSV into its raw_erp.<table> in FK-safe order.
  5. Print row counts.

Usage:
    AWS_PROFILE=acme-admin uv run python scripts/load_erp.py [--out generators/_out]
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

import boto3
import psycopg

REPO_ROOT = Path(__file__).resolve().parent.parent
DDL_SCHEMAS = REPO_ROOT / "warehouse/ddl/raw/00_schemas.sql"
DDL_ERP = REPO_ROOT / "warehouse/ddl/raw/01_erp.sql"

SECRET_ID = "acme-finance-dev-erp-master"

# FK-safe load order. Children come after their parents.
LOAD_ORDER = [
    "entity",
    "chart_of_accounts",
    "cost_center",
    "vendor",
    "customer",
    "ap_invoice",
    "ap_payment",
    "ar_invoice",
    "ar_receipt",
    "fixed_asset",
    "fa_depreciation",
    "gl_journal_header",
    "gl_journal_line",
]


def fetch_connection_params(profile: str | None) -> dict:
    session = boto3.Session(profile_name=profile, region_name="us-east-1") \
        if profile else boto3.Session(region_name="us-east-1")
    sm = session.client("secretsmanager")
    resp = sm.get_secret_value(SecretId=SECRET_ID)
    return json.loads(resp["SecretString"])


def connect(params: dict) -> psycopg.Connection:
    conninfo = (
        f"host={params['host']} port={params['port']} dbname={params['dbname']} "
        f"user={params['username']} password={params['password']} "
        f"sslmode=require connect_timeout=15"
    )
    return psycopg.connect(conninfo, autocommit=False)


def run_ddl(conn: psycopg.Connection, *paths: Path, recreate: bool = False) -> None:
    with conn.cursor() as cur:
        if recreate:
            print("  [DDL] DROP SCHEMA raw_erp CASCADE")
            cur.execute("DROP SCHEMA IF EXISTS raw_erp CASCADE")
        for path in paths:
            print(f"  [DDL] {path.name}")
            sql = path.read_text()
            cur.execute(sql)
        conn.commit()


def truncate_tables(conn: psycopg.Connection) -> None:
    """TRUNCATE in reverse FK order with CASCADE for safety."""
    with conn.cursor() as cur:
        # CASCADE clears all dependents in one statement
        cur.execute("TRUNCATE TABLE " + ", ".join(
            f"raw_erp.{t}" for t in reversed(LOAD_ORDER)
        ) + " CASCADE;")
        conn.commit()


def copy_csv(conn: psycopg.Connection, table: str, csv_path: Path) -> int:
    """COPY a CSV file into raw_erp.<table>. Returns row count."""
    if not csv_path.exists():
        raise FileNotFoundError(csv_path)
    with conn.cursor() as cur:
        # NULL '' tells Postgres unquoted empty fields are NULL
        copy_sql = (
            f"COPY raw_erp.{table} FROM STDIN "
            f"WITH (FORMAT csv, HEADER true, NULL '')"
        )
        with cur.copy(copy_sql) as copy:
            with csv_path.open("rb") as f:
                while chunk := f.read(64 * 1024):
                    copy.write(chunk)
        cur.execute(f"SELECT COUNT(*) FROM raw_erp.{table}")
        result = cur.fetchone()
        return int(result[0]) if result else 0


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--out", default="generators/_out", help="generators output dir.")
    p.add_argument("--profile", default=None, help="AWS profile name (env: AWS_PROFILE).")
    p.add_argument("--skip-ddl", action="store_true", help="Skip DDL execution.")
    p.add_argument("--recreate", action="store_true", help="DROP SCHEMA before re-running DDL.")
    p.add_argument("--no-truncate", action="store_true", help="Skip TRUNCATE (append data).")
    args = p.parse_args()

    out_root = Path(args.out)
    if not (out_root / "erp").exists():
        print(f"ERR: {out_root}/erp not found. Run `uv run acme-generate` first.", file=sys.stderr)
        sys.exit(1)

    print("Fetching connection params from Secrets Manager...")
    import os
    params = fetch_connection_params(args.profile or os.environ.get("AWS_PROFILE"))
    print(f"  host = {params['host']}")
    print(f"  db   = {params['dbname']}")
    print(f"  user = {params['username']}")

    print("\nConnecting to Postgres...")
    t0 = time.time()
    conn = connect(params)
    print(f"  connected in {time.time() - t0:.2f}s")

    try:
        if not args.skip_ddl:
            print("\nRunning DDL...")
            run_ddl(conn, DDL_SCHEMAS, DDL_ERP, recreate=args.recreate)

        if not args.no_truncate and not args.recreate:
            print("\nTruncating tables...")
            truncate_tables(conn)

        print("\nLoading CSVs...")
        total_rows = 0
        for table in LOAD_ORDER:
            csv_path = out_root / "erp" / f"{table}.csv"
            t0 = time.time()
            rows = copy_csv(conn, table, csv_path)
            elapsed = time.time() - t0
            conn.commit()
            print(f"  [LOAD] {table:<22}  {rows:>10,} rows  {elapsed:>5.1f}s")
            total_rows += rows

        print(f"\nTotal rows loaded: {total_rows:,}")
        print("\nVerification queries:")
        with conn.cursor() as cur:
            cur.execute("""
                SELECT 'entity' AS tbl, COUNT(*)::bigint FROM raw_erp.entity UNION ALL
                SELECT 'gl_journal_header', COUNT(*) FROM raw_erp.gl_journal_header UNION ALL
                SELECT 'gl_journal_line',   COUNT(*) FROM raw_erp.gl_journal_line UNION ALL
                SELECT 'ar_invoice',        COUNT(*) FROM raw_erp.ar_invoice UNION ALL
                SELECT 'ap_invoice',        COUNT(*) FROM raw_erp.ap_invoice UNION ALL
                SELECT 'fixed_asset',       COUNT(*) FROM raw_erp.fixed_asset
            """)
            for tbl, n in cur.fetchall():
                print(f"  {tbl:<22} {n:>10,}")

            print("\nGL balance check (debits = credits, all periods):")
            cur.execute("""
                SELECT
                    h.period_yyyymm,
                    h.entity_id,
                    SUM(jl.debit_amount)  - SUM(jl.credit_amount) AS imbalance
                FROM raw_erp.gl_journal_line jl
                JOIN raw_erp.gl_journal_header h USING (journal_id)
                GROUP BY 1, 2
                HAVING ABS(SUM(jl.debit_amount) - SUM(jl.credit_amount)) > 1.0
                LIMIT 5
            """)
            imbalanced = cur.fetchall()
            if imbalanced:
                print("  [!] FOUND IMBALANCES:")
                for period, entity, diff in imbalanced:
                    print(f"      {period} {entity}: ${diff:,.2f}")
            else:
                print("  [OK] All (period × entity) keys balanced")

    finally:
        conn.close()


if __name__ == "__main__":
    main()
