---
phase: 05-admin-dashboard
plan: 04
title: "Admin Dashboard Scaffold"
subsystem: frontend-admin
tags: [react, vite, cognito, tanstack-query, tailwind]
requires: [04-01, 04-02]
provides:
  - Admin React app with Vite and TypeScript
  - Cognito authentication context and hooks
  - Login page with new password challenge support
  - Protected app shell with header and sign out
  - TanStack Query client configuration
  - Placeholder routes for leads pages
affects: [05-05, 05-06]
tech-stack:
  added:
    - "@tanstack/react-query": "5.x"
    - "react-router": "7.x"
    - "amazon-cognito-identity-js": "6.x"
    - "date-fns": "4.x"
    - "lucide-react": "0.x"
    - "tailwindcss": "4.x"
  patterns:
    - "AuthContext with Cognito USER_SRP_AUTH flow"
    - "Protected routes via AppShell redirect"
    - "TanStack QueryClientProvider at app root"
key-files:
  created:
    - admin/src/lib/cognito.ts
    - admin/src/lib/queryClient.ts
    - admin/src/contexts/AuthContext.tsx
    - admin/src/hooks/useAuth.ts
    - admin/src/pages/LoginPage.tsx
    - admin/src/components/layout/AppShell.tsx
  modified:
    - admin/src/App.tsx
    - admin/src/index.css
    - admin/vite.config.ts
    - .gitignore
decisions:
  - id: cognito-identity-js
    choice: "amazon-cognito-identity-js over Amplify"
    rationale: "Works with Terraform-managed pools, smaller bundle, no CLI dependency"
  - id: vite-port-5174
    choice: "Dev server on port 5174"
    rationale: "Different from frontend marketing site on 5173"
  - id: tailwind-v4
    choice: "Tailwind CSS v4 with @import directive"
    rationale: "Modern PostCSS integration, smaller bundle"
  - id: new-password-flow
    choice: "Handle newPasswordRequired in AuthContext"
    rationale: "Support first-time login after admin creates user"
metrics:
  duration: "15 minutes"
  completed: "2026-01-24"
---

# Phase 05 Plan 04: Admin Dashboard Scaffold Summary

**One-liner:** Vite React app with Cognito auth via amazon-cognito-identity-js, TanStack Query, and Tailwind CSS

## What Was Built

### Task 1: Vite React App with Dependencies
Created the admin dashboard foundation:
- Initialized Vite React TypeScript project in `admin/` directory
- Installed core dependencies: @tanstack/react-query, react-router, amazon-cognito-identity-js
- Installed utilities: date-fns for timestamps, lucide-react for icons
- Configured Tailwind CSS v4 with PostCSS
- Set dev server to port 5174 (distinct from frontend at 5173)
- Created `.env.example` with Cognito and API endpoint templates
- Updated root `.gitignore` for `.env` and `node_modules`

### Task 2: Auth Context and Cognito Integration
Built complete authentication layer:
- `lib/cognito.ts`: CognitoUserPool configuration with env validation
- `contexts/AuthContext.tsx`: Full auth state management with:
  - `signIn()`: USER_SRP_AUTH flow with email/password
  - `signOut()`: Global sign out with session invalidation
  - `getAccessToken()`: Auto-refreshing token retrieval for API calls
  - `completeNewPassword()`: Handle first-time password change
  - Session persistence check on mount
- `hooks/useAuth.ts`: Re-exported hook for convenient access

### Task 3: Login Page and Protected App Shell
Created the UI layer:
- `pages/LoginPage.tsx`: Tailwind-styled login form with:
  - Email and password inputs
  - Error display for failed logins
  - Loading state during authentication
  - New password form when `newPasswordRequired` triggered
  - Password confirmation validation
- `components/layout/AppShell.tsx`: Protected wrapper with:
  - Header with "Tropico Retreats" branding
  - User email display
  - Sign out button with logout icon
  - Redirect to `/login` when unauthenticated
  - Loading state during session check
- `App.tsx`: Router configuration with:
  - QueryClientProvider and AuthProvider wrappers
  - BrowserRouter with public `/login` route
  - Protected routes under AppShell: `/leads`, `/leads/:id`
  - Root redirect to `/leads`
- `lib/queryClient.ts`: TanStack Query configuration with:
  - 5-minute stale time
  - 30-minute garbage collection
  - Single retry on failure
  - Refetch on window focus

## Verification Results

All checks passed:
1. `npm run dev` starts server on port 5174
2. `npm run build` produces 352KB JS bundle, 10KB CSS
3. TypeScript compiles without errors
4. Tailwind CSS classes apply correctly

## Commits

| Commit | Message |
|--------|---------|
| b30ce51 | feat(05-04): create Vite React admin app with dependencies |
| fc4cc08 | feat(05-04): add Cognito auth context and hooks |
| a07f2a6 | feat(05-04): add login page and protected app shell |

## Files Changed

**Created (12 files):**
- `admin/package.json`, `admin/package-lock.json`
- `admin/vite.config.ts`, `admin/tailwind.config.ts`, `admin/postcss.config.js`
- `admin/tsconfig.json`, `admin/tsconfig.app.json`, `admin/tsconfig.node.json`
- `admin/index.html`, `admin/.env.example`
- `admin/src/lib/cognito.ts`, `admin/src/lib/queryClient.ts`
- `admin/src/contexts/AuthContext.tsx`, `admin/src/hooks/useAuth.ts`
- `admin/src/pages/LoginPage.tsx`, `admin/src/components/layout/AppShell.tsx`

**Modified (3 files):**
- `admin/src/App.tsx`: Complete rewrite with routing and providers
- `admin/src/index.css`: Replaced with Tailwind import
- `.gitignore`: Added .env and node_modules

## Deviations from Plan

None - plan executed exactly as written.

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Use `type` imports for CognitoUserSession | Required by verbatimModuleSyntax in tsconfig |
| Tailwind v4 `@import` syntax | Modern CSS-based configuration, cleaner output |
| User object with email and sub | Minimal user info from ID token for display and API correlation |

## Next Phase Readiness

**Ready for Plan 05-05:** The app shell and auth context are in place. Next plan can:
- Create lead list page at `/leads` route
- Use `useAuth().getAccessToken()` for authenticated API calls
- Implement TanStack Query hooks for lead fetching
- Build lead cards per CONTEXT.md specifications

**Configuration for testing:**
- Environment variables in `admin/.env` (already gitignored)
- Test login with admin@tropicoretreat.com credentials
- API endpoint: https://u57cra1p8h.execute-api.us-east-1.amazonaws.com

---

*Completed: 2026-01-24*
