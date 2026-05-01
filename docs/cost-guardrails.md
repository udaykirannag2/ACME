# Cost guardrails

Target: **~$50/month** for an actively-used dev environment. Up to ~$100 in "build phase" months when generating data and running Bedrock evals.

## Billing alarms

- AWS Budgets: $50 actual, $100 forecasted — both notify your email.
- AWS Cost Explorer review every Sunday — eyeball top services.
- Tag every resource: `project=acme-finance`, `env=dev`, `owner=<you>`. Filter Cost Explorer by tag.

## Per-service levers

| Service | Cost driver | Lever |
|---|---|---|
| Redshift Serverless | RPU-hours | Base capacity 8 RPU, **auto-pause after 5 min idle**, max 32 RPU. Most analyst sessions cost <$0.50. |
| RDS Postgres (ERP) | instance-hours | `db.t4g.micro`, free-tier eligible. **Stop instance** between sessions (`aws rds stop-db-instance`). |
| S3 | storage + requests | Lifecycle: raw zone → S3-IA after 30 days, Glacier IR after 90. Synthetic data is regeneratable, so use minimum redundancy. |
| Glue ETL | DPU-hours | Use Glue Python Shell (0.0625 DPU) for small tables; PySpark only for >1M rows. Schedule daily, not hourly. |
| Glue Data Quality | DPU-hours | Run on demand, not scheduled. |
| AWS DMS | replication-instance-hours | Smallest replication instance, **stop task** between full loads. Or use DMS Serverless if available in your account. |
| Bedrock | tokens in/out | Use Haiku 4.5 for classification/routing; Sonnet 4.6 only for the agent loop. **Always enable prompt caching** (5-min TTL on Anthropic API; check Bedrock equivalent). Aim for >70% cache hit rate. |
| Bedrock Knowledge Base | OpenSearch Serverless OCU-hours | Smallest collection (1 OCU search + 1 OCU indexing). Pause/destroy collection between phases if not querying. |
| SageMaker Notebook | instance-hours | `ml.t3.medium`, **stop after each session**. Prefer local Jupyter for exploration, SageMaker only when you need an AWS-resident environment. |
| Lambda | requests + GB-s | Default memory 512MB; revisit only if cold start matters. Action group Lambdas idle = $0. |
| App Runner | provisioned concurrency | Smallest size, scale-to-zero. Or run UI locally (`streamlit run`) and skip App Runner entirely. |
| Step Functions | state transitions | Standard workflow, daily schedule. ~$0.025 per workflow execution. |
| CloudWatch Logs | ingestion + storage | Log retention 14 days. No fancy metric filters in dev. |
| KMS | requests | One CMK for everything. Rotate annually. |
| VPC | NAT Gateway-hours | **Do not provision NAT.** Use VPC endpoints for S3, Glue, Bedrock, Secrets Manager. Saves ~$30/mo. |
| Data transfer | inter-AZ + internet egress | Keep all services in `us-east-1`, single AZ where possible for non-prod. |

## Tear-down checklist (between sessions)

```bash
# Stop RDS ERP
aws rds stop-db-instance --db-instance-identifier acme-erp-dev

# Pause Redshift Serverless (auto-pauses, but explicit is fine)
# nothing to do — auto-pause handles it

# Stop SageMaker notebook
aws sagemaker stop-notebook-instance --notebook-instance-name acme-finance-dev

# Stop DMS task (only after full load complete)
aws dms stop-replication-task --replication-task-arn ...
```

## Tear-down checklist (end of project / extended hiatus)

```bash
cd infra/envs/dev
terraform destroy   # nukes everything tagged project=acme-finance
```

The synthetic data generators are deterministic (`ACME_SEED` env var), so a destroyed environment can be rebuilt to the exact same state in ~30 minutes.

## Red flags to investigate

- Daily cost > $5 sustained → check Cost Explorer for unexpected service.
- NAT Gateway showing in bill → you provisioned a VPC NAT by accident; remove it.
- DMS replication instance running 24/7 → stop the task and the instance.
- OpenSearch Serverless > $30/mo → KB collection is over-provisioned.
