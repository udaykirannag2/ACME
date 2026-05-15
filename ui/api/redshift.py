"""Thin wrapper around Redshift Data API for synchronous query execution."""
import itertools
import time
import boto3
from botocore.config import Config
from ui.api.config import AWS_REGION, AWS_PROFILE, REDSHIFT_WORKGROUP, REDSHIFT_DATABASE

# Poll schedule: check quickly at first, then back off.
# Format: (interval_seconds, repeat_count)  — None repeat = infinite
_POLL_SCHEDULE = [
    (0.15, 5),   # 0-0.75 s  — fast initial checks
    (0.5,  5),   # 0.75-3.25 s
    (1.0,  None),# 3.25 s onward — 1 s per poll, up to max_polls total
]


def _poll_intervals(max_polls: int):
    """Yield poll intervals following _POLL_SCHEDULE up to max_polls times."""
    count = 0
    for interval, repeats in _POLL_SCHEDULE:
        for _ in range(repeats) if repeats is not None else itertools.repeat(None):
            if count >= max_polls:
                return
            yield interval
            count += 1

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

    for interval in _poll_intervals(90):
        time.sleep(interval)
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
