# Codebase Concerns

**Analysis Date:** 2026-01-22

## Exposed Secrets

**Credentials committed to .env file:**
- Issue: Production credentials (Stripe live key, Auth tokens, client secrets) are stored in `.env` and tracked in git
- Files: `frontend/.env`
- Impact: Anyone with access to git history can retrieve live API keys and authentication tokens, enabling unauthorized payments, account access, and service impersonation
- Fix approach: Remove `.env` from git history using `git filter-branch` or similar tools, move credentials to environment variables managed by CI/CD platform or deployment infrastructure, add `.env` to `.gitignore`

**Client secrets exposed in source code:**
- Issue: `AUTH_CLIENT_SECRET` is embedded in front-end `.env` file
- Files: `frontend/.env`, `frontend/src/env.ts`
- Impact: Client secrets should never be exposed in browser-accessible code; front-end should only use public keys
- Fix approach: Move all secret-based auth to backend API calls, keep only public identifiers (client ID, domain) in frontend, implement secure token exchange flow

## Insecure ID Generation

**Math.random() used for toast IDs:**
- Issue: Toast notifications use `Math.random().toString(36).substring(2, 9)` for unique IDs
- Files: `frontend/src/components/Toast.tsx:31`
- Impact: Not cryptographically secure; could cause ID collisions with concurrent toasts, enabling state confusion or race conditions
- Fix approach: Use `crypto.randomUUID()` or a UUID library like `uuid` package

## Missing Test Coverage

**Only 1 test file in entire codebase:**
- Issue: Single placeholder test exists: `frontend/src/index.test.ts` contains only `expect(true).toBe(true)`
- Files: `frontend/src/index.test.ts`
- Impact: No automated verification of component behavior, regressions undetected, refactoring risk is high
- Priority: High
- Fix approach: Add unit tests for critical components (Toast, CookieConsent, Navigation), add integration tests for routing and SEO, configure coverage thresholds (minimum 60-70%)

**Untested areas:**
- Navigation state and route transitions
- Cookie consent persistence and localStorage interaction
- Toast notification lifecycle and auto-dismiss timing
- SEO component schema generation and rendering
- Form submissions in ContactPage
- Responsive design breakpoints

## Large Component Files

**Monolithic page components:**
- Issue: Landing page is 999 lines, destination pages 314 lines each, creating difficult-to-maintain single-responsibility violation
- Files: `frontend/src/Routes/LandingPage.tsx` (999 lines), `frontend/src/pages/destinations/CaribbeanPage.tsx` (314 lines), `frontend/src/pages/destinations/CasanarePage.tsx` (314 lines), `frontend/src/pages/destinations/CoffeeRegionPage.tsx` (314 lines)
- Impact: Hard to test, modify, or reuse sections; increased cognitive load during development; performance implications from monolithic rendering
- Fix approach: Extract sub-components (Hero, Services, FAQ sections) into separate files; create reusable destination card components; move FAQItem into separate component

## Hardcoded Configuration

**Business configuration embedded in components:**
- Issue: Phone numbers, WhatsApp messages, site URLs, image paths hardcoded in component files
- Files: `frontend/src/components/WhatsAppButton.tsx:10-11`, `frontend/src/components/SEO.tsx:22-23`, `frontend/src/Routes/LandingPage.tsx:58-75`
- Impact: Requires code changes to update phone numbers, URLs, or messaging; inconsistency across deployment environments; no environment-specific configuration
- Fix approach: Create config file (e.g., `src/config.ts`) with all business constants, use environment variables for environment-specific values (URLs, API endpoints)

## Manual Timer Management Issues

**Multiple setTimeout instances without cleanup concerns:**
- Issue: CookieConsent, WhatsAppButton, and other components use setTimeout; potential for timer leaks if components unmount during timer execution
- Files: `frontend/src/components/CookieConsent.tsx:14-17`, `frontend/src/components/WhatsAppButton.tsx:20-28`
- Impact: Memory leaks, incorrect state updates after component unmounts ("Can't perform a React state update on an unmounted component")
- Current mitigation: useEffect cleanup functions properly clear timers
- Recommendations: Consider using custom hooks like `useTimeout` or `useInterval` to encapsulate timer logic and prevent mistakes

## Fragile localStorage Usage

**No fallback for localStorage failures:**
- Issue: CookieConsent relies on localStorage without error handling; localStorage can be unavailable in private browsing mode or blocked by browser settings
- Files: `frontend/src/components/CookieConsent.tsx:11, 22, 27`
- Impact: Code will fail silently; cookie consent preference won't persist; user experience degradation
- Safe modification: Wrap localStorage calls in try-catch blocks, provide fallback to in-memory state, detect and handle quota exceeded errors
- Test coverage: No tests for localStorage unavailability

**Window API dependencies:**
- Issue: Multiple components access `window` object directly (Navigation, env, ScrollToTop) without availability checks
- Files: `frontend/src/Navigation.tsx:27, 32`, `frontend/src/env.ts:25`, `frontend/src/components/ScrollToTop.tsx:8`
- Impact: Will fail during server-side rendering or static pre-rendering if attempted
- Current workaround: Prerenderer uses Puppeteer for SSG; but this approach is fragile
- Recommendation: Wrap window access in `typeof window !== 'undefined'` checks

## Pre-rendering Complexity

**Puppeteer-based pre-rendering with hardcoded routes:**
- Issue: Static site generation relies on pre-rendering specific routes via Puppeteer; adding new routes requires script modification
- Files: `frontend/scripts/prerender.js:8-19`
- Impact: Easy to miss new routes during deployment; inconsistent cache busting ("Wait 10 seconds" is fragile timing)
- Scaling concern: Prerenderer depends on timing assumptions; if page takes >2 seconds to load, prerendering may capture incomplete HTML
- Fix approach: Migrate to framework-based SSG (Next.js, Astro) or implement route discovery mechanism

**Arbitrary timing assumptions in prerender:**
- Issue: Script includes hardcoded `sleep 10` before CloudFront invalidation; timing not validated
- Files: `infra/cloudfront.tf:17-19`, `frontend/scripts/prerender.js:29`
- Impact: Race conditions possible if distribution takes longer to become ready; cache staleness if sleep is insufficient

## Environment-Specific Deployment Issues

**No environment separation:**
- Issue: Same build artifact deployed to production; Stripe live key and Auth credentials are production-only
- Files: `frontend/.env`
- Impact: No development/staging environment support; risky to test payment flows locally; credential rotation requires code changes
- Fix approach: Use environment variables injected at deploy time via CI/CD; separate dev/staging/prod .env files (gitignored); implement feature flags for payment testing

## Bundle Configuration Warnings

**Webpack config may have inefficient settings:**
- Issue: `maxInitialRequests: 25` is high; could load too many small files in parallel
- Files: `frontend/config/webpack/webpack.config.ts:46`
- Impact: Performance impact on initial page load; slower LCP (Largest Contentful Paint)
- Recommendation: Monitor bundle analysis output, reduce to 15-20, test Core Web Vitals

**ES6 target compatibility:**
- Issue: TypeScript targets ES6 but Webpack and Babel also target ES2020
- Files: `frontend/tsconfig.json:3`, `frontend/config/webpack/webpack.config.ts:74`
- Impact: Inconsistent transpilation; potential for untranspiled ES2020 code to reach older browsers
- Fix approach: Standardize on single target (ES2020 for modern browsers, or use browserslist with separate builds)

## SEO Constraints

**Hardcoded canonical URLs:**
- Issue: SEO component builds canonical URLs using hardcoded domain `https://tropicoretreat.com`
- Files: `frontend/src/components/SEO.tsx:23, 37`
- Impact: Canonical URL is incorrect on staging/development deployments; may trigger duplicate content warnings for preview deployments
- Fix approach: Use environment-based domain configuration

**Image paths use /public/ prefix in JSX:**
- Issue: Hero and asset paths hardcoded with `/public/assets/landing-page/` prefix
- Files: `frontend/src/Routes/LandingPage.tsx:58-75`
- Impact: Webpack may not optimize these images; CDN/asset pipeline improvements difficult; images not hashed/versioned
- Fix approach: Use ES6 imports for all images, let Webpack handle asset pipeline

## Routing Edge Cases

**Fallback route maps unknown paths to landing page:**
- Issue: Catch-all route `<Route path="*" element={<LandingPage />} />` masks 404s
- Files: `frontend/src/Routes/router.tsx:30`
- Impact: User navigation to `/non-existent-page` silently redirects to homepage with no 404 feedback; poor UX; SEO implications (should return 404 status)
- Fix approach: Create explicit 404 page component, remove fallback, return proper 404 HTTP status for invalid routes

**Section scroll logic navigates to homepage first:**
- Issue: Navigation component has hardcoded redirect to home with anchor: `window.location.href = '/#${sectionId}'`
- Files: `frontend/src/components/Navigation.tsx:27`
- Impact: Navigating from `/about` to services section takes user to home page first, poor UX; history stack issues
- Fix approach: Check if on homepage first, use smooth scroll if present; implement proper section navigation without homepage redirect

## Accessibility Concerns

**Toast auto-dismiss without user control:**
- Issue: Toasts auto-dismiss after 5 seconds regardless of user focus or interaction
- Files: `frontend/src/components/Toast.tsx:35-37`
- Impact: Users with slow reading speed miss important messages; no way to extend dismiss time
- Recommendation: Keep toast visible until user explicitly dismisses or focus is lost; implement pause-on-hover behavior

**Cookie consent doesn't fully meet GDPR standards:**
- Issue: Cookie banner appears after 2-second delay without blocking interaction; "Decline" and "X" button have same effect
- Files: `frontend/src/components/CookieConsent.tsx:14-17, 22-29`
- Impact: User may click accept inadvertently before banner appears; "Decline" doesn't stop analytics if implemented
- Recommendation: Block page interaction until consent given, ensure "Decline" truly rejects all non-essential cookies

## Performance Issues

**IntersectionObserver threshold set to 0.18:**
- Issue: Custom reveal animation triggers when only 18% of element is visible
- Files: `frontend/src/Routes/LandingPage.tsx:49`
- Impact: May trigger animations too early, reducing perceived smoothness; inconsistent with standard animation trigger points
- Recommendation: Use 0.25+ for better UX; consider using Framer Motion or similar library

**Repeated DOM queries:**
- Issue: Components use `document.getElementById()` and `document.querySelector()` without caching
- Files: `frontend/src/Routes/LandingPage.tsx:243`, `frontend/src/components/Navigation.tsx:31`
- Impact: Unnecessary DOM reflows during scroll interactions; scroll performance degradation on large pages
- Fix approach: Cache element references in refs, debounce scroll handlers

## Styling Isolation Issues

**Inline styles in components:**
- Issue: Some components include inline `<style>` tags with custom keyframes
- Files: `frontend/src/components/WhatsAppButton.tsx:88-94`
- Impact: Style is tightly coupled to component; difficult to maintain consistent animations; potential for name collisions if multiple components define same animation
- Fix approach: Move all styles to CSS modules or tailwind.config.js, use Tailwind's animation utilities

## Configuration Management

**Local configuration files:**
- Status: Project uses local configuration files for Jest, Prettier, and ESLint
- Files: `frontend/jest.config.js`, `frontend/.prettierrc.js`, `frontend/eslint.config.mjs`
- Benefit: No external dependencies, all configuration is self-contained

## Missing Error Boundaries

**No error boundaries in React tree:**
- Issue: No React ErrorBoundary components to catch rendering errors
- Files: `frontend/src/App.tsx`
- Impact: Single component error crashes entire application; poor user experience in production
- Recommendation: Add ErrorBoundary around major sections, log errors to monitoring service

## Static HTML Generation Risks

**Prerender script lacks error recovery:**
- Issue: If Puppeteer rendering fails for one route, entire script exits with error; no partial success handling
- Files: `frontend/scripts/prerender.js:38-59`
- Impact: Failed build prevents deployment even if most routes render successfully
- Fix approach: Implement per-route error handling, collect and report failures separately

---

*Concerns audit: 2026-01-22*
