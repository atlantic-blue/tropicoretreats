# Email CRM System Design

## 1. Requirements Analysis

### 1.1 Functional Requirements

**FR-1: Send email to a lead**
- Operator composes an email from the admin dashboard
- Email is sent via SES from `team@tropicoretreat.com`
- Outbound email is recorded in DynamoDB linked to the lead
- Subject auto-populated with `Re: <original subject>` for replies
- Optimistic UI update on send

**FR-2: Receive and view inbound emails**
- Emails sent to `team@tropicoretreat.com` arrive via SES receiving
- Raw email stored in S3 for archival
- MIME parsed to extract from, to, subject, body (text + HTML), attachments
- Attachments stored in S3 under structured key path
- Email record written to DynamoDB, matched to a lead by sender address
- Backup forwarding to a configurable personal email address

**FR-3: View email thread per lead**
- Chronological conversation view (oldest first) when clicking on a lead
- Inbound emails left-aligned, outbound emails right-aligned (chat-style)
- Shows: sender, timestamp, subject (when it changes), body preview
- Marks unread emails as read when the thread is viewed

**FR-4: Auto-create lead from unknown sender**
- Inbound email from an address not matching any existing lead creates a new lead
- New lead populated with: email address, name from email headers (if available), message body as message field
- Lead created with status `NEW`, temperature `WARM`

**FR-5: Unread indicators and sort by recency**
- Lead list shows unread badge when lead has unread emails
- Leads sortable by `lastEmailAt` (most recent email activity)
- Last email preview (~100 chars) shown on lead card

### 1.2 Non-Functional Requirements

| Requirement | Target |
|---|---|
| Email delivery latency (outbound) | < 5 seconds from user click to SES acceptance |
| Email processing latency (inbound) | < 30 seconds from SES receipt to dashboard visibility |
| Email storage retention | Indefinite in DynamoDB; raw email in S3 with Glacier transition at 90 days |
| Availability | Same as existing system (Lambda + DynamoDB on-demand) |
| Concurrent operators | Up to 5 simultaneous dashboard users |
| Email body size limit | 10 MB (SES receiving limit) |
| Attachment storage | S3 with pre-signed URL access |

### 1.3 Constraints

- All Lambda handlers in TypeScript, Node.js 22, ESM via esbuild
- SES receiving only in us-east-1 (current region)
- Must use existing Cognito JWT auth for API endpoints
- Email domain: `tropicoretreat.com` (Route53 + SES domain identity + DKIM already verified)
- DNS records needed: SPF (TXT), DMARC (TXT), MX (for receiving)
- Must integrate with existing DynamoDB single-table design
- SES sandbox removal may take 24 hours (send to verified addresses only during sandbox)
- Existing response helpers (`ok()`, `created()`, `badRequest()`, etc.) must be reused
- Existing `fetchWithAuth<T>()` client pattern must be reused
- Naming convention: `tropico-<component>-${environment}`

### 1.4 Out of Scope (Deferred)

- Rich text editor (basic textarea only for MVP)
- Send-side attachment upload (receive-side attachments are handled)
- Thread matching via In-Reply-To/References headers
- CRM sync, calendar integration, WhatsApp improvements
- Email templates/signatures
- Email scheduling (send later)
- Bulk email sending
- Email analytics/tracking (open rates, click rates)

---

## 2. Architecture

### 2.1 High-Level Architecture

The Email CRM adds two new data paths to the existing system:

**Outbound (operator sends email):**
```
Admin Dashboard -> API Gateway (JWT auth) -> emailAdmin Lambda -> SES SendEmail -> recipient
                                                              \-> DynamoDB (email record)
                                                              \-> DynamoDB (lead.lastEmailAt update)
```

**Inbound (client sends email to team@tropicoretreat.com):**
```
Internet -> SES Receiving -> S3 (raw email) -> S3 Event -> emailReceive Lambda -> DynamoDB (email record)
                                                                                -> DynamoDB (lead match/create + lastEmailAt)
                                                                                -> S3 (attachments)
                                                                                -> SES (backup forward)
```

### 2.2 Component Placement

Following the existing codebase structure:

| Component | Location | Rationale |
|---|---|---|
| Email admin handler (send, list, mark-read) | `backend/src/handlers/emailAdmin.ts` | Multi-route pattern matches `leadsAdmin.ts` for admin API endpoints |
| Email receive handler | `backend/src/handlers/emailReceive.ts` | Event-driven handler matches `processLeadNotifications.ts` pattern |
| Email DynamoDB functions | `backend/src/lib/dynamodb.ts` (extend) | All DynamoDB access in single module matches existing pattern |
| Email types | `backend/src/lib/types.ts` (extend) | All types in single module matches existing pattern |
| Email validation schemas | `backend/src/lib/validation.ts` (extend) | All Zod schemas in single module matches existing pattern |
| MIME parsing | `backend/src/lib/emailParser.ts` (new) | Isolated library concern, single responsibility |
| Email API client functions | `admin/src/api/emails.ts` (new) | Parallel to `admin/src/api/leads.ts` |
| Email types (frontend) | `admin/src/types/email.ts` (new) | Parallel to `admin/src/types/lead.ts` |
| Email thread component | `admin/src/components/emails/EmailThread.tsx` (new) | Feature-grouped components |
| Email compose component | `admin/src/components/emails/EmailCompose.tsx` (new) | Feature-grouped components |
| Email hooks | `admin/src/hooks/useEmails.ts` (new) | TanStack Query hooks for email data |
| Terraform email infra | `infra/api/email.tf` (new) | Feature-grouped Terraform matching flat file convention |
| Terraform email IAM | `infra/api/iam.tf` (extend) | All IAM in single file matches existing pattern |
| Terraform DNS records | `infra/api/ses.tf` (extend) | SES records in existing SES file |

### 2.3 Lambda Architecture Decision

Two Lambda functions:

1. **`tropico-email-admin-${env}`** - Multi-route, API Gateway triggered, JWT protected
   - `POST /emails/send` - Send email to a lead
   - `GET /emails/{leadId}` - Get email thread for a lead
   - `PATCH /emails/{leadId}/read` - Mark emails as read

2. **`tropico-email-receive-${env}`** - Event-driven, S3 triggered
   - Triggered by S3 PutObject in the email store bucket
   - Parses MIME, matches lead, stores email record, forwards backup

This follows the existing pattern: multi-route Lambda for admin API endpoints (like `leadsAdmin`), separate Lambda for event-driven processing (like `processLeadNotifications`).

---

## 3. Data Model

### 3.1 DynamoDB Schema — Email Items

Emails live in the existing `tropico-leads-${env}` table (single-table design). This keeps email queries co-located with leads for efficient access patterns.

**Email Item:**

| Attribute | Type | Value | Purpose |
|---|---|---|---|
| `PK` | String | `LEAD#<leadId>` | Partition key — co-located with lead |
| `SK` | String | `EMAIL#<timestamp>#<messageId>` | Sort key — chronological ordering |
| `GSI1PK` | String | `EMAIL#<direction>` | GSI for querying by direction (future use) |
| `GSI1SK` | String | `<timestamp>` | GSI sort by time |
| `id` | String | `<messageId>` | SES message ID (outbound) or generated ULID (inbound) |
| `leadId` | String | `<leadId>` | Denormalized lead reference |
| `direction` | String | `inbound` or `outbound` | Email direction |
| `fromAddress` | String | email address | Sender address |
| `toAddress` | String | email address | Recipient address |
| `subject` | String | email subject | Subject line |
| `bodyText` | String | plain text body | Plain text version |
| `bodyHtml` | String | HTML body | HTML version (optional) |
| `attachments` | List | `[{filename, s3Key, contentType, size}]` | Attachment metadata |
| `sentAt` | String | ISO 8601 | When the email was sent |
| `readAt` | String or null | ISO 8601 or null | When the email was read (null = unread) |
| `operator` | String or null | operator email/name | Who sent it (outbound only) |
| `s3Key` | String or null | S3 object key | Raw email location in S3 (inbound only) |
| `createdAt` | String | ISO 8601 | Record creation timestamp |
| `updatedAt` | String | ISO 8601 | Record update timestamp |

### 3.2 Lead Record Updates

The existing Lead type needs two new optional fields:

| Attribute | Type | Purpose |
|---|---|---|
| `lastEmailAt` | String (ISO 8601) or undefined | Timestamp of most recent email (inbound or outbound) for sorting |
| `unreadEmailCount` | Number or undefined | Count of unread inbound emails for badge display |

These are denormalized onto the lead record and updated atomically when emails are sent/received/read.

### 3.3 Access Patterns

| Access Pattern | Key Condition | Use Case |
|---|---|---|
| Get all emails for a lead | `PK = LEAD#<leadId> AND begins_with(SK, 'EMAIL#')` | Email thread view |
| Get all emails for a lead (paginated) | Same + `ScanIndexForward=true` + `Limit` | Paginated thread |
| Get lead with email metadata | `PK = LEAD#<leadId> AND SK = LEAD#<leadId>` | Lead card with unread count |
| Find lead by email address | Scan with filter `email = :addr` (or GSI2 if needed) | Inbound email matching |
| Sort leads by recent email | Client-side sort on `lastEmailAt` (existing scan pattern) | Lead list sorting |

### 3.4 Lead Matching for Inbound Email

For the MVP, lead matching uses a Scan + filter on the `email` attribute. This is acceptable because:

- The dataset is small (~100 leads, per existing code comments)
- The existing `getLeads()` already uses Scan for the same table
- Adding a GSI for email lookup would be premature optimization

If the dataset grows, a GSI with `GSI2PK = EMAIL#<normalized-email>` can be added later without application changes.

---

## 4. API Surface

### 4.1 Send Email

```
POST /emails/send
Authorization: Bearer <JWT>

Request Body:
{
  "leadId": "01HZ...",           // Required - ULID of the lead
  "to": "client@example.com",    // Required - recipient email
  "subject": "Re: Retreat Inquiry", // Required - email subject
  "bodyText": "Hello...",        // Required - plain text body
  "bodyHtml": "<p>Hello...</p>"  // Optional - HTML body
}

Response 201:
{
  "id": "<messageId>",
  "leadId": "01HZ...",
  "direction": "outbound",
  "fromAddress": "team@tropicoretreat.com",
  "toAddress": "client@example.com",
  "subject": "Re: Retreat Inquiry",
  "bodyText": "Hello...",
  "bodyHtml": "<p>Hello...</p>",
  "sentAt": "2026-02-26T12:00:00.000Z",
  "operator": "admin@tropicoretreat.com",
  "createdAt": "2026-02-26T12:00:00.000Z",
  "updatedAt": "2026-02-26T12:00:00.000Z"
}

Response 400: { "error": "Validation failed", "details": {...} }
Response 404: { "error": "Lead not found" }
Response 500: { "error": "Internal server error" }
```

### 4.2 Get Email Thread

```
GET /emails/{leadId}?limit=50&cursor=<base64>
Authorization: Bearer <JWT>

Response 200:
{
  "emails": [
    {
      "id": "<messageId>",
      "leadId": "01HZ...",
      "direction": "inbound",
      "fromAddress": "client@example.com",
      "toAddress": "team@tropicoretreat.com",
      "subject": "Retreat Inquiry",
      "bodyText": "We're interested...",
      "bodyHtml": null,
      "attachments": [
        {
          "filename": "proposal.pdf",
          "s3Key": "attachments/01HZ.../abc123/proposal.pdf",
          "contentType": "application/pdf",
          "size": 245000
        }
      ],
      "sentAt": "2026-02-25T10:00:00.000Z",
      "readAt": "2026-02-25T11:00:00.000Z",
      "operator": null,
      "createdAt": "2026-02-25T10:00:05.000Z",
      "updatedAt": "2026-02-25T11:00:00.000Z"
    }
  ],
  "nextCursor": "<base64>",
  "totalCount": 12
}
```

### 4.3 Mark Emails as Read

```
PATCH /emails/{leadId}/read
Authorization: Bearer <JWT>

Request Body: {} (empty - marks all unread emails for this lead as read)

Response 200:
{
  "markedCount": 3,
  "leadId": "01HZ..."
}
```

### 4.4 API Gateway Route Table (Complete)

| Method | Path | Lambda | Auth | Description |
|---|---|---|---|---|
| POST | /leads | tropico-create-lead | None | Create lead (public form) |
| GET | /leads | tropico-leads-admin | JWT | List leads |
| GET | /leads/{id} | tropico-leads-admin | JWT | Get lead detail |
| PATCH | /leads/{id} | tropico-leads-admin | JWT | Update lead |
| POST | /leads/{id}/notes | tropico-leads-admin | JWT | Add note |
| PATCH | /leads/{id}/notes/{noteId} | tropico-leads-admin | JWT | Edit note |
| GET | /users | tropico-users | JWT | List users |
| **POST** | **/emails/send** | **tropico-email-admin** | **JWT** | **Send email** |
| **GET** | **/emails/{leadId}** | **tropico-email-admin** | **JWT** | **Get thread** |
| **PATCH** | **/emails/{leadId}/read** | **tropico-email-admin** | **JWT** | **Mark read** |

---

## 5. Email Flows

### 5.1 Outbound Flow (Operator Sends Email)

```
1. Operator types email in dashboard compose box
2. Dashboard calls POST /emails/send with JWT
3. emailAdmin Lambda validates request body (Zod schema)
4. Lambda verifies lead exists (getLead)
5. Lambda calls SES SendEmail:
   - Source: "Tropico Retreats <team@tropicoretreat.com>"
   - Destination: lead's email address
   - ReplyTo: team@tropicoretreat.com
6. Lambda writes email record to DynamoDB (PK=LEAD#<leadId>, SK=EMAIL#<ts>#<msgId>)
7. Lambda updates lead record: lastEmailAt = now
8. Lambda returns 201 with email record
9. Dashboard performs optimistic update, then invalidates query
```

**Error handling:**
- If SES send fails, return 500 to dashboard (email is not recorded)
- If DynamoDB write fails after SES send, log error and return 500 (orphaned email in SES, but acceptable for MVP -- email was delivered, record can be reconciled)

### 5.2 Inbound Flow (Client Sends Email)

```
1. Client sends email to team@tropicoretreat.com
2. SES receives email (MX record routing)
3. SES receipt rule:
   a. Stores raw email in S3: s3://tropicoretreat-email-store-${env}/incoming/<messageId>
   b. S3 event triggers emailReceive Lambda
4. emailReceive Lambda:
   a. Reads raw email from S3
   b. Parses MIME with mailparser: extracts from, to, subject, body, attachments
   c. Extracts sender email address
   d. Searches DynamoDB for lead with matching email (scan + filter)
   e. If no match: creates new lead (auto-create) with status=NEW, temperature=WARM
   f. Stores attachments in S3: attachments/<leadId>/<messageId>/<filename>
   g. Writes email record to DynamoDB (direction=inbound, readAt=null)
   h. Updates lead record: lastEmailAt=now, unreadEmailCount += 1
   i. Forwards notification copy to backup personal email (env var)
5. Dashboard auto-refreshes via TanStack Query staleTime (or manual refresh)
```

**Error handling:**
- If MIME parsing fails, log error, store raw S3 key reference, still create email record with error flag
- If lead matching scan fails, log error and re-throw (Lambda retry with SQS DLQ)
- If backup forwarding fails, log error but do not block main processing
- Maximum 3 retries via Lambda event source mapping, then DLQ

### 5.3 Mark as Read Flow

```
1. Operator opens email thread for a lead (navigates to lead detail page)
2. Dashboard calls PATCH /emails/{leadId}/read
3. emailAdmin Lambda queries all unread emails for this lead
   (PK=LEAD#<leadId>, begins_with(SK, 'EMAIL#'), filter readAt=null AND direction='inbound')
4. Lambda batch-updates each unread email: readAt = now
5. Lambda updates lead record: unreadEmailCount = 0
6. Returns count of marked emails
7. Dashboard invalidates lead query (refreshes unread badge)
```

### 5.4 Backup Forwarding

Every inbound email is forwarded to a configurable personal email address (environment variable `BACKUP_FORWARD_EMAIL`). This ensures operators never miss an email even if the dashboard is down.

The forwarded email includes:
- Original subject with `[Tropico CRM]` prefix
- Original body
- Metadata header: original sender, matched lead ID, timestamp
- Attachments are NOT forwarded (too large); instead, a link to the admin dashboard lead page is included

---

## 6. Security

### 6.1 Email Authentication (DNS)

Three DNS records are required for email deliverability and security:

**SPF Record (TXT):**
```
Type: TXT
Name: tropicoretreat.com
Value: "v=spf1 include:amazonses.com ~all"
```
This tells receiving mail servers that Amazon SES is authorized to send on behalf of tropicoretreat.com. The `~all` soft-fail ensures other senders are flagged but not rejected.

Note: The existing Google verification TXT record is on the same domain. Route53 supports multiple TXT records for the same name, but they must be in the same record resource. The SPF value will be added as an additional string in the existing TXT record, or as a separate TXT record if there is no collision.

**DMARC Record (TXT):**
```
Type: TXT
Name: _dmarc.tropicoretreat.com
Value: "v=DMARC1; p=quarantine; rua=mailto:dmarc@tropicoretreat.com; pct=100"
```
DMARC policy set to `quarantine` (not `reject`) for the initial rollout. This allows monitoring of alignment failures before tightening. Aggregate reports sent to a dedicated address.

**MX Record:**
```
Type: MX
Name: tropicoretreat.com
Value: 10 inbound-smtp.us-east-1.amazonaws.com
```
Routes inbound email for `tropicoretreat.com` to SES receiving in us-east-1.

**DKIM:** Already configured and verified (3 CNAME records exist in `infra/api/ses.tf`).

### 6.2 IAM Policies (Least Privilege)

**Email Admin Lambda IAM Role:**
- `ses:SendEmail`, `ses:SendRawEmail` - Scoped to `FromAddress = team@tropicoretreat.com`
- `dynamodb:PutItem`, `dynamodb:GetItem`, `dynamodb:Query`, `dynamodb:UpdateItem` - Scoped to table ARN + GSI
- `logs:CreateLogGroup`, `logs:CreateLogStream`, `logs:PutLogEvents` - Scoped to log group ARN

**Email Receive Lambda IAM Role:**
- `s3:GetObject` - Scoped to email store bucket ARN + `incoming/*` prefix
- `s3:PutObject` - Scoped to email store bucket ARN + `attachments/*` prefix
- `dynamodb:PutItem`, `dynamodb:GetItem`, `dynamodb:Query`, `dynamodb:Scan`, `dynamodb:UpdateItem` - Scoped to table ARN + GSI
- `ses:SendEmail`, `ses:SendRawEmail` - Scoped to `FromAddress = team@tropicoretreat.com` (for backup forwarding)
- `logs:CreateLogGroup`, `logs:CreateLogStream`, `logs:PutLogEvents` - Scoped to log group ARN

**SES Receiving Permission:**
- S3 bucket policy allowing SES to PutObject
- Lambda resource-based policy allowing S3 to invoke

### 6.3 Input Validation

All API inputs validated with Zod schemas before processing:

**Send Email Schema:**
```typescript
const SendEmailSchema = z.object({
  leadId: z.string().min(1).max(100),
  to: z.string().email(),
  subject: z.string().min(1).max(500),
  bodyText: z.string().min(1).max(100000),
  bodyHtml: z.string().max(500000).optional(),
});
```

**Inbound email sanitization:**
- HTML body sanitized before storage (strip `<script>`, `<iframe>`, event handlers)
- Attachment filenames sanitized (remove path traversal characters)
- Email addresses normalized to lowercase for matching
- Body size capped at DynamoDB item limit considerations (400KB total item size)

### 6.4 S3 Security

- Email store bucket: private, no public access
- Server-side encryption: AES-256 (S3 managed keys)
- Attachment access via pre-signed URLs only (15-minute expiry)
- Lifecycle policy: transition to Glacier after 90 days, delete after 365 days
- Bucket policy restricts PutObject to SES service principal and Lambda execution role

### 6.5 Data Privacy

- Email bodies stored in DynamoDB (encrypted at rest by default)
- Raw emails in S3 (encrypted at rest with SSE-S3)
- No email content logged (only metadata: leadId, messageId, direction)
- Operator JWT sub logged for audit trail on outbound emails

---

## 7. Error Handling

### 7.1 Outbound Errors

| Error | Handling | User Experience |
|---|---|---|
| Invalid request body | Return 400 with Zod error details | Form validation error shown |
| Lead not found | Return 404 | "Lead not found" toast |
| SES send failure (throttling) | Return 500, log error | "Failed to send email" toast, retry button |
| SES send failure (bounce) | Return 500, log error with bounce reason | "Failed to send email" toast |
| DynamoDB write failure after SES success | Log error, return 500 | "Email sent but failed to record" (acceptable for MVP) |
| SES sandbox - unverified recipient | Return 400 with specific message | "Recipient not verified (sandbox mode)" |

### 7.2 Inbound Errors

| Error | Handling | User Experience |
|---|---|---|
| MIME parse failure | Log error, store partial record with `parseError` flag | Email appears with "Parse error" indicator |
| S3 read failure | Log error, Lambda retry (3x) then DLQ | Email delayed; operator notified via DLQ alarm |
| Lead matching scan failure | Log error, Lambda retry (3x) then DLQ | Email delayed |
| Auto-create lead failure | Log error, Lambda retry (3x) then DLQ | Email delayed |
| DynamoDB write failure | Log error, Lambda retry (3x) then DLQ | Email delayed |
| Backup forward failure | Log error, continue processing | No user impact; alarm on CloudWatch |
| S3 attachment storage failure | Log error, store email without attachments | Attachments missing but email visible |

### 7.3 Read/Thread Errors

| Error | Handling | User Experience |
|---|---|---|
| Lead has no emails | Return 200 with empty array | "No emails yet" empty state |
| Mark-read on nonexistent lead | Return 404 | Silent (mark-read is fire-and-forget from UI) |
| DynamoDB query timeout | Return 500, log | "Failed to load emails" with retry |

### 7.4 Dead Letter Queue

Failed inbound email processing goes to `tropico-email-dlq-${env}` SQS queue:
- 14-day retention
- CloudWatch alarm when messages appear
- Manual investigation and replay via console or CLI

---

## 8. Deployment

### 8.1 Terraform Changes

**New file: `infra/api/email.tf`**
Contains all email-specific infrastructure:
- S3 bucket for email storage (`tropicoretreat-email-store-${env}`)
- S3 bucket policy (SES PutObject permission)
- S3 lifecycle rules (Glacier at 90 days)
- SES receipt rule set and receipt rule
- Lambda function: `tropico-email-admin-${env}`
- Lambda function: `tropico-email-receive-${env}`
- Lambda permissions (S3 invoke, API Gateway invoke)
- S3 event notification -> Lambda
- SQS dead letter queue for email processing
- CloudWatch log groups
- API Gateway integration, routes, and authorizer references

**Modified file: `infra/api/ses.tf`**
Add:
- SPF TXT record
- DMARC TXT record
- MX record for receiving

**Modified file: `infra/api/iam.tf`**
Add:
- IAM role for email admin Lambda
- IAM role for email receive Lambda
- IAM policies for each role (least-privilege)

**Modified file: `infra/api/main.tf`**
Add:
- CORS allow methods: add `PUT` if needed (current: GET, POST, PATCH, OPTIONS)
- New API Gateway routes for email endpoints

**Modified file: `infra/api/variables.tf`**
Add:
- `backup_forward_email` variable
- `from_email_crm` variable (default: `team@tropicoretreat.com`)

### 8.2 Backend Changes

**New file: `backend/src/handlers/emailAdmin.ts`**
- Multi-route handler for POST /emails/send, GET /emails/{leadId}, PATCH /emails/{leadId}/read

**New file: `backend/src/handlers/emailReceive.ts`**
- S3 event handler for processing inbound emails

**New file: `backend/src/lib/emailParser.ts`**
- MIME parsing wrapper around `mailparser` package

**Modified file: `backend/src/lib/dynamodb.ts`**
Add functions:
- `putEmail()` - Store email record
- `getEmails()` - Query emails for a lead (paginated)
- `markEmailsAsRead()` - Batch update readAt on unread emails
- `findLeadByEmail()` - Scan for lead with matching email address
- `updateLeadEmailMetadata()` - Update lastEmailAt and unreadEmailCount

**Modified file: `backend/src/lib/types.ts`**
Add:
- `Email` interface
- `EmailAttachment` interface
- `EmailDirection` type
- Extend `Lead` interface with `lastEmailAt` and `unreadEmailCount`

**Modified file: `backend/src/lib/validation.ts`**
Add:
- `SendEmailSchema` - Zod schema for send email request

**Modified file: `backend/package.json`**
Add dependency:
- `mailparser` (MIME parsing)
- `@types/mailparser` (dev dependency)

**Modified file: `backend/esbuild.config.js`**
Add entry points:
- `emailAdmin`
- `emailReceive`

### 8.3 Frontend Changes

**New file: `admin/src/api/emails.ts`**
- `emailsApi.send()` - POST /emails/send
- `emailsApi.list()` - GET /emails/{leadId}
- `emailsApi.markRead()` - PATCH /emails/{leadId}/read

**New file: `admin/src/types/email.ts`**
- `Email` interface
- `EmailAttachment` interface
- `EmailsResponse` interface

**New file: `admin/src/hooks/useEmails.ts`**
- `useEmailThread()` - TanStack Query hook for email thread
- `useSendEmail()` - Mutation hook for sending email
- `useMarkEmailsRead()` - Mutation hook for marking as read

**New file: `admin/src/components/emails/EmailThread.tsx`**
- Chronological thread view with chat-style alignment

**New file: `admin/src/components/emails/EmailCompose.tsx`**
- Textarea compose box with send button

**New file: `admin/src/components/emails/EmailBubble.tsx`**
- Single email message bubble (inbound left, outbound right)

**Modified file: `admin/src/components/leads/LeadDetail.tsx`**
- Add EmailThread component below existing contact card and message
- Add EmailCompose component at bottom

**Modified file: `admin/src/components/leads/LeadCard.tsx`**
- Add unread email badge indicator
- Add last email preview text
- Support sorting by `lastEmailAt`

**Modified file: `admin/src/types/lead.ts`**
- Extend `Lead` interface with `lastEmailAt` and `unreadEmailCount`

### 8.4 Deployment Order

The deployment must happen in a specific order due to DNS propagation and SES requirements:

1. **Phase 1: DNS + SES setup** (can take up to 48 hours for propagation)
   - Deploy SPF, DMARC, MX records via Terraform
   - Request SES production access (sandbox removal) if not done
   - Create S3 email store bucket
   - Create SES receipt rule set

2. **Phase 2: Backend + Infrastructure**
   - Deploy email receive Lambda + S3 event trigger
   - Deploy email admin Lambda + API Gateway routes
   - Deploy IAM roles and policies
   - Verify inbound email flow with test email

3. **Phase 3: Frontend**
   - Deploy email thread view
   - Deploy compose/send functionality
   - Deploy unread indicators and sorting
   - End-to-end testing

### 8.5 Rollback Strategy

Each phase is independently rollable:
- Phase 1: Remove MX record to stop inbound email (SPF/DMARC are additive, safe to leave)
- Phase 2: Disable Lambda functions or remove API routes
- Phase 3: Frontend is a separate S3 deployment, previous version can be re-deployed

---

## 9. Monitoring and Observability

### 9.1 CloudWatch Metrics

| Metric | Source | Alarm Threshold |
|---|---|---|
| Email receive Lambda errors | Lambda ErrorCount | > 0 in 5 min window |
| Email receive Lambda duration | Lambda Duration | p99 > 25s (of 60s timeout) |
| Email admin Lambda errors | Lambda ErrorCount | > 0 in 5 min window |
| DLQ message count | SQS ApproximateNumberOfMessagesVisible | > 0 |
| SES send bounces | SES Bounce | > 0 |
| SES send complaints | SES Complaint | > 0 |
| S3 email store size | S3 BucketSizeBytes | > 5 GB (informational) |

### 9.2 Structured Logging

All Lambda handlers log structured JSON with:
- `correlationId` (request ID or S3 event ID)
- `leadId` (when available)
- `messageId` (email message ID)
- `direction` (inbound/outbound)
- `action` (send, receive, markRead, etc.)
- No email body content logged (privacy)

### 9.3 Dashboard Refresh Strategy

The admin dashboard uses TanStack Query with:
- `staleTime: 5 minutes` for email thread queries
- `refetchOnWindowFocus: true` for automatic refresh
- Manual refresh button on the email thread view
- Polling interval of 30 seconds when the email thread is visible (optional enhancement)

For the MVP, polling is sufficient. WebSocket/SSE for real-time updates is deferred.
