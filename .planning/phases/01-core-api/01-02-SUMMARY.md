---
phase: 01-core-api
plan: 02
subsystem: infra
tags: [terraform, api-gateway, lambda, dynamodb, cors, http-api]

# Dependency graph
requires:
  - phase: 01-01
    provides: Lambda handler code at backend/dist/index.mjs
provides:
  - API Gateway HTTP API with CORS configuration
  - Lambda function with Node.js 22 and ARM64
  - DynamoDB table with GSI for status queries
  - IAM role with DynamoDB and CloudWatch permissions
  - POST /leads endpoint returning 201/400/500
affects: [02-frontend-integration, 05-admin-dashboard]

# Tech tracking
tech-stack:
  added:
    - "hashicorp/archive provider v2.7.1"
  patterns:
    - "Terraform module structure for API resources"
    - "API Gateway HTTP API with Lambda proxy integration"
    - "Environment-based resource naming with suffix"

key-files:
  created:
    - infra/api/variables.tf
    - infra/api/dynamodb.tf
    - infra/api/iam.tf
    - infra/api/lambda.tf
    - infra/api/main.tf
    - infra/api/outputs.tf
  modified:
    - infra/main.tf
    - infra/_outputs.tf
    - backend/esbuild.config.js

key-decisions:
  - "Module structure for API resources in infra/api/"
  - "Environment variable for dev/prod switching"
  - ".mjs extension for Lambda ESM compatibility"

patterns-established:
  - "Terraform module with environment-based naming"
  - "API Gateway HTTP API with CORS at gateway level"
  - "Lambda archive from esbuild output"

# Metrics
duration: 7min
completed: 2026-01-22
---

# Phase 1 Plan 2: Terraform Infrastructure Summary

**API Gateway HTTP API with Lambda integration and DynamoDB table - deployed to dev environment with CORS for localhost and production origins**

## Performance

- **Duration:** 7 min
- **Started:** 2026-01-22T13:18:14Z
- **Completed:** 2026-01-22T13:24:53Z
- **Tasks:** 3
- **Files created:** 6
- **Files modified:** 3

## Accomplishments

- Created Terraform module for API infrastructure in infra/api/
- Deployed API Gateway HTTP API with POST /leads route
- Deployed Lambda function with Node.js 22, ARM64, and DynamoDB integration
- Created DynamoDB table with pay-per-request billing and GSI1 for status queries
- Configured CORS for localhost (dev) and production origins
- Fixed ESM module loading with .mjs file extension

## Task Commits

Each task was committed atomically:

1. **Task 1: Create DynamoDB table and IAM resources** - `7cbbd1b` (chore)
2. **Task 2: Create Lambda function and API Gateway** - `bbbed26` (feat)
3. **Task 3: Deploy dev environment and verify endpoint** - `3ec5ce9` (fix)

## Files Created/Modified

- `infra/api/variables.tf` - Module variables for environment, product_name, aws_region, cors_allowed_origins
- `infra/api/dynamodb.tf` - DynamoDB table with PK/SK and GSI1 for status queries
- `infra/api/iam.tf` - Lambda execution role with DynamoDB and CloudWatch permissions
- `infra/api/lambda.tf` - Lambda function configuration with archive_file data source
- `infra/api/main.tf` - API Gateway HTTP API with CORS, routes, and integration
- `infra/api/outputs.tf` - API endpoint, Lambda function name, DynamoDB table name
- `infra/main.tf` - Added module reference for api module
- `infra/_outputs.tf` - Exposed api module outputs at root level
- `backend/esbuild.config.js` - Changed output to .mjs for ESM compatibility

## Decisions Made

1. **Module structure** - Created infra/api/ as a Terraform module referenced from root main.tf for clean separation
2. **Environment-based naming** - All resources use `${var.environment}` suffix for dev/prod isolation
3. **ESM file extension** - Changed Lambda artifact to .mjs for proper ESM module loading in Node.js 22

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed ESM Lambda module loading**

- **Found during:** Task 3 (Deploy dev environment and verify endpoint)
- **Issue:** Lambda returned 500 with "Cannot use import statement outside a module" error. Node.js runtime couldn't recognize index.js as ESM without .mjs extension or package.json type:module.
- **Fix:** Changed esbuild output from index.js to index.mjs, updated Terraform archive_file source
- **Files modified:** backend/esbuild.config.js, infra/api/lambda.tf
- **Verification:** POST /leads now returns 201 for valid submissions
- **Committed in:** 3ec5ce9 (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Essential fix for Lambda to function correctly. No scope creep.

## Issues Encountered

None beyond the ESM module loading bug which was fixed inline.

## User Setup Required

None - no external service configuration required.

## Verification Results

All success criteria verified:

1. **POST /leads accepts JSON payload** - Tested with firstName, lastName, email, message fields
2. **Valid submissions stored in DynamoDB** - Confirmed with ULID, timestamp, status=NEW
3. **Invalid submissions return 400** - Missing required fields returns validation errors
4. **CORS headers present** - Access-Control-Allow-Origin includes localhost:3000 and localhost:5173
5. **Dev environment with -dev suffix** - All resources: tropico-leads-dev, tropico-create-lead-dev, tropico-leads-api-dev

### API Endpoint

```
https://u57cra1p8h.execute-api.us-east-1.amazonaws.com
```

### Test Commands

```bash
# Valid submission
curl -X POST "https://u57cra1p8h.execute-api.us-east-1.amazonaws.com/leads" \
  -H "Content-Type: application/json" \
  -d '{"firstName":"John","lastName":"Doe","email":"john@example.com","message":"Test"}'
# Returns: {"id":"01KFJXZV...","message":"Lead created successfully"} (201)

# Invalid submission
curl -X POST "https://u57cra1p8h.execute-api.us-east-1.amazonaws.com/leads" \
  -H "Content-Type: application/json" \
  -d '{"firstName":"John"}'
# Returns: {"error":"Validation failed","details":{...}} (400)
```

## Next Phase Readiness

- Core API is deployed and functional
- Phase 1 (Core API) complete with both Lambda handler and infrastructure
- Ready for Phase 2 (Frontend Integration) to connect contact form to the API endpoint
- API endpoint URL: https://u57cra1p8h.execute-api.us-east-1.amazonaws.com

---
*Phase: 01-core-api*
*Completed: 2026-01-22*
