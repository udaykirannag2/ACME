# Phase 6 — Bedrock Agent + Knowledge Base + OpenSearch Serverless vector store.
# Stub.

variable "env" {
  type = string
}

variable "kb_bucket_arn" {
  type = string
}

# TODO Phase 6:
# - aws_opensearchserverless_collection (vector, smallest size)
# - aws_bedrockagent_knowledge_base with Titan Embeddings v2
# - aws_bedrockagent_data_source pointing at S3 KB bucket
# - aws_bedrockagent_agent with Sonnet 4.6 base model
# - aws_bedrockagent_agent_action_group entries for text_to_sql, variance_rca, forecast, whatif_sim
# - aws_bedrock_guardrail for PII + topic policy
