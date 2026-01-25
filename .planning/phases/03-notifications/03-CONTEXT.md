# Phase 3: Notifications - Context Document

**Phase Goal:** Team receives email notification and customer receives auto-reply when lead submits.

**Created:** 2026-01-23
**Source:** /gsd:discuss-phase 3

---

## Discussion Summary

This document captures all decisions made during the Phase 3 discussion session. These decisions should guide the planning and implementation of the notifications system.

---

## 1. Team Notification Email

### Recipients
- **Multiple team members** receive notifications (not just one person)
- **Configuration:** Via environment variable (comma-separated list)
- **Format:** `TEAM_EMAILS=maria@...,julian@...,ops@...`

### Email Format
- **Style:** HTML branded email (not plain text)
- **All lead info weighted equally** - no priority hierarchy in display

### Content to Include
| Field | Include | Notes |
|-------|---------|-------|
| Customer name | Yes | - |
| Email address | Yes | - |
| Phone number | Yes | - |
| Message | Yes | Full message text |
| Timestamp | Yes | London timezone (Europe/London) |
| Lead source | Yes | Which page/form submitted from |
| Company name | Yes | If provided |
| Destination | Yes | If selected |

### Reply Behavior
- **Reply-to:** Customer's email address (enables direct reply)
- **Include:** Link to admin dashboard (for future Phase 5)

### Subject Line
- **Format:** `New Lead from [Company Name]`
- **Fallback:** Use customer name if no company provided
- **Example:** "New Lead from Acme Corp" or "New Lead from John Smith"

---

## 2. Customer Auto-Reply Email

### Tone & Style
- **Tone:** Warm & personal (not corporate/formal)
- **Brand match:** HTML format matching team notification style

### Content Promises
- **Response timeframe:** 48-hour response promise
- **Include:** Full details of what they submitted (confirmation)
- **Include:** WhatsApp contact option for faster response

### Reference Number
- **Include:** Yes - unique enquiry reference
- **Format:** `TR-2026-ABC123` style
- **Purpose:** Helps if customer calls/emails back

### Reply Handling
- **Reply-to:** hello@tropicoretreats.com (team inbox)
- **Replies create conversation thread**

### Subject Line
- **Include destination** if selected
- **Example:** "Your Caribbean Retreat Enquiry" or "Your Tropico Retreats Enquiry"

### Social Links
- **Include:** Instagram and LinkedIn links in email footer

### Send Timing
- **Immediate** - send within seconds of form submission

---

## 3. Delivery Architecture

### Trigger Mechanism
- **DynamoDB Streams** - fully decoupled architecture
- Lead Lambda saves to DynamoDB, returns immediately
- Stream triggers separate notification Lambda
- **User doesn't wait** for emails to send

### Expected Volume
- **Medium:** 50-500 leads/day
- Async approach appropriate for this scale

### Failure Handling
- **Alert team immediately** via multiple channels:
  - Slack webhook
  - SMS via SNS
  - Fallback email (different address)
- **Dead Letter Queue (DLQ):** Yes - failed messages preserved for manual review/replay

---

## 4. Email Sender Identity

### Domain
- **Domain:** tropicoretreat.com
- **SES Status:** Not yet verified (DNS records needed)
- **DNS Access:** User can add records

### From Addresses
| Email Type | From Address | From Name |
|------------|--------------|-----------|
| Team notification | leads@tropicoretreat.com | Tropico Retreats |
| Customer auto-reply | hello@tropicoretreat.com | Tropico Retreats |

### Email Footer
- **Physical address:** Yes, London address
- **Copyright:** Dynamic year (auto-updates)
- **Logo:** Yes, include logo image
- **Logo URL:** https://tropicoretreat.com/public/favicon.jpg
- **Unsubscribe:** Not needed (transactional emails)

---

## Technical Requirements Derived

Based on the discussion, the following technical components are needed:

### Infrastructure
1. **SES domain verification** for tropicoretreat.com
2. **DynamoDB Streams** enabled on leads table
3. **Notification Lambda** triggered by stream
4. **SQS Dead Letter Queue** for failed notifications
5. **SNS Topic** for failure alerts (SMS, email)
6. **Slack webhook integration** for failure alerts

### Environment Variables
```
TEAM_EMAILS=maria@...,julian@...,ops@...
FROM_EMAIL_TEAM=leads@tropicoretreat.com
FROM_EMAIL_CUSTOMER=hello@tropicoretreat.com
FROM_NAME=Tropico Retreats
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
ALERT_PHONE_NUMBERS=+44...
ALERT_EMAIL=alerts@...
ADMIN_DASHBOARD_URL=https://admin.tropicoretreat.com
```

### Email Templates
1. **Team notification template** (HTML)
   - Lead details table
   - Reply-to customer
   - Dashboard link
   - London timezone timestamps

2. **Customer auto-reply template** (HTML)
   - Warm greeting
   - Reference number
   - Submission details echo
   - 48-hour promise
   - WhatsApp CTA
   - Social links footer
   - Logo header
   - Physical address footer

---

## Open Items for Planning

1. **SES verification** - Need to add DNS records before dev testing
2. **Slack workspace** - Need webhook URL for failure alerts
3. **Alert phone numbers** - Need numbers for SMS alerts
4. **Admin dashboard URL** - Placeholder until Phase 5

---

## Success Criteria (from ROADMAP.md)

1. Team receives email within 60 seconds of form submission
2. Email contains lead name, email, phone, message, and timestamp
3. Customer receives auto-reply confirming their inquiry was received
4. Auto-reply includes expected response timeframe
5. Notification failures do not block lead storage (async/decoupled)

---

*Captured: 2026-01-23*
*Source: Interactive discussion via /gsd:discuss-phase*
