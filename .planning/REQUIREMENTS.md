# Requirements: Milestone v1.1 Multi-Channel Leads

## Overview

Extend lead capture to multiple inbound channels (email, phone) and add multi-channel notifications (Slack, SMS) with per-user preferences. Improve system quality with testing and documentation.

## v1.1 Requirements

### Notifications

- [ ] **NOTIF-03**: Team receives Slack message within seconds of new lead with lead details and dashboard link
- [ ] **NOTIF-04**: Designated team member(s) receive SMS alert when new lead arrives
- [ ] **NOTIF-05**: Users can configure which notification channels they receive (email, Slack, SMS)

### Inbound Channels

- [ ] **INBOUND-01**: Emails sent to hello@tropicoretreat.com automatically create leads with sender email, name (parsed), subject, and body
- [ ] **INBOUND-02**: Inbound phone calls to Twilio number create leads with caller phone number
- [ ] **INBOUND-03**: Voicemails left by callers are transcribed and attached to the lead

### Infrastructure

- [ ] **INFRA-01**: API accessible via custom domain api.tropicoretreat.com
- [ ] **INFRA-02**: SES production access granted (sandbox removed)

### Quality

- [ ] **QUAL-01**: Unit tests for all Lambda handlers with mocked AWS services
- [ ] **QUAL-02**: API documentation (OpenAPI spec) published

---

## Future Requirements (Post v1.1)

- [ ] WhatsApp notification (requires Meta Business verification - 2-4 weeks)
- [ ] Integration tests against real AWS services
- [ ] Pipeline Kanban view
- [ ] Follow-up reminders
- [ ] Two-way Slack messaging (requires paid tier)
- [ ] Missed call text-back

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| Voice AI bot | Overkill for 25 leads/year; simple voicemail sufficient |
| WhatsApp in v1.1 | Meta Business verification takes 2-4 weeks |
| SMS blast to entire team | Use Slack for group alerts; SMS for designated individuals |
| Twilio outbound calls | Only inbound for lead capture |
| Integration tests | Unit tests provide sufficient coverage for MVP quality |

---

## Traceability

| Requirement | Phase | Plan | Status |
|-------------|-------|------|--------|
| NOTIF-03 | TBD | TBD | Pending |
| NOTIF-04 | TBD | TBD | Pending |
| NOTIF-05 | TBD | TBD | Pending |
| INBOUND-01 | TBD | TBD | Pending |
| INBOUND-02 | TBD | TBD | Pending |
| INBOUND-03 | TBD | TBD | Pending |
| INFRA-01 | TBD | TBD | Pending |
| INFRA-02 | TBD | TBD | Pending |
| QUAL-01 | TBD | TBD | Pending |
| QUAL-02 | TBD | TBD | Pending |

---

*10 requirements across 4 categories*
*Last updated: 2026-01-25*
