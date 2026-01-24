# Project State: Tropico Retreats Lead Management System

## Project Reference

**Core Value:** When a potential customer submits the contact form, the team is immediately notified and can access, track, and follow up on the lead through a central dashboard.

**Current Focus:** Phase 5 (Admin Dashboard) in progress.

## Current Position

**Phase:** 5 of 5 (Admin Dashboard)
**Plan:** 1 of 4 in current phase
**Status:** In progress
**Last activity:** 2026-01-24 - Completed 05-01-PLAN.md (Backend Types and DynamoDB Operations)

### Progress

```
Phase 1: Core API             [XX] Complete (2/2 plans)
Phase 2: Frontend Integration [XX] Complete (2/2 plans)
Phase 3: Notifications        [XXXX] Complete (4/4 plans)
Phase 4: Admin Auth           [XX] Complete (2/2 plans)
Phase 5: Admin Dashboard      [X   ] In progress (1/4 plans)
```

**Overall:** 11/14 plans complete (79%)

## Performance Metrics

| Metric | Value |
|--------|-------|
| Plans completed | 11 |
| Tasks completed | 31 |
| Blockers hit | 0 |
| Decisions made | 40 |

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

### Technical Notes

- **Dev environment:** Use `-dev` suffix for all resources
- **CORS:** Configured at API Gateway level with localhost + production origins
- **SES:** Domain identity verified with DKIM SUCCESS status
- **SES sandbox:** Still in sandbox mode - verify team emails or request production access
- **Cognito:** User Pool only (no Identity Pool needed for API-only access)
- **Frontend auth:** amazon-cognito-identity-js (not Amplify SDK - works with Terraform-managed pools)
- **WhatsApp:** Start Meta Business verification early if planning Phase 6
- **Lambda handler pattern:** DynamoDB/SES client singletons outside handler for warm starts
- **Build artifact:** `backend/dist/*.mjs` - createLead.mjs (64KB), processLeadNotifications.mjs (19KB)
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
- **JWT authorizer:** Protects GET /leads route, returns 401 without valid token
- **Admin user:** admin@tropicoretreat.com (CONFIRMED status)
- **Admin user sub:** 14480488-a031-7045-707c-dd115798955f
- **Auth flow pattern:** USER_SRP_AUTH (browser), ADMIN_USER_PASSWORD_AUTH (CLI)
- **Token refresh:** REFRESH_TOKEN_AUTH flow returns new access/id tokens
- **Sign out:** admin-user-global-sign-out revokes all refresh tokens
- **Lead temperature:** Required field, default WARM, options: HOT, WARM, COLD
- **Lead assignee:** Optional assigneeId (Cognito sub) and assigneeName (denormalized)
- **Note storage:** Co-located with leads using PK=LEAD#{leadId}, SK=NOTE#{timestamp}#{noteId}
- **DynamoDB operations:** getLeads (filters/pagination), getLead, updateLead, getNotes, putNote, updateNote

### Open Questions

None at this time.

### Blockers

None at this time.

### TODOs (Cross-Phase)

- [ ] Request SES production access (remove sandbox limits)
- [ ] Verify team email addresses in SES for dev testing
- [ ] Register domain for admin dashboard (admin.tropicoretreat.com)

## Session Continuity

### Last Session

**Date:** 2026-01-24
**Activity:** Completed 05-01-PLAN.md - Backend types and DynamoDB operations for admin dashboard
**Outcome:** Extended Lead type with temperature/assignee, added Note type, implemented 6 DynamoDB operations for dashboard queries/updates

### Next Session

**Resume with:** Phase 5 Plan 02 - API endpoints for leads and notes
**Context needed:** Review 05-01-SUMMARY.md for types and DynamoDB operations

---

*Last updated: 2026-01-24*
