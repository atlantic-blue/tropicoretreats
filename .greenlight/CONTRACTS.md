# Email CRM Typed Contracts

Every boundary in the Email CRM MVP is defined below with TypeScript types, Zod schemas, input/output shapes, and error cases. These contracts are the source of truth for test writers and implementers.

---

## Boundary 1: Admin Dashboard -> Email Admin API (HTTP)

The HTTP contract between the React frontend and the `tropico-email-admin-${env}` Lambda, mediated by API Gateway with JWT auth.

### 1.1 Send Email

**Endpoint:** `POST /emails/send`
**Auth:** Bearer JWT (Cognito)

```typescript
// --- Request ---

import { z } from 'zod';

export const SendEmailRequestSchema = z.object({
  leadId: z.string().min(1, 'Lead ID is required').max(100),
  to: z.string().email('Invalid recipient email address'),
  subject: z.string().min(1, 'Subject is required').max(500),
  bodyText: z.string().min(1, 'Body text is required').max(100_000),
  bodyHtml: z.string().max(500_000).optional(),
});

export type SendEmailRequest = z.infer<typeof SendEmailRequestSchema>;

// --- Response 201 ---

export interface SendEmailResponse {
  id: string;               // SES message ID
  leadId: string;
  direction: 'outbound';
  fromAddress: string;       // "team@tropicoretreat.com"
  toAddress: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  attachments: [];           // Always empty for outbound MVP
  sentAt: string;            // ISO 8601
  readAt: null;              // Outbound emails don't track readAt
  operator: string;          // JWT claims email or username
  s3Key: null;               // No S3 key for outbound
  createdAt: string;         // ISO 8601
  updatedAt: string;         // ISO 8601
}

// --- Error Responses ---

// 400: { error: string; details?: Record<string, string[]> }
// 404: { error: "Lead not found" }
// 500: { error: "Internal server error" }
```

**Validation rules:**
- `leadId` must reference an existing lead in DynamoDB
- `to` must be a valid email address (Zod `.email()`)
- `subject` max 500 chars
- `bodyText` max 100,000 chars
- `bodyHtml` optional, max 500,000 chars

### 1.2 Get Email Thread

**Endpoint:** `GET /emails/{leadId}?limit=50&cursor=<base64>`
**Auth:** Bearer JWT (Cognito)

```typescript
// --- Query Parameters ---

export interface GetEmailThreadParams {
  leadId: string;            // Path parameter
  limit?: number;            // Query param, default 50, max 100
  cursor?: string;           // Query param, base64-encoded DynamoDB LastEvaluatedKey
}

// --- Response 200 ---

export interface EmailAttachment {
  filename: string;
  s3Key: string;
  contentType: string;
  size: number;              // bytes
}

export type EmailDirection = 'inbound' | 'outbound';

export interface Email {
  id: string;
  leadId: string;
  direction: EmailDirection;
  fromAddress: string;
  toAddress: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  attachments: EmailAttachment[];
  sentAt: string;            // ISO 8601
  readAt: string | null;     // ISO 8601 or null
  operator: string | null;   // Non-null for outbound
  s3Key: string | null;      // Non-null for inbound
  createdAt: string;         // ISO 8601
  updatedAt: string;         // ISO 8601
}

export interface GetEmailThreadResponse {
  emails: Email[];           // Chronological order (oldest first, ScanIndexForward=true)
  nextCursor?: string;       // base64-encoded pagination cursor
  totalCount: number;        // Total emails for this lead
}

// --- Error Responses ---

// 400: { error: "Invalid limit parameter. Must be between 1 and 100." }
// 400: { error: "Invalid pagination cursor" }
// 500: { error: "Internal server error" }
```

**Validation rules:**
- `leadId` path parameter must be non-empty
- `limit` must be 1-100 if provided
- `cursor` must be valid base64-encoded JSON if provided

### 1.3 Mark Emails as Read

**Endpoint:** `PATCH /emails/{leadId}/read`
**Auth:** Bearer JWT (Cognito)

```typescript
// --- Request ---
// Empty body: {}

// --- Response 200 ---

export interface MarkEmailsReadResponse {
  markedCount: number;       // Number of emails marked as read
  leadId: string;
}

// --- Error Responses ---

// 404: { error: "Lead not found" }
// 500: { error: "Internal server error" }
```

**Behaviour:**
- Queries all emails for the lead where `direction = 'inbound'` and `readAt = null`
- Sets `readAt` to current ISO 8601 timestamp on each
- Updates lead record: `unreadEmailCount = 0`
- Returns count of emails marked

---

## Boundary 2: Email Admin API -> SES (Send Email)

The interface between the `emailAdmin` Lambda handler and AWS SES for outbound email delivery.

```typescript
// --- SES SendEmail Parameters ---

export interface CrmSendEmailParams {
  source: string;              // "Tropico Retreats <team@tropicoretreat.com>"
  destination: string;         // Recipient email address
  replyTo: string;             // "team@tropicoretreat.com"
  subject: string;
  bodyText: string;
  bodyHtml?: string;
}

// --- SES SendEmail Result ---

export interface CrmSendEmailResult {
  messageId: string;           // SES-assigned message ID, used as email record ID
}

// --- Function Signature ---

export type SendCrmEmail = (params: CrmSendEmailParams) => Promise<CrmSendEmailResult>;

// --- Error Cases ---

// SES MessageRejected: invalid recipient, sandbox mode, etc.
// SES Throttling: sending rate exceeded
// SES MailFromDomainNotVerified: domain not verified (shouldn't happen in production)
```

**Implementation notes:**
- Uses `@aws-sdk/client-ses` `SendEmailCommand`
- Returns the `MessageId` from the SES response for use as the email record ID
- Source format: `"Tropico Retreats <team@tropicoretreat.com>"`
- `FROM_EMAIL_CRM` environment variable provides `team@tropicoretreat.com`
- Existing `ses.ts` pattern extended; does NOT reuse the existing `sendEmail()` because it needs to return the message ID

---

## Boundary 3: Email Admin API -> DynamoDB (Email CRUD + Lead Metadata)

All DynamoDB operations for email data. These extend the existing `backend/src/lib/dynamodb.ts` module.

### 3.1 Put Email

```typescript
export interface EmailItem {
  PK: string;                  // LEAD#{leadId}
  SK: string;                  // EMAIL#{timestamp}#{messageId}
  GSI1PK: string;              // EMAIL#{direction}
  GSI1SK: string;              // {timestamp}
  id: string;                  // messageId (SES ID for outbound, ULID for inbound)
  leadId: string;
  direction: EmailDirection;   // 'inbound' | 'outbound'
  fromAddress: string;
  toAddress: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  attachments: EmailAttachment[];
  sentAt: string;              // ISO 8601
  readAt: string | null;       // ISO 8601 or null (null = unread)
  operator: string | null;     // Operator email for outbound, null for inbound
  s3Key: string | null;        // S3 raw email key for inbound, null for outbound
  createdAt: string;           // ISO 8601
  updatedAt: string;           // ISO 8601
}

export type PutEmail = (email: EmailItem) => Promise<void>;

// Error: TABLE_NAME not set
// Error: DynamoDB service error (ConditionalCheckFailedException, etc.)
```

### 3.2 Get Emails (Paginated)

```typescript
export interface GetEmailsParams {
  leadId: string;
  limit?: number;              // default 50
  cursor?: string;             // base64-encoded LastEvaluatedKey
}

export interface GetEmailsResult {
  emails: EmailItem[];         // Chronological order (oldest first)
  nextCursor?: string;         // base64-encoded cursor for next page
  totalCount: number;          // Total email count for this lead
}

export type GetEmails = (params: GetEmailsParams) => Promise<GetEmailsResult>;

// DynamoDB Query: PK = LEAD#{leadId}, begins_with(SK, 'EMAIL#'), ScanIndexForward=true
// Error: TABLE_NAME not set
// Error: Invalid pagination cursor (malformed base64)
```

### 3.3 Mark Emails as Read

```typescript
export interface MarkEmailsAsReadResult {
  markedCount: number;
}

export type MarkEmailsAsRead = (leadId: string) => Promise<MarkEmailsAsReadResult>;

// Step 1: Query PK = LEAD#{leadId}, begins_with(SK, 'EMAIL#')
//         with filter: direction = 'inbound' AND attribute_not_exists(readAt) OR readAt = null
// Step 2: Batch UpdateItem on each: SET readAt = :now, updatedAt = :now
// Step 3: Update lead record: SET unreadEmailCount = :zero, updatedAt = :now
// Error: TABLE_NAME not set
// Error: DynamoDB service error
```

### 3.4 Find Lead by Email Address

```typescript
export type FindLeadByEmail = (emailAddress: string) => Promise<Lead | null>;

// DynamoDB Scan with filter:
//   begins_with(SK, 'LEAD#') AND email = :emailLower
// Email address normalized to lowercase before comparison
// Returns first matching lead or null
// Error: TABLE_NAME not set
```

### 3.5 Update Lead Email Metadata

```typescript
export interface UpdateLeadEmailMetadataParams {
  leadId: string;
  lastEmailAt: string;                   // ISO 8601
  incrementUnreadCount?: boolean;        // true for inbound emails, false/omitted for outbound
  resetUnreadCount?: boolean;            // true when marking as read
}

export type UpdateLeadEmailMetadata = (params: UpdateLeadEmailMetadataParams) => Promise<void>;

// DynamoDB UpdateItem:
//   Key: PK = LEAD#{leadId}, SK = LEAD#{leadId}
//   SET lastEmailAt = :lastEmailAt, updatedAt = :now
//   If incrementUnreadCount: ADD unreadEmailCount :one
//   If resetUnreadCount: SET unreadEmailCount = :zero
// ConditionExpression: attribute_exists(PK)
// Error: TABLE_NAME not set
// Error: ConditionalCheckFailedException (lead not found)
```

---

## Boundary 4: SES Receiving -> S3 (Raw Email Storage)

The AWS-managed pipeline from SES receipt rule to S3 bucket. This is an infrastructure contract, not application code.

```typescript
// --- S3 Object Structure ---

export interface RawEmailS3Object {
  bucket: string;              // "tropicoretreat-email-store-${env}"
  key: string;                 // "incoming/${sesMessageId}"
  contentType: string;         // "application/octet-stream" (MIME format)
}

// --- SES Receipt Rule Configuration ---

export interface SesReceiptRuleContract {
  ruleSetName: string;         // "tropico-email-rules-${env}"
  ruleName: string;            // "tropico-email-store-${env}"
  recipients: string[];        // ["tropicoretreat.com"]
  actions: {
    type: 'S3';
    bucketName: string;        // "tropicoretreat-email-store-${env}"
    objectKeyPrefix: string;   // "incoming/"
  }[];
  enabled: true;
  scanEnabled: true;           // Enable SES spam/virus scanning
}

// --- S3 Bucket Policy (SES write permission) ---

// Principal: ses.amazonaws.com
// Action: s3:PutObject
// Resource: arn:aws:s3:::tropicoretreat-email-store-${env}/incoming/*
// Condition: StringEquals aws:SourceAccount = ${accountId}
```

---

## Boundary 5: S3 -> Email Receive Lambda (S3 Event Trigger)

The S3 event notification that triggers the `emailReceive` Lambda when a new raw email is stored.

```typescript
// --- S3 Event (Lambda input) ---

import type { S3Event, S3EventRecord } from 'aws-lambda';

export interface EmailReceiveS3Event {
  Records: Array<{
    eventSource: 'aws:s3';
    eventName: 'ObjectCreated:Put';
    s3: {
      bucket: {
        name: string;          // "tropicoretreat-email-store-${env}"
      };
      object: {
        key: string;           // "incoming/${messageId}"
        size: number;          // bytes
      };
    };
  }>;
}

// --- Lambda Handler Signature ---

export type EmailReceiveHandler = (event: S3Event) => Promise<void>;

// Error cases:
// - S3 object not found (race condition, very rare)
// - S3 GetObject permission denied (IAM misconfiguration)
// - Object too large (>10MB, SES should prevent this)
// - Handler timeout (60s limit)
// - Any unhandled error: retried 3 times, then sent to DLQ
```

**Infrastructure contract:**
- S3 event notification on `s3:ObjectCreated:*` with prefix filter `incoming/`
- Lambda resource-based policy allows `s3.amazonaws.com` to invoke
- Lambda has 60s timeout, 256MB memory
- DLQ: `tropico-email-dlq-${env}` SQS queue with 14-day retention

---

## Boundary 6: Email Receive Lambda -> DynamoDB (Write Email, Match/Create Lead, Update Metadata)

The write operations performed by the `emailReceive` Lambda after parsing an inbound email.

```typescript
// --- Parsed Email (output of MIME parsing, input to DynamoDB operations) ---

export interface ParsedInboundEmail {
  messageId: string;           // ULID generated for this inbound email
  fromAddress: string;         // Normalized to lowercase
  fromName?: string;           // Display name from From header, if available
  toAddress: string;           // Should be team@tropicoretreat.com
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  attachments: ParsedAttachment[];
  sentAt: string;              // Date header from email, ISO 8601
  s3Key: string;               // "incoming/${sesMessageId}" - raw email location
}

export interface ParsedAttachment {
  filename: string;            // Sanitized filename (no path traversal chars)
  content: Buffer;             // Raw attachment content
  contentType: string;         // MIME type
  size: number;                // bytes
}

// --- Operations Sequence ---

// Step 1: Find or create lead
export type FindOrCreateLeadForInbound = (
  email: ParsedInboundEmail
) => Promise<{ lead: Lead; isNew: boolean }>;

// findLeadByEmail(fromAddress) -> Lead | null
// If null: putLead(newLead) with:
//   id: ulid()
//   status: 'NEW'
//   temperature: 'WARM'
//   firstName: fromName?.split(' ')[0] ?? 'Unknown'
//   lastName: fromName?.split(' ').slice(1).join(' ') ?? ''
//   email: fromAddress (lowercase)
//   message: bodyText.slice(0, 5000)
//   createdAt: now
//   updatedAt: now

// Step 2: Store attachments (see Boundary 7)

// Step 3: Write email record
// putEmail(emailItem) where emailItem has:
//   PK: LEAD#{lead.id}
//   SK: EMAIL#{sentAt}#{messageId}
//   direction: 'inbound'
//   readAt: null
//   operator: null

// Step 4: Update lead metadata
// updateLeadEmailMetadata({
//   leadId: lead.id,
//   lastEmailAt: sentAt,
//   incrementUnreadCount: true,
// })

// --- Error Cases ---
// - Lead scan failure: throw -> Lambda retry -> DLQ
// - Lead create failure: throw -> Lambda retry -> DLQ
// - Email record write failure: throw -> Lambda retry -> DLQ
// - Metadata update failure: log error, do NOT throw (email record is more important)
```

---

## Boundary 7: Email Receive Lambda -> S3 (Attachment Storage)

```typescript
// --- S3 Put Parameters ---

export interface StoreAttachmentParams {
  leadId: string;
  messageId: string;
  filename: string;            // Sanitized: /[^a-zA-Z0-9._-]/g replaced with '_'
  content: Buffer;
  contentType: string;
}

export interface StoredAttachment {
  filename: string;
  s3Key: string;               // "attachments/${leadId}/${messageId}/${filename}"
  contentType: string;
  size: number;
}

export type StoreAttachment = (params: StoreAttachmentParams) => Promise<StoredAttachment>;

// S3 PutObject to: s3://tropicoretreat-email-store-${env}/attachments/${leadId}/${messageId}/${filename}
// Error: S3 PutObject failure -> log error, continue (email stored without attachment metadata)
```

**S3 key structure:**
- `incoming/{sesMessageId}` -- raw email from SES
- `attachments/{leadId}/{messageId}/{sanitizedFilename}` -- extracted attachments

---

## Boundary 8: Email Receive Lambda -> SES (Backup Forwarding)

```typescript
// --- Backup Forward Parameters ---

export interface BackupForwardParams {
  originalFrom: string;        // Original sender email
  originalSubject: string;     // Original subject line
  bodyText: string;            // Original plain text body
  leadId: string;              // Matched or newly created lead ID
  receivedAt: string;          // ISO 8601
}

export type SendBackupForward = (params: BackupForwardParams) => Promise<void>;

// Sends via SES SendEmail:
//   Source: "Tropico Retreats <team@tropicoretreat.com>"
//   Destination: BACKUP_FORWARD_EMAIL environment variable
//   Subject: "[Tropico CRM] ${originalSubject}"
//   Body (text):
//     ---
//     From: ${originalFrom}
//     Lead: ${leadId}
//     Received: ${receivedAt}
//     Dashboard: ${ADMIN_DASHBOARD_URL}/leads/${leadId}
//     ---
//     ${bodyText}
//
// Error: SES send failure -> log error, do NOT throw (backup is non-critical)
```

---

## Boundary 9: Admin Dashboard -> React Components (Component Props)

### 9.1 EmailThread

```typescript
export interface EmailThreadProps {
  leadId: string;
  leadEmail: string;           // For pre-populating compose "to" field
  leadName: string;            // For display in compose
}

// Internal behaviour:
// - Calls useEmailThread(leadId) to fetch emails
// - Calls useMarkEmailsRead(leadId) on mount
// - Renders EmailBubble for each email
// - Renders EmailCompose at the bottom
// - Shows loading skeleton while fetching
// - Shows "No emails yet" empty state
// - Shows error state with retry button
```

### 9.2 EmailBubble

```typescript
export interface EmailBubbleProps {
  email: Email;
}

// Rendering rules:
// - direction === 'inbound': left-aligned, gray background
// - direction === 'outbound': right-aligned, blue background
// - Shows: sender name/email, timestamp (relative), subject (only when different from previous)
// - Body displayed as plain text (bodyText), with HTML toggle if bodyHtml exists
// - Attachment list with filename, size, download link (pre-signed URL deferred to future)
// - Unread indicator (dot) if readAt === null
```

### 9.3 EmailCompose

```typescript
export interface EmailComposeProps {
  leadId: string;
  toAddress: string;           // Pre-populated recipient
  leadName: string;            // For display: "Send email to {leadName}"
  lastSubject?: string;        // Auto-populate "Re: {lastSubject}" if available
  onSent?: () => void;         // Callback after successful send
}

// Internal behaviour:
// - Textarea for bodyText (plain text only for MVP)
// - Subject input field (pre-populated with "Re: {lastSubject}" if available)
// - Send button, disabled while mutation is pending
// - Calls useSendEmail() mutation
// - Clears form on success
// - Shows error toast on failure
// - "To" field is read-only display (pre-populated from lead email)
```

---

## Boundary 10: TanStack Query Hooks

### 10.1 useEmailThread

```typescript
export interface UseEmailThreadOptions {
  leadId: string;
  limit?: number;              // default 50
  enabled?: boolean;           // default true
}

export function useEmailThread(options: UseEmailThreadOptions): UseQueryResult<GetEmailThreadResponse>;

// Query key: ['emails', leadId, { limit }]
// Query function: emailsApi.list(leadId, { limit })
// staleTime: 5 * 60 * 1000 (5 minutes, matching existing pattern)
// refetchOnWindowFocus: true
// enabled: options.enabled ?? true
```

### 10.2 useSendEmail

```typescript
export function useSendEmail(leadId: string): UseMutationResult<SendEmailResponse, Error, SendEmailRequest>;

// Mutation function: emailsApi.send(request)
// Optimistic update:
//   onMutate: cancel ['emails', leadId] queries, insert optimistic email at end
//   onError: rollback to previous data
//   onSettled: invalidate ['emails', leadId] and ['leads'] queries
```

### 10.3 useMarkEmailsRead

```typescript
export function useMarkEmailsRead(leadId: string): UseMutationResult<MarkEmailsReadResponse, Error, void>;

// Mutation function: emailsApi.markRead(leadId)
// Optimistic update:
//   onMutate: set all inbound emails' readAt to now in cache, set lead.unreadEmailCount = 0
//   onError: rollback
//   onSettled: invalidate ['emails', leadId], ['lead', leadId], ['leads']
```

---

## Boundary 11: Terraform -> AWS Resources (Infrastructure Contract)

### 11.1 S3 Email Store Bucket

```hcl
# Resource: aws_s3_bucket.email_store
# Name: "tropicoretreat-email-store-${var.environment}"

# Properties:
#   - Private (no public access)
#   - Server-side encryption: AES-256 (aws:kms not needed for MVP)
#   - Versioning: disabled
#   - Lifecycle rules:
#     - Transition incoming/* to GLACIER after 90 days
#     - Delete incoming/* after 365 days
#   - Bucket policy:
#     - Allow ses.amazonaws.com to PutObject on incoming/*
#     - Condition: StringEquals aws:SourceAccount = data.aws_caller_identity.current.account_id
```

### 11.2 DNS Records (Email Authentication)

```hcl
# SPF Record
# Resource: aws_route53_record.spf
# Type: TXT
# Name: tropicoretreat.com
# Value: "v=spf1 include:amazonses.com ~all"

# DMARC Record
# Resource: aws_route53_record.dmarc
# Type: TXT
# Name: _dmarc.tropicoretreat.com
# Value: "v=DMARC1; p=quarantine; rua=mailto:dmarc@tropicoretreat.com; pct=100"

# MX Record
# Resource: aws_route53_record.email_mx
# Type: MX
# Name: tropicoretreat.com
# Value: "10 inbound-smtp.us-east-1.amazonaws.com"
# Note: Production only (count = var.environment == "staging" ? 0 : 1)
```

### 11.3 SES Receipt Rule

```hcl
# Resource: aws_ses_receipt_rule_set.email
# Name: "tropico-email-rules-${var.environment}"

# Resource: aws_ses_active_receipt_rule_set.email
# rule_set_name: aws_ses_receipt_rule_set.email.name

# Resource: aws_ses_receipt_rule.store_email
# Name: "tropico-email-store-${var.environment}"
# rule_set_name: aws_ses_receipt_rule_set.email.name
# recipients: ["tropicoretreat.com"]
# enabled: true
# scan_enabled: true
# s3_action:
#   bucket_name: aws_s3_bucket.email_store.id
#   object_key_prefix: "incoming/"
#   position: 1
```

### 11.4 Email Admin Lambda

```hcl
# Resource: aws_lambda_function.email_admin
# function_name: "tropico-email-admin-${var.environment}"
# runtime: "nodejs22.x"
# architectures: ["arm64"]
# handler: "emailAdmin.handler"
# memory_size: 256
# timeout: 30
# Environment variables:
#   TABLE_NAME: aws_dynamodb_table.leads.name
#   ENVIRONMENT: var.environment
#   FROM_EMAIL_CRM: var.from_email_crm (default "team@tropicoretreat.com")
# Role: aws_iam_role.email_admin_lambda.arn
# Source: backend/dist/emailAdmin.mjs (zipped)
```

### 11.5 Email Receive Lambda

```hcl
# Resource: aws_lambda_function.email_receive
# function_name: "tropico-email-receive-${var.environment}"
# runtime: "nodejs22.x"
# architectures: ["arm64"]
# handler: "emailReceive.handler"
# memory_size: 256
# timeout: 60
# Environment variables:
#   TABLE_NAME: aws_dynamodb_table.leads.name
#   ENVIRONMENT: var.environment
#   EMAIL_BUCKET: aws_s3_bucket.email_store.id
#   FROM_EMAIL_CRM: var.from_email_crm
#   BACKUP_FORWARD_EMAIL: var.backup_forward_email
#   ADMIN_DASHBOARD_URL: "https://${var.admin_domain}"
# Role: aws_iam_role.email_receive_lambda.arn
# Source: backend/dist/emailReceive.mjs (zipped)
```

### 11.6 IAM Roles and Policies

```hcl
# --- Email Admin Lambda Role ---
# Resource: aws_iam_role.email_admin_lambda
# Name: "tropico-email-admin-lambda-${var.environment}"
# Policies:
#   1. ses-send: ses:SendEmail, ses:SendRawEmail
#      Condition: StringEquals ses:FromAddress = var.from_email_crm
#   2. dynamodb-access: PutItem, GetItem, Query, UpdateItem
#      Resource: table ARN + GSI1 index ARN
#   3. cloudwatch-logs: CreateLogGroup, CreateLogStream, PutLogEvents
#      Resource: /aws/lambda/tropico-email-admin-${env}:*

# --- Email Receive Lambda Role ---
# Resource: aws_iam_role.email_receive_lambda
# Name: "tropico-email-receive-lambda-${var.environment}"
# Policies:
#   1. s3-read: s3:GetObject
#      Resource: arn:aws:s3:::tropicoretreat-email-store-${env}/incoming/*
#   2. s3-write: s3:PutObject
#      Resource: arn:aws:s3:::tropicoretreat-email-store-${env}/attachments/*
#   3. dynamodb-access: PutItem, GetItem, Query, Scan, UpdateItem
#      Resource: table ARN + GSI1 index ARN
#   4. ses-send: ses:SendEmail, ses:SendRawEmail (backup forwarding)
#      Condition: StringEquals ses:FromAddress = var.from_email_crm
#   5. cloudwatch-logs: CreateLogGroup, CreateLogStream, PutLogEvents
#      Resource: /aws/lambda/tropico-email-receive-${env}:*
#   6. sqs-dlq: sqs:SendMessage
#      Resource: aws_sqs_queue.email_dlq.arn
```

### 11.7 API Gateway Routes

```hcl
# Integration: aws_apigatewayv2_integration.email_admin
# Type: AWS_PROXY, integration_uri = email_admin Lambda invoke_arn

# Route: POST /emails/send -> email_admin, authorization_type = JWT
# Route: GET /emails/{leadId} -> email_admin, authorization_type = JWT
# Route: PATCH /emails/{leadId}/read -> email_admin, authorization_type = JWT

# Permission: aws_lambda_permission.email_admin_api
# principal = apigateway.amazonaws.com
# source_arn = api execution_arn/*/*
```

### 11.8 SQS Dead Letter Queue

```hcl
# Resource: aws_sqs_queue.email_dlq
# Name: "tropico-email-dlq-${var.environment}"
# message_retention_seconds: 1209600 (14 days)
```

### 11.9 S3 Event Notification

```hcl
# Resource: aws_s3_bucket_notification.email_receive
# bucket: aws_s3_bucket.email_store.id
# lambda_function:
#   lambda_function_arn: aws_lambda_function.email_receive.arn
#   events: ["s3:ObjectCreated:*"]
#   filter_prefix: "incoming/"

# Resource: aws_lambda_permission.email_receive_s3
# principal: s3.amazonaws.com
# source_arn: aws_s3_bucket.email_store.arn
```

### 11.10 Terraform Variables (New)

```hcl
# variable "from_email_crm"
# description: "From email address for CRM emails"
# type: string
# default: "team@tropicoretreat.com"

# variable "backup_forward_email"
# description: "Personal email for backup forwarding of inbound emails"
# type: string
# default: ""
```

---

## Frontend API Client Contract

This is the `admin/src/api/emails.ts` module, parallel to the existing `admin/src/api/leads.ts`.

```typescript
import { fetchWithAuth } from './client';
import type {
  Email,
  SendEmailRequest,
  GetEmailThreadResponse,
  MarkEmailsReadResponse,
  SendEmailResponse,
} from '../types/email';

export interface GetEmailsParams {
  limit?: number;
  cursor?: string;
}

export const emailsApi = {
  send: (request: SendEmailRequest): Promise<SendEmailResponse> =>
    fetchWithAuth<SendEmailResponse>('/emails/send', {
      method: 'POST',
      body: JSON.stringify(request),
    }),

  list: (leadId: string, params?: GetEmailsParams): Promise<GetEmailThreadResponse> => {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.cursor) searchParams.set('cursor', params.cursor);
    const query = searchParams.toString();
    return fetchWithAuth<GetEmailThreadResponse>(
      `/emails/${leadId}${query ? `?${query}` : ''}`
    );
  },

  markRead: (leadId: string): Promise<MarkEmailsReadResponse> =>
    fetchWithAuth<MarkEmailsReadResponse>(`/emails/${leadId}/read`, {
      method: 'PATCH',
      body: JSON.stringify({}),
    }),
};
```

---

## Frontend Types Contract

This is the `admin/src/types/email.ts` module, parallel to the existing `admin/src/types/lead.ts`.

```typescript
export type EmailDirection = 'inbound' | 'outbound';

export interface EmailAttachment {
  filename: string;
  s3Key: string;
  contentType: string;
  size: number;
}

export interface Email {
  id: string;
  leadId: string;
  direction: EmailDirection;
  fromAddress: string;
  toAddress: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  attachments: EmailAttachment[];
  sentAt: string;
  readAt: string | null;
  operator: string | null;
  s3Key: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EmailsResponse {
  emails: Email[];
  nextCursor?: string;
  totalCount: number;
}

export interface SendEmailRequest {
  leadId: string;
  to: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
}

export interface SendEmailResponse extends Email {
  direction: 'outbound';
}

export interface MarkEmailsReadResponse {
  markedCount: number;
  leadId: string;
}
```

---

## Lead Type Extensions

The existing `Lead` interface must be extended with email metadata fields. These are optional to maintain backward compatibility.

### Backend (`backend/src/lib/types.ts`)

```typescript
// Add to existing Lead interface:
export interface Lead {
  // ... existing fields ...

  /** ISO 8601 timestamp of most recent email (inbound or outbound) for sorting */
  lastEmailAt?: string;
  /** Count of unread inbound emails for badge display */
  unreadEmailCount?: number;
}
```

### Frontend (`admin/src/types/lead.ts`)

```typescript
// Add to existing Lead interface:
export interface Lead {
  // ... existing fields ...

  /** ISO 8601 timestamp of most recent email activity */
  lastEmailAt?: string;
  /** Count of unread inbound emails */
  unreadEmailCount?: number;
}
```

---

## Email Parser Contract (MIME Parsing Library)

The `backend/src/lib/emailParser.ts` module wraps the `mailparser` package.

```typescript
import type { ParsedInboundEmail, ParsedAttachment } from './types';

export interface ParseEmailInput {
  rawEmail: Buffer;            // Raw MIME content from S3
  s3Key: string;               // S3 key for reference
}

export interface ParseEmailResult {
  messageId: string;           // ULID (generated, not from headers)
  fromAddress: string;         // Normalized lowercase
  fromName?: string;           // Display name from From header
  toAddress: string;
  subject: string;
  bodyText: string;            // Truncated to 100,000 chars if longer
  bodyHtml?: string;           // HTML sanitized (no script/iframe/event handlers)
  attachments: ParsedAttachment[];
  sentAt: string;              // ISO 8601 from Date header, fallback to now
  s3Key: string;
}

export type ParseEmail = (input: ParseEmailInput) => Promise<ParseEmailResult>;

// Error cases:
// - MIME parse failure (corrupted email): throw ParseError with partial data
// - Missing From header: throw ParseError
// - Missing body: set bodyText to "(empty)"

export class ParseError extends Error {
  constructor(
    message: string,
    public readonly partialData?: Partial<ParseEmailResult>
  ) {
    super(message);
    this.name = 'ParseError';
  }
}
```

**Sanitization rules:**
- HTML body: strip `<script>`, `<iframe>`, `<object>`, `<embed>`, `on*` event handler attributes
- Attachment filenames: replace `/[^a-zA-Z0-9._-]/g` with `_`
- Email addresses: `trim().toLowerCase()`
- Body text: truncate to 100,000 chars (DynamoDB 400KB item limit consideration)
- Body HTML: truncate to 400,000 chars

---

## Slice-to-User-Action Mapping

| Slice | User Actions Enabled |
|-------|---------------------|
| Slice 1: Email Infrastructure + Send | UA1: Send email to a lead |
| Slice 2: Email Thread View | UA3: View email thread per lead |
| Slice 3: Inbound Email Processing | UA2: Receive and view inbound emails, UA4: Auto-create lead from unknown sender |
| Slice 4: Mark Read + Unread Indicators | UA5: See unread indicators and sort by recency |
| Slice 5: Backup Forwarding + Hardening | Completes feature (backup forwarding, DLQ, error handling) |
