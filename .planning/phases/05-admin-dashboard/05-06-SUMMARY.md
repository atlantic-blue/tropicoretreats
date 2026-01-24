---
phase: 05-admin-dashboard
plan: 06
title: "Lead List Page"
subsystem: frontend-admin
tags: [react, tanstack-query, tailwind, leads, filtering, pagination]
requires: [05-03, 05-04]
provides:
  - Lead types and API client with auth
  - useLeads and useFilters hooks
  - LeadCard, LeadGrid, LeadFilters, Pagination components
  - LeadsListPage with URL-persisted filters
affects: [05-07]
tech-stack:
  added:
    - "react-day-picker": "9.x"
  patterns:
    - "URL state for filters via useSearchParams"
    - "TanStack Query with keepPreviousData for pagination"
    - "Debounced search (300ms) before API call"
    - "Token getter singleton for API auth"
key-files:
  created:
    - admin/src/types/lead.ts
    - admin/src/api/client.ts
    - admin/src/api/leads.ts
    - admin/src/hooks/useDebouncedValue.ts
    - admin/src/hooks/useFilters.ts
    - admin/src/hooks/useLeads.ts
    - admin/src/components/ui/Badge.tsx
    - admin/src/components/ui/Pagination.tsx
    - admin/src/components/leads/LeadCard.tsx
    - admin/src/components/leads/LeadGrid.tsx
    - admin/src/components/leads/LeadFilters.tsx
    - admin/src/pages/LeadsListPage.tsx
  modified:
    - admin/src/App.tsx
    - admin/package.json
decisions:
  - id: token-getter-singleton
    choice: "Singleton pattern for token getter function"
    rationale: "API client needs auth token but can't use hooks directly; setTokenGetter called from component"
  - id: cursor-pagination
    choice: "Cursor-based pagination in API, page numbers in UI"
    rationale: "Backend uses cursor for DynamoDB, frontend abstracts to page numbers for UX"
  - id: multi-select-dropdowns
    choice: "Custom MultiSelect component with checkboxes"
    rationale: "Native select doesn't support multi-select well; custom provides better UX"
metrics:
  duration: "8 minutes"
  completed: "2026-01-24"
---

# Phase 05 Plan 06: Lead List Page Summary

**One-liner:** Lead list page with responsive card grid, status/temperature badges, URL-persisted filters, and pagination

## What Was Built

### Task 1: Types and API Client
Created the data layer for lead management:
- `types/lead.ts`: Lead, Note, LeadsResponse, User types matching backend schema
- `api/client.ts`: fetchWithAuth wrapper with token injection via singleton
- `api/leads.ts`: leadsApi (list, get, update, notes) and usersApi functions
- Installed react-day-picker for date range filtering

### Task 2: Hooks
Built the state management hooks:
- `useDebouncedValue.ts`: Generic debounce hook (300ms for search)
- `useFilters.ts`: URL-persisted filter state via useSearchParams
  - Supports: search, status[], temperature[], assignee, dateFrom, dateTo, page
  - Resets to page 1 on filter change
  - clearFilters() and hasActiveFilters helper
- `useLeads.ts`: TanStack Query hook with:
  - Debounced search before API call
  - keepPreviousData for smooth pagination
  - 15 leads per page
- `useUsers.ts`: Fetches Cognito users for assignee dropdown (30min stale time)

### Task 3: UI Components
Created the visual layer:
- **Badge.tsx**: Colored badges for status (blue/yellow/purple/green/gray variants)
- **Pagination.tsx**: Page numbers with prev/next, "Showing X of Y" text
- **LeadCard.tsx**: Card with:
  - Status-colored left border
  - Name, status badge, temperature flame icon (lucide-react)
  - Relative timestamp (date-fns formatDistanceToNow)
  - Clickable Link to /leads/{id}
  - Hover shadow effect
- **LeadGrid.tsx**: Responsive grid (1/2/3 columns) with empty state
- **LeadFilters.tsx**: Horizontal filter bar with:
  - Search input with icon
  - Status multi-select dropdown
  - Temperature multi-select dropdown
  - Assignee dropdown (from useUsers)
  - Date range picker (react-day-picker)
  - Clear filters button
- **LeadsListPage.tsx**: Main page composing all components
  - Loading skeleton during initial fetch
  - Error message display
  - Token getter initialization from AuthContext

Updated App.tsx to route /leads to LeadsListPage.

## Verification Results

All checks passed:
1. TypeScript compiles without errors (`npx tsc --noEmit`)
2. Production build succeeds (450KB JS, 29KB CSS)
3. Dev server starts on port 5174/5175
4. LeadCard contains Flame icon from lucide-react
5. LeadGrid uses responsive grid-cols-1 md:grid-cols-2 lg:grid-cols-3
6. useFilters uses useSearchParams from react-router
7. useLeads uses useDebouncedValue with 300ms delay

## Commits

| Commit | Message |
|--------|---------|
| 8286cfa | feat(05-06): add lead types and API client with auth |
| 98ea235 | feat(05-06): add hooks for leads and filters |
| d132d81 | feat(05-06): add lead list page with cards, filters, and pagination |

## Files Changed

**Created (12 files):**
- `admin/src/types/lead.ts`
- `admin/src/api/client.ts`
- `admin/src/api/leads.ts`
- `admin/src/hooks/useDebouncedValue.ts`
- `admin/src/hooks/useFilters.ts`
- `admin/src/hooks/useLeads.ts`
- `admin/src/components/ui/Badge.tsx`
- `admin/src/components/ui/Pagination.tsx`
- `admin/src/components/leads/LeadCard.tsx`
- `admin/src/components/leads/LeadGrid.tsx`
- `admin/src/components/leads/LeadFilters.tsx`
- `admin/src/pages/LeadsListPage.tsx`

**Modified (2 files):**
- `admin/src/App.tsx`: Import and route LeadsListPage
- `admin/package.json`: Added react-day-picker dependency

## Deviations from Plan

None - plan executed exactly as written.

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Token getter singleton pattern | API client module can't use React hooks; component initializes via setTokenGetter |
| Custom MultiSelect component | Native HTML select doesn't support multiple selection well |
| react-day-picker for date range | Per RESEARCH.md recommendation, better accessibility than alternatives |
| Loading skeleton pattern | Shows structure while loading, better UX than spinner |

## Next Phase Readiness

**Ready for Plan 05-07:** Lead detail page with:
- Single lead fetch via leadsApi.get()
- Status/temperature/assignee inline editing via leadsApi.update()
- Notes timeline with add/edit via leadsApi.addNote/updateNote
- Navigation back to list preserving filters

**Configuration for testing:**
- Requires valid VITE_API_ENDPOINT and VITE_COGNITO_* env vars
- Login with admin@tropicoretreat.com credentials
- API returns leads from DynamoDB via GET /leads endpoint

---

*Completed: 2026-01-24*
