# Technology Stack

**Analysis Date:** 2026-01-22

## Languages

**Primary:**
- TypeScript 5.8.2 - Frontend SPA application and build configuration
- JavaScript (ES6+) - Build scripts and configuration files

**Secondary:**
- HCL (HashiCorp Configuration Language) - Infrastructure as Code with Terraform

## Runtime

**Environment:**
- Node.js 22.11.0 - JavaScript runtime for development and build processes

**Package Manager:**
- npm - Dependency management
- Lockfile: `package-lock.json` present in `frontend/` directory

## Frameworks

**Core:**
- React 19.0.0 - UI library and component framework
- React Router 7.9.4 - Client-side routing for single-page application
- React Helmet Async 2.0.5 - Head tag management for SEO and metadata

**Build/Dev:**
- Webpack 5.102.1 - Module bundler for development and production builds
- Webpack Dev Server 5.0.1 - Development server with hot module replacement
- Babel 7.x - JavaScript transpiler with React and TypeScript presets

**Styling:**
- Tailwind CSS 4.1.14 - Utility-first CSS framework
- Tailwind CSS Animate 1.0.7 - Animation utilities
- Class Variance Authority 0.7.1 - Variant management for components
- PostCSS 8.5.6 - CSS transformation tool

**Testing:**
- Jest 29.6.1 - Testing framework with TypeScript support
- Local Jest configuration in `frontend/jest.config.js`

**Code Quality:**
- ESLint 6.x - JavaScript linting (local configuration)
- Prettier 3.5.3 - Code formatter for consistent styling

**Prerendering:**
- @prerenderer/prerenderer 1.2.5 - Static HTML pre-rendering
- @prerenderer/renderer-puppeteer 1.2.4 - Headless browser rendering via Puppeteer
- Puppeteer 24.35.0 - Headless Chrome/Chromium automation

**Asset Management:**
- Copy Webpack Plugin 13.0.1 - Copy static assets to build output
- HTML Webpack Plugin 5.6.4 - Generate HTML files with bundled assets
- Mini CSS Extract Plugin 2.9.4 - Extract CSS into separate files
- CSS Loader 7.1.2 - Import CSS modules
- Sass 1.86.3 - CSS preprocessing
- Sass Loader 16.0.5 - Webpack loader for Sass compilation

**Optimization:**
- CSS Minimizer Webpack Plugin 7.0.2 - Minify CSS in production
- Terser Webpack Plugin 5.3.14 - Minify JavaScript in production
- Webpack Bundle Analyzer 4.10.2 - Visualize bundle composition

**Utilities:**
- clsx 2.1.1 - Conditional CSS class names
- tailwind-merge 3.2.0 - Smart Tailwind CSS class merging
- lucide-react 0.488.0 - Icon library with React components
- dotenv-webpack 8.1.1 - Load environment variables into Webpack build
- webpack-merge 6.0.1 - Merge Webpack configurations
- ts-loader 9.5.2 - TypeScript loader for Webpack
- ts-node 10.9.2 - TypeScript execution for Node.js
- autoprefixer 10.4.21 - PostCSS plugin to add vendor prefixes

## Key Dependencies

**Critical:**
- React & React Router - Core SPA framework and routing
- Webpack - Production build and development workflow
- TypeScript - Type safety and development experience
- Tailwind CSS - Styling system

**Infrastructure:**
- @prerenderer/prerenderer - Pre-renders static HTML for SEO and initial page load
- Puppeteer - Headless browser for pre-rendering
- dotenv-webpack - Loads environment variables into build process

## Configuration

**Environment:**
- Environment variables stored in `frontend/.env`
- Currently configured with:
  - `AUTH_DOMAIN` - Authentication service base URL (https://auth.tropicoretreat.com)
  - `AUTH_CLIENT_ID` - OAuth 2.0 client identifier
  - `AUTH_CLIENT_SECRET` - OAuth 2.0 client secret
  - `PAYMENTS_STRIPE_KEY` - Stripe publishable API key (pk_live_)

**Build:**
- `frontend/webpack.config.ts` - Main Webpack configuration
- `frontend/tsconfig.json` - TypeScript compiler configuration
- `frontend/jest.config.js` - Jest testing configuration
- `frontend/tailwind.config.js` - Tailwind CSS configuration
- `frontend/postcss.config.js` - PostCSS configuration
- `frontend/eslint.config.mjs` - ESLint configuration (local configuration)

## Platform Requirements

**Development:**
- Node.js v22.11.0 (specified in `.nvmrc`)
- npm for package management

**Production:**
- AWS S3 - Static site hosting via bucket `tropicoretreat.com`
- AWS CloudFront - Content delivery network (CDN)
- AWS Route53 - DNS management
- AWS ACM - SSL/TLS certificate management
- Terraform 1.x - Infrastructure provisioning and management

**Hosting:**
- Deployed as a static site on AWS
- Pre-rendered with Puppeteer for SEO optimization
- CDN with multi-tier caching strategy (1 year for assets, 1 hour for HTML)
- HTTPS enforced with redirect-to-https policy

---

*Stack analysis: 2026-01-22*
