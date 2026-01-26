# Roadmap: Tropico Retreats Lead Management System

## Milestones

- **v1.0 MVP** - Phases 1-5 (shipped 2026-01-24)
- **v1.1 Multi-Channel Leads** - Phases 6-11 (in progress)

## Phases

<details>
<summary>v1.0 MVP (Phases 1-5) - SHIPPED 2026-01-24</summary>

### Phase 1: Core API
**Goal**: Backend API accepts and stores contact form submissions
**Requirements**: API-01, API-02
**Plans**: 2 plans

Plans:
- [x] 01-01: Lambda handler with Zod validation and DynamoDB persistence
- [x] 01-02: Terraform infrastructure (API Gateway, Lambda, DynamoDB)

### Phase 2: Frontend Integration
**Goal**: Marketing site contact form submits to API with feedback
**Requirements**: INT-01
**Plans**: 2 plans

Plans:
- [x] 02-01: API service, types, and Toast component
- [x] 02-02: ContactPage wired to API with states

### Phase 3: Notifications
**Goal**: Team and customers receive email notifications on submission
**Requirements**: NOTF-01, NOTF-02
**Plans**: 4 plans

Plans:
- [x] 03-01: SES domain identity with DKIM verification
- [x] 03-02: Notification Lambda handler and email templates
- [x] 03-03: DynamoDB Streams trigger infrastructure
- [x] 03-04: End-to-end notification flow verification

### Phase 4: Admin Auth
**Goal**: Team members can securely authenticate to admin dashboard
**Requirements**: AUTH-01
**Plans**: 2 plans

Plans:
- [x] 04-01: Cognito User Pool and JWT authorizer
- [x] 04-02: Admin user creation and auth flow verification

### Phase 5: Admin Dashboard
**Goal**: Team can view, filter, and manage leads through dashboard
**Requirements**: DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, DASH-06, DASH-07
**Plans**: 7 plans

Plans:
- [x] 05-01: Lead data model and DynamoDB operations
- [x] 05-02: Admin API endpoints (leads, notes, users)
- [x] 05-03: Lambda deployment and API Gateway integration
- [x] 05-04: Dashboard React app and auth integration
- [x] 05-05: CloudFront and S3 hosting for admin site
- [x] 05-06: Lead list page with filters and pagination
- [x] 05-07: Lead detail page with status, notes, assignment

</details>

---

## v1.1 Multi-Channel Leads (In Progress)

**Milestone Goal:** Capture leads from multiple channels (email, phone) and add multi-channel notifications (Slack, SMS) with per-user preferences. Improve system quality with testing and documentation.

**Depth:** Comprehensive
**Phases:** 6 (Phases 6-11)
**Coverage:** 10/10 requirements mapped

---

### Phase 6: Custom API Domain

**Goal:** API accessible via branded domain with stable webhook URLs

**Depends on:** Phase 5

**Requirements:** INFRA-01

**Success Criteria** (what must be TRUE):
1. API requests to api.tropicoretreat.com return valid responses
2. HTTPS certificate is valid and auto-renews via ACM
3. Existing API functionality unchanged (contact form, admin routes)

**Plans:** 1 plan

Plans:
- [ ] 06-01-PLAN.md — Custom domain, API mapping, rate limiting, frontend updates

**Notes:**
- Foundation for stable Twilio webhook URLs
- Reuses existing wildcard ACM certificate
- Certificate already in us-east-1 (same region as API)

---

### Phase 7: Slack Notifications

**Goal:** Team receives instant Slack alerts when new leads arrive

**Depends on:** Phase 6

**Requirements:** NOTIF-03

**Success Criteria** (what must be TRUE):
1. New lead submission triggers Slack message within seconds
2. Slack message includes lead name, contact info, source, and dashboard link
3. Message displays lead temperature with visual indicator (emoji)
4. Slack webhook URL stored securely in AWS Secrets Manager

**Plans:** TBD

Plans:
- [ ] 07-01: Slack webhook integration in notification Lambda

**Notes:**
- Quick win - extends existing processLeadNotifications Lambda
- Uses @slack/webhook library
- Block Kit formatting for rich messages
- No external vendor setup required (just create webhook URL)

---

### Phase 8: SMS Notifications

**Goal:** Designated team members receive SMS alerts and can configure notification preferences

**Depends on:** Phase 7

**Requirements:** NOTIF-04, NOTIF-05

**Success Criteria** (what must be TRUE):
1. Configured team members receive SMS within seconds of new lead
2. SMS includes concise lead summary (name, contact info, short URL)
3. Users can configure which channels they receive (email, Slack, SMS) via admin dashboard
4. SNS sandbox removed for production SMS delivery

**Plans:** TBD

Plans:
- [ ] 08-01: SNS SMS integration and sandbox exit request
- [ ] 08-02: Notification preferences in admin dashboard

**Notes:**
- Request SNS production access at phase start (1-2 week approval)
- 160-char SMS limit requires concise formatting
- NOTIF-05 (preferences) spans all notification channels

---

### Phase 9: Email-to-Lead

**Goal:** Emails to hello@tropicoretreat.com automatically create leads

**Depends on:** Phase 8

**Requirements:** INFRA-02, INBOUND-01

**Success Criteria** (what must be TRUE):
1. Email to hello@tropicoretreat.com creates lead with sender email, name (parsed), subject, body
2. Sender receives auto-reply confirmation
3. Lead appears in admin dashboard with "Email" source indicator
4. SES production access granted (sandbox removed)

**Plans:** TBD

Plans:
- [ ] 09-01: SES production access and receipt rule configuration
- [ ] 09-02: Inbound email Lambda handler

**Notes:**
- SES receipt rule ordering critical: S3 action before Lambda action
- Uses mailparser library for email parsing
- May require research for edge cases (forwarded emails, HTML parsing)
- INFRA-02 prerequisite for reliable inbound email

---

### Phase 10: Phone-to-Lead

**Goal:** Inbound phone calls create leads with voicemail transcription

**Depends on:** Phase 9

**Requirements:** INBOUND-02, INBOUND-03

**Success Criteria** (what must be TRUE):
1. Inbound call to Twilio number creates lead with caller phone number
2. Callers hear professional greeting and can leave voicemail
3. Voicemail is transcribed and attached to lead record
4. Lead appears in admin dashboard with "Phone" source indicator
5. Missed calls trigger text-back notification to caller

**Plans:** TBD

Plans:
- [ ] 10-01: Twilio account setup and phone number provisioning
- [ ] 10-02: Inbound call webhook and TwiML response
- [ ] 10-03: Voicemail recording and transcription

**Notes:**
- Most complex phase - requires Twilio account, phone number, TwiML
- Signature validation critical (preserve empty params in HMAC)
- Custom API domain (Phase 6) provides stable webhook URL
- Consider research phase for TwiML voice flow design

---

### Phase 11: Testing & Documentation

**Goal:** System has comprehensive test coverage and API documentation

**Depends on:** Phase 10

**Requirements:** QUAL-01, QUAL-02

**Success Criteria** (what must be TRUE):
1. All Lambda handlers have unit tests with mocked AWS services
2. Tests run in CI pipeline on every commit
3. OpenAPI spec published and accessible
4. API documentation includes all endpoints with request/response examples

**Plans:** TBD

Plans:
- [ ] 11-01: Vitest test suite for Lambda handlers
- [ ] 11-02: OpenAPI specification and documentation site

**Notes:**
- Uses vitest (Vite-native, ESM-first)
- aws-sdk-client-mock for AWS SDK v3 mocking
- Standard patterns, no research needed

---

## Progress

**Execution Order:**
Phases execute in numeric order: 6 -> 7 -> 8 -> 9 -> 10 -> 11

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Core API | v1.0 | 2/2 | Complete | 2026-01-20 |
| 2. Frontend Integration | v1.0 | 2/2 | Complete | 2026-01-21 |
| 3. Notifications | v1.0 | 4/4 | Complete | 2026-01-22 |
| 4. Admin Auth | v1.0 | 2/2 | Complete | 2026-01-23 |
| 5. Admin Dashboard | v1.0 | 7/7 | Complete | 2026-01-24 |
| 6. Custom API Domain | v1.1 | 0/1 | Planned | - |
| 7. Slack Notifications | v1.1 | 0/1 | Not started | - |
| 8. SMS Notifications | v1.1 | 0/2 | Not started | - |
| 9. Email-to-Lead | v1.1 | 0/2 | Not started | - |
| 10. Phone-to-Lead | v1.1 | 0/3 | Not started | - |
| 11. Testing & Documentation | v1.1 | 0/2 | Not started | - |

---

## Requirement Coverage

### v1.0 MVP (Complete)

| Requirement | Phase | Description |
|-------------|-------|-------------|
| API-01 | 1 | Backend API to receive and store contact form submissions |
| API-02 | 1 | DynamoDB table to persist lead data |
| INT-01 | 2 | Connect marketing site contact form to API |
| NOTF-01 | 3 | Email notification when form submitted |
| NOTF-02 | 3 | Auto-reply email to customer |
| AUTH-01 | 4 | Cognito authentication for team members |
| DASH-01 | 5 | Admin dashboard frontend |
| DASH-02 | 5 | Lead listing view with search/filter |
| DASH-03 | 5 | Lead detail view |
| DASH-04 | 5 | Lead status tracking |
| DASH-05 | 5 | Temperature rating |
| DASH-06 | 5 | Notes on leads |
| DASH-07 | 5 | Lead assignment to team members |

### v1.1 Multi-Channel Leads (Active)

| Requirement | Phase | Description |
|-------------|-------|-------------|
| INFRA-01 | 6 | API accessible via custom domain api.tropicoretreat.com |
| NOTIF-03 | 7 | Slack notification webhook |
| NOTIF-04 | 8 | SMS notification via SNS |
| NOTIF-05 | 8 | Users can configure notification preferences |
| INFRA-02 | 9 | SES production access granted |
| INBOUND-01 | 9 | Inbound email to lead |
| INBOUND-02 | 10 | Inbound phone to lead |
| INBOUND-03 | 10 | Voicemail transcription |
| QUAL-01 | 11 | Unit tests for Lambda handlers |
| QUAL-02 | 11 | API documentation (OpenAPI spec) |

**v1.0 Coverage:** 13/13 requirements (100%)
**v1.1 Coverage:** 10/10 requirements (100%)

---

*Roadmap updated: 2026-01-26 (Phase 6 planned)*
