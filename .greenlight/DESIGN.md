# System Design: Tropico SEO Growth Engine

## 1. Requirements

### 1.1 Functional Requirements

**FR-1: Publish a blog post**
- Operator writes content in Markdown via a side-by-side editor (Markdown left, live preview right)
- Hero image uploaded via dedicated file picker (presigned S3 URL, auto-processed to WebP)
- Inline images uploaded separately, inserted as Markdown `![alt](url)` syntax
- Slug auto-generated from title (lowercase, hyphens, alphanumeric), editable before publishing
- SEO meta fields: meta title, meta description, OG image (defaults to hero image)
- On publish: post goes live immediately (no draft state for MVP)
- Author captured automatically: operator name from JWT claims + "Tropico Retreats" as organization
- Published post renders on public frontend at `/blog/<slug>` with clean URL
- Blog index page at `/blog/` lists all published posts as cards with hero thumbnails and excerpts
- Structured data (BlogPosting JSON-LD) generated automatically from post metadata
- Prerender script expanded to fetch and prerender all published blog posts for SEO

**FR-2: View traffic dashboard**
- Custom lightweight analytics with zero third-party dependency
- Tracking beacon fires on every page load on the public frontend
- Beacon sends: page path, referrer (no cookies, no PII)
- Visitor uniqueness approximated via one-way hash of IP + user-agent (hash stored, raw IP discarded)
- Admin dashboard shows: total page views, unique visitors, average views per day
- Top 10 pages by views with unique visitor count
- Top 10 referral sources by count
- Daily views line chart (using recharts library)
- Time ranges: 7 days, 30 days, 90 days (default: 7 days)

**FR-3: View keyword rankings**
- Google Search Console API integration via service account (no interactive OAuth)
- Service account email added as read-only user on GSC property for tropicoretreat.com
- Dashboard shows: queries with clicks, impressions, CTR, average position
- Dashboard shows: pages with clicks, impressions, CTR, average position
- GSC data cached in DynamoDB for 6 hours (data is already 2-3 days stale)
- Data end date displayed clearly so operators understand the lag
- Time ranges: 7 days, 28 days, 90 days (default: 28 days)

**FR-4: Edit page SEO settings**
- Operator can edit meta title, description, OG tags for any page from admin dashboard
- Covers all existing pages: home, about, services, FAQs, contact, privacy, terms, 3 destinations
- Covers all blog posts
- Frontend checks DynamoDB for custom SEO overrides at render time
- If override exists, use it; otherwise, fall back to hardcoded defaults in the SEO component
- Prerender script fetches SEO overrides and applies them during build

**FR-5: View content performance**
- Combined view showing which blog posts perform best
- Traffic data from custom analytics: page views, unique visitors per blog post
- Search performance from GSC: clicks, impressions, CTR, average position per blog post
- Top queries driving traffic to each blog post
- Unified table sorted by total engagement (clicks + page views)

### 1.2 Non-Functional Requirements

| Requirement | Target |
|---|---|
| Blog publish latency | < 3 seconds from click to post visible via API |
| Analytics beacon response | < 50ms (fire-and-forget, 204 No Content) |
| Analytics dashboard load | < 2 seconds for 30-day aggregation |
| GSC data freshness | Cached 6 hours; underlying data is 2-3 days behind |
| Image processing time | < 10 seconds from upload to processed WebP available |
| Concurrent operators | Up to 5 simultaneous dashboard users |
| Blog content size limit | 100KB Markdown per post |
| Image upload size limit | 10MB per image |
| Availability | Same as existing system (Lambda + DynamoDB on-demand) |

### 1.3 Constraints

- All Lambda handlers in TypeScript, Node.js 22, ESM via esbuild
- Extend existing DynamoDB single-table (`tropico-leads-{env}`)
- Extend existing API Gateway (`api.tropicoretreat.com/v1`)
- Extend existing admin dashboard (React 19 + Vite 7 + TailwindCSS v4 + TanStack Query v5)
- Extend existing frontend (React 19 + Webpack 5 + react-helmet-async)
- Extend existing Terraform modules (`infra/` root + `infra/api/` submodule)
- Use existing Cognito JWT auth for admin endpoints
- Use existing `fetchWithAuth<T>()` client pattern
- Use existing response helpers (`ok()`, `created()`, `badRequest()`, etc.)
- Use existing esbuild config pattern for new Lambda handlers
- Follow existing naming convention: `tropico-<component>-${environment}`
- No paid analytics or SEO services
- Never touch production data directly
- No WYSIWYG / rich text editor

### 1.4 Out of Scope (Deferred)

- Draft / scheduled publishing workflow
- Blog categories, tags, search
- Rich text / WYSIWYG editor
- Backlink tracker (manual or automated)
- Competitor keyword tracking
- A/B title testing
- Social media sharing automation
- Email newsletter integration with blog posts
- Comment system
- Real-time analytics (WebSocket updates)
- Analytics aggregation Lambda (daily rollup for performance at scale)
- Custom date range picker for analytics
- Multi-language content
- Blog post versioning / revision history
- Collaborative editing

---

## 2. Technical Decisions

| Decision | Chosen | Rejected | Rationale |
|----------|--------|----------|-----------|
| Content authoring format | Markdown textarea + live preview | WYSIWYG editor, plain text | Markdown is simple, portable, and renders cleanly. WYSIWYG deferred per constraint. Plain text too limiting for blog content |
| Image upload approach | Upload-first (presigned URL to S3) | Inline drag-and-drop, server-side upload | Simpler implementation, matches "keep it simple" constraint. Hero = dedicated picker, inline = upload then paste URL |
| Blog post lifecycle | Publish immediately (no drafts) | Draft/published toggle, scheduled publish | MVP scope. Draft workflow deferred |
| Image processing library | sharp (Node.js) | ImageMagick, Pillow, browser-side | sharp is the standard for Node.js -- fast, low memory, native WebP support, works well in Lambda |
| Image output format | WebP | JPEG, PNG, AVIF | WebP has best compression-to-quality ratio with broad browser support. AVIF support still incomplete |
| Analytics tracking method | sendBeacon POST to Lambda | Third-party analytics, pixel img tag, client-side only | Zero dependency on paid services. sendBeacon is non-blocking, fire-and-forget. Lambda + DynamoDB keeps data in-house |
| Visitor uniqueness | Hash of IP + user-agent (no cookies) | Cookie-based, fingerprint.js, localStorage | Privacy-friendly, no consent banner needed, GDPR-compliant. Approximate uniqueness is sufficient for business metrics |
| Analytics charting library | recharts | Chart.js, D3, Nivo, Tremor | recharts is React-native, lightweight, well-maintained, simple API for time-series line charts |
| GSC authentication | Service account + property user access | OAuth2 interactive flow, API key | Service account avoids interactive OAuth dance. Add service account email as GSC property user. JSON key in Secrets Manager |
| GSC data caching | DynamoDB cache with 6-hour TTL | No cache (fetch every request), Redis, S3 | DynamoDB is already in use, no new infrastructure. 6h TTL matches data staleness (2-3 day lag). Avoids GSC API quota issues |
| SEO override storage | DynamoDB items with PK=SEO#{path} | JSON file in S3, hardcoded config, CMS | DynamoDB is consistent with existing patterns. Queryable. Supports per-page overrides without deployments |
| Blog URL structure | /blog/{slug} | /posts/{slug}, /articles/{slug}, /blog/{year}/{slug} | Clean, standard blog URL pattern. Matches SEO strategy document. No date in URL avoids content looking stale |
| Slug uniqueness enforcement | Separate SLUG#{slug} DynamoDB item | GSI on slug field, application-level check | Atomic conditional PutItem on slug item guarantees uniqueness. No GSI needed for a low-cardinality lookup |
| Admin navigation | Sidebar with icons + labels | Header tabs, dropdown menu | Sidebar scales to 6+ sections. Collapsible on mobile. Standard admin dashboard pattern |
| Blog editor layout | Side-by-side (Markdown left, preview right) | Stacked, tabbed | Standard desktop markdown editor pattern. More productive for content creation |
| Blog listing style (public) | Cards with hero thumbnails + excerpts | Text-only list, full-content feed | Cards are visually engaging, match existing Tropico frontend design language |
| Prerender strategy for blogs | Expand existing prerender script to fetch blog posts | SSR, ISR, separate static site generator | Follows existing pattern. Prerender script already handles all static pages. Adding blog post fetching is a natural extension |
| Backlink tracking (MVP) | Deferred entirely | Manual entry tracker, free API integration | GSC API doesn't expose backlink data. Manual entry is low-value. Replaced with content performance dashboard |
| DynamoDB analytics partitioning | Partition by date (PK=PAGEVIEW#{date}) | Single partition, partition by page, partition by month | Daily partitions prevent hot keys. Queries always target specific date ranges. Individual items stay small |

---

## 3. Architecture

### 3.1 High-Level Architecture

```
                         INTERNET
                            |
              +-------------+-------------+
              |             |             |
              v             v             v
     tropicoretreat.com   api.tropicoretreat.com   admin.tropicoretreat.com
     (CloudFront/S3)      (API Gateway v2)          (CloudFront/S3)
              |             |                        |
         +----+       +-----+------+------+          |
         |            |     |      |      |          |
    blog images   Lambda  Lambda Lambda  Lambda      |
    (CloudFront)  blog    seo    analytics gsc       |
         |        Admin   Admin  collect   Proxy     |
         |           |      |      |      |          |
    S3 bucket        v      v      v      v          |
    (uploads)           DynamoDB                     |
         |           (tropico-leads-{env})           |
         v                                           |
    Lambda                                           |
    (image processor)                                |
         |                                           |
    S3 bucket                                        |
    (processed)                                      |
              +--------------------------------------+
```

### 3.2 New Lambda Functions

| Lambda | Purpose | Trigger | Auth | Memory | Timeout |
|--------|---------|---------|------|--------|---------|
| `tropico-blog-admin-{env}` | Blog CRUD + image presign + public read | API Gateway | Mixed (CRUD=JWT, read=public) | 256 MB | 30s |
| `tropico-seo-admin-{env}` | SEO settings CRUD | API Gateway | JWT | 128 MB | 10s |
| `tropico-analytics-{env}` | Beacon collect + dashboard read | API Gateway | Mixed (collect=public, dashboard=JWT) | 128 MB | 10s |
| `tropico-gsc-{env}` | GSC performance + content performance | API Gateway | JWT | 256 MB | 30s |
| `tropico-image-processor-{env}` | Resize, compress to WebP, thumbnail | S3 PutObject event | S3 event | 512 MB | 60s |

### 3.3 Component Placement

Following the existing codebase structure:

| Component | Location | Rationale |
|---|---|---|
| Blog admin handler | `backend/src/handlers/blogAdmin.ts` | Multi-route pattern matching `leadsAdmin.ts` |
| SEO admin handler | `backend/src/handlers/seoAdmin.ts` | Separate domain concern from blog |
| Analytics handler | `backend/src/handlers/analytics.ts` | Mixed public/admin routes |
| GSC proxy handler | `backend/src/handlers/gscProxy.ts` | Isolated GSC API interaction |
| Image processor handler | `backend/src/handlers/imageProcessor.ts` | Event-driven, matching `processLeadNotifications.ts` pattern |
| Blog DynamoDB functions | `backend/src/lib/dynamodb.ts` (extend) | All DynamoDB access in single module |
| Blog types | `backend/src/lib/types.ts` (extend) | All types in single module |
| Blog validation schemas | `backend/src/lib/validation.ts` (extend) | All Zod schemas in single module |
| Markdown utilities | `backend/src/lib/markdown.ts` (new) | Excerpt generation, sanitization |
| Blog API client | `admin/src/api/blog.ts` (new) | Parallel to `admin/src/api/leads.ts` |
| SEO API client | `admin/src/api/seo.ts` (new) | Separate domain concern |
| Analytics API client | `admin/src/api/analytics.ts` (new) | Separate domain concern |
| GSC API client | `admin/src/api/gsc.ts` (new) | Separate domain concern |
| Blog editor components | `admin/src/components/blog/` (new) | Feature-grouped components |
| Analytics dashboard components | `admin/src/components/analytics/` (new) | Feature-grouped components |
| SEO settings components | `admin/src/components/seo/` (new) | Feature-grouped components |
| Blog pages (public) | `frontend/src/pages/BlogIndexPage.tsx`, `BlogPostPage.tsx` (new) | Parallel to existing pages |
| Analytics beacon | `frontend/src/lib/analytics.ts` (new) | Lightweight tracking script |
| Terraform blog infra | `infra/api/blog.tf` (new) | Feature-grouped, matching `notifications.tf` |
| Terraform analytics infra | `infra/api/analytics.tf` (new) | Feature-grouped |
| Terraform GSC infra | `infra/api/gsc.tf` (new) | Feature-grouped |

---

## 4. Data Model

All new entities live in the existing `tropico-leads-{env}` DynamoDB table (single-table design, PAY_PER_REQUEST billing).

### 4.1 Blog Post

```
PK:     BLOG#{id}
SK:     BLOG#{id}
GSI1PK: BLOG#PUBLISHED           (only when status=published)
GSI1SK: {publishedAt ISO 8601}    (chronological listing)

id:              ULID
title:           string
slug:            string (unique, URL-safe, lowercase alphanumeric + hyphens)
content:         string (Markdown, max 100KB)
excerpt:         string (auto-generated, first ~200 chars of plain text)
heroImageUrl:    string (CloudFront URL of processed hero WebP)
metaTitle:       string (defaults to title if not set)
metaDescription: string (defaults to excerpt if not set)
ogImageUrl:      string (defaults to heroImageUrl)
authorName:      string (operator name from JWT claims)
authorOrg:       string ("Tropico Retreats")
status:          "published" (MVP -- single status)
publishedAt:     ISO 8601
createdAt:       ISO 8601
updatedAt:       ISO 8601
```

### 4.2 Slug Index (Uniqueness Enforcement)

```
PK:     SLUG#{slug}
SK:     SLUG#{slug}

slug:   string
blogId: string (ULID of the blog post)
```

Conditional PutItem (`attribute_not_exists(PK)`) ensures slugs are globally unique. Blog read-by-slug uses GetItem on this record to find the blogId, then GetItem on the blog post.

### 4.3 SEO Override

```
PK:     SEO#{path}               (e.g., SEO#/about, SEO#/blog/my-post)
SK:     SEO#{path}
GSI1PK: SEO#ALL
GSI1SK: {path}

path:            string (URL path, e.g., "/about", "/destinations/caribbean")
metaTitle:       string
metaDescription: string
ogTitle:         string (optional, defaults to metaTitle)
ogDescription:   string (optional, defaults to metaDescription)
ogImageUrl:      string (optional)
keywords:        string (optional)
updatedAt:       ISO 8601
updatedBy:       string (operator email from JWT)
```

### 4.4 Analytics Page View

```
PK:     PAGEVIEW#{date}          (e.g., PAGEVIEW#2026-03-07)
SK:     PAGEVIEW#{timestamp}#{ulid}

path:       string (e.g., "/blog/corporate-retreat-colombia")
referrer:   string (e.g., "https://google.com", or empty)
visitorId:  string (one-way hash of IP + user-agent, no PII)
userAgent:  string (browser family only, e.g., "Chrome/120")
country:    string (from CloudFront geo header, optional)
createdAt:  ISO 8601
```

Partitioned by date for efficient range queries. The dashboard queries `PK = PAGEVIEW#2026-03-01` through `PK = PAGEVIEW#2026-03-07` for a 7-day view (one Query per day, parallelized).

### 4.5 GSC Cache

```
PK:     GSC#CACHE
SK:     GSC#{queryType}#{dateRange}    (e.g., GSC#performance#28d, GSC#pages#7d)

data:       string (JSON-encoded GSC API response)
fetchedAt:  ISO 8601
expiresAt:  ISO 8601 (fetchedAt + 6 hours)
```

Single cache partition. Low write volume (at most a few writes per hour). On read, check `expiresAt > now`; if expired, fetch fresh from GSC API, write new cache item, return.

### 4.6 Access Patterns

| Access Pattern | Method | Key Condition |
|---|---|---|
| List published blog posts | Query GSI1 | `GSI1PK = BLOG#PUBLISHED`, `ScanIndexForward = false`, limit |
| Get blog post by ID | GetItem | `PK = BLOG#{id}`, `SK = BLOG#{id}` |
| Get blog post by slug | GetItem slug index | `PK = SLUG#{slug}`, `SK = SLUG#{slug}` -> blogId -> GetItem |
| Create blog post | TransactWriteItems | PutItem blog + conditional PutItem slug (atomic) |
| Delete blog post | TransactWriteItems | DeleteItem blog + DeleteItem slug (atomic) |
| List all SEO overrides | Query GSI1 | `GSI1PK = SEO#ALL` |
| Get SEO override for path | GetItem | `PK = SEO#{path}`, `SK = SEO#{path}` |
| Upsert SEO override | PutItem | `PK = SEO#{path}`, `SK = SEO#{path}` |
| Record page view | PutItem | `PK = PAGEVIEW#{date}`, `SK = PAGEVIEW#{ts}#{ulid}` |
| Query page views for date | Query | `PK = PAGEVIEW#{date}` |
| Get GSC cache | GetItem | `PK = GSC#CACHE`, `SK = GSC#{type}#{range}` |
| Set GSC cache | PutItem | `PK = GSC#CACHE`, `SK = GSC#{type}#{range}` |

---

## 5. API Surface

### 5.1 Public Blog Endpoints (No Auth)

**GET `/v1/blog/posts`** -- List published blog posts

```
Query params:
  limit?:  number (1-50, default 20)
  cursor?: string (base64-encoded pagination key)

Response 200:
{
  posts: [{
    id: string,
    title: string,
    slug: string,
    excerpt: string,
    heroImageUrl: string,
    authorName: string,
    authorOrg: string,
    publishedAt: string
  }],
  nextCursor?: string
}
```

**GET `/v1/blog/posts/{slug}`** -- Get single blog post by slug

```
Response 200:
{
  post: {
    id: string,
    title: string,
    slug: string,
    content: string,         // Markdown
    excerpt: string,
    heroImageUrl: string,
    metaTitle: string,
    metaDescription: string,
    ogImageUrl: string,
    authorName: string,
    authorOrg: string,
    publishedAt: string,
    updatedAt: string
  }
}

Response 404: { error: "Post not found" }
```

### 5.2 Public Analytics Endpoint (No Auth)

**POST `/v1/analytics/collect`** -- Record page view

```
Request body:
{
  path: string,          // required, max 500 chars, starts with "/"
  referrer?: string      // optional, max 2000 chars
}

Response 204: (no body)
Response 400: { error: "Invalid request" }
```

The Lambda extracts visitor fingerprint from request headers (IP hash + user-agent). Rate limited at API Gateway level.

### 5.3 Admin Blog Endpoints (JWT Required)

**POST `/v1/blog/posts`** -- Create and publish blog post

```
Request body:
{
  title: string,              // required, max 200 chars
  slug?: string,              // optional, auto-generated from title if absent
  content: string,            // required, Markdown, max 100KB
  heroImageUrl?: string,      // optional, S3 URL
  metaTitle?: string,         // optional, defaults to title
  metaDescription?: string,   // optional, defaults to auto excerpt
  ogImageUrl?: string         // optional, defaults to heroImageUrl
}

Response 201: { post: BlogPost }
Response 400: { error: string, details: {...} }
Response 409: { error: "Slug already exists" }
```

**PUT `/v1/blog/posts/{id}`** -- Update blog post

```
Request body:
{
  title?: string,
  slug?: string,
  content?: string,
  heroImageUrl?: string,
  metaTitle?: string,
  metaDescription?: string,
  ogImageUrl?: string
}

Response 200: { post: BlogPost }
Response 404: { error: "Post not found" }
Response 409: { error: "Slug already exists" }
```

**DELETE `/v1/blog/posts/{id}`** -- Soft delete blog post

```
Response 200: { message: "Post deleted" }
Response 404: { error: "Post not found" }
```

Soft delete: sets `status = "deleted"`, removes `GSI1PK` (disappears from published listing), deletes slug index item (frees the slug for reuse).

**POST `/v1/blog/images`** -- Get presigned S3 upload URL

```
Request body:
{
  filename: string,           // required
  contentType: string,        // required, must be image/*
  purpose: "hero" | "inline"  // required
}

Response 200:
{
  uploadUrl: string,          // presigned PUT URL (5 min expiry)
  imageUrl: string,           // final CloudFront URL of processed image
  key: string                 // S3 key
}

Response 400: { error: "Invalid content type" }
```

### 5.4 Admin SEO Endpoints (JWT Required)

**GET `/v1/seo/settings`** -- List all SEO overrides

```
Response 200:
{
  settings: [{
    path: string,
    metaTitle: string,
    metaDescription: string,
    ogTitle?: string,
    ogDescription?: string,
    ogImageUrl?: string,
    keywords?: string,
    updatedAt: string,
    updatedBy: string
  }]
}
```

**PUT `/v1/seo/settings/{encodedPath}`** -- Upsert SEO override for a page

```
Path param: encodedPath (URL-encoded, e.g., %2Fabout for /about)

Request body:
{
  metaTitle: string,         // required, max 70 chars
  metaDescription: string,   // required, max 160 chars
  ogTitle?: string,          // optional, defaults to metaTitle
  ogDescription?: string,    // optional, defaults to metaDescription
  ogImageUrl?: string,       // optional
  keywords?: string          // optional, max 500 chars
}

Response 200: { setting: SeoOverride }
Response 400: { error: string, details: {...} }
```

### 5.5 Admin Analytics Endpoint (JWT Required)

**GET `/v1/analytics/dashboard`** -- Traffic dashboard data

```
Query params:
  period?: "7d" | "30d" | "90d" (default: "7d")

Response 200:
{
  summary: {
    totalPageViews: number,
    uniqueVisitors: number,
    avgViewsPerDay: number
  },
  topPages: [{
    path: string,
    views: number,
    uniqueVisitors: number
  }],
  topReferrers: [{
    referrer: string,
    count: number
  }],
  dailyViews: [{
    date: string,
    views: number,
    uniqueVisitors: number
  }]
}
```

### 5.6 Admin GSC Endpoints (JWT Required)

**GET `/v1/gsc/performance`** -- Search performance from GSC

```
Query params:
  period?: "7d" | "28d" | "90d" (default: "28d")

Response 200:
{
  queries: [{
    query: string,
    clicks: number,
    impressions: number,
    ctr: number,
    position: number
  }],
  pages: [{
    page: string,
    clicks: number,
    impressions: number,
    ctr: number,
    position: number
  }],
  cachedAt: string,
  dataEndDate: string
}
```

**GET `/v1/gsc/content`** -- Content performance (combined traffic + GSC)

```
Query params:
  period?: "28d" (default: "28d")

Response 200:
{
  posts: [{
    slug: string,
    title: string,
    publishedAt: string,
    analytics: {
      pageViews: number,
      uniqueVisitors: number
    },
    gsc: {
      clicks: number,
      impressions: number,
      ctr: number,
      avgPosition: number,
      topQueries: [string]
    }
  }]
}
```

### 5.7 Complete API Gateway Route Table

| Method | Path | Lambda | Auth | Description |
|---|---|---|---|---|
| POST | /leads | tropico-create-lead | None | Create lead (existing) |
| GET | /leads | tropico-leads-admin | JWT | List leads (existing) |
| GET | /leads/{id} | tropico-leads-admin | JWT | Get lead (existing) |
| PATCH | /leads/{id} | tropico-leads-admin | JWT | Update lead (existing) |
| POST | /leads/{id}/notes | tropico-leads-admin | JWT | Add note (existing) |
| PATCH | /leads/{id}/notes/{noteId} | tropico-leads-admin | JWT | Edit note (existing) |
| GET | /users | tropico-users | JWT | List users (existing) |
| POST | /emails/send | tropico-email-admin | JWT | Send email (existing) |
| GET | /emails/{leadId} | tropico-email-admin | JWT | Get thread (existing) |
| PATCH | /emails/{leadId}/read | tropico-email-admin | JWT | Mark read (existing) |
| **GET** | **/blog/posts** | **tropico-blog-admin** | **None** | **List published posts** |
| **GET** | **/blog/posts/{slug}** | **tropico-blog-admin** | **None** | **Get post by slug** |
| **POST** | **/blog/posts** | **tropico-blog-admin** | **JWT** | **Create blog post** |
| **PUT** | **/blog/posts/{id}** | **tropico-blog-admin** | **JWT** | **Update blog post** |
| **DELETE** | **/blog/posts/{id}** | **tropico-blog-admin** | **JWT** | **Delete blog post** |
| **POST** | **/blog/images** | **tropico-blog-admin** | **JWT** | **Get presigned upload URL** |
| **GET** | **/seo/settings** | **tropico-seo-admin** | **JWT** | **List SEO overrides** |
| **PUT** | **/seo/settings/{path}** | **tropico-seo-admin** | **JWT** | **Upsert SEO override** |
| **POST** | **/analytics/collect** | **tropico-analytics** | **None** | **Record page view** |
| **GET** | **/analytics/dashboard** | **tropico-analytics** | **JWT** | **Traffic dashboard** |
| **GET** | **/gsc/performance** | **tropico-gsc** | **JWT** | **Keyword rankings** |
| **GET** | **/gsc/content** | **tropico-gsc** | **JWT** | **Content performance** |

---

## 6. Image Processing Pipeline

### 6.1 Upload Flow

```
1. Operator clicks "Upload hero image" in blog editor
2. Admin frontend: POST /v1/blog/images { filename, contentType, purpose: "hero" }
3. blogAdmin Lambda:
   a. Validates contentType is image/* (jpeg, png, webp, gif)
   b. Generates ULID for image group
   c. Sets purpose in S3 object metadata via presigned URL conditions
   d. Generates presigned PUT URL for S3 key:
        tropico-blog-images-{env}/uploads/{ulid}/{filename}
   e. Returns { uploadUrl, imageUrl (expected processed URL), key }
4. Admin frontend: PUT to presigned URL with raw file bytes
5. S3 PutObject event on uploads/ prefix triggers imageProcessor Lambda
```

### 6.2 Processing

```
6. imageProcessor Lambda:
   a. Downloads original from uploads/ prefix
   b. Validates file is actually an image (magic bytes check via sharp)
   c. Reads purpose from S3 object metadata
   d. Uses sharp to:
      - hero:   resize to max 1200px wide (maintain aspect ratio), WebP quality 80
      - inline: resize to max 800px wide (maintain aspect ratio), WebP quality 80
      - thumbnail: resize to max 400px wide, WebP quality 70
   e. Writes processed files:
      tropico-blog-images-{env}/processed/{ulid}/hero.webp     (or inline.webp)
      tropico-blog-images-{env}/processed/{ulid}/thumbnail.webp
   f. Original preserved in uploads/ prefix
```

### 6.3 Serving

```
7. CloudFront distribution serves from tropico-blog-images-{env} S3 bucket
8. Blog post stores CloudFront URL as heroImageUrl
9. Public frontend renders processed WebP images via CloudFront
```

### 6.4 S3 Bucket Structure

```
tropico-blog-images-{env}/
  uploads/
    {ulid}/
      original-filename.jpg       (original upload)
  processed/
    {ulid}/
      hero.webp                   (1200px max width, quality 80)
      inline.webp                 (800px max width, quality 80)
      thumbnail.webp              (400px max width, quality 70)
```

---

## 7. Analytics Beacon Design

### 7.1 Frontend Script

A lightweight script included in the public frontend that fires on each page load:

```typescript
// frontend/src/lib/analytics.ts
const ANALYTICS_URL = `${env.api.url}/analytics/collect`;

export function trackPageView(): void {
  const payload = {
    path: window.location.pathname,
    referrer: document.referrer || '',
  };

  if (navigator.sendBeacon) {
    navigator.sendBeacon(ANALYTICS_URL, JSON.stringify(payload));
  } else {
    fetch(ANALYTICS_URL, {
      method: 'POST',
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});  // fire-and-forget
  }
}
```

Called once on initial page load and on each route change (via react-router navigation listener).

### 7.2 Lambda Processing

The analytics Lambda:
1. Parses request body (path, referrer)
2. Validates: path starts with `/`, max 500 chars; referrer max 2000 chars
3. Extracts visitor fingerprint: `SHA256(sourceIp + userAgent)` -- one-way hash, no PII stored
4. Extracts browser family from user-agent (e.g., "Chrome/120") -- no full UA string stored
5. Extracts country from `CloudFront-Viewer-Country` header (if available via API Gateway)
6. Writes DynamoDB item: `PK=PAGEVIEW#{today}, SK=PAGEVIEW#{timestamp}#{ulid}`
7. Returns 204 No Content

### 7.3 Dashboard Aggregation

The dashboard Lambda queries DynamoDB for the requested date range (one Query per day, parallelized with `Promise.all`), then aggregates in-memory:

- Total page views: count of all items
- Unique visitors: count of distinct `visitorId` values
- Top pages: group by `path`, sort by count descending, limit 10
- Top referrers: group by `referrer` (domain only), sort by count descending, limit 10
- Daily views: count per day, returned as array for the line chart

For 90-day queries at moderate traffic (~1000 views/day), this processes ~90,000 items in memory. Acceptable for MVP on a 128MB Lambda within 10s timeout.

### 7.4 Bot Filtering

Basic bot filtering at the Lambda level:
- Reject if no `Origin` or `Referer` header present (most bots don't set these)
- Reject if `Origin` doesn't match `tropicoretreat.com` or `staging.tropicoretreat.com`
- Skip known bot user-agents (Googlebot, Bingbot, etc.)

---

## 8. GSC Integration

### 8.1 Authentication

1. Create Google Cloud project (or use existing)
2. Enable Search Console API
3. Create service account, download JSON key
4. Add service account email as read-only user on GSC property `sc-domain:tropicoretreat.com`
5. Store JSON key in AWS Secrets Manager: `tropico/gsc-credentials-{env}`
6. Lambda reads key from Secrets Manager on cold start, caches in module scope

### 8.2 API Calls

The GSC proxy Lambda uses `googleapis` npm package:

```typescript
const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(secretValue),
  scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
});
const searchconsole = google.searchconsole({ version: 'v1', auth });

// Performance query (queries dimension)
await searchconsole.searchanalytics.query({
  siteUrl: 'sc-domain:tropicoretreat.com',
  requestBody: {
    startDate: startDate,
    endDate: endDate,          // 2-3 days before today
    dimensions: ['query'],
    rowLimit: 100,
  },
});

// Performance query (pages dimension)
await searchconsole.searchanalytics.query({
  siteUrl: 'sc-domain:tropicoretreat.com',
  requestBody: {
    startDate: startDate,
    endDate: endDate,
    dimensions: ['page'],
    rowLimit: 100,
  },
});
```

### 8.3 Caching Strategy

1. Admin requests `GET /v1/gsc/performance?period=28d`
2. Lambda checks DynamoDB cache: `PK=GSC#CACHE, SK=GSC#performance#28d`
3. If `expiresAt > now`: return cached `data`
4. If expired or missing: fetch from GSC API, write to cache with `expiresAt = now + 6h`, return fresh data
5. GSC API quotas: 1200 queries/min (generous, caching makes this a non-issue)

---

## 9. Security

### 9.1 Authentication

- All admin endpoints use existing Cognito JWT authorizer (no changes to auth infrastructure)
- Public endpoints (analytics collect, blog read) have no auth
- GSC proxy and content performance endpoints are admin-only (JWT required)

### 9.2 Analytics Beacon Hardening

- Rate limited at API Gateway level (existing 10 req/s burst -- shared across all routes)
- Origin validation: reject requests where Origin header doesn't match tropicoretreat.com
- Input validation: path must start with `/`, max 500 chars; referrer max 2000 chars
- No PII stored: visitor ID is SHA256 hash of IP + user-agent (irreversible)
- Raw IP address is never written to DynamoDB
- User-agent stored as browser family only (e.g., "Chrome/120"), not full string

### 9.3 Image Upload Security

- Presigned URLs expire in 5 minutes
- Content-type restricted to `image/jpeg`, `image/png`, `image/webp`, `image/gif`
- Max file size enforced via presigned URL content-length condition (10 MB)
- S3 bucket is private -- served through CloudFront only (OAC)
- Image processor validates file is actually an image (magic bytes check with sharp)
- If magic bytes don't match content type, file is rejected (deleted from uploads/, not processed)

### 9.4 GSC Credentials

- Service account JSON key stored in AWS Secrets Manager (`tropico/gsc-credentials-{env}`)
- Key value set manually after Terraform apply (never in Terraform state as plaintext)
- Lambda reads key on cold start, caches in Lambda module scope (not in DynamoDB)
- Key never exposed to frontend -- admin frontend calls the GSC proxy Lambda, which calls GSC API server-side
- Service account has read-only access to GSC property (cannot modify site settings)

### 9.5 Blog Content Security

- Markdown content sanitized on render (frontend): strip any raw HTML tags, prevent XSS
- Use a Markdown renderer that does not allow raw HTML by default (e.g., `react-markdown` with `allowedElements` whitelist)
- Slugs validated: lowercase `[a-z0-9-]` only, max 200 chars, must not start/end with hyphen
- Blog content max size: 100KB (validated server-side with Zod)
- Blog posts are soft-deleted (never hard-deleted), preserving audit trail

### 9.6 Input Validation

All API inputs validated with Zod schemas before processing:

| Schema | Endpoint | Key Constraints |
|---|---|---|
| `CreateBlogPostSchema` | POST /blog/posts | title max 200, content max 100KB, slug pattern |
| `UpdateBlogPostSchema` | PUT /blog/posts/{id} | at least one field required |
| `ImageUploadSchema` | POST /blog/images | contentType must be image/*, purpose enum |
| `SeoOverrideSchema` | PUT /seo/settings/{path} | metaTitle max 70, metaDescription max 160 |
| `AnalyticsCollectSchema` | POST /analytics/collect | path required, starts with "/", max 500 |

---

## 10. Deployment

### 10.1 New Terraform Resources

| Resource | Name Pattern | File |
|---|---|---|
| S3 bucket (blog images) | `tropico-blog-images-{env}` | `infra/api/blog.tf` (new) |
| S3 bucket policy + OAC | for blog images CloudFront | `infra/api/blog.tf` |
| CloudFront distribution | blog images CDN | `infra/blog-cloudfront.tf` (new, root module) |
| Route53 record | `images.tropicoretreat.com` | `infra/blog-route53.tf` (new, root module) |
| Lambda: blog admin | `tropico-blog-admin-{env}` | `infra/api/blog.tf` |
| Lambda: SEO admin | `tropico-seo-admin-{env}` | `infra/api/blog.tf` |
| Lambda: image processor | `tropico-image-processor-{env}` | `infra/api/blog.tf` |
| S3 event notification | uploads/ -> image processor | `infra/api/blog.tf` |
| Lambda: analytics | `tropico-analytics-{env}` | `infra/api/analytics.tf` (new) |
| Lambda: GSC proxy | `tropico-gsc-{env}` | `infra/api/gsc.tf` (new) |
| Secrets Manager | `tropico/gsc-credentials-{env}` | `infra/api/gsc.tf` |
| API Gateway routes | 12 new routes | `infra/api/main.tf` (extend) |
| IAM roles + policies | per Lambda | `infra/api/iam.tf` (extend) |
| CloudWatch log groups | per Lambda | respective .tf files |

### 10.2 New Backend Handlers

| Handler File | esbuild Entry | Output |
|---|---|---|
| `backend/src/handlers/blogAdmin.ts` | `src/handlers/blogAdmin.ts` | `dist/blogAdmin.mjs` |
| `backend/src/handlers/seoAdmin.ts` | `src/handlers/seoAdmin.ts` | `dist/seoAdmin.mjs` |
| `backend/src/handlers/analytics.ts` | `src/handlers/analytics.ts` | `dist/analytics.mjs` |
| `backend/src/handlers/gscProxy.ts` | `src/handlers/gscProxy.ts` | `dist/gscProxy.mjs` |
| `backend/src/handlers/imageProcessor.ts` | `src/handlers/imageProcessor.ts` | `dist/imageProcessor.mjs` |

### 10.3 New Backend Dependencies

| Package | Purpose |
|---|---|
| `sharp` | Image processing (resize, WebP, thumbnails) |
| `googleapis` | Google Search Console API client |

### 10.4 New Admin Dependencies

| Package | Purpose |
|---|---|
| `recharts` | Charts for analytics dashboard |
| `react-markdown` | Render Markdown to HTML in blog preview |
| `remark-gfm` | GitHub Flavored Markdown support (tables, strikethrough) |

### 10.5 New Frontend Dependencies

| Package | Purpose |
|---|---|
| `react-markdown` | Render Markdown to HTML on blog post pages |
| `remark-gfm` | GitHub Flavored Markdown support |

### 10.6 New Admin Pages

| Route | Page | Purpose |
|---|---|---|
| `/blog` | BlogListPage | List blog posts, create new |
| `/blog/new` | BlogEditorPage | Create blog post (Markdown editor) |
| `/blog/:id/edit` | BlogEditorPage | Edit blog post |
| `/analytics` | AnalyticsDashboardPage | Traffic dashboard with charts |
| `/seo` | SeoSettingsPage | SEO settings for all pages |
| `/gsc` | GscPerformancePage | Keyword rankings from GSC |
| `/content` | ContentPerformancePage | Combined content performance |

Admin navigation sidebar sections:
- Leads (existing, icon: Users)
- Blog (new, icon: FileText)
- Analytics (new, icon: BarChart3)
- SEO (new, icon: Search)
- Keywords (new, icon: TrendingUp)
- Content (new, icon: PieChart)

### 10.7 Frontend Additions

| File | Purpose |
|---|---|
| `frontend/src/pages/BlogIndexPage.tsx` | Public blog listing (/blog/) |
| `frontend/src/pages/BlogPostPage.tsx` | Public blog post (/blog/:slug) |
| `frontend/src/lib/analytics.ts` | Tracking beacon script |
| `frontend/src/Routes/appRoutes.tsx` (extend) | Add BLOG_INDEX, BLOG_POST routes |
| `frontend/src/Routes/router.tsx` (extend) | Add blog route components |
| `frontend/scripts/prerender.js` (extend) | Fetch and prerender blog posts + apply SEO overrides |

---

## 11. User Decisions

Locked decisions from design session gray area discussions:

| Area | Decision |
|---|---|
| Blog editor layout | Side-by-side (Markdown left, preview right) |
| Analytics visualization | Line charts for daily trends using recharts |
| Blog listing on public site | Cards with hero image thumbnails + excerpts, matching existing Tropico frontend design language |
| Admin navigation | Sidebar with icons + labels, collapsible on mobile |
| Content authoring format | Markdown in textarea with live preview |
| Image handling | Upload-first approach: hero = dedicated picker, inline = upload separately + paste URL |
| Blog post lifecycle | Publish immediately, no drafts for MVP |
| Slug generation | Auto-generated from title, editable before publish |
| Blog URL structure | /blog/{slug} for posts, /blog/ for index |
| Blog author | Operator name from JWT + "Tropico Retreats" as organization |
| Analytics tracking | sendBeacon, no cookies, hashed IP for visitor uniqueness |
| Analytics time ranges | 7d, 30d, 90d (default 7d) |
| GSC authentication | Service account, no interactive OAuth |
| GSC caching | DynamoDB cache, 6-hour TTL |
| SEO settings scope | All pages editable from admin (existing pages + blog posts) |
| Frontend SEO for blogs | Expand existing prerender script to fetch and prerender blog posts |
| Backlink tracking | Dropped from MVP, replaced with content performance dashboard |
| Image optimization | Auto-process on upload: resize, compress to WebP, generate thumbnail |
