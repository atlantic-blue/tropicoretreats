# Phase 2: Frontend Integration - Context

**Gathered:** 2026-01-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Connect marketing site contact form to the API and show user feedback. The form UI already exists. This phase wires it to the backend API from Phase 1 and implements loading, success, and error states. Auto-reply emails and other notifications are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Loading state
- Button spinner with text changing to "Sending..."
- All form fields disabled during submission
- 30-second timeout, then show error
- Submit button disabled to prevent double-submit

### Success feedback
- Toast notification (not form replacement)
- Position: bottom center of viewport
- Duration: 5 seconds, then auto-dismiss
- Message: "Thanks! We'll be in touch soon."
- Toast should be dismissible (X button)

### Error handling
- Validation errors: both inline under fields AND summary banner at top
- Network/server errors: red toast notification (same position as success)
- Retry button included in error toast for network failures
- Tone: friendly and helpful ("Oops! Something went wrong. Please try again.")

### Form behavior
- Clear all fields after successful submission
- Preserve all field values on error (user doesn't lose input)
- No auto-scroll needed (toast visible from any scroll position)

### Claude's Discretion
- Toast animation style (fade, slide, etc.)
- Exact styling to match site's design system
- Inline error message wording for specific validation failures
- Summary banner styling

</decisions>

<specifics>
## Specific Ideas

- Toast should match the warm, inviting feel of a retreat business — not corporate or cold
- Error messages should be encouraging, not alarming
- The form should feel responsive and modern (not like a 2010 contact form)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-frontend-integration*
*Context gathered: 2026-01-22*
