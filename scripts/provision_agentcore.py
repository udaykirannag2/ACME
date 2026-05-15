#!/usr/bin/env python3
"""
Provision AgentCore Memory and Gateway for ACME Finance Phase 8.
Run once after Terraform applies the Lambda + Bedrock Agent resources.

Usage:
    python scripts/provision_agentcore.py [--env dev] [--destroy]

API shape notes (verified against botocore service model):
  CreateMemory  → r['memory']['arn'], r['memory']['id'], r['memory']['name']
  ListMemories  → r['memories'] → items: {arn, id, status}  (NO 'name' field)
  CreateGateway → flat: r['gatewayId'], r['gatewayUrl'], r['status']
  ListGateways  → r['items'] → items: {gatewayId, name, status}
  CreateGatewayTarget → flat: r['targetId'], r['name']
  ListGatewayTargets  → r['items'] → items: {targetId, name, status}
"""
import argparse
import json
import sys
import time
import boto3

AWS_PROFILE = "acme-admin"
AWS_REGION = "us-east-1"
ENV = "dev"

# Lambda ARNs (from Terraform outputs)
ACCOUNT_ID = "010928194453"


def lambda_arn(name: str) -> str:
    return f"arn:aws:lambda:{AWS_REGION}:{ACCOUNT_ID}:function:acme-finance-{ENV}-{name}"


# Target names must match ([0-9a-zA-Z][-]?){1,100} — no underscores
LAMBDAS = {
    "text-to-sql":     lambda_arn("text-to-sql"),
    "forecast":        lambda_arn("forecast"),
    "variance-rca":    lambda_arn("variance-rca"),
    "describe-metric": lambda_arn("describe-metric"),
    "whatif-sim":      lambda_arn("whatif-sim"),
}

# MCP tool schemas for each Lambda target (inlinePayload format)
# Each item: {name, description, inputSchema: {type, properties, required}}
TOOL_SCHEMAS: dict[str, list[dict]] = {
    "text-to-sql": [
        {
            "name": "execute_sql",
            "description": "Execute a read-only SQL SELECT statement against the Redshift analytics warehouse",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "sql_query": {
                        "type": "string",
                        "description": "A valid Redshift SQL SELECT statement. Use schema prefix analytics_dev_marts.",
                    }
                },
                "required": ["sql_query"],
            },
        },
        {
            "name": "describe_schema",
            "description": "Return the full schema of all available tables — column names, types, and descriptions.",
            "inputSchema": {"type": "object", "properties": {}},
        },
    ],
    "forecast": [
        {
            "name": "forecast_revenue",
            "description": "Project revenue for the next N months using historical trend and seasonality",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "entity_id": {"type": "string", "description": "Optional: US, EMEA, or APAC"},
                    "periods_ahead": {"type": "integer", "description": "Months to forecast (default 4)"},
                },
            },
        },
        {
            "name": "forecast_expense",
            "description": "Project expenses for the next N months using historical trend and seasonality",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "entity_id": {"type": "string", "description": "Optional: US, EMEA, or APAC"},
                    "periods_ahead": {"type": "integer", "description": "Months to forecast (default 4)"},
                },
            },
        },
    ],
    "variance-rca": [
        {
            "name": "variance_rca",
            "description": "Return top N accounts driving actuals vs budget variance, sorted by absolute variance",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "fiscal_year": {"type": "integer", "description": "Fiscal year (e.g. 2024)"},
                    "fiscal_quarter": {"type": "integer", "description": "Optional fiscal quarter 1-4"},
                    "entity_id": {"type": "string", "description": "Optional: US, EMEA, or APAC"},
                    "top_n": {"type": "integer", "description": "Number of drivers to return (default 10)"},
                },
                "required": ["fiscal_year"],
            },
        },
    ],
    "describe-metric": [
        {
            "name": "describe_metric",
            "description": "Return definition, formula, and context for a named finance KPI",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "metric_name": {"type": "string", "description": "Metric name or alias (e.g. 'NRR', 'DSO')"},
                },
                "required": ["metric_name"],
            },
        },
        {
            "name": "list_metrics",
            "description": "Return all metrics available in the glossary with short descriptions",
            "inputSchema": {"type": "object", "properties": {}},
        },
    ],
    "whatif-sim": [
        {
            "name": "whatif_sim",
            "description": "Apply a % change to a P&L line and return the downstream impact on margins",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "line_item": {"type": "string", "description": "P&L line: revenue, cogs, sales_marketing, research_dev, general_admin, opex"},
                    "pct_change": {"type": "number", "description": "Percentage change (-15 = 15% cut, 10 = 10% increase)"},
                    "fiscal_year": {"type": "integer", "description": "Baseline fiscal year (default 2024)"},
                    "entity_id": {"type": "string", "description": "Optional: US, EMEA, or APAC"},
                },
                "required": ["line_item", "pct_change"],
            },
        },
    ],
}


def get_clients(profile: str, region: str):
    session = boto3.Session(profile_name=profile, region_name=region)
    return {
        "ctrl": session.client("bedrock-agentcore-control"),
        "iam":  session.client("iam"),
        "sts":  session.client("sts"),
    }


def get_or_create_gateway_role(iam, account_id: str, env: str) -> str:
    role_name = f"acme-finance-{env}-agentcore-gateway"
    try:
        r = iam.get_role(RoleName=role_name)
        arn = r["Role"]["Arn"]
        print(f"  Gateway IAM role exists: {arn}")
        return arn
    except iam.exceptions.NoSuchEntityException:
        pass

    trust = {
        "Version": "2012-10-17",
        "Statement": [{
            "Effect": "Allow",
            "Principal": {"Service": "bedrock-agentcore.amazonaws.com"},
            "Action": "sts:AssumeRole",
            "Condition": {
                "StringEquals": {"aws:SourceAccount": account_id}
            },
        }],
    }
    r = iam.create_role(
        RoleName=role_name,
        AssumeRolePolicyDocument=json.dumps(trust),
        Description="AgentCore Gateway execution role for ACME Finance",
    )
    arn = r["Role"]["Arn"]

    # Inline policy: invoke all tool Lambdas
    lambda_arns = list(LAMBDAS.values())
    iam.put_role_policy(
        RoleName=role_name,
        PolicyName="invoke-tool-lambdas",
        PolicyDocument=json.dumps({
            "Version": "2012-10-17",
            "Statement": [{
                "Effect": "Allow",
                "Action": ["lambda:InvokeFunction"],
                "Resource": lambda_arns,
            }],
        }),
    )
    print(f"  Created Gateway IAM role: {arn}")
    time.sleep(10)  # IAM propagation
    return arn


def provision_memory(ctrl, env: str) -> str:
    """Create or find AgentCore Memory resource.

    Memory names must match [a-zA-Z][a-zA-Z0-9_]{0,47} — no hyphens.
    ListMemories items have {arn, id, status} — NO 'name' field.
    We identify our memory by checking id.startswith(name).
    """
    # Name without hyphens (API constraint)
    name = f"acme_finance_{env}_memory"

    # Check if it already exists
    try:
        existing = ctrl.list_memories()
        for m in existing.get("memories", []):
            # id format: "<name>-<random_suffix>"
            if m["id"].startswith(name):
                arn = m["arn"]
                print(f"  Memory exists: {arn}")
                return arn
    except Exception as e:
        print(f"  Warning: list_memories failed: {e}")

    print("  Creating AgentCore Memory...")
    r = ctrl.create_memory(
        name=name,
        description="Cross-session persistent memory for ACME Finance AI analyst",
        memoryExecutionRoleArn=f"arn:aws:iam::{ACCOUNT_ID}:role/acme-finance-{env}-agentcore-gateway",
        eventExpiryDuration=90,  # days
    )
    # Response is r['memory'] with fields: arn, id, name, status, ...
    mem = r["memory"]
    arn = mem["arn"]
    print(f"  Created Memory: {arn}  (id={mem['id']}, status={mem['status']})")
    return arn


def provision_gateway(ctrl, gateway_role_arn: str, env: str) -> tuple[str, str]:
    """Create or find AgentCore Gateway, return (gateway_id, gateway_url).

    ListGateways  → r['items'] each has {gatewayId, name, status}
    CreateGateway → flat response: r['gatewayId'], r['gatewayUrl'], r['status']
    """
    name = f"acme-finance-{env}-finance-tools"

    # Check existing gateways
    try:
        existing = ctrl.list_gateways()
        for g in existing.get("items", []):
            if g["name"] == name:
                gid = g["gatewayId"]
                # Fetch full details including URL
                gw = ctrl.get_gateway(gatewayIdentifier=gid)
                # get_gateway may return flat or wrapped — handle both
                if "gateway" in gw:
                    gw = gw["gateway"]
                url = gw.get("gatewayUrl", "")
                print(f"  Gateway exists: {gid} @ {url or 'N/A'}")
                return gid, url
    except Exception as e:
        print(f"  Warning: list_gateways: {e}")

    print("  Creating AgentCore Gateway...")
    r = ctrl.create_gateway(
        name=name,
        description="MCP tool gateway for all ACME Finance agent tools",
        roleArn=gateway_role_arn,
        authorizerType="NONE",
        protocolConfiguration={"mcp": {"supportedVersions": ["2025-03-26"]}},
    )
    # CreateGateway returns flat response
    gateway_id = r["gatewayId"]
    print(f"  Created Gateway: {gateway_id}")

    # Wait for ACTIVE
    status = r.get("status", "CREATING")
    for _ in range(30):
        if status == "ACTIVE":
            break
        time.sleep(3)
        gw = ctrl.get_gateway(gatewayIdentifier=gateway_id)
        if "gateway" in gw:
            gw = gw["gateway"]
        status = gw.get("status", "UNKNOWN")
        url = gw.get("gatewayUrl", "")
        print(f"    Status: {status}")

    return gateway_id, gw.get("gatewayUrl", "")


def provision_targets(ctrl, gateway_id: str) -> dict[str, str]:
    """Register each Lambda as a Gateway target.

    ListGatewayTargets → r['items'] each has {targetId, name, status}
    CreateGatewayTarget → flat: r['targetId'], r['name']
    """
    try:
        existing_list = ctrl.list_gateway_targets(gatewayIdentifier=gateway_id)
        existing_targets = {
            t["name"]: t["targetId"]
            for t in existing_list.get("items", [])
        }
    except Exception as e:
        print(f"  Warning: list_gateway_targets: {e}")
        existing_targets = {}

    target_ids = {}
    for tool_name, arn in LAMBDAS.items():
        if tool_name in existing_targets:
            print(f"  Target exists: {tool_name} → {existing_targets[tool_name]}")
            target_ids[tool_name] = existing_targets[tool_name]
            continue

        print(f"  Registering target: {tool_name} → {arn}")
        try:
            r = ctrl.create_gateway_target(
                gatewayIdentifier=gateway_id,
                name=tool_name,
                description=f"ACME Finance tool: {tool_name}",
                targetConfiguration={
                    "mcp": {
                        "lambda": {
                            "lambdaArn": arn,
                            "toolSchema": {"inlinePayload": TOOL_SCHEMAS[tool_name]},
                        }
                    }
                },
                credentialProviderConfigurations=[{
                    "credentialProviderType": "GATEWAY_IAM_ROLE",
                }],
            )
            # CreateGatewayTarget returns flat response
            tid = r.get("targetId") or r.get("gatewayTarget", {}).get("targetId", "unknown")
            target_ids[tool_name] = tid
            print(f"    Created target: {tid}")
            time.sleep(2)
        except Exception as e:
            print(f"    Warning: {tool_name} target creation: {e}")

    return target_ids


def save_config(memory_arn: str, gateway_id: str, gateway_url: str, env: str):
    """Write provisioned ARNs to a local config file for reference."""
    config = {
        "env": env,
        "agentcore": {
            "memory_arn": memory_arn,
            "gateway_id": gateway_id,
            "gateway_url": gateway_url,
        },
    }
    path = f"infra/envs/{env}/agentcore_outputs.json"
    with open(path, "w") as f:
        json.dump(config, f, indent=2)
    print(f"\n  Config saved to {path}")


def destroy(ctrl, env: str):
    # Gateways use hyphens, memories use underscores
    gw_prefix = f"acme-finance-{env}"
    mem_prefix = f"acme_finance_{env}"
    # Delete targets first
    for gw in ctrl.list_gateways().get("items", []):
        if gw["name"].startswith(gw_prefix):
            gid = gw["gatewayId"]
            for t in ctrl.list_gateway_targets(gatewayIdentifier=gid).get("items", []):
                print(f"  Deleting target {t['name']}...")
                ctrl.delete_gateway_target(gatewayIdentifier=gid, targetIdentifier=t["targetId"])
            print(f"  Deleting gateway {gid}...")
            ctrl.delete_gateway(gatewayIdentifier=gid)
    # Delete memories
    for m in ctrl.list_memories().get("memories", []):
        if m["id"].startswith(mem_prefix):
            print(f"  Deleting memory {m['arn']}...")
            ctrl.delete_memory(memoryIdentifier=m["id"])
    print("Done.")


def main():
    parser = argparse.ArgumentParser(description="Provision AgentCore for ACME Finance")
    parser.add_argument("--env", default=ENV)
    parser.add_argument("--destroy", action="store_true")
    args = parser.parse_args()

    clients = get_clients(AWS_PROFILE, AWS_REGION)
    ctrl = clients["ctrl"]

    if args.destroy:
        print("=== Destroying AgentCore resources ===")
        destroy(ctrl, args.env)
        return

    print(f"=== Provisioning AgentCore for env={args.env} ===\n")

    account_id = clients["sts"].get_caller_identity()["Account"]
    print(f"Account: {account_id}\n")

    print("1. IAM role for Gateway")
    gw_role_arn = get_or_create_gateway_role(clients["iam"], account_id, args.env)

    print("\n2. AgentCore Memory")
    memory_arn = provision_memory(ctrl, args.env)

    print("\n3. AgentCore Gateway")
    gateway_id, gateway_url = provision_gateway(ctrl, gw_role_arn, args.env)

    print("\n4. Gateway Targets (tool Lambdas)")
    target_ids = provision_targets(ctrl, gateway_id)

    save_config(memory_arn, gateway_id, gateway_url, args.env)

    print("\n=== Summary ===")
    print(f"Memory ARN:  {memory_arn}")
    print(f"Gateway ID:  {gateway_id}")
    print(f"Gateway URL: {gateway_url}")
    print(f"Targets:     {json.dumps(target_ids, indent=2)}")
    print("\nNext: update ui/api/main.py with memory_arn, restart servers.")


if __name__ == "__main__":
    main()
