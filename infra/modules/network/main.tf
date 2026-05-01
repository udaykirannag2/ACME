# Minimal VPC: 1 public subnet (for App Runner egress later), 2 private subnets (RDS, Redshift).
# Cost-conscious: NO NAT Gateway. We use VPC interface endpoints for AWS services that need egress.

data "aws_availability_zones" "available" {
  state = "available"
}

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "acme-finance-${var.env}-vpc"
  }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "acme-finance-${var.env}-igw"
  }
}

# --- Public subnet (1 AZ — single-AZ for cost) -------------------------------

resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(var.vpc_cidr, 8, 0) # /24
  availability_zone       = data.aws_availability_zones.available.names[0]
  map_public_ip_on_launch = true

  tags = {
    Name = "acme-finance-${var.env}-public-a"
  }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "acme-finance-${var.env}-public-rt"
  }
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

# --- Private subnets (2 AZs for RDS subnet group requirement) ----------------

resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + 10)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "acme-finance-${var.env}-private-${data.aws_availability_zones.available.names[count.index]}"
  }
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "acme-finance-${var.env}-private-rt"
  }
}

resource "aws_route_table_association" "private" {
  count          = 2
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private.id
}

# --- VPC Endpoints (S3 gateway = free; rest are interface endpoints, ~$7/mo each) -----
# Defer interface endpoints until Phase 4 when Lambda/Glue need them.

resource "aws_vpc_endpoint" "s3" {
  vpc_id            = aws_vpc.main.id
  service_name      = "com.amazonaws.${data.aws_region.current.name}.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = [aws_route_table.private.id]

  tags = {
    Name = "acme-finance-${var.env}-s3-endpoint"
  }
}

data "aws_region" "current" {}

# --- Security groups (created here, used by RDS/Redshift modules) -----------

resource "aws_security_group" "rds" {
  name        = "acme-finance-${var.env}-rds-sg"
  description = "Postgres ERP - internal only"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "redshift" {
  name        = "acme-finance-${var.env}-redshift-sg"
  description = "Redshift Serverless - internal only"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 5439
    to_port     = 5439
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
