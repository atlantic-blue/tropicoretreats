---
phase: 03-notifications
plan: 03
subsystem: infra
tags: [terraform, dynamodb-streams, lambda, sqs, iam, ses]

# Dependency graph
requires:
  - phase: 03-02
    provides: Notification Lambda handler and email templates
  - phase: 01-02
    provides: Base infrastructure (DynamoDB table, API Gateway)
provides:
  - DynamoDB Streams enabled with NEW_IMAGE view type
  - Notification Lambda deployed with event source mapping
  - SQS Dead Letter Queue for failed notifications
  - IAM policies for Lambda to access streams, SES, and DLQ
affects: [03-04-testing, 04-admin-auth]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Event source mapping with filter criteria
    - DLQ destination for failed Lambda invocations
    - Conditional IAM policy for SES from-address

key-files:
  created:
    - infra/api/notifications.tf
  modified:
    - infra/api/dynamodb.tf
    - infra/api/variables.tf
    - infra/api/lambda.tf
    - infra/api/iam.tf

key-decisions:
  - "Import existing AWS resources into Terraform state rather than destroy/recreate"
  - "Use production environment for notification infrastructure deployment"
  - "NEW_IMAGE stream view type - only need new data for notifications, not old"
  - "Maximum 3 retry attempts for event source mapping before DLQ"
  - "14-day DLQ message retention for debugging failed notifications"
  - "Conditional SES IAM policy scoped to specific from-addresses"

patterns-established:
  - "Event source mapping with INSERT filter for DynamoDB Streams"
  - "DLQ destination config for failed Lambda stream processing"
  - "Multi-entry Lambda build with separate archive_file resources"

# Metrics
duration: 20min
completed: 2026-01-23
---

# Phase 3 Plan 03: Notification Infrastructure Summary

**Notification Lambda deployed with DynamoDB Streams trigger, INSERT event filter, 3 retry attempts, and SQS DLQ for failure handling**

## Performance

- **Duration:** 20 min
- **Started:** 2026-01-23T12:54:19Z
- **Completed:** 2026-01-23T13:14:41Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- DynamoDB Streams enabled on leads table with NEW_IMAGE view type
- Notification Lambda deployed (tropico-notifications-production) with correct handler
- Event source mapping configured with INSERT filter and 3 retry attempts
- SQS DLQ created with 14-day retention for failed notifications
- 4 IAM policies attached to notifications Lambda role (logs, streams, SES, DLQ)
- Terraform state synchronized with existing AWS resources

## Task Commits

Each task was committed atomically:

1. **Task 1: Enable DynamoDB Streams and add notification variables** - `459eb5b` (feat)
2. **Task 2: Create notification Lambda and DLQ infrastructure** - `f1764e8` (feat)
3. **Task 3: Add IAM policies and deploy infrastructure** - `28efd77` (feat)

## Files Created/Modified

- `infra/api/dynamodb.tf` - Added stream_enabled=true and stream_view_type=NEW_IMAGE
- `infra/api/variables.tf` - Added team_emails, from_email_team, from_email_customer, from_name
- `infra/api/notifications.tf` - New file with Lambda, DLQ, event source mapping
- `infra/api/lambda.tf` - Updated archive_file and handler for multi-entry build
- `infra/api/iam.tf` - Added 4 IAM policies for notifications Lambda

## Decisions Made

1. **Import existing resources** - AWS resources from previous deployments existed but weren't in Terraform state. Imported rather than recreated to preserve data and avoid downtime.

2. **Production environment** - Deployed to production since dev environment resources didn't exist and STATE.md indicated production focus.

3. **NEW_IMAGE stream view type** - Only captures new item data, not old values. Sufficient for notification use case and reduces payload size.

4. **Conditional SES IAM policy** - Scoped ses:SendEmail permission to specific from-addresses (leads@tropicoretreat.com, hello@tropicoretreat.com) for security.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Terraform state out of sync with AWS resources**
- **Found during:** Task 3 (Deploy infrastructure)
- **Issue:** DynamoDB table, IAM roles, CloudWatch log groups, SES identity, Lambda function, Route53 DKIM records existed in AWS but not in Terraform state
- **Fix:** Imported 10 existing resources into Terraform state:
  - aws_dynamodb_table.leads
  - aws_iam_role.lambda
  - aws_cloudwatch_log_group.lambda
  - aws_cloudwatch_log_group.api
  - aws_sesv2_email_identity.main
  - aws_lambda_function.create_lead
  - aws_route53_record.ses_dkim[0-2]
  - aws_lambda_permission.api
- **Files modified:** None (state only)
- **Verification:** terraform apply succeeded after imports
- **Committed in:** Part of Task 3 execution

**2. [Rule 3 - Blocking] Lambda handler path mismatch**
- **Found during:** Task 2 (Create notification Lambda)
- **Issue:** lambda.tf referenced old index.mjs but multi-entry build creates createLead.mjs
- **Fix:** Updated archive_file source_file and Lambda handler to match new build output
- **Files modified:** infra/api/lambda.tf
- **Verification:** terraform validate passed
- **Committed in:** f1764e8 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (both blocking)
**Impact on plan:** All auto-fixes necessary for deployment. No scope creep.

## Issues Encountered

- **Terraform apply timeout on Lambda permission creation:** The aws_lambda_permission.api resource took over 5 minutes attempting to create before failing with ResourceConflictException. Resolution was to import the existing permission.

## User Setup Required

None for this plan - infrastructure is fully automated. However, the notification system requires:

1. **SES sandbox limitation:** Email notifications will only work to verified email addresses while in sandbox mode. Team members need to verify their email addresses in SES console, or request production access.

2. **Team emails configuration:** Set the `team_emails` Terraform variable to configure notification recipients (comma-separated list).

## Verification Results

All success criteria verified:

| Criterion | Status | Value |
|-----------|--------|-------|
| DynamoDB StreamEnabled=true | Pass | true |
| Stream view type NEW_IMAGE | Pass | NEW_IMAGE |
| Notification Lambda deployed | Pass | tropico-notifications-production |
| Event source mapping with INSERT filter | Pass | 6f67ccb4-fd95-47ab-8f03-dc579cd1bfdb |
| Maximum retry attempts | Pass | 3 |
| SQS DLQ with 14-day retention | Pass | 1209600 seconds |
| IAM policies attached | Pass | 4 policies (logs, streams, ses, dlq) |

## Next Phase Readiness

- Notification infrastructure complete and deployed
- Event source mapping will trigger Lambda on new lead inserts
- Ready for Plan 03-04: End-to-end testing of notification flow
- SES sandbox limits apply until production access requested

---
*Phase: 03-notifications*
*Completed: 2026-01-23*
