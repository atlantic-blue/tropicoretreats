data "archive_file" "lambda" {
  type        = "zip"
  source_file = "${path.module}/../../backend/dist/createLead.mjs"
  output_path = "${path.module}/../../backend/dist/create-lead-lambda.zip"
}

resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/tropico-create-lead-${var.environment}"
  retention_in_days = 14
  tags              = local.tags
}

resource "aws_lambda_function" "create_lead" {
  filename         = data.archive_file.lambda.output_path
  function_name    = "tropico-create-lead-${var.environment}"
  role             = aws_iam_role.lambda.arn
  handler          = "createLead.handler"
  source_code_hash = data.archive_file.lambda.output_base64sha256
  runtime          = "nodejs22.x"
  architectures    = ["arm64"]
  memory_size      = 256
  timeout          = 30

  environment {
    variables = {
      TABLE_NAME  = aws_dynamodb_table.leads.name
      ENVIRONMENT = var.environment
    }
  }

  depends_on = [aws_cloudwatch_log_group.lambda]
  tags       = local.tags
}

resource "aws_lambda_permission" "api" {
  statement_id  = "AllowAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.create_lead.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.leads.execution_arn}/*/*"
}

# ====================================================================
# Leads Admin Lambda (handles GET /leads, GET/PATCH /leads/{id}, notes)
# ====================================================================

data "archive_file" "leads_admin" {
  type        = "zip"
  source_file = "${path.module}/../../backend/dist/leadsAdmin.mjs"
  output_path = "${path.module}/../../backend/dist/leadsAdmin.zip"
}

resource "aws_cloudwatch_log_group" "leads_admin" {
  name              = "/aws/lambda/tropico-leads-admin-${var.environment}"
  retention_in_days = 14
  tags              = local.tags
}

resource "aws_lambda_function" "leads_admin" {
  filename         = data.archive_file.leads_admin.output_path
  function_name    = "tropico-leads-admin-${var.environment}"
  role             = aws_iam_role.lambda.arn
  handler          = "leadsAdmin.handler"
  source_code_hash = data.archive_file.leads_admin.output_base64sha256
  runtime          = "nodejs22.x"
  architectures    = ["arm64"]
  memory_size      = 256
  timeout          = 30

  environment {
    variables = {
      TABLE_NAME  = aws_dynamodb_table.leads.name
      ENVIRONMENT = var.environment
    }
  }

  depends_on = [aws_cloudwatch_log_group.leads_admin]
  tags       = local.tags
}

resource "aws_lambda_permission" "leads_admin" {
  statement_id  = "AllowAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.leads_admin.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.leads.execution_arn}/*/*"
}

# ====================================================================
# Users Lambda (handles GET /users for assignee dropdown)
# ====================================================================

data "archive_file" "users" {
  type        = "zip"
  source_file = "${path.module}/../../backend/dist/users.mjs"
  output_path = "${path.module}/../../backend/dist/users.zip"
}

resource "aws_cloudwatch_log_group" "users" {
  name              = "/aws/lambda/tropico-users-${var.environment}"
  retention_in_days = 14
  tags              = local.tags
}

resource "aws_lambda_function" "users" {
  filename         = data.archive_file.users.output_path
  function_name    = "tropico-users-${var.environment}"
  role             = aws_iam_role.lambda.arn
  handler          = "users.handler"
  source_code_hash = data.archive_file.users.output_base64sha256
  runtime          = "nodejs22.x"
  architectures    = ["arm64"]
  memory_size      = 128
  timeout          = 10

  environment {
    variables = {
      USER_POOL_ID = aws_cognito_user_pool.admin.id
      ENVIRONMENT  = var.environment
    }
  }

  depends_on = [aws_cloudwatch_log_group.users]
  tags       = local.tags
}

resource "aws_lambda_permission" "users" {
  statement_id  = "AllowAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.users.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.leads.execution_arn}/*/*"
}
