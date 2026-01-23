---
phase: 04-admin-auth
plan: 01
subsystem: auth
tags: [cognito, jwt, api-gateway, terraform]

# Dependency graph
requires:
  - phase: 01-core-api
    provides: API Gateway HTTP API and Lambda integration
provides:
  - Cognito User Pool with admin-only user creation
  - App Client with SRP + admin password auth flows
  - JWT authorizer protecting GET /leads route
  - Terraform outputs for pool ID, endpoint, client ID
affects: [05-admin-dashboard, 04-02-admin-auth]

# Tech tracking
tech-stack:
  added: [aws-cognito-user-pool, aws-apigatewayv2-authorizer]
  patterns: [jwt-authorization, admin-only-signup]

key-files:
  created:
    - infra/api/cognito.tf
  modified:
    - infra/api/main.tf
    - infra/api/outputs.tf
    - infra/_outputs.tf

key-decisions:
  - "Admin-only user creation (no public sign-up)"
  - "MFA optional with software token enabled"
  - "No client secret for browser app (generate_secret = false)"
  - "ALLOW_ADMIN_USER_PASSWORD_AUTH for CLI testing in Plan 02"
  - "Token validity: 1 hour access/id, 30 days refresh"
  - "Localhost callback URLs in all environments for dev testing"

patterns-established:
  - "JWT authorizer: Reference User Pool endpoint and client ID"
  - "Protected routes: authorization_type = JWT with authorizer_id"

# Metrics
duration: 8min
completed: 2026-01-23
---

# Phase 4 Plan 01: Cognito Infrastructure Summary

**Cognito User Pool with admin-only signup, JWT authorizer protecting GET /leads, and Terraform outputs for frontend integration**

## Performance

- **Duration:** 8 min
- **Started:** 2026-01-23T21:00:00Z
- **Completed:** 2026-01-23T21:08:00Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- Deployed Cognito User Pool `tropico-admin-production` with admin-only user creation
- Deployed App Client with SRP + admin password auth flows, no client secret
- Created JWT authorizer attached to GET /leads route
- GET /leads returns 401 Unauthorized without valid JWT token

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Cognito User Pool and App Client** - `7654c70` (feat)
2. **Task 2: Create JWT Authorizer and protected GET /leads route** - `fff923b` (feat)
3. **Task 3: Deploy Cognito infrastructure and verify** - `e99f7db` (fix - exposed outputs at root)

## Files Created/Modified

- `infra/api/cognito.tf` - Cognito User Pool and App Client configuration
- `infra/api/main.tf` - JWT authorizer and GET /leads route with JWT authorization
- `infra/api/outputs.tf` - Module-level Cognito outputs
- `infra/_outputs.tf` - Root-level Cognito outputs for terraform output

## Deployed Resources

| Resource | ID/Value |
|----------|----------|
| User Pool ID | `us-east-1_vWmyWWEwX` |
| User Pool Endpoint | `cognito-idp.us-east-1.amazonaws.com/us-east-1_vWmyWWEwX` |
| Client ID | `i1req5nr80ihn4skjelp0ldp1` |
| API Endpoint | `https://u57cra1p8h.execute-api.us-east-1.amazonaws.com` |

## Verification Results

| Check | Result |
|-------|--------|
| User Pool AdminCreateUserOnly | True |
| User Pool MFA | OPTIONAL |
| App Client Auth Flows | SRP, Refresh, Admin Password |
| GET /leads without token | 401 Unauthorized |

## Decisions Made

1. **Admin-only user creation** - No public sign-up, users created by admins only
2. **MFA optional** - Software token MFA enabled but not required
3. **No client secret** - Browser app cannot securely store secrets
4. **ALLOW_ADMIN_USER_PASSWORD_AUTH** - Enables CLI testing in Plan 02
5. **Localhost in all environments** - Simplifies dev testing across environments

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Root outputs not exposed**
- **Found during:** Task 3 (Verification)
- **Issue:** Cognito outputs were defined in api module but not exposed at root level
- **Fix:** Added outputs to `infra/_outputs.tf` to reference module outputs
- **Files modified:** infra/_outputs.tf
- **Verification:** `terraform output cognito_user_pool_id` returns correct value
- **Committed in:** e99f7db

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Essential for verification and Phase 5 integration. No scope creep.

## Issues Encountered

None - deployment completed without errors.

## User Setup Required

None - no external service configuration required. Admin users will be created in Plan 02.

## Next Phase Readiness

**Ready for Plan 02:**
- Cognito User Pool and App Client deployed
- JWT authorizer attached to GET /leads
- Outputs available for admin user creation via CLI

**For Phase 5 (Admin Dashboard):**
- User Pool ID: `us-east-1_vWmyWWEwX`
- Client ID: `i1req5nr80ihn4skjelp0ldp1`
- Issuer: `https://cognito-idp.us-east-1.amazonaws.com/us-east-1_vWmyWWEwX`

---
*Phase: 04-admin-auth*
*Completed: 2026-01-23*
