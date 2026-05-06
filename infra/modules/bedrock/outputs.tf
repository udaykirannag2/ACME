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
