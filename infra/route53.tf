resource "aws_route53_zone" "www" {
  name = local.domain_name
  tags = local.tags
}

# see https://github.com/hashicorp/terraform-provider-aws/issues/27318
resource "aws_route53domains_registered_domain" "www" {
  domain_name = local.domain_name

  dynamic "name_server" {
    for_each = toset(aws_route53_zone.www.name_servers)
    content {
      name = name_server.value
    }
  }

  tags = local.tags
}

# Main website DNS record - only created in production
resource "aws_route53_record" "www_record" {
  count   = var.is_staging ? 0 : 1
  zone_id = aws_route53_zone.www.id
  name    = local.domain_name
  type    = "A"
  alias {
    name                   = aws_cloudfront_distribution.www[0].domain_name
    zone_id                = aws_cloudfront_distribution.www[0].hosted_zone_id
    evaluate_target_health = false
  }
}

/*
https://search.google.com/search-console/welcome?utm_source=about-page
*/
resource "aws_route53_record" "www_record_txt_google_verify" {
  zone_id = aws_route53_zone.www.id
  name    = local.domain_name
  type    = "TXT"
  ttl     = 300
  records = [
    "google-site-verification=${var.www_google_site_verification_token}"
  ]
}
