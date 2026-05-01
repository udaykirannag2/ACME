# ADR 0002 — AWS region, VPC, and networking

**Status**: Accepted
**Date**: 2026-05-01

## Context

We need to pick an AWS region and a VPC layout that satisfies (a) Bedrock model availability for Claude Sonnet/Haiku, (b) lowest cost, and (c) compatibility with all services we plan to use (RDS, Redshift Serverless, Glue, DMS, OpenSearch Serverless, App Runner).

## Decisions

### Region: `us-east-1`
- Largest service availability — every AWS service we plan to use is GA here.
- Bedrock has the broadest model catalog including Anthropic Claude Sonnet/Haiku.
- Lowest pricing for most services (slightly cheaper than `us-west-2`).
- Latency is fine for our workload (analyst queries are not real-time).

### VPC layout
- Single VPC, single AZ for non-HA resources (RDS dev instance), 2 AZs for resources that require multi-AZ subnet groups (Redshift, RDS).
- CIDR `10.42.0.0/16`.
- 1 public `/24` subnet (for App Runner egress in Phase 10).
- 2 private `/24` subnets (RDS, Redshift, Lambda action groups).

### No NAT Gateway
- NAT Gateway is ~$32/mo per AZ — incompatible with our $50 budget.
- Replace with **VPC Interface Endpoints** for services Lambda needs:
  - S3 (gateway endpoint, free)
  - Glue, Redshift Data API, Bedrock, Secrets Manager, KMS — interface endpoints (~$7/mo each, ~$28/mo total)
- We add interface endpoints lazily — only as each phase needs them.

### Single AWS account, single environment (`dev`)
- No prod environment for now.
- Module structure supports adding `prod` later by stamping out a new `infra/envs/prod/` directory.

## Consequences

- Cost ceiling stays achievable.
- We must be careful with VPC endpoints — each one adds ~$7/mo, so we add them only when needed and review monthly.
- Single-AZ for RDS means data is lost if the AZ goes down — acceptable for synthetic data we can regenerate.
