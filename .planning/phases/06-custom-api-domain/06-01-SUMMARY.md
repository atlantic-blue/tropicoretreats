---
phase: 06-custom-api-domain
plan: 01
subsystem: infra
tags: [api-gateway, custom-domain, route53, throttling, tls]

# Dependency graph
requires:
  - phase: 01-core-api
    provides: API Gateway HTTP API (u57cra1p8h) with /leads endpoints
  - phase: 04-admin-auth
    provides: JWT authorizer for protected routes
provides:
  - Custom domain api.tropicoretreat.com for API Gateway
  - /v1 base path mapping for API versioning
  - Rate limiting at 10 req/sec with burst of 10
  - Route53 A record aliasing to API Gateway
affects: [07-slack-notifications, 08-sms-notifications, 09-email-to-lead, 10-phone-to-lead]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Custom domain with regional endpoint and TLS 1.2
    - API versioning via base path mapping (/v1)
    - Default route throttling for rate limiting

key-files:
  created:
    - infra/api-route53.tf
  modified:
    - infra/api/main.tf
    - infra/api/outputs.tf
    - infra/api/variables.tf
    - infra/main.tf
    - infra/_outputs.tf
    - frontend/.env

key-decisions:
  - "Used existing wildcard certificate (*.tropicoretreat.com) for custom domain"
  - "API versioning via /v1 base path, not subdomain"
  - "Rate limit 10 req/sec - sufficient for current traffic, easy to increase"

patterns-established:
  - "Custom domain configuration: aws_apigatewayv2_domain_name + aws_apigatewayv2_api_mapping"
  - "Route53 alias for API Gateway: module.api.api_domain_target/zone_id outputs"
  - "Never remove throttling settings once added (Terraform bug sets to 0)"

# Metrics
duration: 10min
completed: 2026-01-26
---

# Phase 6 Plan 1: Custom API Domain Summary

**Custom domain api.tropicoretreat.com with /v1 base path, TLS 1.2, and rate limiting at 10 req/sec deployed and verified**

## Performance

- **Duration:** 10 min
- **Started:** 2026-01-26T00:31:23Z
- **Completed:** 2026-01-26T00:41:46Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments

- Custom domain api.tropicoretreat.com configured with wildcard SSL certificate
- API versioning via /v1 base path mapping (future-proofs for /v2)
- Rate limiting at 10 requests/second with burst of 10 protects against abuse
- Both frontends updated and deployed with new API URL
- Old execute-api endpoint continues working (backwards compatibility)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add custom domain, API mapping, and throttling to Terraform** - `1959448` (feat)
2. **Task 2: Add Route53 record and deploy infrastructure** - `95c3361` (feat)
3. **Task 3: Update frontends and verify end-to-end** - `19489e3` (feat)

## Files Created/Modified

- `infra/api/main.tf` - Added aws_apigatewayv2_domain_name, api_mapping, throttling
- `infra/api/outputs.tf` - Added api_domain_target and api_domain_zone_id outputs
- `infra/api/variables.tf` - Added wildcard_certificate_arn variable
- `infra/main.tf` - Pass certificate ARN to api module
- `infra/api-route53.tf` - Route53 A record alias for api subdomain
- `infra/_outputs.tf` - Added api_custom_domain output
- `frontend/.env` - Updated API_URL to new custom domain
- `admin/.env` - Updated VITE_API_ENDPOINT to new custom domain (gitignored)

## Decisions Made

1. **Used existing wildcard certificate** - The *.tropicoretreat.com certificate already covers api.tropicoretreat.com, no new cert needed
2. **Base path /v1 for versioning** - Cleaner than subdomain versioning (v1.api.x.com), allows multiple versions on same domain
3. **Rate limit 10/sec** - Conservative starting point; easy to increase via Terraform if needed
4. **Regional endpoint** - Lower latency than edge-optimized for single-region deployment

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

1. **Node.js 23 ESM module resolution** - Frontend webpack build failed with ERR_MODULE_NOT_FOUND due to Node 23's stricter ESM handling. Fixed by using `npx tsx` instead of `ts-node` to run webpack.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Custom domain ready for external integrations (Twilio webhooks in Phase 8/10)
- All endpoints accessible at api.tropicoretreat.com/v1/*
- Rate limiting provides basic abuse protection
- Ready for Phase 7 (Slack Notifications)

---
*Phase: 06-custom-api-domain*
*Completed: 2026-01-26*
