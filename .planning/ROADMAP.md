# Roadmap: Tropico Retreats Lead Management System

## Overview

This roadmap delivers a serverless lead management system for Tropico Retreats. The system captures contact form submissions from the existing marketing site, notifies the team via email, and provides an admin dashboard for lead tracking and follow-up. Built on AWS serverless (Lambda, API Gateway HTTP API, DynamoDB, Cognito, SES) with terraform for infrastructure.

**Depth:** Comprehensive
**Phases:** 5
**Coverage:** 13/13 requirements mapped

---

## Phase 1: Core API

**Goal:** Form submissions are captured and persisted in DynamoDB.

**Dependencies:** None (foundation phase)

**Requirements:**
- API-01: Backend API to receive and store contact form submissions
- API-02: DynamoDB table to persist lead data

**Success Criteria:**
1. POST /leads endpoint accepts JSON payload (name, email, phone, message)
2. Valid submissions are stored in DynamoDB with ULID, timestamp, and status=NEW
3. Invalid submissions return 400 with validation errors
4. API returns CORS headers for marketing site origin
5. Dev environment (-dev suffix) is deployed and functional

**Plans:** 2 plans

Plans:
- [x] 01-01-PLAN.md — Create Lambda handler with Zod validation and DynamoDB persistence
- [x] 01-02-PLAN.md — Deploy Terraform infrastructure (API Gateway, Lambda, DynamoDB)

**Notes:**
- Use terraform template with dev/prod parameter
- Single-table DynamoDB design with GSI for status queries
- API Gateway HTTP API (not REST) for cost efficiency

---

## Phase 2: Frontend Integration

**Goal:** Marketing site contact form submits to the API and shows feedback.

**Dependencies:** Phase 1 (Core API must exist)

**Requirements:**
- INT-01: Connect marketing site contact form to API

**Success Criteria:**
1. Contact form submits to API Gateway endpoint on button click
2. User sees loading state during submission
3. User sees success message after successful submission
4. User sees error message if submission fails
5. Form fields are cleared after successful submission

**Plans:** 2 plans

Plans:
- [x] 02-01-PLAN.md — Create API service, types, and enhance Toast component
- [x] 02-02-PLAN.md — Wire ContactPage to API with loading/success/error states

**Notes:**
- Environment-specific API URL (dev vs prod)
- Handle network errors gracefully
- Refactored to reusable ContactForm component used on both Contact page and Landing page

---

## Phase 3: Notifications

**Goal:** Team receives email notification and customer receives auto-reply when lead submits.

**Dependencies:** Phase 1 (leads must be stored to trigger notifications)

**Requirements:**
- NOTF-01: Email notification when form submitted
- NOTF-02: Auto-reply email to customer

**Success Criteria:**
1. Team receives email within 60 seconds of form submission
2. Email contains lead name, email, phone, message, and timestamp
3. Customer receives auto-reply confirming their inquiry was received
4. Auto-reply includes expected response timeframe
5. Notification failures do not block lead storage (async/decoupled)

**Plans:** 4 plans

Plans:
- [x] 03-01-PLAN.md — Configure SES domain identity with DKIM verification
- [x] 03-02-PLAN.md — Create notification Lambda handler and email templates
- [x] 03-03-PLAN.md — Deploy notification infrastructure (DynamoDB Streams, Lambda, DLQ)
- [x] 03-04-PLAN.md — Verify end-to-end notification flow

**Notes:**
- SES domain verification required before production
- Verify all team email addresses in SES sandbox for dev testing
- DynamoDB Streams for decoupled notification processing

---

## Phase 4: Admin Auth

**Goal:** Team members can securely authenticate to access protected endpoints.

**Dependencies:** Phase 1 (API must exist for authorizer integration)

**Requirements:**
- AUTH-01: Cognito authentication for team members

**Success Criteria:**
1. Admin can sign in with email and password
2. Protected endpoints reject requests without valid JWT
3. Protected endpoints accept requests with valid Cognito JWT
4. Token refresh works (session persists beyond 1 hour)
5. Admin can sign out and token is invalidated

**Plans:** 2 plans

Plans:
- [x] 04-01-PLAN.md — Create Cognito User Pool, App Client, and JWT authorizer
- [x] 04-02-PLAN.md — Create admin user and verify authentication flow

**Notes:**
- Cognito User Pool for authentication (no Identity Pool needed for API-only access)
- API Gateway HTTP API native JWT authorizer
- Admin-only user creation (no public sign-up)
- amazon-cognito-identity-js for frontend integration in Phase 5 (Terraform-managed Cognito)

---

## Phase 5: Admin Dashboard

**Goal:** Team can view, manage, and track leads through the sales pipeline.

**Dependencies:** Phase 3 (notifications ensure leads exist), Phase 4 (auth protects dashboard)

**Requirements:**
- DASH-01: Admin dashboard frontend
- DASH-02: Lead listing view with search/filter
- DASH-03: Lead detail view
- DASH-04: Lead status tracking
- DASH-05: Temperature rating
- DASH-06: Notes on leads
- DASH-07: Lead assignment to team members

**Success Criteria:**
1. Admin can log in and see list of all leads sorted by newest first
2. Admin can search leads by name, email, or phone
3. Admin can filter leads by status (New, Contacted, Quoted, Won, Lost)
4. Admin can click a lead to see full details including message
5. Admin can change lead status and see it persist
6. Admin can set temperature rating (Hot, Warm, Cold) on a lead
7. Admin can add notes to a lead and see note history with timestamps
8. Admin can assign a lead to a team member from a dropdown

**Notes:**
- React 19 SPA with TanStack Query for server state
- AWS Amplify Auth for Cognito integration
- Deploy to S3/CloudFront at admin.tropicoretreat.com
- Separate from marketing site (different auth patterns)

---

## Progress

| Phase | Name | Status | Requirements |
|-------|------|--------|--------------|
| 1 | Core API | Complete (2/2) | API-01, API-02 |
| 2 | Frontend Integration | Complete (2/2) | INT-01 |
| 3 | Notifications | Complete (4/4) | NOTF-01, NOTF-02 |
| 4 | Admin Auth | Complete (2/2) | AUTH-01 |
| 5 | Admin Dashboard | Pending | DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, DASH-06, DASH-07 |

---

## Requirement Coverage

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

**Coverage:** 13/13 requirements mapped (100%)

---

## Future Phases (Post-MVP)

| Phase | Name | Requirements |
|-------|------|--------------|
| 6 | Multi-Channel Notifications | WhatsApp, SMS, Slack |
| 7 | Pipeline Views | Kanban board, follow-up reminders |

**Note:** WhatsApp requires Meta Business verification (2-4 weeks). Start verification process during MVP development if planning Phase 6.

---

*Last updated: 2026-01-23*
