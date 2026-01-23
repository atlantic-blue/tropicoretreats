variable "environment" {
  description = "Deployment environment (dev, production)"
  type        = string
  default = "production"
}

variable "product_name" {
  description = "Product name for resource tagging"
  type        = string
  default = "tropico-retreats"
}

variable "aws_account" {
  default = "atlantic-blue"
}

variable "aws_region" {
  description = "AWS region for deployment"
  type        = string
  default = "us-east-1"
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
