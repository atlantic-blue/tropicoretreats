# Main website CloudFront resources - only created in production
resource "aws_cloudfront_origin_access_identity" "www" {
  count   = var.is_staging ? 0 : 1
  comment = "access_identity_${local.bucket_name}.s3.amazonaws.com"
}

# Invalidate CloudFront cache after deployment (production only)
resource "null_resource" "cloudfront_invalidation" {
  count = var.invalidate_cache && !var.is_staging ? 1 : 0

  triggers = {
    distribution_id = aws_cloudfront_distribution.www[0].id
    always_run      = timestamp()
  }

  provisioner "local-exec" {
    command = <<-EOT
      echo "Waiting for distribution to be ready..."
      sleep 10
      aws cloudfront create-invalidation \
        --profile ${var.aws_account} \
        --distribution-id ${aws_cloudfront_distribution.www[0].id} \
        --paths "/*"
    EOT
  }

  depends_on = [aws_cloudfront_distribution.www]
}

resource "aws_cloudfront_cache_policy" "long_term_cache" {
  name        = var.is_staging ? "staging-long-term-cache-policy" : "long-term-cache-policy"
  comment     = "1-year browser cache policy for static assets"
  default_ttl = 31536000 # 1 year
  max_ttl     = 31536000 # 1 year
  min_ttl     = 31536000 # 1 year

  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config {
      cookie_behavior = "none"
    }
    headers_config {
      header_behavior = "none"
    }
    query_strings_config {
      query_string_behavior = "none"
    }
  }
}

resource "aws_cloudfront_cache_policy" "short_term_cache" {
  name        = var.is_staging ? "staging-short-term-cache-policy" : "short-term-cache-policy"
  comment     = "1-hour cache policy for HTML"
  default_ttl = 3600  # 1 hour
  max_ttl     = 86400 # 1 day
  min_ttl     = 0

  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config {
      cookie_behavior = "none"
    }
    headers_config {
      header_behavior = "none"
    }
    query_strings_config {
      query_string_behavior = "none"
    }
  }
}

resource "aws_cloudfront_response_headers_policy" "cache_headers" {
  name    = var.is_staging ? "staging-cache-control-headers-policy" : "cache-control-headers-policy"
  comment = "Add Cache-Control headers for browser caching"

  custom_headers_config {
    items {
      header   = "Cache-Control"
      value    = "public, max-age=31536000, immutable"
      override = false
    }
  }

  security_headers_config {
    content_type_options {
      override = true
    }
    frame_options {
      frame_option = "DENY"
      override     = true
    }
    referrer_policy {
      referrer_policy = "strict-origin-when-cross-origin"
      override        = true
    }
    xss_protection {
      mode_block = true
      protection = true
      override   = true
    }
    strict_transport_security {
      access_control_max_age_sec = 31536000
      include_subdomains         = true
      preload                    = true
      override                   = true
    }
  }
}


# Main website CloudFront distribution - only created in production
resource "aws_cloudfront_distribution" "www" {
  count = var.is_staging ? 0 : 1

  origin {
    domain_name = aws_s3_bucket.www[0].bucket_regional_domain_name
    origin_id   = "s3-${local.bucket_name}"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.www[0].cloudfront_access_identity_path
    }
  }

  enabled             = true
  is_ipv6_enabled     = true
  comment             = "CDN for ${local.domain_name}"
  default_root_object = "index.html"

  # Default behavior for HTML files (short cache)
  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "s3-${local.bucket_name}"

    viewer_protocol_policy     = "redirect-to-https"
    compress                   = true
    cache_policy_id            = aws_cloudfront_cache_policy.short_term_cache.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.cache_headers.id
  }

  # Static assets - JS files (long cache)
  ordered_cache_behavior {
    path_pattern     = "*.js"
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "s3-${local.bucket_name}"

    viewer_protocol_policy     = "redirect-to-https"
    compress                   = true
    cache_policy_id            = aws_cloudfront_cache_policy.long_term_cache.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.cache_headers.id
  }

  # Static assets - CSS files (long cache)
  ordered_cache_behavior {
    path_pattern     = "*.css"
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "s3-${local.bucket_name}"

    viewer_protocol_policy     = "redirect-to-https"
    compress                   = true
    cache_policy_id            = aws_cloudfront_cache_policy.long_term_cache.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.cache_headers.id
  }

  # Static assets - Images (long cache)
  ordered_cache_behavior {
    path_pattern     = "*.webp"
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "s3-${local.bucket_name}"

    viewer_protocol_policy     = "redirect-to-https"
    compress                   = true
    cache_policy_id            = aws_cloudfront_cache_policy.long_term_cache.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.cache_headers.id
  }

  ordered_cache_behavior {
    path_pattern     = "*.jpg"
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "s3-${local.bucket_name}"

    viewer_protocol_policy     = "redirect-to-https"
    compress                   = true
    cache_policy_id            = aws_cloudfront_cache_policy.long_term_cache.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.cache_headers.id
  }

  ordered_cache_behavior {
    path_pattern     = "*.png"
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "s3-${local.bucket_name}"

    viewer_protocol_policy     = "redirect-to-https"
    compress                   = true
    cache_policy_id            = aws_cloudfront_cache_policy.long_term_cache.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.cache_headers.id
  }

  # Static assets - Fonts (long cache)
  ordered_cache_behavior {
    path_pattern     = "*.woff2"
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "s3-${local.bucket_name}"

    viewer_protocol_policy     = "redirect-to-https"
    compress                   = true
    cache_policy_id            = aws_cloudfront_cache_policy.long_term_cache.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.cache_headers.id
  }

  custom_error_response {
    error_caching_min_ttl = 300
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
  }

  custom_error_response {
    error_caching_min_ttl = 300
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
  }

  tags = merge(
    local.tags,
    {
      managedBy = "Terraform",
    }
  )

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  aliases = [
    local.domain_name,
  ]

  viewer_certificate {
    # cloudfront_default_certificate = true
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.1_2016"
    acm_certificate_arn      = aws_acm_certificate.www_certificate.arn
  }
}
