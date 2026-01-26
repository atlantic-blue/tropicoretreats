# Route53 record pointing api subdomain to API Gateway custom domain
resource "aws_route53_record" "api" {
  zone_id = local.route53_zone_id
  name    = local.api_domain
  type    = "A"

  alias {
    name                   = module.api.api_domain_target
    zone_id                = module.api.api_domain_zone_id
    evaluate_target_health = false
  }
}
