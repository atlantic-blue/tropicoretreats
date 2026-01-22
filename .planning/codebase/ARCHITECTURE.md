# Architecture

**Analysis Date:** 2026-01-22

## Pattern Overview

**Overall:** Client-Side React SPA (Single Page Application) with Static Pre-Rendering

**Key Characteristics:**
- React 19 + TypeScript 5.8 frontend (no backend API currently)
- Client-side routing via React Router v7
- Static site generation with Webpack + Prerenderer for SEO
- Tailwind CSS v4 for styling with custom design system
- Context API for state management (Toast notifications, routing)
- No server-side backend logic (marketing site focused)

## Layers

**Presentation Layer:**
- Purpose: Render UI components and handle user interactions
- Location: `src/components/`, `src/pages/`, `src/Routes/`
- Contains: React functional components, page components, layout components
- Depends on: React, React Router, Tailwind CSS, Lucide icons
- Used by: Entry point (`src/index.tsx`), routing system

**Routing & Navigation Layer:**
- Purpose: Manage application routes, navigation state, and page transitions
- Location: `src/Routes/router.tsx`, `src/Routes/appRoutes.tsx`
- Contains: Route configuration, enum-based route definitions, route helper methods
- Depends on: React Router v7
- Used by: App component, Navigation component, internal links

**Layout/Shell Layer:**
- Purpose: Provide consistent application wrapper and shared UI chrome
- Location: `src/App.tsx`, `src/components/Navigation.tsx`, `src/components/Footer.tsx`
- Contains: Provider wrappers, persistent navigation, footer
- Depends on: React Router, React Helmet, Toast provider
- Used by: All pages and routes

**Styling & Design System Layer:**
- Purpose: Define application design tokens and Tailwind utilities
- Location: `src/styles/main.css`, `tailwind.config.js`
- Contains: CSS custom properties, Tailwind component utilities, typography layers
- Depends on: Tailwind CSS, PostCSS
- Used by: All components via Tailwind classes

**Configuration & Environment Layer:**
- Purpose: Centralize environment variables and configuration
- Location: `src/env.ts`
- Contains: Auth configuration (domain, URLs, client ID/secret), Stripe payment key
- Depends on: process.env, browser window object
- Used by: Any component needing external service configuration

## Data Flow

**Page Navigation Flow:**

1. User clicks navigation link or direct URL
2. React Router matches route against `Routes` enum in `src/Routes/appRoutes.tsx`
3. Router component (`src/Routes/router.tsx`) renders matching page component
4. Navigation component (`src/components/Navigation.tsx`) updates active state based on `useLocation()`
5. ScrollToTop component resets scroll position on route change
6. Page metadata (SEO) updated via React Helmet in page component

**User Interaction Flow (Toast Example):**

1. Component calls `useToast()` hook from Toast context
2. `showToast(type, title, message)` invoked
3. ToastProvider updates internal state with new toast
4. Toast automatically removed after 5 seconds via setTimeout
5. User can manually dismiss via close button
6. Toast container renders fixed position notification in DOM

**SEO Flow (Pre-rendering):**

1. Page component includes SEO component wrapping Helmet tags
2. At build time, Prerenderer visits each route and captures HTML
3. Webpack bundles React + page components into script files
4. `npm postbuild` runs prerender.js to generate static HTML files
5. CloudFront serves pre-rendered HTML to search engines/users

**State Management:**

- **Route State:** Managed by React Router (location, pathname)
- **UI State:** Managed locally in components via useState (mobile menu, scroll detection)
- **Global State:** Toast notifications via Context API (`ToastContext`)
- **Environment Config:** Singleton pattern in `src/env.ts`, imported where needed
- **No Redux/Zustand:** Simple context API sufficient for current needs

## Key Abstractions

**Routes Enum:**
- Purpose: Centralize route path strings to avoid magic strings
- Location: `src/Routes/appRoutes.tsx`
- Pattern: TypeScript enum + class helper methods for accessing routes
- Usage: `appRoutes.getHomeRoute()` returns `Routes.HOME` ("/")
- Benefits: Type-safe route references, single source of truth

**AppRoutes Class:**
- Purpose: Provide semantic methods for accessing application routes
- Location: `src/Routes/appRoutes.tsx`
- Pattern: Singleton instance exported as `appRoutes`
- Methods: `getHomeRoute()`, `getAboutRoute()`, `getCaribbeanRoute()`, etc.
- Used by: Navigation component, footer links, internal routing

**SEO Component:**
- Purpose: Abstract React Helmet usage and provide reusable SEO wrapper
- Location: `src/components/SEO.tsx`
- Pattern: TypeScript interface props with sensible defaults
- Provides: Meta tags, Open Graph tags, Twitter cards, canonical URLs, structured data (JSON-LD)
- Schema helpers: `localBusinessSchema`, `faqSchema` exported for use in pages

**Toast System:**
- Purpose: Provide application-wide toast notifications without external libraries
- Location: `src/components/Toast.tsx`
- Pattern: Context provider + custom hook (`useToast`)
- Provides: Type-safe toast display (success/error/info), auto-dismiss after 5 seconds, manual dismiss

**Reveal Hook:**
- Purpose: Trigger animations when elements come into view
- Location: `src/Routes/LandingPage.tsx` (useReveal function)
- Pattern: Custom hook using IntersectionObserver
- Parameters: Generic type T extends HTMLElement, threshold: 0.18
- Returns: {ref, shown} to enable show/hide animations

## Entry Points

**Application Root:**
- Location: `src/index.tsx`
- Triggers: Initial page load by browser
- Responsibilities: Mount React application to DOM (#root element), render App component, strict mode enabled

**App Component:**
- Location: `src/App.tsx`
- Triggers: Called by ReactDOM during initialization
- Responsibilities: Wrap entire app with providers (Helmet, Toast, Router), render persistent layout (Navigation, Footer), render route-specific content

**Page Components:**
- Location: `src/pages/*.tsx`, `src/Routes/LandingPage.tsx`
- Examples: `AboutPage.tsx`, `ContactPage.tsx`, `FAQsPage.tsx`, destination pages
- Trigger: Router match via React Router
- Responsibilities: Render page-specific content, include SEO metadata, manage page-level state

## Error Handling

**Strategy:** Client-side error logging only (no centralized error service)

**Patterns:**

- **React Error Boundaries:** Not currently implemented; app will crash on unhandled errors
- **Navigation Fallback:** React Router configured with wildcard route `*` that redirects to landing page
- **Environment Validation:** `src/env.ts` checks for required env vars, warns if missing (no hard fail)
- **Try-Catch:** Not observed in codebase; assumed errors propagate to top level
- **Toast for User Feedback:** Components use Toast context to display user-facing messages

**Recommended:** Implement React Error Boundary at App level to gracefully handle component errors without full app crash.

## Cross-Cutting Concerns

**Logging:**
- No dedicated logging framework
- Components use console statements in development
- Minified build removes console logs via Terser plugin (`drop_console: true`)
- Recommendation: Add client-side error tracking service (Sentry) for production

**Validation:**
- Form inputs in ContactPage likely validated on change/submit (no validation library observed)
- Page metadata validated in SEO component (defaults provided for all props)
- Environment variables checked in env.ts (missing vars become empty strings)

**Authentication:**
- Configured in `src/env.ts` with Auth0-like provider (baseUrl, logInUrl, logOutUrl, clientId, clientSecret)
- Not actively used on frontend (no login/logout UI visible)
- Callback URL set to `${window.location.origin}/callback/` for OAuth redirect
- No protected routes or role-based access control implemented

**Performance:**
- Webpack code splitting: separate bundles for React, Lucide icons, vendors
- Lazy loading via Webpack chunks for routes (configuration not visible in router)
- Image optimization: WebP format used for landing page assets
- CSS minification: CssMinimizerPlugin in production build
- JS minification: TerserPlugin removes comments, mangling enabled

**Responsive Design:**
- Mobile-first approach via Tailwind breakpoints (sm, md, lg, xl)
- Navigation component has mobile menu with automatic close on route change
- Viewport-based styling (dvh units for dynamic viewport height)
- Touch-friendly interactive elements

---

*Architecture analysis: 2026-01-22*
