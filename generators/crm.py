"""Phase 2B — CRM generators.

Produces:
  - account.parquet
  - contact.parquet
  - opportunity.parquet            (won + lost + open)
  - opportunity_line.parquet
  - arr_movement.parquet           (monthly ARR roll-forward by account+segment)
  - pipeline_snapshot.parquet      (weekly Friday snapshots for FY25 only)

Strategy:
  1. Generate accounts (~ACTIVE_CUSTOMERS_FY25_EOY × scale). 30% pre-history,
     70% acquired during FY23-FY25 (with bookings seasonality).
  2. Each account gets 1-3 subscription lines across segments depending on tier.
  3. Each subscription is walked forward in time emitting events:
        new -> renewal | expansion | contraction | churn -> repeat
  4. Events become OpportunityRow (closed_won) and ARRMovementRow.
  5. A separate stream produces lost & open pipeline opportunities.
  6. For FY25 only, every Friday snapshot every then-open opportunity.

ARR trajectory target (subscription only, ~88% of total revenue):
  - FY23 EOP: ~$1.61B   (= FY24 BoP)
  - FY24 EOP: ~$1.90B   (= FY25 BoP)
  - FY25 EOP: ~$2.20B
  Generator self-tunes via ACV_CALIBRATION_TARGETS below.
"""
from __future__ import annotations

import uuid
from collections.abc import Sequence
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta, timezone

import numpy as np
from dateutil.relativedelta import relativedelta
from faker import Faker

from . import config as cfg
from .types import (
    AccountRow,
    ARRMovementRow,
    ContactRow,
    OpportunityLineRow,
    OpportunityRow,
    PipelineSnapshotRow,
)


# =============================================================================
# Calibrated parameters (iterate here if ARR trajectory drifts)
# =============================================================================

# Median per-subscription ACV by tier (USD). Larger than config medians because
# config medians are per-deal/lost-included; these are per-active-subscription
# and skew higher. Lognormal sigma controls the spread.
TIER_ACV_BASE: dict[str, float] = {
    "enterprise": 1_100_000,
    "commercial":   260_000,
    "smb":           75_000,
}
TIER_ACV_SIGMA: dict[str, float] = {
    "enterprise": 0.55,
    "commercial": 0.45,
    "smb":        0.35,
}

# Number of subscription lines per account, by tier.
SUBS_PER_ACCOUNT: dict[str, dict[int, float]] = {
    "enterprise": {1: 0.25, 2: 0.45, 3: 0.30},
    "commercial": {1: 0.65, 2: 0.35},
    "smb":        {1: 1.00},
}

# Renewal-time outcome probabilities (per contract end date).
# Values per tier so SMB churns more, Enterprise churns less.
RENEWAL_OUTCOMES: dict[str, dict[str, float]] = {
    # outcome -> probability; must sum to 1.0
    "enterprise": {"renewal": 0.55, "expansion": 0.30, "contraction": 0.10, "churn": 0.05},
    "commercial": {"renewal": 0.55, "expansion": 0.22, "contraction": 0.13, "churn": 0.10},
    "smb":        {"renewal": 0.55, "expansion": 0.10, "contraction": 0.15, "churn": 0.20},
}

# Expansion / contraction magnitude ranges.
EXPANSION_PCT_RANGE = (0.05, 0.40)
CONTRACTION_PCT_RANGE = (0.05, 0.25)

# Account creation: 55% pre-existing as of FY23 BoP. Higher share gives FY23
# enough ARR baseline (mature customers carrying more cumulative ACV).
PRE_HISTORY_ACCOUNT_SHARE = 0.55

# Lost opportunity multiplier — for every K won, generate K * X lost.
LOST_OPP_MULTIPLIER = 0.40

# Open pipeline target — number of currently-open opportunities at FY25 EOP.
# Loosely: ~6 weeks of pipeline coverage on Q4 run-rate bookings.
OPEN_PIPELINE_AT_EOP = 0.18  # share of won opportunities, applied as snapshot

# Pipeline snapshot cadence in FY25 (Fridays only — keeps row count tractable).
PIPELINE_SNAPSHOT_DAY_OF_WEEK = 4   # Mon=0, Fri=4


# =============================================================================
# Internal subscription state (never emitted)
# =============================================================================

@dataclass(slots=True)
class _SubEvent:
    event_type: str          # new | renewal | expansion | contraction | churn
    event_date: date
    old_acv: float
    new_acv: float
    term_months: int
    opportunity_id: str | None = None    # set when emitted as opp


@dataclass(slots=True)
class _Subscription:
    sub_id: str
    account_id: str
    segment: str
    tier: str
    initial_start_date: date
    current_start_date: date
    current_end_date: date
    current_acv: float
    seats: int
    term_months: int
    events: list[_SubEvent] = field(default_factory=list)
    status: str = "active"           # active | churned

    @property
    def monthly_arr_contribution(self) -> float:
        return self.current_acv / 12.0


# =============================================================================
# Public artifacts type
# =============================================================================

@dataclass(slots=True)
class CRMArtifacts:
    accounts: list[AccountRow]
    contacts: list[ContactRow]
    opportunities: list[OpportunityRow]
    opportunity_lines: list[OpportunityLineRow]
    arr_movements: list[ARRMovementRow]
    pipeline_snapshots: list[PipelineSnapshotRow]
    # ARR by period for validation / tie-out
    arr_by_period: dict[int, float] = field(default_factory=dict)


# =============================================================================
# Helpers
# =============================================================================

def _weighted_choice(rng: np.random.Generator, choices: Sequence[str], weights: Sequence[float]) -> str:
    total = sum(weights)
    probs = [w / total for w in weights]
    return str(rng.choice(choices, p=probs))


def _weighted_int_choice(rng: np.random.Generator, dist: dict[int, float]) -> int:
    keys = list(dist.keys())
    probs = list(dist.values())
    return int(rng.choice(keys, p=probs))


def _random_date_uniform(rng: np.random.Generator, start: date, end: date) -> date:
    days = (end - start).days
    if days <= 0:
        return start
    return start + timedelta(days=int(rng.integers(0, days + 1)))


def _random_date_seasonal(rng: np.random.Generator, start: date, end: date) -> date:
    """Sample a date in [start, end] weighted by quarter-level booking seasonality."""
    base = _random_date_uniform(rng, start, end)
    # Re-roll up to 3 times if Q1; accept otherwise. This biases toward Q4.
    fq = cfg.fiscal_quarter(base)
    weight = cfg.BOOKINGS_FQ_SEASONALITY[fq] / 0.32  # 0.32 is max (Q4)
    if rng.random() > weight:
        return _random_date_uniform(rng, start, end)
    return base


def _period_yyyymm(d: date) -> int:
    return d.year * 100 + d.month


def _months_between(d1: date, d2: date) -> int:
    return (d2.year - d1.year) * 12 + (d2.month - d1.month)


def _add_months(d: date, n: int) -> date:
    return d + relativedelta(months=n)


def _round_to_thousand(x: float) -> float:
    return float(round(x / 1000) * 1000)


# =============================================================================
# Step 1 — Accounts
# =============================================================================

def _generate_accounts(
    rng: np.random.Generator,
    faker: Faker,
    mode: cfg.GenerationMode,
) -> list[AccountRow]:
    n_target = max(20, round(cfg.ACTIVE_CUSTOMERS_FY25_EOY * mode.customer_scale))
    n_pre = round(n_target * PRE_HISTORY_ACCOUNT_SHARE)
    n_through = n_target - n_pre

    fy23_start = cfg.fy_start(2023)        # Feb 1, 2022
    fy25_end = cfg.fy_end(2025)            # Jan 31, 2025
    pre_window_start = date(2018, 1, 1)
    pre_window_end = date(2022, 1, 31)

    accounts: list[AccountRow] = []

    # Tier weights from config
    tier_codes = [t.code for t in cfg.SEGMENT_TIERS]
    tier_weights = [t.customer_share for t in cfg.SEGMENT_TIERS]

    # Entity weights (geo)
    entity_codes = [e.entity_id for e in cfg.ENTITIES]
    entity_weights = [e.geo_weight for e in cfg.ENTITIES]

    industries = list(cfg.TOP_INDUSTRIES)

    def make_one(created_date: date) -> AccountRow:
        tier = _weighted_choice(rng, tier_codes, tier_weights)
        entity = _weighted_choice(rng, entity_codes, entity_weights)
        country_dist = cfg.COUNTRY_WEIGHTS_BY_ENTITY[entity]
        country = _weighted_choice(
            rng, list(country_dist.keys()), list(country_dist.values())
        )
        # Names: Faker company + tier suffix occasionally to make tier obvious
        base_name = faker.company()
        # Trim trailing comma/period the Faker locale sometimes adds
        base_name = base_name.rstrip(", .")
        return AccountRow(
            account_id=str(uuid.uuid4()),
            account_name=base_name,
            industry=str(rng.choice(industries)),
            billing_country=country,
            segment_tier=tier,
            owner_name=faker.name(),
            created_date=created_date,
        )

    # Pre-history: created Jan 2018 - Jan 2022, uniform
    for _ in range(n_pre):
        accounts.append(make_one(_random_date_uniform(rng, pre_window_start, pre_window_end)))

    # Through-history: created Feb 2022 - Jan 2025, with Q4 seasonality
    for _ in range(n_through):
        accounts.append(make_one(_random_date_seasonal(rng, fy23_start, fy25_end)))

    return accounts


# =============================================================================
# Step 2 — Contacts
# =============================================================================

def _generate_contacts(
    rng: np.random.Generator,
    faker: Faker,
    accounts: list[AccountRow],
) -> list[ContactRow]:
    contacts: list[ContactRow] = []
    n_per_dist = {1: 0.20, 2: 0.30, 3: 0.25, 4: 0.15, 5: 0.10}
    for acct in accounts:
        n = _weighted_int_choice(rng, n_per_dist)
        for _ in range(n):
            contacts.append(ContactRow(
                contact_id=str(uuid.uuid4()),
                account_id=acct.account_id,
                email=faker.email(),
                title=faker.job(),
            ))
    return contacts


# =============================================================================
# Step 3 — Subscriptions (in-memory)
# =============================================================================

def _draw_acv(rng: np.random.Generator, tier: str) -> float:
    base = TIER_ACV_BASE[tier]
    sigma = TIER_ACV_SIGMA[tier]
    # Lognormal: mean ≈ base * exp(sigma^2/2). Subtract a tiny amount so median is base.
    raw = base * float(np.exp(rng.normal(0, sigma) - sigma * sigma / 2))
    return _round_to_thousand(max(raw, base * 0.10))   # floor at 10% of base


def _draw_seats(rng: np.random.Generator, tier: str, acv: float) -> int:
    # Rough seats — used in opportunity_line for color, not for math
    if tier == "enterprise":
        return max(50, int(acv / 4_000) + int(rng.integers(0, 200)))
    if tier == "commercial":
        return max(10, int(acv / 1_500) + int(rng.integers(0, 30)))
    return max(2, int(acv / 800) + int(rng.integers(0, 8)))


def _generate_subscriptions(
    rng: np.random.Generator,
    accounts: list[AccountRow],
) -> list[_Subscription]:
    fy25_end = cfg.fy_end(2025)
    segment_codes = [s.code for s in cfg.SEGMENTS]
    segment_weights = [s.weight for s in cfg.SEGMENTS]
    term_dist = cfg.CONTRACT_TERM_MONTHS_DIST

    subs: list[_Subscription] = []

    for acct in accounts:
        # How many subscription lines this account has
        n_subs = _weighted_int_choice(rng, SUBS_PER_ACCOUNT[acct.segment_tier])
        # Pick distinct segments
        chosen_idx = rng.choice(
            len(segment_codes),
            size=min(n_subs, len(segment_codes)),
            replace=False,
            p=np.array(segment_weights) / sum(segment_weights),
        )
        chosen_segs = [segment_codes[int(i)] for i in chosen_idx]

        for i, seg in enumerate(chosen_segs):
            # Initial sub starts within 30d of account creation; cross-sells after 6-24m
            if i == 0:
                offset_days = int(rng.integers(0, 31))
            else:
                offset_days = int(rng.integers(180, 720))
            start_date = acct.created_date + timedelta(days=offset_days)

            # Skip if start would be after our window
            if start_date > fy25_end:
                continue

            acv = _draw_acv(rng, acct.segment_tier)
            seats = _draw_seats(rng, acct.segment_tier, acv)
            term = _weighted_int_choice(rng, term_dist)
            end_date = _add_months(start_date, term)

            sub = _Subscription(
                sub_id=str(uuid.uuid4()),
                account_id=acct.account_id,
                segment=seg,
                tier=acct.segment_tier,
                initial_start_date=start_date,
                current_start_date=start_date,
                current_end_date=end_date,
                current_acv=acv,
                seats=seats,
                term_months=term,
            )
            sub.events.append(_SubEvent(
                event_type="new",
                event_date=start_date,
                old_acv=0.0,
                new_acv=acv,
                term_months=term,
            ))
            subs.append(sub)

    return subs


# =============================================================================
# Step 4 — Walk subscriptions through time
# =============================================================================

def _walk_subscription_lifecycle(
    rng: np.random.Generator,
    subs: list[_Subscription],
) -> None:
    """Mutates subs in place to add events through end of FY25."""
    horizon = cfg.fy_end(2025)
    term_dist = cfg.CONTRACT_TERM_MONTHS_DIST

    for sub in subs:
        outcomes = RENEWAL_OUTCOMES[sub.tier]
        outcome_keys = list(outcomes.keys())
        outcome_probs = list(outcomes.values())

        while sub.current_end_date <= horizon and sub.status == "active":
            outcome = str(rng.choice(outcome_keys, p=outcome_probs))
            event_date = sub.current_end_date

            if outcome == "churn":
                sub.events.append(_SubEvent(
                    event_type="churn",
                    event_date=event_date,
                    old_acv=sub.current_acv,
                    new_acv=0.0,
                    term_months=0,
                ))
                sub.status = "churned"
                break

            old_acv = sub.current_acv
            if outcome == "expansion":
                pct = float(rng.uniform(*EXPANSION_PCT_RANGE))
                new_acv = _round_to_thousand(old_acv * (1 + pct))
            elif outcome == "contraction":
                pct = float(rng.uniform(*CONTRACTION_PCT_RANGE))
                new_acv = _round_to_thousand(old_acv * (1 - pct))
            else:  # plain renewal — same ACV
                new_acv = old_acv

            new_term = _weighted_int_choice(rng, term_dist)
            sub.events.append(_SubEvent(
                event_type=outcome,        # renewal | expansion | contraction
                event_date=event_date,
                old_acv=old_acv,
                new_acv=new_acv,
                term_months=new_term,
            ))
            sub.current_acv = new_acv
            sub.current_start_date = event_date
            sub.current_end_date = _add_months(event_date, new_term)
            sub.term_months = new_term


# =============================================================================
# Step 5 — Emit opportunities (closed_won) from sub events
# =============================================================================

def _opportunity_name(rng: np.random.Generator, account_name: str, segment: str, kind: str) -> str:
    seg_label = next(s.display_name for s in cfg.SEGMENTS if s.code == segment)
    suffix = {"new": "New", "renewal": "Renewal", "expansion": "Expansion",
              "contraction": "Renewal (Down)"}[kind]
    return f"{account_name} - {seg_label} - {suffix}"


def _emit_won_opportunities(
    rng: np.random.Generator,
    accounts: list[AccountRow],
    subs: list[_Subscription],
) -> tuple[list[OpportunityRow], list[OpportunityLineRow]]:
    accounts_by_id = {a.account_id: a for a in accounts}
    opps: list[OpportunityRow] = []
    lines: list[OpportunityLineRow] = []

    for sub in subs:
        acct = accounts_by_id[sub.account_id]
        for ev in sub.events:
            if ev.event_type == "churn":
                continue   # churns are not opportunities
            kind = ev.event_type
            # close_date = event_date; created_date = close_date - 30..120d
            created_offset = int(rng.integers(30, 121))
            created_date = ev.event_date - timedelta(days=created_offset)

            opp_id = str(uuid.uuid4())
            ev.opportunity_id = opp_id

            # Amount = new_acv (for new/renewal/expansion); for contraction it's still
            # a closed_won at the new (lower) ACV.
            opp_amount = ev.new_acv if ev.new_acv > 0 else ev.old_acv
            opps.append(OpportunityRow(
                opportunity_id=opp_id,
                account_id=sub.account_id,
                name=_opportunity_name(rng, acct.account_name, sub.segment, kind),
                stage="closed_won",
                amount=opp_amount,
                close_date=ev.event_date,
                probability_pct=100,
                segment=sub.segment,
                owner_name=acct.owner_name,
                created_date=created_date,
                modified_date=ev.event_date,
            ))

            # Single line per opp, product code derived from segment + tier
            tier_code = {"enterprise": "ENT", "commercial": "COM", "smb": "SMB"}[sub.tier]
            seg_code = {
                "sales_cloud": "SC",
                "service_cloud": "SVC",
                "platform": "PLAT",
                "marketing_commerce": "MC",
            }[sub.segment]
            lines.append(OpportunityLineRow(
                opportunity_line_id=str(uuid.uuid4()),
                opportunity_id=opp_id,
                product_code=f"{seg_code}-{tier_code}",
                segment=sub.segment,
                acv_amount=opp_amount,
                seats=sub.seats,
            ))

    return opps, lines


# =============================================================================
# Step 6 — ARR movements
# =============================================================================

def _emit_arr_movements(subs: list[_Subscription]) -> list[ARRMovementRow]:
    """One ARRMovementRow per (sub event, period_yyyymm) tuple.

    Movement types per sub event:
      new          -> 'new'
      renewal      -> 'renewal'      (no ARR change)
      expansion    -> 'expansion'    (positive arr_change)
      contraction  -> 'contraction'  (negative)
      churn        -> 'churn'        (negative)
    """
    rows: list[ARRMovementRow] = []
    starting_arr_by_acct_seg: dict[tuple[str, str], float] = {}

    for sub in subs:
        key = (sub.account_id, sub.segment)
        for ev in sub.events:
            period = _period_yyyymm(ev.event_date)
            starting = starting_arr_by_acct_seg.get(key, 0.0)
            ending = starting

            if ev.event_type == "new":
                arr_change = ev.new_acv
                ending = ev.new_acv
            elif ev.event_type == "renewal":
                arr_change = 0.0
                # ending = starting unchanged
            elif ev.event_type == "expansion":
                arr_change = ev.new_acv - ev.old_acv
                ending = ev.new_acv
            elif ev.event_type == "contraction":
                arr_change = ev.new_acv - ev.old_acv   # negative
                ending = ev.new_acv
            elif ev.event_type == "churn":
                arr_change = -ev.old_acv
                ending = 0.0
            else:   # pragma: no cover
                continue

            rows.append(ARRMovementRow(
                arr_movement_id=str(uuid.uuid4()),
                period_yyyymm=period,
                account_id=sub.account_id,
                segment=sub.segment,
                movement_type=ev.event_type,
                arr_change=round(arr_change, 2),
                starting_arr=round(starting, 2),
                ending_arr=round(ending, 2),
            ))
            starting_arr_by_acct_seg[key] = ending

    return rows


# =============================================================================
# Step 7 — Lost & open pipeline opportunities
# =============================================================================

_OPEN_STAGES = ["prospecting", "qualification", "proposal", "negotiation"]
_OPEN_STAGE_PROBS = [0.40, 0.30, 0.20, 0.10]
_OPEN_STAGE_PROBABILITY: dict[str, int] = {
    "prospecting":   10,
    "qualification": 30,
    "proposal":      60,
    "negotiation":   80,
}


def _generate_lost_and_open_opportunities(
    rng: np.random.Generator,
    faker: Faker,
    accounts: list[AccountRow],
    n_won_opps: int,
) -> tuple[list[OpportunityRow], list[OpportunityLineRow]]:
    """Generate lost opportunities (during full window) + open pipeline (FY25 only)."""
    fy23_start = cfg.fy_start(2023)
    fy25_end = cfg.fy_end(2025)

    segment_codes = [s.code for s in cfg.SEGMENTS]
    segment_weights = [s.weight for s in cfg.SEGMENTS]

    opps: list[OpportunityRow] = []
    lines: list[OpportunityLineRow] = []

    # ----- Lost opps -----
    n_lost = round(n_won_opps * LOST_OPP_MULTIPLIER)
    for _ in range(n_lost):
        acct = accounts[int(rng.integers(0, len(accounts)))]
        close_date = _random_date_uniform(rng, fy23_start, fy25_end)
        if close_date < acct.created_date:
            close_date = acct.created_date + timedelta(days=30)
        created_date = close_date - timedelta(days=int(rng.integers(30, 181)))
        if created_date < fy23_start:
            created_date = fy23_start
        seg = _weighted_choice(rng, segment_codes, segment_weights)
        amount = _draw_acv(rng, acct.segment_tier)

        opp_id = str(uuid.uuid4())
        seg_label = next(s.display_name for s in cfg.SEGMENTS if s.code == seg)
        opps.append(OpportunityRow(
            opportunity_id=opp_id,
            account_id=acct.account_id,
            name=f"{acct.account_name} - {seg_label} - Lost",
            stage="closed_lost",
            amount=amount,
            close_date=close_date,
            probability_pct=0,
            segment=seg,
            owner_name=acct.owner_name,
            created_date=created_date,
            modified_date=close_date,
        ))
        tier_code = {"enterprise": "ENT", "commercial": "COM", "smb": "SMB"}[acct.segment_tier]
        seg_code = {"sales_cloud": "SC", "service_cloud": "SVC",
                    "platform": "PLAT", "marketing_commerce": "MC"}[seg]
        lines.append(OpportunityLineRow(
            opportunity_line_id=str(uuid.uuid4()),
            opportunity_id=opp_id,
            product_code=f"{seg_code}-{tier_code}",
            segment=seg,
            acv_amount=amount,
            seats=_draw_seats(rng, acct.segment_tier, amount),
        ))

    # ----- Open pipeline (open as of FY25 EOP) -----
    n_open = max(5, round(n_won_opps * OPEN_PIPELINE_AT_EOP))
    for _ in range(n_open):
        acct = accounts[int(rng.integers(0, len(accounts)))]
        # Created within last 0-180 days
        days_ago = int(rng.integers(0, 181))
        created_date = fy25_end - timedelta(days=days_ago)
        if created_date < acct.created_date:
            created_date = acct.created_date + timedelta(days=1)
        # Close date in next 30-180 days (in the future from FY25 EOP perspective)
        close_date = fy25_end + timedelta(days=int(rng.integers(30, 181)))
        stage = str(rng.choice(_OPEN_STAGES, p=_OPEN_STAGE_PROBS))
        prob = _OPEN_STAGE_PROBABILITY[stage]
        seg = _weighted_choice(rng, segment_codes, segment_weights)
        amount = _draw_acv(rng, acct.segment_tier)

        opp_id = str(uuid.uuid4())
        seg_label = next(s.display_name for s in cfg.SEGMENTS if s.code == seg)
        opps.append(OpportunityRow(
            opportunity_id=opp_id,
            account_id=acct.account_id,
            name=f"{acct.account_name} - {seg_label} - {stage.capitalize()}",
            stage=stage,
            amount=amount,
            close_date=close_date,
            probability_pct=prob,
            segment=seg,
            owner_name=acct.owner_name,
            created_date=created_date,
            modified_date=fy25_end,
        ))
        tier_code = {"enterprise": "ENT", "commercial": "COM", "smb": "SMB"}[acct.segment_tier]
        seg_code = {"sales_cloud": "SC", "service_cloud": "SVC",
                    "platform": "PLAT", "marketing_commerce": "MC"}[seg]
        lines.append(OpportunityLineRow(
            opportunity_line_id=str(uuid.uuid4()),
            opportunity_id=opp_id,
            product_code=f"{seg_code}-{tier_code}",
            segment=seg,
            acv_amount=amount,
            seats=_draw_seats(rng, acct.segment_tier, amount),
        ))

    return opps, lines


# =============================================================================
# Step 8 — Pipeline snapshots (weekly, FY25 only)
# =============================================================================

def _generate_pipeline_snapshots(
    rng: np.random.Generator,
    opportunities: list[OpportunityRow],
) -> list[PipelineSnapshotRow]:
    """For every Friday in FY25, snapshot every opp that is open on that date.

    "Open on date X" means: created_date <= X AND (closed before X or still open).
    For closed-before-X opps with stage closed_won/closed_lost, we don't snapshot;
    we snapshot during the time they were active stages.
    """
    fy25_start = cfg.fy_start(2025)
    fy25_end = cfg.fy_end(2025)

    # Build list of Fridays in FY25
    fridays: list[date] = []
    d = fy25_start
    while d.weekday() != PIPELINE_SNAPSHOT_DAY_OF_WEEK:
        d += timedelta(days=1)
    while d <= fy25_end:
        fridays.append(d)
        d += timedelta(days=7)

    # For perf: filter to opps that overlap FY25 in any stage
    candidates = [o for o in opportunities if o.created_date <= fy25_end]

    rows: list[PipelineSnapshotRow] = []

    for snapshot_date in fridays:
        for opp in candidates:
            if opp.created_date > snapshot_date:
                continue
            # If closed before snapshot, skip
            if opp.stage in ("closed_won", "closed_lost") and opp.close_date < snapshot_date:
                continue
            # For currently-open opps, the recorded stage IS the latest stage; we
            # synthesize an earlier-stage progression backwards from their final stage.
            if opp.stage in _OPEN_STAGES:
                # Random prior stage based on time since created
                age_days = (snapshot_date - opp.created_date).days
                progression = int(min(3, age_days // 30))
                stage_idx = max(0, _OPEN_STAGES.index(opp.stage) - (3 - progression))
                stage_at = _OPEN_STAGES[stage_idx]
                prob_at = _OPEN_STAGE_PROBABILITY[stage_at]
                amount_at = opp.amount   # naive: same amount over life
                rows.append(PipelineSnapshotRow(
                    snapshot_date=snapshot_date,
                    opportunity_id=opp.opportunity_id,
                    stage=stage_at,
                    amount=amount_at,
                    close_date=opp.close_date,
                    probability_pct=prob_at,
                ))
            elif opp.stage == "closed_won":
                # Snapshot pre-close — synthesize a few stages back
                if (snapshot_date - opp.created_date).days < 0:
                    continue
                age_days = (snapshot_date - opp.created_date).days
                stage_at = _OPEN_STAGES[min(3, age_days // 30)]
                prob_at = _OPEN_STAGE_PROBABILITY[stage_at]
                rows.append(PipelineSnapshotRow(
                    snapshot_date=snapshot_date,
                    opportunity_id=opp.opportunity_id,
                    stage=stage_at,
                    amount=opp.amount,
                    close_date=opp.close_date,
                    probability_pct=prob_at,
                ))
            elif opp.stage == "closed_lost":
                age_days = (snapshot_date - opp.created_date).days
                stage_at = _OPEN_STAGES[min(3, age_days // 30)]
                prob_at = _OPEN_STAGE_PROBABILITY[stage_at]
                rows.append(PipelineSnapshotRow(
                    snapshot_date=snapshot_date,
                    opportunity_id=opp.opportunity_id,
                    stage=stage_at,
                    amount=opp.amount,
                    close_date=opp.close_date,
                    probability_pct=prob_at,
                ))

    return rows


# =============================================================================
# ARR validation — compute monthly ARR from subs and return for tie-out
# =============================================================================

def _compute_monthly_arr(subs: list[_Subscription]) -> dict[int, float]:
    """ARR by yyyymm: sum of currently-active sub ACVs at month-end."""
    fy23_start = cfg.fy_start(2023)
    fy25_end = cfg.fy_end(2025)

    # Build (start_date, end_date_or_churn, current_acv_segments) per sub
    # Each sub may have multiple ACV "segments in time" due to expansion/contraction
    arr_by_period: dict[int, float] = {}

    # Generate list of month-end dates in window
    cursor = fy23_start.replace(day=1)
    while cursor <= fy25_end:
        # month end
        next_month = cursor + relativedelta(months=1)
        month_end = next_month - timedelta(days=1)
        period = _period_yyyymm(cursor)

        active_arr = 0.0
        for sub in subs:
            if sub.initial_start_date > month_end:
                continue
            # find which event window contains month_end
            current_acv = 0.0
            for ev in sub.events:
                if ev.event_date <= month_end:
                    if ev.event_type == "churn":
                        current_acv = 0.0
                    else:
                        current_acv = ev.new_acv
                else:
                    break
            active_arr += current_acv
        arr_by_period[period] = active_arr
        cursor = next_month

    return arr_by_period


# =============================================================================
# Public entry point
# =============================================================================

def generate_crm(
    rng: np.random.Generator,
    faker: Faker,
    mode: cfg.GenerationMode,
) -> CRMArtifacts:
    accounts = _generate_accounts(rng, faker, mode)
    contacts = _generate_contacts(rng, faker, accounts)
    subs = _generate_subscriptions(rng, accounts)
    _walk_subscription_lifecycle(rng, subs)

    won_opps, won_lines = _emit_won_opportunities(rng, accounts, subs)
    arr_movements = _emit_arr_movements(subs)
    lost_open_opps, lost_open_lines = _generate_lost_and_open_opportunities(
        rng, faker, accounts, n_won_opps=len(won_opps),
    )
    all_opps = won_opps + lost_open_opps
    all_lines = won_lines + lost_open_lines

    snapshots = _generate_pipeline_snapshots(rng, all_opps)

    arr_by_period = _compute_monthly_arr(subs)

    return CRMArtifacts(
        accounts=accounts,
        contacts=contacts,
        opportunities=all_opps,
        opportunity_lines=all_lines,
        arr_movements=arr_movements,
        pipeline_snapshots=snapshots,
        arr_by_period=arr_by_period,
    )


# Touch unused imports
_ = datetime
_ = timezone
