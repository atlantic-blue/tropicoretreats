# Phase 8: SMS Notifications - Research

**Researched:** 2026-01-26
**Domain:** AWS SNS SMS, User Notification Preferences, DynamoDB Schema Design
**Confidence:** HIGH

## Summary

This research investigates adding SMS notifications to the existing lead notification system and implementing user-configurable notification preferences. The implementation extends the processLeadNotifications Lambda (already handling email and Slack) to send SMS alerts via AWS SNS, and adds a new notification preferences system allowing users to control which channels they receive notifications on.

The standard approach uses:
1. **AWS SNS SMS** - Native AWS service for SMS delivery via the @aws-sdk/client-sns package
2. **DynamoDB NotificationPreferences table** - Store user preferences as a new entity type in the existing leads table
3. **libphonenumber-js** - Phone number validation and E.164 formatting
4. **Admin Dashboard Settings UI** - React toggle switches for channel preferences

**Primary recommendation:** Use direct SNS PublishCommand to send SMS to specific phone numbers (no SNS Topics needed for this use case). Store notification preferences in DynamoDB using the existing single-table design with `USER#{userId}` as PK. The preference structure should include `channels: { email: boolean, slack: boolean, sms: boolean }` and `phone: string` (E.164 format). Exit SMS sandbox before production deployment (24-hour approval timeline).

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @aws-sdk/client-sns | ^3.x | Send SMS via SNS | Pre-installed in Lambda runtime, native AWS service |
| libphonenumber-js | ^1.x | Phone number validation | Lightweight (145KB), Google libphonenumber port, E.164 formatting |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @aws-sdk/client-dynamodb | ^3.x | Read/write preferences | Already in codebase for leads |
| @aws-sdk/lib-dynamodb | ^3.x | Document client | Already in codebase |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| SNS Direct Publish | SNS Topic Subscriptions | Topic overkill for 2-3 recipients; direct publish simpler |
| DynamoDB preferences | Cognito custom attributes | Cognito limits to 25 custom attrs; DynamoDB more flexible |
| libphonenumber-js | google-libphonenumber | google-libphonenumber is 420KB vs 145KB |
| DynamoDB preferences | Separate preferences table | Single-table design already established in codebase |

**Installation:**
```bash
cd backend
npm install libphonenumber-js
# @aws-sdk/client-sns is pre-installed in Lambda runtime - mark as external
```

## Architecture Patterns

### Recommended Project Structure
```
backend/
├── src/
│   ├── handlers/
│   │   ├── processLeadNotifications.ts  # UPDATE: add SMS notification
│   │   ├── leadsAdmin.ts                # UPDATE: add preference endpoints
│   │   └── users.ts                     # UPDATE: add phone number to user response
│   ├── lib/
│   │   ├── sms.ts                       # NEW: SNS SMS client
│   │   ├── preferences.ts               # NEW: Notification preferences CRUD
│   │   └── types.ts                     # UPDATE: add NotificationPreferences type
│   └── templates/
│       └── smsNotification.ts           # NEW: SMS message builder
admin/
├── src/
│   ├── pages/
│   │   └── SettingsPage.tsx             # NEW: User settings with notification prefs
│   ├── components/
│   │   └── settings/
│   │       └── NotificationPreferences.tsx  # NEW: Toggle UI for channels
│   └── api/
│       └── preferences.ts               # NEW: Preference API client
infra/
├── api/
│   ├── iam.tf                           # UPDATE: add SNS permissions
│   └── variables.tf                     # OPTIONAL: add SMS settings
```

### Pattern 1: Direct SMS Publishing (No SNS Topic)
**What:** Send SMS directly to phone numbers using PublishCommand
**When to use:** Small number of recipients (< 10), no need for topic subscriptions
**Example:**
```typescript
// Source: AWS SDK v3 documentation
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

const snsClient = new SNSClient({});

export const sendSMS = async (
  phoneNumber: string,  // E.164 format: +14155551234
  message: string
): Promise<void> => {
  await snsClient.send(
    new PublishCommand({
      PhoneNumber: phoneNumber,
      Message: message,
      MessageAttributes: {
        'AWS.SNS.SMS.SMSType': {
          DataType: 'String',
          StringValue: 'Transactional',  // Highest reliability
        },
      },
    })
  );
};
```

### Pattern 2: Notification Preferences in Single-Table Design
**What:** Store user preferences using existing DynamoDB table with USER# prefix
**When to use:** User-specific settings that need fast lookups
**Example:**
```typescript
// Source: DynamoDB single-table design patterns
interface NotificationPreferences {
  PK: string;           // USER#{userId}
  SK: string;           // PREFS#notifications
  userId: string;       // Cognito sub
  channels: {
    email: boolean;     // Default: true
    slack: boolean;     // Default: true (if Slack configured)
    sms: boolean;       // Default: false (requires phone)
  };
  phone?: string;       // E.164 format, optional
  updatedAt: string;    // ISO 8601
}
```

### Pattern 3: SMS Message Template (Concise Format)
**What:** Build SMS messages within character limits
**When to use:** New lead SMS notification
**Example:**
```typescript
// Source: AWS SMS best practices - 160 chars max for GSM
import type { Lead } from '../lib/types.js';

export const buildSmsNotification = (
  lead: Lead,
  shortUrl: string  // Use custom short URL domain
): string => {
  const name = lead.company || `${lead.firstName} ${lead.lastName}`;
  // Keep under 160 GSM characters to avoid multipart billing
  // Format: "Tropico Lead: {name} | {email} | {shortUrl}"
  const base = `Tropico Lead: ${name} | ${lead.email}`;
  const full = `${base} | ${shortUrl}`;

  // Truncate name if needed to fit
  if (full.length > 160) {
    const truncatedName = name.substring(0, name.length - (full.length - 160));
    return `Tropico Lead: ${truncatedName}... | ${lead.email} | ${shortUrl}`;
  }
  return full;
};
```

### Pattern 4: Phone Number Validation
**What:** Validate and format phone numbers to E.164 before saving
**When to use:** Any user-submitted phone number
**Example:**
```typescript
// Source: libphonenumber-js documentation
import { parsePhoneNumberFromString, isValidPhoneNumber } from 'libphonenumber-js';

export const validateAndFormatPhone = (
  phone: string,
  defaultCountry: string = 'US'
): { valid: boolean; formatted?: string; error?: string } => {
  try {
    const parsed = parsePhoneNumberFromString(phone, defaultCountry);

    if (!parsed || !parsed.isValid()) {
      return { valid: false, error: 'Invalid phone number' };
    }

    // Return E.164 format (e.g., +14155551234)
    return { valid: true, formatted: parsed.format('E.164') };
  } catch {
    return { valid: false, error: 'Could not parse phone number' };
  }
};
```

### Pattern 5: Preference-Aware Notification Dispatch
**What:** Check user preferences before sending each notification type
**When to use:** In processLeadNotifications handler
**Example:**
```typescript
// Fetch preferences for SMS-enabled users
const smsRecipients = await getSmsEnabledUsers();

// Send SMS to each recipient (non-blocking)
for (const recipient of smsRecipients) {
  try {
    if (recipient.channels.sms && recipient.phone) {
      const message = buildSmsNotification(lead, shortUrl);
      await sendSMS(recipient.phone, message);
      console.log(`SMS sent to ${recipient.userId}`);
    }
  } catch (error) {
    console.error(`SMS failed for ${recipient.userId}:`, error instanceof Error ? error.message : error);
    // Continue to next recipient
  }
}
```

### Anti-Patterns to Avoid
- **Creating SNS Topic for 2-3 recipients:** Overhead not worth it; use direct publish
- **Storing raw phone numbers:** Always validate and convert to E.164 before storage
- **Sending SMS without checking preferences:** Always check user.channels.sms first
- **Long SMS messages:** Stay under 160 GSM chars to avoid multipart billing
- **Free URL shorteners (bit.ly, tinyurl):** Carriers filter these; use own domain or full URL
- **Storing phone in Cognito only:** DynamoDB gives faster preference lookups
- **Blocking on SMS failure:** Continue processing; SMS is non-critical

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Phone number validation | Custom regex | libphonenumber-js | Country-specific rules, length validation, carrier detection |
| E.164 formatting | Manual string manipulation | libphonenumber-js `format('E.164')` | Handles country codes, removes formatting |
| SMS delivery | Custom HTTP to SMS gateway | AWS SNS PublishCommand | Handles carrier routing, delivery receipts, compliance |
| Character counting | `message.length` | GSM character counter | GSM extended chars count as 2 |
| User preference storage | Cognito custom attributes | DynamoDB | More flexible, no 25-attribute limit |

**Key insight:** Phone number handling is deceptively complex. Different countries have different formats, lengths, and validation rules. libphonenumber-js (based on Google's Android library) handles all edge cases.

## Common Pitfalls

### Pitfall 1: SMS Sandbox Not Removed
**What goes wrong:** SMS only delivered to verified phone numbers in dev/production
**Why it happens:** New AWS accounts start in SMS sandbox mode
**How to avoid:** Request production access via AWS Support before go-live (24-hour approval)
**Warning signs:** SMS works to your phone but not to customers

### Pitfall 2: Invalid Phone Number Format
**What goes wrong:** SNS returns "Invalid parameter: PhoneNumber" error
**Why it happens:** Phone not in E.164 format (+1234567890)
**How to avoid:** Always validate and format with libphonenumber-js before saving/sending
**Warning signs:** Users enter "555-123-4567" instead of "+15551234567"

### Pitfall 3: Message Splits into Multiple Parts
**What goes wrong:** Charged for 2-3 messages instead of 1, message may display oddly
**Why it happens:** Message exceeds 160 GSM chars or uses non-GSM characters
**How to avoid:** Keep messages under 160 chars, avoid special characters (curly quotes, emojis)
**Warning signs:** Messages contain trademark symbols, smart quotes, or are very long

### Pitfall 4: Carrier Filtering Short URLs
**What goes wrong:** SMS not delivered or marked as spam
**Why it happens:** Free URL shorteners (bit.ly, tinyurl) are spam indicators
**How to avoid:** Use your own domain for short URLs, or include full URL if short enough
**Warning signs:** Messages with bit.ly links never arrive

### Pitfall 5: Missing SNS Permissions
**What goes wrong:** "AccessDeniedException" when calling SNS Publish
**Why it happens:** Lambda IAM role missing sns:Publish permission
**How to avoid:** Add sns:Publish permission with Resource "*" (required for SMS)
**Warning signs:** CloudWatch shows access denied for sns:Publish

### Pitfall 6: Spending Limit Exceeded
**What goes wrong:** SMS suddenly stops sending mid-month
**Why it happens:** Default SNS SMS spending limit is $1/month
**How to avoid:** Request spending limit increase before production (separate from sandbox exit)
**Warning signs:** Messages fail with "Monthly quota exceeded"

### Pitfall 7: Preferences Not Found Returns Error
**What goes wrong:** Lambda fails when user has no preferences record
**Why it happens:** User never visited settings page, no preferences in DB
**How to avoid:** Return default preferences object when DB record not found
**Warning signs:** New users don't receive any notifications

## Code Examples

Verified patterns from official sources:

### SNS SMS Client Module
```typescript
// backend/src/lib/sms.ts
// Source: AWS SDK v3 documentation
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

const snsClient = new SNSClient({});

/**
 * Send SMS to a phone number via AWS SNS.
 * Phone number must be in E.164 format (+14155551234).
 *
 * @param phoneNumber - E.164 formatted phone number
 * @param message - SMS message (keep under 160 GSM characters)
 * @throws Error if SNS publish fails
 */
export const sendSMS = async (
  phoneNumber: string,
  message: string
): Promise<void> => {
  try {
    await snsClient.send(
      new PublishCommand({
        PhoneNumber: phoneNumber,
        Message: message,
        MessageAttributes: {
          'AWS.SNS.SMS.SMSType': {
            DataType: 'String',
            StringValue: 'Transactional',
          },
        },
      })
    );
  } catch (error) {
    // Log without exposing phone number
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`SMS send failed: ${message}`);
  }
};
```

### Notification Preferences Types
```typescript
// backend/src/lib/types.ts - ADD to existing file
// Source: DynamoDB single-table design patterns

export interface NotificationChannels {
  email: boolean;
  slack: boolean;
  sms: boolean;
}

export interface NotificationPreferences {
  PK: string;              // USER#{userId}
  SK: string;              // PREFS#notifications
  userId: string;          // Cognito sub
  channels: NotificationChannels;
  phone?: string;          // E.164 format
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_CHANNELS: NotificationChannels = {
  email: true,
  slack: true,
  sms: false,  // Requires phone setup
};
```

### Preferences CRUD Operations
```typescript
// backend/src/lib/preferences.ts
// Source: DynamoDB document client patterns
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import type { NotificationPreferences, NotificationChannels, DEFAULT_CHANNELS } from './types.js';

const TABLE_NAME = process.env.TABLE_NAME ?? 'tropico-leads-production';

/**
 * Get notification preferences for a user.
 * Returns default preferences if none exist.
 */
export const getPreferences = async (
  client: DynamoDBDocumentClient,
  userId: string
): Promise<NotificationPreferences> => {
  const result = await client.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `USER#${userId}`,
        SK: 'PREFS#notifications',
      },
    })
  );

  if (result.Item) {
    return result.Item as NotificationPreferences;
  }

  // Return defaults if no record exists
  return {
    PK: `USER#${userId}`,
    SK: 'PREFS#notifications',
    userId,
    channels: { ...DEFAULT_CHANNELS },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

/**
 * Get all users with SMS enabled for notification dispatch.
 */
export const getSmsEnabledUsers = async (
  client: DynamoDBDocumentClient
): Promise<NotificationPreferences[]> => {
  // Scan for USER# items with SK = PREFS#notifications
  // In production with many users, consider GSI for channel filtering
  const result = await client.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: {
        ':pk': 'PREFS#sms-enabled',
      },
    })
  );

  return (result.Items ?? []) as NotificationPreferences[];
};

/**
 * Update notification preferences for a user.
 */
export const updatePreferences = async (
  client: DynamoDBDocumentClient,
  userId: string,
  channels: Partial<NotificationChannels>,
  phone?: string
): Promise<NotificationPreferences> => {
  const existing = await getPreferences(client, userId);
  const now = new Date().toISOString();

  const updated: NotificationPreferences = {
    ...existing,
    channels: { ...existing.channels, ...channels },
    phone: phone ?? existing.phone,
    updatedAt: now,
    // Add GSI1PK for SMS-enabled query optimization
    ...(channels.sms && phone ? { GSI1PK: 'PREFS#sms-enabled', GSI1SK: userId } : {}),
  };

  await client.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: updated,
    })
  );

  return updated;
};
```

### Terraform: SNS Permissions for Lambda
```hcl
# infra/api/iam.tf - ADD to existing file
# Source: AWS IAM documentation

# SNS SMS permissions for Notification Lambda
resource "aws_iam_role_policy" "notifications_sns" {
  name = "sns-sms"
  role = aws_iam_role.notifications_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["sns:Publish"]
        Resource = "*"  # Required for SMS - cannot scope to specific phone numbers
      }
    ]
  })
}
```

### Admin UI: Notification Preferences Component
```typescript
// admin/src/components/settings/NotificationPreferences.tsx
// Source: React toggle pattern, shadcn/ui Switch component

import { useState } from 'react';
import { Switch } from '@headlessui/react';  // Or your UI library
import { parsePhoneNumberFromString } from 'libphonenumber-js';

interface Props {
  preferences: {
    channels: { email: boolean; slack: boolean; sms: boolean };
    phone?: string;
  };
  onSave: (channels: { email: boolean; slack: boolean; sms: boolean }, phone?: string) => Promise<void>;
}

export function NotificationPreferences({ preferences, onSave }: Props) {
  const [channels, setChannels] = useState(preferences.channels);
  const [phone, setPhone] = useState(preferences.phone ?? '');
  const [phoneError, setPhoneError] = useState('');
  const [saving, setSaving] = useState(false);

  const validatePhone = (value: string): boolean => {
    if (!value && !channels.sms) return true;  // Phone optional if SMS disabled

    const parsed = parsePhoneNumberFromString(value, 'US');
    if (!parsed || !parsed.isValid()) {
      setPhoneError('Please enter a valid phone number');
      return false;
    }
    setPhoneError('');
    return true;
  };

  const handleSave = async () => {
    if (!validatePhone(phone)) return;

    setSaving(true);
    try {
      const parsed = phone ? parsePhoneNumberFromString(phone, 'US') : null;
      await onSave(channels, parsed?.format('E.164'));
    } finally {
      setSaving(false);
    }
  };

  const handleSmsToggle = (enabled: boolean) => {
    if (enabled && !phone) {
      setPhoneError('Phone number required for SMS notifications');
    }
    setChannels({ ...channels, sms: enabled && !!phone });
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium">Notification Preferences</h3>

      <div className="space-y-4">
        {/* Email Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Email Notifications</p>
            <p className="text-sm text-gray-500">Receive lead alerts via email</p>
          </div>
          <Switch
            checked={channels.email}
            onChange={(checked) => setChannels({ ...channels, email: checked })}
          />
        </div>

        {/* Slack Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Slack Notifications</p>
            <p className="text-sm text-gray-500">Receive lead alerts in Slack</p>
          </div>
          <Switch
            checked={channels.slack}
            onChange={(checked) => setChannels({ ...channels, slack: checked })}
          />
        </div>

        {/* SMS Toggle + Phone Input */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">SMS Notifications</p>
              <p className="text-sm text-gray-500">Receive lead alerts via text message</p>
            </div>
            <Switch
              checked={channels.sms}
              onChange={handleSmsToggle}
            />
          </div>

          {(channels.sms || phone) && (
            <div>
              <input
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setPhoneError('');
                }}
                onBlur={() => validatePhone(phone)}
                className="w-full px-3 py-2 border rounded-md"
              />
              {phoneError && (
                <p className="text-sm text-red-500 mt-1">{phoneError}</p>
              )}
            </div>
          )}
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Save Preferences'}
      </button>
    </div>
  );
}
```

### SMS Notification Template
```typescript
// backend/src/templates/smsNotification.ts
// Source: AWS SMS best practices

import type { Lead } from '../lib/types.js';

/**
 * Build concise SMS notification for a new lead.
 * Keeps message under 160 GSM characters to avoid multipart billing.
 *
 * Format: "Tropico Lead: {name} | {email} | {url}"
 */
export const buildSmsNotification = (
  lead: Lead,
  dashboardUrl: string
): string => {
  const name = lead.company || `${lead.firstName} ${lead.lastName}`;
  const shortUrl = `${dashboardUrl}/leads/${lead.id}`;

  // Base message without URL
  const base = `Tropico Lead: ${name}`;
  const withEmail = `${base} | ${lead.email}`;
  const full = `${withEmail} | ${shortUrl}`;

  // If full message fits, use it
  if (full.length <= 160) {
    return full;
  }

  // If message with email fits without URL, use that
  if (withEmail.length <= 160) {
    return withEmail;
  }

  // Truncate name to fit email
  const maxNameLen = 160 - ' | '.length - lead.email.length - 'Tropico Lead: '.length;
  if (maxNameLen > 10) {
    return `Tropico Lead: ${name.substring(0, maxNameLen - 3)}... | ${lead.email}`;
  }

  // Fallback: just email
  return `Tropico Lead: ${lead.email}`;
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| SNS SMS direct | AWS End User Messaging SMS | Nov 2024 | Billing moved; API unchanged |
| Unregistered long codes | 10DLC registration required | 2021 | US requires 10DLC or toll-free for A2P |
| AWS SDK v2 | AWS SDK v3 | 2023+ | Modular imports, better TypeScript |
| Manual E.164 formatting | libphonenumber-js | N/A | Comprehensive validation |

**Deprecated/outdated:**
- Unregistered long codes for US A2P SMS (carriers block them now)
- AWS SDK v2 (end-of-life September 2025)
- SSM Parameter Store for secrets (Secrets Manager preferred for sensitive URLs)

## AWS SNS SMS Specifics

### Pricing (as of 2025-2026)
- US: $0.00645 per message
- UK: Variable by carrier (~$0.04-$0.06)
- Free tier: 100 SMS/month to US numbers
- Additional: $0.045 per OTP verification (if using OTP feature)

### Sandbox Limitations
- Can only send to verified phone numbers
- Default spending limit: $1/month
- No 10DLC/toll-free number restrictions

### Production Requirements
1. Request sandbox exit (24-hour approval)
2. Request spending limit increase (separate request)
3. For US: Consider 10DLC registration for higher volume
4. Toll-free number: $2/month lease

### Character Limits
| Encoding | Single Message | Per Part (multipart) | Maximum |
|----------|----------------|----------------------|---------|
| GSM 03.38 | 160 chars | 153 chars | 1,530 chars |
| Non-GSM (Unicode) | 70 chars | 67 chars | 630 chars |

### GSM 03.38 Safe Characters
- A-Z, a-z, 0-9
- Space, newline
- @, $, !, ?, &, *, #, %, +, -, =
- Avoid: curly quotes, trademark symbols, emojis

## Open Questions

Things that couldn't be fully resolved:

1. **Short URL Strategy**
   - What we know: Free shorteners (bit.ly) get filtered; need own domain
   - What's unclear: Whether full dashboard URL is acceptable or need dedicated short domain
   - Recommendation: Use full URL `https://admin.tropicoretreat.com/leads/{id}` - fits in 160 chars

2. **10DLC Registration**
   - What we know: US carriers require registered origination for A2P SMS
   - What's unclear: Volume threshold before 10DLC required (likely > 1000/day)
   - Recommendation: For low volume (< 50 leads/day), toll-free or default SNS suffices

3. **User Phone Number Source**
   - What we know: Need phone numbers for SMS recipients
   - What's unclear: Whether to use Cognito phone_number attr or DynamoDB preferences
   - Recommendation: Store in DynamoDB preferences for faster lookups, sync from Cognito if available

## Sources

### Primary (HIGH confidence)
- [AWS SDK v3 SNS SMS Documentation](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/sns-examples-sending-sms.html) - PublishCommand examples
- [AWS SNS SMS Sandbox Exit](https://docs.aws.amazon.com/sns/latest/dg/sns-sms-sandbox-moving-to-production.html) - Production access process
- [AWS SMS Character Limits](https://docs.aws.amazon.com/sms-voice/latest/userguide/sms-limitations-character.html) - GSM vs Unicode limits
- [AWS SNS SMS Best Practices](https://docs.aws.amazon.com/sns/latest/dg/channels-sms-best-practices.html) - Compliance, formatting
- [libphonenumber-js npm](https://www.npmjs.com/package/libphonenumber-js) - E.164 validation

### Secondary (MEDIUM confidence)
- [AWS SNS SMS Pricing](https://aws.amazon.com/sns/sms-pricing/) - Per-message costs
- [AWS End User Messaging](https://aws.amazon.com/end-user-messaging/pricing/) - New billing structure
- [DynamoDB Single-Table Design](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/data-modeling-schemas.html) - Preference storage patterns

### Tertiary (LOW confidence)
- React notification preference UI patterns (shadcn/ui, Knock) - validated against existing admin patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - AWS native services, established libraries
- Architecture: HIGH - Extends existing patterns in codebase
- SMS character limits: HIGH - Official AWS documentation
- Sandbox removal: HIGH - Official AWS documentation, 24-hour SLA
- Pricing: MEDIUM - Rates change; verified against AWS pricing page
- UI patterns: MEDIUM - Based on common React patterns

**Research date:** 2026-01-26
**Valid until:** 2026-02-26 (30 days - stable AWS services)

## Codebase-Specific Notes

The existing codebase establishes these patterns that MUST be followed:

1. **ESM Module Format:** Use `.mjs` extension via esbuild, ES module imports
2. **External AWS SDK:** Mark `@aws-sdk/*` as external in esbuild.config.js
3. **Client Singleton Pattern:** Initialize clients outside handler (see `slack.ts`, `ses.ts`)
4. **Non-Blocking Notifications:** Existing handler catches errors per notification type
5. **Single-Table Design:** Leads, Notes, and Preferences share one DynamoDB table
6. **Terraform Module Structure:** Add resources to `infra/api/`
7. **Tags:** Use `local.tags` for all resources

### Integration Points

**processLeadNotifications.ts** - Add SMS after Slack notification:
```typescript
// After Slack notification try/catch block:

// Send SMS notifications to opted-in users
try {
  const smsRecipients = await getSmsEnabledUsers(docClient);
  for (const recipient of smsRecipients) {
    if (recipient.channels.sms && recipient.phone) {
      const message = buildSmsNotification(lead, ADMIN_DASHBOARD_URL);
      await sendSMS(recipient.phone, message);
      console.log(`SMS sent to user ${recipient.userId}`);
    }
  }
} catch (error) {
  console.error('SMS notification error:', error instanceof Error ? error.message : error);
  // Continue - SMS failure should not block other processing
}
```

**leadsAdmin.ts** - Add preference endpoints:
- GET /users/{id}/preferences - Get user notification preferences
- PUT /users/{id}/preferences - Update notification preferences

**DynamoDB Table** - No changes needed; USER# prefix items with PREFS# SK fit existing schema.
