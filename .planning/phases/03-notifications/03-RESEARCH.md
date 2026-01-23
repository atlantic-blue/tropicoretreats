# Phase 3: Notifications - Research

**Researched:** 2026-01-23
**Domain:** AWS SES, DynamoDB Streams, SNS, SQS, Slack Webhooks
**Confidence:** HIGH

## Summary

This research investigates the implementation of email notifications when leads are submitted, using a fully decoupled architecture with DynamoDB Streams triggering a separate notification Lambda. The system needs to send HTML-branded emails to both the team (notification) and customer (auto-reply), with failure alerts via Slack webhook and SMS.

The standard AWS approach uses:
1. **DynamoDB Streams** to capture lead inserts and trigger a Lambda function
2. **AWS SES** to send transactional emails from a verified domain
3. **SQS Dead Letter Queue** for failed notification processing
4. **SNS + Slack Webhook** for immediate failure alerting

**Primary recommendation:** Use `aws_sesv2_email_identity` (SES v2) for domain verification with DKIM, enable DynamoDB Streams with `NEW_IMAGE` view type, and configure `aws_lambda_event_source_mapping` with `destination_config.on_failure` pointing to an SQS DLQ.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @aws-sdk/client-ses | ^3.700.0 | Send emails via SES | AWS SDK v3, pre-installed in Lambda runtime |
| @aws-sdk/util-dynamodb | ^3.700.0 | Unmarshall DynamoDB stream records | Converts AttributeValue to JS objects |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @aws-sdk/client-sns | ^3.700.0 | Publish SMS alerts | Failure notification alerts |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| SES SendEmailCommand | Nodemailer with SES transport | Nodemailer adds abstraction but unnecessary for simple sends |
| SES v1 API | SES v2 API (SendEmailCommand) | v2 is current, v1 deprecated |
| Custom HTML strings | MJML templates | MJML adds build step, overkill for 2 templates |

**Installation:**
```bash
# These are pre-installed in Lambda runtime - mark as external in esbuild
# @aws-sdk/client-ses
# @aws-sdk/client-sns
# @aws-sdk/util-dynamodb
```

Note: Per existing project decisions, @aws-sdk/* packages are marked as external in esbuild since they're pre-installed in the Lambda runtime.

## Architecture Patterns

### Recommended Project Structure
```
backend/
├── src/
│   ├── handlers/
│   │   ├── createLead.ts          # Existing - API handler
│   │   └── processLeadNotifications.ts  # New - Stream handler
│   ├── lib/
│   │   ├── dynamodb.ts            # Existing - DynamoDB client
│   │   ├── ses.ts                 # New - SES client singleton
│   │   ├── types.ts               # Existing - Lead types
│   │   └── validation.ts          # Existing
│   ├── templates/
│   │   ├── teamNotification.ts    # Team email HTML template
│   │   └── customerAutoReply.ts   # Customer email HTML template
│   └── utils/
│       ├── response.ts            # Existing
│       ├── referenceNumber.ts     # Reference number generator
│       └── alerts.ts              # Slack/SNS failure alerts
infra/
├── api/
│   ├── dynamodb.tf                # Update: enable streams
│   ├── lambda.tf                  # Update: add notification Lambda
│   ├── iam.tf                     # Update: add SES, SNS, SQS permissions
│   └── ses.tf                     # New: SES domain verification
│   └── notifications.tf           # New: DLQ, SNS topic, event mapping
```

### Pattern 1: DynamoDB Streams Event Handler
**What:** Lambda handler that processes DynamoDB stream records
**When to use:** Reacting to database changes (INSERT/MODIFY/REMOVE)
**Example:**
```typescript
// Source: AWS Lambda documentation
import type { DynamoDBStreamEvent, DynamoDBRecord } from 'aws-lambda';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import type { AttributeValue } from '@aws-sdk/client-dynamodb';

export const handler = async (event: DynamoDBStreamEvent): Promise<void> => {
  for (const record of event.Records) {
    // Only process INSERT events (new leads)
    if (record.eventName !== 'INSERT') continue;

    // Unmarshall the NewImage to plain JS object
    const newImage = record.dynamodb?.NewImage;
    if (!newImage) continue;

    const lead = unmarshall(
      newImage as Record<string, AttributeValue>
    );

    // Process the lead...
  }
};
```

### Pattern 2: SES Client Singleton
**What:** SES client initialized outside handler for warm start reuse
**When to use:** Any Lambda that sends emails
**Example:**
```typescript
// Source: AWS SDK v3 documentation, following existing dynamodb.ts pattern
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const sesClient = new SESClient({});

export const sendEmail = async (params: {
  to: string[];
  from: string;
  replyTo: string;
  subject: string;
  htmlBody: string;
  textBody: string;
}): Promise<void> => {
  await sesClient.send(
    new SendEmailCommand({
      Source: params.from,
      Destination: { ToAddresses: params.to },
      ReplyToAddresses: [params.replyTo],
      Message: {
        Subject: { Data: params.subject, Charset: 'UTF-8' },
        Body: {
          Html: { Data: params.htmlBody, Charset: 'UTF-8' },
          Text: { Data: params.textBody, Charset: 'UTF-8' },
        },
      },
    })
  );
};
```

### Pattern 3: Slack Webhook Alert
**What:** HTTP POST to Slack incoming webhook URL
**When to use:** Immediate failure notifications
**Example:**
```typescript
// Source: Slack API documentation
const sendSlackAlert = async (message: string, webhookUrl: string): Promise<void> => {
  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: message,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Notification Failure Alert*\n${message}`,
          },
        },
      ],
    }),
  });
};
```

### Anti-Patterns to Avoid
- **Sending emails in the API Lambda:** Blocks user response, couples notification to lead creation
- **Using SES templates in AWS console:** Not version controlled, harder to maintain
- **Inline CSS after HTML generation:** Must inline CSS during template creation, not after
- **Polling for stream changes:** Use event source mapping, not custom polling
- **Hardcoding email addresses:** Use environment variables for all addresses

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| DynamoDB record unmarshalling | Manual type parsing | @aws-sdk/util-dynamodb unmarshall() | Handles all DynamoDB types correctly |
| Reference number generation | Complex UUID logic | Year prefix + crypto.randomBytes | TR-2026-ABC123 format is simple enough |
| Email CSS inlining | Build-time processing | Write inline CSS directly | Only 2 templates, manual inline is fine |
| Stream-to-Lambda trigger | Custom polling | aws_lambda_event_source_mapping | AWS handles scaling, retries, DLQ |
| DKIM DNS records | Manual DNS setup | Terraform aws_ses_domain_dkim + Route53 | Automated, version controlled |

**Key insight:** The AWS SDK v3 and Terraform resources handle all the complexity of DynamoDB streams, SES verification, and failure handling. Don't implement custom solutions for these.

## Common Pitfalls

### Pitfall 1: SES Sandbox Mode
**What goes wrong:** Emails only send to verified addresses, production fails
**Why it happens:** New SES accounts start in sandbox mode with sending restrictions
**How to avoid:**
1. Verify all test recipient addresses during development
2. Request production access before go-live (takes 24-48 hours)
3. Keep sandbox for dev environment, production access for prod
**Warning signs:** "Email address is not verified" errors

### Pitfall 2: DynamoDB Stream Record Format
**What goes wrong:** Cannot access lead data from stream record
**Why it happens:** Stream records use DynamoDB AttributeValue format, not plain JSON
**How to avoid:** Always use `unmarshall()` from @aws-sdk/util-dynamodb
**Warning signs:** Properties like `{ S: "value" }` instead of `"value"`

### Pitfall 3: HTML Email Client Compatibility
**What goes wrong:** Emails look broken in Outlook, Gmail clips content
**Why it happens:** Email clients strip/ignore external CSS, limit total size
**How to avoid:**
1. Use inline CSS for all styles (not `<style>` tags)
2. Keep total email under 100KB
3. Use table-based layouts, not flexbox/grid
4. Use web-safe fonts (Arial, Georgia, Verdana)
5. Include plain text alternative
**Warning signs:** Styles missing in email previews, "[Message clipped]" in Gmail

### Pitfall 4: Event Source Mapping IAM Permissions
**What goes wrong:** Lambda cannot read from DynamoDB stream
**Why it happens:** Missing stream-specific IAM permissions
**How to avoid:** Include all four required permissions:
- dynamodb:GetRecords
- dynamodb:GetShardIterator
- dynamodb:DescribeStream
- dynamodb:ListStreams
**Warning signs:** "Cannot access stream" errors in Lambda logs

### Pitfall 5: Circular Dependency in DLQ Redrive Policy
**What goes wrong:** Terraform plan fails with dependency cycle
**Why it happens:** Main queue references DLQ, DLQ redrive_allow_policy references main queue
**How to avoid:** Use separate `aws_sqs_queue_redrive_policy` resource instead of inline
**Warning signs:** Terraform error about circular dependencies

### Pitfall 6: Timezone in Email Timestamps
**What goes wrong:** Timestamps show UTC instead of London time
**Why it happens:** new Date().toISOString() returns UTC
**How to avoid:** Format with Intl.DateTimeFormat or date-fns-tz for Europe/London
**Warning signs:** Customer sees wrong time in confirmation email

## Code Examples

Verified patterns from official sources:

### Terraform: Enable DynamoDB Streams
```hcl
# Source: Terraform AWS provider documentation
resource "aws_dynamodb_table" "leads" {
  name         = "tropico-leads-${var.environment}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "PK"
  range_key    = "SK"

  # Enable streams for notification trigger
  stream_enabled   = true
  stream_view_type = "NEW_IMAGE"  # Only need new data for notifications

  # ... existing attribute definitions ...

  tags = local.tags
}
```

### Terraform: SES Domain Verification with DKIM
```hcl
# Source: Terraform AWS provider, trussworks/terraform-aws-ses-domain
resource "aws_sesv2_email_identity" "main" {
  email_identity = local.domain_name  # tropicoretreat.com
}

resource "aws_route53_record" "ses_dkim" {
  count   = 3
  zone_id = aws_route53_zone.www.id
  name    = "${aws_sesv2_email_identity.main.dkim_signing_attributes[0].tokens[count.index]}._domainkey"
  type    = "CNAME"
  ttl     = 600
  records = ["${aws_sesv2_email_identity.main.dkim_signing_attributes[0].tokens[count.index]}.dkim.amazonses.com"]
}
```

### Terraform: Lambda Event Source Mapping with DLQ
```hcl
# Source: Terraform AWS provider documentation
resource "aws_lambda_event_source_mapping" "leads_stream" {
  event_source_arn  = aws_dynamodb_table.leads.stream_arn
  function_name     = aws_lambda_function.notifications.arn
  starting_position = "LATEST"
  batch_size        = 10

  # Only process INSERT events (new leads)
  filter_criteria {
    filter {
      pattern = jsonencode({
        eventName = ["INSERT"]
      })
    }
  }

  # Failure handling
  destination_config {
    on_failure {
      destination_arn = aws_sqs_queue.notifications_dlq.arn
    }
  }

  maximum_retry_attempts        = 3
  maximum_record_age_in_seconds = 3600  # 1 hour max age
  bisect_batch_on_function_error = true
}
```

### Terraform: SQS Dead Letter Queue
```hcl
# Source: Terraform AWS provider documentation
resource "aws_sqs_queue" "notifications_dlq" {
  name                      = "tropico-notifications-dlq-${var.environment}"
  message_retention_seconds = 1209600  # 14 days
  tags                      = local.tags
}
```

### Terraform: IAM Policy for Notification Lambda
```hcl
# Source: AWS documentation
resource "aws_iam_role_policy" "notifications_ses" {
  name = "ses-send-email"
  role = aws_iam_role.notifications_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ses:SendEmail",
          "ses:SendRawEmail"
        ]
        Resource = "arn:aws:ses:${var.aws_region}:${data.aws_caller_identity.current.account_id}:identity/${local.domain_name}"
      }
    ]
  })
}

resource "aws_iam_role_policy" "notifications_streams" {
  name = "dynamodb-streams"
  role = aws_iam_role.notifications_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetRecords",
          "dynamodb:GetShardIterator",
          "dynamodb:DescribeStream",
          "dynamodb:ListStreams"
        ]
        Resource = "${aws_dynamodb_table.leads.arn}/stream/*"
      }
    ]
  })
}

resource "aws_iam_role_policy" "notifications_dlq" {
  name = "sqs-dlq"
  role = aws_iam_role.notifications_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "sqs:SendMessage"
        ]
        Resource = aws_sqs_queue.notifications_dlq.arn
      }
    ]
  })
}
```

### TypeScript: Reference Number Generator
```typescript
// TR-2026-ABC123 format
import crypto from 'crypto';

export const generateReferenceNumber = (): string => {
  const year = new Date().getFullYear();
  const randomPart = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `TR-${year}-${randomPart}`;
};
// Example output: TR-2026-A3F7B2
```

### TypeScript: London Timezone Formatting
```typescript
// Format timestamp in London timezone
export const formatLondonTime = (isoString: string): string => {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(date);
};
// Example: "Thursday, 23 January 2026 at 14:30"
```

### TypeScript: HTML Email Template Pattern
```typescript
// Source: HTML email best practices
export const teamNotificationTemplate = (lead: Lead): { html: string; text: string } => {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <tr>
      <td style="padding: 20px;">
        <img src="https://tropicoretreat.com/public/favicon.jpg" alt="Tropico Retreats" width="50" style="display: block;">
      </td>
    </tr>
    <tr>
      <td style="padding: 0 20px 20px;">
        <h1 style="color: #333333; font-size: 24px; margin: 0 0 20px;">New Lead Received</h1>
        <!-- Lead details table with inline styles -->
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `New Lead from ${lead.company || lead.firstName}...`;

  return { html, text };
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| SES v1 API | SES v2 API (aws_sesv2_email_identity) | 2021 | Better DKIM integration |
| aws_ses_domain_identity_verification | DKIM-based verification | 2022 | TXT verification deprecated |
| Manual stream polling | aws_lambda_event_source_mapping | N/A | AWS managed, auto-scaling |
| Single batch retry | bisect_batch_on_function_error | 2020 | Better error isolation |

**Deprecated/outdated:**
- `aws_ses_domain_identity_verification`: Use DKIM verification instead
- @aws-sdk/client-ses-node: Renamed to @aws-sdk/client-ses
- Legacy TXT domain verification: Still works but deprecated in console

## Open Questions

Things that couldn't be fully resolved:

1. **SES Production Access Timing**
   - What we know: Request via AWS console, takes 24-48 hours
   - What's unclear: Exact approval criteria for new accounts
   - Recommendation: Submit request early, include business justification

2. **Slack Webhook URL Storage**
   - What we know: Must be kept secret, passed via environment variable
   - What's unclear: Whether to use AWS Secrets Manager vs SSM Parameter
   - Recommendation: Use SSM Parameter Store for simplicity (matches current pattern)

3. **SNS SMS Phone Number Format**
   - What we know: Must use E.164 format (+44...)
   - What's unclear: Whether team has UK phone numbers for SMS alerts
   - Recommendation: Confirm phone numbers during planning, store in env var

## Sources

### Primary (HIGH confidence)
- [AWS SDK for JavaScript v3 - SES Examples](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/ses-examples-sending-email.html)
- [AWS Lambda DynamoDB Streams Documentation](https://docs.aws.amazon.com/lambda/latest/dg/with-ddb.html)
- [Terraform aws_lambda_event_source_mapping](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_event_source_mapping.html)
- [Terraform aws_ses_domain_dkim](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ses_domain_dkim)
- [AWS IAM Policy for Lambda DynamoDB Streams](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/iam-policy-example-lamda-process-dynamodb-streams.html)
- [Slack Incoming Webhooks API](https://docs.slack.dev/messaging/sending-messages-using-incoming-webhooks/)

### Secondary (MEDIUM confidence)
- [Trussworks terraform-aws-ses-domain module](https://github.com/trussworks/terraform-aws-ses-domain/blob/main/main.tf) - SESv2 patterns
- [Terraform SQS Queue Redrive Policy](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sqs_queue_redrive_policy)
- [HTML Email Best Practices 2025/2026](https://designmodo.com/html-css-emails/)

### Tertiary (LOW confidence)
- Community blog posts on DynamoDB Streams patterns (verified against official docs)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - AWS SDK v3 is current, patterns verified with official docs
- Architecture: HIGH - DynamoDB Streams + Lambda is well-documented AWS pattern
- Pitfalls: HIGH - Based on official docs and known issues
- Terraform patterns: HIGH - Verified with registry documentation
- Email templates: MEDIUM - Best practices vary, core principles verified

**Research date:** 2026-01-23
**Valid until:** 2026-02-23 (30 days - stable AWS patterns)

## Codebase-Specific Notes

The existing codebase already establishes these patterns that MUST be followed:

1. **ESM Module Format:** Use `.mjs` extension, `"type": "module"` in package.json
2. **External AWS SDK:** Mark `@aws-sdk/*` as external in esbuild (pre-installed in Lambda)
3. **Client Singleton Pattern:** Initialize AWS clients outside handler (see `backend/src/lib/dynamodb.ts`)
4. **Environment-Based Naming:** All resources use `${var.environment}` suffix (e.g., `tropico-notifications-dev`)
5. **Lambda Handler File:** Single entry point bundled to `dist/index.mjs` (will need separate entry for notifications Lambda)
6. **Terraform Module Structure:** API resources in `infra/api/` module
7. **Route53 Zone:** Already exists at `aws_route53_zone.www` with zone_id available
8. **Domain:** `local.domain_name = "tropicoretreat.com"` defined in `_locals.tf`
9. **Tags:** Use `local.tags` for all resources (product, environment, gitRepo, managed_by)

### esbuild Configuration Update

The existing `esbuild.config.js` bundles a single handler. For the notifications Lambda, either:
- Add a second entry point to the existing config
- Create a separate build script for the notifications handler

Recommendation: Update `esbuild.config.js` to support multiple entry points:
```javascript
await esbuild.build({
  entryPoints: [
    'src/handlers/createLead.ts',
    'src/handlers/processLeadNotifications.ts',
  ],
  bundle: true,
  // ... rest of config
  outdir: 'dist',  // Change from outfile to outdir for multiple outputs
});
```
