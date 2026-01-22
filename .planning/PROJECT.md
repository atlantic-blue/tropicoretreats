# Tropico Retreats Lead Management System

## What This Is

A serverless lead management system for Tropico Retreats, a high-end corporate and wellness retreats business in Colombia. The system captures contact form submissions from the marketing site, notifies the team via multiple channels, and provides an admin dashboard for lead tracking and follow-up.

## Core Value

When a potential customer submits the contact form, the team is immediately notified and can access, track, and follow up on the lead through a central dashboard.

## Requirements

### Validated

- ✓ Marketing site with destination pages (Caribbean, Casanare, Coffee Region) — existing
- ✓ Services and About pages — existing
- ✓ Contact form UI with name, email, phone, message fields — existing
- ✓ SEO with pre-rendering for search visibility — existing
- ✓ AWS infrastructure (S3, CloudFront, Route53, ACM) — existing
- ✓ React 19 + TypeScript + Tailwind CSS design system — existing

### Active

- [ ] Backend API to receive and store contact form submissions
- [ ] DynamoDB table to persist lead data
- [ ] Email notification when form submitted
- [ ] WhatsApp notification when form submitted
- [ ] SMS notification when form submitted
- [ ] Slack notification when form submitted
- [ ] Admin dashboard frontend (separate from marketing site)
- [ ] Cognito authentication for team members (6+ users)
- [ ] Role-based access control for dashboard
- [ ] Lead listing view with contact details
- [ ] Lead detail view with full information
- [ ] Lead assignment to team members
- [ ] Pipeline stage tracking (New → Contacted → Quoted → Won/Lost)
- [ ] Temperature rating (Hot/Warm/Cold)
- [ ] Notes on leads
- [ ] Mark lead as contacted

### Out of Scope

- Payment processing — not needed for lead management
- Customer-facing portal — customers use contact form only
- Mobile app — web dashboard sufficient for team size
- Analytics/reporting dashboards — can add later once leads flow in
- Integration with external CRMs — building custom solution

## Context

Tropico Retreats is a high-end corporate and wellness retreats business targeting ~25 customers per year. Each lead is high-value and requires personalized follow-up. The existing marketing site has a contact form that currently doesn't submit anywhere.

The team has 6+ members who need dashboard access to view, assign, and track leads through the sales pipeline. Notifications must reach the team through multiple channels (Email, WhatsApp, SMS, Slack) to ensure no lead is missed.

The business uses AWS with a serverless approach. The marketing site is already deployed on S3/CloudFront with Terraform-managed infrastructure.

## Constraints

- **Infrastructure**: AWS serverless only (Lambda, API Gateway, DynamoDB, Cognito, SES, SNS)
- **Auth**: AWS Cognito (not Maistro auth references in current codebase)
- **Storage**: DynamoDB for leads, S3 for any attachments
- **Volume**: Low (~25 leads/year) but high-value; system must be reliable, not high-throughput
- **Team**: 6+ users needing role-based access to admin dashboard
- **Frontend**: TypeScript + React + Tailwind (consistent with marketing site)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Build custom vs use CRM | Need control, avoid monthly fees, specific workflow requirements | — Pending |
| AWS Cognito for auth | Already on AWS, serverless, handles user management | — Pending |
| DynamoDB for storage | Serverless, scales to zero cost at low volume, fits AWS stack | — Pending |
| Separate admin dashboard | Keep marketing site simple, different auth/access patterns | — Pending |
| Multi-channel notifications | High-value leads, team must not miss any submission | — Pending |

---
*Last updated: 2026-01-22 after initialization*
