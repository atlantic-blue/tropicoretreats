# Secrets Manager configuration for secure credential storage

# Slack webhook URL secret
# Value must be set manually after terraform apply:
# aws secretsmanager put-secret-value --secret-id tropico/slack-webhook-url-production --secret-string "https://hooks.slack.com/services/..."
resource "aws_secretsmanager_secret" "slack_webhook" {
  name        = "tropico/slack-webhook-url-${var.environment}"
  description = "Slack incoming webhook URL for lead notifications"
  tags        = local.tags
}
