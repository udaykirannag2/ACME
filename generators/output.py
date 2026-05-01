"""Writer abstractions for converting dataclass rows to CSV / Parquet.

ERP tables → CSV (for Postgres COPY in Phase 3).
EPM/CRM tables → Parquet partitioned by period_yyyymm or snapshot_date
(Hive-style), matching the Glue schema spec in
warehouse/ddl/raw/02_epm_crm_glue_tables.md.
"""
from __future__ import annotations

import csv
from collections.abc import Iterable
from dataclasses import asdict, fields, is_dataclass
from datetime import date, datetime
from pathlib import Path
from typing import Any

import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq


def _row_to_dict(row: Any) -> dict[str, Any]:
    if not is_dataclass(row):
        raise TypeError(f"Expected dataclass row, got {type(row).__name__}")
    return asdict(row)


def write_csv(rows: Iterable[Any], out_path: Path) -> int:
    """Write dataclass rows to a CSV file. Returns row count.

    Postgres-friendly format:
      - ISO dates / timestamps
      - empty string for None
      - 2-decimal precision for numerics named `*_amount` or `*_value` or `*_cost`
    """
    out_path.parent.mkdir(parents=True, exist_ok=True)
    rows_list = list(rows)
    if not rows_list:
        out_path.write_text("")
        return 0

    fieldnames = [f.name for f in fields(rows_list[0])]
    with out_path.open("w", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=fieldnames, lineterminator="\n")
        writer.writeheader()
        for row in rows_list:
            d = _row_to_dict(row)
            for k, v in d.items():
                if v is None:
                    d[k] = ""
                elif isinstance(v, datetime):
                    d[k] = v.isoformat(timespec="seconds")
                elif isinstance(v, date):
                    d[k] = v.isoformat()
                elif isinstance(v, float):
                    # 2dp for monetary, 4dp for ratios
                    if any(s in k for s in ("amount", "cost", "value", "salary",
                                            "proceeds", "arr", "depreciation")):
                        d[k] = f"{v:.2f}"
                    else:
                        d[k] = f"{v:.4f}"
                elif isinstance(v, bool):
                    d[k] = "true" if v else "false"
            writer.writerow(d)
    return len(rows_list)


def write_parquet(
    rows: Iterable[Any],
    out_dir: Path,
    *,
    partition_by: str | None = None,
) -> int:
    """Write dataclass rows to Parquet (optionally partitioned).

    Partitioned layout (Hive-style):
        out_dir/<partition_col>=<value>/part-0.parquet

    Non-partitioned:
        out_dir/part-0.parquet
    """
    rows_list = list(rows)
    if not rows_list:
        out_dir.mkdir(parents=True, exist_ok=True)
        return 0

    df = pd.DataFrame([_row_to_dict(r) for r in rows_list])

    # Coerce decimal-ish columns to fixed precision (Parquet decimal is preferred,
    # but for simplicity we use float64 and round). Iceberg/Spectrum read this fine.
    money_cols = [c for c in df.columns if any(
        s in c for s in ("amount", "cost", "value", "salary", "proceeds", "arr", "depreciation")
    )]
    for c in money_cols:
        if df[c].dtype.kind == "f":
            df[c] = df[c].round(2)

    table = pa.Table.from_pandas(df, preserve_index=False)

    if partition_by:
        out_dir.mkdir(parents=True, exist_ok=True)
        pq.write_to_dataset(
            table,
            root_path=str(out_dir),
            partition_cols=[partition_by],
            existing_data_behavior="delete_matching",
        )
    else:
        out_dir.mkdir(parents=True, exist_ok=True)
        pq.write_table(table, out_dir / "part-0.parquet")

    return len(rows_list)


def write_erp_table(rows: Iterable[Any], out_root: Path, table_name: str) -> int:
    """Convenience: write ERP table as CSV at out_root/erp/<table>.csv."""
    return write_csv(rows, out_root / "erp" / f"{table_name}.csv")


def write_epm_table(
    rows: Iterable[Any],
    out_root: Path,
    table_name: str,
    *,
    partition_by: str | None = None,
) -> int:
    return write_parquet(rows, out_root / "epm" / table_name, partition_by=partition_by)


def write_crm_table(
    rows: Iterable[Any],
    out_root: Path,
    table_name: str,
    *,
    partition_by: str | None = None,
) -> int:
    return write_parquet(rows, out_root / "crm" / table_name, partition_by=partition_by)
