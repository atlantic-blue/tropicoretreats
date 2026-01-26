# Cognito User Pool for admin authentication
# Source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cognito_user_pool
resource "aws_cognito_user_pool" "admin" {
  name = "tropico-admin-${var.environment}"

  # Password policy
  password_policy {
    minimum_length    = 12
    require_lowercase = true
    require_uppercase = true
    require_numbers   = true
    require_symbols   = true
  }

  # MFA - optional but recommended
  mfa_configuration = "OPTIONAL"
  software_token_mfa_configuration {
    enabled = true
  }

  # Account recovery
  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  # Admin creates users only (no public sign-up)
  admin_create_user_config {
    allow_admin_create_user_only = true
    invite_message_template {
      email_subject = "Your Tropico Retreats Admin Account"
      email_message = "Your username is {username} and temporary password is {####}. Please sign in at https://${var.admin_domain}"
      sms_message   = "Your username is {username} and temporary password is {####}"
    }
  }

  # Email configuration (use Cognito default, not SES initially)
  email_configuration {
    email_sending_account = "COGNITO_DEFAULT"
  }

  # Auto-verify email
  auto_verified_attributes = ["email"]

  # User attributes
  schema {
    name                = "email"
    attribute_data_type = "String"
    required            = true
    mutable             = true
  }

  tags = local.tags
}

# Cognito User Pool Client (public - no secret for browser-based app)
# Source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cognito_user_pool_client
resource "aws_cognito_user_pool_client" "admin" {
  name         = "tropico-admin-client-${var.environment}"
  user_pool_id = aws_cognito_user_pool.admin.id

  # NO client secret for browser-based app
  generate_secret = false

  # Auth flows
  explicit_auth_flows = [
    "ALLOW_USER_SRP_AUTH",            # Secure Remote Password
    "ALLOW_REFRESH_TOKEN_AUTH",       # Token refresh
    "ALLOW_ADMIN_USER_PASSWORD_AUTH", # CLI testing in Plan 02
  ]

  # Token validity
  access_token_validity  = 1  # 1 hour
  id_token_validity      = 1  # 1 hour
  refresh_token_validity = 30 # 30 days

  token_validity_units {
    access_token  = "hours"
    id_token      = "hours"
    refresh_token = "days"
  }

  # Security
  prevent_user_existence_errors = "ENABLED"
  enable_token_revocation       = true

  # Callback URLs (include localhost in all environments for dev testing)
  callback_urls = [
    "http://localhost:3000",
    "http://localhost:5173",
    "https://${var.admin_domain}"
  ]

  logout_urls = [
    "http://localhost:3000",
    "http://localhost:5173",
    "https://${var.admin_domain}"
  ]

  # Supported identity providers
  supported_identity_providers = ["COGNITO"]
}
