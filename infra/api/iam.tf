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
          "arn:aws:logs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/tropico-users-${var.environment}:*"
        ]
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
