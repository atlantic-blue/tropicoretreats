# Route53 record pointing images subdomain to CloudFront
resource "aws_route53_record" "blog_images" {
  zone_id = local.route53_zone_id
  name    = local.images_domain
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.blog_images.domain_name
    zone_id                = aws_cloudfront_distribution.blog_images.hosted_zone_id
    evaluate_target_health = false
  }
}
