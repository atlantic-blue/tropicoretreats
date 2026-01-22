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
