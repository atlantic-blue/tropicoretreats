# Codebase Structure

**Analysis Date:** 2026-01-22

## Directory Layout

```
tropicoretreats/
├── frontend/                      # Main React application
│   ├── src/                       # Source code
│   │   ├── components/            # Reusable UI components
│   │   ├── pages/                 # Full-page components
│   │   │   └── destinations/      # Destination-specific pages
│   │   ├── Routes/                # Routing and router configuration
│   │   ├── styles/                # Global CSS and design tokens
│   │   ├── env.ts                 # Environment configuration
│   │   ├── App.tsx                # Root app component with providers
│   │   └── index.tsx              # Entry point
│   ├── config/                    # Build configuration
│   │   └── webpack/               # Webpack configuration modules
│   ├── public/                    # Static assets
│   │   └── assets/                # Images (WebP, JPG, SVG)
│   ├── dist/                      # Built output (generated)
│   ├── tests/                     # Test setup configuration
│   ├── scripts/                   # Build scripts
│   │   └── prerender.js           # Static HTML pre-rendering script
│   ├── package.json               # Dependencies and scripts
│   ├── tsconfig.json              # TypeScript configuration
│   ├── webpack.config.ts          # Webpack entry point
│   ├── jest.config.js             # Jest testing configuration
│   ├── eslint.config.mjs          # ESLint configuration
│   ├── .prettierrc.js             # Prettier configuration
│   ├── tailwind.config.js         # Tailwind CSS configuration
│   └── postcss.config.js          # PostCSS configuration
├── backend/                       # Backend (placeholder, empty)
├── infra/                         # Infrastructure as Code (Terraform)
│   ├── main.tf
│   ├── s3.tf
│   ├── cloudfront.tf
│   ├── route53.tf
│   ├── acm.tf
│   └── terraform.tfvars
├── .planning/                     # GSD planning documents
│   └── codebase/                  # Codebase analysis documents
├── .git/                          # Git repository
├── .gitignore                     # Git ignore rules
└── README.md                      # Project documentation
```

## Directory Purposes

**`frontend/src/`:**
- Purpose: All source TypeScript/React code for the application
- Contains: Components, pages, routing configuration, styles, environment setup
- Key files: `index.tsx` (entry), `App.tsx` (root component), `env.ts` (config)

**`frontend/src/components/`:**
- Purpose: Reusable, non-page-specific React components
- Contains: Layout components (Navigation, Footer), utility components (SEO, Toast, CookieConsent, ScrollToTop, WhatsAppButton)
- Pattern: Each component is a single file with `.tsx` extension
- Exports: Default export as React.FC (functional component with TypeScript)
- Files: `Navigation.tsx`, `Footer.tsx`, `Toast.tsx`, `SEO.tsx`, `CookieConsent.tsx`, `ScrollToTop.tsx`, `WhatsAppButton.tsx`

**`frontend/src/pages/`:**
- Purpose: Full-page components that map 1:1 to application routes
- Contains: Content-heavy page components (About, Services, Contact, FAQs, Privacy, Terms) + destinations subdirectory
- Pattern: Each page is a separate `.tsx` file, includes its own SEO metadata
- Files: `AboutPage.tsx`, `ContactPage.tsx`, `FAQsPage.tsx`, `PrivacyPage.tsx`, `ServicesPage.tsx`, `TermsPage.tsx`
- Subdirectory `destinations/` contains destination-specific pages: `CaribbeanPage.tsx`, `CasanarePage.tsx`, `CoffeeRegionPage.tsx`

**`frontend/src/Routes/`:**
- Purpose: Centralize routing configuration and route definitions
- Contains: Route enum, route helper class, router component
- Files:
  - `appRoutes.tsx`: Exports `Routes` enum (all route paths as string constants) and `appRoutes` singleton class with getter methods
  - `router.tsx`: React Router component that maps Routes to page components
  - `LandingPage.tsx`: Home page component (separate from pages/ due to size and complexity)

**`frontend/src/styles/`:**
- Purpose: Global CSS and design system tokens
- Contains: Main CSS file with Tailwind directives, CSS custom properties, component utilities
- Files: `main.css` (primary stylesheet)
- Imports Tailwind base/components/utilities, defines --font-serif, --font-sans, --color-gold, --color-emerald variables
- Extends Tailwind with custom component utilities (font-serif, font-sans, text-gold, etc.)

**`frontend/config/webpack/`:**
- Purpose: Modular Webpack configuration split for maintainability
- Contains: Main config + utility functions + loader rules
- Files:
  - `webpack.config.ts`: Main configuration factory that receives build arguments
  - `webpack.client.config.ts`: Client-specific configuration
  - `utils/createWebpackEnv.ts`: Environment creation (dev vs prod detection)
  - `utils/createWebpackPlugins.ts`: Plugin instantiation (HTML, CSS extraction, minification, etc.)
  - `utils/createWebpackPaths.ts`: Path resolution for src/dist/build directories
  - `rules/jsRules.ts`: TypeScript/Babel loader configuration
  - `rules/cssRule.ts`: CSS/SCSS loader configuration
  - `types.ts`: TypeScript interfaces for Webpack arguments

**`frontend/public/`:**
- Purpose: Static assets served directly without processing
- Contains: Images for landing page in webp and jpg formats
- Subdirectory: `public/assets/landing-page/` holds hero, destination, service, and footer images
- Build behavior: Copied to dist/ during build via copy-webpack-plugin

**`frontend/dist/`:**
- Purpose: Build output directory (generated, not committed)
- Contains: Compiled JavaScript bundles (js/), CSS files, pre-rendered HTML, copied assets
- Generated by: `npm run build` and `npm run postbuild` commands
- Structure: Mirrors src/ for dev traceability

**`frontend/tests/`:**
- Purpose: Test setup and configuration
- Contains: `setupTests.ts` for Jest configuration
- Files: Minimal setup, actual tests co-located with source files

**`frontend/scripts/`:**
- Purpose: Build-time utility scripts
- Contains: Pre-rendering script for static HTML generation
- Files: `prerender.js` - runs Puppeteer-based prerenderer for SEO-friendly static HTML

**`infra/`:**
- Purpose: Infrastructure as Code for AWS deployment (Terraform)
- Contains: CloudFront, S3, Route53, ACM certificate configurations
- Handles: CDN distribution, static hosting, DNS, HTTPS

## Key File Locations

**Entry Points:**

- `frontend/src/index.tsx`: React application root, mounts React to #root DOM element, enables strict mode
- `frontend/public/index.html`: HTML shell (generated by html-webpack-plugin), contains #root element
- `frontend/webpack.config.ts`: Webpack entry point, imports and exports main webpack configuration

**Configuration:**

- `frontend/src/env.ts`: Application configuration (auth domain, API keys, Stripe key)
- `frontend/tsconfig.json`: TypeScript compiler options, path aliases (@/* → src/*)
- `frontend/tailwind.config.js`: Tailwind CSS customization
- `frontend/.env`: Environment variables (loaded by dotenv-webpack)
- `frontend/jest.config.js`: Jest testing framework configuration
- `frontend/eslint.config.mjs`: ESLint rules and parser configuration
- `frontend/.prettierrc.js`: Prettier code formatting rules

**Core Logic:**

- `frontend/src/App.tsx`: Root application component, wraps all pages with providers
- `frontend/src/Routes/router.tsx`: React Router configuration mapping routes to page components
- `frontend/src/Routes/appRoutes.tsx`: Centralized route definitions and helper methods
- `frontend/src/Routes/LandingPage.tsx`: Home page with hero, features, destinations, testimonials sections

**Components:**

- `frontend/src/components/Navigation.tsx`: Persistent header with mobile/desktop navigation
- `frontend/src/components/Footer.tsx`: Persistent footer with links and branding
- `frontend/src/components/SEO.tsx`: Reusable SEO component for meta tags, Open Graph, structured data
- `frontend/src/components/Toast.tsx`: Toast notification system via Context API
- `frontend/src/components/CookieConsent.tsx`: Cookie consent banner
- `frontend/src/components/ScrollToTop.tsx`: Scroll-to-top on route change
- `frontend/src/components/WhatsAppButton.tsx`: Floating WhatsApp contact button

**Pages:**

- `frontend/src/pages/AboutPage.tsx`: About/company page
- `frontend/src/pages/ContactPage.tsx`: Contact form page
- `frontend/src/pages/FAQsPage.tsx`: FAQs page
- `frontend/src/pages/ServicesPage.tsx`: Services listing page
- `frontend/src/pages/PrivacyPage.tsx`: Privacy policy page
- `frontend/src/pages/TermsPage.tsx`: Terms of service page
- `frontend/src/pages/destinations/CaribbeanPage.tsx`: Caribbean destination page
- `frontend/src/pages/destinations/CasanarePage.tsx`: Casanare destination page
- `frontend/src/pages/destinations/CoffeeRegionPage.tsx`: Coffee Region destination page

**Testing:**

- `frontend/src/index.test.ts`: Basic test example (placeholder)
- `frontend/tests/setupTests.ts`: Jest setup configuration

**Styling:**

- `frontend/src/styles/main.css`: Global styles, design system tokens, Tailwind directives
- `frontend/tailwind.config.js`: Tailwind configuration (plugins, theme, content paths)
- `frontend/postcss.config.js`: PostCSS configuration (autoprefixer, Tailwind)

## Naming Conventions

**Files:**

- **Page components:** PascalCase ending in `Page.tsx` (e.g., `AboutPage.tsx`, `ContactPage.tsx`)
- **Reusable components:** PascalCase ending in `.tsx` (e.g., `Navigation.tsx`, `Toast.tsx`)
- **Routes/routing:** `router.tsx` for router component, `appRoutes.tsx` for route definitions
- **Configuration:** camelCase with domain prefix (e.g., `webpack.config.ts`, `tailwind.config.js`, `jest.config.js`)
- **Utilities/helpers:** camelCase with `create` prefix if factory (e.g., `createWebpackEnv.ts`, `createWebpackPlugins.ts`)
- **Tests:** `.test.ts` or `.spec.ts` suffix (co-located with source)
- **Styles:** `main.css` for global, component-specific styles inline in JSX or in main.css layers

**Directories:**

- **Feature directories:** lowercase plural when grouping related files (e.g., `components/`, `pages/`, `styles/`)
- **Subdirectories:** lowercase by feature (e.g., `destinations/`, `webpack/`, `assets/`)
- **Config directories:** `config/` for build-time configuration, top-level config files for runtime

**Functions & Variables:**

- **React components:** PascalCase, exported as default, named as `ComponentName`
- **Hooks:** camelCase starting with `use` (e.g., `useToast`, `useReveal`, `useLocation`)
- **Constants:** SCREAMING_SNAKE_CASE for truly immutable values (e.g., `IMAGES`, `SITE_NAME`)
- **Enums:** PascalCase for enum name, SCREAMING_SNAKE_CASE for enum members (e.g., `Routes.HOME`, `Routes.ABOUT`)
- **Class methods:** camelCase getter methods (e.g., `getHomeRoute()`, `getAboutRoute()`)

**Types & Interfaces:**

- **Interfaces:** PascalCase ending in `Props` for component props (e.g., `SEOProps`)
- **Types:** PascalCase for custom types (e.g., `ToastType`, `WebpackArgs`)
- **Enums:** PascalCase (e.g., `Routes`)

## Where to Add New Code

**New Page/Route:**

1. Create page component in `frontend/src/pages/YourPage.tsx` (or `frontend/src/pages/category/YourPage.tsx` for categorized pages)
2. Add route to `Routes` enum in `frontend/src/Routes/appRoutes.tsx`:
   ```typescript
   export enum Routes {
     // ... existing routes
     YOUR_PAGE = '/your-page',
   }
   ```
3. Add getter method in `AppRoutes` class:
   ```typescript
   getYourPageRoute() {
     return Routes.YOUR_PAGE;
   }
   ```
4. Add `<Route>` entry in `frontend/src/Routes/router.tsx`:
   ```typescript
   <Route path={Routes.YOUR_PAGE} element={<YourPage />} />
   ```
5. Include SEO metadata in page component using `<SEO>` component
6. Add navigation link in `frontend/src/components/Navigation.tsx` navLinks array
7. Add footer link in `frontend/src/components/Footer.tsx` if needed

**New Reusable Component:**

1. Create component in `frontend/src/components/YourComponent.tsx`
2. Export as default React functional component: `export default YourComponent`
3. Use TypeScript: `const YourComponent: React.FC<Props> = () => { ... }`
4. Import and use in pages as needed: `import YourComponent from '../components/YourComponent'`

**New Utility/Helper:**

- Shared logic: `frontend/src/utils/` (create directory if doesn't exist)
- Custom hooks: `frontend/src/hooks/` (create directory if doesn't exist)
- Follow naming: `useCustomHook.ts` for hooks, `helperName.ts` for utilities

**Global Styles:**

- Add to `frontend/src/styles/main.css` in appropriate @layer (base, components, utilities)
- Use CSS custom properties defined in `:root` for design tokens
- Prefer Tailwind classes over custom CSS when possible

**Tests:**

- Co-locate tests next to source: `ComponentName.tsx` paired with `ComponentName.test.tsx`
- Use Jest + existing test setup in `frontend/tests/setupTests.ts`
- Import test utilities from `@testing-library/react`

**Environment Configuration:**

- Add to `src/env.ts` interface and createEnv function
- Load from `process.env.VARIABLE_NAME` (injected by dotenv-webpack)
- Document required env vars in `.env` example file

## Special Directories

**`frontend/.next/`:**
- Purpose: Not used (Next.js not in use)
- Status: Project uses Webpack, not Next.js

**`frontend/dist/`:**
- Purpose: Webpack build output
- Generated: By `npm run build` command
- Contents: Compiled JS bundles, CSS files, pre-rendered HTML, copied assets
- Committed: No (in .gitignore)
- Cleaned: Before each build (Webpack clean: true)

**`frontend/node_modules/`:**
- Purpose: Installed npm dependencies
- Generated: By `npm install` from package.json and package-lock.json
- Committed: No (in .gitignore)

**`frontend/.git/`:**
- Purpose: Git version control
- Contains: Repository history and configuration
- Committed: Yes (git metadata)

**`infra/.terraform/`:**
- Purpose: Terraform state and provider caches
- Generated: By `terraform init`
- Committed: No (in .gitignore typically, but visible in repo)

---

*Structure analysis: 2026-01-22*
