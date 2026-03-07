# Project Interview

## Value Proposition
SEO growth engine for Tropico Retreats — blog CMS, custom analytics, GSC integration, and backlink tracking so the team can drive and measure organic traffic without developer involvement.

## Users
Tropico Retreats team (non-technical operators) managing content and SEO from the admin dashboard.

## MVP Scope
1. Publish a blog post — write content with images (hero + inline), links, slug, SEO meta tags → renders on public frontend with clean URLs and structured data
2. View traffic dashboard — page views, unique visitors, top pages, referral sources (custom lightweight analytics, zero third-party dependency)
3. View keyword rankings — Google Search Console integration showing queries, impressions, clicks, CTR, average position
4. Edit page SEO settings — meta title, description, OG tags for any page (blog or landing)
5. View backlink report — who links to the site, manual entry + GSC links report

## Stack
- Admin: React 19 + Vite (existing, extend)
- Frontend: Webpack + React (existing, extend with blog pages)
- Backend: Node.js + TypeScript Lambda handlers (existing pattern)
- Infra: Terraform (existing, extend)
- Storage: DynamoDB (single-table, existing) + S3 (blog images)
- Analytics: Custom Lambda endpoint + DynamoDB (no third-party)
- GSC: Google Search Console API (OAuth2 service account)

## Constraints
- Same monorepo structure (backend/, admin/, frontend/, infra/)
- Extend existing admin dashboard (React 19 + Vite)
- Extend existing frontend (Webpack + React)
- Extend existing API Gateway and Lambda pattern
- DynamoDB single-table design (extend existing table)
- No paid analytics services — custom or free only
- Blog content supports: markdown/plain text, inline images, hero images, links
- No rich text editor (WYSIWYG) — keep it simple
- Never touch production data directly

## Deferred Ideas
- Rich text / WYSIWYG editor
- Blog categories, tags, search
- Scheduled/draft publishing workflow
- A/B title testing
- Competitor keyword tracking
- Social media sharing automation
- Email newsletter integration with blog posts
- Comment system
