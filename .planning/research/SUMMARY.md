# Research Summary: Serverless Lead Management

**Project:** Tropico Retreats Lead Management System
**Researched:** 2026-01-22

## Executive Summary

Building a serverless lead management system on AWS to capture contact form submissions, notify the team via multiple channels, and provide an admin dashboard for lead tracking. Low volume (~25 leads/year) but high value justifies reliability over complexity.

## Stack Recommendations

**Core Services:**
- API Gateway HTTP API (70% cheaper than REST)
- Lambda Node.js 22.x on ARM64
- DynamoDB On-Demand (pay-per-request)
- Cognito User Pools (admin-only)
- SES for email, SNS for SMS

**Frontend (Admin Dashboard):**
- React 19 + TypeScript + Tailwind (matches existing site)
- TanStack Query for server state
- AWS Amplify Auth for Cognito integration

**Infrastructure:**
- Terraform for serverless deployment
- Terraform for existing resources

## Table Stakes Features

1. Form submission capture and storage
2. Email notification to team on new lead
3. Admin dashboard with lead list/detail views
4. Cognito authentication (6+ team members)
5. Lead status tracking (New → Contacted → Quoted → Won/Lost)
6. Notes on leads
7. Lead assignment to team members

## Key Differentiators

| Feature | Priority | Why |
|---------|----------|-----|
| WhatsApp notification | High | Team already uses WhatsApp |
| Temperature rating | High | Already planned |
| Auto-reply to customer | High | Builds trust |
| SMS notification | Medium | Backup channel |
| Slack notification | Low | May not be used |

## Architecture Overview

```
Marketing Site (existing)
    │
    │ POST /leads
    ▼
API Gateway → Lambda → DynamoDB
                  │
                  └──→ SES (notifications)

Admin Dashboard (new)
    │
    │ Cognito JWT
    ▼
API Gateway → Lambda → DynamoDB
```

## Build Order

| Phase | Components | Deliverable |
|-------|------------|-------------|
| 1 | API + Lambda + DynamoDB | Form submission works |
| 2 | Frontend integration | Contact form connected |
| 3 | SES notifications | Team gets email alerts |
| 4 | Cognito auth | Protected admin endpoints |
| 5 | Admin dashboard | Full lead management |
| 6 | Multi-channel (future) | WhatsApp, SMS, Slack |

## Critical Pitfalls to Avoid

### Before Development (Week 0)
- **Start WhatsApp Business verification NOW** - Takes 2-4 weeks
- **Request SES production access** - Sandbox limits recipients
- **Verify all team emails in SES**

### Infrastructure Phase
- Configure CORS at API Gateway (not just Lambda)
- Use provisioned concurrency OR Lambda warming for cold starts
- Create separate dev environment (`-dev` suffix)

### Auth Phase
- Set up BOTH User Pool AND Identity Pool
- Register ALL callback URLs (localhost, staging, prod)
- Implement token refresh (1 hour expiry default)

### Notification Phase
- Track per-channel delivery status in DynamoDB
- Test SMS with actual Colombian phone numbers
- Use SQS + DLQ for reliable async notifications

## Anti-Features (Don't Build)

- Full CRM integration (overkill for 25 leads/year)
- Lead scoring algorithms (not enough volume)
- Mobile native app (responsive web works)
- Customer portal (form + human contact)
- AI chatbot (high-touch service)

## Cost Estimate

**~$0.50-1/month** - All services within AWS free tier at this volume

## Confidence Levels

| Area | Confidence |
|------|------------|
| AWS Services | HIGH |
| Stack/Libraries | HIGH |
| Features | MEDIUM |
| WhatsApp Timeline | MEDIUM |
| SMS Colombia | MEDIUM |

## Next Steps

1. Define detailed requirements from this research
2. Create roadmap with phases
3. Start WhatsApp verification immediately
4. Plan infrastructure with dev/prod separation
