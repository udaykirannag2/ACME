# ── CloudFront Distribution ───────────────────────────────────────────────────
# Two origins behind one CloudFront distribution:
#   1. S3 bucket    → React SPA static files (default behavior)
#   2. Lambda URL   → FastAPI backend (path /api/*)
# Same-origin model means no CORS concerns and no public Lambda URL.

# OAC for the Lambda Function URL — signs requests with sigv4
resource "aws_cloudfront_origin_access_control" "lambda" {
  name                              = "acme-finance-${var.env}-lambda-oac"
  origin_access_control_origin_type = "lambda"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# CloudFront Function — strips the `/api` prefix before sending to Lambda origin.
# Runs at viewer-request stage, only on the /api/* behavior.
resource "aws_cloudfront_function" "strip_api_prefix" {
  name    = "acme-finance-${var.env}-strip-api"
  runtime = "cloudfront-js-2.0"
  comment = "Strip /api prefix when forwarding to Lambda origin"
  publish = true
  code    = <<-EOT
    function handler(event) {
      var request = event.request;
      // /api/foo → /foo,  /api → /
      if (request.uri === '/api') {
        request.uri = '/';
      } else if (request.uri.indexOf('/api/') === 0) {
        request.uri = request.uri.substring(4);
      }
      return request;
    }
  EOT
}

# Strip the Function URL down to its hostname (no scheme, no trailing slash)
locals {
  lambda_url_host = replace(
    replace(aws_lambda_function_url.api.function_url, "https://", ""),
    "/",
    "",
  )
}

resource "aws_cloudfront_distribution" "frontend" {
  enabled             = true
  default_root_object = "index.html"
  price_class         = "PriceClass_100"
  comment             = "acme-finance-${var.env} React SPA + API"

  # Origin 1: S3 bucket (React static files)
  origin {
    domain_name              = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_id                = "s3-frontend"
    origin_access_control_id = aws_cloudfront_origin_access_control.frontend.id
  }

  # Origin 2: Lambda Function URL (FastAPI) — public, NONE auth, no OAC needed
  origin {
    domain_name = local.lambda_url_host
    origin_id   = "lambda-api"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
      origin_read_timeout    = 60
      origin_keepalive_timeout = 60
    }
  }

  # Default behavior — S3 origin, long-lived cache for Vite-hashed assets
  default_cache_behavior {
    target_origin_id       = "s3-frontend"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    forwarded_values {
      query_string = false
      cookies { forward = "none" }
    }

    min_ttl     = 0
    default_ttl = 86400
    max_ttl     = 31536000
  }

  # /api/* → Lambda Function URL, no caching, strip /api prefix before forwarding.
  # Uses managed policies (NOT forwarded_values) because OAC sigv4 signing
  # requires CloudFront to manage the Authorization header itself.
  ordered_cache_behavior {
    path_pattern           = "/api/*"
    target_origin_id       = "lambda-api"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    # Managed-CachingDisabled — never cache API responses
    cache_policy_id = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad"
    # Managed-AllViewerExceptHostHeader — forward query/headers/cookies but
    # let CloudFront set the Host header to Lambda URL hostname (required by FURL).
    origin_request_policy_id = "b689b0a8-53d0-40ab-baf2-68738e2966ac"

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.strip_api_prefix.arn
    }
  }

  # index.html — never cache so deploys are instant
  ordered_cache_behavior {
    path_pattern           = "/index.html"
    target_origin_id       = "s3-frontend"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    forwarded_values {
      query_string = false
      cookies { forward = "none" }
    }

    min_ttl     = 0
    default_ttl = 0
    max_ttl     = 0
  }

  # SPA routing — return index.html on 403/404 (React Router handles navigation)
  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }

  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }

  restrictions {
    geo_restriction { restriction_type = "none" }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = { Component = "frontend" }
}
