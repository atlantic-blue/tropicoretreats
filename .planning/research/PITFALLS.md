# Domain Pitfalls: Multi-Channel Lead Capture

**Domain:** Adding multi-channel lead capture to existing serverless lead management
**Researched:** 2026-01-25
**Confidence:** HIGH (verified with official documentation)

---

## Critical Pitfalls

Mistakes that cause rewrites, security vulnerabilities, or complete feature failure.

---

### Pitfall 1: Twilio Signature Validation Fails with Empty Parameters

**What goes wrong:** Twilio webhook requests fail validation even with correct auth token. The Lambda returns 401/403 and calls are not captured as leads.

**Why it happens:** Twilio includes empty parameters in the HMAC signature calculation (e.g., `CalledZip=`). Default URL parsing strips empty values, causing signature mismatch.

**Consequences:**
- All inbound calls rejected as invalid
- No leads captured from phone channel
- Debugging is frustrating because the code "looks correct"

**Warning signs:**
- `validator.validate()` returns false consistently
- Works in local testing with simple payloads, fails with real Twilio requests
- CloudWatch logs show signature mismatch errors

**Prevention:**
```javascript
// WRONG: Default parsing strips empty values
const params = new URLSearchParams(body);

// CORRECT: Preserve empty values for signature validation
const params = new URLSearchParams(body);
const paramsWithBlanks = {};
for (const [key, value] of params) {
  paramsWithBlanks[key] = value; // value can be empty string
}
```

For Node.js, use the querystring module with proper options or parse manually preserving empty strings. For Python, use `parse_qs(body, keep_blank_values=True)`.

**Detection:** Add logging of raw body AND parsed params before validation. Compare parameter count between raw and parsed.

**Phase to address:** Twilio Integration Phase

**Sources:**
- [How to Fix Twilio Signature Validation Failures in AWS Lambda](https://norahsakal.com/tutorials/troubleshooting/troubleshooting-hub-twilio-request-validation-aws-sam-lambda-keep-blank-values/)
- [Twilio Security Documentation](https://www.twilio.com/docs/usage/tutorials/secure-amazon-lambda-python-app-validating-incoming-twilio-requests)

---

### Pitfall 2: SES Inbound Email Region Mismatch

**What goes wrong:** SES receipt rules created but emails never arrive at Lambda. MX records configured correctly but nothing happens.

**Why it happens:** SES email receiving is only available in specific AWS regions. Current infrastructure is in us-east-1 which DOES support receiving, but if resources were created in a region without support, it would silently fail.

**Consequences:**
- Inbound email channel completely non-functional
- No error messages since emails simply don't route
- Wasted time debugging the wrong components

**Warning signs:**
- MX records point to SES but emails bounce or disappear
- Receipt rules exist but Lambda never invoked
- Works in us-east-1 but fails when replicated to other regions

**Prevention:**
1. Verify region supports SES email receiving BEFORE implementation
2. Supported regions for receiving (as of 2025): US East (N. Virginia), US West (Oregon), Europe (Ireland), plus expanded regions
3. Keep ALL SES resources in the same region as the receiving endpoint
4. Current project uses us-east-1 - this is supported, do not change regions

**Detection:** Check SES console for active receipt rule sets. Verify MX records point to the correct regional endpoint.

**Phase to address:** SES Inbound Email Phase - verify region compatibility first

**Sources:**
- [Amazon SES email receiving concepts](https://docs.aws.amazon.com/ses/latest/dg/receiving-email-concepts.html)
- [Amazon SES endpoints and quotas](https://docs.aws.amazon.com/general/latest/gr/ses.html)

---

### Pitfall 3: Slack Webhook URL Exposed in Code or Logs

**What goes wrong:** Slack webhook URL committed to git or logged in CloudWatch. Attackers post spam/malicious content to team channel.

**Why it happens:** Webhook URLs look like regular URLs, not obvious they're secrets. Developers hardcode for quick testing and forget to remove.

**Consequences:**
- Spam/phishing messages posted to team Slack channel
- Slack revokes the webhook URL (they actively scan for leaks)
- Team loses trust in the notification system
- Must regenerate URL and redeploy

**Warning signs:**
- Pre-commit hooks flag webhook URL patterns
- GitGuardian or similar tools alert on exposure
- Random messages appear in team Slack channel

**Prevention:**
1. Store webhook URL in AWS Secrets Manager, not environment variables
2. Add webhook URL pattern to `.gitignore` and pre-commit hooks
3. Never log the full URL - log only a hash or last 8 characters for debugging
4. Rotate webhook URL quarterly as best practice

```hcl
# Terraform: Store in Secrets Manager
resource "aws_secretsmanager_secret" "slack_webhook" {
  name = "tropico-slack-webhook-${var.environment}"
}

# Lambda retrieves at runtime
const secretsManager = new SecretsManagerClient();
const webhook = await secretsManager.send(new GetSecretValueCommand({
  SecretId: process.env.SLACK_WEBHOOK_SECRET_ARN
}));
```

**Detection:** Run `git log -p | grep -i "hooks.slack.com"` on repository. Audit CloudWatch logs for webhook URL patterns.

**Phase to address:** Slack Notification Phase - implement secrets management from the start

**Sources:**
- [Slack Security Best Practices](https://api.slack.com/authentication/best-practices)
- [Remediating Slack Webhook URL leaks](https://www.gitguardian.com/remediation/slack-webhook-url)

---

### Pitfall 4: SES Lambda Action Executes Before S3 Save

**What goes wrong:** Lambda attempts to process email body but body is empty or truncated. Lead creation fails with missing data.

**Why it happens:** SES receipt rules can deliver to Lambda directly, but Lambda payload only includes metadata, not the full email body. The body must be saved to S3 first.

**Consequences:**
- Leads created without email content
- Cannot determine inquiry details or customer message
- Partial data makes leads useless for follow-up

**Warning signs:**
- Lambda receives events but `body` or `content` fields are empty
- Small emails work, large emails fail
- Attachment metadata present but actual attachment missing

**Prevention:**
Receipt rule order matters - S3 action MUST come before Lambda action:

```hcl
resource "aws_ses_receipt_rule" "inbound_email" {
  name          = "inbound-email-to-lead"
  rule_set_name = aws_ses_receipt_rule_set.main.rule_set_name
  enabled       = true
  scan_enabled  = true

  # 1. First: Save to S3
  s3_action {
    bucket_name = aws_s3_bucket.email_inbox.id
    position    = 1
  }

  # 2. Second: Trigger Lambda (after S3 save completes)
  lambda_action {
    function_arn     = aws_lambda_function.process_email.arn
    invocation_type  = "Event"  # Async
    position         = 2
  }
}
```

Lambda then reads the full email from S3 using the message ID from the event.

**Detection:** Log the raw SES event in Lambda. Check if `content` field is present and populated.

**Phase to address:** SES Inbound Email Phase

**Sources:**
- [Invoke Lambda function action - Amazon SES](https://docs.aws.amazon.com/ses/latest/dg/receiving-email-action-lambda.html)
- [Lambda function examples for SES](https://docs.aws.amazon.com/ses/latest/dg/receiving-email-action-lambda-example-functions.html)

---

### Pitfall 5: Custom Domain Certificate in Wrong Region

**What goes wrong:** Terraform apply fails with "Invalid certificate ARN" or domain doesn't resolve after deployment.

**Why it happens:** For HTTP API (API Gateway v2) with regional endpoint, the ACM certificate must be in the SAME region as the API. Current project uses us-east-1, so this is not an issue, but confusion arises from REST API documentation (which requires us-east-1 for edge-optimized).

**Consequences:**
- Terraform deployment fails
- Custom domain not accessible
- Confusing error messages about certificate mismatch

**Warning signs:**
- Error: "Invalid certificate ARN"
- Error: "Certificate not found"
- Error: "Certificate region mismatch"

**Prevention:**
1. For HTTP API (v2) with REGIONAL endpoint: certificate must be in same region as API
2. Current setup uses us-east-1 for both API and certificate - this is correct
3. Add explicit dependency on certificate validation

```hcl
resource "aws_apigatewayv2_domain_name" "api" {
  domain_name = "api.tropicoretreat.com"

  domain_name_configuration {
    certificate_arn = aws_acm_certificate.api.arn
    endpoint_type   = "REGIONAL"
    security_policy = "TLS_1_2"
  }

  # CRITICAL: Wait for certificate validation
  depends_on = [aws_acm_certificate_validation.api]
}
```

**Detection:** Verify certificate region matches API region in Terraform state.

**Phase to address:** Custom Domain Phase

**Sources:**
- [Custom domain name for REST APIs](https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-custom-domains.html)
- [Set up Regional custom domain](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-regional-api-custom-domain-create.html)

---

## Moderate Pitfalls

Mistakes that cause delays, debugging sessions, or technical debt.

---

### Pitfall 6: SNS SMS Sandbox Blocks Production Messages

**What goes wrong:** SMS notifications work in testing but fail silently in production for non-verified numbers.

**Why it happens:** New AWS accounts have SNS SMS in sandbox mode, limiting messages to verified phone numbers only. Similar to SES sandbox.

**Consequences:**
- Team notifications via SMS don't reach unverified numbers
- No error returned - messages just don't deliver
- Appears to work in testing (verified numbers) but fails for all team members

**Warning signs:**
- SMS works for developer's phone but not other team members
- CloudWatch shows successful publish but no delivery
- Delivery status shows "Unknown" or no status at all

**Prevention:**
1. Request SNS SMS production access early (can take 1-2 weeks for approval)
2. Verify all team phone numbers during development
3. Implement delivery status tracking to detect failures
4. Use SNS SMS delivery status logging

```hcl
resource "aws_sns_sms_preferences" "sms_preferences" {
  default_sms_type                = "Transactional"
  delivery_status_iam_role_arn    = aws_iam_role.sns_delivery_status.arn
  delivery_status_success_sampling_rate = 100
}
```

**Detection:** Enable SNS delivery status logging. Check CloudWatch for delivery failures.

**Phase to address:** SNS SMS Phase - request production access at project start

**Sources:**
- [Best practices for Amazon SNS SMS messaging](https://docs.aws.amazon.com/sns/latest/dg/channels-sms-best-practices.html)
- [SNS SMS Pricing and Quotas](https://aws.amazon.com/sns/sms-pricing/)

---

### Pitfall 7: Twilio Webhook URL Not Updated After API Gateway Change

**What goes wrong:** API Gateway endpoint changes (redeployment, custom domain migration) but Twilio still points to old URL. Calls fail with 404.

**Why it happens:** Twilio webhook URLs are configured in Twilio console, not managed by Terraform. When API Gateway changes, Twilio config becomes stale.

**Consequences:**
- All inbound calls fail after infrastructure changes
- Twilio retry logic exhausts, calls are lost
- No obvious error in AWS - failure happens at Twilio side

**Warning signs:**
- Calls worked before infrastructure change, now fail
- Twilio console shows webhook failures
- API Gateway logs show no incoming requests (because URL changed)

**Prevention:**
1. Document Twilio webhook URL in runbook - update manually after any API change
2. After adding custom domain, update Twilio to use `api.tropicoretreat.com` not the auto-generated URL
3. Consider using a stable URL pattern that doesn't change with redeployment
4. Add health check that verifies Twilio can reach the endpoint

**Detection:** After any API Gateway change, verify Twilio webhook URL matches new endpoint.

**Phase to address:** Twilio Integration Phase and Custom Domain Phase

---

### Pitfall 8: Lambda Testing Mocks Don't Match Cloud Behavior

**What goes wrong:** Unit tests pass with mocked AWS services, but Lambda fails in production with permissions, timeouts, or payload differences.

**Why it happens:** Mocks can't perfectly replicate AWS service behavior. Local environment differs from Lambda runtime (memory, timeout, environment variables).

**Consequences:**
- False confidence from passing tests
- Bugs discovered only in production
- Debugging production issues without reproducible tests

**Warning signs:**
- Tests pass, deployment succeeds, but feature doesn't work
- Works locally with SAM/serverless-offline, fails when deployed
- Timeout issues, permission denied errors only in production

**Prevention:**
1. Write integration tests that run against real AWS services in a dev account
2. Use "remocal" testing: local code execution against remote AWS resources
3. Don't mock AWS services for critical path testing - use real services
4. Test Lambda with realistic payload sizes and structures

```typescript
// Unit test: Mock for fast iteration (LOW confidence)
jest.mock('@aws-sdk/client-dynamodb');

// Integration test: Real services (HIGH confidence)
describe('createLead integration', () => {
  it('should create lead in real DynamoDB', async () => {
    // Uses real DynamoDB in dev account
    const result = await createLead(realEvent);
    expect(result.statusCode).toBe(201);

    // Verify in actual table
    const item = await dynamodb.get({ TableName: 'leads-dev', Key: { id } });
    expect(item).toBeDefined();
  });
});
```

**Detection:** Run integration tests against deployed dev stack before promoting to production.

**Phase to address:** Testing Phase - establish integration test patterns early

**Sources:**
- [AWS Lambda Testing Guide](https://docs.aws.amazon.com/lambda/latest/dg/testing-guide.html)
- [Best practices for testing serverless applications](https://docs.aws.amazon.com/prescriptive-guidance/latest/serverless-application-testing/best-practices.html)

---

### Pitfall 9: API Gateway Custom Domain Missing API Mapping

**What goes wrong:** Custom domain (api.tropicoretreat.com) returns 404 for all requests even though the standard API endpoint works.

**Why it happens:** Creating the domain name resource is not enough - you must also create an API mapping that connects the domain to your API and stage.

**Consequences:**
- Custom domain appears configured but doesn't route traffic
- Standard endpoint works, custom domain doesn't
- Confusing because DNS resolves correctly

**Warning signs:**
- DNS for custom domain resolves to API Gateway
- Requests to custom domain return 404 or "Missing Authentication Token"
- Same request to auto-generated endpoint works

**Prevention:**
```hcl
# 1. Domain name
resource "aws_apigatewayv2_domain_name" "api" {
  domain_name = "api.tropicoretreat.com"
  domain_name_configuration {
    certificate_arn = aws_acm_certificate.api.arn
    endpoint_type   = "REGIONAL"
    security_policy = "TLS_1_2"
  }
  depends_on = [aws_acm_certificate_validation.api]
}

# 2. API mapping - REQUIRED!
resource "aws_apigatewayv2_api_mapping" "api" {
  api_id      = aws_apigatewayv2_api.leads.id
  domain_name = aws_apigatewayv2_domain_name.api.id
  stage       = aws_apigatewayv2_stage.default.id
}

# 3. Route53 record
resource "aws_route53_record" "api" {
  name    = aws_apigatewayv2_domain_name.api.domain_name
  type    = "A"
  zone_id = data.aws_route53_zone.www.zone_id
  alias {
    name                   = aws_apigatewayv2_domain_name.api.domain_name_configuration[0].target_domain_name
    zone_id                = aws_apigatewayv2_domain_name.api.domain_name_configuration[0].hosted_zone_id
    evaluate_target_health = false
  }
}
```

**Detection:** In AWS Console, check API Gateway > Custom domain names > API mappings.

**Phase to address:** Custom Domain Phase

---

### Pitfall 10: SES Receipt Rule Set Not Active

**What goes wrong:** SES receipt rules exist but emails aren't processed. Lambda never invoked.

**Why it happens:** SES requires exactly ONE active receipt rule set. Creating rules is not enough - the rule set must be explicitly activated.

**Consequences:**
- Inbound email channel silently fails
- Emails may bounce or disappear
- No errors in AWS logs

**Warning signs:**
- Receipt rules exist in console but show as inactive
- SES metrics show no receiving activity
- Email sender gets bounce or no response

**Prevention:**
```hcl
resource "aws_ses_receipt_rule_set" "main" {
  rule_set_name = "tropico-inbound-${var.environment}"
}

# CRITICAL: Activate the rule set
resource "aws_ses_active_receipt_rule_set" "main" {
  rule_set_name = aws_ses_receipt_rule_set.main.rule_set_name
}
```

**Detection:** Check SES Console > Email Receiving > Rule Sets - verify one is marked as "Active".

**Phase to address:** SES Inbound Email Phase

---

## Minor Pitfalls

Mistakes that cause annoyance but are quickly fixable.

---

### Pitfall 11: Slack Message Blocks Fail Silently

**What goes wrong:** Slack notification Lambda succeeds but message doesn't appear in channel, or appears with broken formatting.

**Why it happens:** Slack's Block Kit has strict JSON schema requirements. Invalid blocks are silently dropped. AI-generated blocks often have unescaped markdown.

**Consequences:**
- Missing notifications for some leads
- Broken formatting makes notifications hard to read
- Debugging requires trial-and-error with Slack Block Kit Builder

**Warning signs:**
- Lambda returns 200 OK but no Slack message appears
- Some leads get notifications, others don't
- Messages appear but formatting is wrong

**Prevention:**
1. Validate blocks with Slack Block Kit Builder before deployment
2. Escape special characters in dynamic content
3. Use simple text fallback in addition to blocks
4. Log the exact payload sent to Slack for debugging

```javascript
const payload = {
  text: `New lead: ${lead.name}`, // Fallback for notifications
  blocks: [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        // Escape special characters
        text: escapeSlackMarkdown(`*New Lead*\n${lead.name} - ${lead.email}`)
      }
    }
  ]
};
```

**Detection:** Log full Slack API response including any error details.

**Phase to address:** Slack Notification Phase

---

### Pitfall 12: SNS SMS Character Encoding Doubles Message Cost

**What goes wrong:** Simple SMS messages cost 2x because they're sent as multi-part messages.

**Why it happens:** Non-GSM characters (curly quotes, emoji, special symbols) force Unicode encoding, reducing max characters from 160 to 70 per segment.

**Consequences:**
- Doubled SMS costs
- Messages may be truncated unexpectedly
- Professional appearance degraded by split messages

**Warning signs:**
- SMS cost higher than expected
- Messages split mid-sentence
- Word processing characters in message text (curly quotes, em-dashes)

**Prevention:**
1. Sanitize SMS content to GSM-7 character set only
2. Avoid copy-paste from Word/Google Docs (curly quotes)
3. Keep messages under 160 characters
4. Test SMS with character counter that accounts for encoding

```javascript
function sanitizeForSMS(text) {
  return text
    .replace(/['']/g, "'")  // Curly single quotes
    .replace(/[""]/g, '"')  // Curly double quotes
    .replace(/—/g, '-')     // Em-dash
    .replace(/…/g, '...')   // Ellipsis
    .replace(/[^\x20-\x7E]/g, ''); // Remove non-ASCII
}
```

**Detection:** Enable SNS delivery status logging with `number_of_message_parts` attribute.

**Phase to address:** SNS SMS Phase

**Sources:**
- [Amazon SNS SMS Best Practices](https://docs.aws.amazon.com/sns/latest/dg/channels-sms-best-practices.html)

---

### Pitfall 13: Twilio Returns TwiML But Lambda Returns JSON

**What goes wrong:** Twilio webhook receives Lambda response but call handling fails. Caller hears error message.

**Why it happens:** Twilio expects TwiML (XML) responses, not JSON. Lambda default response is JSON.

**Consequences:**
- Calls not handled properly
- Callers hear "application error" message
- Twilio retries, causing multiple Lambda invocations

**Warning signs:**
- Twilio debugger shows TwiML parsing errors
- Lambda logs show 200 response but Twilio shows failure
- Multiple Lambda invocations for single call

**Prevention:**
```javascript
export const handler = async (event) => {
  // Process webhook, create lead...

  // Return TwiML, not JSON
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/xml'  // CRITICAL
    },
    body: `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Thank you for calling Tropico Retreats. We'll call you back soon.</Say>
</Response>`
  };
};
```

**Detection:** Check Twilio debugger for TwiML parsing errors.

**Phase to address:** Twilio Integration Phase

---

## Phase-Specific Prevention Checklist

| Phase | Pitfall | Prevention Action |
|-------|---------|-------------------|
| Project Start | SNS SMS Sandbox | Request production access immediately |
| Project Start | SES Region | Verify us-east-1 supports email receiving (it does) |
| Slack Notifications | Webhook URL Exposure | Set up Secrets Manager, add pre-commit hooks |
| Slack Notifications | Block Kit Failures | Test with Block Kit Builder, add text fallback |
| SES Inbound Email | Rule Set Inactive | Add `aws_ses_active_receipt_rule_set` resource |
| SES Inbound Email | S3 Before Lambda | Order S3 action position=1, Lambda position=2 |
| Twilio Integration | Signature Validation | Preserve empty parameter values |
| Twilio Integration | TwiML Response | Return XML with correct Content-Type |
| SNS SMS | Character Encoding | Sanitize to GSM-7, test message length |
| Custom Domain | Certificate Region | Same region as API (us-east-1) |
| Custom Domain | Missing API Mapping | Add `aws_apigatewayv2_api_mapping` resource |
| Custom Domain | Twilio URL Update | Update Twilio console after domain active |
| Testing | Mock Mismatch | Integration tests against real AWS services |

---

## Integration with Existing System Warnings

The current system has working infrastructure. When adding these features:

1. **DynamoDB Table**: New lead sources (email, phone) use same table. Ensure `source` attribute distinguishes channel.

2. **Notification Lambda**: Currently triggered by DynamoDB streams for INSERT. New channels should create leads the same way to reuse notification flow.

3. **API Gateway**: Adding custom domain doesn't affect existing routes. Deploy incrementally.

4. **SES**: Currently used for sending only. Adding receiving is separate configuration.

5. **IAM Roles**: Existing Lambda role may need additional permissions for new services (Secrets Manager for Slack, S3 for SES email body).

---

*Pitfalls research: 2026-01-25*
*Sources verified against official AWS documentation and Twilio/Slack official docs*
