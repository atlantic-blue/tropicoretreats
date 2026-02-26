# Architecture Analysis

**Analysis Date:** 2026-02-26

---

## 1. Boundary Map: How Components Connect

### System Overview

```
                    INTERNET
                       │
          ┌────────────┼────────────┐
          │            │            │
          ▼            ▼            ▼
   tropicoretreat.com  api.tropicoretreat.com  admin.tropicoretreat.com
   (CloudFront/S3)     (API Gateway v2)        (CloudFront/S3)
   frontend SPA        HTTPS + CORS            admin SPA (JWT-gated)
          │            │            │
          │     ┌──────┼──────┐     │
          │     │      │      │     │
          │     ▼      ▼      ▼     │
          │  Lambda  Lambda  Lambda  │
          │  create  leads   users  │
          │  Lead    Admin          │
          │     │      │            │
          │     ▼      │            │
          │  DynamoDB  │            │
          │  (streams) │            │
          │     │      │            │
          │     ▼      │            │
          │  Lambda ◄──┘            │
          │  processLeadNotifs      │
          │     │                   │
          │   ┌─┴──────────────┐    │
          │   │                │    │
          │   ▼                ▼    │
          │  SES             SNS    │
          │  (email)         (SMS)  │
          │   Slack Webhook         │
          └─────────────────────────┘
```

### Frontend (`frontend/`)
- Static SPA hosted on S3, served via CloudFront (`tropicoretreat.com`)
- Built with React 19, Webpack 5, TypeScript
- One external API call: `POST /v1/leads` to submit contact form
- No auth required — public-facing marketing site + lead capture
- API base URL injected at build time via `process.env.API_URL`
- Entry: `frontend/src/api/submitContact.ts`

### Admin Dashboard (`admin/`)
- Static SPA hosted on S3, served via CloudFront (`admin.tropicoretreat.com`)
- Built with React 19, Vite 7, TypeScript, TailwindCSS v4
- Requires Cognito JWT for all API calls (no unauthenticated routes)
- All API calls go through `admin/src/api/client.ts` → `fetchWithAuth()` which injects `Authorization: Bearer {token}`
- API base URL injected at build time via `VITE_API_ENDPOINT`
- Cognito pool config from `VITE_COGNITO_USER_POOL_ID` + `VITE_COGNITO_CLIENT_ID`

### Backend (`backend/`)
- Four Lambda functions compiled to ESM via esbuild
- No shared runtime layers — each handler bundles its own deps
- Lambda runtime: Node.js 22.x, arm64
- Build command: `cd backend && npm run build` → outputs `.mjs` files to `backend/dist/`

### Infrastructure (`infra/`)
- Terraform, workspace-based multi-environment: `staging` and `default` (production)
- Remote state: S3 bucket `abs-terraform`, key `tropico-retreats`, region `us-east-1`
- Module structure: root module (`infra/`) imports `./api` module which owns all API resources
- AWS region: `us-east-1` for all resources

---

## 2. API Contracts

### Public API (no auth)

**POST `/v1/leads`** — handled by `backend/src/handlers/createLead.ts`

Request body (validated by `LeadSchema` in `backend/src/lib/validation.ts`):
```typescript
{
  firstName: string;        // required, max 100 chars
  lastName: string;         // required, max 100 chars
  email: string;            // required, valid email
  message: string;          // required, max 5000 chars
  phone?: string;           // optional, max 50 chars
  company?: string;         // optional, max 200 chars
  groupSize?: string;       // optional, max 20 chars
  preferredDates?: string;  // optional, max 100 chars
  destination?: string;     // optional, max 50 chars
}
```

Success: `201 { id: string, message: "Lead created successfully" }`
Failure: `400 { error: string, details: Record<string, string[]> }`
Server error: `500 { error: "Internal server error" }`

---

### Admin API (JWT required — Bearer token in Authorization header)

All admin routes require Cognito JWT. API Gateway validates the token via `aws_apigatewayv2_authorizer` (JWT authorizer using Cognito user pool as issuer).

**GET `/v1/leads`** — list leads with filters and pagination
```
Query params:
  status?:      string (comma-separated: NEW,CONTACTED,QUOTED,WON,LOST,ARCHIVED)
  temperature?: string (comma-separated: HOT,WARM,COLD)
  assignee?:    string (Cognito user sub)
  search?:      string (searches firstName, lastName, email, company, message)
  from?:        string (YYYY-MM-DD)
  to?:          string (YYYY-MM-DD)
  cursor?:      string (base64-encoded pagination key)
  limit?:       number (1-100, default 15)
```
Response: `200 { leads: Lead[], nextCursor?: string, totalCount: number }`

**GET `/v1/leads/{id}`** — get lead with notes
Response: `200 { ...Lead, notes: Note[] }`

**PATCH `/v1/leads/{id}`** — update lead fields
```typescript
{
  status?: 'NEW' | 'CONTACTED' | 'QUOTED' | 'WON' | 'LOST' | 'ARCHIVED';
  temperature?: 'HOT' | 'WARM' | 'COLD';
  assigneeId?: string;
  assigneeName?: string;
}
```
Response: `200 Lead`

Status transitions are validated by `validateStatusProgression()` in `backend/src/lib/validation.ts`. Forward-only progression (NEW→CONTACTED→QUOTED→WON/LOST). Any status can transition to ARCHIVED; ARCHIVED can restore to any status.

**POST `/v1/leads/{id}/notes`** — add note
```typescript
{ content: string }  // min 1, max 5000 chars
```
Response: `201 Note`

**PATCH `/v1/leads/{id}/notes/{noteId}`** — edit note
```typescript
{ content: string }  // min 1, max 5000 chars
```
Response: `200 Note`

**GET `/v1/users`** — list Cognito users for assignee dropdown (JWT required)
Response: `200 { users: Array<{ id: string, email: string, username: string, status: string }> }`

---

## 3. Data Flow: User Action → API → Lambda → DynamoDB → Response

### Lead Submission Flow (frontend contact form)

```
1. User fills contact form at frontend/src/pages/ContactPage.tsx
2. Form calls submitContact() in frontend/src/api/submitContact.ts
3. POST https://api.tropicoretreat.com/v1/leads (30s timeout)
4. API Gateway routes to tropico-create-lead-{env} Lambda
5. createLead.handler() in backend/src/handlers/createLead.ts:
   a. Parses request body
   b. Validates with LeadSchema (Zod)
   c. Generates ULID for lead ID
   d. Constructs Lead entity:
      - PK: LEAD#{id}
      - SK: LEAD#{id}
      - GSI1PK: STATUS#NEW
      - GSI1SK: ISO timestamp
      - status: 'NEW', temperature: 'WARM'
   e. Calls putLead() → DynamoDB PutItem to tropico-leads-{env}
6. Returns 201 { id, message }
7. DynamoDB stream INSERT event triggers processLeadNotifications Lambda
8. processLeadNotifications.handler() fires independently:
   a. Unmarshalls stream record to Lead
   b. Sends team email via SES (FROM: leads@tropicoretreat.com, Reply-To: customer email)
   c. Sends customer auto-reply via SES (FROM: hello@tropicoretreat.com)
   d. Sends Slack notification via webhook (fetched from Secrets Manager, cached in Lambda memory)
   e. Queries DynamoDB GSI1 for PREFS#sms-enabled users
   f. Sends SMS via SNS to each opted-in user
   Each notification step is independent — failure of one does NOT block others.
```

### Admin Lead Management Flow

```
1. Admin visits admin.tropicoretreat.com
2. AuthContext checks for existing Cognito session (localStorage)
3. If no session → redirects to /login
4. Login: CognitoUser.authenticateUser() via SRP auth flow
   - On first login: newPasswordRequired challenge → admin sets new password
5. On success: Cognito returns JWT (access + id tokens, 1-hour expiry)
6. Admin dashboard loads leads via useLeads() hook → React Query → leadsApi.list()
7. fetchWithAuth() calls getAccessToken() → cognitoUser.getSession() → returns current JWT
8. GET https://api.tropicoretreat.com/v1/leads with Authorization: Bearer {jwt}
9. API Gateway JWT authorizer validates token against Cognito issuer URL
10. If valid → forwards to tropico-leads-admin-{env} Lambda
11. leadsAdmin.handler() routes on path/method:
    - GET /leads: ScanCommand on DynamoDB with filter expressions, paginates at 500 items/scan
    - GET /leads/{id}: GetCommand by PK/SK, then QueryCommand for NOTE# items
    - PATCH /leads/{id}: UpdateCommand with conditional expression, creates system notes
    - POST /leads/{id}/notes: PutCommand with NOTE# SK format
    - PATCH /leads/{id}/notes/{noteId}: QueryCommand to find note by id, UpdateCommand
12. All PATCH operations extract Cognito user sub + email from JWT claims in event.requestContext
```

---

## 4. Authentication

### Admin Dashboard Auth

**Mechanism:** AWS Cognito user pool with JWT tokens

**User pool:** `tropico-admin-{env}` — admin-only creation (no self-signup)
- Config: `infra/api/cognito.tf`
- Auth flow: `ALLOW_USER_SRP_AUTH` (Secure Remote Password — no password sent in plaintext)
- Also allows `ALLOW_ADMIN_USER_PASSWORD_AUTH` for CLI usage
- Tokens: access token 1h, id token 1h, refresh token 30 days
- MFA: Optional (TOTP-based)
- Password policy: min 12 chars, upper+lower+number+symbol required

**Client-side implementation:**
- `admin/src/lib/cognito.ts` — creates `CognitoUserPool` from env vars
- `admin/src/contexts/AuthContext.tsx` — React context wrapping all auth state
  - `signIn(email, password)` → `CognitoUser.authenticateUser()`
  - `completeNewPassword(newPassword)` → handles forced first-login challenge
  - `signOut()` → `cognitoUser.globalSignOut()` (revokes all sessions)
  - `getAccessToken()` → calls `getSession()` to get fresh token, handles expiry
- `admin/src/hooks/useAuth.ts` — consumer hook
- Session persisted to localStorage by `amazon-cognito-identity-js` SDK automatically

**API Gateway enforcement:**
- All admin routes (`GET /leads`, `GET /leads/{id}`, `PATCH /leads/{id}`, `POST /leads/{id}/notes`, `PATCH /leads/{id}/notes/{noteId}`, `GET /users`) use `authorization_type = "JWT"`
- Authorizer config in `infra/api/main.tf`: `aws_apigatewayv2_authorizer.cognito`
  - `identity_sources = ["$request.header.Authorization"]`
  - `jwt_configuration.audience` = Cognito app client ID
  - `jwt_configuration.issuer` = Cognito user pool endpoint
- `POST /leads` (public form submission) has NO authorizer — intentionally public

**User management:** Managed via `cli.sh` script:
- `./cli.sh admin:create [env] <email>` — creates Cognito user
- `./cli.sh admin:password [env] <email> <password>` — sets password

---

## 5. Deployment

### Environment Strategy

Two environments via Terraform workspaces:

| Environment | Workspace | Domain                        | API                                   |
|-------------|-----------|-------------------------------|---------------------------------------|
| staging     | staging   | staging.tropicoretreat.com    | staging-api.tropicoretreat.com/v1     |
| production  | default   | tropicoretreat.com            | api.tropicoretreat.com/v1             |

### Infrastructure Provisioning (Terraform)

State stored in S3 (`abs-terraform` bucket, key `tropico-retreats`, `us-east-1`).

```bash
# Staging
cd infra && terraform workspace select staging && terraform apply -var-file=staging.tfvars

# Production
cd infra && terraform workspace select default && terraform apply
```

Terraform manages: API Gateway, Lambda functions (via zip archives), DynamoDB, Cognito, S3 buckets, CloudFront distributions, ACM certificates, Route53 records, SES domain identity, Secrets Manager, SQS DLQ, IAM roles and policies.

Lambda deployment: Terraform reads pre-built `.mjs` files from `backend/dist/`. The build must run before `terraform apply`. Terraform uses `archive_file` data source to zip individual `.mjs` files:
- `backend/dist/createLead.mjs` → `create-lead-lambda.zip`
- `backend/dist/leadsAdmin.mjs` → `leadsAdmin.zip`
- `backend/dist/processLeadNotifications.mjs` → `notifications-lambda.zip`
- `backend/dist/users.mjs` → `users.zip`

### Full Deploy Sequence (Makefile)

```bash
# Staging
make staging-deploy
# Equivalent to:
#   terraform apply -var-file=staging.tfvars
#   cd backend && npm run build
#   cd frontend && npm run build:staging && aws s3 sync dist/ s3://staging.tropicoretreat.com --delete
#   cd admin && npm run deploy:staging
#     (= npm run build:staging && aws s3 sync dist/ s3://staging-admin.tropicoretreat.com/ --delete)

# Production
make production-deploy
# Equivalent to:
#   terraform apply
#   cd backend && npm run build
#   cd frontend && npm run build && aws s3 sync dist/ s3://tropicoretreat.com --delete
#   cd admin && npm run deploy:production
#     (= npm run build:production && aws s3 sync dist/ s3://admin.tropicoretreat.com/ --delete
#        && aws cloudfront create-invalidation --distribution-id E2PCJ44NUGPNHQ --paths "/*")
```

### Backend Build

`backend/package.json` script `"build": "node esbuild.config.js"` — esbuild bundles each handler independently to ESM format.

### Frontend Build

- Marketing site: Webpack 5 with custom config in `frontend/config/webpack/`. Uses `dotenv-webpack` to inject env vars. `npm run build` copies `.env.production` before build. Post-build: `scripts/prerender.js` (Puppeteer-based prerendering for SEO).
- Admin: Vite 7 with `--mode staging|production`. Vite exposes `VITE_*` env vars to the bundle.

### CI/CD Pipeline

**No automated CI/CD pipeline exists.** All deployments are manual:
- Run `make staging-deploy` or `make production-deploy` from local machine
- Requires AWS credentials with `atlantic-blue` profile
- Integration tests via shell script: `./test-integration.sh [staging|production]`

The `test-integration.sh` script validates:
- Main website returns 200
- Admin frontend returns 200
- API rejects empty body with 400
- API accepts valid lead with 201
- SSL certificate valid

---

## 6. Email / Notification Infrastructure

### Email (AWS SES)

**Infrastructure:** `infra/api/ses.tf`
- SES v2 domain identity for `tropicoretreat.com` (production only — staging shares production SES)
- DKIM verified via 3 CNAME records in Route53
- Sends from two addresses:
  - `leads@tropicoretreat.com` (team notifications)
  - `hello@tropicoretreat.com` (customer auto-replies)

**IAM policy** (on notifications Lambda role): `ses:SendEmail` and `ses:SendRawEmail` scoped to the two from-addresses.

**Client:** `backend/src/lib/ses.ts` — thin wrapper around `@aws-sdk/client-ses` `SendEmailCommand`. Sends HTML + plain text emails.

**Email templates:**
- `backend/src/templates/teamNotification.ts` — full lead details table, admin dashboard CTA button, Reply-To set to customer email
- `backend/src/templates/customerAutoReply.ts` — reference number (`TR-YYYY-XXXXXX`), 48-hour response promise, WhatsApp quick-contact button, enquiry summary echo, social media footer

### Slack (Incoming Webhook)

**Infrastructure:** `infra/api/secrets.tf` — Slack webhook URL stored in AWS Secrets Manager under `tropico/slack-webhook-url-{env}`. Value must be set manually after Terraform apply.

**IAM policy:** `secretsmanager:GetSecretValue` scoped to the secret ARN.

**Client:** `backend/src/lib/slack.ts` — uses `@slack/webhook` `IncomingWebhook`. Webhook URL cached in Lambda module scope across warm invocations.

**Template:** `backend/src/templates/slackNotification.ts` — Slack Block Kit format with header (temperature emoji + name), contact fields section, message section, divider, context line with dashboard link.

### SMS (AWS SNS)

**Infrastructure:** IAM policy `sns:Publish` on `*` (required for direct SMS — cannot be scoped to phone numbers).

**Client:** `backend/src/lib/sms.ts` — uses `@aws-sdk/client-sns` `PublishCommand`. Sends `Transactional` SMSType for highest reliability.

**Opt-in system:** Users must enable SMS in notification preferences. Preferences stored in same DynamoDB table under `USER#{userId}` PK, `PREFS#notifications` SK. SMS-enabled users indexed on GSI1 via `GSI1PK = PREFS#sms-enabled` for efficient lookup. User's phone number stored in E.164 format on preferences record.

**Template:** `backend/src/templates/smsNotification.ts` — kept under 160 GSM chars to avoid multipart billing. Format: `Tropico Lead: {name} | {email} | {dashboardUrl}/leads/{id}`

### Notification Reliability

- All four notifications (team email, customer email, Slack, SMS) run independently — a failure in one does NOT block others
- Each wrapped in its own try/catch with error logging
- DynamoDB Streams event source mapping has `maximum_retry_attempts = 3`
- Failed batches sent to SQS DLQ (`tropico-notifications-dlq-{env}`) with 14-day retention
- DLQ configured in `infra/api/notifications.tf`

---

## 7. DynamoDB Table Design

**Table:** `tropico-leads-{env}` — single-table design, PAY_PER_REQUEST billing, DynamoDB Streams enabled (`NEW_IMAGE`).

**Key structure:**

| Entity type   | PK                | SK                         | GSI1PK                | GSI1SK      |
|---------------|-------------------|----------------------------|-----------------------|-------------|
| Lead          | `LEAD#{id}`       | `LEAD#{id}`                | `STATUS#{status}`     | ISO 8601    |
| Note          | `LEAD#{leadId}`   | `NOTE#{timestamp}#{noteId}`| —                     | —           |
| Notification  | `USER#{userId}`   | `PREFS#notifications`      | `PREFS#sms-enabled`   | `{userId}`  |
| prefs         |                   |                            | (only when SMS active)|             |

**GSI1** (projection: ALL):
- Used for status-based lead queries (`GSI1PK = STATUS#NEW`)
- Used for SMS-enabled user queries (`GSI1PK = PREFS#sms-enabled`)

**Access patterns:**
- Lead CRUD: GetItem/PutItem/UpdateItem by `PK = LEAD#{id}`, `SK = LEAD#{id}`
- List leads: Scan with FilterExpression (MVP approach — acceptable for small dataset, not production-scale)
- Notes for lead: Query `PK = LEAD#{leadId}`, `begins_with(SK, 'NOTE#')`, `ScanIndexForward = false`
- SMS recipients: Query GSI1 `GSI1PK = PREFS#sms-enabled`
- User prefs: GetItem by `PK = USER#{userId}`, `SK = PREFS#notifications`

**Known limitation:** `getLeads()` in `backend/src/lib/dynamodb.ts` uses `ScanCommand` with a hardcoded `fetchLimit = 500` and applies client-side filtering/pagination. Code comment acknowledges this is MVP-only: "For MVP with small dataset (~100 leads), fetching 500 items per scan is acceptable. Production would need GSI per filter dimension."

---

## 8. Infra Resource Summary

| Resource                         | Name pattern                              | File                           |
|----------------------------------|-------------------------------------------|--------------------------------|
| API Gateway HTTP API             | `tropico-leads-api-{env}`                 | `infra/api/main.tf`            |
| Lambda: create lead              | `tropico-create-lead-{env}`               | `infra/api/lambda.tf`          |
| Lambda: leads admin              | `tropico-leads-admin-{env}`               | `infra/api/lambda.tf`          |
| Lambda: users                    | `tropico-users-{env}`                     | `infra/api/lambda.tf`          |
| Lambda: notifications            | `tropico-notifications-{env}`             | `infra/api/notifications.tf`   |
| DynamoDB table                   | `tropico-leads-{env}`                     | `infra/api/dynamodb.tf`        |
| Cognito user pool                | `tropico-admin-{env}`                     | `infra/api/cognito.tf`         |
| SES domain identity              | `tropicoretreat.com`                      | `infra/api/ses.tf`             |
| SQS DLQ                          | `tropico-notifications-dlq-{env}`         | `infra/api/notifications.tf`   |
| Secrets Manager: Slack webhook   | `tropico/slack-webhook-url-{env}`         | `infra/api/secrets.tf`         |
| CloudFront: main site            | alias: `tropicoretreat.com`               | `infra/cloudfront.tf`          |
| CloudFront: admin                | alias: `admin.tropicoretreat.com`         | `infra/admin-cloudfront.tf`    |
| S3: main site                    | `tropicoretreat.com`                      | `infra/s3.tf`                  |
| S3: admin                        | `admin.tropicoretreat.com`                | `infra/admin-s3.tf`            |
| ACM wildcard certificate         | `*.tropicoretreat.com`                    | `infra/acm.tf`                 |
| Route53: API custom domain       | `api.tropicoretreat.com`                  | `infra/api-route53.tf`         |
| API Gateway custom domain        | `api.tropicoretreat.com` (base path `/v1`)| `infra/api/main.tf`            |
| CloudWatch log groups (14 days)  | `/aws/lambda/tropico-*-{env}`             | `infra/api/lambda.tf` et al.   |

---

*Architecture analysis: 2026-02-26*
