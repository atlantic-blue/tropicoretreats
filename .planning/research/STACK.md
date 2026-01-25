# Technology Stack Additions for v1.1 Multi-Channel Lead Capture

**Project:** Tropico Retreats Lead Management
**Milestone:** v1.1 Multi-Channel Leads
**Researched:** 2026-01-25
**Overall Confidence:** HIGH

---

## Executive Summary

This document covers **stack additions only** for the v1.1 milestone. The existing stack (Lambda Node.js 22, API Gateway HTTP API, DynamoDB, SES outbound, Cognito, React 19) is validated and not re-evaluated here.

The new capabilities require:
1. **Twilio SDK** for inbound phone webhook handling
2. **@slack/webhook** for outbound Slack notifications
3. **@aws-sdk/client-sns** for SMS notifications
4. **mailparser** for parsing inbound emails from SES
5. **Vitest + aws-sdk-client-mock** for testing
6. **Terraform resources** for custom API domain and SES receiving

---

## Recommended Stack Additions

### Outbound Notifications

| Technology | Version | Purpose | Rationale |
|------------|---------|---------|-----------|
| `@slack/webhook` | ^7.0.6 | Slack channel notifications | Official Slack SDK. Lightweight (outbound only). Supports Node 18+. Simple API: instantiate with URL, call `send()`. No Slack app complexity. |
| `@aws-sdk/client-sns` | ^3.968.0 | SMS notifications | Already using AWS SDK v3 pattern. Consistent with existing @aws-sdk/client-* usage. Native SNS integration, no external service needed. |

**Why Slack webhooks over Slack API:**
- Free tier supports unlimited incoming webhooks
- No OAuth complexity or app installation flows
- Perfect for one-way notifications (which is the v1.1 scope)
- Two-way messaging deferred to post-v1.1 (requires paid tier)

**Why SNS over Twilio SMS:**
- Already on AWS, simpler IAM integration
- No additional vendor relationship
- Adequate for low-volume team alerts (~25 leads/year)
- Twilio SMS would require managing additional credentials

### Inbound Channel Capture

| Technology | Version | Purpose | Rationale |
|------------|---------|---------|-----------|
| `twilio` | ^5.11.2 | Inbound call webhook handling | Industry standard for telephony. Provides request validation (`validateRequest`), TwiML response helpers. Supports Node 22. |
| `mailparser` | ^3.9.1 | Parse inbound emails from SES | Streaming parser handles large emails. Extracts headers, body, attachments. Node.js native, no browser bundling issues. |
| `email-reply-parser` | ^2.3.5 | Extract new content from email replies | Strips quoted text, signatures. Essential for clean lead notes when customers reply. |

**Twilio architecture for inbound calls:**
```
Phone Call -> Twilio -> Webhook (API Gateway) -> Lambda -> DynamoDB
                                               -> Return TwiML (voice prompt)
```

**SES inbound architecture:**
```
Email -> SES -> S3 bucket (raw email)
            -> Lambda (via receipt rule)
            -> Parse with mailparser
            -> Create lead in DynamoDB
```

### Testing Framework

| Technology | Version | Purpose | Rationale |
|------------|---------|---------|-----------|
| `vitest` | ^4.0.17 | Unit and integration test runner | Vite-native (admin already uses Vite). Faster than Jest. ESM-first matches project's `"type": "module"`. Active development. |
| `aws-sdk-client-mock` | ^4.1.0 | Mock AWS SDK v3 clients | Official recommendation from AWS. Works with all SDK v3 clients. Typed mocks. |
| `aws-sdk-client-mock-vitest` | ^7.0.1 | Vitest matchers for SDK mocks | Adds `toHaveReceivedCommand()` matchers. Cleaner test assertions. |

**Why Vitest over Jest:**
- Admin dashboard already uses Vite for bundling
- ESM-native (project uses `"type": "module"`)
- 2-3x faster test execution
- Compatible with existing TypeScript setup
- Growing ecosystem, Jest-compatible API

### API Documentation

| Technology | Version | Purpose | Rationale |
|------------|---------|---------|-----------|
| OpenAPI 3.1 spec (manual) | - | API documentation | Hand-written YAML spec. No runtime dependencies. Can export to API Gateway. |
| Swagger UI (static) | ^5.x | Interactive docs viewer | Single Lambda serving static HTML. Minimal overhead. |

**Why manual OpenAPI over auto-generation:**
- Small API surface (8-10 endpoints)
- Manual spec ensures documentation matches intent, not just implementation
- No runtime overhead in Lambda handlers
- Terraform can import spec for API Gateway configuration validation

### Infrastructure (Terraform)

| Resource | Purpose | Notes |
|----------|---------|-------|
| `aws_apigatewayv2_domain_name` | Custom domain api.tropicoretreat.com | For HTTP API (v2). Requires ACM certificate. |
| `aws_apigatewayv2_api_mapping` | Map domain to API stage | Connects custom domain to $default stage |
| `aws_ses_receipt_rule_set` | SES inbound email rules | Only one active rule set allowed per account |
| `aws_ses_receipt_rule` | Route hello@ to Lambda | Match recipient, invoke Lambda |
| `aws_s3_bucket` (inbound emails) | Store raw inbound emails | SES writes before Lambda processes |
| `aws_route53_record` (MX) | MX record for email receiving | Required for SES to receive email |

**SES Inbound Region Requirement:**
SES email receiving is supported in us-east-1 (where current infrastructure runs). No region change needed.

---

## Alternatives Considered

### Notification Channels

| Recommended | Alternative | Why Not Alternative |
|-------------|-------------|---------------------|
| @slack/webhook | Slack Web API | Overkill for one-way notifications. Requires OAuth app setup. |
| @slack/webhook | slack-notify (community) | Less maintained than official SDK. Fewer weekly downloads. |
| SNS SMS | Twilio SMS | Additional vendor. More expensive for low volume. SNS already in AWS ecosystem. |
| SNS SMS | MessageBird | Same reasoning as Twilio. Unnecessary complexity. |

### Inbound Email

| Recommended | Alternative | Why Not Alternative |
|-------------|-------------|---------------------|
| SES + mailparser | AWS WorkMail | Overkill. WorkMail is full email service. We just need parsing. |
| SES + mailparser | Mailgun inbound | External service. SES already in use for outbound. Keep ecosystem simple. |
| mailparser | postal-mime | mailparser more mature, better docs, 1M+ weekly downloads. |

### Testing

| Recommended | Alternative | Why Not Alternative |
|-------------|-------------|---------------------|
| Vitest | Jest | Slower. Requires CJS workarounds for ESM. Admin already Vite-based. |
| Vitest | Node test runner | Less mature. Missing watch mode, coverage tooling out of box. |
| aws-sdk-client-mock | Manual mocks | Tedious. Type safety issues. Community library well-maintained. |

### API Documentation

| Recommended | Alternative | Why Not Alternative |
|-------------|-------------|---------------------|
| OpenAPI + static Swagger UI | Powertools for AWS | Adds runtime dependency to all handlers. Over-engineered for 8 endpoints. |
| OpenAPI + static Swagger UI | Postman collections | Not standard. Lock-in. OpenAPI is portable. |

---

## What NOT to Add

| Technology | Why Exclude |
|------------|-------------|
| WhatsApp integration | Requires Meta Business verification (2-4 weeks). Defer to post-v1.1. |
| Twilio outbound calls | Out of scope. Only inbound capture needed. |
| Twilio SMS | SNS sufficient for team alerts. Twilio overkill. |
| @slack/bolt | Full Slack app framework. We only need webhooks. |
| AWS Powertools | Small API surface doesn't justify wrapper overhead. |
| Hono/Express | Lambda handlers are simple. No routing framework needed. |
| Prisma/ORM | DynamoDB single-table design works well. ORM adds complexity. |
| Redis/caching | Low volume (~25 leads/year). No caching needed. |

---

## Integration Points with Existing Stack

### Lambda Handler Pattern

New handlers follow existing pattern in `backend/src/`:

```typescript
// Example: slackNotification.ts
import { IncomingWebhook } from '@slack/webhook';
import type { DynamoDBStreamEvent } from 'aws-lambda';

const webhook = new IncomingWebhook(process.env.SLACK_WEBHOOK_URL!);

export const handler = async (event: DynamoDBStreamEvent) => {
  // Process DynamoDB stream events (same pattern as notifications.tf)
  // Send to Slack webhook
};
```

### Notification Lambda Extension

Existing `processLeadNotifications` Lambda (triggered by DynamoDB Streams) will be extended:

```
Current: DynamoDB INSERT -> Lambda -> SES (team email + customer confirmation)
New:     DynamoDB INSERT -> Lambda -> SES + Slack + SMS
```

**No new Lambda needed for outbound notifications.** Extend existing handler with conditional channel logic.

### Inbound Webhooks (New Lambdas)

| Lambda | Trigger | Creates |
|--------|---------|---------|
| `inboundEmail` | SES Receipt Rule | Lead from parsed email |
| `inboundPhone` | API Gateway POST /webhooks/twilio | Lead from call metadata |

Both write to same DynamoDB table using existing access patterns.

---

## Installation Commands

### Backend Dependencies

```bash
cd backend

# Outbound notifications
npm install @slack/webhook@^7.0.6
npm install @aws-sdk/client-sns@^3.968.0

# Inbound parsing
npm install twilio@^5.11.2
npm install mailparser@^3.9.1
npm install email-reply-parser@^2.3.5

# Dev: Testing
npm install -D vitest@^4.0.17
npm install -D aws-sdk-client-mock@^4.1.0
npm install -D aws-sdk-client-mock-vitest@^7.0.1

# Dev: Types for mailparser
npm install -D @types/mailparser@^3.4.6
```

### package.json Scripts Addition

```json
{
  "scripts": {
    "test": "vitest",
    "test:coverage": "vitest --coverage"
  }
}
```

---

## Environment Variables (New)

| Variable | Used By | Source |
|----------|---------|--------|
| `SLACK_WEBHOOK_URL` | Notification Lambda | Slack app incoming webhook |
| `TWILIO_AUTH_TOKEN` | Inbound phone Lambda | Twilio account |
| `INBOUND_EMAIL_BUCKET` | Inbound email Lambda | Terraform output |

**Note:** Twilio Account SID not needed if only validating webhooks (auth token sufficient).

---

## Terraform Resources Summary

### Custom API Domain

```hcl
# ACM certificate for api.tropicoretreat.com
resource "aws_acm_certificate" "api" {
  domain_name       = "api.tropicoretreat.com"
  validation_method = "DNS"
}

# API Gateway v2 custom domain
resource "aws_apigatewayv2_domain_name" "api" {
  domain_name = "api.tropicoretreat.com"

  domain_name_configuration {
    certificate_arn = aws_acm_certificate.api.arn
    endpoint_type   = "REGIONAL"
    security_policy = "TLS_1_2"
  }
}

# Route53 alias record
resource "aws_route53_record" "api" {
  name    = "api.tropicoretreat.com"
  type    = "A"
  zone_id = data.aws_route53_zone.www.zone_id

  alias {
    name                   = aws_apigatewayv2_domain_name.api.domain_name_configuration[0].target_domain_name
    zone_id                = aws_apigatewayv2_domain_name.api.domain_name_configuration[0].hosted_zone_id
    evaluate_target_health = false
  }
}

# API mapping
resource "aws_apigatewayv2_api_mapping" "default" {
  api_id      = aws_apigatewayv2_api.leads.id
  domain_name = aws_apigatewayv2_domain_name.api.id
  stage       = aws_apigatewayv2_stage.default.id
}
```

### SES Inbound Email

```hcl
# MX record for receiving email
resource "aws_route53_record" "ses_mx" {
  zone_id = data.aws_route53_zone.www.zone_id
  name    = "tropicoretreat.com"
  type    = "MX"
  ttl     = 600
  records = ["10 inbound-smtp.us-east-1.amazonaws.com"]
}

# S3 bucket for raw emails
resource "aws_s3_bucket" "inbound_emails" {
  bucket = "tropico-inbound-emails-${var.environment}"
}

# SES receipt rule set
resource "aws_ses_receipt_rule_set" "main" {
  rule_set_name = "tropico-inbound-${var.environment}"
}

# Activate the rule set
resource "aws_ses_active_receipt_rule_set" "main" {
  rule_set_name = aws_ses_receipt_rule_set.main.rule_set_name
}

# Receipt rule for hello@
resource "aws_ses_receipt_rule" "hello" {
  name          = "hello-to-lead"
  rule_set_name = aws_ses_receipt_rule_set.main.rule_set_name
  recipients    = ["hello@tropicoretreat.com"]
  enabled       = true

  s3_action {
    bucket_name = aws_s3_bucket.inbound_emails.id
    position    = 1
  }

  lambda_action {
    function_arn    = aws_lambda_function.inbound_email.arn
    invocation_type = "Event"
    position        = 2
  }
}
```

---

## Confidence Assessment

| Component | Confidence | Rationale |
|-----------|------------|-----------|
| @slack/webhook | HIGH | Official SDK, verified current version, simple API |
| @aws-sdk/client-sns | HIGH | Same SDK family as existing code, official AWS docs |
| twilio | HIGH | Industry standard, verified v5.x supports Node 22 |
| mailparser | HIGH | 1M+ weekly downloads, Dec 2025 release, well documented |
| Vitest | HIGH | 20M weekly downloads, Vitest 4.0 stable, ESM-native |
| aws-sdk-client-mock | HIGH | AWS-recommended, version 4.1.0 stable |
| SES inbound | MEDIUM | Supported in us-east-1, but architecture requires careful S3/Lambda ordering |
| Custom domain | HIGH | Standard Terraform pattern, well-documented |

---

## Open Questions for Phase Planning

1. **Twilio phone number:** Need to decide on local Colombian number vs US toll-free for inbound calls
2. **Slack workspace:** Confirm which Slack workspace will receive notifications (create webhook there)
3. **SES production access:** Verify SES sandbox removal is in progress (required for customer emails)
4. **SNS SMS opt-out:** Decide if team members should have opt-out capability for SMS alerts

---

## Sources

### Official Documentation
- [AWS SES Email Receiving](https://docs.aws.amazon.com/ses/latest/dg/receiving-email-concepts.html)
- [AWS SNS SMS with SDK v3](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/sns-examples-sending-sms.html)
- [Slack Incoming Webhooks](https://docs.slack.dev/messaging/sending-messages-using-incoming-webhooks/)
- [Twilio Webhooks on Lambda](https://www.twilio.com/en-us/blog/serverless-twilio-webhooks-aws-lambda-function-urls)
- [Terraform aws_apigatewayv2_domain_name](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/apigatewayv2_domain_name)

### Testing
- [aws-sdk-client-mock GitHub](https://github.com/m-radzikowski/aws-sdk-client-mock)
- [Testing Lambda with Vitest](https://daaru.medium.com/testing-lambda-functions-with-vitest-fc713caa975d)
- [Vitest 4.0 Announcement](https://voidzero.dev/posts/announcing-vitest-4)

### Package Versions (as of 2026-01-25)
- @slack/webhook: 7.0.6
- @aws-sdk/client-sns: 3.968.0
- twilio: 5.11.2
- mailparser: 3.9.1
- vitest: 4.0.17
- aws-sdk-client-mock: 4.1.0
