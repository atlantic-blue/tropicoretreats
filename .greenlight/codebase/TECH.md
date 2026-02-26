# Tropico Retreats — Technical Stack & Architecture Reference

**Analysis Date:** 2026-02-26

---

## Project Layout

```
tropicoretreats/
├── frontend/          # Public marketing site (React 19, Webpack 5, Tailwind 4)
├── admin/             # Internal CRM dashboard (React 19, Vite 7, Tailwind 4)
├── backend/           # Lambda handlers (Node.js 22, TypeScript ESM, esbuild)
└── infra/             # Terraform (two workspaces: root + infra/api/ submodule)
```

---

## 1. Frontend (`frontend/`)

### Stack

| Concern | Choice |
|---------|--------|
| Framework | React 19 (`react` + `react-dom`) |
| Build | Webpack 5 with `ts-loader` + `babel-loader` |
| Language | TypeScript 5.8 (strict) |
| Routing | `react-router` v7 (BrowserRouter) |
| Styling | Tailwind CSS v4 via PostCSS + `mini-css-extract-plugin` |
| Icons | `lucide-react` |
| SEO | `react-helmet-async` |
| Testing | Jest 29 + `jest-environment-jsdom` + `babel-jest` |
| Pre-render | `@prerenderer/prerenderer` + Puppeteer (postbuild step) |
| State | Local `useState` only — no global state manager |

### Build Commands

```bash
npm run dev           # webpack-dev-server, copies .env.staging
npm run build         # production build, copies .env.production, runs prerender
npm run build:staging # staging build
```

### Environment Variables (injected by `dotenv-webpack`)

The frontend reads env from process.env at build time via `dotenv-webpack`:

- `API_URL` — base URL for the leads API (e.g. `https://api.tropicoretreat.com/v1`)
- `AUTH_DOMAIN` — unused/legacy; not connected to anything active
- `AUTH_CLIENT_ID`, `AUTH_CLIENT_SECRET` — unused/legacy
- `PAYMENTS_STRIPE_KEY` — unused/legacy

The env is surfaced through `frontend/src/env.ts`, which exports a typed `Env` singleton.

### API Client Pattern

Single function, no library. Direct `fetch` with AbortController timeout (30 seconds):

```typescript
// frontend/src/api/submitContact.ts
export async function submitContact(data: ContactFormData): Promise<SubmitContactResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);
  const response = await fetch(`${env.api.contactUrl}/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    signal: controller.signal,
  });
  // ...
}
```

**No auth headers** — the public `POST /leads` endpoint is unauthenticated.

### Routing

Defined as a TypeScript enum in `frontend/src/Routes/appRoutes.tsx`:

```typescript
export enum Routes {
  HOME = '/',
  ABOUT = '/about',
  SERVICES = '/services',
  FAQS = '/faqs',
  CONTACT = '/contact',
  PRIVACY = '/privacy',
  TERMS = '/terms',
  DESTINATION_CARIBBEAN = '/destinations/caribbean',
  DESTINATION_CASANARE  = '/destinations/casanare',
  DESTINATION_COFFEE    = '/destinations/coffee-region',
}
```

Route component: `frontend/src/Routes/router.tsx`
App entry: `frontend/src/App.tsx` (wraps in `HelmetProvider > ToastProvider > BrowserRouter`)

### Contact Form Flow

1. `frontend/src/pages/ContactPage.tsx` renders `<ContactForm />`
2. `frontend/src/components/ContactForm.tsx` manages local state, calls `submitContact()`
3. `frontend/src/api/submitContact.ts` posts to `${API_URL}/leads`
4. On success: toast shown, form reset
5. On error: toast shown with retry callback

### Component Structure

```
frontend/src/components/
├── ContactForm.tsx      # Multi-field enquiry form, posts to API
├── CookieConsent.tsx    # GDPR consent banner
├── Footer.tsx
├── Navigation.tsx
├── ScrollToTop.tsx      # Resets scroll on route change
├── SEO.tsx              # react-helmet-async wrapper
├── Toast.tsx            # Toast context + provider
└── WhatsAppButton.tsx   # Floating WhatsApp CTA
```

---

## 2. Admin Dashboard (`admin/`)

### Stack

| Concern | Choice |
|---------|--------|
| Framework | React 19 |
| Build | Vite 7 + `@vitejs/plugin-react` |
| Language | TypeScript 5.9 (ESM, `"type": "module"`) |
| Routing | `react-router` v7 (BrowserRouter) |
| Styling | Tailwind CSS v4 via PostCSS |
| Data Fetching | TanStack Query v5 (`@tanstack/react-query`) |
| Auth | `amazon-cognito-identity-js` v6 (SRP flow, no Amplify) |
| Icons | `lucide-react` |
| Date Utils | `date-fns` v4 + `react-day-picker` v9 |

### Build & Deploy Commands

```bash
npm run dev               # Vite dev server (port 5173)
npm run build:production  # TypeScript check + Vite build --mode production
npm run deploy:production # Build → S3 sync → CloudFront invalidation
```

CloudFront distribution ID is hardcoded in `package.json` deploy script: `E2PCJ44NUGPNHQ`.

### Environment Variables (Vite `import.meta.env`)

- `VITE_API_ENDPOINT` — base URL for API calls (e.g. `https://api.tropicoretreat.com/v1`)
- `VITE_COGNITO_USER_POOL_ID` — Cognito User Pool ID
- `VITE_COGNITO_CLIENT_ID` — Cognito App Client ID

Set via `.env`, `.env.staging`, `.env.production` files (not committed).

### Authentication

Implemented entirely with `amazon-cognito-identity-js` (no AWS Amplify):

- `admin/src/lib/cognito.ts` — creates `CognitoUserPool` singleton from env vars
- `admin/src/contexts/AuthContext.tsx` — React context providing `signIn`, `signOut`, `getAccessToken`, `completeNewPassword`, session restore on mount
- `admin/src/hooks/useAuth.ts` — typed consumer of `AuthContext`

**Token flow:**
1. `signIn()` calls `cognitoUser.authenticateUser()` with SRP auth
2. On success, stores session in Cognito SDK's local storage (automatic)
3. `getAccessToken()` calls `cognitoUser.getSession()` and returns `session.getAccessToken().getJwtToken()`
4. `App.tsx` calls `setTokenGetter(auth.getAccessToken)` to register with the API client

**New password challenge:** Handled via `needsNewPassword` state + `completeNewPasswordChallenge()`.

### API Client Pattern

```typescript
// admin/src/api/client.ts
const API_BASE = import.meta.env.VITE_API_ENDPOINT;
let getTokenFn: (() => Promise<string>) | null = null;

export function setTokenGetter(fn: () => Promise<string>) {
  getTokenFn = fn;
}

export async function fetchWithAuth<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getTokenFn!();
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `API error: ${response.status}`);
  }
  return response.json();
}
```

**All admin API calls include `Authorization: Bearer <access_token>`** as a JWT.

### API Functions (`admin/src/api/leads.ts`)

```typescript
export const leadsApi = {
  list:       (params: FilterParams) => fetchWithAuth<LeadsResponse>(`/leads?...`),
  get:        (id: string)           => fetchWithAuth<LeadWithNotes>(`/leads/${id}`),
  update:     (id, data)             => fetchWithAuth<Lead>(`/leads/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  addNote:    (leadId, content)      => fetchWithAuth<Note>(`/leads/${leadId}/notes`, { method: 'POST', ... }),
  updateNote: (leadId, noteId, content) => fetchWithAuth<Note>(`/leads/${leadId}/notes/${noteId}`, { method: 'PATCH', ... }),
};

export const usersApi = {
  list: () => fetchWithAuth<{ users: User[] }>('/users'),
};
```

### Data Fetching with TanStack Query

QueryClient config (`admin/src/lib/queryClient.ts`):
- `staleTime`: 5 minutes
- `gcTime`: 30 minutes
- `retry`: 1
- `refetchOnWindowFocus`: true

Query hooks:
- `admin/src/hooks/useLeads.ts` — `useLeads({ filters, cursor, onNextCursor })` + `useUsers()`
- `admin/src/hooks/useLeadDetail.ts` — single lead + notes
- `admin/src/hooks/useLeadMutations.ts` — `useUpdateLead`, `useAddNote`, `useUpdateNote` (all with optimistic updates)

Optimistic update pattern (update lead):
```typescript
onMutate: async (data) => {
  await queryClient.cancelQueries({ queryKey: ['lead', leadId] });
  const previousLead = queryClient.getQueryData<LeadWithNotes>(['lead', leadId]);
  queryClient.setQueryData(['lead', leadId], { ...previousLead, ...data });
  return { previousLead };
},
onError: (_err, _variables, context) => {
  queryClient.setQueryData(['lead', leadId], context.previousLead);
},
onSettled: () => {
  queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
  queryClient.invalidateQueries({ queryKey: ['leads'] });
},
```

### Routing

```typescript
// admin/src/App.tsx
<QueryClientProvider client={queryClient}>
  <AuthProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/login"        element={<LoginPage />} />
        <Route path="/"             element={<AppShell />}>
          <Route index              element={<Navigate to="/leads" replace />} />
          <Route path="leads"       element={<LeadsListPage />} />
          <Route path="leads/:id"   element={<LeadDetailPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </AuthProvider>
</QueryClientProvider>
```

`AppShell` (`admin/src/components/layout/AppShell.tsx`) guards the authenticated routes — unauthenticated users are redirected to `/login`.

### Admin Component Tree

```
admin/src/pages/
├── LoginPage.tsx           # Cognito signIn + completeNewPassword challenge
├── LeadsListPage.tsx       # Full leads grid with filters and pagination
└── LeadDetailPage.tsx      # Lead detail view with notes timeline

admin/src/components/
├── layout/AppShell.tsx     # Auth guard + sidebar layout shell
├── leads/
│   ├── LeadCard.tsx        # Card representation of a lead
│   ├── LeadDetail.tsx      # Detail panel with all lead fields
│   ├── LeadFilters.tsx     # Filter bar (status, temp, assignee, date, search)
│   ├── LeadGrid.tsx        # Responsive grid of LeadCard components
│   ├── NotesTimeline.tsx   # Chronological notes list + add/edit note UI
│   ├── AssigneeDropdown.tsx # Dropdown populated from GET /users
│   ├── StatusDropdown.tsx  # Status progression selector
│   └── TemperatureDropdown.tsx
└── ui/
    ├── Badge.tsx           # Status/temperature badge
    └── Pagination.tsx      # Cursor-based pagination controls
```

### Filter State

Filters are stored in URL search params (`useSearchParams`). Pagination uses a client-side cursor array to support next/prev navigation without refetching previous pages. Implemented in `admin/src/hooks/useFilters.ts`.

---

## 3. Backend (`backend/`)

### Stack

| Concern | Choice |
|---------|--------|
| Runtime | Node.js 22 (`nodejs22.x` Lambda runtime) |
| Language | TypeScript 5.7, compiled to ESM `.mjs` via `esbuild` |
| Architecture | Multiple focused Lambda functions, no framework |
| Validation | `zod` v3 |
| IDs | `ulidx` v2 (ULID — lexicographically sortable) |
| DynamoDB | `@aws-sdk/client-dynamodb` + `@aws-sdk/lib-dynamodb` v3 |
| Email | `@aws-sdk/client-ses` v3 (SES v1 API via `SendEmailCommand`) |
| SMS | `@aws-sdk/client-sns` v3 (SNS Publish to phone number) |
| Slack | `@slack/webhook` v7 (Incoming Webhook) |
| Secrets | `@aws-sdk/client-secrets-manager` (Slack webhook URL) |
| Auth (Admin API) | `@aws-sdk/client-cognito-identity-provider` (ListUsersCommand) |
| Phone Parsing | `libphonenumber-js` |

### Build

`esbuild.config.js` bundles each handler into a separate `.mjs` file in `backend/dist/`:

```
backend/dist/
├── createLead.mjs
├── leadsAdmin.mjs
├── processLeadNotifications.mjs
└── users.mjs
```

Build command: `npm run build` (runs `node esbuild.config.js`)

### Lambda Handler Patterns

**Pattern 1: HTTP API Handler (public, unauthenticated)**

`backend/src/handlers/createLead.ts` — `POST /leads`

```typescript
export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  // 1. Parse JSON body (catch malformed JSON → 400)
  // 2. Zod safeParse → 400 on failure with fieldErrors
  // 3. Generate ULID + timestamps
  // 4. Build entity with DynamoDB key patterns
  // 5. putLead(lead) → DynamoDB
  // 6. return created({ id, message })
  // 7. catch all → serverError()
};
```

**Pattern 2: HTTP API Handler (admin, JWT-protected, multi-route)**

`backend/src/handlers/leadsAdmin.ts` — handles all admin routes:

```typescript
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  const method = event.requestContext.http.method;
  const path = event.requestContext.http.path;

  // Route matching via method + path regex
  if (method === 'GET' && path === '/leads') return handleGetLeads(event);
  if (method === 'GET' && path.match(/^\/leads\/[^/]+$/)) return handleGetLead(event);
  if (method === 'PATCH' && path.match(/^\/leads\/[^/]+$/) && !path.includes('/notes')) return handleUpdateLead(event);
  if (method === 'POST' && path.match(/^\/leads\/[^/]+\/notes$/)) return handleAddNote(event);
  if (method === 'PATCH' && path.match(/^\/leads\/[^/]+\/notes\/[^/]+$/)) return handleEditNote(event);

  return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
};
```

JWT claims extracted from: `event.requestContext.authorizer?.jwt?.claims?.sub` (authorId) and `event.requestContext.authorizer?.jwt?.claims?.email` (authorName).

**Pattern 3: DynamoDB Streams Handler (event-driven)**

`backend/src/handlers/processLeadNotifications.ts` — triggered by `INSERT` events on the leads DynamoDB table:

```typescript
export const handler = async (event: DynamoDBStreamEvent): Promise<void> => {
  for (const record of event.Records) {
    if (record.eventName !== 'INSERT') continue;
    const lead = unmarshall(record.dynamodb?.NewImage as Record<string, AttributeValue>) as Lead;

    // Fire-and-forget pattern: each notification in try/catch, errors logged but don't block others
    try { await sendEmail(teamEmail); } catch (error) { console.error(...); }
    try { await sendEmail(customerReply); } catch (error) { console.error(...); }
    try { await sendSlackNotification(blocks, text); } catch (error) { console.error(...); }
    try {
      const smsRecipients = await getSmsEnabledUsers(docClient);
      for (const recipient of smsRecipients) {
        try { await sendSMS(recipient.phone, smsMessage); } catch (error) { ... }
      }
    } catch (error) { console.error(...); }
  }
};
```

### Response Helpers (`backend/src/utils/response.ts`)

No response envelope. Raw status + JSON body:

```typescript
export const created    = (data: unknown): APIGatewayProxyResultV2 => ({ statusCode: 201, body: JSON.stringify(data) });
export const ok         = (data: unknown): APIGatewayProxyResultV2 => ({ statusCode: 200, body: JSON.stringify(data) });
export const badRequest = (error: string, details?: unknown)        => ({ statusCode: 400, body: JSON.stringify({ error, details }) });
export const notFound   = (message = 'Not found')                   => ({ statusCode: 404, body: JSON.stringify({ error: message }) });
export const serverError = (message = 'Internal server error')      => ({ statusCode: 500, body: JSON.stringify({ error: message }) });
```

**Note:** CORS headers are NOT set by Lambda — they are handled by API Gateway's `cors_configuration` block.

### Validation (`backend/src/lib/validation.ts`)

All Zod schemas:

| Schema | Handler | Purpose |
|--------|---------|---------|
| `LeadSchema` | `createLead` | Validate contact form POST body |
| `LeadUpdateSchema` | `leadsAdmin` PATCH | Validate lead update body (at least one field) |
| `NoteCreateSchema` | `leadsAdmin` POST notes | Validate note content |
| `NoteUpdateSchema` | `leadsAdmin` PATCH notes | Validate note edit content |

Status progression validated by `validateStatusProgression(currentStatus, newStatus)`:
- Forward progression only: `NEW → CONTACTED → QUOTED → WON/LOST`
- Any status → `ARCHIVED`
- `ARCHIVED` → any status (restore)

### DynamoDB Access Layer (`backend/src/lib/dynamodb.ts`)

Singleton pattern (module-level client reused across warm starts):
```typescript
const client = new DynamoDBClient({});
export const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});
const TABLE_NAME = process.env.TABLE_NAME;
```

Functions exported:
- `putLead(lead)` → `PutCommand`
- `getLead(id)` → `GetCommand` with `PK: LEAD#${id}, SK: LEAD#${id}`
- `updateLead(id, updates)` → `UpdateCommand` with conditional expression, returns `ALL_NEW`
- `getLeads(params)` → `ScanCommand` with filter expressions + client-side search
- `putNote(note)` → `PutCommand`
- `getNotes(leadId)` → `QueryCommand` `begins_with(SK, 'NOTE#')`, `ScanIndexForward: false`
- `updateNote(leadId, noteId, content)` → query by noteId, then `UpdateCommand`

**Pagination:** Base64-encoded JSON of `{ PK, SK }` LastEvaluatedKey.

### Notification Services

| File | Service | Pattern |
|------|---------|---------|
| `backend/src/lib/ses.ts` | AWS SES | `SESClient` singleton + `SendEmailCommand` |
| `backend/src/lib/slack.ts` | Slack Webhook | `IncomingWebhook` singleton, URL cached from Secrets Manager |
| `backend/src/lib/sms.ts` | AWS SNS | `SNSClient` singleton + `PublishCommand` to phone number (E.164), `SMSType: Transactional` |
| `backend/src/lib/preferences.ts` | DynamoDB | Read/write `NotificationPreferences` items, query GSI1 for SMS-enabled users |

---

## 4. DynamoDB Table Schema

**Table name:** `tropico-leads-${environment}` (e.g. `tropico-leads-production`)

**Key schema:**
- PK: `S` (partition key)
- SK: `S` (range key)

**GSI1:**
- GSI1PK: `S`
- GSI1SK: `S`
- Projection: ALL
- Billing: PAY_PER_REQUEST

**DynamoDB Streams:** Enabled with `NEW_IMAGE` view type → triggers `processLeadNotifications` Lambda on INSERT.

### Item Patterns

**Lead item:**
```
PK:     LEAD#<ulid>
SK:     LEAD#<ulid>
GSI1PK: STATUS#<status>          (e.g. STATUS#NEW)
GSI1SK: <createdAt ISO 8601>
id:     <ulid>
status: NEW|CONTACTED|QUOTED|WON|LOST|ARCHIVED
temperature: HOT|WARM|COLD
firstName, lastName, email, phone?, company?, groupSize?,
preferredDates?, destination?, message
assigneeId?, assigneeName?
previousStatus?                   (set when archiving, cleared on restore)
createdAt, updatedAt
```

**Note item:**
```
PK:   LEAD#<leadId>               (co-located with parent lead)
SK:   NOTE#<timestamp>#<ulid>     (chronological sort within lead)
id:   <ulid>
leadId, content, authorId, authorName
type: MANUAL|SYSTEM
createdAt, updatedAt
```

**User notification preferences item:**
```
PK:    USER#<userId>
SK:    PREFS#notifications
GSI1PK: PREFS#sms-enabled         (only set when SMS is enabled AND phone set)
GSI1SK: <userId>
userId, channels: { email, slack, sms }
phone?                             (E.164 format)
createdAt, updatedAt
```

### Query Access Patterns

| Access Pattern | Method | Key Condition |
|----------------|--------|---------------|
| Get single lead | `GetCommand` | PK=`LEAD#id`, SK=`LEAD#id` |
| List leads (with filters) | `ScanCommand` + client filter | FilterExpression on status, temp, assignee, date, SK begins_with `LEAD#` |
| Get notes for lead | `QueryCommand` | PK=`LEAD#leadId`, SK begins_with `NOTE#`, descending |
| Get SMS-enabled users | `QueryCommand` on GSI1 | GSI1PK=`PREFS#sms-enabled` |
| Get user preferences | `GetCommand` | PK=`USER#userId`, SK=`PREFS#notifications` |

**Known limitation:** `getLeads` uses `ScanCommand` with fetchLimit=500 for MVP scale. Search is client-side (full scan). This is documented in the code as acceptable for ~100 leads.

---

## 5. Infrastructure (`infra/`)

### Terraform Layout

Two Terraform workspaces:

```
infra/                        # Root workspace (Route53, S3, CloudFront, ACM)
├── main.tf                   # Backend config (S3 state) + module.api reference
├── _locals.tf                # Domain names, environment-specific subdomains
├── _vars.tf                  # Root variables
├── _providers.tf             # AWS provider
├── _outputs.tf
├── acm.tf                    # Wildcard ACM cert (*.tropicoretreat.com)
├── cloudfront.tf             # Main website CloudFront + cache policies
├── admin-cloudfront.tf       # Admin dashboard CloudFront
├── s3.tf                     # Main website S3 bucket
├── admin-s3.tf               # Admin S3 bucket + OAC
├── route53.tf                # Main website DNS, domain registration
├── api-route53.tf            # api.tropicoretreat.com A record
├── admin-route53.tf          # admin.tropicoretreat.com A record
└── api/                      # Submodule workspace (Lambda, API GW, DynamoDB, Cognito)
    ├── main.tf               # AWS provider + API Gateway + Cognito JWT authorizer
    ├── lambda.tf             # Lambda functions (create_lead, leads_admin, users)
    ├── notifications.tf      # Notifications Lambda + DynamoDB Streams ESM + SQS DLQ
    ├── dynamodb.tf           # DynamoDB table (leads) with GSI1 + streams
    ├── cognito.tf            # Cognito User Pool + App Client
    ├── iam.tf                # IAM roles + inline policies
    ├── ses.tf                # SES domain identity + DKIM Route53 records (prod only)
    ├── secrets.tf            # Secrets Manager (Slack webhook URL)
    ├── variables.tf          # All module variables
    └── outputs.tf            # API endpoint, Cognito IDs, domain target for Route53
```

### Module Invocation

Root `infra/main.tf` calls the `api` submodule:
```hcl
module "api" {
  source                   = "./api"
  environment              = var.environment
  product_name             = var.product_name
  aws_region               = var.aws_region
  wildcard_certificate_arn = aws_acm_certificate.www_certificate.arn
  team_emails              = var.team_emails
  api_domain               = local.api_domain
  admin_domain             = local.admin_domain
}
```

S3 remote state: `s3://abs-terraform/tropico-retreats` (region `us-east-1`, profile `atlantic-blue`).

### Naming Convention

All resources: `tropico-<component>-${environment}` (e.g. `tropico-leads-production`, `tropico-create-lead-lambda-production`).

Tags on every resource:
```hcl
tags = {
  product     = "tropico-retreats"
  environment = var.environment
  gitRepo     = "github.com/atlantic-blue/tropicoretreat"
  managed_by  = "terraform"
}
```

### Lambda Configuration

All Lambdas share these properties:

| Setting | Value |
|---------|-------|
| Runtime | `nodejs22.x` |
| Architecture | `arm64` (Graviton — cheaper) |
| Handler pattern | `<filename>.handler` |
| Log retention | 14 days |
| Source | Single `.mjs` file from `backend/dist/` |

| Lambda | Memory | Timeout | Env Vars |
|--------|--------|---------|----------|
| `tropico-create-lead-${env}` | 256 MB | 30s | `TABLE_NAME`, `ENVIRONMENT` |
| `tropico-leads-admin-${env}` | 256 MB | 30s | `TABLE_NAME`, `ENVIRONMENT` |
| `tropico-users-${env}` | 128 MB | 10s | `USER_POOL_ID`, `ENVIRONMENT` |
| `tropico-notifications-${env}` | 256 MB | 60s | `ENVIRONMENT`, `TEAM_EMAILS`, `FROM_EMAIL_TEAM`, `FROM_EMAIL_CUSTOMER`, `FROM_NAME`, `ADMIN_DASHBOARD_URL`, `SLACK_WEBHOOK_SECRET_NAME` |

**Note:** `TABLE_NAME` is not set on the notifications Lambda — it reads from preferences via a separate DynamoDB client initialized in the handler. The preferences lib uses `process.env.TABLE_NAME ?? 'tropico-leads-production'` as a fallback.

### API Gateway

- Protocol: HTTP API (v2) — `aws_apigatewayv2_api`
- Stage: `$default`, auto_deploy=true
- Rate limiting: 10 req/s burst + 10 req/s rate (on default stage)
- CORS: Managed by API GW (not Lambda). Allowed origins include localhost:3000, localhost:5173, localhost:5174, and all production/staging domains.

Routes:

| Route | Auth | Lambda |
|-------|------|--------|
| `POST /leads` | None | `tropico-create-lead-${env}` |
| `GET /leads` | JWT (Cognito) | `tropico-leads-admin-${env}` |
| `GET /leads/{id}` | JWT (Cognito) | `tropico-leads-admin-${env}` |
| `PATCH /leads/{id}` | JWT (Cognito) | `tropico-leads-admin-${env}` |
| `POST /leads/{id}/notes` | JWT (Cognito) | `tropico-leads-admin-${env}` |
| `PATCH /leads/{id}/notes/{noteId}` | JWT (Cognito) | `tropico-leads-admin-${env}` |
| `GET /users` | JWT (Cognito) | `tropico-users-${env}` |

Custom domain: `api.tropicoretreat.com` (staging: `staging-api.tropicoretreat.com`) with `/v1` base path mapping.

JWT Authorizer: validates against Cognito User Pool, audience = App Client ID, identity source = `$request.header.Authorization`.

### Cognito User Pool

- Name: `tropico-admin-${environment}`
- No public sign-up — admin creates users only
- MFA: OPTIONAL (TOTP via software token)
- Password: 12+ chars, upper+lower+number+symbol
- Access token: 1 hour, Refresh token: 30 days
- Auth flows: `ALLOW_USER_SRP_AUTH`, `ALLOW_REFRESH_TOKEN_AUTH`, `ALLOW_ADMIN_USER_PASSWORD_AUTH`
- No client secret (browser app)
- Token revocation enabled

### Route53 & DNS

| Record | Type | Points To |
|--------|------|-----------|
| `tropicoretreat.com` | A (alias) | Main website CloudFront |
| `admin.tropicoretreat.com` | A (alias) | Admin CloudFront |
| `api.tropicoretreat.com` | A (alias) | API Gateway custom domain |
| `staging.tropicoretreat.com` | A (alias) | Staging website CloudFront |
| `staging-admin.tropicoretreat.com` | A (alias) | Staging admin CloudFront |
| `staging-api.tropicoretreat.com` | A (alias) | Staging API Gateway |
| `*._domainkey.tropicoretreat.com` (×3) | CNAME | SES DKIM records (prod only) |
| `tropicoretreat.com` | TXT | Google Search Console verification (prod only) |

Production creates the hosted zone + domain registration. Staging uses `data "aws_route53_zone"` to look up the existing zone by ID.

### SES Configuration

- Managed by Terraform at domain level (not per-address)
- Only in production (`count = var.environment == "staging" ? 0 : 1`)
- DKIM records in Route53 (3 CNAME records)
- Sending addresses: `leads@tropicoretreat.com` (team), `hello@tropicoretreat.com` (customer)
- IAM policy restricts SES send to those two From addresses specifically

### Secrets Manager

Single secret: `tropico/slack-webhook-url-${environment}`
Value must be set manually after apply:
```bash
aws secretsmanager put-secret-value \
  --secret-id tropico/slack-webhook-url-production \
  --secret-string "https://hooks.slack.com/services/..."
```

### IAM Roles

Two roles:
1. `tropico-create-lead-lambda-${env}` — shared by all HTTP API Lambdas (create_lead, leads_admin, users)
   - `dynamodb:PutItem`, `GetItem`, `Query`, `Scan`, `UpdateItem` on table + GSI1
   - `logs:CreateLogGroup`, `CreateLogStream`, `PutLogEvents` for all 3 Lambda log groups
   - `cognito-idp:ListUsers` on User Pool
2. `tropico-notifications-lambda-${env}` — used only by the notifications Lambda
   - `dynamodb:GetRecords`, `GetShardIterator`, `DescribeStream`, `ListStreams` on stream ARN
   - `dynamodb:GetItem`, `Query` on table + GSI1 (preferences lookup)
   - `ses:SendEmail`, `ses:SendRawEmail` (restricted to team + customer From addresses)
   - `sqs:SendMessage` on DLQ
   - `secretsmanager:GetSecretValue` on Slack webhook secret
   - `sns:Publish` on `*` (required for SMS to arbitrary phone numbers)

### Notifications DLQ

`tropico-notifications-dlq-${environment}` — SQS queue, 14-day retention. Receives failed DynamoDB Streams batches after 3 retries.

### CloudFront

Both admin and main site have identical cache behavior:
- HTML: short-term cache (1 hour default, 1 day max)
- `.js`, `.css`, `.webp`, `.jpg`, `.png`, `.woff2`: long-term cache (1 year, immutable)
- SPA routing: 403 and 404 → serve `/index.html` with 200
- Security headers: `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-XSS-Protection`, `Strict-Transport-Security` (1 year, includeSubDomains, preload)

---

## 6. Templates (`backend/src/templates/`)

| File | Output |
|------|--------|
| `teamNotification.ts` | HTML + text email to team with all lead fields and admin link |
| `customerAutoReply.ts` | HTML + text email to customer with reference number (TR-YYYY-XXXXXX) and 48-hour reply promise |
| `slackNotification.ts` | Slack Block Kit blocks for rich lead notification message |
| `smsNotification.ts` | Plain text SMS message with lead summary and admin URL |

---

## 7. Key Patterns Summary

**Adding a new Lambda handler:**
1. Create `backend/src/handlers/<name>.ts` exporting `handler` function
2. Add to `backend/esbuild.config.js` entry points
3. Add `data "archive_file"`, `aws_cloudwatch_log_group`, `aws_lambda_function`, and `aws_lambda_permission` to `infra/api/lambda.tf`
4. Add `aws_apigatewayv2_integration` + `aws_apigatewayv2_route` in `infra/api/main.tf`
5. Add IAM permissions to the appropriate role in `infra/api/iam.tf`

**Adding a new admin API call:**
1. Add function to `admin/src/api/leads.ts` using `fetchWithAuth<T>(path, options)`
2. Create a hook in `admin/src/hooks/` using `useQuery` or `useMutation` from TanStack Query
3. Use the hook in the appropriate page/component

**Adding a new frontend page:**
1. Add route to `Routes` enum in `frontend/src/Routes/appRoutes.tsx`
2. Create page component in `frontend/src/pages/`
3. Add `<Route>` in `frontend/src/Routes/router.tsx`
