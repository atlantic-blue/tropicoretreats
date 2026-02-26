# Email CRM — Architecture Diagram, Milestones, and Product Roadmap

## 1. System Architecture Diagram

```mermaid
graph TB
    subgraph "Internet"
        Client["Client Email<br/>(client@example.com)"]
        Operator["Operator Browser<br/>(admin.tropicoretreat.com)"]
    end

    subgraph "AWS — us-east-1"
        subgraph "DNS — Route53"
            MX["MX Record<br/>tropicoretreat.com"]
            SPF["TXT Record (SPF)<br/>tropicoretreat.com"]
            DMARC["TXT Record (DMARC)<br/>_dmarc.tropicoretreat.com"]
            DKIM["CNAME Records (DKIM)<br/>3x _domainkey"]
        end

        subgraph "Email Receiving Pipeline"
            SES_RX["SES Receiving<br/>(Receipt Rule Set)"]
            S3_RAW["S3 Bucket<br/>tropicoretreat-email-store<br/>/incoming/*"]
            LAMBDA_RX["Lambda: tropico-email-receive<br/>(S3 triggered, MIME parser)"]
        end

        subgraph "Email Sending Pipeline"
            APIGW["API Gateway v2<br/>(HTTP API + JWT Auth)"]
            LAMBDA_ADMIN["Lambda: tropico-email-admin<br/>(POST/GET/PATCH /emails/*)"]
            SES_TX["SES Sending<br/>(team@tropicoretreat.com)"]
        end

        subgraph "Storage"
            DDB["DynamoDB<br/>tropico-leads-${env}<br/>(single-table)"]
            S3_ATT["S3 Bucket<br/>tropicoretreat-email-store<br/>/attachments/*"]
        end

        subgraph "Error Handling"
            DLQ["SQS DLQ<br/>tropico-email-dlq"]
            CW["CloudWatch<br/>Logs + Alarms"]
        end

        subgraph "Existing Infrastructure"
            CF_ADMIN["CloudFront<br/>admin.tropicoretreat.com"]
            COGNITO["Cognito User Pool<br/>(JWT Authorizer)"]
            LAMBDA_LEADS["Lambda: tropico-leads-admin<br/>(existing)"]
        end
    end

    %% Inbound Flow
    Client -->|"1. Send email"| MX
    MX -->|"2. Route to SES"| SES_RX
    SES_RX -->|"3. Store raw email"| S3_RAW
    S3_RAW -->|"4. S3 Event trigger"| LAMBDA_RX
    LAMBDA_RX -->|"5a. Write email record"| DDB
    LAMBDA_RX -->|"5b. Store attachments"| S3_ATT
    LAMBDA_RX -->|"5c. Match/create lead"| DDB
    LAMBDA_RX -->|"5d. Backup forward"| SES_TX
    LAMBDA_RX -->|"errors"| DLQ
    LAMBDA_RX -->|"logs"| CW

    %% Outbound Flow
    Operator -->|"1. Compose email"| CF_ADMIN
    CF_ADMIN -->|"2. API call + JWT"| APIGW
    APIGW -->|"3. Authorize"| COGNITO
    APIGW -->|"4. Route"| LAMBDA_ADMIN
    LAMBDA_ADMIN -->|"5a. Send via SES"| SES_TX
    LAMBDA_ADMIN -->|"5b. Write email record"| DDB
    LAMBDA_ADMIN -->|"5c. Update lead metadata"| DDB
    LAMBDA_ADMIN -->|"logs"| CW
    SES_TX -->|"6. Deliver"| Client

    %% Read Flow
    Operator -->|"View thread"| CF_ADMIN
    CF_ADMIN -->|"GET /emails/{leadId}"| APIGW
    APIGW --> LAMBDA_ADMIN
    LAMBDA_ADMIN -->|"Query emails"| DDB

    %% Existing connections
    APIGW -->|"existing routes"| LAMBDA_LEADS
    LAMBDA_LEADS --> DDB

    classDef new fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef existing fill:#f3f4f6,stroke:#6b7280,stroke-width:1px
    classDef dns fill:#fff3e0,stroke:#ef6c00,stroke-width:1px
    classDef error fill:#fce4ec,stroke:#c62828,stroke-width:1px

    class SES_RX,S3_RAW,LAMBDA_RX,LAMBDA_ADMIN,S3_ATT new
    class APIGW,DDB,SES_TX,CF_ADMIN,COGNITO,LAMBDA_LEADS existing
    class MX,SPF,DMARC,DKIM dns
    class DLQ,CW error
```

## 2. Data Flow Diagram — Inbound Email

```mermaid
sequenceDiagram
    participant Client as Client Email
    participant SES as SES Receiving
    participant S3 as S3 Email Store
    participant Lambda as emailReceive Lambda
    participant DDB as DynamoDB
    participant S3A as S3 Attachments
    participant SES_TX as SES Sending
    participant DLQ as SQS DLQ

    Client->>SES: Email to team@tropicoretreat.com
    SES->>S3: Store raw MIME (incoming/<messageId>)
    S3->>Lambda: S3 PutObject event

    Lambda->>S3: GetObject (read raw email)
    Lambda->>Lambda: Parse MIME (mailparser)

    Lambda->>DDB: Scan for lead by email address
    alt Lead found
        Lambda->>Lambda: Use existing leadId
    else No lead found
        Lambda->>DDB: PutItem (create new lead)
        Lambda->>Lambda: Use new leadId
    end

    opt Has attachments
        Lambda->>S3A: PutObject (attachments/<leadId>/<msgId>/<filename>)
    end

    Lambda->>DDB: PutItem (email record)
    Lambda->>DDB: UpdateItem (lead.lastEmailAt, lead.unreadEmailCount++)

    Lambda->>SES_TX: Forward notification to backup email
    Note over SES_TX: Best-effort, failure logged

    alt Processing fails (3 retries exhausted)
        Lambda->>DLQ: Failed event to DLQ
    end
```

## 3. Data Flow Diagram — Outbound Email

```mermaid
sequenceDiagram
    participant UI as Admin Dashboard
    participant APIGW as API Gateway
    participant Auth as Cognito JWT
    participant Lambda as emailAdmin Lambda
    participant SES as SES Sending
    participant DDB as DynamoDB
    participant Client as Client Inbox

    UI->>APIGW: POST /emails/send (JWT + body)
    APIGW->>Auth: Validate JWT
    Auth-->>APIGW: Valid
    APIGW->>Lambda: Invoke with event

    Lambda->>Lambda: Validate body (Zod)
    Lambda->>DDB: GetItem (verify lead exists)

    Lambda->>SES: SendEmail (team@tropicoretreat.com -> client)
    SES-->>Lambda: MessageId
    SES->>Client: Deliver email

    Lambda->>DDB: PutItem (email record, direction=outbound)
    Lambda->>DDB: UpdateItem (lead.lastEmailAt = now)
    Lambda-->>APIGW: 201 Created (email record)
    APIGW-->>UI: Response

    UI->>UI: Optimistic update + invalidate queries
```

## 4. DynamoDB Entity Diagram

```mermaid
erDiagram
    LEAD {
        string PK "LEAD#{id}"
        string SK "LEAD#{id}"
        string GSI1PK "STATUS#{status}"
        string GSI1SK "createdAt"
        string id "ULID"
        string status "NEW|CONTACTED|QUOTED|WON|LOST|ARCHIVED"
        string temperature "HOT|WARM|COLD"
        string firstName
        string lastName
        string email
        string lastEmailAt "ISO 8601 (new)"
        number unreadEmailCount "(new)"
    }

    NOTE {
        string PK "LEAD#{leadId}"
        string SK "NOTE#{timestamp}#{noteId}"
        string id "ULID"
        string leadId
        string content
        string authorId
        string authorName
        string type "MANUAL|SYSTEM"
    }

    EMAIL {
        string PK "LEAD#{leadId}"
        string SK "EMAIL#{timestamp}#{messageId}"
        string id "messageId or ULID"
        string leadId
        string direction "inbound|outbound"
        string fromAddress
        string toAddress
        string subject
        string bodyText
        string bodyHtml
        string sentAt "ISO 8601"
        string readAt "ISO 8601 or null"
        string operator "outbound only"
        string s3Key "inbound raw email"
    }

    LEAD ||--o{ NOTE : "has notes"
    LEAD ||--o{ EMAIL : "has emails"
```

## 5. Milestone Table

| # | Milestone | Scope | Deliverables | Est. Duration | Dependencies |
|---|---|---|---|---|---|
| M1 | DNS + SES Receiving Setup | Infra | SPF, DMARC, MX records; SES receipt rule set; S3 email bucket; SES production access request | 1-2 days (DNS propagation) | None |
| M2 | Inbound Email Processing | Backend + Infra | emailReceive Lambda; MIME parsing; lead matching; email DynamoDB writes; S3 attachment storage; backup forwarding; DLQ; IAM roles | 2-3 days | M1 |
| M3 | Outbound Email API | Backend + Infra | emailAdmin Lambda (send route); Zod validation; SES send; email DynamoDB writes; API Gateway route; IAM policies | 1-2 days | M1 |
| M4 | Email Thread API | Backend + Infra | emailAdmin Lambda (list route, mark-read route); pagination; API Gateway routes | 1 day | M2, M3 |
| M5 | Email Thread UI | Frontend | EmailThread component; EmailBubble component; email hooks; lead detail integration; mark-as-read on view | 2 days | M4 |
| M6 | Email Compose UI | Frontend | EmailCompose component; send mutation; optimistic updates; auto-subject for replies | 1 day | M4 |
| M7 | Unread Indicators + Sorting | Frontend + Backend | Unread badge on LeadCard; sort by lastEmailAt; last email preview; lead type extensions | 1 day | M4 |
| M8 | Integration Testing + Polish | All | End-to-end send/receive test; error handling verification; DLQ monitoring setup; CloudWatch alarms | 1-2 days | M5, M6, M7 |

**Total estimated duration: 10-14 days**

## 6. Vertical Slices (Implementation Order)

Each slice delivers testable, end-to-end user value:

### Slice 1: "An inbound email is stored and visible in DynamoDB"
**Scope:** M1 + M2 (infra + backend only)
- Deploy DNS records (SPF, DMARC, MX)
- Create S3 bucket with lifecycle rules
- Deploy SES receipt rule
- Deploy emailReceive Lambda with MIME parsing
- Deploy IAM roles
- Verify: send test email, check DynamoDB record exists

### Slice 2: "An operator can send an email from the API"
**Scope:** M3 (backend only)
- Deploy emailAdmin Lambda (send route)
- Deploy API Gateway route
- Deploy IAM policies
- Verify: curl POST /emails/send, check email delivered + DynamoDB record

### Slice 3: "An operator can view the email thread in the dashboard"
**Scope:** M4 + M5 (backend + frontend)
- Deploy emailAdmin Lambda (list + mark-read routes)
- Deploy API Gateway routes
- Build EmailThread, EmailBubble components
- Build email hooks (useEmailThread, useMarkEmailsRead)
- Integrate into LeadDetail page
- Verify: navigate to lead, see email thread, inbound/outbound aligned correctly

### Slice 4: "An operator can compose and send an email from the dashboard"
**Scope:** M6 (frontend)
- Build EmailCompose component
- Build useSendEmail mutation hook
- Integrate into LeadDetail page below thread
- Verify: type email, click send, see it appear in thread

### Slice 5: "An operator sees unread badges and can sort leads by email activity"
**Scope:** M7 (frontend + backend)
- Extend LeadCard with unread badge
- Extend Lead type with lastEmailAt, unreadEmailCount
- Add sort-by-recency option
- Add last email preview on card
- Verify: receive email, see badge on lead card, sort works

## 7. Product Roadmap

```mermaid
gantt
    title Email CRM MVP — Implementation Roadmap
    dateFormat  YYYY-MM-DD
    axisFormat  %b %d

    section Infrastructure
    DNS Records (SPF, DMARC, MX)        :dns, 2026-02-27, 2d
    S3 Email Store Bucket                :s3, 2026-02-27, 1d
    SES Receipt Rule Set                 :ses, after dns, 1d
    SES Production Access Request        :sandbox, 2026-02-27, 2d

    section Slice 1 — Inbound Processing
    Email Receive Lambda                 :rx_lambda, after ses, 2d
    MIME Parser Library                  :mime, 2026-02-28, 1d
    Lead Matching Logic                  :match, after mime, 1d
    DynamoDB Email Schema                :schema, 2026-02-28, 1d
    Backup Forwarding                    :fwd, after rx_lambda, 1d
    Integration Test — Inbound           :test1, after fwd, 1d

    section Slice 2 — Outbound API
    Email Admin Lambda (send)            :tx_lambda, after schema, 2d
    API Gateway Routes                   :apigw, after tx_lambda, 1d
    Integration Test — Outbound          :test2, after apigw, 1d

    section Slice 3 — Thread View
    Email Admin Lambda (list + read)     :list_lambda, after test2, 1d
    EmailThread Component                :thread_ui, after list_lambda, 2d
    Mark-as-Read Integration             :read_ui, after thread_ui, 1d

    section Slice 4 — Compose
    EmailCompose Component               :compose_ui, after read_ui, 1d
    Send Mutation + Optimistic UI        :send_ui, after compose_ui, 1d

    section Slice 5 — Unread + Sorting
    LeadCard Unread Badge                :badge, after send_ui, 1d
    Sort by Recent Email                 :sort, after badge, 1d

    section Polish
    End-to-End Testing                   :e2e, after sort, 1d
    CloudWatch Alarms + DLQ Setup        :monitoring, after e2e, 1d
```

## 8. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| SES sandbox removal delayed (>24h) | Medium | High — cannot send to unverified recipients | Request early; test with verified addresses; provide clear instructions to operations |
| MX record propagation delay | Low | Medium — inbound emails delayed up to 48h | Deploy DNS first; verify with `dig MX tropicoretreat.com` before proceeding |
| MIME parsing edge cases (encoding, attachments) | Medium | Medium — some emails may not parse correctly | Use battle-tested `mailparser` library; store raw email in S3 as fallback; add error flag on records |
| DynamoDB item size limit (400KB) | Low | Medium — very large email bodies may exceed limit | Truncate body at 100KB; store full body in S3 if needed; add `bodyTruncated` flag |
| Email loop (auto-reply sends to team address) | Low | High — infinite email loop | emailReceive Lambda checks `fromAddress !== team@tropicoretreat.com`; rate limit on SES receipt rule |
| Existing TXT record collision (SPF + Google verify) | Low | Low — Terraform may error on multiple TXT records | Combine into single TXT record resource with multiple values |
| Lead matching returns multiple leads for same email | Low | Medium — ambiguous matching | Take most recently created lead; log warning for manual review |

## 9. Success Criteria

| Criteria | Measurement | Target |
|---|---|---|
| Operator can send email from dashboard | End-to-end test | Email received by test inbox within 10 seconds |
| Inbound email appears in dashboard | End-to-end test | Email visible in thread within 30 seconds of sending |
| Unknown sender creates new lead | End-to-end test | New lead appears in lead list after email from unknown address |
| Unread badges show correctly | Manual test | Badge appears when inbound email received; disappears when thread viewed |
| Backup forwarding works | End-to-end test | Personal email receives forwarded copy within 60 seconds |
| No email content in logs | Log audit | Grep CloudWatch logs for email body content returns zero results |
| SPF/DKIM/DMARC pass | External tool (mail-tester.com) | Score 10/10 on email authentication |
