locals {
  tags = {
    product     = "${var.product_name}"
    environment = "${var.environment}"
    gitRepo     = "github.com/atlantic-blue/tropicoretreat"
    managed_by  = "terraform"
  }

  domain_name = "tropicoretreat.com"
  bucket_name = "tropicoretreat.com"

  # Environment-specific domain names
  admin_domain      = var.is_staging ? "staging-admin.tropicoretreat.com" : "admin.tropicoretreat.com"
  api_domain        = var.is_staging ? "staging-api.tropicoretreat.com" : "api.tropicoretreat.com"
  admin_bucket_name = var.is_staging ? "staging-admin.tropicoretreat.com" : "admin.tropicoretreat.com"
}
