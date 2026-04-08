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

  environment              = var.environment
  product_name             = var.product_name
  aws_region               = var.aws_region
  aws_account              = var.aws_account
  wildcard_certificate_arn = aws_acm_certificate.www_certificate.arn
  team_emails              = var.team_emails
  api_domain               = local.api_domain
  admin_domain             = local.admin_domain
  route53_zone_id          = local.route53_zone_id
  from_email_crm           = var.from_email_crm
  backup_forward_email     = var.backup_forward_email
  images_domain            = local.images_domain
  sharp_layer_arn          = var.sharp_layer_arn
}
