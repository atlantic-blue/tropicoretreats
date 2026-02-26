# Email CRM Infrastructure
# S3 bucket for SES email storage, Email Admin + Receive Lambdas,
# SES receipt rules for inbound email routing, DLQ for failed processing

# ====================================================================
# S3 Bucket — Email Storage
# SES deposits raw MIME emails here; attachments are also stored here
# ====================================================================

resource "aws_s3_bucket" "email" {
  bucket = "tropico-email-${var.environment}"
  tags   = local.tags
}

resource "aws_s3_bucket_public_access_block" "email" {
  bucket = aws_s3_bucket.email.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "email" {
  bucket = aws_s3_bucket.email.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "email" {
  bucket = aws_s3_bucket.email.id

  rule {
    id     = "expire-raw-emails"
    status = "Enabled"

    filter {
      prefix = "incoming/"
    }

    expiration {
      days = 90
    }
  }
}

# S3 bucket policy: Allow SES to deliver emails
resource "aws_s3_bucket_policy" "email_ses" {
  bucket = aws_s3_bucket.email.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowSESPuts"
        Effect    = "Allow"
        Principal = { Service = "ses.amazonaws.com" }
        Action    = "s3:PutObject"
        Resource  = "${aws_s3_bucket.email.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceAccount" = data.aws_caller_identity.current.account_id
          }
        }
      }
    ]
  })
}

# ====================================================================
# SQS Dead Letter Queue — Failed Email Processing
# ====================================================================

resource "aws_sqs_queue" "email_dlq" {
  name                      = "tropico-email-dlq-${var.environment}"
  message_retention_seconds = 1209600 # 14 days
  tags                      = local.tags
}

# ====================================================================
# Email Admin Lambda — API Gateway handler
# Routes: POST /emails/send, GET /emails/{leadId}, PATCH /emails/{leadId}/read
# ====================================================================

data "archive_file" "email_admin" {
  type        = "zip"
  source_file = "${path.module}/../../backend/dist/emailAdmin.mjs"
  output_path = "${path.module}/../../backend/dist/emailAdmin.zip"
}

resource "aws_cloudwatch_log_group" "email_admin" {
  name              = "/aws/lambda/tropico-email-admin-${var.environment}"
  retention_in_days = 14
  tags              = local.tags
}

resource "aws_lambda_function" "email_admin" {
  filename         = data.archive_file.email_admin.output_path
  function_name    = "tropico-email-admin-${var.environment}"
  role             = aws_iam_role.lambda.arn
  handler          = "emailAdmin.handler"
  source_code_hash = data.archive_file.email_admin.output_base64sha256
  runtime          = "nodejs22.x"
  architectures    = ["arm64"]
  memory_size      = 256
  timeout          = 30

  environment {
    variables = {
      TABLE_NAME     = aws_dynamodb_table.leads.name
      FROM_EMAIL_CRM = "Tropico Retreats <${var.from_email_crm}>"
      ENVIRONMENT    = var.environment
    }
  }

  depends_on = [aws_cloudwatch_log_group.email_admin]
  tags       = local.tags
}

resource "aws_lambda_permission" "email_admin" {
  statement_id  = "AllowAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.email_admin.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.leads.execution_arn}/*/*"
}

# ====================================================================
# Email Receive Lambda — S3 event handler
# Triggered when SES deposits a raw MIME email into S3
# ====================================================================

data "archive_file" "email_receive" {
  type        = "zip"
  source_file = "${path.module}/../../backend/dist/emailReceive.mjs"
  output_path = "${path.module}/../../backend/dist/emailReceive.zip"
}

resource "aws_cloudwatch_log_group" "email_receive" {
  name              = "/aws/lambda/tropico-email-receive-${var.environment}"
  retention_in_days = 14
  tags              = local.tags
}

resource "aws_lambda_function" "email_receive" {
  filename         = data.archive_file.email_receive.output_path
  function_name    = "tropico-email-receive-${var.environment}"
  role             = aws_iam_role.email_receive_lambda.arn
  handler          = "emailReceive.handler"
  source_code_hash = data.archive_file.email_receive.output_base64sha256
  runtime          = "nodejs22.x"
  architectures    = ["arm64"]
  memory_size      = 256
  timeout          = 60

  dead_letter_config {
    target_arn = aws_sqs_queue.email_dlq.arn
  }

  environment {
    variables = {
      TABLE_NAME           = aws_dynamodb_table.leads.name
      EMAIL_BUCKET         = aws_s3_bucket.email.bucket
      FROM_EMAIL_CRM       = "Tropico Retreats <${var.from_email_crm}>"
      BACKUP_FORWARD_EMAIL = var.backup_forward_email
      ADMIN_DASHBOARD_URL  = "https://${var.admin_domain}"
      ENVIRONMENT          = var.environment
    }
  }

  depends_on = [aws_cloudwatch_log_group.email_receive]
  tags       = local.tags
}

# Allow S3 to invoke the Email Receive Lambda
resource "aws_lambda_permission" "email_receive_s3" {
  statement_id  = "AllowS3Invoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.email_receive.function_name
  principal     = "s3.amazonaws.com"
  source_arn    = aws_s3_bucket.email.arn
}

# S3 event notification: trigger Lambda on new objects in incoming/ prefix
resource "aws_s3_bucket_notification" "email_incoming" {
  bucket = aws_s3_bucket.email.id

  lambda_function {
    lambda_function_arn = aws_lambda_function.email_receive.arn
    events              = ["s3:ObjectCreated:*"]
    filter_prefix       = "incoming/"
  }

  depends_on = [aws_lambda_permission.email_receive_s3]
}

# ====================================================================
# SES Receipt Rule Set — Inbound Email Routing
# Routes emails to team@tropicoretreat.com → S3 bucket → Lambda
# Production only (staging shares production SES)
# ====================================================================

resource "aws_ses_receipt_rule_set" "email" {
  count         = var.environment == "staging" ? 0 : 1
  rule_set_name = "tropico-email-${var.environment}"
}

resource "aws_ses_active_receipt_rule_set" "email" {
  count         = var.environment == "staging" ? 0 : 1
  rule_set_name = aws_ses_receipt_rule_set.email[0].rule_set_name
}

resource "aws_ses_receipt_rule" "inbound" {
  count         = var.environment == "staging" ? 0 : 1
  name          = "tropico-inbound-email"
  rule_set_name = aws_ses_receipt_rule_set.email[0].rule_set_name
  recipients    = [var.from_email_crm]
  enabled       = true
  scan_enabled  = true

  # Step 1: Store raw email in S3
  s3_action {
    bucket_name       = aws_s3_bucket.email.bucket
    object_key_prefix = "incoming/"
    position          = 1
  }

  depends_on = [aws_s3_bucket_policy.email_ses]
}
