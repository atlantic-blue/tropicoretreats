variable "aws_account" {
  description = "AWS CLI profile name. Set to null in CI to use environment credentials."
  default     = "atlantic-blue"
}

variable "aws_region" {
  default = "us-east-1"
}

variable "environment" {
  default = "production"
}

variable "product_name" {
  default = "tropico-retreats"
}

variable "www_google_site_verification_token" {
  type = string
}

variable "invalidate_cache" {
  description = "Set to true to invalidate CloudFront cache"
  type        = bool
  default     = false
}

variable "team_emails" {
  description = "Comma-separated list of team email addresses for lead notifications"
  type        = string
  default     = ""
}

variable "is_staging" {
  description = "Whether this is a staging environment (affects domain naming)"
  type        = bool
  default     = false
}

variable "route53_zone_id" {
  description = "Route53 hosted zone ID for the domain (required for staging to use production zone)"
  type        = string
  default     = ""
}

variable "from_email_crm" {
  description = "From email address for CRM emails (team@tropicoretreat.com)"
  type        = string
  default     = "team@tropicoretreat.com"
}

variable "backup_forward_email" {
  description = "Email address to receive backup forwards of inbound emails (leave empty to disable)"
  type        = string
  default     = "atlanticbluesolutionslimited@gmail.com"
}