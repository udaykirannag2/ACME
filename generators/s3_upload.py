"""Phase 2E — Upload generated artifacts to S3 raw-zone bucket.

Uses boto3 with the AWS_PROFILE environment variable. Walks the output dir
and copies files preserving the local layout into s3://<bucket>/.

Bucket name: provided via --s3-raw-bucket CLI arg or ACME_LAKE_RAW_BUCKET env var.

Layout written:
    s3://<bucket>/erp/<table>.csv
    s3://<bucket>/epm/<table>/period_yyyymm=*/part-0.parquet
    s3://<bucket>/crm/<table>/[period_yyyymm=*/]part-0.parquet
"""
from __future__ import annotations

import os
import sys
from collections.abc import Iterable
from dataclasses import dataclass
from pathlib import Path

try:
    import boto3
    from botocore.exceptions import ClientError, ProfileNotFound
except ImportError:        # pragma: no cover
    boto3 = None
    ClientError = ProfileNotFound = Exception   # type: ignore[assignment]


@dataclass(slots=True)
class UploadReport:
    bucket: str
    region: str
    files_uploaded: int
    bytes_uploaded: int


def _walk_files(root: Path) -> Iterable[Path]:
    for p in root.rglob("*"):
        if p.is_file() and not p.name.startswith("."):
            yield p


def upload_to_s3(
    out_root: Path,
    bucket: str,
    *,
    profile: str | None = None,
    region: str = "us-east-1",
    dry_run: bool = False,
) -> UploadReport:
    if boto3 is None:
        raise RuntimeError("boto3 not installed; run `uv sync` first")

    if profile:
        session = boto3.Session(profile_name=profile, region_name=region)
    else:
        session = boto3.Session(region_name=region)

    s3 = session.client("s3")

    # Verify bucket exists & is accessible
    try:
        s3.head_bucket(Bucket=bucket)
    except ClientError as e:
        raise RuntimeError(f"cannot access bucket {bucket}: {e}") from e

    files = list(_walk_files(out_root))
    total_bytes = 0
    uploaded = 0
    for f in files:
        rel = f.relative_to(out_root).as_posix()
        if dry_run:
            print(f"DRY: s3://{bucket}/{rel}  ({f.stat().st_size:,} bytes)")
            uploaded += 1
            total_bytes += f.stat().st_size
            continue
        s3.upload_file(
            Filename=str(f),
            Bucket=bucket,
            Key=rel,
            ExtraArgs={"ServerSideEncryption": "aws:kms"},
        )
        total_bytes += f.stat().st_size
        uploaded += 1

    return UploadReport(
        bucket=bucket,
        region=region,
        files_uploaded=uploaded,
        bytes_uploaded=total_bytes,
    )
