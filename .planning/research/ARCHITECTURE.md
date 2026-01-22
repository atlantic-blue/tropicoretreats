# Architecture Research: Serverless Lead Management

**Domain:** Lead management for corporate retreat booking
**Researched:** 2026-01-22
**Confidence:** HIGH

## Component Overview

### Current State (Existing)
| Component | Technology | Status |
|-----------|------------|--------|
| Marketing Site | React 19 SPA | Deployed |
| Static Hosting | S3 + CloudFront | Deployed |
| DNS | Route 53 | Deployed |
| Infrastructure | Terraform | Deployed |

### Target State (To Add)
| Component | Technology | Responsibility |
|-----------|------------|----------------|
| API Gateway | HTTP API | Endpoint, CORS, throttling |
| Lead Processing | Lambda | Business logic, validation |
| Lead Storage | DynamoDB | Persist submissions |
| Email | SES | Notifications, auto-replies |
| Admin Auth | Cognito | Dashboard protection |
| Admin Dashboard | React SPA | View/manage leads |

## System Architecture

```
MARKETING SITE (Existing)
    S3 → CloudFront → Users
    tropicoretreat.com
           │
           │ POST /leads
           ▼
API GATEWAY (New)
    api.tropicoretreat.com
    ├── Public: POST /leads
    └── Protected: GET/PUT /admin/*
           │
           ▼
LAMBDA FUNCTIONS
    ├── submitLead (validate, store, notify)
    ├── getLeads (query, paginate)
    └── updateLeadStatus (update DynamoDB)
           │
           ▼
DATA LAYER
    ├── DynamoDB (leads table)
    └── SES (email notifications)
           │
           ▼
ADMIN DASHBOARD (New)
    admin.tropicoretreat.com
    Cognito authentication
```

## Data Flow

### Lead Submission
1. User fills contact form
2. Frontend POSTs to API Gateway
3. Lambda validates, stores in DynamoDB
4. Lambda triggers SES notification
5. Team receives email
6. Customer receives auto-reply
7. Frontend shows success

### Admin Views Leads
1. Admin logs in via Cognito
2. Dashboard fetches from /admin/leads
3. API Gateway validates JWT
4. Lambda queries DynamoDB
5. Dashboard renders lead list

## DynamoDB Table Design

```
Table: tropico-leads

PK: LEAD#<ulid>
SK: METADATA

GSI1PK: STATUS#<status>
GSI1SK: <createdAt>

Fields:
- leadId, firstName, lastName, email, phone
- message, status, source, createdAt, updatedAt
- assignedTo, temperature, notes[]
```

## Suggested Build Order

### Phase 1: Core API
- API Gateway + Lambda + DynamoDB
- `POST /leads` endpoint
- Deliverable: Form submission works

### Phase 2: Frontend Integration
- Contact form submit handler
- Success/error states
- Environment config

### Phase 3: Notifications
- SES domain verification
- Team notification email
- Customer auto-reply

### Phase 4: Admin Auth
- Cognito User Pool + Identity Pool
- API Gateway authorizer
- Protected endpoints

### Phase 5: Admin Dashboard
- React SPA
- Cognito integration
- Lead list/detail views
- S3/CloudFront hosting

### Phase 6: Multi-Channel (Future)
- WhatsApp, SMS, Slack

## Cost Estimate (Monthly)

| Service | Estimated |
|---------|-----------|
| API Gateway | $0 (free tier) |
| Lambda | $0 (free tier) |
| DynamoDB | $0 (free tier) |
| SES | $0 (free tier) |
| Cognito | $0 (free tier) |
| Route 53 | $0.50 |
| **Total** | **$0.50-1/month** |
