variable "environment" {
  description = "Deployment environment (dev, production)"
  type        = string
}

variable "product_name" {
  description = "Product name for resource tagging"
  type        = string
}

variable "aws_region" {
  description = "AWS region for deployment"
  type        = string
}

variable "cors_allowed_origins" {
  description = "List of allowed origins for CORS"
  type        = list(string)
  default     = []
}
