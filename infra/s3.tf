# Main website S3 resources - only created in production
# Staging uses only admin bucket, not the main website bucket

data "aws_iam_policy_document" "www" {
  count = var.is_staging ? 0 : 1

  statement {
    actions = [
      "s3:GetObject"
    ]
    resources = [
      "${aws_s3_bucket.www[0].arn}/*"
    ]
    principals {
      type = "AWS"
      identifiers = [
        "${aws_cloudfront_origin_access_identity.www[0].iam_arn}"
      ]
    }
  }
}

resource "aws_s3_bucket_policy" "www" {
  count  = var.is_staging ? 0 : 1
  bucket = aws_s3_bucket.www[0].id
  policy = data.aws_iam_policy_document.www[0].json
}

resource "aws_s3_bucket_ownership_controls" "www" {
  count  = var.is_staging ? 0 : 1
  bucket = aws_s3_bucket.www[0].id
  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_public_access_block" "www" {
  count                   = var.is_staging ? 0 : 1
  bucket                  = aws_s3_bucket.www[0].id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket" "www" {
  count  = var.is_staging ? 0 : 1
  bucket = local.bucket_name

  tags = merge(
    local.tags,
    {
      managedBy = "Terraform",
    }
  )
}
