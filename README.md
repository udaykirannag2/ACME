# ACME SaaS Solutions — Finance Transformation with AI on AWS

A learning project: build an end-to-end AI-driven finance analytics platform for a fictitious SaaS company (ACME), modeled on Salesforce's public filings.

## What's in here

| Path | Purpose |
|---|---|
| `infra/` | Terraform for all AWS resources (S3, Glue, Redshift Serverless, Bedrock, IAM, etc.) |
| `generators/` | Python data generators that produce synthetic ERP/EPM/CRM data shaped by Salesforce's 10-K |
| `pipelines/` | Glue ETL job scripts and Step Functions state machines |
| `warehouse/` | Raw-zone DDL + dbt project (staging → intermediate → marts) |
| `agent/` | Bedrock Agent definition, action-group Lambdas, eval harness |
| `notebooks/` | SageMaker / local Jupyter for forecasting and exploration |
| `ui/` | Streamlit chat front-end (Phase 10) |
| `docs/` | Architecture, data dictionary, ADRs, reference filings |

## Phases

See `docs/PLAN.md` for the full phased plan. Current phase: **0 → 1 (foundations + data model)**.

## Getting started

```bash
# Prereqs: uv, Terraform, AWS CLI configured for us-east-1
uv sync                          # install Python deps
cd infra/envs/dev && terraform init
```

## Cost guardrails

Target: **~$50/month**. See `docs/cost-guardrails.md`. Pause Redshift Serverless when not in use; tear down RDS between sessions.

## Conventions

- AWS region: `us-east-1`
- Tag every resource: `project=acme-finance`, `env=dev`, `owner=<you>`
- Never commit secrets — use AWS Secrets Manager
