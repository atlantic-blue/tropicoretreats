locals {
  tags = {
    product = "${var.product_name}"
    environment = "${var.environment}"
    gitRepo    = "github.com/atlantic-blue/maistro"
    managed_by  = "terraform"
  }

    domain_name = "tropicoretreat.com"
    bucket_name = "tropicoretreat.com"
}

# locals {
#   tags = {
#     git_repo    = "cocktavern/retreats"
#     application = "colombian-retreats-com"
#     environment = var.environment
#     managed_by  = "terraform"
#   }

#   www_bucket_name = "colombian-retreats-com"
#   s3_origin_id    = "s3-${local.www_bucket_name}-${var.environment}"

#   domain_name     = "colombianretreats.com"
#   route53_zone_id = "TODO"
# }
