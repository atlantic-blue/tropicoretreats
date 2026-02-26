# Project Interview

## Value Proposition
Add email sending and receiving capabilities to the Tropico Retreats admin dashboard so operators can manage leads and respond to clients directly, with all email flowing through `team@tropicoretreat.com`.

## Users
- Tropico Retreats operators (admin dashboard users) who manage leads and communicate with corporate retreat clients

## MVP Scope (5 User Actions)
1. **Send email to a lead** — operator composes and sends an email from the dashboard, delivered via SES from `team@tropicoretreat.com`
2. **Receive and view inbound emails** — emails sent to `team@tropicoretreat.com` are parsed, matched to leads, and displayed in the dashboard
3. **View email thread per lead** — chronological conversation view (chat-style, inbound vs outbound) when clicking on a lead
4. **Auto-create lead from unknown sender** — inbound email from unknown address creates a new lead automatically
5. **See unread indicators and sort by recency** — lead list shows unread badges and sorts by last email activity

## Stack
- **Frontend/Admin**: React + TypeScript (Vite for admin, Webpack for marketing site)
- **Backend**: TypeScript Lambda handlers (esbuild)
- **Database**: DynamoDB (single-table design with PK/SK patterns)
- **Infrastructure**: Terraform (flat files, AWS — API Gateway, Lambda, DynamoDB, S3, Route53, CloudFront, SES)
- **Email**: AWS SES (sending + receiving)
- **Storage**: S3 (email store with attachments, lifecycle to Glacier after 90 days)

## Constraints
- All Lambdas in TypeScript (matching existing backend)
- SES receiving only available in us-east-1, us-west-2, eu-west-1
- Must use existing auth mechanism from the dashboard
- Email domain: `tropicoretreat.com` (already on Route53)
- DNS records needed: SPF, DKIM (3x CNAME), DMARC, MX
- SES sandbox removal may take 24 hours
- Must integrate with existing DynamoDB leads table
- Must include backup forwarding to personal email

## Deferred Ideas
- Rich text editor (start with basic textarea, upgrade later)
- Attachment upload from dashboard (receive-side attachments handled, send-side deferred)
- Thread matching via In-Reply-To/References headers (nice-to-have, not MVP-critical)
- CRM sync (HubSpot/Pipedrive)
- Calendar integration
- WhatsApp integration improvements
