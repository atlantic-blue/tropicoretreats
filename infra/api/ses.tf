# SES Domain Identity for transactional emails
# Enables sending from leads@tropicoretreat.com and hello@tropicoretreat.com

# Look up existing Route53 zone
data "aws_route53_zone" "www" {
  name = local.domain_name
}

# SES v2 email identity for the domain
resource "aws_sesv2_email_identity" "main" {
  email_identity = local.domain_name

  tags = local.tags
}

# DKIM CNAME records in Route53 (3 records required for DKIM verification)
resource "aws_route53_record" "ses_dkim" {
  count   = 3
  zone_id = data.aws_route53_zone.www.zone_id
  name    = "${aws_sesv2_email_identity.main.dkim_signing_attributes[0].tokens[count.index]}._domainkey.${local.domain_name}"
  type    = "CNAME"
  ttl     = 600
  records = ["${aws_sesv2_email_identity.main.dkim_signing_attributes[0].tokens[count.index]}.dkim.amazonses.com"]
}
