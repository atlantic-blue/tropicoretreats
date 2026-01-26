# SES Domain Identity for transactional emails
# Enables sending from leads@tropicoretreat.com and hello@tropicoretreat.com
# Only created in production - staging shares the production SES identity

# Look up existing Route53 zone (public zone only)
data "aws_route53_zone" "www" {
  name         = local.domain_name
  private_zone = false
}

# SES v2 email identity for the domain (production only)
resource "aws_sesv2_email_identity" "main" {
  count          = var.environment == "staging" ? 0 : 1
  email_identity = local.domain_name

  tags = local.tags
}

# DKIM CNAME records in Route53 (3 records required for DKIM verification)
# Production only - staging shares production SES
resource "aws_route53_record" "ses_dkim" {
  count   = var.environment == "staging" ? 0 : 3
  zone_id = data.aws_route53_zone.www.zone_id
  name    = "${aws_sesv2_email_identity.main[0].dkim_signing_attributes[0].tokens[count.index]}._domainkey.${local.domain_name}"
  type    = "CNAME"
  ttl     = 600
  records = ["${aws_sesv2_email_identity.main[0].dkim_signing_attributes[0].tokens[count.index]}.dkim.amazonses.com"]
}
