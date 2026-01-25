# Architecture Research: Multi-Channel Lead Capture Integration

**Domain:** Lead management for corporate retreat booking
**Researched:** 2026-01-25
**Confidence:** HIGH (verified against official documentation)

## Executive Summary

This document details how Twilio webhooks, SES inbound email receiving, Slack webhooks, and SNS SMS integrate with the existing Lambda/API Gateway/DynamoDB architecture. The architecture follows an **event-driven pattern** where all inbound channels create leads through the existing `createLead` Lambda, and all outbound notifications flow through the existing `processLeadNotifications` Lambda triggered by DynamoDB Streams.

---

## Current Architecture (Baseline)

```
INBOUND (Lead Capture)
    Marketing Site → POST /leads → API Gateway → createLead Lambda → DynamoDB
                                                                        │
                                                                        ▼
OUTBOUND (Notifications)                                         DynamoDB Streams
    Team Email    ◄────────────────────────────────────────────────────┤
    Customer Email ◄─── processLeadNotifications Lambda ◄──────────────┘
```

### Existing Components

| Component | Resource | Current Role |
|-----------|----------|--------------|
| API Gateway HTTP API | `tropico-leads-api-{env}` | Public POST /leads, protected admin routes |
| createLead Lambda | `tropico-create-lead-{env}` | Validates, stores leads |
| leadsAdmin Lambda | `tropico-leads-admin-{env}` | Admin CRUD operations |
| processLeadNotifications Lambda | `tropico-notifications-{env}` | Sends email notifications |
| DynamoDB | `tropico-leads-{env}` | Lead storage with streams |
| SES | Domain identity `tropicoretreat.com` | Outbound email only |
| Cognito | `tropico-admin-{env}` | Admin authentication |

---

## Target Architecture (v1.1 Multi-Channel)

```
INBOUND CHANNELS (Lead Capture)
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  Marketing Site ──► POST /leads ─┐                                         │
│                                  │                                         │
│  SES Inbound ──► S3 ──► Lambda ──┼──► createLead Lambda ──► DynamoDB       │
│       │                          │           │                    │        │
│       └──► SNS ──────────────────┘           │                    │        │
│                                              │                    ▼        │
│  Twilio Voice ──► POST /webhooks/twilio ─────┘            DynamoDB Streams │
│                                                                   │        │
└─────────────────────────────────────────────────────────────────────────────┘
                                                                    │
                                                                    ▼
OUTBOUND CHANNELS (Notifications)
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                     processLeadNotifications Lambda                         │
│                              │                                              │
│              ┌───────────────┼───────────────┬────────────────┐            │
│              ▼               ▼               ▼                ▼            │
│         SES Email      SNS SMS        Slack Webhook      (Future:          │
│         (existing)     (new)          (new)              WhatsApp)         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Integration Details by Channel

### 1. Slack Webhook Notifications (Outbound)

**Confidence:** HIGH - Simple HTTP POST pattern

**Integration Pattern:** Direct HTTP call from Lambda

```
DynamoDB Streams INSERT → processLeadNotifications Lambda → HTTPS POST → Slack Webhook URL
```

**Architecture Changes:**

| Change Type | Component | Details |
|-------------|-----------|---------|
| MODIFY | processLeadNotifications Lambda | Add Slack notification function |
| ADD | Environment Variable | `SLACK_WEBHOOK_URL` (stored in SSM/Secrets Manager) |
| ADD | Lambda Permissions | Outbound HTTPS (no IAM needed for external webhook) |

**Implementation Notes:**
- Slack incoming webhooks accept JSON payloads via HTTPS POST
- Webhook URL format: `https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXX`
- Supports Block Kit for rich formatting
- Rate limits: Not explicitly documented, but ~1 request/second is safe
- Max 100 attachments per message
- **Critical:** Webhook URL contains secrets - store in AWS Secrets Manager, not in environment variables directly

**Payload Format:**
```json
{
  "text": "New Lead: John Doe - john@example.com",
  "blocks": [
    {
      "type": "section",
      "text": { "type": "mrkdwn", "text": "*New Lead Received*" }
    }
  ]
}
```

**Source:** [Slack Incoming Webhooks Documentation](https://docs.slack.dev/messaging/sending-messages-using-incoming-webhooks)

---

### 2. SNS SMS Notifications (Outbound)

**Confidence:** HIGH - Native AWS integration

**Integration Pattern:** AWS SDK call from Lambda

```
DynamoDB Streams INSERT → processLeadNotifications Lambda → SNS Publish → SMS Gateway
```

**Architecture Changes:**

| Change Type | Component | Details |
|-------------|-----------|---------|
| MODIFY | processLeadNotifications Lambda | Add SNS publish call |
| ADD | IAM Policy | `sns:Publish` permission with `Resource: "*"` |
| ADD | Environment Variables | `SMS_ENABLED`, `SMS_PHONE_NUMBERS` |
| CONFIGURE | SNS | SMS sandbox exit (production), spending limit |

**Implementation Notes:**
- SNS SMS is "originator-agnostic" - sends from AWS pool numbers
- Direct publish to phone number (no topic required)
- Requires `sns:Publish` with `Resource: "*"` for phone numbers
- SMS sandbox mode limits recipients to verified numbers only
- Production requires request to AWS for sandbox exit
- Transactional SMS type recommended for notifications

**Code Pattern (AWS SDK v3):**
```typescript
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

const snsClient = new SNSClient({});

await snsClient.send(new PublishCommand({
  PhoneNumber: '+1234567890',
  Message: 'New lead: John Doe from Example Corp',
  MessageAttributes: {
    'AWS.SNS.SMS.SMSType': {
      DataType: 'String',
      StringValue: 'Transactional'
    }
  }
}));
```

**Source:** [AWS SNS SMS Documentation](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_sns_code_examples.html)

---

### 3. SES Inbound Email Receiving (Inbound)

**Confidence:** HIGH - Verified against AWS official documentation

**Integration Pattern:** SES Receipt Rules with S3 and Lambda

```
Email → SES Inbound → Receipt Rule → S3 (store email) + SNS → Lambda → createLead Lambda
                                            └─► Lambda (parse) ─────────────────┘
```

**Architecture Changes:**

| Change Type | Component | Details |
|-------------|-----------|---------|
| ADD | MX Record | Route53 MX → `inbound-smtp.{region}.amazonaws.com` |
| ADD | S3 Bucket | `tropico-emails-{env}` for raw email storage |
| ADD | S3 Bucket Policy | Allow SES to write |
| ADD | SES Receipt Rule Set | Container for receipt rules |
| ADD | SES Active Receipt Rule Set | Activate the rule set |
| ADD | SES Receipt Rule | Match `hello@tropicoretreat.com`, trigger actions |
| ADD | Lambda Function | `tropico-email-receiver-{env}` - parses email, creates lead |
| ADD | Lambda Permission | Allow SES to invoke |
| ADD | IAM Policy | S3 read for email content, DynamoDB write for createLead |

**Critical Requirements:**

1. **Region Limitation:** SES receiving is only available in specific regions:
   - US East (N. Virginia) - `us-east-1`
   - US West (Oregon) - `us-west-2`
   - Europe (Ireland) - `eu-west-1`

2. **Domain Verification:** Domain must be verified in SES (already done for sending)

3. **MX Record:** Required Route53 record:
   ```hcl
   resource "aws_route53_record" "ses_inbound_mx" {
     zone_id = aws_route53_zone.www.zone_id
     name    = "tropicoretreat.com"
     type    = "MX"
     ttl     = 600
     records = ["10 inbound-smtp.us-east-1.amazonaws.com"]
   }
   ```

4. **Only One Active Rule Set:** Per AWS account, only one receipt rule set can be active

5. **Circular Dependency:** Lambda permission requires rule ARN, but rule requires Lambda ARN. Terraform workaround: deploy without Lambda action first, add permission, then add Lambda action.

**Email Parsing Flow:**
1. Email arrives at `hello@tropicoretreat.com`
2. SES stores raw email in S3 with key like `emails/{messageId}`
3. SES invokes Lambda with notification containing S3 location
4. Lambda fetches email from S3
5. Lambda parses email (From, Subject, Body) using `mailparser` library
6. Lambda calls createLead logic to store as lead

**Terraform Structure:**
```hcl
# ses-inbound.tf
resource "aws_ses_receipt_rule_set" "primary" {
  rule_set_name = "tropico-primary-${var.environment}"
}

resource "aws_ses_active_receipt_rule_set" "primary" {
  rule_set_name = aws_ses_receipt_rule_set.primary.rule_set_name
}

resource "aws_ses_receipt_rule" "inbound_email" {
  name          = "tropico-inbound-${var.environment}"
  rule_set_name = aws_ses_receipt_rule_set.primary.rule_set_name
  recipients    = ["hello@tropicoretreat.com"]
  enabled       = true
  scan_enabled  = true

  s3_action {
    bucket_name       = aws_s3_bucket.emails.id
    object_key_prefix = "inbound/"
    position          = 1
  }

  lambda_action {
    function_arn     = aws_lambda_function.email_receiver.arn
    invocation_type  = "Event"  # Async - recommended
    position         = 2
  }
}
```

**Source:** [AWS SES Email Receiving Concepts](https://docs.aws.amazon.com/ses/latest/dg/receiving-email-concepts.html)

---

### 4. Twilio Webhook for Phone Calls (Inbound)

**Confidence:** HIGH - Well-documented pattern

**Integration Pattern:** API Gateway route with Lambda handler returning TwiML

```
Incoming Call → Twilio → POST /webhooks/twilio/voice → API Gateway → Lambda
                                                                       │
                                                       ┌───────────────┴───────────────┐
                                                       ▼                               ▼
                                               Return TwiML                    Create Lead
                                               (voicemail/IVR)                 in DynamoDB
```

**Architecture Changes:**

| Change Type | Component | Details |
|-------------|-----------|---------|
| ADD | API Gateway Route | `POST /webhooks/twilio/voice` (public, no auth) |
| ADD | Lambda Function | `tropico-twilio-handler-{env}` |
| ADD | Lambda Integration | API Gateway → Lambda |
| CONFIGURE | Twilio Console | Set webhook URL to API endpoint |
| ADD | Environment Variable | `TWILIO_AUTH_TOKEN` (for signature validation) |

**Webhook Request Parameters (from Twilio):**

| Parameter | Description | Example |
|-----------|-------------|---------|
| `CallSid` | Unique call identifier | `CA1234...` (34 chars) |
| `AccountSid` | Twilio account | `AC1234...` |
| `From` | Caller phone number | `+14155551234` |
| `To` | Called number (your Twilio number) | `+14155555678` |
| `CallStatus` | Current status | `ringing`, `in-progress`, `completed` |
| `Direction` | Call direction | `inbound` |
| `FromCity`, `FromState`, `FromCountry` | Caller location | `San Francisco`, `CA`, `US` |
| `CallerName` | Caller ID name (if available) | `John Doe` |

**Lambda Handler Pattern:**
```typescript
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';

export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  // Parse form-urlencoded body (Twilio sends as form data)
  const params = new URLSearchParams(event.body || '');
  const from = params.get('From');
  const callerName = params.get('CallerName');
  const callSid = params.get('CallSid');

  // TODO: Validate Twilio signature (X-Twilio-Signature header)

  // Create lead from call data
  await createLeadFromCall({ from, callerName, callSid });

  // Return TwiML response
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
    <Response>
      <Say voice="alice">Thank you for calling Tropico Retreats.
        We have received your inquiry and will call you back within 24 hours.</Say>
      <Hangup/>
    </Response>`;

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/xml' },
    body: twiml,
  };
};
```

**Security: Signature Validation**

Twilio signs every request with `X-Twilio-Signature` header. Validate to prevent fake webhooks:

```typescript
import { validateRequest } from 'twilio';

const isValid = validateRequest(
  process.env.TWILIO_AUTH_TOKEN,
  signature,
  fullUrl,
  params
);
```

**TwiML Verbs Available:**
- `<Say>` - Text-to-speech
- `<Play>` - Play audio file
- `<Record>` - Record voicemail
- `<Gather>` - Collect DTMF input
- `<Dial>` - Forward to another number
- `<Hangup>` - End call

**Source:** [Twilio Voice Webhooks](https://www.twilio.com/docs/usage/webhooks/voice-webhooks)

---

### 5. Custom API Domain (Infrastructure)

**Confidence:** HIGH - Standard AWS pattern

**Integration Pattern:** API Gateway V2 Custom Domain with ACM Certificate

```
api.tropicoretreat.com → Route53 CNAME → API Gateway Regional Domain → HTTP API
```

**Architecture Changes:**

| Change Type | Component | Details |
|-------------|-----------|---------|
| ADD | ACM Certificate | For `api.tropicoretreat.com` (must be in same region) |
| ADD | API Gateway Domain Name | `aws_apigatewayv2_domain_name` |
| ADD | API Mapping | Map domain to API stage |
| ADD | Route53 Record | CNAME to API Gateway target domain |

**Terraform Configuration:**
```hcl
# api-domain.tf

# Certificate (same region as API Gateway)
resource "aws_acm_certificate" "api" {
  domain_name       = "api.tropicoretreat.com"
  validation_method = "DNS"
  tags              = local.tags
}

resource "aws_route53_record" "api_cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.api.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }
  zone_id = aws_route53_zone.www.zone_id
  name    = each.value.name
  type    = each.value.type
  ttl     = 60
  records = [each.value.record]
}

resource "aws_acm_certificate_validation" "api" {
  certificate_arn         = aws_acm_certificate.api.arn
  validation_record_fqdns = [for record in aws_route53_record.api_cert_validation : record.fqdn]
}

# Custom Domain
resource "aws_apigatewayv2_domain_name" "api" {
  domain_name = "api.tropicoretreat.com"

  domain_name_configuration {
    certificate_arn = aws_acm_certificate.api.arn
    endpoint_type   = "REGIONAL"
    security_policy = "TLS_1_2"
  }

  depends_on = [aws_acm_certificate_validation.api]
}

# API Mapping
resource "aws_apigatewayv2_api_mapping" "api" {
  api_id      = aws_apigatewayv2_api.leads.id
  domain_name = aws_apigatewayv2_domain_name.api.id
  stage       = aws_apigatewayv2_stage.default.id
}

# DNS Record
resource "aws_route53_record" "api" {
  zone_id = aws_route53_zone.www.zone_id
  name    = "api.tropicoretreat.com"
  type    = "CNAME"
  ttl     = 300
  records = [aws_apigatewayv2_domain_name.api.domain_name_configuration[0].target_domain_name]
}
```

**Source:** [AWS API Gateway Custom Domain Names](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-custom-domain-names.html)

---

## Complete Component Inventory

### New Components to Create

| Component | Type | Purpose |
|-----------|------|---------|
| `tropico-email-receiver-{env}` | Lambda | Parse inbound emails, create leads |
| `tropico-twilio-handler-{env}` | Lambda | Handle Twilio voice webhooks |
| `tropico-emails-{env}` | S3 Bucket | Store raw inbound emails |
| `POST /webhooks/twilio/voice` | API Route | Twilio webhook endpoint |
| `api.tropicoretreat.com` | Custom Domain | Branded API URL |
| SES Receipt Rule Set | SES Config | Email receiving rules |
| MX Record | Route53 | Email receiving DNS |

### Modified Components

| Component | Modification |
|-----------|--------------|
| `processLeadNotifications` Lambda | Add Slack webhook + SNS SMS calls |
| IAM Role for notifications Lambda | Add `sns:Publish` permission |
| Environment Variables | Add `SLACK_WEBHOOK_URL`, `SMS_PHONE_NUMBERS` |

### Unchanged Components

| Component | Notes |
|-----------|-------|
| `createLead` Lambda | Receives leads from all channels (no changes) |
| `leadsAdmin` Lambda | No changes |
| `users` Lambda | No changes |
| DynamoDB table | Schema supports all lead sources |
| Cognito | Admin auth unchanged |

---

## Data Model Extensions

### Lead Source Tracking

The existing Lead type should track source channel:

```typescript
interface Lead {
  // ... existing fields ...
  source: 'WEB_FORM' | 'EMAIL' | 'PHONE_CALL' | 'MANUAL';
  sourceMetadata?: {
    // For EMAIL source
    emailSubject?: string;
    emailMessageId?: string;
    // For PHONE_CALL source
    callSid?: string;
    callDuration?: number;
    recordingUrl?: string;
  };
}
```

### DynamoDB Updates

No schema changes required. Single-table design supports new sources:
- `PK: LEAD#{id}`, `SK: LEAD#{id}` - Lead record (unchanged)
- GSI1 for status queries (unchanged)

---

## Suggested Build Order

Based on dependencies and complexity:

### Phase 1: Custom API Domain (Foundation)
**Effort:** Low | **Dependencies:** None | **Risk:** Low

1. Create ACM certificate for `api.tropicoretreat.com`
2. Wait for DNS validation
3. Create API Gateway custom domain
4. Create API mapping
5. Create Route53 CNAME
6. Update frontend to use new domain

### Phase 2: Slack Notifications (Quick Win)
**Effort:** Low | **Dependencies:** None | **Risk:** Low

1. Create Slack app and incoming webhook
2. Store webhook URL in Secrets Manager
3. Update `processLeadNotifications` Lambda
4. Add Slack notification template
5. Deploy and test

### Phase 3: SNS SMS Notifications
**Effort:** Low | **Dependencies:** None | **Risk:** Medium (sandbox)

1. Request SNS SMS sandbox exit (can take days)
2. Add IAM permissions for `sns:Publish`
3. Update `processLeadNotifications` Lambda
4. Configure phone numbers for alerts
5. Deploy and test

### Phase 4: Twilio Voice Webhooks
**Effort:** Medium | **Dependencies:** API domain helpful | **Risk:** Medium

1. Purchase Twilio phone number
2. Create `tropico-twilio-handler` Lambda
3. Add API Gateway route `POST /webhooks/twilio/voice`
4. Configure Twilio webhook URL
5. Implement TwiML response
6. Add lead creation logic
7. Implement signature validation

### Phase 5: SES Inbound Email (Most Complex)
**Effort:** High | **Dependencies:** Region constraint | **Risk:** High

1. Verify SES receiving region support
2. Create S3 bucket for emails
3. Create email receiver Lambda
4. Create SES receipt rule set (without Lambda action)
5. Deploy and add Lambda permission
6. Add Lambda action to receipt rule
7. Add MX record to Route53
8. Implement email parsing
9. Test end-to-end

---

## Cost Implications

| Service | Monthly Estimate | Notes |
|---------|------------------|-------|
| SNS SMS | ~$0.01/message | US pricing |
| Slack Webhook | $0 | Free tier |
| Twilio Voice | ~$1/month + $0.01/min | Phone number + usage |
| SES Inbound | $0.10/1000 emails | First 1000 free |
| S3 (emails) | <$0.01 | Minimal storage |
| API Custom Domain | $0 | No additional cost |
| **Total New** | **~$2-5/month** | At expected volume |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| SES receiving not in current region | Medium | High | Verify region; may need multi-region |
| SNS SMS sandbox approval delay | High | Medium | Request early; email as fallback |
| Twilio webhook security | Low | High | Implement signature validation |
| Slack webhook URL exposure | Low | High | Store in Secrets Manager |
| Email parsing failures | Medium | Medium | Store raw email; manual fallback |

---

## Sources

- [AWS SES Email Receiving Concepts](https://docs.aws.amazon.com/ses/latest/dg/receiving-email-concepts.html) - HIGH confidence
- [Twilio Voice Webhooks](https://www.twilio.com/docs/usage/webhooks/voice-webhooks) - HIGH confidence
- [Slack Incoming Webhooks](https://docs.slack.dev/messaging/sending-messages-using-incoming-webhooks) - HIGH confidence
- [AWS SNS SMS Documentation](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_sns_code_examples.html) - HIGH confidence
- [Terraform API Gateway V2 Domain](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/apigatewayv2_domain_name) - HIGH confidence
- [AWS SES Lambda Forwarder Terraform Pattern](https://cuddly-octo-palm-tree.com/posts/2021-10-24-aws-email-forwarding-tf/) - MEDIUM confidence
