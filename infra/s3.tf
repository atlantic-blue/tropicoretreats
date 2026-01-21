data "aws_iam_policy_document" "www" {
  statement {
    actions = [
      "s3:GetObject"
    ]
    resources = [
      "${aws_s3_bucket.www.arn}/*"
    ]
    principals {
      type = "AWS"
      identifiers = [
        "${aws_cloudfront_origin_access_identity.www.iam_arn}"
      ]
    }
  }
}

resource "aws_s3_bucket_policy" "www" {
  bucket = aws_s3_bucket.www.id
  policy = data.aws_iam_policy_document.www.json
}

resource "aws_s3_bucket_ownership_controls" "www" {
  bucket = aws_s3_bucket.www.id
  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_public_access_block" "www" {
  bucket                  = aws_s3_bucket.www.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket" "www" {
  bucket = local.bucket_name

  tags = merge(
    local.tags,
    {
        managedBy = "Terraform",
    }
  )
}
