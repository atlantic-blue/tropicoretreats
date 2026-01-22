# Pitfalls Research: Serverless Lead Management

**Domain:** Serverless lead management with multi-channel notifications
**Researched:** 2026-01-22
**Confidence:** MEDIUM

## Infrastructure Pitfalls

### CRITICAL: Lambda Cold Start for First Lead
**What:** First lead after idle hits 3-15 second cold start
**Prevention:** Provisioned concurrency (1 instance) or CloudWatch scheduled warming
**Phase:** Infrastructure

### CRITICAL: API Gateway CORS Misconfiguration
**What:** Frontend submissions fail silently with CORS errors
**Prevention:** Explicit CORS in Terraform + OPTIONS method + headers in Lambda response
**Phase:** Infrastructure

### MODERATE: DynamoDB Access Pattern Lock-in
**What:** Schema designed for current queries fails for future features
**Prevention:** Document ALL access patterns upfront; single-table design with GSIs
**Phase:** Infrastructure

## Notification Pitfalls

### CRITICAL: WhatsApp Business API Approval Delays
**What:** Meta verification takes 2-4 weeks; sandbox works, production doesn't
**Prevention:** Start verification IMMEDIATELY (week 0); have business documents ready
**Phase:** Pre-development

### CRITICAL: SMS Deliverability in Colombia
**What:** SMS may not reach Colombian carriers reliably
**Prevention:** Test ALL team members' actual phones; use SMS as backup not primary
**Phase:** Notification integration

### MODERATE: SES Email Sandbox
**What:** New SES accounts only send to verified emails
**Prevention:** Request production access day 1; verify all team emails
**Phase:** Infrastructure

### MODERATE: Notification Partial Failure
**What:** Lambda returns success even when some channels fail
**Prevention:** Track per-channel status in DynamoDB; use SQS+DLQ
**Phase:** Notification integration

## Auth Pitfalls

### CRITICAL: Cognito User Pool vs Identity Pool Confusion
**What:** User Pool authenticates but Identity Pool needed for AWS access
**Prevention:** Set up BOTH from start; configure Identity Pool to trust User Pool
**Phase:** Authentication

### CRITICAL: Cognito Callback URL Mismatch
**What:** Exact URL match required (trailing slashes, https)
**Prevention:** Register ALL callback URLs upfront (localhost, staging, prod)
**Phase:** Authentication

### MODERATE: Token Refresh Not Implemented
**What:** Access tokens expire after 1 hour; users logged out mid-workflow
**Prevention:** Use aws-amplify (automatic) or implement refresh flow
**Phase:** Authentication

## Integration Pitfalls

### CRITICAL: Lambda Function URLs Instead of API Gateway
**What:** Bypasses auth, CORS, rate limiting
**Prevention:** Use API Gateway from day one via Terraform/SAM
**Phase:** Infrastructure

### MODERATE: Dev Hits Production
**What:** Test submissions create real leads and notifications
**Prevention:** Separate dev stack with `-dev` suffix
**Phase:** Infrastructure

### MODERATE: No API Request Validation
**What:** Malformed data stored; notifications fail parsing
**Prevention:** API Gateway JSON Schema + Lambda zod validation
**Phase:** Backend API

## Prevention Timeline

### Week 0 (Before Development)
- [ ] Start WhatsApp Business verification with Meta
- [ ] Request AWS SES production access
- [ ] Verify team email addresses in SES
- [ ] Document all DynamoDB access patterns

### Infrastructure Phase
- [ ] Provisioned concurrency OR Lambda warming
- [ ] API Gateway with explicit CORS
- [ ] DynamoDB GSIs configured
- [ ] Separate dev environment

### Authentication Phase
- [ ] User Pool AND Identity Pool
- [ ] All callback URLs registered
- [ ] Token refresh flow implemented

### Notification Phase
- [ ] Test all channels with real team contacts
- [ ] Per-channel delivery tracking
- [ ] SQS + DLQ architecture
