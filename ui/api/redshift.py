"""Thin wrapper around Redshift Data API for synchronous query execution."""
import time
import boto3
from botocore.config import Config
from ui.api.config import AWS_REGION, AWS_PROFILE, REDSHIFT_WORKGROUP, REDSHIFT_DATABASE

_client = None


def _get_client():
    global _client
    if _client is None:
        session = boto3.Session(profile_name=AWS_PROFILE, region_name=AWS_REGION)
        _client = session.client("redshift-data", config=Config(read_timeout=120))
    return _client


def query(sql: str, max_rows: int = 500) -> list[dict]:
    client = _get_client()
    resp = client.execute_statement(
        WorkgroupName=REDSHIFT_WORKGROUP,
        Database=REDSHIFT_DATABASE,
        Sql=sql,
    )
    stmt_id = resp["Id"]

    for _ in range(90):
        time.sleep(1)
        status = client.describe_statement(Id=stmt_id)
        if status["Status"] in ("FINISHED", "FAILED", "ABORTED"):
            break

    if status["Status"] != "FINISHED":
        raise RuntimeError(status.get("Error", f"Query {status['Status']}"))

    if status.get("ResultRows", 0) == 0:
        return []

    page = client.get_statement_result(Id=stmt_id)
    columns = [c["name"] for c in page["ColumnMetadata"]]
    rows: list[dict] = []

    while True:
        for record in page["Records"]:
            if len(rows) >= max_rows:
                break
            rows.append({col: list(v.values())[0] if v else None for col, v in zip(columns, record)})
        if len(rows) >= max_rows:
            break
        token = page.get("NextToken")
        if not token:
            break
        page = client.get_statement_result(Id=stmt_id, NextToken=token)

    return rows
