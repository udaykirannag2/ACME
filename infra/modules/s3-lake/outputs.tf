output "bucket_names" {
  value = { for k, b in aws_s3_bucket.lake : k => b.id }
}

output "bucket_arns" {
  value = { for k, b in aws_s3_bucket.lake : k => b.arn }
}

output "kb_bucket_arn" {
  value = aws_s3_bucket.lake["kb"].arn
}

output "kms_key_arn" {
  value = aws_kms_key.lake.arn
}
