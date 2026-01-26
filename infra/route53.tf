# Production creates the zone, staging looks it up
resource "aws_route53_zone" "www" {
  count = var.is_staging ? 0 : 1
  name  = local.domain_name
  tags  = local.tags
}

# Look up existing zone for staging
data "aws_route53_zone" "existing" {
  count   = var.is_staging ? 1 : 0
  zone_id = var.route53_zone_id
}

locals {
  # Use created zone in production, looked-up zone in staging
  route53_zone_id = var.is_staging ? data.aws_route53_zone.existing[0].zone_id : aws_route53_zone.www[0].zone_id
}

# see https://github.com/hashicorp/terraform-provider-aws/issues/27318
# Only manage domain registration in production
resource "aws_route53domains_registered_domain" "www" {
  count       = var.is_staging ? 0 : 1
  domain_name = local.domain_name

  dynamic "name_server" {
    for_each = toset(aws_route53_zone.www[0].name_servers)
    content {
      name = name_server.value
    }
  }

  tags = local.tags
}

# Main website DNS record - created in both production and staging
resource "aws_route53_record" "www_record" {
  zone_id = local.route53_zone_id
  name    = local.www_domain
  type    = "A"
  alias {
    name                   = aws_cloudfront_distribution.www.domain_name
    zone_id                = aws_cloudfront_distribution.www.hosted_zone_id
    evaluate_target_health = false
  }
}

/*
https://search.google.com/search-console/welcome?utm_source=about-page
*/
# Google verification - only in production
resource "aws_route53_record" "www_record_txt_google_verify" {
  count   = var.is_staging ? 0 : 1
  zone_id = local.route53_zone_id
  name    = local.domain_name
  type    = "TXT"
  ttl     = 300
  records = [
    "google-site-verification=${var.www_google_site_verification_token}"
  ]
}
