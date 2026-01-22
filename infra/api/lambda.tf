data "archive_file" "lambda" {
  type        = "zip"
  source_file = "${path.module}/../../backend/dist/index.js"
  output_path = "${path.module}/../../backend/dist/lambda.zip"
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
  handler          = "index.handler"
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
