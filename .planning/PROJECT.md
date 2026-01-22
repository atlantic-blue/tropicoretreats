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

### Active (MVP)

- [ ] Backend API to receive and store contact form submissions (Lambda + API Gateway HTTP API)
- [ ] DynamoDB table to persist lead data (single-table design with GSIs)
- [ ] Connect marketing site contact form to API
- [ ] Email notification when form submitted (SES)
- [ ] Auto-reply email to customer confirming receipt
- [ ] Cognito authentication for team members (6+ users, User Pool + Identity Pool)
- [ ] Admin dashboard frontend (React 19, separate from marketing site)
- [ ] Lead listing view with search/filter
- [ ] Lead detail view with full information
- [ ] Lead status tracking (New → Contacted → Quoted → Won/Lost)
- [ ] Temperature rating (Hot/Warm/Cold)
- [ ] Notes on leads
- [ ] Lead assignment to team members

### Future (Post-MVP)

- [ ] WhatsApp notification (requires Meta Business verification - 2-4 weeks)
- [ ] SMS notification (SNS)
- [ ] Slack notification (webhook)
- [ ] Pipeline Kanban view
- [ ] Follow-up reminders

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
| Build custom vs use CRM | Need control, avoid monthly fees, specific workflow requirements | ✓ Build custom |
| AWS Cognito for auth | Already on AWS, serverless, handles user management | ✓ Cognito User Pool + Identity Pool |
| DynamoDB for storage | Serverless, scales to zero cost at low volume, fits AWS stack | ✓ On-Demand, single-table design |
| Separate admin dashboard | Keep marketing site simple, different auth/access patterns | ✓ Separate React SPA |
| Multi-channel notifications | High-value leads, team must not miss any submission | ✓ Email first, WhatsApp/SMS/Slack post-MVP |
| API Gateway type | HTTP API 70% cheaper than REST, native JWT support | ✓ HTTP API |
| Lambda runtime | Latest stable, cost-efficient architecture | ✓ Node.js 22.x on ARM64 |
| IaC tool | Serverless-optimized, local testing, simplified syntax | ✓ AWS SAM |

## Stack Summary

| Layer | Technology |
|-------|------------|
| API | API Gateway HTTP API |
| Compute | Lambda Node.js 22.x (ARM64) |
| Database | DynamoDB On-Demand |
| Auth | Cognito User Pool + Identity Pool |
| Email | SES |
| SMS | SNS (future) |
| WhatsApp | Meta Cloud API (future) |
| Frontend | React 19 + TypeScript + Tailwind + TanStack Query |
| IaC | AWS SAM |

---
*Last updated: 2026-01-22 after requirements definition*
