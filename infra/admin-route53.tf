# Route53 record pointing admin subdomain to CloudFront
resource "aws_route53_record" "admin" {
  zone_id = aws_route53_zone.www.zone_id
  name    = "admin.tropicoretreat.com"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.admin.domain_name
    zone_id                = aws_cloudfront_distribution.admin.hosted_zone_id
    evaluate_target_health = false
  }
}
