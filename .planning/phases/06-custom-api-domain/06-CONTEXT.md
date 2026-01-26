# Phase 6: Custom API Domain - Context

**Gathered:** 2026-01-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Configure api.tropicoretreat.com to point to the existing API Gateway HTTP API. ACM certificate for HTTPS with auto-renewal. Foundation for stable Twilio webhook URLs in later phases.

</domain>

<decisions>
## Implementation Decisions

### URL Structure
- All existing routes exposed on custom domain (leads, users, contact, future webhooks)
- Add `/v1` prefix to all endpoints for API versioning
- Final paths: `api.tropicoretreat.com/v1/leads`, `/v1/users`, `/v1/contact`, etc.
- Future webhooks also versioned: `/v1/webhooks/twilio`
- Frontend switches to new domain immediately after deployment

### Rate Limiting
- Basic protection: 10 requests/second per IP across all endpoints
- Same limits for public and admin endpoints (simpler)
- Return 429 Too Many Requests when limit exceeded (standard HTTP, client retries)

### Claude's Discretion
- Certificate validation method (DNS or email)
- API Gateway stage mapping configuration
- CORS updates for new domain
- Terraform resource naming

</decisions>

<specifics>
## Specific Ideas

- Versioned API from the start prepares for future breaking changes
- Webhooks under same versioning scheme for consistency

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-custom-api-domain*
*Context gathered: 2026-01-26*
