# CloudFront distribution for blog images (processed WebP files)
# Serves from S3 via OAC — all processed images are immutable (long cache)

resource "aws_cloudfront_origin_access_control" "blog_images" {
  name                              = var.is_staging ? "staging-blog-images-oac" : "blog-images-oac"
  description                       = "OAC for ${local.images_domain}"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "blog_images" {
  origin {
    domain_name              = module.api.blog_images_bucket_regional_domain
    origin_access_control_id = aws_cloudfront_origin_access_control.blog_images.id
    origin_id                = "blog-images-s3"
  }

  enabled         = true
  is_ipv6_enabled = true
  comment         = "CDN for ${local.images_domain}"

  aliases = [local.images_domain]

  # All processed images are immutable WebP — use long cache
  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "blog-images-s3"

    viewer_protocol_policy     = "redirect-to-https"
    compress                   = true
    cache_policy_id            = aws_cloudfront_cache_policy.long_term_cache.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.cache_headers.id
  }

  price_class = "PriceClass_100"

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.www_cert_validate.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  tags = merge(local.tags, { managedBy = "Terraform" })
}

# S3 bucket policy: allow CloudFront OAC to read processed images
resource "aws_s3_bucket_policy" "blog_images_cloudfront" {
  bucket = module.api.blog_images_bucket_id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontServicePrincipal"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${module.api.blog_images_bucket_arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.blog_images.arn
          }
        }
      }
    ]
  })
}
