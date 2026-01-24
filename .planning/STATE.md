# Project State: Tropico Retreats Lead Management System

## Project Reference

**Core Value:** When a potential customer submits the contact form, the team is immediately notified and can access, track, and follow up on the lead through a central dashboard.

**Current Focus:** Phase 5 (Admin Dashboard) in progress.

## Current Position

**Phase:** 5 of 5 (Admin Dashboard)
**Plan:** 6 of 7 in current phase
**Status:** In progress
**Last activity:** 2026-01-24 - Completed 05-06-PLAN.md (Lead List Page)

### Progress

```
Phase 1: Core API             [XX] Complete (2/2 plans)
Phase 2: Frontend Integration [XX] Complete (2/2 plans)
Phase 3: Notifications        [XXXX] Complete (4/4 plans)
Phase 4: Admin Auth           [XX] Complete (2/2 plans)
Phase 5: Admin Dashboard      [XXXXXX ] In progress (6/7 plans)
```

**Overall:** 16/17 plans complete (94%)

## Performance Metrics

| Metric | Value |
|--------|-------|
| Plans completed | 16 |
| Tasks completed | 46 |
| Blockers hit | 0 |
| Decisions made | 54 |

## Accumulated Context

### Key Decisions

| Decision | Rationale | Phase |
|----------|-----------|-------|
| Terraform for IaC | Serverless-optimized, local testing | Pre-planning |
| HTTP API over REST | 70% cheaper, native JWT support | Pre-planning |
| Single-table DynamoDB | Simpler queries, cost-effective | Pre-planning |
| Separate admin dashboard | Different auth patterns from marketing site | Pre-planning |
| ESM module format | Node.js 22 Lambda runtime fully supports ESM | 01-01 |
| External @aws-sdk/* | Pre-installed in Lambda runtime, reduces bundle | 01-01 |
| ULID for lead IDs | Sortable, cryptographically secure | 01-01 |
| Zod for validation | TypeScript-first, better type inference | 01-01 |
| Module structure for API | Clean separation in infra/api/ referenced from root | 01-02 |
| Environment-based naming | All resources use ${environment} suffix for dev/prod isolation | 01-02 |
| .mjs extension for Lambda | Proper ESM module loading in Node.js 22 | 01-02 |
| Empty strings for optional form fields | Simpler controlled input handling vs undefined | 02-01 |
| AbortController for fetch timeout | 30s timeout per design decision | 02-01 |
| env.api.contactUrl pattern | Consistent with existing env.ts patterns | 02-01 |
| Toast bottom-center positioning | Contact form feedback context per CONTEXT.md | 02-01 |
| Fieldset wrapper for disabled state | Applies disabled to all inputs at once | 02-02 |
| Submit button outside fieldset | Shows loading spinner while inputs disabled | 02-02 |
| Generic handleChange with e.target.name | Handles all input types uniformly | 02-02 |
| ContactForm component extraction | Reusable form on Contact page and Landing page | 02-02 |
| domain_name local in api module | Simpler than passing as variable, domain is constant | 03-01 |
| Data source for Route53 zone lookup | Follows existing pattern, no module refactoring needed | 03-01 |
| SES client singleton | Follows dynamodb.ts pattern for warm start reuse | 03-02 |
| Reference number TR-YYYY-XXXXXX | crypto.randomBytes(3) for 6 hex chars, year prefix | 03-02 |
| Email template { subject, html, text } | Consistent structure for all email types | 03-02 |
| Independent email sends | Team/customer emails don't block each other on failure | 03-02 |
| esbuild outdir + outExtension | Multi-entry build for separate handler bundles | 03-02 |
| NEW_IMAGE stream view type | Only need new data for notifications, reduces payload | 03-03 |
| Maximum 3 retry attempts | Balance between reliability and DLQ escalation | 03-03 |
| 14-day DLQ message retention | Sufficient time for debugging failed notifications | 03-03 |
| Conditional SES IAM policy | Scoped to specific from-addresses for security | 03-03 |
| Import existing AWS resources | Preserve data and avoid downtime vs recreate | 03-03 |
| Production environment deployment | Dev resources didn't exist, production focus | 03-03 |
| amazon-cognito-identity-js over Amplify | Terraform-managed Cognito, lighter bundle, no Amplify CLI dependency | 04-planning |
| Admin-only user creation | No public sign-up, users created by admins only | 04-01 |
| MFA optional with software token | Enabled but not required for flexibility | 04-01 |
| No client secret for browser app | Browser cannot securely store secrets | 04-01 |
| ALLOW_ADMIN_USER_PASSWORD_AUTH | Enables CLI testing in Plan 02 | 04-01 |
| Localhost callback URLs in all environments | Simplifies dev testing across environments | 04-01 |
| Admin user email admin@tropicoretreat.com | Consistent with domain naming convention | 04-02 |
| Password set via admin-set-user-password | Bypasses FORCE_CHANGE_PASSWORD for testing | 04-02 |
| GET /leads 400 validates authorizer | Lambda reached means JWT passed; proves auth works | 04-02 |
| Default temperature WARM for new leads | Middle priority for new leads; adjustable during qualification | 05-01 |
| Scan-based lead queries for MVP | Acceptable with small dataset; production needs GSI per filter | 05-01 |
| Note SK format NOTE#{timestamp}#{noteId} | Enables chronological sorting via SK comparison | 05-01 |
| Forward-only status progression | Business rule preventing leads from moving backwards in pipeline | 05-01 |
| Base64-encoded pagination cursor | Safely encodes DynamoDB LastEvaluatedKey for URL transport | 05-01 |
| APIGatewayProxyEventV2WithJWTAuthorizer type | Proper typing for handlers with JWT authorizer, includes claims access | 05-02 |
| Multi-route Lambda handler pattern | Single handler routes requests based on HTTP method and path | 05-02 |
| System notes for field changes | Auto-log status/temperature/assignee changes as SYSTEM type notes | 05-02 |
| Shared Lambda IAM role | Reuse existing lambda role for all API Lambda functions | 05-03 |
| data.archive_file for Lambda zipping | Consistent with existing pattern vs npm script | 05-03 |
| Targeted terraform apply | Handle integration/route dependency order for API Gateway | 05-03 |
| Vite React admin app on port 5174 | Different port from frontend marketing site at 5173 | 05-04 |
| Tailwind CSS v4 with @import | Modern PostCSS integration, cleaner output | 05-04 |
| AuthContext handles newPasswordRequired | Support first-time login after admin creates user | 05-04 |
| TanStack Query 5min staleTime | Balance between freshness and API calls for lead data | 05-04 |
| Reuse wildcard ACM certificate | Existing *.tropicoretreat.com covers admin subdomain, no new cert needed | 05-05 |
| CloudFront OAC over OAI | Use modern Origin Access Control instead of legacy Origin Access Identity | 05-05 |
| Share CloudFront cache policies | Reuse existing long_term_cache and short_term_cache policies | 05-05 |
| SPA error handling 403/404 to index.html | CloudFront returns index.html for missing paths to support client-side routing | 05-05 |
| Token getter singleton for API auth | API client module can't use hooks; setTokenGetter called from component | 05-06 |
| URL state for filters via useSearchParams | Enables shareable/bookmarkable filter views; resets page on filter change | 05-06 |
| Debounced search (300ms) | Prevents API spam during typing; waits before triggering query | 05-06 |
| Custom MultiSelect dropdown component | Native select doesn't support multi-select; provides better UX | 05-06 |

### Technical Notes

- **Dev environment:** Use `-dev` suffix for all resources
- **CORS:** Configured at API Gateway level with localhost + production origins, includes PATCH method
- **SES:** Domain identity verified with DKIM SUCCESS status
- **SES sandbox:** Still in sandbox mode - verify team emails or request production access
- **Cognito:** User Pool only (no Identity Pool needed for API-only access)
- **Frontend auth:** amazon-cognito-identity-js (not Amplify SDK - works with Terraform-managed pools)
- **WhatsApp:** Start Meta Business verification early if planning Phase 6
- **Lambda handler pattern:** DynamoDB/SES client singletons outside handler for warm starts
- **Build artifact:** `backend/dist/*.mjs` - createLead.mjs (64KB), processLeadNotifications.mjs (19KB), leadsAdmin.mjs (72KB), users.mjs (1KB)
- **API endpoint (production):** https://u57cra1p8h.execute-api.us-east-1.amazonaws.com
- **Frontend API config:** env.api.contactUrl from process.env.API_URL
- **Toast retry pattern:** onRetry callback for network error recovery
- **Controlled form pattern:** useState + handleChange + handleSubmit
- **Loading UX pattern:** spinner + text change + fieldset disabled
- **SES email addresses:** leads@tropicoretreat.com (team), hello@tropicoretreat.com (customer)
- **Email templates:** Table-based HTML with inline CSS, plain text alternative
- **Stream handler:** Filter INSERT events, unmarshall NewImage, send emails
- **Reference number format:** TR-YYYY-XXXXXX (e.g., TR-2026-A3F7B2)
- **DynamoDB Streams:** Enabled on tropico-leads-production with NEW_IMAGE view type
- **Event source mapping:** INSERT filter, batch_size=10, max_retry=3
- **DLQ:** tropico-notifications-dlq-production with 14-day retention
- **Terraform state:** All resources managed from `infra/` directory (not `infra/api/` separately)
- **Cognito User Pool ID:** us-east-1_vWmyWWEwX
- **Cognito Client ID:** i1req5nr80ihn4skjelp0ldp1
- **Cognito Issuer:** https://cognito-idp.us-east-1.amazonaws.com/us-east-1_vWmyWWEwX
- **JWT authorizer:** Protects all admin routes, returns 401 without valid token
- **Admin user:** admin@tropicoretreat.com (CONFIRMED status)
- **Admin user sub:** 14480488-a031-7045-707c-dd115798955f
- **Auth flow pattern:** USER_SRP_AUTH (browser), ADMIN_USER_PASSWORD_AUTH (CLI)
- **Token refresh:** REFRESH_TOKEN_AUTH flow returns new access/id tokens
- **Sign out:** admin-user-global-sign-out revokes all refresh tokens
- **Lead temperature:** Required field, default WARM, options: HOT, WARM, COLD
- **Lead assignee:** Optional assigneeId (Cognito sub) and assigneeName (denormalized)
- **Note storage:** Co-located with leads using PK=LEAD#{leadId}, SK=NOTE#{timestamp}#{noteId}
- **DynamoDB operations:** getLeads (filters/pagination), getLead, updateLead, getNotes, putNote, updateNote
- **Lambda functions (05-03):** tropico-leads-admin-production, tropico-users-production
- **leadsAdmin routes:** GET /leads, GET /leads/{id}, PATCH /leads/{id}, POST /leads/{id}/notes, PATCH /leads/{id}/notes/{noteId}
- **users route:** GET /users (lists confirmed Cognito users for assignee dropdown)
- **JWT claims extraction:** event.requestContext.authorizer.jwt.claims.sub/email
- **API Gateway routes (all JWT-protected):** GET /leads, GET /leads/{id}, PATCH /leads/{id}, POST /leads/{id}/notes, PATCH /leads/{id}/notes/{noteId}, GET /users
- **Lambda IAM:** DynamoDB (PutItem, GetItem, Query, Scan, UpdateItem), Cognito (ListUsers), CloudWatch Logs
- **Admin S3 bucket:** admin.tropicoretreat.com
- **Admin CloudFront distribution:** E2PCJ44NUGPNHQ (d2ezg3vdozz888.cloudfront.net)
- **Admin URL:** https://admin.tropicoretreat.com
- **Admin deploy command:** aws s3 sync ./dist s3://admin.tropicoretreat.com --delete
- **Admin cache invalidation:** aws cloudfront create-invalidation --distribution-id E2PCJ44NUGPNHQ --paths "/*"
- **Admin dashboard stack (05-04):** Vite + React 19 + TypeScript + TanStack Query v5 + React Router v7 + Tailwind v4
- **Admin dev server:** Port 5174 (distinct from frontend at 5173)
- **Admin auth pattern:** AuthContext with USER_SRP_AUTH flow, newPasswordRequired handling
- **Admin protected routes:** AppShell component redirects to /login when not authenticated
- **Admin QueryClient config:** 5min staleTime, 30min gcTime, 1 retry, refetchOnWindowFocus
- **Admin build output:** 450KB JS bundle, 29KB CSS (with lead list page)
- **Lead list page components:** LeadCard, LeadGrid, LeadFilters, Pagination
- **Lead list hooks:** useLeads (TanStack Query), useFilters (URL state), useDebouncedValue
- **Lead list API:** leadsApi.list(), usersApi.list() for assignee dropdown
- **Lead card display:** Name, status badge, temperature flame icon, relative timestamp
- **Lead filters:** Search, status[], temperature[], assignee, date range (react-day-picker)
- **Lead grid:** Responsive 3-column layout (grid-cols-1 md:grid-cols-2 lg:grid-cols-3)
- **Pagination:** 15 leads per page, page numbers with prev/next navigation

### Open Questions

None at this time.

### Blockers

None at this time.

### TODOs (Cross-Phase)

- [ ] Request SES production access (remove sandbox limits)
- [ ] Verify team email addresses in SES for dev testing
- [x] Register domain for admin dashboard (admin.tropicoretreat.com) - DONE via Route53

## Session Continuity

### Last Session

**Date:** 2026-01-24
**Activity:** Completed 05-06-PLAN.md - Lead List Page
**Outcome:** Built lead list page with card grid, filters, search, and pagination

### Next Session

**Resume with:** Phase 5 Plan 07 - Lead Detail Page
**Context needed:** Review 05-06-SUMMARY.md for list page patterns, use leadsApi.get()/update() for detail view

---

*Last updated: 2026-01-24*
