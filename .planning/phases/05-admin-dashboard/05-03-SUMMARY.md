---
phase: 05-admin-dashboard
plan: 03
subsystem: infra
tags: [lambda, api-gateway, terraform, jwt, cognito]

# Dependency graph
requires:
  - phase: 04-admin-auth
    provides: Cognito User Pool, JWT authorizer for API Gateway
  - phase: 05-02
    provides: Lambda handlers (leadsAdmin.mjs, users.mjs)
provides:
  - leadsAdmin Lambda function deployed to AWS
  - users Lambda function deployed to AWS
  - API Gateway routes with JWT authorization
  - GET /leads, GET /leads/{id}, PATCH /leads/{id} endpoints
  - POST /leads/{id}/notes, PATCH /leads/{id}/notes/{noteId} endpoints
  - GET /users endpoint for Cognito user listing
affects: [05-admin-dashboard, frontend-integration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Multi-route Lambda pattern (single handler routes by method/path)"
    - "data.archive_file for Lambda zipping (vs manual npm zip)"
    - "Shared Lambda IAM role across multiple functions"

key-files:
  created: []
  modified:
    - infra/api/lambda.tf
    - infra/api/iam.tf
    - infra/api/main.tf

key-decisions:
  - "Shared IAM role for all API Lambda functions (reuse existing lambda role)"
  - "Targeted terraform apply to handle integration/route dependency order"
  - "data.archive_file for Lambda deployment (consistent with existing pattern)"

patterns-established:
  - "Multi-route Lambda integration: single integration supports multiple routes"
  - "Admin endpoints pattern: all admin routes require JWT authorization"

# Metrics
duration: 6min
completed: 2026-01-24
---

# Phase 5 Plan 3: Terraform Infrastructure for Admin Endpoints Summary

**Deployed leadsAdmin and users Lambda functions with 6 JWT-protected API Gateway routes for admin dashboard**

## Performance

- **Duration:** 6 min
- **Started:** 2026-01-24T05:53:51Z
- **Completed:** 2026-01-24T05:59:04Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Deployed tropico-leads-admin-production Lambda (256MB, 30s timeout)
- Deployed tropico-users-production Lambda (128MB, 10s timeout)
- Created 6 JWT-protected API Gateway routes for admin operations
- Added PATCH to CORS allowed methods for lead updates
- Updated IAM policies for DynamoDB Scan/UpdateItem and Cognito ListUsers

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Lambda functions for admin handlers** - `5f6138f` (feat)
2. **Task 2: Add API Gateway routes and integrations** - `4b99aed` (feat)
3. **Task 3: Build, zip, and deploy** - Verified deployment via terraform apply

## Files Created/Modified
- `infra/api/lambda.tf` - Added leads_admin and users Lambda functions with CloudWatch log groups and API Gateway permissions
- `infra/api/iam.tf` - Added DynamoDB Scan/UpdateItem permissions, Cognito ListUsers permission, expanded CloudWatch logs policy
- `infra/api/main.tf` - Added leads_admin and users integrations, 6 new routes with JWT auth, CORS PATCH method

## Decisions Made
- **Shared Lambda IAM role:** Reused existing tropico-create-lead-lambda role for all API Lambda functions rather than creating separate roles per function
- **data.archive_file pattern:** Used Terraform archive_file for Lambda zipping (consistent with existing createLead and notifications patterns) rather than npm script
- **Targeted apply for dependency:** Used targeted terraform apply to update route before deleting old integration (API Gateway route/integration ordering)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added DynamoDB Scan and UpdateItem permissions**
- **Found during:** Task 1 (IAM policy review)
- **Issue:** Existing IAM policy only had PutItem, GetItem, Query - leadsAdmin handler uses Scan and UpdateItem
- **Fix:** Added dynamodb:Scan and dynamodb:UpdateItem to lambda_dynamodb policy
- **Files modified:** infra/api/iam.tf
- **Verification:** terraform validate passes, Lambda can query and update leads
- **Committed in:** 5f6138f (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Essential for Lambda to function correctly. No scope creep.

## Issues Encountered
- **Terraform delete order conflict:** Initial terraform apply failed because it tried to delete the old get_leads integration while still referenced by the route. Resolved with targeted apply to first create new integration and update route, then full apply succeeded.

## User Setup Required

None - no external service configuration required. Admin credentials already configured in Phase 4.

## Next Phase Readiness
- All admin API endpoints deployed and protected with JWT
- Verified: Unauthenticated requests return 401
- Verified: Authenticated requests to GET /leads return 200 with lead data
- Verified: GET /users returns Cognito user list
- Ready for Phase 5 Plan 4: Frontend Admin Dashboard UI

---
*Phase: 05-admin-dashboard*
*Completed: 2026-01-24*
