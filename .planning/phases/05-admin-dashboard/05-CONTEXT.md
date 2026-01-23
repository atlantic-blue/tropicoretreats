# Phase 5: Admin Dashboard - Context

**Gathered:** 2026-01-23
**Status:** Ready for planning

<domain>
## Phase Boundary

React admin interface for viewing, managing, and tracking leads through the sales pipeline. Team members can view all leads, search/filter, see lead details, update status and temperature, add notes, and assign leads to team members. Authentication uses Cognito from Phase 4.

</domain>

<decisions>
## Implementation Decisions

### Lead List Layout
- Cards grid layout (not table or list)
- 3 cards per row on desktop
- Minimal card content: name, status badge, temperature icon, relative timestamp
- Status indicator: colored badge + colored left border/accent on card
- Temperature indicator: flame icon with color (red=hot, orange=warm, blue=cold)
- Whole card clickable to open details
- Subtle shadow/lift hover effect
- Default sort: newest first
- Pagination: page numbers, 15 leads per page
- Empty state: illustrated message with friendly copy
- Relative timestamps ("2 hours ago", "Yesterday")

### Detail View & Editing
- Full page detail view (not sidebar or modal)
- Two-column layout: left (contact info + message), right (status, temp, assignee, notes)
- Navigation: back button + breadcrumb ("Leads > Lead Name")
- Inline dropdowns for status, temperature, and assignee — instant save on change

### Pipeline Workflow
- Statuses: New → Contacted → Quoted → Won/Lost (strict forward-only progression)
- Temperature meanings: likelihood to book (Hot=very likely, Warm=maybe, Cold=unlikely)
- Default temperature for new leads: Warm
- Assignment: dropdown of team members pulled from Cognito users
- Activity logging: auto-log status/temp/assignee changes in notes timeline
- Log format: "Julian changed status to Contacted — 2 hours ago"

### Notes
- Inline click-to-add ("+ Add note" expands to input)
- Plain text (no rich text editor)
- Notes are editable but not deletable (preserve history)
- Show author + timestamp: "Julian — 2 hours ago: Called, left voicemail"
- Notes timeline: newest first
- Manual notes and auto-logged changes appear in same timeline

### Search & Filtering
- Search searches everything: name, email, phone, message, notes
- Horizontal filter bar above cards with dropdowns
- Filter by: status (multi-select), temperature (multi-select), assignee, date range
- Date range: calendar picker for start/end dates
- Filter state persists in URL (shareable/bookmarkable)
- Result count shown: "Showing 12 of 47 leads"
- Clear all filters button
- No results state: message + clear filters button

### Claude's Discretion
- Card shadow intensity and hover animation details
- Specific colors for status badges and temperature icons
- Empty state illustration style
- Date range picker component choice
- Search debounce timing
- Loading states and skeleton designs
- Error handling UI patterns
- Mobile responsive breakpoints

</decisions>

<specifics>
## Specific Ideas

- Cards should feel clean and modern — not cluttered
- Temperature flame icon makes it quick to spot hot leads
- Strict forward-only status progression prevents accidental backwards movement
- Auto-logging provides audit trail without manual effort
- URL-based filters allow bookmarking common views (e.g., "My hot leads")

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-admin-dashboard*
*Context gathered: 2026-01-23*
