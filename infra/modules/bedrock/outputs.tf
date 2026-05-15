output "agent_id" {
  value       = aws_bedrockagent_agent.finance.agent_id
  description = "Bedrock Agent ID"
}

output "agent_arn" {
  value       = aws_bedrockagent_agent.finance.agent_arn
  description = "Bedrock Agent ARN"
}

output "agent_alias_id" {
  value       = aws_bedrockagent_agent_alias.live.agent_alias_id
  description = "Bedrock Agent alias ID (use this in API calls)"
}

output "text_to_sql_lambda_arn" {
  value       = aws_lambda_function.text_to_sql.arn
  description = "ARN of the text_to_sql Lambda"
}

output "gateway_id" {
  value       = local.agentcore_gateway_id
  description = "AgentCore Gateway ID"
}

output "gateway_arn" {
  value       = local.agentcore_gateway_arn
  description = "AgentCore Gateway ARN — pass to Agent role policy and Streamlit config"
}

output "memory_arn" {
  value       = local.agentcore_memory_arn
  description = "AgentCore Memory ARN — used as memoryId prefix in FastAPI /chat calls"
}
