# ADR 0001 — Tooling choices

**Status**: Accepted
**Date**: 2026-05-01

## Context

Bootstrapping a learning project that spans IaC, data engineering, ML, and AI agents. Tooling needs to be approachable, AWS-native where possible, and cheap.

## Decisions

### IaC: Terraform (over CDK)
- Plain-text HCL is easier to read for learning purposes.
- Plan/apply diffs are clear and reviewable.
- State backend: S3 + DynamoDB lock in the project's AWS account.
- One env (`dev`) for now; modules designed to be re-instantiated for `prod` later.

### Python tooling: uv + Python 3.12
- `uv` is the fastest Python package manager; lockfile gives reproducible installs.
- Python 3.12 — modern enough for current libraries, stable enough for AWS Lambda runtime parity.
- Project layout follows PEP 621 (`pyproject.toml`).

### Warehouse modeling: dbt-redshift
- Industry-standard, transferable skill.
- Tests, docs, and lineage built-in.
- Run from local CLI initially; move to Step Functions Lambda in Phase 4.

### Orchestration: Step Functions + EventBridge (not MWAA)
- MWAA costs ~$300/mo minimum — incompatible with $50 budget.
- Step Functions Standard is pay-per-transition, near-zero idle cost.
- For this scale (daily refresh, ~10 steps), Step Functions is plenty.

### Agent framework: Bedrock Agents
- Native AWS, no additional infra to manage.
- Action groups map cleanly to Lambdas, which is how we want to structure tools.
- Knowledge Bases handle RAG without us building a vector pipeline.
- Trade-off: less flexibility than LangGraph; if we hit Bedrock Agent limits, we can swap to direct Claude API + custom orchestration in a later ADR.

### Forecasting: statsforecast + prophet (local), with optional SageMaker
- Statistical baselines (AutoARIMA, ETS) are right for monthly P&L series with ~36 data points.
- Avoids the cost of always-on SageMaker endpoints.
- SageMaker reserved for occasional notebook work.

### Front-end: Streamlit
- Single-file Python apps; perfect for a chat UI demo.
- Deploy to App Runner (scale-to-zero) or run locally.

## Consequences

- We're tying ourselves to AWS — portability to GCP/Azure would require rework. Acceptable: this is an AWS learning project.
- dbt is a dependency to learn alongside the AWS stack — adds a learning curve but is worth it.
- Bedrock Agents lock us to AWS for the agent loop. If the agent later needs more sophisticated multi-turn state, we may revisit.
