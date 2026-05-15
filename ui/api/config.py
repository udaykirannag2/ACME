import os

AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
AWS_PROFILE = None if os.getenv("AWS_LAMBDA_FUNCTION_NAME") else os.getenv("AWS_PROFILE", "acme-admin")

BEDROCK_AGENT_ID = os.getenv("BEDROCK_AGENT_ID", "LUUHZWRDA4")
BEDROCK_AGENT_ALIAS_ID = os.getenv("BEDROCK_AGENT_ALIAS_ID", "TSTALIASID")

REDSHIFT_WORKGROUP = os.getenv("REDSHIFT_WORKGROUP", "acme-finance-dev")
REDSHIFT_DATABASE = os.getenv("REDSHIFT_DATABASE", "dev")
MARTS_SCHEMA = "analytics_dev_marts"

# AgentCore Memory — provides cross-session SEMANTIC recall
AGENTCORE_MEMORY_ID = os.getenv(
    "AGENTCORE_MEMORY_ID",
    "acme_finance_dev_memory-F0GIOl5mcE",
)
AGENTCORE_MEMORY_ARN = os.getenv(
    "AGENTCORE_MEMORY_ARN",
    "arn:aws:bedrock-agentcore:us-east-1:010928194453:memory/acme_finance_dev_memory-F0GIOl5mcE",
)
# Semantic strategy ID — required for write and retrieve operations
AGENTCORE_STRATEGY_ID = os.getenv(
    "AGENTCORE_STRATEGY_ID",
    "financeSemanticMemory-jg6xTm9BFx",
)
# Max memories to inject as context per request
AGENTCORE_MEMORY_TOP_K = int(os.getenv("AGENTCORE_MEMORY_TOP_K", "5"))

COGNITO_USER_POOL_ID = os.getenv("COGNITO_USER_POOL_ID", "")
COGNITO_CLIENT_ID    = os.getenv("COGNITO_CLIENT_ID", "")
