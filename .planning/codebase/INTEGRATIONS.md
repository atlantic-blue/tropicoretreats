# External Integrations

**Analysis Date:** 2026-01-22

## APIs & External Services

**Authentication:**
- Custom OAuth 2.0 Provider
  - What it's used for: User authentication and authorization
  - Endpoint: `https://auth.tropicoretreat.com`
  - Auth: Environment variables `AUTH_CLIENT_ID`, `AUTH_CLIENT_SECRET`
  - Config file: `frontend/src/env.ts` contains auth configuration

**Payments:**
- Stripe - Payment processing for bookings and transactions
  - SDK: Native Stripe integration via environment variable
  - Publishable Key: `PAYMENTS_STRIPE_KEY` (pk_live_*)
  - Implementation: Environment configuration in `frontend/src/env.ts`

**Communication:**
- WhatsApp Business API
  - What it's used for: Customer support and inquiries
  - Integration: WhatsApp web link integration
  - Phone Number: +447806705494
  - Implementation: `frontend/src/components/WhatsAppButton.tsx` generates WhatsApp URLs

## Data Storage

**File Storage:**
- AWS S3 - Static file hosting and asset storage
  - Bucket: `tropicoretreat.com`
  - Provider: AWS CloudFormation via Terraform
  - Configuration: `infra/s3.tf`
  - Access Control: CloudFront Origin Access Identity (restricted public access)

**Caching:**
- AWS CloudFront - CDN with multi-tier caching strategy
  - Origin: S3 bucket `tropicoretreat.com`
  - Cache Policies:
    - **Short-term (HTML)**: 1 hour default TTL, 1 day max TTL
    - **Long-term (JS, CSS, images, fonts)**: 1 year TTL
  - Cache behaviors configured per file type:
    - `*.js` - Long cache
    - `*.css` - Long cache
    - `*.webp`, `*.jpg`, `*.png` - Long cache
    - `*.woff2` - Long cache for fonts
  - Configuration: `infra/cloudfront.tf`

**Databases:**
- Not applicable - This is a static/pre-rendered site

## Authentication & Identity

**Auth Provider:**
- Custom OAuth 2.0 Service
  - Implementation: OAuth 2.0 with client credentials flow
  - Base URL: `https://auth.tropicoretreat.com`
  - Login endpoint: `${AUTH_DOMAIN}/login`
  - Logout endpoint: `${AUTH_DOMAIN}/logout`
  - Callback URL: `${window.location.origin}/callback/`
  - Configuration file: `frontend/src/env.ts` lines 1-37

## Monitoring & Observability

**Error Tracking:**
- Not detected - No explicit error tracking service integrated

**Logs:**
- Console logging with Webpack optimization
  - Production builds drop console statements (Terser plugin configuration)
  - Development builds retain console logs for debugging
  - Configuration: `frontend/config/webpack/webpack.config.ts` lines 80-82

## CI/CD & Deployment

**Hosting:**
- AWS S3 + CloudFront - Static site hosting on AWS
  - Domain: `tropicoretreat.com` (alias in CloudFront)
  - SSL/TLS: AWS Certificate Manager (ACM)
  - DNS: AWS Route53

**Infrastructure as Code:**
- Terraform 1.x
  - Provider: AWS
  - Configuration location: `infra/` directory
  - Resources managed:
    - S3 bucket with restricted public access
    - CloudFront distribution with origin access identity
    - ACM certificate for HTTPS
    - Route53 DNS records
  - Variables: `infra/_vars.tf` with configurable AWS account and region

**Build Pipeline:**
- Post-build step: Puppeteer pre-rendering
  - Script: `frontend/scripts/prerender.js`
  - Command: `npm run postbuild` (runs after `npm run build`)
  - Pre-renders 10 static routes for SEO optimization:
    - `/`
    - `/about`
    - `/services`
    - `/faqs`
    - `/contact`
    - `/privacy`
    - `/terms`
    - `/destinations/caribbean`
    - `/destinations/casanare`
    - `/destinations/coffee-region`

**Build Commands:**
```bash
npm run dev              # Development server on port 3000 with hot reload
npm run build            # Production build with Webpack
npm run postbuild        # Pre-render static HTML with Puppeteer
npm run lint            # ESLint code checking
npm run lint:fix        # Fix ESLint violations
npm run test            # Jest unit tests
npm run test:watch      # Jest in watch mode
npm run test:coverage   # Jest with coverage report
```

## Environment Configuration

**Required env vars:**
- `AUTH_DOMAIN` - Authentication service URL (https://auth.tropicoretreat.com)
- `AUTH_CLIENT_ID` - OAuth 2.0 client identifier
- `AUTH_CLIENT_SECRET` - OAuth 2.0 client secret
- `PAYMENTS_STRIPE_KEY` - Stripe publishable API key (pk_live_*)
- `NODE_ENV` - Set to 'development' or 'production' during build

**Secrets location:**
- `frontend/.env` - Local environment configuration (not committed)
- Loaded into build via `dotenv-webpack` plugin
- Frontend access via `process.env.*` in source code and `frontend/src/env.ts`

## Webhooks & Callbacks

**Incoming:**
- OAuth callback endpoint: `${window.location.origin}/callback/` (implied by `frontend/src/env.ts` line 25)
- No explicit webhook endpoints detected

**Outgoing:**
- None detected - Static site does not make outbound webhook calls

## Contact Integration

**Manual Contact Methods:**
- Email: `hello@tropicoretreats.com`
- Phone: `+447806705494`
- WhatsApp: `https://wa.me/447806705494`
- Implementation: Direct links in `frontend/src/components/Footer.tsx` and `frontend/src/components/WhatsAppButton.tsx`

## SEO & Metadata

**Open Graph & Social Meta:**
- Configured via `frontend/src/components/SEO.tsx`
- Structured data for:
  - Local Business schema (TravelAgency type)
  - FAQ page schema
  - Offer catalog schema
- Meta tags for Twitter Cards, Open Graph, geo-location

**Pre-rendering:**
- All 10 routes are pre-rendered at build time
- HTML files stored in S3 and served via CloudFront
- Allows search engines to crawl static HTML without JavaScript execution

---

*Integration audit: 2026-01-22*
