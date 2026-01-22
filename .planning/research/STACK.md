# Stack Research: Serverless Lead Management

**Project:** Tropico Retreats Lead Management System
**Researched:** 2026-01-22
**Confidence:** HIGH

## AWS Services

### API Layer
| Service | Configuration | Rationale |
|---------|--------------|-----------|
| **API Gateway HTTP API** | Regional endpoint, JWT authorizer | 70% cheaper than REST API, native JWT/Cognito integration |

### Compute Layer
| Service | Configuration | Rationale |
|---------|--------------|-----------|
| **Lambda** | Node.js 22.x, 256MB, 30s timeout, ARM64 | Latest stable runtime, cost-efficient |

### Database Layer
| Service | Configuration | Rationale |
|---------|--------------|-----------|
| **DynamoDB** | On-Demand capacity, single-table design | Pay-per-request ideal for 25 leads/year |

### Authentication Layer
| Service | Configuration | Rationale |
|---------|--------------|-----------|
| **Cognito User Pools** | Admin-only signup, email verification | 50K MAU free tier, native AWS integration |

### Notification Services
| Service | Purpose |
|---------|---------|
| **SES** | Email notifications (SESv2 API) |
| **SNS** | SMS notifications |
| **Lambda + HTTPS** | WhatsApp via Meta Cloud API |
| **Lambda + HTTPS** | Slack via Incoming Webhooks |

## Frontend Stack (Admin Dashboard)

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.x | UI framework (matches existing) |
| TypeScript | 5.8.x | Type safety |
| Tailwind CSS | 4.x | Styling |
| TanStack Query | 5.x | Server state management |
| React Hook Form | 7.x | Form handling |
| AWS Amplify Auth | 6.x | Cognito integration |

## Libraries & SDKs

### Backend (Lambda)
- `@aws-sdk/client-dynamodb` + `@aws-sdk/lib-dynamodb`
- `@aws-sdk/client-sesv2`
- `@aws-sdk/client-sns`
- `@aws-sdk/client-secrets-manager`
- `uuid`, `zod`

### Infrastructure
- **AWS SAM** - Serverless-optimized, local testing, simplified syntax

## What NOT to Use

| Technology | Why NOT | Use Instead |
|------------|---------|-------------|
| REST API | 3x more expensive | HTTP API |
| AWS SDK v2 | Deprecated | AWS SDK v3 |
| DynamoDB Provisioned | Over-engineering | On-Demand |
| Serverless Framework | Vendor lock-in | AWS SAM |
| Express.js in Lambda | Unnecessary overhead | Native handlers |

## Confidence Assessment

| Area | Level |
|------|-------|
| API Gateway (HTTP vs REST) | HIGH |
| Lambda Runtime | HIGH |
| DynamoDB | HIGH |
| AWS SDK v3 | HIGH |
| Cognito | HIGH |
| WhatsApp Integration | MEDIUM |
