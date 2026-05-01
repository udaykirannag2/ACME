# ADR 0003 — Data grounding from Salesforce (CRM) public filings

**Status**: Accepted
**Date**: 2026-05-01

## Context

ACME is a fictitious SaaS company. We want its data to be realistic enough that the agent's analyses on it transfer to real-world finance work. We want both controllability (so we can seed anomalies for testing) and verisimilitude (so revenue mix, opex ratios, and margin profile look like a real public SaaS company).

## Decision

Generate **fully synthetic** ACME data, but **shape it** using Salesforce Inc.'s (NYSE: CRM) latest 10-K and 10-Q. Specifically:

- **Segment mix** — four segments (Sales Cloud, Service Cloud, Platform & Other, Marketing & Commerce), revenue weights taken from the most recent 10-K segment disclosure.
- **Geographic split** — Americas / EMEA / APAC weights taken from CRM's geography disclosure (~67% / 22% / 11% as of FY24).
- **Margin profile** — gross margin ~75%, operating margin ~13%, S&M ~38–45% of revenue, R&D ~14–16%, G&A ~6–8%.
- **Seasonality** — Q4 (CRM fiscal: Nov–Jan) is the largest quarter for new bookings.
- **Subscription mechanics** — annual contracts with monthly billing, ratable revenue recognition over the service period.

ACME is sized **smaller** than CRM (~$2B vs ~$35B revenue) so the data feels like a mid-sized SaaS, not a copy of Salesforce.

## Why not pull real Salesforce filings into Redshift?

We considered ingesting Salesforce's actual XBRL filings from SEC EDGAR. Rejected because:
- The 10-K reports rolled-up segment numbers, not the underlying GL/AP/AR detail we need to demonstrate ERP-level analysis.
- Adds a non-trivial XBRL parsing scope that doesn't materially advance the AI/finance learning goals.
- Synthetic data lets us seed anomalies for the agent eval harness — real data doesn't.

We will, however, **load the 10-K PDFs into the Bedrock Knowledge Base** (Phase 6). The agent can then cite them when explaining accounting policies or industry context.

## Consequences

- We need to keep the generator's tunable parameters (`generators/config.py` in Phase 2) honestly traceable to Salesforce disclosures, so the data stays calibrated. Document the source for each ratio in code comments.
- When Salesforce files a new 10-K, we may want to re-tune. Track the filing date used in `docs/data-dictionary.md`.
- We are **not** auditing Salesforce data. ACME's numbers are fictional and should never be used as a Salesforce proxy.
