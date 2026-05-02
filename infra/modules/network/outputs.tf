output "vpc_id" {
  value = aws_vpc.main.id
}

output "public_subnet_id" {
  value = aws_subnet.public.id
}

output "public_subnet_ids" {
  description = "Both public subnets (used by RDS subnet group which requires 2+ AZs)."
  value       = [aws_subnet.public.id, aws_subnet.public_b.id]
}

output "private_subnet_ids" {
  value = aws_subnet.private[*].id
}

output "rds_sg_id" {
  value = aws_security_group.rds.id
}

output "redshift_sg_id" {
  value = aws_security_group.redshift.id
}
