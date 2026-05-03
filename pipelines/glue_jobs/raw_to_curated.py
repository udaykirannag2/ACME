"""Glue ETL — raw Parquet → curated Iceberg.

For every table in the source Glue database, this job:
  1. Reads the table from raw via Glue Catalog
  2. Adds metadata columns (_ingest_date, _ingest_run_id)
  3. Writes to the curated database as an Iceberg table (createOrReplace)

Iceberg is configured via the --datalake-formats=iceberg job parameter.
Glue 4.0+ pre-registers a `glue_catalog` Spark catalog backed by the AWS
Glue Data Catalog, so we reference tables as `glue_catalog.<db>.<table>`.

Job arguments (all required):
  --source_database         e.g. acme_finance_raw_erp_dev
  --target_database         e.g. acme_finance_curated_dev
  --target_warehouse_path   e.g. s3://acme-lake-dev-curated-.../iceberg/
"""
from __future__ import annotations

import sys
from datetime import datetime

import boto3
from awsglue.context import GlueContext
from awsglue.job import Job
from awsglue.utils import getResolvedOptions
from pyspark.context import SparkContext
from pyspark.sql.functions import current_date, lit


# -------------------------------------------------------------------------
# Setup
# -------------------------------------------------------------------------

args = getResolvedOptions(
    sys.argv,
    [
        "JOB_NAME",
        "source_database",
        "target_database",
        "target_warehouse_path",
    ],
)

sc = SparkContext()
glueContext = GlueContext(sc)
spark = glueContext.spark_session
job = Job(glueContext)
job.init(args["JOB_NAME"], args)

# -------------------------------------------------------------------------
# Iceberg / Glue catalog config
#
# Glue 4.0 with --datalake-formats=iceberg sets up Iceberg's Spark
# extensions. We register an explicit `glue_iceberg` catalog name pointing
# at AWS Glue Data Catalog with our curated bucket as the warehouse. The
# catalog config is passed via --conf in the Glue job's default_arguments
# so it's set during Spark session bootstrap.
# -------------------------------------------------------------------------

CATALOG = "glue_iceberg"

run_id = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
print(f"[etl] run_id = {run_id}")
print(f"[etl] source_database = {args['source_database']}")
print(f"[etl] target_database = {args['target_database']}")
print(f"[etl] target_warehouse = {args['target_warehouse_path']}")

# -------------------------------------------------------------------------
# Discover source tables via Glue Data Catalog
# -------------------------------------------------------------------------

glue = boto3.client("glue", region_name="us-east-1")

source_tables: list[str] = []
paginator = glue.get_paginator("get_tables")
for page in paginator.paginate(DatabaseName=args["source_database"]):
    for tbl in page["TableList"]:
        source_tables.append(tbl["Name"])

print(f"[etl] discovered {len(source_tables)} tables: {source_tables}")

# -------------------------------------------------------------------------
# Process each table
# -------------------------------------------------------------------------

successes: list[str] = []
failures: list[tuple[str, str]] = []

for table_name in source_tables:
    try:
        print(f"\n[etl] === {table_name} ===")
        # Read source via Glue Dynamic Frame, convert to Spark DataFrame
        dyf = glueContext.create_dynamic_frame.from_catalog(
            database=args["source_database"],
            table_name=table_name,
            transformation_ctx=f"src_{table_name}",
        )
        df = dyf.toDF()
        if df.rdd.isEmpty():
            print(f"[etl]   {table_name} is empty, skipping")
            continue

        row_count = df.count()
        col_count = len(df.columns)
        print(f"[etl]   read {row_count:,} rows, {col_count} columns")

        # Add audit columns
        df = (
            df
            .withColumn("_ingest_date", current_date())
            .withColumn("_ingest_run_id", lit(run_id))
        )

        # Write as Iceberg via Spark SQL DataFrameWriterV2.
        # Reference: <catalog>.<database>.<table> for our explicit Iceberg catalog.
        target = f"{CATALOG}.{args['target_database']}.{table_name}"
        (
            df.writeTo(target)
            .using("iceberg")
            .tableProperty("format-version", "2")
            .tableProperty("write.format.default", "parquet")
            .createOrReplace()
        )
        print(f"[etl]   wrote {target}")
        successes.append(table_name)

    except Exception as e:    # noqa: BLE001
        print(f"[etl]   ERROR processing {table_name}: {e}")
        failures.append((table_name, str(e)))

# -------------------------------------------------------------------------
# Summary
# -------------------------------------------------------------------------

print("\n[etl] " + "=" * 50)
print(f"[etl] SUMMARY: {len(successes)} succeeded, {len(failures)} failed")
for t in successes:
    print(f"[etl]   ok  {t}")
for t, e in failures:
    print(f"[etl]   ERR {t}: {e[:120]}")

if failures:
    raise RuntimeError(f"{len(failures)} tables failed; aborting job")

job.commit()
