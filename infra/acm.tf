resource "aws_acm_certificate" "www_certificate" {
  domain_name       = local.domain_name
  validation_method = "DNS"

  tags = merge(
    local.tags,
    {
      managedBy = "Terraform",
    }
  )

  lifecycle {
    create_before_destroy = true
  }

  subject_alternative_names = [
    "*.${local.domain_name}",
  ]
}

resource "aws_route53_record" "www_cert_dns" {
  allow_overwrite = true
  zone_id         = aws_route53_zone.www.id
  name            = tolist(aws_acm_certificate.www_certificate.domain_validation_options)[0].resource_record_name
  ttl             = 60

  records = [tolist(aws_acm_certificate.www_certificate.domain_validation_options)[0].resource_record_value]
  type    = tolist(aws_acm_certificate.www_certificate.domain_validation_options)[0].resource_record_type

}

resource "aws_acm_certificate_validation" "www_cert_validate" {
  certificate_arn         = aws_acm_certificate.www_certificate.arn
  validation_record_fqdns = [aws_route53_record.www_cert_dns.fqdn]
}
