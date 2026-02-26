data "aws_caller_identity" "current" {}

# Lambda execution role
resource "aws_iam_role" "lambda" {
  name = "tropico-create-lead-lambda-${var.environment}"

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

# DynamoDB permissions for Lambda
resource "aws_iam_role_policy" "lambda_dynamodb" {
  name = "dynamodb-access"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:UpdateItem"
        ]
        Resource = [
          aws_dynamodb_table.leads.arn,
          "${aws_dynamodb_table.leads.arn}/index/GSI1"
        ]
      }
    ]
  })
}

# CloudWatch Logs permissions for Lambda
resource "aws_iam_role_policy" "lambda_logs" {
  name = "cloudwatch-logs"
  role = aws_iam_role.lambda.id

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
        Resource = [
          "arn:aws:logs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/tropico-create-lead-${var.environment}:*",
          "arn:aws:logs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/tropico-leads-admin-${var.environment}:*",
          "arn:aws:logs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/tropico-users-${var.environment}:*",
          "arn:aws:logs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/tropico-email-admin-${var.environment}:*"
        ]
      }
    ]
  })
}

# SES send permissions for Email Admin Lambda (shares the main lambda role)
resource "aws_iam_role_policy" "lambda_ses" {
  name = "ses-send"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ses:SendEmail",
          "ses:SendRawEmail"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "ses:FromAddress" = [var.from_email_crm]
          }
        }
      }
    ]
  })
}

# Cognito permissions for Users Lambda (list users for assignee dropdown)
resource "aws_iam_role_policy" "lambda_cognito" {
  name = "tropico-lambda-cognito-${var.environment}"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["cognito-idp:ListUsers"]
        Resource = aws_cognito_user_pool.admin.arn
      }
    ]
  })
}

# ====================================================================
# Notification Lambda IAM Policies
# ====================================================================

# CloudWatch Logs permissions for Notification Lambda
resource "aws_iam_role_policy" "notifications_logs" {
  name = "cloudwatch-logs"
  role = aws_iam_role.notifications_lambda.id

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
        Resource = "arn:aws:logs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/tropico-notifications-${var.environment}:*"
      }
    ]
  })
}

# DynamoDB Streams permissions for Notification Lambda
resource "aws_iam_role_policy" "notifications_dynamodb_streams" {
  name = "dynamodb-streams"
  role = aws_iam_role.notifications_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetRecords",
          "dynamodb:GetShardIterator",
          "dynamodb:DescribeStream",
          "dynamodb:ListStreams"
        ]
        Resource = aws_dynamodb_table.leads.stream_arn
      }
    ]
  })
}

# SES permissions for Notification Lambda
resource "aws_iam_role_policy" "notifications_ses" {
  name = "ses-send"
  role = aws_iam_role.notifications_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ses:SendEmail",
          "ses:SendRawEmail"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "ses:FromAddress" = [
              var.from_email_team,
              var.from_email_customer
            ]
          }
        }
      }
    ]
  })
}

# SQS DLQ permissions for Notification Lambda (failed record destination)
resource "aws_iam_role_policy" "notifications_dlq" {
  name = "sqs-dlq"
  role = aws_iam_role.notifications_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "sqs:SendMessage"
        ]
        Resource = aws_sqs_queue.notifications_dlq.arn
      }
    ]
  })
}

# Secrets Manager permissions for Notification Lambda (Slack webhook URL)
resource "aws_iam_role_policy" "notifications_secrets" {
  name = "secrets-manager"
  role = aws_iam_role.notifications_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue"]
        Resource = aws_secretsmanager_secret.slack_webhook.arn
      }
    ]
  })
}

# SNS SMS permissions for Notification Lambda
resource "aws_iam_role_policy" "notifications_sns" {
  name = "sns-sms"
  role = aws_iam_role.notifications_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["sns:Publish"]
        Resource = "*" # Required for SMS - cannot scope to specific phone numbers
      }
    ]
  })
}

# DynamoDB read permissions for Notification Lambda (preferences lookup)
resource "aws_iam_role_policy" "notifications_dynamodb_read" {
  name = "dynamodb-read"
  role = aws_iam_role.notifications_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:Query"
        ]
        Resource = [
          aws_dynamodb_table.leads.arn,
          "${aws_dynamodb_table.leads.arn}/index/GSI1"
        ]
      }
    ]
  })
}

# ====================================================================
# Email Receive Lambda IAM Role + Policies
# Needs: S3 (read raw email + write attachments), DynamoDB, SES (backup forward), SQS DLQ, CloudWatch
# ====================================================================

resource "aws_iam_role" "email_receive_lambda" {
  name = "tropico-email-receive-lambda-${var.environment}"

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

# CloudWatch Logs
resource "aws_iam_role_policy" "email_receive_logs" {
  name = "cloudwatch-logs"
  role = aws_iam_role.email_receive_lambda.id

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
        Resource = "arn:aws:logs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/tropico-email-receive-${var.environment}:*"
      }
    ]
  })
}

# S3: Read raw emails + write attachments
resource "aws_iam_role_policy" "email_receive_s3" {
  name = "s3-email-access"
  role = aws_iam_role.email_receive_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject"
        ]
        Resource = "${aws_s3_bucket.email.arn}/*"
      }
    ]
  })
}

# DynamoDB: Scan for leads, put emails, update lead metadata
resource "aws_iam_role_policy" "email_receive_dynamodb" {
  name = "dynamodb-access"
  role = aws_iam_role.email_receive_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:Scan",
          "dynamodb:UpdateItem"
        ]
        Resource = [
          aws_dynamodb_table.leads.arn,
          "${aws_dynamodb_table.leads.arn}/index/GSI1"
        ]
      }
    ]
  })
}

# SES: Send backup forward emails
resource "aws_iam_role_policy" "email_receive_ses" {
  name = "ses-send"
  role = aws_iam_role.email_receive_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ses:SendEmail",
          "ses:SendRawEmail"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "ses:FromAddress" = [var.from_email_crm]
          }
        }
      }
    ]
  })
}

# SQS DLQ: Send failed invocations
resource "aws_iam_role_policy" "email_receive_dlq" {
  name = "sqs-dlq"
  role = aws_iam_role.email_receive_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["sqs:SendMessage"]
        Resource = aws_sqs_queue.email_dlq.arn
      }
    ]
  })
}
