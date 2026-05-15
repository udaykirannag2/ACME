output "ecr_repository_url"         { value = aws_ecr_repository.api.repository_url }
output "lambda_function_name"       { value = aws_lambda_function.api.function_name }
output "lambda_function_url"        { value = aws_lambda_function_url.api.function_url }
output "frontend_bucket_name"       { value = aws_s3_bucket.frontend.bucket }
output "cloudfront_distribution_id" { value = aws_cloudfront_distribution.frontend.id }
output "cloudfront_domain_name"     { value = aws_cloudfront_distribution.frontend.domain_name }
