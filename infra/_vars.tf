variable "aws_account" {
  default = "atlantic-blue"
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