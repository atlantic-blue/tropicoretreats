# Notification Lambda infrastructure
# Triggered by DynamoDB Streams INSERT events to send lead notifications

# Archive for notification handler
data "archive_file" "notifications_lambda" {
  type        = "zip"
  source_file = "${path.module}/../../backend/dist/processLeadNotifications.mjs"
  output_path = "${path.module}/../../backend/dist/notifications-lambda.zip"
}

# SQS Dead Letter Queue for failed notifications
resource "aws_sqs_queue" "notifications_dlq" {
  name                      = "tropico-notifications-dlq-${var.environment}"
  message_retention_seconds = 1209600 # 14 days
  tags                      = local.tags
}

# CloudWatch Log Group for notification Lambda
resource "aws_cloudwatch_log_group" "notifications_lambda" {
  name              = "/aws/lambda/tropico-notifications-${var.environment}"
  retention_in_days = 14
  tags              = local.tags
}

# IAM Role for notification Lambda
resource "aws_iam_role" "notifications_lambda" {
  name = "tropico-notifications-lambda-${var.environment}"

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

# Notification Lambda function
resource "aws_lambda_function" "notifications" {
  filename         = data.archive_file.notifications_lambda.output_path
  function_name    = "tropico-notifications-${var.environment}"
  role             = aws_iam_role.notifications_lambda.arn
  handler          = "processLeadNotifications.handler"
  source_code_hash = data.archive_file.notifications_lambda.output_base64sha256
  runtime          = "nodejs22.x"
  architectures    = ["arm64"]
  memory_size      = 256
  timeout          = 60 # Allow time for email sending

  environment {
    variables = {
      ENVIRONMENT         = var.environment
      TEAM_EMAILS         = var.team_emails
      FROM_EMAIL_TEAM     = var.from_email_team
      FROM_EMAIL_CUSTOMER = var.from_email_customer
      FROM_NAME           = var.from_name
    }
  }

  depends_on = [aws_cloudwatch_log_group.notifications_lambda]
  tags       = local.tags
}

# Event source mapping: DynamoDB Streams -> Notification Lambda
resource "aws_lambda_event_source_mapping" "dynamodb_to_notifications" {
  event_source_arn  = aws_dynamodb_table.leads.stream_arn
  function_name     = aws_lambda_function.notifications.arn
  starting_position = "LATEST"

  # Batch settings
  batch_size                         = 10
  maximum_batching_window_in_seconds = 0 # Process immediately

  # Filter for INSERT events only (new leads)
  filter_criteria {
    filter {
      pattern = jsonencode({
        eventName = ["INSERT"]
      })
    }
  }

  # Retry settings
  maximum_retry_attempts = 3

  # DLQ for failed processing
  destination_config {
    on_failure {
      destination_arn = aws_sqs_queue.notifications_dlq.arn
    }
  }
}
