"""Phase 4 fix — convert ERP CSVs to Parquet for Spectrum compatibility.

Glue Spectrum has trouble with single-file CSV table locations. Parquet in
per-table directories works cleanly. This script:
  1. Reads each generators/_out/erp/<table>.csv
  2. Writes generators/_out/erp_parquet/<table>/<table>.parquet
  3. Optionally deletes the flat erp/*.csv objects in S3 and re-uploads as
     erp/<table>/<table>.parquet (so the existing crawler picks them up)

Usage:
    AWS_PROFILE=acme-admin uv run python scripts/convert_erp_to_parquet.py \
        --out generators/_out --bucket acme-lake-dev-raw-010928194453
"""
from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq

ERP_TABLES = [
    "entity", "chart_of_accounts", "cost_center", "vendor", "customer",
    "ap_invoice", "ap_payment", "ar_invoice", "ar_receipt",
    "fixed_asset", "fa_depreciation",
    "gl_journal_header", "gl_journal_line",
]


def convert_local(out_root: Path) -> None:
    parquet_root = out_root / "erp_parquet"
    parquet_root.mkdir(exist_ok=True)
    for table in ERP_TABLES:
        csv_path = out_root / "erp" / f"{table}.csv"
        if not csv_path.exists():
            print(f"  [skip] {table}.csv not found")
            continue
        # Read with all-string types first to preserve precision; pandas will infer
        df = pd.read_csv(csv_path, low_memory=False)
        # Round monetary columns to 2dp
        for c in df.columns:
            if any(s in c for s in ("amount", "cost", "value", "salary",
                                    "proceeds", "depreciation")) and df[c].dtype.kind == "f":
                df[c] = df[c].round(2)
        out_dir = parquet_root / table
        out_dir.mkdir(parents=True, exist_ok=True)
        out_file = out_dir / f"{table}.parquet"
        table_obj = pa.Table.from_pandas(df, preserve_index=False)
        pq.write_table(table_obj, out_file)
        print(f"  [ok] {table:<24} -> {table}/{table}.parquet  ({len(df):,} rows)")


def upload_to_s3(out_root: Path, bucket: str, profile: str | None) -> None:
    import boto3
    session = boto3.Session(profile_name=profile, region_name="us-east-1") if profile \
        else boto3.Session(region_name="us-east-1")
    s3 = session.client("s3")

    parquet_root = out_root / "erp_parquet"

    # 1. Delete existing erp/*.csv keys (we no longer need them in S3 — RDS is loaded)
    print("\nDeleting flat erp/*.csv objects in S3...")
    paginator = s3.get_paginator("list_objects_v2")
    deleted = 0
    for page in paginator.paginate(Bucket=bucket, Prefix="erp/"):
        for obj in page.get("Contents", []):
            key = obj["Key"]
            # Only delete top-level CSVs, not directories
            if key.endswith(".csv") and key.count("/") == 1:
                s3.delete_object(Bucket=bucket, Key=key)
                deleted += 1
    print(f"  deleted {deleted} flat erp/*.csv keys")

    # 2. Upload Parquet under erp/<table>/<table>.parquet
    print("\nUploading Parquet to s3://{}/erp/<table>/...".format(bucket))
    uploaded = 0
    for table in ERP_TABLES:
        local_path = parquet_root / table / f"{table}.parquet"
        if not local_path.exists():
            continue
        key = f"erp/{table}/{table}.parquet"
        s3.upload_file(
            Filename=str(local_path),
            Bucket=bucket,
            Key=key,
            ExtraArgs={"ServerSideEncryption": "aws:kms"},
        )
        uploaded += 1
        print(f"  [up] s3://{bucket}/{key}")
    print(f"\nUploaded {uploaded} files.")


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--out", default="generators/_out")
    p.add_argument("--bucket", required=False, help="S3 raw lake bucket. If omitted, only local conversion is performed.")
    p.add_argument("--profile", default=os.environ.get("AWS_PROFILE"))
    args = p.parse_args()

    out_root = Path(args.out)
    if not (out_root / "erp").exists():
        print(f"ERR: {out_root}/erp not found. Run `uv run acme-generate` first.", file=sys.stderr)
        sys.exit(1)

    print("Converting ERP CSVs to Parquet (local)...")
    convert_local(out_root)

    if args.bucket:
        upload_to_s3(out_root, args.bucket, args.profile)


if __name__ == "__main__":
    main()
