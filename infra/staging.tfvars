# Staging Environment Configuration
# Usage: terraform apply -var-file=staging.tfvars

environment = "staging"
is_staging  = true

# Production Route53 zone ID (staging creates records in production zone)
route53_zone_id = "Z01254553C9V0YAJNI839"

# Team emails for staging (optional - can use same as production or different)
# team_emails = "staging-team@tropicoretreat.com"
