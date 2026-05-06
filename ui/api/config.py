import os

AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
AWS_PROFILE = os.getenv("AWS_PROFILE", "acme-admin")

BEDROCK_AGENT_ID = os.getenv("BEDROCK_AGENT_ID", "LUUHZWRDA4")
BEDROCK_AGENT_ALIAS_ID = os.getenv("BEDROCK_AGENT_ALIAS_ID", "TSTALIASID")

REDSHIFT_WORKGROUP = os.getenv("REDSHIFT_WORKGROUP", "acme-finance-dev")
REDSHIFT_DATABASE = os.getenv("REDSHIFT_DATABASE", "dev")
MARTS_SCHEMA = "analytics_dev_marts"
