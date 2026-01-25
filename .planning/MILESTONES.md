# Milestones Archive

## v1.0 — MVP (Complete)

**Shipped:** 2026-01-24

**Phases:** 1-5 (17 plans, 50 tasks)

**What was delivered:**
- Core API (Lambda + DynamoDB + API Gateway HTTP API)
- Frontend integration (Contact form submission)
- Email notifications (SES - team alerts + customer confirmation)
- Admin authentication (Cognito User Pool + JWT authorizer)
- Admin dashboard (React SPA - lead list, detail, notes, filters)

**Live URLs:**
- Marketing site: https://tropicoretreat.com
- Admin dashboard: https://admin.tropicoretreat.com

**Key decisions made:**
- Terraform for IaC
- HTTP API over REST (70% cheaper)
- Single-table DynamoDB design
- amazon-cognito-identity-js (not Amplify)
- Optimistic updates for instant UI feedback

**Requirements completed:**
- API-01 through API-02 (Core API)
- FORM-01 through FORM-02 (Frontend Integration)
- NOTIF-01 through NOTIF-02 (Email Notifications)
- AUTH-01 through AUTH-02 (Admin Auth)
- DASH-01 through DASH-07 (Admin Dashboard)

---

*Last updated: 2026-01-25*
