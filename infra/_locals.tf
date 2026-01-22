locals {
  tags = {
    product = "${var.product_name}"
    environment = "${var.environment}"
    gitRepo    = "github.com/atlantic-blue/tropicoretreat"
    managed_by  = "terraform"
  }

    domain_name = "tropicoretreat.com"
    bucket_name = "tropicoretreat.com"
}
