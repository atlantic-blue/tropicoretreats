variable "environment" {
  description = "Deployment environment (dev, production)"
  type        = string
  default     = "production"
}

variable "product_name" {
  description = "Product name for resource tagging"
  type        = string
  default     = "tropico-retreats"
}

variable "aws_account" {
  default = "atlantic-blue"
}

variable "aws_region" {
  description = "AWS region for deployment"
  type        = string
  default     = "us-east-1"
}

variable "cors_allowed_origins" {
  description = "List of allowed origins for CORS"
  type        = list(string)
  default     = []
}

# Notification configuration variables
variable "team_emails" {
  description = "Comma-separated list of team email addresses for notifications"
  type        = string
  default     = ""
}

variable "from_email_team" {
  description = "From email address for team notifications"
  type        = string
  default     = "leads@tropicoretreat.com"
}

variable "from_email_customer" {
  description = "From email address for customer auto-replies"
  type        = string
  default     = "hello@tropicoretreat.com"
}

variable "from_name" {
  description = "From name for all emails"
  type        = string
  default     = "Tropico Retreats"
}

variable "wildcard_certificate_arn" {
  description = "ARN of the wildcard ACM certificate for *.tropicoretreat.com"
  type        = string
}

variable "api_domain" {
  description = "Custom domain for API Gateway (e.g., api.tropicoretreat.com or staging-api.tropicoretreat.com)"
  type        = string
  default     = "api.tropicoretreat.com"
}

variable "admin_domain" {
  description = "Admin dashboard domain (e.g., admin.tropicoretreat.com or staging-admin.tropicoretreat.com)"
  type        = string
  default     = "admin.tropicoretreat.com"
}

# ====================================================================
# Email CRM Configuration
# ====================================================================

variable "from_email_crm" {
  description = "From email address for CRM emails (team@tropicoretreat.com)"
  type        = string
  default     = "team@tropicoretreat.com"
}

variable "backup_forward_email" {
  description = "Email address to receive backup forwards of inbound emails (leave empty to disable)"
  type        = string
  default     = ""
}

variable "route53_zone_id" {
  description = "Route53 hosted zone ID (passed from root module)"
  type        = string
}

# ====================================================================
# Image Pipeline Configuration
# ====================================================================

variable "images_domain" {
  description = "CloudFront domain for serving processed blog images"
  type        = string
  default     = "images.tropicoretreat.com"
}

variable "sharp_layer_arn" {
  description = "ARN of the Lambda layer containing the sharp image processing library"
  type        = string
}

