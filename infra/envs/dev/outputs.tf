output "s3_lake_buckets" {
  description = "S3 lake bucket names (raw, curated, kb)."
  value       = module.s3_lake.bucket_names
}

output "vpc_id" {
  value = module.network.vpc_id
}

output "private_subnet_ids" {
  value = module.network.private_subnet_ids
}
