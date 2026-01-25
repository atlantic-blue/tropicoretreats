# Feature Landscape: Multi-Channel Lead Capture

**Domain:** Lead notification and inbound lead capture for high-value retreats business
**Researched:** 2026-01-25
**Focus:** Slack notifications, SMS alerts, email-to-lead, phone-to-lead
**Confidence:** MEDIUM (WebSearch verified with official docs where available)

---

## Context

This research focuses on the v1.1 milestone features for multi-channel lead capture. The existing v1.0 system already has:
- Contact form submission creates lead
- Email notification to team (SES)
- Customer confirmation email
- Admin dashboard with lead list/detail/notes
- Lead status tracking and temperature rating
- Lead assignment to team members

This document covers expected behaviors and feature categorization for:
- Slack notifications (outbound alerts)
- SMS notifications (outbound alerts)
- Email-to-lead (inbound email creates lead)
- Phone-to-lead (inbound Twilio call creates lead)

---

## Table Stakes

Features users expect when implementing multi-channel notifications. Missing = feature feels incomplete or unprofessional.

### Slack Notifications (Outbound Alerts)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Rich message formatting | Plain text looks unprofessional; Blocks enable better readability | Low | Use Slack Block Kit for structured lead info |
| Lead details in message | Team needs actionable info without clicking links | Low | Name, email, phone, message excerpt, source |
| Link to admin dashboard | Team needs quick access to full lead details | Low | Deep link to lead detail page |
| Timestamp in local timezone | Relevance context for when lead arrived | Low | Use Europe/London as specified |
| @channel or @here for new leads | Team expects notification sound for high-value leads | Low | Use sparingly; consider keyword alerts instead |

### SMS Notifications (Outbound Alerts)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Concise message format | SMS has 160-char limit; truncation looks broken | Low | Lead name + brief summary + dashboard link |
| Opt-out capability | TCPA compliance requires it since April 2025 | Medium | Handle STOP keyword; track opt-out status per number |
| Business hours awareness | 3am alerts create friction | Medium | Queue non-urgent for business hours; immediate for urgent |
| Short URL for dashboard link | Long URLs consume message space | Low | Use URL shortener or custom short domain |

### Email-to-Lead (Inbound)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Parse sender email address | Core requirement for lead creation | Low | Extract from email headers |
| Parse sender name | Needed for personalized follow-up | Low | Extract from "From" field |
| Capture email subject | Context for inquiry type | Low | Map to lead title or notes |
| Capture email body | The actual inquiry content | Low | Store as lead message |
| Auto-reply confirmation | Customer expects acknowledgment | Low | Reuse existing customer email template |
| Handle attachments | Customers may send RFPs, itineraries | Medium | Store in S3, link from lead record |
| De-duplicate by email | Prevent spam/duplicate leads | Medium | Check existing leads by email before creating |

### Phone-to-Lead (Inbound via Twilio)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Capture caller phone number | Core requirement for lead creation | Low | Available in Twilio webhook (event.From) |
| Professional greeting | First impression matters for high-value leads | Low | TwiML `<Say>` or recorded audio |
| Voicemail option | Team may not answer immediately | Medium | TwiML `<Record>` with transcription |
| Voicemail transcription | Team needs text searchable records | Medium | Twilio transcription add-on ~$0.05/min |
| Missed call notification | Team must know calls happened | Low | Status callback to notification Lambda |
| Missed call text-back | Industry standard for lead capture | Medium | Auto-SMS "Sorry we missed you" within minutes |
| Business hours routing | After-hours needs different handling | Medium | Time-based TwiML routing |

---

## Differentiators

Features that set the product apart. Not expected, but create competitive advantage for high-value lead business.

### Slack Notifications

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Interactive buttons | "Claim lead" button directly in Slack | High | Requires Slack app (not just webhook); free tier supports |
| Thread replies for updates | Lead status changes appear in thread | Medium | Track Slack message ID per lead; update via API |
| Lead temperature indicator | Visual urgency cue (Hot/Warm/Cold emoji) | Low | Map existing temperature to emoji in message |
| Source attribution | Track which marketing channel produced lead | Low | Include lead source field in Slack message |

### SMS Notifications

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Assignee-specific SMS | Only notify assigned team member, not everyone | Medium | Route based on lead assignment or round-robin |
| Response tracking | Know if team member acknowledged via SMS reply | High | Requires two-way SMS infrastructure |
| Priority escalation | Auto-escalate if no response in X minutes | High | Requires tracking acknowledgment state |

### Email-to-Lead

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Forwarded email parsing | Team can forward leads from other inboxes | High | Parse forwarded email format; extract original sender |
| Thread tracking | Reply chains create conversation history | High | Track References/In-Reply-To headers |
| AI-powered categorization | Auto-tag lead by intent (corporate, wellness, wedding) | Medium | Use Claude API or Bedrock for classification |
| Attachment preview | Generate thumbnails for PDFs in admin dashboard | Medium | Lambda with PDF-to-image conversion |

### Phone-to-Lead

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Caller ID lookup | Know caller name before answering | Medium | Twilio Lookup API ~$0.01/lookup |
| Call recording | Review conversations for quality, training | Low | Twilio recording; store in S3 |
| IVR menu | Route by destination interest (press 1 for Caribbean) | Medium | TwiML `<Gather>` with digit mapping |
| Simultaneous ring | Ring multiple team members until someone answers | Medium | TwiML `<Dial>` with multiple numbers |
| Callback scheduling | "Press 1 to request callback" for busy team | High | Requires callback queue and triggering mechanism |

---

## Anti-Features

Features to deliberately NOT build. Common mistakes in this domain.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| @channel on every lead | Causes notification fatigue; team ignores alerts | Use @channel sparingly; consider keyword alerts or dedicated leads channel |
| SMS to entire team | Creates 6+ duplicate notifications per lead; expensive | Send to one assignee, or use Slack as primary group channel |
| Real-time Slack typing indicators | Complex, adds no value for async lead alerts | Simple message on lead creation only |
| Twilio voice AI bot | Over-engineering for ~25 leads/year; impersonal for high-value | Simple greeting + voicemail; human callback |
| Two-way Slack messaging | Requires paid Slack tier; complex bidirectional sync | Use Slack for notifications only; admin dashboard for responses |
| Auto-dialing leads | TCPA violations; inappropriate for high-value consultative sales | Manual outbound calls from team |
| SMS marketing to leads | Requires explicit opt-in; high compliance burden | Email-only for marketing; SMS for team alerts only |
| Complex email parsing rules | Maintenance burden; brittle to format changes | Simple extraction: from, subject, body; manual review for edge cases |
| WhatsApp integration in v1.1 | Meta Business verification takes 2-4 weeks; delays milestone | Defer to post-v1.1 as already planned |
| Inbound SMS to lead | Different use case; adds complexity without clear value | Focus on phone calls; SMS is outbound-only for team alerts |

---

## Feature Dependencies

```
EXISTING FEATURES (already built):
+------------------------------------------------------------------+
|  Contact Form -> Lead Lambda -> DynamoDB -> Notification Lambda  |
|                                                |                  |
|                                           SES Emails             |
|                                      (team + customer)           |
|                                                                  |
|  Admin Dashboard (Lead list, detail, status, notes, assignment)  |
+------------------------------------------------------------------+

NEW FEATURES (v1.1):

Slack Notifications:
  Depends on: Notification Lambda, Lead data structure
  Adds: Slack webhook URL env var, HTTP POST to webhook

SMS Notifications:
  Depends on: Notification Lambda, Team phone numbers env var
  Adds: SNS SMS publish, Toll-free number registration

Email-to-Lead:
  Depends on: SES domain verification (already done), Lead Lambda
  Adds: SES inbound rule, S3 bucket for raw emails, new Lambda

Phone-to-Lead:
  Depends on: Lead Lambda
  Adds: Twilio account, Phone number, TwiML handler Lambda, webhook URL
```

### Implementation Order Recommendation

1. **Slack Notifications** - Lowest complexity, highest immediate value
   - Only requires adding HTTP POST to existing notification Lambda
   - Free tier sufficient for ~25 leads/year
   - Team already uses Slack

2. **SMS Notifications** - Medium complexity, high reliability value
   - Requires SNS setup and toll-free registration
   - Compliance setup (opt-out handling)
   - Backup channel if Slack/email fails

3. **Email-to-Lead** - Medium complexity, captures new lead channel
   - Requires SES inbound rules, S3, new Lambda
   - Already have SES domain verified
   - Captures leads who email directly instead of using form

4. **Phone-to-Lead** - Highest complexity, but valuable for high-touch business
   - Requires Twilio account and phone number
   - TwiML logic for greeting, voicemail, routing
   - Most complex, but differentiating for high-value leads

---

## MVP Recommendation

For v1.1, prioritize:

1. **Slack notifications** (table stakes, low complexity)
   - Incoming webhook to #leads channel
   - Rich Block Kit message with lead details
   - Link to admin dashboard

2. **SMS notifications** (table stakes, medium complexity)
   - Single number per team member (not blast)
   - Concise message with lead name + dashboard link
   - Opt-out handling for compliance

3. **Email-to-lead basic** (table stakes, medium complexity)
   - Parse from, subject, body
   - Create lead with "Email" as source
   - Auto-reply confirmation

4. **Phone-to-lead basic** (table stakes, medium complexity)
   - Professional greeting
   - Voicemail with transcription
   - Missed call notification + text-back
   - Create lead with phone number and transcript

**Defer to post-v1.1:**
- Interactive Slack buttons (requires app, not just webhook)
- Forwarded email parsing (complex edge cases)
- AI categorization (nice-to-have, not blocking)
- IVR menu (overkill for volume; simple greeting sufficient)
- Simultaneous ring (team can use call forwarding instead)

---

## Expected Behaviors Summary

### Slack Notifications - Expected Behavior

**Trigger:** New lead created (any source: form, email, phone)

**Message should include:**
- Lead name and contact info (email, phone)
- Message excerpt (first 200 chars)
- Lead source (Contact Form, Email, Phone)
- Temperature if set
- Timestamp (Europe/London timezone)
- Direct link to lead in admin dashboard

**Formatting:**
- Use Block Kit for structure
- Emoji for visual cues (e.g., fire emoji for hot lead)
- Avoid @channel unless truly urgent (configurable)

**Rate limiting:**
- 1 message/second max (Slack limit)
- Implement exponential backoff for 429 errors
- Log to DLQ if persistent failures

### SMS Notifications - Expected Behavior

**Trigger:** New lead created (configurable per channel or all)

**Message format:**
```
New lead: [Name]
[Phone or Email]
View: [short-url]
Reply STOP to opt out
```

**Compliance requirements (TCPA 2025):**
- Include opt-out instructions
- Honor STOP within 10 business days (aim for immediate)
- Track opt-out status per phone number
- Do not re-subscribe automatically

**Delivery:**
- Use toll-free number ($2/month + ~$0.00645/message)
- Register number with AWS for compliance
- Free tier: 100 SMS/month to US numbers

### Email-to-Lead - Expected Behavior

**Trigger:** Email received at hello@tropicoretreat.com (or configured address)

**Processing:**
1. SES receives email, stores raw in S3
2. S3 triggers Lambda
3. Lambda parses: From (email, name), Subject, Body
4. Lambda creates lead via Lead Lambda
5. Auto-reply sent to sender (confirmation)
6. Team notified via existing channels (email, Slack, SMS)

**Edge cases:**
- Spam filtering: Skip if spam score high (SES provides)
- Duplicate detection: Check existing leads by email in last 7 days
- Attachments: Store in S3, link from lead record
- Bounce handling: Don't create lead from bounce/auto-reply

### Phone-to-Lead - Expected Behavior

**Trigger:** Inbound call to Twilio number

**Call flow:**
1. Caller dials Twilio number
2. Twilio webhook hits Lambda
3. Lambda returns TwiML:
   - During hours: Greeting + "Please hold" + attempt transfer OR voicemail
   - After hours: Greeting + voicemail prompt
4. If voicemail left:
   - Twilio transcribes
   - Lambda creates lead with transcript
   - Stores audio recording in S3
5. If missed call (no voicemail):
   - Lambda creates minimal lead (phone number only)
   - Triggers "missed call text-back" SMS
6. Team notified via all channels

**Caller data captured:**
- Phone number (always available)
- Caller name (if Caller ID Lookup enabled, ~$0.01/call)
- Call duration
- Voicemail transcript (if left)
- Recording URL (if recorded)

**Missed call text-back:**
```
Sorry we missed your call to Tropico Retreats.
We'll call you back within 48 hours.
Or email hello@tropicoretreat.com for faster response.
```

---

## Complexity Reference

| Feature | Complexity | LOC Estimate | Primary Challenge |
|---------|------------|--------------|-------------------|
| Slack webhook notification | Low | ~50 | None; just HTTP POST |
| Slack Block Kit formatting | Low | ~100 | Learning Block Kit JSON |
| SNS SMS send | Low | ~30 | AWS SDK call |
| SNS toll-free registration | Medium | ~2 hrs | AWS console setup + compliance form |
| SNS opt-out handling | Medium | ~100 | Track opt-out state per number |
| SES inbound email rule | Medium | ~50 Terraform | Region limitation (only 3 regions support) |
| Email parsing Lambda | Medium | ~200 | mailparser library, edge cases |
| Twilio webhook handler | Medium | ~150 | TwiML response format |
| Twilio voicemail + transcription | Medium | ~100 | TwiML Record + transcription callback |
| Missed call text-back | Medium | ~80 | Status callback + conditional SMS |
| Caller ID Lookup | Medium | ~50 | Twilio Lookup API integration |

---

## Sources

**Slack:**
- [Slack Developer Docs - Incoming Webhooks](https://docs.slack.dev/messaging/sending-messages-using-incoming-webhooks/)
- [Slack Rate Limits](https://docs.slack.dev/apis/web-api/rate-limits/)
- [Slack Free Tier Limitations](https://slack.com/help/articles/27204752526611-Feature-limitations-on-the-free-version-of-Slack)

**SMS/TCPA:**
- [TCPA 2025 Compliance - ActiveProspect](https://activeprospect.com/blog/tcpa-text-messages/)
- [AWS SNS SMS Pricing](https://aws.amazon.com/sns/sms-pricing/)
- [AWS SNS Best Practices](https://docs.aws.amazon.com/sns/latest/dg/channels-sms-best-practices.html)

**Email-to-Lead:**
- [AWS SES Inbound Email Processing](https://schof.co/processing-incoming-email-with-aws-ses/)
- [CRM Email Integration with SES](https://medium.com/@glasampath/how-i-integrated-aws-ses-to-send-emails-and-capture-replies-in-my-crm-e561b0c5ec54)
- [Mailparser Lead Capture](https://mailparser.io/case-studies/lead-capturing/)

**Phone-to-Lead:**
- [Twilio Voice Webhooks](https://www.twilio.com/docs/usage/webhooks/voice-webhooks)
- [Twilio Inbound Call Processing](https://www.twilio.com/docs/serverless/functions-assets/quickstart/receive-call)
- [Twilio Caller ID Lookup](https://www.twilio.com/docs/serverless/functions-assets/quickstart/lookup-carrier-and-caller-info)

**Missed Call Text-Back:**
- [Missed Call Text Back Best Practices - Quo](https://www.quo.com/blog/missed-call-text-back-software/)
- [Missed Call Auto-Reply - Kixie](https://www.kixie.com/sales-blog/how-to-respond-to-a-missed-call-by-text-auto-reply-messages-that-work/)

---

*Researched: 2026-01-25*
*Previous version: 2026-01-22 (MVP lead management features)*
