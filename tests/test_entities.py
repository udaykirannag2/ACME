"""Unit tests for the reference-data generators (Phase 2A)."""
from __future__ import annotations

from generators import entities


def test_entities_canonical_three() -> None:
    rows = entities.gen_entities()
    ids = [e.entity_id for e in rows]
    assert ids == ["US", "EMEA", "APAC"]
    assert all(e.functional_currency == "USD" for e in rows)
    parents = {e.entity_id: e.parent_entity_id for e in rows}
    assert parents == {"US": None, "EMEA": "US", "APAC": "US"}


def test_chart_of_accounts_basics() -> None:
    rows = entities.gen_chart_of_accounts()
    # Reasonable size — won't break the generator silently if accounts are added
    assert 80 <= len(rows) <= 160

    # All account_ids unique
    ids = [a.account_id for a in rows]
    assert len(set(ids)) == len(ids)

    # Account numbers monotonic by account_type group
    revenue_nums = [int(a.account_number) for a in rows if a.pnl_rollup == "revenue"]
    assert revenue_nums == sorted(revenue_nums)

    # Every revenue account is tagged with a segment
    revenue_segs = {a.segment for a in rows if a.pnl_rollup == "revenue"}
    assert revenue_segs == {"sales_cloud", "service_cloud", "platform", "marketing_commerce"}

    # No double-dashes in slugs (cosmetic but matters for ID stability)
    bad_slugs = [a.account_id for a in rows if "--" in a.account_id]
    assert not bad_slugs, f"account_ids with double-dash slugs: {bad_slugs}"


def test_chart_of_accounts_pnl_rollups() -> None:
    rows = entities.gen_chart_of_accounts()
    rollups = {a.pnl_rollup for a in rows}
    expected = {"balance_sheet", "revenue", "cogs", "sm", "rd", "ga", "other_income", "tax"}
    assert rollups == expected


def test_cost_centers_per_entity() -> None:
    rows = entities.gen_cost_centers()
    # Sales x3 + 5 other functions = 8 CCs per entity, 3 entities = 24
    assert len(rows) == 24

    by_entity: dict[str, int] = {}
    for cc in rows:
        by_entity[cc.entity_id] = by_entity.get(cc.entity_id, 0) + 1
    assert by_entity == {"US": 8, "EMEA": 8, "APAC": 8}

    # SMB cost center name uses uppercase abbreviation
    smb_names = [cc.cost_center_name for cc in rows if "SMB" in cc.cost_center_id]
    assert all("SMB" in n for n in smb_names)


def test_invariants_pass() -> None:
    e = entities.gen_entities()
    coa = entities.gen_chart_of_accounts()
    cc = entities.gen_cost_centers()
    # Should not raise
    entities.assert_reference_invariants(e, coa, cc)
