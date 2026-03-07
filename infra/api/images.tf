# Image Pipeline Infrastructure
# S3 bucket for blog image uploads/processing, Image Processor Lambda,
# S3 event notification to trigger processing on upload

# ====================================================================
# S3 Bucket — Blog Images
# Presigned uploads land in uploads/, processor writes to processed/
# ====================================================================

resource "aws_s3_bucket" "blog_images" {
  bucket = "tropico-blog-images-${var.environment}"
  tags   = local.tags
}

resource "aws_s3_bucket_public_access_block" "blog_images" {
  bucket = aws_s3_bucket.blog_images.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_cors_configuration" "blog_images" {
  bucket = aws_s3_bucket.blog_images.id

  cors_rule {
    allowed_headers = ["Content-Type"]
    allowed_methods = ["PUT"]
    allowed_origins = local.cors_origins
    max_age_seconds = 3600
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "blog_images" {
  bucket = aws_s3_bucket.blog_images.id

  rule {
    id     = "expire-uploads"
    status = "Enabled"

    filter {
      prefix = "uploads/"
    }

    expiration {
      days = 7
    }
  }
}

# ====================================================================
# Image Processor Lambda
# Triggered by S3 PutObject on uploads/ prefix
# Reads uploaded image, validates, resizes, converts to WebP
# ====================================================================

data "archive_file" "image_processor" {
  type        = "zip"
  source_file = "${path.module}/../../backend/dist/imageProcessor.mjs"
  output_path = "${path.module}/../../backend/dist/imageProcessor.zip"
}

resource "aws_cloudwatch_log_group" "image_processor" {
  name              = "/aws/lambda/tropico-image-processor-${var.environment}"
  retention_in_days = 14
  tags              = local.tags
}

resource "aws_iam_role" "image_processor_lambda" {
  name = "tropico-image-processor-lambda-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = local.tags
}

resource "aws_iam_role_policy" "image_processor_logs" {
  name = "cloudwatch-logs"
  role = aws_iam_role.image_processor_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/tropico-image-processor-${var.environment}:*"
      }
    ]
  })
}

resource "aws_iam_role_policy" "image_processor_s3" {
  name = "s3-image-access"
  role = aws_iam_role.image_processor_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = ["s3:GetObject", "s3:DeleteObject"]
        Resource = "${aws_s3_bucket.blog_images.arn}/uploads/*"
      },
      {
        Effect = "Allow"
        Action = ["s3:PutObject"]
        Resource = "${aws_s3_bucket.blog_images.arn}/processed/*"
      }
    ]
  })
}

resource "aws_lambda_function" "image_processor" {
  filename         = data.archive_file.image_processor.output_path
  function_name    = "tropico-image-processor-${var.environment}"
  role             = aws_iam_role.image_processor_lambda.arn
  handler          = "imageProcessor.handler"
  source_code_hash = data.archive_file.image_processor.output_base64sha256
  runtime          = "nodejs22.x"
  architectures    = ["arm64"]
  memory_size      = 512
  timeout          = 60

  layers = var.sharp_layer_arn != "" ? [var.sharp_layer_arn] : []

  environment {
    variables = {
      ENVIRONMENT = var.environment
    }
  }

  depends_on = [aws_cloudwatch_log_group.image_processor]
  tags       = local.tags
}

# S3 event notification: trigger image processor on uploads/ PutObject
resource "aws_lambda_permission" "image_processor_s3" {
  statement_id  = "AllowS3Invoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.image_processor.function_name
  principal     = "s3.amazonaws.com"
  source_arn    = aws_s3_bucket.blog_images.arn
}

resource "aws_s3_bucket_notification" "blog_images" {
  bucket = aws_s3_bucket.blog_images.id

  lambda_function {
    lambda_function_arn = aws_lambda_function.image_processor.arn
    events              = ["s3:ObjectCreated:*"]
    filter_prefix       = "uploads/"
  }

  depends_on = [aws_lambda_permission.image_processor_s3]
}

# ====================================================================
# Blog Admin Lambda — S3 presign permissions
# The blog admin Lambda generates presigned PUT URLs for uploads/
# ====================================================================

resource "aws_iam_role_policy" "lambda_s3_presign" {
  name = "s3-image-presign"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = ["s3:PutObject"]
        Resource = "${aws_s3_bucket.blog_images.arn}/uploads/*"
      }
    ]
  })
}
