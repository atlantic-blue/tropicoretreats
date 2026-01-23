# Project State: Tropico Retreats Lead Management System

## Project Reference

**Core Value:** When a potential customer submits the contact form, the team is immediately notified and can access, track, and follow up on the lead through a central dashboard.

**Current Focus:** Phase 3 (Notifications) complete. Ready for Phase 4 (Admin Auth).

## Current Position

**Phase:** 3 of 5 (Notifications) - COMPLETE
**Plan:** 4 of 4 in current phase
**Status:** Complete
**Last activity:** 2026-01-23 - Completed 03-04-PLAN.md (Verification)

### Progress

```
Phase 1: Core API             [XX] Complete (2/2 plans)
Phase 2: Frontend Integration [XX] Complete (2/2 plans)
Phase 3: Notifications        [XXXX] Complete (4/4 plans)
Phase 4: Admin Auth           [  ] Not started
Phase 5: Admin Dashboard      [  ] Not started
```

**Overall:** 8/10 plans complete (80%)

## Performance Metrics

| Metric | Value |
|--------|-------|
| Plans completed | 8 |
| Tasks completed | 22 |
| Blockers hit | 0 |
| Decisions made | 27 |

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

### Technical Notes

- **Dev environment:** Use `-dev` suffix for all resources
- **CORS:** Configured at API Gateway level with localhost + production origins
- **SES:** Domain identity verified with DKIM SUCCESS status
- **SES sandbox:** Still in sandbox mode - verify team emails or request production access
- **Cognito:** Set up both User Pool AND Identity Pool
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

**Date:** 2026-01-23
**Activity:** Completed 03-04-PLAN.md - End-to-end notification testing and verification
**Outcome:** 3 tasks completed, test lead submitted, team and customer emails verified, user approved checkpoint, Phase 3 complete

### Next Session

**Resume with:** Plan Phase 4 (Admin Auth) - Cognito User Pool setup for admin dashboard
**Context needed:** Review admin authentication requirements in ROADMAP.md

---

*Last updated: 2026-01-23*
