# Project Research Summary

**Project:** Tropico Retreats - Multi-Channel Lead Capture (v1.1)
**Domain:** Lead management for high-value corporate retreat booking
**Researched:** 2026-01-25
**Confidence:** HIGH

## Executive Summary

The v1.1 milestone adds multi-channel lead capture to an existing serverless lead management system built on AWS Lambda, DynamoDB, and API Gateway. The recommended approach extends the existing event-driven architecture where all inbound channels (web form, email, phone) create leads through DynamoDB, triggering the existing notification Lambda to distribute alerts across all configured channels (SES email, Slack webhooks, SNS SMS).

The technology additions are minimal and AWS-native where possible: Twilio SDK for inbound phone webhooks, @slack/webhook for Slack notifications, AWS SNS for SMS alerts, and mailparser for SES inbound email processing. Infrastructure additions include custom API domain (api.tropicoretreat.com), SES receipt rules for email receiving, and new Lambda functions for email/phone inbound handlers. All additions integrate cleanly with the existing Node.js 22 Lambda + DynamoDB + SES + Cognito stack.

The critical risks are well-documented and preventable: Twilio signature validation fails with empty parameters (preserve all params in HMAC), SES inbound email requires careful receipt rule ordering (S3 action before Lambda action), and secrets management for Slack webhook URLs (use AWS Secrets Manager, never commit to git). The phase ordering should start with low-complexity quick wins (Slack/SMS notifications) before tackling the more complex inbound channels (email, phone), with custom API domain as the foundation.

## Key Findings

### Recommended Stack

The existing stack (Lambda Node.js 22, API Gateway HTTP API, DynamoDB, SES outbound, Cognito, React 19) requires minimal additions for v1.1. All new libraries are official SDKs or well-maintained community libraries with 1M+ weekly downloads.

**Core technologies:**
- **@slack/webhook (v7.0.6)**: Outbound Slack notifications — Official SDK, lightweight, supports webhooks without OAuth complexity
- **@aws-sdk/client-sns (v3.968.0)**: SMS notifications — Consistent with existing AWS SDK v3 pattern, native SNS integration
- **twilio (v5.11.2)**: Inbound phone webhook handling — Industry standard for telephony, provides signature validation and TwiML helpers
- **mailparser (v3.9.1)**: Parse inbound emails from SES — Streaming parser for large emails, Node.js native, extracts headers/body/attachments
- **vitest (v4.0.17)**: Test runner — Vite-native (admin already uses Vite), ESM-first matches project's module system, faster than Jest
- **aws-sdk-client-mock (v4.1.0)**: Mock AWS SDK v3 clients — Official AWS recommendation for testing SDK v3

**Infrastructure additions:**
- Custom API domain (api.tropicoretreat.com) via API Gateway v2 domain name with ACM certificate
- SES receipt rule set for inbound email with S3 storage bucket
- Terraform resources for MX records, SES rules, and Lambda permissions

### Expected Features

Research identified clear table stakes vs. differentiators for multi-channel lead capture in the high-value retreats domain.

**Must have (table stakes):**
- **Slack rich notifications**: Block Kit formatting with lead details, source, temperature, dashboard link
- **SMS concise alerts**: 160-char messages with lead name, contact info, short URL, opt-out compliance (TCPA 2025)
- **Email-to-lead parsing**: Extract sender name/email, subject, body; auto-reply confirmation; de-duplicate by email
- **Phone-to-lead capture**: Professional greeting, voicemail with transcription, missed call text-back, caller ID capture
- **Business hours awareness**: After-hours routing for phone calls, queue SMS during off-hours

**Should have (competitive):**
- **Lead temperature in Slack**: Visual urgency cue (emoji for Hot/Warm/Cold)
- **Source attribution**: Track which marketing channel produced each lead
- **Email attachment handling**: Store in S3, link from lead record for RFPs/itineraries
- **Voicemail transcription**: Text-searchable call records via Twilio transcription add-on

**Defer (v2+):**
- **Interactive Slack buttons**: "Claim lead" requires Slack app (not just webhook), adds complexity
- **Two-way Slack messaging**: Requires paid Slack tier and bidirectional sync
- **AI-powered categorization**: Auto-tag by intent (corporate/wellness/wedding) via Claude API
- **WhatsApp integration**: Meta Business verification takes 2-4 weeks, defer to post-v1.1
- **IVR menu**: Overkill for ~25 leads/year volume, simple greeting sufficient

### Architecture Approach

The v1.1 architecture extends the existing event-driven pattern without breaking changes. All inbound channels converge on the existing `createLead` Lambda which writes to DynamoDB, triggering the existing `processLeadNotifications` Lambda via DynamoDB Streams to fan out to all notification channels.

**Major components:**
1. **Inbound Email Handler Lambda** — SES receipt rule triggers Lambda to parse email (mailparser), extract lead data, call createLead
2. **Inbound Phone Handler Lambda** — Twilio webhook calls API Gateway endpoint, Lambda validates signature, returns TwiML, creates lead
3. **Extended Notification Lambda** — Existing processLeadNotifications Lambda adds Slack webhook POST and SNS SMS publish alongside existing SES emails
4. **Custom API Domain** — api.tropicoretreat.com via API Gateway v2 domain name with ACM certificate for branded webhook URLs
5. **SES Inbound Infrastructure** — MX record, S3 bucket for raw emails, receipt rule set with S3 action (position 1) + Lambda action (position 2)

**Data flow:**
```
Web Form → API Gateway → createLead Lambda → DynamoDB
Email → SES → S3 + Lambda → createLead Lambda → DynamoDB
Phone → Twilio → API Gateway → Lambda → createLead Lambda → DynamoDB
                                               ↓
                                        DynamoDB Streams
                                               ↓
                              processLeadNotifications Lambda
                                     ↓        ↓        ↓
                                  SES     Slack      SNS SMS
```

### Critical Pitfalls

1. **Twilio signature validation fails with empty parameters** — Twilio includes empty parameters (e.g., CalledZip=) in HMAC signature. Default URLSearchParams strips empty values, causing signature mismatch. All inbound calls rejected. Prevention: preserve empty values when parsing form data for validation.

2. **SES inbound email Lambda action executes before S3 save** — Lambda receives metadata only, not full email body. Leads created without content. Prevention: receipt rule must order S3 action (position 1) before Lambda action (position 2).

3. **Slack webhook URL exposed in code or logs** — Webhook URL committed to git or logged. Attackers spam team channel. Slack revokes URL. Prevention: store webhook URL in AWS Secrets Manager, never in environment variables or code.

4. **SES region mismatch** — SES email receiving only available in specific regions (us-east-1, us-west-2, eu-west-1). Current infrastructure in us-east-1 is supported. Prevention: verify region support before creating receipt rules.

5. **Custom domain certificate in wrong region** — API Gateway HTTP API with regional endpoint requires ACM certificate in same region as API. Certificate in different region causes deployment failure. Prevention: create certificate in us-east-1 (same as API).

## Implications for Roadmap

Based on research, suggested phase structure with clear dependency ordering and complexity progression:

### Phase 1: Custom API Domain (Foundation)
**Rationale:** Zero-risk infrastructure foundation that benefits all channels. No dependencies on other phases. Custom domain stabilizes webhook URLs before Twilio integration.
**Delivers:** api.tropicoretreat.com accessible via HTTPS with ACM certificate
**Uses:** ACM certificate, API Gateway v2 domain name, Route53 CNAME
**Avoids:** Pitfall #5 (certificate region), Pitfall #7 (Twilio URL changes)
**Research Flag:** Standard pattern, skip /gsd:research-phase

### Phase 2: Slack Notifications (Quick Win)
**Rationale:** Lowest complexity, highest immediate value. No external vendor setup. Extends existing notification Lambda with simple HTTP POST. Free tier adequate.
**Delivers:** Rich Block Kit notifications to #leads channel on any lead creation
**Addresses:** Table stakes - Slack rich notifications, source attribution, temperature indicator
**Uses:** @slack/webhook library, AWS Secrets Manager for URL
**Avoids:** Pitfall #3 (webhook URL exposure), Pitfall #11 (Block Kit validation)
**Research Flag:** Standard pattern, skip /gsd:research-phase

### Phase 3: SNS SMS Notifications
**Rationale:** Backup channel if Slack/email fails. Medium complexity due to SNS sandbox exit requirement (1-2 weeks approval). Extends same notification Lambda.
**Delivers:** Concise SMS alerts to team phone numbers with opt-out compliance
**Addresses:** Table stakes - SMS alerts, TCPA compliance, business hours awareness
**Uses:** @aws-sdk/client-sns, IAM permissions for sns:Publish
**Avoids:** Pitfall #6 (SNS sandbox), Pitfall #12 (character encoding)
**Research Flag:** Standard pattern, skip /gsd:research-phase. Note: Request SNS production access at phase start.

### Phase 4: Email-to-Lead (Inbound)
**Rationale:** Captures leads who email directly vs. form submission. Medium-high complexity due to SES receipt rule ordering and email parsing edge cases. Requires new Lambda.
**Delivers:** hello@tropicoretreat.com creates leads with auto-reply confirmation
**Addresses:** Table stakes - email parsing, auto-reply, de-duplication; Should-have - attachment handling
**Uses:** mailparser library, SES receipt rules, S3 bucket for raw emails, email-reply-parser
**Implements:** Inbound Email Handler Lambda component
**Avoids:** Pitfall #2 (S3/Lambda ordering), Pitfall #4 (region mismatch), Pitfall #10 (rule set activation)
**Research Flag:** Complex integration, consider /gsd:research-phase if edge cases arise (forwarded emails, bounce handling)

### Phase 5: Phone-to-Lead (Inbound)
**Rationale:** Most complex channel. Requires Twilio account setup, TwiML response logic, signature validation, voicemail transcription. High value for high-touch business model.
**Delivers:** Inbound calls create leads with voicemail transcription, missed call text-back
**Addresses:** Table stakes - professional greeting, voicemail, missed call notifications, business hours routing
**Uses:** Twilio SDK, API Gateway webhook route, TwiML response helpers
**Implements:** Inbound Phone Handler Lambda component
**Avoids:** Pitfall #1 (signature validation), Pitfall #13 (TwiML content-type), Pitfall #7 (webhook URL updates)
**Research Flag:** Complex integration with external service, consider /gsd:research-phase for TwiML voice flow and transcription setup

### Phase 6: Testing Infrastructure
**Rationale:** Integration tests against real AWS services prevent mock mismatch pitfalls. Should run continuously after phases 2-5 complete.
**Delivers:** Vitest test suite with real AWS service integration tests
**Addresses:** Should-have - quality assurance, regression prevention
**Uses:** vitest, aws-sdk-client-mock for unit tests, real services for integration tests
**Avoids:** Pitfall #8 (mock mismatch)
**Research Flag:** Standard pattern, skip /gsd:research-phase

### Phase Ordering Rationale

- **Foundation first**: Custom API domain (Phase 1) stabilizes webhook URLs before external services depend on them
- **Quick wins early**: Slack (Phase 2) and SMS (Phase 3) deliver immediate value with low complexity, extending existing Lambda
- **Complexity progression**: Outbound channels (Phases 2-3) are simpler than inbound (Phases 4-5). Build confidence before tackling email parsing and phone webhooks
- **External dependencies managed**: SNS sandbox exit (Phase 3) and Twilio setup (Phase 5) requested early to avoid blocking later phases
- **Architectural alignment**: All inbound channels converge on existing createLead Lambda, reusing notification flow. No breaking changes to existing system
- **Pitfall avoidance**: Phase order sequences risky integrations (SES receipt rules, Twilio signature validation) after team has experience with simpler patterns

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 4 (Email-to-Lead):** Complex email parsing edge cases (forwarded emails, HTML vs. plain text, bounce detection, spam filtering) may require additional research during implementation
- **Phase 5 (Phone-to-Lead):** TwiML voice flow design (greeting script, voicemail prompt, IVR options) and transcription accuracy may benefit from /gsd:research-phase

Phases with standard patterns (skip research-phase):
- **Phase 1 (Custom Domain):** Well-documented Terraform pattern, official AWS docs sufficient
- **Phase 2 (Slack Notifications):** Official Slack SDK with simple HTTP POST, Block Kit Builder for validation
- **Phase 3 (SNS SMS):** Standard AWS SDK v3 pattern, official SNS documentation comprehensive
- **Phase 6 (Testing):** Vitest official docs and aws-sdk-client-mock GitHub examples adequate

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All libraries verified with npm registry, official SDKs where available, versions confirmed current as of 2026-01-25 |
| Features | MEDIUM | Feature expectations based on industry research and official docs, but customer validation needed for business hours logic and SMS opt-out UX |
| Architecture | HIGH | Verified against official AWS documentation for SES, API Gateway, Lambda. Twilio webhook pattern well-documented |
| Pitfalls | HIGH | Critical pitfalls sourced from official troubleshooting guides (Twilio signature validation, SES receipt rule ordering) and AWS best practices |

**Overall confidence:** HIGH

### Gaps to Address

- **Twilio phone number selection**: Need to decide Colombian local number vs. US toll-free for inbound calls. Research during Phase 5 based on target customer location preferences.
- **Slack workspace confirmation**: Verify which Slack workspace receives notifications and create webhook there. Confirm during Phase 2 kickoff.
- **SES production access status**: Verify SES sandbox removal is complete for customer confirmation emails. Check before Phase 4 implementation.
- **SMS opt-out UX**: Decide if team members need opt-out capability for SMS alerts or if only external customers require it. Clarify during Phase 3.
- **Business hours definition**: Define specific hours for after-hours routing (phone, SMS queue). Coordinate with team during Phases 3-5.
- **Email attachment size limits**: SES has 40MB limit for inbound emails. Research S3 storage and CloudFront serving strategy if RFPs exceed this during Phase 4.

## Sources

### Primary (HIGH confidence)
- [AWS SES Email Receiving Concepts](https://docs.aws.amazon.com/ses/latest/dg/receiving-email-concepts.html) — Inbound email architecture, receipt rules, S3/Lambda ordering
- [AWS SNS SMS Documentation](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_sns_code_examples.html) — SMS sending, sandbox, transactional vs. promotional
- [Slack Incoming Webhooks](https://docs.slack.dev/messaging/sending-messages-using-incoming-webhooks/) — Webhook URL format, payload structure, Block Kit
- [Twilio Voice Webhooks](https://www.twilio.com/docs/usage/webhooks/voice-webhooks) — Webhook parameters, TwiML response format, signature validation
- [Terraform API Gateway V2 Domain](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/apigatewayv2_domain_name) — Custom domain configuration, ACM certificate requirements
- [Vitest 4.0 Announcement](https://voidzero.dev/posts/announcing-vitest-4) — ESM support, Vite integration, Jest compatibility

### Secondary (MEDIUM confidence)
- [How to Fix Twilio Signature Validation Failures in AWS Lambda](https://norahsakal.com/tutorials/troubleshooting/troubleshooting-hub-twilio-request-validation-aws-sam-lambda-keep-blank-values/) — Pitfall #1 empty parameters issue
- [AWS SES Lambda Forwarder Terraform Pattern](https://cuddly-octo-palm-tree.com/posts/2021-10-24-aws-email-forwarding-tf/) — Example receipt rule configuration
- [Testing Lambda with Vitest](https://daaru.medium.com/testing-lambda-functions-with-vitest-fc713caa975d) — Integration test patterns
- [TCPA 2025 Compliance - ActiveProspect](https://activeprospect.com/blog/tcpa-text-messages/) — SMS opt-out requirements

### Tertiary (LOW confidence)
- [Missed Call Text Back Best Practices - Quo](https://www.quo.com/blog/missed-call-text-back-software/) — Industry best practices for feature expectations
- [CRM Email Integration with SES](https://medium.com/@glasampath/how-i-integrated-aws-ses-to-send-emails-and-capture-replies-in-my-crm-e561b0c5ec54) — Email-to-lead pattern example

---
*Research completed: 2026-01-25*
*Ready for roadmap: yes*
