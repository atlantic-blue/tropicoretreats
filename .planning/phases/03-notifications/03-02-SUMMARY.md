---
phase: 03-notifications
plan: 02
subsystem: api
tags: [ses, dynamodb-streams, lambda, email-templates, typescript]

# Dependency graph
requires:
  - phase: 01-01
    provides: DynamoDB client singleton pattern, Lead type definition
provides:
  - SES client singleton for email sending
  - Team notification HTML email template
  - Customer auto-reply HTML email template with reference number
  - DynamoDB stream handler for lead notifications
  - Multi-entry esbuild configuration
affects: [03-03-infrastructure, 05-admin-dashboard]

# Tech tracking
tech-stack:
  added:
    - "@aws-sdk/client-ses (dev dependency for types)"
  patterns:
    - "SES client singleton outside handler for warm starts"
    - "Multi-entry esbuild with outdir and outExtension"
    - "DynamoDB stream unmarshalling with @aws-sdk/util-dynamodb"

key-files:
  created:
    - "backend/src/lib/ses.ts"
    - "backend/src/utils/referenceNumber.ts"
    - "backend/src/utils/formatTime.ts"
    - "backend/src/templates/teamNotification.ts"
    - "backend/src/templates/customerAutoReply.ts"
    - "backend/src/handlers/processLeadNotifications.ts"
  modified:
    - "backend/esbuild.config.js"
    - "backend/package.json"

key-decisions:
  - "SES client singleton follows dynamodb.ts pattern for warm start reuse"
  - "Reference number format TR-YYYY-XXXXXX using crypto.randomBytes"
  - "London timezone formatting with Intl.DateTimeFormat"
  - "Table-based HTML layouts with inline CSS for email client compatibility"
  - "Independent email sends - team and customer emails don't block each other"
  - "Changed esbuild from outfile to outdir + outExtension for multi-handler build"

patterns-established:
  - "Email template pattern: returns { subject, html, text } object"
  - "Stream handler pattern: filter by eventName, unmarshall NewImage"
  - "Utility function pattern: single-purpose exports in utils/"

# Metrics
duration: 4min
completed: 2026-01-23
---

# Phase 3 Plan 02: Notification Lambda Handler Summary

**DynamoDB stream handler with SES email templates for team notification and customer auto-reply**

## Performance

- **Duration:** 4 min
- **Started:** 2026-01-23T12:47:35Z
- **Completed:** 2026-01-23T12:51:18Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments

- SES client singleton following existing DynamoDB client pattern
- HTML email templates with table layouts, inline CSS, and plain text alternatives
- Team notification includes all lead fields with London timezone timestamp
- Customer auto-reply includes reference number (TR-YYYY-XXXXXX) and 48-hour response promise
- DynamoDB stream handler processes INSERT events and sends both emails
- Updated esbuild to produce multiple handler bundles (createLead.mjs, processLeadNotifications.mjs)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create SES client and utility functions** - `c0d8416` (feat)
2. **Task 2: Create HTML email templates** - `63e7279` (feat)
3. **Task 3: Create notification Lambda handler and update build** - `b937f2e` (feat)

## Files Created/Modified

- `backend/src/lib/ses.ts` - SES client singleton with sendEmail function
- `backend/src/utils/referenceNumber.ts` - Reference number generator TR-YYYY-XXXXXX
- `backend/src/utils/formatTime.ts` - London timezone formatter
- `backend/src/templates/teamNotification.ts` - Team notification HTML email
- `backend/src/templates/customerAutoReply.ts` - Customer auto-reply HTML email
- `backend/src/handlers/processLeadNotifications.ts` - DynamoDB stream handler
- `backend/esbuild.config.js` - Updated for multiple entry points
- `backend/package.json` - Added @aws-sdk/client-ses dev dependency

## Decisions Made

1. **SES client outside handler** - Follows established dynamodb.ts pattern for warm start reuse
2. **Reference number format** - TR-YYYY-XXXXXX using crypto.randomBytes(3) for 6 hex chars
3. **Email template structure** - Export function returning { subject, html, text } object
4. **Independent email sends** - Team and customer emails don't block each other on failure
5. **esbuild multi-entry** - Changed from outfile to outdir + outExtension for handler separation

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed @aws-sdk/client-ses dev dependency**
- **Found during:** Task 1 (SES client creation)
- **Issue:** TypeScript compilation failed - module '@aws-sdk/client-ses' not found
- **Fix:** Added @aws-sdk/client-ses as dev dependency for type checking (external in esbuild, pre-installed in Lambda runtime)
- **Files modified:** package.json, package-lock.json
- **Verification:** `npx tsc --noEmit` passes
- **Committed in:** c0d8416 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Required for TypeScript compilation. Package is marked external in esbuild so not bundled - only used for types.

## Issues Encountered

None - plan executed as specified.

## User Setup Required

None - no external service configuration required for this plan.

Infrastructure deployment (Plan 03-03) will require:
- SES domain verification DNS records
- Environment variables for Lambda (TEAM_EMAILS, FROM_EMAIL_*, etc.)
- DynamoDB stream configuration

## Next Phase Readiness

**Ready for:** Plan 03-03 (Infrastructure)
- Notification Lambda code complete and building
- Handler exports `handler` function for Lambda configuration
- Environment variables documented in handler comments
- Both handlers build to dist/*.mjs with source maps

**Blockers:** None
**Concerns:** None

---
*Phase: 03-notifications*
*Completed: 2026-01-23*
