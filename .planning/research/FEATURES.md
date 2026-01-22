# Features Research: Lead Management Systems

**Domain:** Lead Management for High-Value B2B Services
**Context:** Tropico Retreats - ~25 leads/year, 6+ team members
**Researched:** 2026-01-22
**Confidence:** MEDIUM

## Table Stakes

### Lead Capture
| Feature | Complexity |
|---------|------------|
| Form submission capture | Low |
| Required field validation | Low |
| Spam protection (honeypot) | Low |
| Submission timestamp | Low |

### Lead Storage
| Feature | Complexity |
|---------|------------|
| Persistent storage (DynamoDB) | Low |
| Contact details (name, email, phone) | Low |
| Message content | Low |
| Lead status tracking | Low |

### Team Notification
| Feature | Complexity |
|---------|------------|
| Email notification on new lead | Low |
| Notification includes lead details | Low |
| Multiple recipients | Low |

### Admin Dashboard
| Feature | Complexity |
|---------|------------|
| Lead list view | Medium |
| Lead detail view | Low |
| Search/filter | Low |
| Update lead status | Low |
| Add notes | Low |
| Assign to team member | Low |

### Authentication
| Feature | Complexity |
|---------|------------|
| Login/logout (Cognito) | Medium |
| Session management | Medium |
| Password reset | Low |

## Differentiators

| Feature | Priority | Complexity |
|---------|----------|------------|
| WhatsApp notification | High | Medium |
| SMS notification | Medium | Medium |
| Slack notification | Low | Low |
| Temperature rating (Hot/Warm/Cold) | High | Low |
| Pipeline stages (Kanban) | Medium | Medium |
| Auto-reply to customer | High | Low |
| Follow-up reminders | Medium | Medium |

## Anti-Features (NOT to Build)

| Feature | Why Avoid |
|---------|-----------|
| Full CRM integration | Overkill for 25 leads/year |
| Lead scoring algorithms | Not enough volume |
| Marketing automation | Complexity without ROI |
| Customer portal | Customers use form only |
| Mobile native app | Web works on mobile |
| Multi-tenant architecture | Single business |
| AI chatbot | High-touch needs human judgment |

## Feature Dependencies

```
Authentication (Cognito)
└── Dashboard Access
    ├── Lead List View
    │   └── Lead Detail View
    │       ├── Update Status
    │       ├── Add Notes
    │       └── Assign

Lead Capture (Form → Lambda → DynamoDB)
└── Notification Triggers
    ├── Email (SES) ← Table Stakes
    ├── WhatsApp ← Differentiator
    ├── SMS ← Differentiator
    └── Slack ← Differentiator
```

## MVP Recommendation

**Must Have (Week 1-2):**
1. Form submission capture and storage
2. Email notification to team
3. Basic admin dashboard
4. Cognito authentication
5. Lead status tracking
6. Notes on leads

**Should Have (Week 3-4):**
7. Lead assignment
8. Auto-reply email to customer
9. Temperature rating
10. WhatsApp notification
