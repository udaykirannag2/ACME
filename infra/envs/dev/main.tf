terraform {
  required_version = ">= 1.9.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.70"
    }
  }

  backend "s3" {
    bucket       = "acme-finance-tfstate-010928194453"
    key          = "envs/dev/terraform.tfstate"
    region       = "us-east-1"
    use_lockfile = true # Terraform 1.10+ native S3 locking (replaces DynamoDB)
    encrypt      = true
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      project = "acme-finance"
      env     = var.env
      owner   = var.owner
      managed = "terraform"
    }
  }
}

# =============================================================================
# Modules — each phase enables the modules it needs.
# Phase 0: just network + s3-lake + iam-roles.
# Phase 4 enables: redshift-serverless, glue, rds-erp.
# Phase 6 enables: bedrock.
# =============================================================================

module "network" {
  source   = "../../modules/network"
  env      = var.env
  vpc_cidr = "10.42.0.0/16"
}

module "s3_lake" {
  source = "../../modules/s3-lake"
  env    = var.env
}

module "iam_roles" {
  source         = "../../modules/iam-roles"
  env            = var.env
  s3_lake_arns   = module.s3_lake.bucket_arns
}

# Enable in Phase 4
# module "redshift_serverless" {
#   source       = "../../modules/redshift-serverless"
#   env          = var.env
#   subnet_ids   = module.network.private_subnet_ids
#   security_group_ids = [module.network.redshift_sg_id]
#   admin_username     = "acme_admin"
#   base_capacity_rpu  = 8
#   max_capacity_rpu   = 32
# }

# module "glue" {
#   source = "../../modules/glue"
#   env    = var.env
#   s3_lake_arns = module.s3_lake.bucket_arns
# }

# Phase 3 — RDS Postgres ERP simulator
module "rds_erp" {
  source             = "../../modules/rds-erp"
  env                = var.env
  # Public subnets so the operator's IP allowlist works. RDS picks one of these
  # for the actual instance based on AZ availability.
  subnet_ids         = module.network.public_subnet_ids
  security_group_ids = [module.network.rds_sg_id]
  kms_key_arn        = module.s3_lake.kms_key_arn
  my_ip_cidr         = var.my_ip_cidr
}

# Enable in Phase 6
# module "bedrock" {
#   source       = "../../modules/bedrock"
#   env          = var.env
#   kb_bucket_arn = module.s3_lake.kb_bucket_arn
# }
