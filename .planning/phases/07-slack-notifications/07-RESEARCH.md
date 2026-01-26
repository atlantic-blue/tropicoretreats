# Phase 7: Slack Notifications - Research

**Researched:** 2026-01-26
**Domain:** Slack Webhooks, AWS Secrets Manager, Lambda extensions
**Confidence:** HIGH

## Summary

This research investigates adding Slack notifications to the existing processLeadNotifications Lambda when new leads are submitted. The implementation extends the current DynamoDB Streams-triggered notification system to send rich Block Kit formatted messages to a Slack channel.

The standard approach uses:
1. **@slack/webhook** library - Official Slack SDK for Node.js incoming webhooks
2. **AWS Secrets Manager** - Secure storage for the Slack webhook URL
3. **Block Kit** - Slack's JSON-based UI framework for rich message layouts
4. **Existing Lambda architecture** - Extend processLeadNotifications.ts (no new Lambda required)

**Primary recommendation:** Install `@slack/webhook` (lightweight, typed), store webhook URL in Secrets Manager with caching at Lambda cold start, and use Block Kit sections with emoji indicators for lead temperature. Fetch secret at module load time (outside handler) to minimize API calls.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @slack/webhook | ^7.x | Send Slack notifications | Official SDK, TypeScript types, simple API |
| @aws-sdk/client-secrets-manager | ^3.970+ | Retrieve webhook URL | AWS SDK v3, pre-installed in Lambda runtime |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| none | - | - | No additional libraries needed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @slack/webhook | Native fetch() | fetch() works but loses TypeScript types and error handling |
| Secrets Manager | SSM Parameter Store | SSM cheaper ($0 vs $0.40/secret/month) but Secrets Manager better for webhook URLs per roadmap requirement |
| Secrets Manager | Environment variable | Insecure - visible in Lambda console and logs |

**Installation:**
```bash
cd backend
npm install @slack/webhook
# @aws-sdk/client-secrets-manager is pre-installed in Lambda runtime - mark as external
```

## Architecture Patterns

### Recommended Project Structure
```
backend/
├── src/
│   ├── handlers/
│   │   └── processLeadNotifications.ts  # UPDATE: add Slack notification
│   ├── lib/
│   │   ├── slack.ts                     # NEW: Slack client with secret fetch
│   │   └── secrets.ts                   # NEW: Secrets Manager helper
│   └── templates/
│       └── slackNotification.ts         # NEW: Block Kit message builder
infra/
├── api/
│   ├── notifications.tf                  # UPDATE: add env var for secret name
│   ├── iam.tf                           # UPDATE: add Secrets Manager permission
│   └── secrets.tf                       # NEW: Slack webhook secret
```

### Pattern 1: Secret Retrieval with Caching
**What:** Fetch secret once at cold start, cache for Lambda lifecycle
**When to use:** Any secret that doesn't change during Lambda execution
**Example:**
```typescript
// Source: AWS SDK v3 documentation, AWS Lambda best practices
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';

const secretsClient = new SecretsManagerClient({});

// Cache at module level (survives warm starts)
let cachedWebhookUrl: string | null = null;

export const getSlackWebhookUrl = async (): Promise<string> => {
  if (cachedWebhookUrl) {
    return cachedWebhookUrl;
  }

  const secretName = process.env.SLACK_WEBHOOK_SECRET_NAME;
  if (!secretName) {
    throw new Error('SLACK_WEBHOOK_SECRET_NAME environment variable not set');
  }

  const response = await secretsClient.send(
    new GetSecretValueCommand({ SecretId: secretName })
  );

  if (!response.SecretString) {
    throw new Error('Secret value is empty');
  }

  cachedWebhookUrl = response.SecretString;
  return cachedWebhookUrl;
};
```

### Pattern 2: Slack Webhook Client Initialization
**What:** IncomingWebhook instance created with cached URL
**When to use:** Sending messages to Slack channel
**Example:**
```typescript
// Source: @slack/webhook documentation
import { IncomingWebhook } from '@slack/webhook';
import { getSlackWebhookUrl } from './secrets.js';

let webhookInstance: IncomingWebhook | null = null;

export const getSlackWebhook = async (): Promise<IncomingWebhook> => {
  if (webhookInstance) {
    return webhookInstance;
  }

  const url = await getSlackWebhookUrl();
  webhookInstance = new IncomingWebhook(url);
  return webhookInstance;
};

export const sendSlackNotification = async (
  blocks: unknown[],
  text: string
): Promise<void> => {
  const webhook = await getSlackWebhook();
  await webhook.send({ blocks, text });
};
```

### Pattern 3: Block Kit Lead Notification Message
**What:** Rich formatted message with sections, fields, and temperature emoji
**When to use:** New lead notification to Slack
**Example:**
```typescript
// Source: Slack Block Kit documentation
import type { Lead } from '../lib/types.js';

const TEMPERATURE_EMOJI: Record<string, string> = {
  HOT: ':fire:',      // Hot lead
  WARM: ':sun:',      // Warm lead
  COLD: ':snowflake:', // Cold lead
};

export const buildLeadNotificationBlocks = (
  lead: Lead,
  dashboardUrl: string
): { blocks: unknown[]; text: string } => {
  const displayName = lead.company || `${lead.firstName} ${lead.lastName}`;
  const tempEmoji = TEMPERATURE_EMOJI[lead.temperature] || ':question:';

  // Fallback text for notifications (required)
  const text = `New lead from ${displayName}`;

  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `${tempEmoji} New Lead: ${displayName}`,
        emoji: true,
      },
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Name:*\n${lead.firstName} ${lead.lastName}`,
        },
        {
          type: 'mrkdwn',
          text: `*Email:*\n<mailto:${lead.email}|${lead.email}>`,
        },
        ...(lead.phone
          ? [{ type: 'mrkdwn', text: `*Phone:*\n${lead.phone}` }]
          : []),
        ...(lead.company
          ? [{ type: 'mrkdwn', text: `*Company:*\n${lead.company}` }]
          : []),
      ],
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Message:*\n${lead.message.substring(0, 500)}${lead.message.length > 500 ? '...' : ''}`,
      },
    },
    {
      type: 'divider',
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `Temperature: ${tempEmoji} ${lead.temperature} | <${dashboardUrl}/leads/${lead.id}|View in Dashboard>`,
        },
      ],
    },
  ];

  return { blocks, text };
};
```

### Pattern 4: Error Handling in Lambda Handler
**What:** Graceful failure that doesn't block email notifications
**When to use:** Slack notification in processLeadNotifications handler
**Example:**
```typescript
// Source: Existing processLeadNotifications.ts pattern
// Send Slack notification (non-blocking)
try {
  const { blocks, text } = buildLeadNotificationBlocks(lead, ADMIN_DASHBOARD_URL);
  await sendSlackNotification(blocks, text);
  console.log(`Slack notification sent for lead ${lead.id}`);
} catch (error) {
  console.error(`Failed to send Slack notification for lead ${lead.id}:`, error);
  // Continue processing - Slack failure should not block email notifications
}
```

### Anti-Patterns to Avoid
- **Storing webhook URL in environment variable:** Visible in Lambda console, logged in CloudWatch
- **Creating new Secrets Manager client per invocation:** Unnecessary overhead, use singleton
- **Fetching secret inside handler function:** Adds latency on every cold start and warm invoke
- **Missing fallback text in webhook.send():** Screen readers and notifications won't work
- **Blocking handler on Slack failure:** Should continue with other notifications

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTP POST to Slack | Custom fetch wrapper | @slack/webhook IncomingWebhook | Handles errors, retries, types |
| Block Kit JSON | Manual object building | Template function with typed structure | Consistent, maintainable |
| Secret caching | Manual cache expiry | Module-level variable | Lambda handles cache invalidation on redeploy |
| Rate limit handling | Custom retry logic | Library default behavior | @slack/webhook handles 429 responses |

**Key insight:** The @slack/webhook library is small (one class), well-typed, and handles edge cases. Don't use raw fetch() unless you need to avoid the dependency entirely.

## Common Pitfalls

### Pitfall 1: Missing Fallback Text
**What goes wrong:** Notifications don't show in Slack mobile/desktop alerts
**Why it happens:** Slack requires top-level `text` field for notifications when using blocks
**How to avoid:** Always include `text` property alongside `blocks` in webhook.send()
**Warning signs:** Messages appear in channel but no push notification received

### Pitfall 2: Secret Not Found at Cold Start
**What goes wrong:** Lambda fails immediately with "ResourceNotFoundException"
**Why it happens:** Secret name env var set but secret doesn't exist in Secrets Manager
**How to avoid:** Create secret in Terraform before deploying Lambda update
**Warning signs:** Lambda invocation fails before any code runs

### Pitfall 3: IAM Permission Missing
**What goes wrong:** "AccessDeniedException" when fetching secret
**Why it happens:** Lambda role doesn't have secretsmanager:GetSecretValue permission
**How to avoid:** Add IAM policy with specific secret ARN (not wildcard)
**Warning signs:** Error in CloudWatch: "User is not authorized to perform: secretsmanager:GetSecretValue"

### Pitfall 4: Webhook URL Exposed in Logs
**What goes wrong:** Webhook URL visible in CloudWatch, security risk
**Why it happens:** Logging the error object or full response includes URL
**How to avoid:** Only log error.message, not full error object; never log the URL
**Warning signs:** Can search CloudWatch for "hooks.slack.com" and find results

### Pitfall 5: Slack API Rate Limiting
**What goes wrong:** Messages fail with 429 status during high volume
**Why it happens:** Slack limits to ~1 request per second per webhook
**How to avoid:** For lead volume 50-500/day, unlikely to hit; if needed, add exponential backoff
**Warning signs:** "too_many_requests" errors in logs

### Pitfall 6: Block Kit Field Limit
**What goes wrong:** Message fails with "invalid_blocks" error
**Why it happens:** Section blocks limited to 10 fields, 2 columns
**How to avoid:** Keep fields under 10, split into multiple sections if needed
**Warning signs:** "Section block fields: must have 10 items or fewer" error

## Code Examples

Verified patterns from official sources:

### Terraform: AWS Secrets Manager Secret
```hcl
# Source: Terraform AWS provider documentation
resource "aws_secretsmanager_secret" "slack_webhook" {
  name        = "tropico/slack-webhook-url-${var.environment}"
  description = "Slack incoming webhook URL for lead notifications"
  tags        = local.tags
}

# Note: Secret value must be set manually via AWS console or CLI
# aws secretsmanager put-secret-value --secret-id tropico/slack-webhook-url-production --secret-string "https://hooks.slack.com/services/T.../B.../..."
```

### Terraform: IAM Policy for Secrets Manager Access
```hcl
# Source: AWS documentation
resource "aws_iam_role_policy" "notifications_secrets" {
  name = "secrets-manager"
  role = aws_iam_role.notifications_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue"]
        Resource = aws_secretsmanager_secret.slack_webhook.arn
      }
    ]
  })
}
```

### Terraform: Lambda Environment Variable for Secret Name
```hcl
# Source: Terraform AWS provider documentation
# Add to existing aws_lambda_function.notifications resource
environment {
  variables = {
    # ... existing variables ...
    SLACK_WEBHOOK_SECRET_NAME = aws_secretsmanager_secret.slack_webhook.name
  }
}
```

### TypeScript: Complete Slack Notification Module
```typescript
// backend/src/lib/slack.ts
// Source: @slack/webhook documentation, AWS SDK v3 documentation
import { IncomingWebhook } from '@slack/webhook';
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';

const secretsClient = new SecretsManagerClient({});

// Cache at module level for warm start reuse
let cachedWebhookUrl: string | null = null;
let webhookInstance: IncomingWebhook | null = null;

const getWebhookUrl = async (): Promise<string> => {
  if (cachedWebhookUrl) {
    return cachedWebhookUrl;
  }

  const secretName = process.env.SLACK_WEBHOOK_SECRET_NAME;
  if (!secretName) {
    throw new Error('SLACK_WEBHOOK_SECRET_NAME not configured');
  }

  const response = await secretsClient.send(
    new GetSecretValueCommand({ SecretId: secretName })
  );

  if (!response.SecretString) {
    throw new Error('Slack webhook secret is empty');
  }

  cachedWebhookUrl = response.SecretString;
  return cachedWebhookUrl;
};

export const sendSlackNotification = async (
  blocks: unknown[],
  text: string
): Promise<void> => {
  if (!webhookInstance) {
    const url = await getWebhookUrl();
    webhookInstance = new IncomingWebhook(url);
  }

  await webhookInstance.send({ blocks, text });
};
```

### TypeScript: Error Handling with Specific Error Types
```typescript
// Source: @slack/webhook source code analysis
try {
  await sendSlackNotification(blocks, text);
} catch (error) {
  if (error instanceof Error) {
    // Log only the message, not the full error (may contain URL)
    console.error('Slack notification failed:', error.message);

    // Check for specific error types
    if ('original' in error && error.original) {
      const original = error.original as { response?: { status: number } };
      if (original.response?.status === 429) {
        console.warn('Slack rate limited, message not sent');
      }
    }
  }
  // Don't rethrow - allow other notifications to continue
}
```

### Complete Block Kit Message Structure
```json
{
  "text": "New lead from Acme Corp",
  "blocks": [
    {
      "type": "header",
      "text": {
        "type": "plain_text",
        "text": ":fire: New Lead: Acme Corp",
        "emoji": true
      }
    },
    {
      "type": "section",
      "fields": [
        { "type": "mrkdwn", "text": "*Name:*\nJohn Smith" },
        { "type": "mrkdwn", "text": "*Email:*\n<mailto:john@acme.com|john@acme.com>" },
        { "type": "mrkdwn", "text": "*Phone:*\n+44 7700 900000" },
        { "type": "mrkdwn", "text": "*Company:*\nAcme Corp" }
      ]
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*Message:*\nLooking for a Caribbean retreat for our executive team..."
      }
    },
    { "type": "divider" },
    {
      "type": "context",
      "elements": [
        {
          "type": "mrkdwn",
          "text": "Temperature: :fire: HOT | <https://admin.tropicoretreat.com/leads/01EXAMPLE|View in Dashboard>"
        }
      ]
    }
  ]
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Legacy message attachments | Block Kit blocks | 2019 | Richer formatting, interactive elements |
| SSM Parameter Store | Secrets Manager | 2018 | Better for sensitive URLs, automatic encryption |
| @slack/webhook v6 | @slack/webhook v7+ | 2023 | Node 18+ support, TypeScript 5.3 |
| fetch() to webhook URL | IncomingWebhook class | N/A | Better error handling, types |

**Deprecated/outdated:**
- Legacy message attachments (still work but Block Kit recommended)
- @slack/client (renamed to @slack/web-api for different use case)
- webhook defaults.channel (cannot override channel via webhook)

## Open Questions

Things that couldn't be fully resolved:

1. **Slack Webhook URL Provisioning**
   - What we know: User creates webhook in Slack app settings
   - What's unclear: Whether user already has Slack workspace configured
   - Recommendation: Include setup instructions in plan, user creates webhook before deployment

2. **Lead Source in Slack Message**
   - What we know: Success criteria mentions "source" in message
   - What's unclear: Current Lead type doesn't have explicit source field
   - Recommendation: For Phase 7, source is implicitly "Website Form" - add source field tracking in Phase 9 (Email-to-Lead)

3. **Secrets Manager vs SSM Parameter Store**
   - What we know: Roadmap specifies Secrets Manager; SSM is cheaper
   - What's unclear: Strong reason to prefer one over other
   - Recommendation: Use Secrets Manager per roadmap requirement (NOTIF-03 criterion 4)

## Sources

### Primary (HIGH confidence)
- [@slack/webhook npm package](https://www.npmjs.com/package/@slack/webhook) - Official Slack SDK
- [Slack Incoming Webhooks Guide](https://docs.slack.dev/messaging/sending-messages-using-incoming-webhooks) - Official documentation
- [Slack Block Kit Reference](https://docs.slack.dev/reference/block-kit/blocks/) - Block types and structure
- [AWS SDK v3 Secrets Manager](https://docs.aws.amazon.com/secretsmanager/latest/userguide/retrieving-secrets-javascript.html) - GetSecretValueCommand examples
- [GitHub: node-slack-sdk IncomingWebhook.ts](https://github.com/slackapi/node-slack-sdk/blob/main/packages/webhook/src/IncomingWebhook.ts) - Source for types and error handling

### Secondary (MEDIUM confidence)
- [Terraform aws_secretsmanager_secret](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/secretsmanager_secret) - Resource definition
- [AWS Lambda Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html) - Secret caching patterns
- Existing Phase 3 research - Slack webhook patterns for failure alerts

### Tertiary (LOW confidence)
- Block Kit Builder examples (verified against official Block Kit reference)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - @slack/webhook is official, well-documented
- Architecture: HIGH - Extends existing Lambda, follows codebase patterns
- Secrets Manager: HIGH - AWS SDK v3 patterns verified with official docs
- Block Kit: HIGH - Official documentation with JSON examples
- Terraform: HIGH - Standard resources, verified with registry

**Research date:** 2026-01-26
**Valid until:** 2026-02-26 (30 days - stable libraries and patterns)

## Codebase-Specific Notes

The existing codebase establishes these patterns that MUST be followed:

1. **ESM Module Format:** Use `.mjs` extension via esbuild, ES module imports
2. **External AWS SDK:** Mark `@aws-sdk/*` as external in esbuild.config.js
3. **Client Singleton Pattern:** Initialize clients outside handler (see `backend/src/lib/ses.ts`, `dynamodb.ts`)
4. **Non-Blocking Notifications:** Existing handler catches errors per notification type and continues
5. **Environment Variable Pattern:** Use `process.env.X ?? 'default'` for config
6. **Lambda Handler Location:** `backend/src/handlers/processLeadNotifications.ts`
7. **Terraform Module Structure:** Add resources to `infra/api/` (notifications.tf or new secrets.tf)
8. **Tags:** Use `local.tags` for all resources

### Integration Point

The existing `processLeadNotifications.ts` handler structure:
```typescript
for (const record of event.Records) {
  // ... extract lead ...

  // Send team notification (email)
  try { ... } catch { ... }

  // Send customer auto-reply (email)
  try { ... } catch { ... }

  // ADD: Send Slack notification
  try {
    const { blocks, text } = buildLeadNotificationBlocks(lead, ADMIN_DASHBOARD_URL);
    await sendSlackNotification(blocks, text);
  } catch (error) {
    console.error(`Slack failed for lead ${lead.id}:`, error);
  }
}
```

### Package.json Update
```json
{
  "dependencies": {
    "@slack/webhook": "^7.0.0"
  }
}
```

### esbuild External Addition
The @aws-sdk/client-secrets-manager is already excluded via `@aws-sdk/*` pattern in esbuild.config.js. Only @slack/webhook needs bundling.
