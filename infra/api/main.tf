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
    ? ["https://tropicoretreat.com", "https://www.tropicoretreat.com", "https://${var.admin_domain}"]
    : ["http://localhost:3000", "http://localhost:5173", "http://localhost:5174", "https://tropicoretreat.com", "https://www.tropicoretreat.com", "https://${var.admin_domain}"]
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
    allow_methods = ["GET", "POST", "PATCH", "OPTIONS"]
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

  # Rate limiting: 10 requests/second with burst of 10
  # IMPORTANT: Never remove these settings - Terraform bug sets limits to 0 (blocks all traffic)
  default_route_settings {
    throttling_burst_limit = 10
    throttling_rate_limit  = 10
  }

  tags = local.tags
}

# ====================================================================
# Custom Domain Configuration
# ====================================================================

# Custom domain for API Gateway using existing wildcard certificate
resource "aws_apigatewayv2_domain_name" "api" {
  domain_name = var.api_domain

  domain_name_configuration {
    certificate_arn = var.wildcard_certificate_arn
    endpoint_type   = "REGIONAL"
    security_policy = "TLS_1_2"
  }

  tags = local.tags
}

# API mapping with /v1 base path for versioning
resource "aws_apigatewayv2_api_mapping" "v1" {
  api_id          = aws_apigatewayv2_api.leads.id
  domain_name     = aws_apigatewayv2_domain_name.api.id
  stage           = aws_apigatewayv2_stage.default.id
  api_mapping_key = "v1"
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

# JWT Authorizer with Cognito
# Source: https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-jwt-authorizer.html
resource "aws_apigatewayv2_authorizer" "cognito" {
  api_id           = aws_apigatewayv2_api.leads.id
  authorizer_type  = "JWT"
  identity_sources = ["$request.header.Authorization"]
  name             = "tropico-cognito-authorizer-${var.environment}"

  jwt_configuration {
    audience = [aws_cognito_user_pool_client.admin.id]
    issuer   = "https://${aws_cognito_user_pool.admin.endpoint}"
  }
}

# ====================================================================
# Leads Admin Integration (single integration for multiple admin routes)
# ====================================================================
resource "aws_apigatewayv2_integration" "leads_admin" {
  api_id                 = aws_apigatewayv2_api.leads.id
  integration_type       = "AWS_PROXY"
  integration_method     = "POST"
  integration_uri        = aws_lambda_function.leads_admin.invoke_arn
  payload_format_version = "2.0"
}

# Protected route for GET /leads (requires valid JWT)
resource "aws_apigatewayv2_route" "get_leads" {
  api_id             = aws_apigatewayv2_api.leads.id
  route_key          = "GET /leads"
  target             = "integrations/${aws_apigatewayv2_integration.leads_admin.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

# Protected route for GET /leads/{id} (requires valid JWT)
resource "aws_apigatewayv2_route" "get_lead" {
  api_id             = aws_apigatewayv2_api.leads.id
  route_key          = "GET /leads/{id}"
  target             = "integrations/${aws_apigatewayv2_integration.leads_admin.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

# Protected route for PATCH /leads/{id} (requires valid JWT)
resource "aws_apigatewayv2_route" "patch_lead" {
  api_id             = aws_apigatewayv2_api.leads.id
  route_key          = "PATCH /leads/{id}"
  target             = "integrations/${aws_apigatewayv2_integration.leads_admin.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

# Protected route for POST /leads/{id}/notes (requires valid JWT)
resource "aws_apigatewayv2_route" "create_note" {
  api_id             = aws_apigatewayv2_api.leads.id
  route_key          = "POST /leads/{id}/notes"
  target             = "integrations/${aws_apigatewayv2_integration.leads_admin.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

# Protected route for PATCH /leads/{id}/notes/{noteId} (requires valid JWT)
resource "aws_apigatewayv2_route" "patch_note" {
  api_id             = aws_apigatewayv2_api.leads.id
  route_key          = "PATCH /leads/{id}/notes/{noteId}"
  target             = "integrations/${aws_apigatewayv2_integration.leads_admin.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

# ====================================================================
# Users Integration (for GET /users - Cognito user listing)
# ====================================================================
resource "aws_apigatewayv2_integration" "users" {
  api_id                 = aws_apigatewayv2_api.leads.id
  integration_type       = "AWS_PROXY"
  integration_method     = "POST"
  integration_uri        = aws_lambda_function.users.invoke_arn
  payload_format_version = "2.0"
}

# Protected route for GET /users (requires valid JWT)
resource "aws_apigatewayv2_route" "get_users" {
  api_id             = aws_apigatewayv2_api.leads.id
  route_key          = "GET /users"
  target             = "integrations/${aws_apigatewayv2_integration.users.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}
