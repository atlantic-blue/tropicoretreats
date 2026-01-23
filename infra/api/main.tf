provider "aws" {
  region  = var.aws_region
  profile = var.aws_account
}

locals {
  tags = {
    product     = var.product_name
    environment = var.environment
    gitRepo     = "github.com/atlantic-blue/tropicoretreat"
    managed_by  = "terraform"
  }

  domain_name = "tropicoretreat.com"

  cors_origins = length(var.cors_allowed_origins) > 0 ? var.cors_allowed_origins : (
    var.environment == "production"
    ? ["https://tropicoretreat.com", "https://www.tropicoretreat.com"]
    : ["http://localhost:3000", "http://localhost:5173", "https://tropicoretreat.com", "https://www.tropicoretreat.com"]
  )
}

resource "aws_cloudwatch_log_group" "api" {
  name              = "/aws/apigateway/tropico-leads-api-${var.environment}"
  retention_in_days = 14
  tags              = local.tags
}

resource "aws_apigatewayv2_api" "leads" {
  name          = "tropico-leads-api-${var.environment}"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = local.cors_origins
    allow_methods = ["POST", "OPTIONS"]
    allow_headers = ["Content-Type", "Authorization"]
    max_age       = 3600
  }

  tags = local.tags
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.leads.id
  name        = "$default"
  auto_deploy = true

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api.arn
    format = jsonencode({
      requestId      = "$context.requestId"
      ip             = "$context.identity.sourceIp"
      requestTime    = "$context.requestTime"
      httpMethod     = "$context.httpMethod"
      routeKey       = "$context.routeKey"
      status         = "$context.status"
      responseLength = "$context.responseLength"
      errorMessage   = "$context.error.message"
    })
  }

  tags = local.tags
}

resource "aws_apigatewayv2_integration" "create_lead" {
  api_id                 = aws_apigatewayv2_api.leads.id
  integration_type       = "AWS_PROXY"
  integration_method     = "POST"
  integration_uri        = aws_lambda_function.create_lead.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "create_lead" {
  api_id    = aws_apigatewayv2_api.leads.id
  route_key = "POST /leads"
  target    = "integrations/${aws_apigatewayv2_integration.create_lead.id}"
}
