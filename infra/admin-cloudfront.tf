# CloudFront distribution for admin dashboard
resource "aws_cloudfront_distribution" "admin" {
  origin {
    domain_name              = aws_s3_bucket.admin.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.admin.id
    origin_id                = "admin-s3"
  }

  enabled             = true
  is_ipv6_enabled     = true
  comment             = "CDN for ${local.admin_domain}"
  default_root_object = "index.html"

  aliases = [local.admin_domain]

  # Default cache behavior for HTML files (short cache)
  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "admin-s3"

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
    target_origin_id = "admin-s3"

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
    target_origin_id = "admin-s3"

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
    target_origin_id = "admin-s3"

    viewer_protocol_policy     = "redirect-to-https"
    compress                   = true
    cache_policy_id            = aws_cloudfront_cache_policy.long_term_cache.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.cache_headers.id
  }

  ordered_cache_behavior {
    path_pattern     = "*.jpg"
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "admin-s3"

    viewer_protocol_policy     = "redirect-to-https"
    compress                   = true
    cache_policy_id            = aws_cloudfront_cache_policy.long_term_cache.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.cache_headers.id
  }

  ordered_cache_behavior {
    path_pattern     = "*.png"
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "admin-s3"

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
    target_origin_id = "admin-s3"

    viewer_protocol_policy     = "redirect-to-https"
    compress                   = true
    cache_policy_id            = aws_cloudfront_cache_policy.long_term_cache.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.cache_headers.id
  }

  # SPA routing: return index.html for 403 (S3 access denied = file not found)
  custom_error_response {
    error_caching_min_ttl = 300
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
  }

  # SPA routing: return index.html for 404
  custom_error_response {
    error_caching_min_ttl = 300
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
  }

  price_class = "PriceClass_100"

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  # Reuse existing wildcard certificate (*.tropicoretreat.com)
  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.www_cert_validate.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  tags = merge(
    local.tags,
    {
      managedBy = "Terraform",
    }
  )
}
