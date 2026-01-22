terraform {
  required_version = ">= v1.5.7"

  backend "s3" {
    bucket  = "abs-terraform"
    key     = "tropico-retreats"
    region  = "us-east-1"
    profile = "atlantic-blue"
    encrypt = true
  }
}

module "api" {
  source = "./api"

  environment  = var.environment
  product_name = var.product_name
  aws_region   = var.aws_region
}
