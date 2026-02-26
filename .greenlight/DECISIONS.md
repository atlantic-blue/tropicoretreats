# Technical Decision Log — Email CRM

All decisions made during the YOLO-mode design session for the Email CRM feature. Each decision documents the context, options considered, choice made, and rationale.

---

## ADR-001: Store emails in existing single-table vs. separate DynamoDB table

**Status:** Accepted
**Date:** 2026-02-26
**Context:** The existing system uses a single DynamoDB table (`tropico-leads-${env}`) with a single-table design pattern. Leads use `PK=LEAD#{id}, SK=LEAD#{id}`, notes use `PK=LEAD#{leadId}, SK=NOTE#{ts}#{noteId}`, and user preferences use `PK=USER#{userId}, SK=PREFS#notifications`. We need to store email records that belong to leads.

**Options:**
1. **Same table** — Add `EMAIL#` SK prefix items co-located with leads under `PK=LEAD#{leadId}`
2. **Separate table** — Create a new `tropico-emails-${env}` table

**Decision:** Option 1 — Same table.

**Rationale:**
- The primary access pattern (get all emails for a lead) is a Query on `PK=LEAD#{leadId} AND begins_with(SK, 'EMAIL#')` which is a single-partition read — the most efficient DynamoDB access pattern
- Co-location with lead and note items means a single GSI can serve queries across entity types if needed in the future
- The existing codebase already handles multi-entity items (leads, notes, preferences) in one table
- A separate table adds operational overhead (separate capacity, separate backup policies, separate IAM) with no query pattern benefit
- DynamoDB item count is not a concern — the table uses PAY_PER_REQUEST billing and can scale to billions of items
- Email items are naturally scoped to a lead, making `PK=LEAD#{leadId}` the correct partition key

**Consequences:**
- Must ensure all Scan operations (like `getLeads`) filter by SK prefix to exclude EMAIL items (they already filter `begins_with(SK, 'LEAD#')`)
- DynamoDB item size limit of 400KB applies to each email item individually (not cumulative)
- Large email bodies may need truncation (see ADR-007)

---

## ADR-002: One multi-route email Lambda vs. separate Lambdas for each endpoint

**Status:** Accepted
**Date:** 2026-02-26
**Context:** The existing codebase uses two patterns: multi-route Lambdas for admin API endpoints (`leadsAdmin.ts` handles GET/PATCH /leads, POST/PATCH /leads/{id}/notes), and single-purpose Lambdas for event-driven processing (`processLeadNotifications.ts` for DynamoDB streams, `createLead.ts` for public form).

**Options:**
1. **One multi-route admin Lambda + one event Lambda** — `emailAdmin` handles send/list/mark-read, `emailReceive` handles inbound
2. **Separate Lambda per endpoint** — `emailSend`, `emailList`, `emailMarkRead`, `emailReceive`
3. **Extend existing leadsAdmin Lambda** — Add email routes to the existing leads admin handler

**Decision:** Option 1 — One multi-route admin Lambda + one event Lambda.

**Rationale:**
- The multi-route pattern for admin endpoints is the established pattern in this codebase (`leadsAdmin.ts`)
- Email admin operations (send, list, mark-read) share the same IAM permissions (DynamoDB + SES), making a single role simpler
- The event-driven inbound handler has fundamentally different triggers (S3 event vs. API Gateway) and different IAM needs (S3 read, wider DynamoDB Scan for lead matching), warranting a separate Lambda
- Option 3 was rejected because mixing lead operations with email operations violates single-responsibility — the handler would grow too large and the IAM role would need SES permissions that leads don't need
- Option 2 adds unnecessary deployment complexity with no benefit — three separate Lambdas for three routes that share the same auth, role, and dependencies

**Consequences:**
- `emailAdmin.ts` will have route matching with method + path regex (same pattern as `leadsAdmin.ts`)
- `emailReceive.ts` will have its own IAM role with S3 + DynamoDB + SES permissions
- Two new esbuild entry points needed

---

## ADR-003: SES receiving pipeline — S3 storage then Lambda vs. direct Lambda invocation

**Status:** Accepted
**Date:** 2026-02-26
**Context:** SES receipt rules can either invoke a Lambda directly or store the email in S3 (which then triggers a Lambda via S3 event notification). The raw email needs to be archived for compliance and debugging.

**Options:**
1. **SES -> S3 -> Lambda** — SES stores raw email in S3, S3 event triggers Lambda
2. **SES -> Lambda (direct)** — SES invokes Lambda directly, Lambda stores raw email in S3 after processing
3. **SES -> SNS -> Lambda** — SES publishes to SNS, SNS invokes Lambda

**Decision:** Option 1 — SES -> S3 -> Lambda.

**Rationale:**
- Raw email archival in S3 happens atomically before any processing — if Lambda fails, the email is still safely stored
- S3 event notifications provide built-in retry semantics when Lambda fails
- SES direct Lambda invocation has a 30-second timeout limit (SES-specific), while S3-triggered Lambdas use the Lambda-configured timeout (60 seconds in our case)
- SES direct invocation passes the email content in the event payload, which is limited in size; S3 storage handles emails up to 30MB
- The S3 intermediate storage provides a natural audit trail and enables manual replay of failed emails
- Option 3 adds unnecessary SNS complexity with no benefit over S3 events

**Consequences:**
- Need S3 bucket with SES write permission (bucket policy)
- Need S3 event notification configuration to trigger Lambda
- Lambda must read the raw email from S3 (additional S3 GetObject call), adding ~50ms latency
- S3 lifecycle policy manages storage costs (Glacier at 90 days)

---

## ADR-004: MIME parsing library — mailparser vs. postal-mime vs. custom parsing

**Status:** Accepted
**Date:** 2026-02-26
**Context:** Inbound emails arrive as raw MIME (RFC 2822) and need parsing to extract: sender, recipient, subject, body (text + HTML), and attachments.

**Options:**
1. **mailparser** (npm) — Mature, widely used, full MIME support, Node.js native
2. **postal-mime** (npm) — Lighter weight, browser-compatible, async
3. **Custom parsing** — Regex-based extraction of headers and body

**Decision:** Option 1 — mailparser.

**Rationale:**
- `mailparser` is the de facto standard for MIME parsing in Node.js with 1M+ weekly downloads
- Handles edge cases that custom parsing would miss: multipart/alternative, quoted-printable encoding, RFC 2047 encoded headers, nested MIME parts, CID attachments
- The `simpleParser` API provides a clean interface: `const parsed = await simpleParser(rawEmailStream)` returning structured data with `from`, `to`, `subject`, `text`, `html`, `attachments`
- `postal-mime` is lighter but less mature and primarily designed for browser/service-worker use cases
- Custom parsing is fragile and would require significant effort to handle the MIME specification correctly
- Lambda memory (256MB) and timeout (60s) are sufficient for mailparser's resource requirements
- The library adds ~500KB to the Lambda bundle (acceptable)

**Consequences:**
- New dependency: `mailparser` in `backend/package.json` (runtime) + `@types/mailparser` (dev)
- esbuild must bundle mailparser (it's a CommonJS module; esbuild handles CJS->ESM conversion)
- Lambda cold start may increase by ~100ms due to larger bundle

---

## ADR-005: Lead matching strategy — Scan vs. GSI vs. email lookup table

**Status:** Accepted
**Date:** 2026-02-26
**Context:** When an inbound email arrives, we need to find the lead with a matching email address. The existing table has no index on the `email` attribute.

**Options:**
1. **Scan with filter** — `Scan` the table filtering `SK begins_with('LEAD#') AND email = :addr`
2. **New GSI** — `GSI2PK = EMAIL_ADDR#<normalized-email>` for O(1) lookup
3. **Separate lookup table** — `email -> leadId` mapping table

**Decision:** Option 1 — Scan with filter.

**Rationale:**
- The existing codebase already uses Scan for lead queries (`getLeads()` in dynamodb.ts) with a comment noting "For MVP with small dataset (~100 leads), fetching 500 items per scan is acceptable"
- A Scan filtering on ~100-500 lead items takes <50ms on PAY_PER_REQUEST DynamoDB — well within the 60-second Lambda timeout
- Adding a GSI for email lookup adds cost and complexity for a pattern used only during inbound email processing (low frequency, ~10-50 emails/day expected)
- The Scan approach allows us to normalize email comparison (case-insensitive) at the application level, which is harder with a GSI
- If the dataset grows beyond 1000 leads, a GSI can be added without any application code changes — just add the GSI and change the query function
- Option 3 adds operational overhead (separate table, consistency management) with no benefit at this scale

**Consequences:**
- Inbound email processing is O(n) in the number of leads — acceptable for MVP
- Must normalize email addresses to lowercase before comparison
- If multiple leads have the same email address, take the most recently created one and log a warning
- Performance monitoring needed: if Scan duration exceeds 1 second, add GSI2

---

## ADR-006: Mark-as-read implementation — on thread view vs. explicit action

**Status:** Accepted
**Date:** 2026-02-26
**Context:** When an operator views an email thread, unread emails should be marked as read. The question is when this happens.

**Options:**
1. **Auto-mark on thread view** — When the thread is loaded (GET /emails/{leadId}), a separate mark-read call is made automatically
2. **Explicit mark-read button** — Operator clicks "Mark all as read" button
3. **Backend auto-mark on GET** — The GET /emails/{leadId} endpoint both returns emails and marks them as read

**Decision:** Option 1 — Auto-mark on thread view (client-initiated).

**Rationale:**
- The natural user expectation is that viewing a conversation marks it as read (email client convention)
- Option 3 conflates read and write operations in a GET request, violating HTTP semantics and making caching impossible
- Option 2 adds unnecessary friction — operators don't want to manually mark conversations as read
- Implementation: when the LeadDetail page loads and displays the email thread, a `useEffect` triggers `PATCH /emails/{leadId}/read` — this is fire-and-forget from the UI perspective
- The mark-read operation is idempotent (marking already-read emails is a no-op), so duplicate calls are harmless
- Optimistic update: immediately set `unreadEmailCount = 0` on the lead in TanStack Query cache

**Consequences:**
- Mark-read happens as a side effect of viewing, not as a primary action
- If the PATCH fails (network error), the unread badge may persist until next page load — acceptable for MVP
- The PATCH response returns `markedCount` for debugging but the UI doesn't need to use it

---

## ADR-007: Email body size handling for DynamoDB 400KB limit

**Status:** Accepted
**Date:** 2026-02-26
**Context:** DynamoDB items have a 400KB maximum size. Email bodies (especially HTML) can exceed this. The total email item includes PK, SK, attributes, and body content.

**Options:**
1. **Truncate body, store full in S3** — Store first 100KB of body in DynamoDB, full body in S3 with a `bodyS3Key` reference
2. **Always store body in S3** — DynamoDB item has metadata only, body always fetched from S3
3. **Just truncate** — Store first 100KB, discard the rest
4. **No limit** — Assume emails won't exceed 400KB

**Decision:** Option 1 — Truncate body, store full in S3 if needed.

**Rationale:**
- Most business emails are well under 100KB (plain text is typically <10KB, HTML with inline styles is typically <50KB)
- Storing the body directly in DynamoDB enables single-call thread loading (no S3 round-trips for each email)
- For the rare large email, the truncated body provides a preview while the full body is available from S3
- Option 2 adds latency to every email thread load (S3 GetObject per email is 50-100ms each)
- Option 4 risks a hard failure when a large marketing email is received
- The 100KB threshold is generous — that's approximately 50,000 words of plain text

**Consequences:**
- Email item includes `bodyTruncated: boolean` flag
- If `bodyTruncated` is true, `bodyS3Key` contains the S3 key for the full body
- Frontend can show a "View full email" link that fetches from S3 via pre-signed URL
- This adds complexity to the MIME processing but prevents data loss

---

## ADR-008: Backup forwarding — full email vs. notification with link

**Status:** Accepted
**Date:** 2026-02-26
**Context:** Every inbound email should be forwarded to a personal backup email so operators don't miss messages if the dashboard is down.

**Options:**
1. **Forward full email** — Send the complete original email (body + attachments) to the backup address
2. **Notification with link** — Send a short notification with sender, subject, preview, and a link to the admin dashboard
3. **Both** — Full email for small messages, notification-only for large messages

**Decision:** Option 2 — Notification with link.

**Rationale:**
- Forwarding full emails with attachments via SES counts against SES sending quota and can be expensive for large attachments
- A notification email is small (~5KB), fast to send, and contains all the information needed to decide whether to open the dashboard
- Forwarding attachments via SES has a 10MB message size limit and adds complexity (constructing raw MIME for SES SendRawEmail)
- The notification approach decouples the backup from the email content, keeping the implementation simple
- Operators who need the full email can click the dashboard link (which is the primary workflow anyway)

**Consequences:**
- Backup email template includes: sender name, sender email, subject, first 200 chars of body, link to lead in admin dashboard
- Operators must have dashboard access to see the full email and attachments
- If the dashboard is completely down, operators can still see who emailed and about what from the notification

---

## ADR-009: Email address field on Lead type — reuse existing `email` field vs. separate `contactEmail`

**Status:** Accepted
**Date:** 2026-02-26
**Context:** Leads already have an `email` field from the contact form. Inbound email matching needs to compare sender addresses against this field. The question is whether to reuse it or add a separate field.

**Decision:** Reuse the existing `email` field.

**Rationale:**
- The existing `email` field on the Lead type is the contact email address, which is exactly what inbound emails will come from
- Adding a separate `contactEmail` field creates confusion about which email to use for matching and display
- The existing field is already used for the `mailto:` link in the lead detail view
- For auto-created leads (from unknown senders), the `email` field is populated from the inbound email's `From` address — a natural fit
- Email normalization (lowercase) should be applied consistently

**Consequences:**
- Lead matching uses `email` field with case-insensitive comparison
- If a lead changes their email address, old emails still show in the thread (matched by leadId, not email)
- If the same person has multiple leads (different form submissions), emails match to the most recent lead

---

## ADR-010: Frontend dashboard refresh strategy — polling vs. WebSocket vs. staleTime

**Status:** Accepted
**Date:** 2026-02-26
**Context:** When an inbound email arrives, the dashboard should show it. The question is how quickly and by what mechanism.

**Options:**
1. **TanStack Query staleTime + refetchOnWindowFocus** — Existing pattern, 5-minute stale window
2. **Short polling (30s interval)** — Periodic refetch when email thread is visible
3. **WebSocket / SSE** — Real-time push from server
4. **Reduced staleTime** — Lower staleTime to 30 seconds for email queries

**Decision:** Option 4 — Reduced staleTime (30 seconds) for email queries, with manual refresh button.

**Rationale:**
- WebSocket/SSE adds significant infrastructure complexity (API Gateway WebSocket API, connection management, Lambda integration) that is disproportionate for a 1-5 user system
- Explicit polling (Option 2) wastes resources when users aren't looking at the email thread
- TanStack Query's `staleTime` + `refetchOnWindowFocus` provides a natural "check for new emails when I look at the dashboard" pattern
- Setting `staleTime: 30000` (30 seconds) for email queries means data is refetched at most every 30 seconds when the query is active
- A manual "Refresh" button provides explicit control for impatient operators
- `refetchOnWindowFocus: true` (already the default) means switching back to the dashboard tab triggers a refresh

**Consequences:**
- Email thread queries use `staleTime: 30000` (not the global 5-minute default)
- Lead list queries keep the 5-minute staleTime (lead metadata changes less frequently)
- Manual refresh button on the email thread view
- Future enhancement: add WebSocket if real-time is needed (out of MVP scope)

---

## ADR-011: Email compose — textarea vs. contentEditable vs. rich text editor

**Status:** Accepted
**Date:** 2026-02-26
**Context:** The MVP defers rich text editing. The question is what the compose interface looks like.

**Decision:** Basic `<textarea>` with plain text input.

**Rationale:**
- The project requirements explicitly defer rich text editor to post-MVP
- A `<textarea>` is simple, accessible, and matches the existing notes input pattern in `NotesTimeline.tsx`
- Plain text emails are actually preferred for business email (they render consistently across clients, avoid spam filters, and are easier to quote in replies)
- The plain text is stored as `bodyText`; a simple text-to-HTML conversion (newlines to `<br>`, URL linking) generates `bodyHtml` for SES
- This can be replaced with a rich text editor (TipTap, Lexical, etc.) in a future iteration without changing the API

**Consequences:**
- No `bodyHtml` from the frontend — the Lambda generates it from `bodyText`
- No formatting, images, or inline attachments in outbound emails for MVP
- Email signatures are not supported in MVP (operator types their name manually)
- Reply quoting is basic: `> ` prefix on each line of the original message (or no quoting for MVP simplicity)

---

## ADR-012: Auto-subject for replies — client-side vs. server-side

**Status:** Accepted
**Date:** 2026-02-26
**Context:** When an operator replies to an email thread, the subject should be auto-populated with `Re: <original subject>`.

**Decision:** Client-side auto-population.

**Rationale:**
- The frontend knows the email thread context (it just rendered it)
- Auto-populating the subject in the compose component is a simple `useState` initialized with `Re: ${lastEmailSubject}`
- No additional API call or server logic needed
- The operator can modify the subject before sending (the field is editable)
- If the subject already starts with `Re:`, don't add another prefix (handle `Re: Re:` stacking)

**Consequences:**
- Subject logic lives in `EmailCompose.tsx`
- The API accepts whatever subject the operator sends (no server-side validation of Re: prefix)
- Thread grouping by subject is not implemented in MVP (emails are grouped by leadId, not by subject/thread)

---

## ADR-013: Terraform file organization — new email.tf vs. extend existing files

**Status:** Accepted
**Date:** 2026-02-26
**Context:** The existing Terraform follows a flat file structure in `infra/api/`: `lambda.tf`, `dynamodb.tf`, `cognito.tf`, `ses.tf`, `iam.tf`, `notifications.tf`, `main.tf`. The email feature adds significant new infrastructure.

**Decision:** Create a new `infra/api/email.tf` for email-specific resources, extend existing files for cross-cutting concerns.

**Rationale:**
- A single `email.tf` keeps all email-specific resources together (S3 bucket, receipt rules, Lambda functions, S3 events, DLQ) — easy to find, easy to review, easy to remove
- `ses.tf` is extended for DNS records (SPF, DMARC, MX) because they are SES-related and belong with the existing SES identity
- `iam.tf` is extended for IAM roles/policies because it's the existing pattern for all IAM
- `main.tf` is extended for API Gateway routes because it's the existing pattern for all routes
- `variables.tf` is extended for new variables
- This matches the precedent set by `notifications.tf` which contains all notification-specific resources

**Consequences:**
- `email.tf` will be the largest new Terraform file (~200-300 lines)
- IAM policies in `iam.tf` will reference resources from `email.tf` (cross-file references are normal in Terraform)
- The DynamoDB table definition does not change (no new GSIs, no schema changes — DynamoDB is schemaless)

---

## ADR-014: SES receipt rule — rule set activation strategy

**Status:** Accepted
**Date:** 2026-02-26
**Context:** SES can only have one active receipt rule set per region. If there is no existing rule set, we need to create and activate one. If there is one, we need to add a rule to it.

**Decision:** Create a new receipt rule set if none exists, or reference the existing one. Use a single receipt rule for `team@tropicoretreat.com`.

**Rationale:**
- The current infrastructure has no SES receipt rules (SES is only used for sending)
- Creating a new rule set named `tropico-email-rules-${env}` and setting it as active is safe
- The receipt rule matches only `team@tropicoretreat.com` (not a wildcard) to avoid processing unintended emails
- The rule has two actions: (1) S3 store, (2) Lambda invoke (or just S3 store with S3 event notification)

**Consequences:**
- Only one active receipt rule set per account/region — if other SES receiving is needed later, rules must be added to the same rule set
- The rule set must be activated (set as active) — this is a one-time operation
- Terraform manages the rule set lifecycle

---

## ADR-015: Email loop prevention

**Status:** Accepted
**Date:** 2026-02-26
**Context:** If `team@tropicoretreat.com` sends an email and the recipient's auto-responder replies, and then the inbound processing creates another email, it could trigger another auto-response, creating an infinite loop. Similarly, if the backup forwarding sends to an address that auto-responds to `team@tropicoretreat.com`, a loop occurs.

**Decision:** Multiple layers of loop prevention:

1. **SES receipt rule**: Only process emails addressed to `team@tropicoretreat.com` (not catch-all)
2. **emailReceive Lambda**: Check if `fromAddress` is `team@tropicoretreat.com` or any `*@tropicoretreat.com` — skip processing
3. **emailReceive Lambda**: Check for `Auto-Submitted: auto-replied` or `X-Auto-Response-Suppress` headers — skip processing
4. **Backup forwarding**: Use `team@tropicoretreat.com` as the `From` address with `Reply-To` set to the original sender — if someone replies to the forwarded email, it goes to the original sender, not back to SES

**Rationale:**
- Defense in depth — any single check might miss edge cases
- Checking the `From` domain prevents loops within the tropicoretreat.com domain
- Checking auto-response headers prevents loops with external auto-responders (out-of-office replies, etc.)
- Using proper `From`/`Reply-To` on forwarded emails prevents reply-chain loops

**Consequences:**
- Emails from `*@tropicoretreat.com` are silently dropped (logged but not stored)
- Auto-responses from external senders are silently dropped
- If a legitimate email has auto-response headers, it will be dropped — this is the correct behavior (auto-responses are not lead conversations)

---

## ADR-016: Unread count — denormalized counter vs. query-time calculation

**Status:** Accepted
**Date:** 2026-02-26
**Context:** The lead list needs to show an unread email badge. This requires knowing the unread count for each lead.

**Options:**
1. **Denormalized counter on lead** — `unreadEmailCount` attribute on the lead record, updated on email receive and mark-read
2. **Query-time calculation** — Query emails for each lead and count where `readAt = null`
3. **Periodic batch update** — Scheduled Lambda calculates unread counts and updates leads

**Decision:** Option 1 — Denormalized counter on lead.

**Rationale:**
- The lead list already fetches lead records (Scan) — adding `unreadEmailCount` to the existing data costs nothing extra
- Query-time calculation (Option 2) would require N additional DynamoDB queries (one per lead in the list), which is an N+1 query problem
- The counter is updated in two places: (a) emailReceive Lambda increments on inbound email, (b) emailAdmin Lambda resets to 0 on mark-read
- DynamoDB `ADD` operation is atomic, preventing race conditions on concurrent increments
- The counter may drift slightly if errors occur (e.g., email stored but counter update fails), but this is acceptable for a badge indicator — it will self-correct on the next mark-read operation

**Consequences:**
- Two DynamoDB update operations per inbound email (email record + lead counter)
- Must use `UpdateExpression: 'ADD unreadEmailCount :one'` for atomic increment
- Mark-read resets to 0 (not decrement by marked count) to self-correct any drift
- `lastEmailAt` is updated alongside `unreadEmailCount` for sorting

---

## ADR-017: Attachment handling — inline display vs. download links

**Status:** Accepted
**Date:** 2026-02-26
**Context:** Inbound emails may have attachments. The receive-side stores them in S3. The question is how the dashboard displays them.

**Decision:** Download links only (no inline display) for MVP.

**Rationale:**
- Inline display of images requires fetching from S3 and rendering in the browser, which adds complexity (pre-signed URLs for each image, CSP headers, CORS)
- Download links are simpler: generate a pre-signed S3 URL (15-minute expiry) and render as a clickable link with filename and size
- The pre-signed URL can be generated by the emailAdmin Lambda when returning the email thread, or by a separate endpoint
- Inline image display can be added later as a UI enhancement without API changes

**Consequences:**
- `attachments` array in email items contains `{filename, s3Key, contentType, size}`
- The GET /emails/{leadId} response includes attachment metadata but not the attachment content
- Frontend renders attachment list with download links
- Pre-signed URL generation happens server-side (emailAdmin Lambda) to avoid exposing S3 bucket details to the frontend
- A helper endpoint or field `downloadUrl` could be added to the email response (pre-signed URLs with 15-minute expiry)

---

## Decision Summary

| # | Decision | Choice |
|---|---|---|
| ADR-001 | Email storage table | Existing single-table |
| ADR-002 | Lambda architecture | Multi-route admin + event-driven receive |
| ADR-003 | SES receiving pipeline | SES -> S3 -> Lambda |
| ADR-004 | MIME parsing library | mailparser |
| ADR-005 | Lead matching strategy | Scan with filter (upgrade to GSI later) |
| ADR-006 | Mark-as-read trigger | Auto-mark on thread view (client-initiated PATCH) |
| ADR-007 | Email body size handling | Truncate at 100KB, full body in S3 |
| ADR-008 | Backup forwarding content | Notification with link (not full email) |
| ADR-009 | Lead email field | Reuse existing `email` field |
| ADR-010 | Dashboard refresh strategy | Reduced staleTime (30s) + manual refresh |
| ADR-011 | Email compose interface | Basic textarea (plain text) |
| ADR-012 | Reply subject auto-population | Client-side |
| ADR-013 | Terraform file organization | New email.tf + extend existing files |
| ADR-014 | SES receipt rule strategy | New rule set, single rule for team@ |
| ADR-015 | Email loop prevention | Multi-layer (domain check + auto-response headers + From/Reply-To) |
| ADR-016 | Unread count strategy | Denormalized counter on lead record |
| ADR-017 | Attachment display | Download links only (no inline) |
