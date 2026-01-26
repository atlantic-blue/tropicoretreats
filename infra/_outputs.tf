# output "s3_bucket_name" {
#   description = "Name of the S3 bucket hosting the website"
#   value       = module.hosting.www_bucket
# }

# output "cloudfront_domain_name" {
#   description = "Domain name of the CloudFront distribution"
#   value       = module.hosting.www_cloudfront_distribution
# }

# output "ci_access_key_id" {
#     value = module.ci_user.ci_access_key_id
# }

# output "ci_secret_access_key" {
#   value     = module.ci_user.ci_secret_access_key
#   sensitive = true
# }

# API Module Outputs
output "api_endpoint" {
  description = "API Gateway endpoint URL for the leads API"
  value       = module.api.api_endpoint
}

output "api_id" {
  description = "API Gateway ID"
  value       = module.api.api_id
}

output "lambda_function_name" {
  description = "Lambda function name for the create lead handler"
  value       = module.api.lambda_function_name
}

output "dynamodb_table_name" {
  description = "DynamoDB table name for leads"
  value       = module.api.dynamodb_table_name
}

# Cognito Outputs
output "cognito_user_pool_id" {
  description = "Cognito User Pool ID"
  value       = module.api.cognito_user_pool_id
}

output "cognito_user_pool_endpoint" {
  description = "Cognito User Pool endpoint"
  value       = module.api.cognito_user_pool_endpoint
}

output "cognito_client_id" {
  description = "Cognito App Client ID"
  value       = module.api.cognito_client_id
}

# Admin Dashboard Outputs
output "admin_bucket_name" {
  description = "S3 bucket name for admin dashboard"
  value       = aws_s3_bucket.admin.id
}

output "admin_cloudfront_distribution_id" {
  description = "CloudFront distribution ID for admin dashboard"
  value       = aws_cloudfront_distribution.admin.id
}

output "admin_cloudfront_domain" {
  description = "CloudFront domain name for admin dashboard"
  value       = aws_cloudfront_distribution.admin.domain_name
}

output "api_custom_domain" {
  description = "Custom domain URL for the API"
  value       = "https://api.tropicoretreat.com/v1"
}
