# S3 bucket for admin dashboard
resource "aws_s3_bucket" "admin" {
  bucket = local.admin_bucket_name

  tags = merge(
    local.tags,
    {
      managedBy = "Terraform",
    }
  )
}

resource "aws_s3_bucket_ownership_controls" "admin" {
  bucket = aws_s3_bucket.admin.id
  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_public_access_block" "admin" {
  bucket                  = aws_s3_bucket.admin.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# CloudFront Origin Access Control for admin dashboard
resource "aws_cloudfront_origin_access_control" "admin" {
  name                              = "admin-oac"
  description                       = "OAC for admin dashboard"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# S3 bucket policy to allow CloudFront access via OAC
resource "aws_s3_bucket_policy" "admin" {
  bucket = aws_s3_bucket.admin.id

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
        Resource = "${aws_s3_bucket.admin.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.admin.arn
          }
        }
      }
    ]
  })
}
