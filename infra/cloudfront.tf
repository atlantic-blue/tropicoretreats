resource "aws_cloudfront_origin_access_identity" "www" {
  comment = "access_identity_${local.bucket_name}.s3.amazonaws.com"
}

resource "aws_cloudfront_cache_policy" "long_term_cache" {
  name        = "long-term-cache-policy"
  comment     = "1-year browser cache policy"
  default_ttl = 0   # 1 year
  max_ttl     = 0
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


resource "aws_cloudfront_distribution" "www" {
  origin {
    domain_name = aws_s3_bucket.www.bucket_regional_domain_name
    origin_id   = "s3-${local.bucket_name}"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.www.cloudfront_access_identity_path
    }
  }

  enabled             = true
  is_ipv6_enabled     = true
  comment             = "CDN for ${local.domain_name}"
  default_root_object = "index.html"

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "s3-${local.bucket_name}"

    viewer_protocol_policy = "redirect-to-https"
    compress    = true

    cache_policy_id = aws_cloudfront_cache_policy.long_term_cache.id
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
