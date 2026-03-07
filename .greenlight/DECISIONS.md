# Technical Decision Log -- SEO Growth Engine

All decisions made during the design session for the SEO Growth Engine feature. Each decision documents the context, options considered, choice made, and rationale.

---

## ADR-001: Store blog posts in existing single-table vs. separate DynamoDB table

**Status:** Accepted
**Date:** 2026-03-07
**Context:** The existing system uses a single DynamoDB table (`tropico-leads-${env}`) with a single-table design pattern. Leads, notes, emails, and notification preferences all live in this table. We need to store blog posts, SEO overrides, analytics page views, and GSC cache.

**Options:**
1. **Same table** -- Add new PK/SK prefix patterns (BLOG#, SEO#, PAGEVIEW#, GSC#) to the existing table
2. **Separate table per domain** -- Create `tropico-blog-${env}`, `tropico-analytics-${env}`, `tropico-seo-${env}`
3. **Two tables** -- Existing table for blog/SEO (low write), new table for analytics (high write)

**Decision:** Option 1 -- Same table.

**Rationale:**
- The existing codebase is built around single-table design. All DynamoDB access goes through `backend/src/lib/dynamodb.ts` with one `TABLE_NAME` environment variable
- New entity types use distinct PK prefixes (BLOG#, SEO#, PAGEVIEW#, GSC#) that are completely isolated from existing entity access patterns
- PAY_PER_REQUEST billing means no capacity planning needed -- the table scales automatically
- DynamoDB can handle billions of items with no performance degradation -- partition key distribution is the only concern, and date-partitioned analytics (PK=PAGEVIEW#{date}) distributes writes naturally
- GSI1 is already configured with projection: ALL. The new entities (BLOG#PUBLISHED, SEO#ALL) reuse it efficiently
- A separate table adds operational overhead (separate IAM policies, separate backup policies, separate monitoring) with no query pattern benefit
- If analytics write volume becomes a concern in the future, a separate table can be created without changing the blog or SEO code

**Consequences:**
- All new Lambdas receive the same `TABLE_NAME` environment variable
- Existing Scan operations (like `getLeads()`) already filter by SK prefix `begins_with(SK, 'LEAD#')`, so they won't pick up blog or analytics items
- DynamoDB Streams will now fire for analytics writes -- the existing `processLeadNotifications` Lambda must filter by `eventName === 'INSERT'` AND check the PK prefix (it already only processes LEAD# items)

---

## ADR-002: Markdown for blog content vs. rich text editor vs. structured blocks

**Status:** Accepted
**Date:** 2026-03-07
**Context:** The blog CMS needs a content authoring format. The operators are non-technical but need to create content with images, links, and basic formatting.

**Options:**
1. **Markdown** -- Operator types Markdown in a textarea, live preview renders HTML
2. **Rich text editor (WYSIWYG)** -- TipTap, Lexical, or similar
3. **Structured blocks** -- Notion-like block editor (paragraph, heading, image, etc.)

**Decision:** Option 1 -- Markdown.

**Rationale:**
- Project constraint explicitly states "No rich text editor (WYSIWYG) -- keep it simple"
- Markdown is widely understood, portable, and stores cleanly as a string in DynamoDB
- A side-by-side editor (Markdown left, preview right) gives immediate visual feedback
- Markdown content is trivially searchable, version-diffable, and can be migrated to any future system
- The `react-markdown` library renders Markdown to React components with zero custom parsing
- If the team later wants a WYSIWYG experience, a Markdown-based editor (like StackEdit or Milkdown) can be added on top without changing the storage format
- Structured blocks add significant complexity (block schema, drag-and-drop, nested components) disproportionate to MVP needs

**Consequences:**
- Operators need basic Markdown literacy (headings, bold, italic, links, images)
- The admin dashboard should include a Markdown cheat sheet or toolbar with common syntax buttons
- Images are inserted as `![alt](url)` -- the upload-first flow (upload to S3, get URL, paste into Markdown) is slightly more steps than drag-and-drop but much simpler to implement
- No support for complex layouts (multi-column, embedded widgets) in MVP

---

## ADR-003: Image processing approach -- Lambda + sharp vs. CloudFront Functions vs. client-side

**Status:** Accepted
**Date:** 2026-03-07
**Context:** Blog images uploaded by operators need to be optimized (resized, compressed, converted to WebP) for frontend performance. The pipeline should be automatic -- operators upload whatever they have, the system handles optimization.

**Options:**
1. **Lambda + sharp (S3 event-driven)** -- Upload triggers Lambda, sharp processes to WebP + thumbnails
2. **CloudFront Functions / Lambda@Edge** -- Transform images on-the-fly at CDN edge
3. **Client-side processing** -- Resize and compress in the browser before upload
4. **External service** -- Cloudinary, imgix, or AWS Image Handler solution

**Decision:** Option 1 -- Lambda + sharp (S3 event-driven).

**Rationale:**
- sharp is the standard Node.js image processing library -- fast (libvips), low memory, native WebP/AVIF support, arm64 compatible (Graviton Lambda)
- S3 event-driven processing follows the existing `processLeadNotifications` pattern (event triggers Lambda)
- Processing once on upload is more efficient than on-the-fly at every request (CloudFront Functions)
- Client-side processing is unreliable (browser differences, mobile limitations, large file handling)
- External services (Cloudinary, imgix) add cost and third-party dependency, violating the "no paid services" constraint
- The Lambda processes three variants: hero (1200px), inline (800px), thumbnail (400px) -- all in WebP with appropriate quality settings
- Originals are preserved in S3 for future reprocessing if needed

**Consequences:**
- sharp adds ~50MB to the Lambda bundle (native binary for linux-arm64). May need a Lambda layer if the zip exceeds 50MB limit
- Image processor Lambda needs 512MB memory (sharp's libvips needs headroom for large images)
- Processing adds 5-10 seconds latency between upload and availability -- the admin UI should show a processing state
- WebP is the only output format for MVP. If older browser support is needed, JPEG fallback can be added later

---

## ADR-004: Analytics tracking -- custom sendBeacon vs. third-party vs. server logs

**Status:** Accepted
**Date:** 2026-03-07
**Context:** The project needs traffic analytics (page views, unique visitors, top pages, referrers). The constraint is zero third-party dependency and no paid services.

**Options:**
1. **Custom sendBeacon to Lambda** -- Frontend fires a lightweight POST on each page view, Lambda writes to DynamoDB
2. **CloudFront access logs + Athena** -- Parse CloudFront logs for traffic data
3. **Google Analytics 4** -- Free, widely used, but third-party
4. **Plausible/Umami self-hosted** -- Open-source analytics, self-hosted

**Decision:** Option 1 -- Custom sendBeacon to Lambda.

**Rationale:**
- Zero third-party dependency (constraint). GA4 sends data to Google. Plausible/Umami require hosting infrastructure
- sendBeacon is non-blocking (does not affect page load performance), fire-and-forget, and works during page unload
- Lambda + DynamoDB is the established pattern for all data storage in this project
- CloudFront logs are delayed (up to 24 hours), require S3 + Athena setup, and are harder to query for real-time dashboards
- The custom approach stores only what we need: path, referrer, hashed visitor ID, browser family, country. No PII, no cookies, GDPR-compliant by design
- At MVP traffic volumes (~1000 views/day), DynamoDB writes cost fractions of a cent. The 90-day aggregation query processes ~90K items in <2 seconds

**Consequences:**
- The analytics beacon is a few lines of JavaScript -- minimal frontend footprint
- No consent banner needed (no cookies, no PII, no third-party data sharing)
- Visitor uniqueness is approximate (IP + user-agent hash can collide). Acceptable for business metrics
- Bot traffic must be filtered at the Lambda level (origin header check, known bot user-agent rejection)
- At high traffic (>10K views/day), the 90-day aggregation query may slow down. Solution: add a daily aggregation Lambda (deferred to post-MVP)

---

## ADR-005: GSC authentication -- service account vs. OAuth2 interactive flow

**Status:** Accepted
**Date:** 2026-03-07
**Context:** The Google Search Console API requires authentication. The admin dashboard needs to show keyword rankings, search performance, and per-page metrics from GSC.

**Options:**
1. **Service account** -- Create a GCP service account, add it as a GSC property user, authenticate with JSON key
2. **OAuth2 interactive** -- Operator authorizes via Google OAuth consent screen, store refresh token
3. **OAuth2 with offline access** -- Same as (2) but store refresh token permanently

**Decision:** Option 1 -- Service account.

**Rationale:**
- Service account authentication is serverless-friendly: the Lambda authenticates with a JSON key stored in Secrets Manager, no interactive flow needed
- Adding the service account email as a read-only user on the GSC property is a one-time manual step
- No token refresh complexity: service accounts generate short-lived tokens internally via the `googleapis` library
- OAuth2 interactive flow requires: a consent screen, a redirect URL, token storage, token refresh logic, and handling of expired/revoked tokens -- disproportionate complexity for a single integration
- The JSON key is stored in Secrets Manager (encrypted at rest), loaded once on Lambda cold start, and cached in module scope
- The service account has read-only access to the GSC property (cannot modify site settings)

**Consequences:**
- One-time manual setup: create GCP project, enable Search Console API, create service account, download key, store in Secrets Manager, add to GSC property
- If the service account key is rotated, the Secrets Manager value must be updated manually
- Service accounts cannot access GSC data for properties they are not explicitly added to -- this is a security feature
- The `googleapis` npm package adds to the Lambda bundle size (~2MB). Acceptable

---

## ADR-006: GSC data caching -- DynamoDB vs. no cache vs. S3

**Status:** Accepted
**Date:** 2026-03-07
**Context:** GSC data is 2-3 days behind. Multiple operators may view the same dashboard within a short time. The GSC API has quotas (1200 queries/min, but no reason to waste them).

**Options:**
1. **DynamoDB cache with TTL** -- Store GSC responses in DynamoDB with 6-hour expiry
2. **No cache** -- Fetch from GSC API on every dashboard load
3. **S3 cache** -- Store GSC responses as JSON files in S3
4. **Lambda in-memory cache** -- Cache in Lambda module scope (lost on cold start)

**Decision:** Option 1 -- DynamoDB cache with 6-hour TTL.

**Rationale:**
- DynamoDB is already used for all data storage in this project. No new infrastructure
- 6-hour TTL is appropriate because GSC data is already 2-3 days stale. Refreshing more often than every 6 hours provides no value
- The cache key is `PK=GSC#CACHE, SK=GSC#{queryType}#{dateRange}` -- one item per combination (e.g., `GSC#performance#28d`)
- On read: check `expiresAt > now`. If expired, fetch fresh from GSC, write cache, return. If not expired, return cached data
- S3 adds a second storage system for what is essentially a few KB of JSON. Unnecessary
- Lambda in-memory cache is lost on cold start (every 5-15 minutes of inactivity). Not durable enough
- No-cache approach would hit the GSC API on every page load, wasting API quota and adding 1-3 seconds latency

**Consequences:**
- Cache items are small (~10KB each). Storage cost is negligible
- The cache is eventually consistent: if two concurrent requests both see an expired cache, both will fetch from GSC and write. The second write wins. This is harmless -- both contain the same data
- The `cachedAt` timestamp is returned to the frontend so operators see when data was last refreshed
- A "Refresh" button in the admin can bypass the cache by deleting the cache item before fetching

---

## ADR-007: SEO override storage -- DynamoDB vs. JSON file in S3 vs. hardcoded config

**Status:** Accepted
**Date:** 2026-03-07
**Context:** Operators need to edit SEO meta tags (title, description, OG tags) for any page on the site, including existing pages (home, about, services, destinations) and blog posts. Currently, SEO tags are hardcoded in the frontend `SEO` component.

**Options:**
1. **DynamoDB items with PK=SEO#{path}** -- Store overrides in the existing table, queried at render time
2. **JSON file in S3** -- Store all overrides in a single JSON file, fetched at build time
3. **Hardcoded in frontend code** -- Continue with current approach, require deployments for changes

**Decision:** Option 1 -- DynamoDB items with PK=SEO#{path}.

**Rationale:**
- Operators can change SEO settings without a deployment -- the admin dashboard writes to DynamoDB, the frontend reads on each page load (or prerender)
- DynamoDB is consistent with all other data storage patterns in this project
- Each page has its own DynamoDB item, so overrides are independent (editing /about doesn't affect /services)
- GSI1PK=SEO#ALL allows listing all overrides in a single Query (for the admin settings page)
- A JSON file in S3 requires rebuilding and redeploying the frontend on every SEO change -- defeats the purpose of operator self-service
- Hardcoded config has the same problem as S3 but worse (requires developer involvement)
- For the prerender step, the script fetches all SEO overrides via API at build time and injects them

**Consequences:**
- The frontend SEO component needs to make an API call (or check a local cache) for the current page's override
- For prerendered pages, the prerender script fetches overrides during build -- static HTML includes correct meta tags
- For client-side navigation (blog posts loaded dynamically), react-helmet-async updates meta tags from API data
- If DynamoDB is down, the frontend falls back to hardcoded defaults in the SEO component (graceful degradation)

---

## ADR-008: Slug uniqueness enforcement -- separate item vs. GSI vs. application check

**Status:** Accepted
**Date:** 2026-03-07
**Context:** Blog post slugs must be unique (two posts cannot have the same URL). The slug is used for public reads (`GET /blog/posts/{slug}`).

**Options:**
1. **Separate SLUG#{slug} item** -- A DynamoDB item per slug, conditional PutItem for atomicity, TransactWriteItems to create blog + slug atomically
2. **GSI on slug attribute** -- Add GSI2PK=slug on the blog post item
3. **Application-level check** -- Query by slug before create, accept race condition risk

**Decision:** Option 1 -- Separate SLUG#{slug} item with TransactWriteItems.

**Rationale:**
- DynamoDB conditional writes (`attribute_not_exists(PK)`) provide atomic uniqueness guarantees -- no race conditions
- TransactWriteItems ensures the blog post and slug index are created atomically. If either fails, neither is written
- The slug index also serves as a lookup table: `GetItem PK=SLUG#{slug}` returns the blogId, enabling O(1) slug-to-post resolution for public reads
- A GSI adds cost (every blog item write is duplicated to the GSI) and still requires a Query for uniqueness checking, which is eventually consistent (could miss a concurrent write)
- Application-level check (Option 3) has a race condition: two concurrent creates with the same slug could both succeed
- The separate item pattern is well-documented for DynamoDB uniqueness constraints

**Consequences:**
- Blog post creation uses TransactWriteItems (2 items written atomically) instead of simple PutItem
- Blog post deletion uses TransactWriteItems (delete blog + delete slug) to free the slug for reuse
- Slug updates (changing a post's slug) require: delete old slug item, create new slug item, update blog item -- all in a single transaction
- TransactWriteItems costs 2x the write capacity of individual writes. Acceptable for the low write volume of blog operations

---

## ADR-009: Analytics DynamoDB partitioning -- by date vs. by page vs. single partition

**Status:** Accepted
**Date:** 2026-03-07
**Context:** Analytics page views need to be stored efficiently for both writes (high volume -- every page load) and reads (dashboard queries by date range).

**Options:**
1. **Partition by date** -- `PK=PAGEVIEW#{date}, SK=PAGEVIEW#{ts}#{ulid}` -- one partition per day
2. **Partition by page** -- `PK=PAGEVIEW#{path}, SK=PAGEVIEW#{ts}` -- one partition per page path
3. **Single partition** -- `PK=PAGEVIEW, SK=PAGEVIEW#{ts}#{ulid}` -- all page views in one partition
4. **Partition by month** -- `PK=PAGEVIEW#{yyyy-mm}, SK=PAGEVIEW#{ts}#{ulid}`

**Decision:** Option 1 -- Partition by date.

**Rationale:**
- The dashboard always queries by date range (7d, 30d, 90d). Date partitioning aligns perfectly with this access pattern
- Each day is a separate partition, so queries for "last 7 days" hit exactly 7 partitions. These can be parallelized with `Promise.all`
- Daily partitions distribute write throughput naturally -- today's writes go to one partition, no hot keys
- A single partition (Option 3) creates a hot key under sustained write load. DynamoDB throttles at ~1000 WCU per partition
- Partition by page (Option 2) misaligns with the primary access pattern (date-range queries would need to scan all page partitions)
- Partition by month (Option 4) creates hot keys on the current month's partition and makes partial-month queries less efficient
- At 1000 views/day, a daily partition has ~1000 items (well within DynamoDB's partition capacity). At 10,000 views/day, still fine

**Consequences:**
- Dashboard queries require N parallel DynamoDB Queries (one per day in the range). For 90 days, that's 90 parallel queries
- Each daily query returns all page views for that day, aggregated in memory by the Lambda
- At very high traffic (>100K views/day), individual daily partitions could become large. Mitigation: add daily aggregation Lambda to pre-compute totals (deferred to post-MVP)
- Old data can be cleaned up by deleting entire daily partitions (BatchWriteItem or TTL on items)

---

## ADR-010: Blog image serving -- separate CloudFront vs. existing CloudFront vs. S3 direct

**Status:** Accepted
**Date:** 2026-03-07
**Context:** Processed blog images (WebP) need to be served to visitors. The images are stored in S3 (`tropico-blog-images-{env}/processed/`).

**Options:**
1. **Separate CloudFront distribution** -- `images.tropicoretreat.com` pointing to the blog images S3 bucket
2. **Existing CloudFront** -- Serve images from the main `tropicoretreat.com` CloudFront via a `/images/` path behavior
3. **S3 direct** -- Public S3 bucket URL with CORS headers

**Decision:** Option 1 -- Separate CloudFront distribution.

**Rationale:**
- A separate domain (`images.tropicoretreat.com`) cleanly separates static content from application routes
- The existing CloudFront for `tropicoretreat.com` uses SPA routing (403/404 -> /index.html). Adding an `/images/` path behavior would conflict with this
- S3 direct access (Option 3) has no CDN caching, no HTTPS with custom domain, and no security headers
- Separate CloudFront allows optimized cache policies for images (long TTL, immutable headers) independent of the SPA cache policy
- The ACM wildcard certificate (`*.tropicoretreat.com`) already covers `images.tropicoretreat.com`
- OAC (Origin Access Control) restricts S3 access to CloudFront only -- images cannot be accessed directly from S3

**Consequences:**
- One additional CloudFront distribution ($0.01 per 10K requests -- negligible for blog images)
- One additional Route53 A record for `images.tropicoretreat.com`
- Blog post `heroImageUrl` stores the full CloudFront URL: `https://images.tropicoretreat.com/processed/{ulid}/hero.webp`
- Staging uses `staging-images.tropicoretreat.com`

---

## ADR-011: Admin navigation -- sidebar vs. header tabs vs. dropdown menu

**Status:** Accepted
**Date:** 2026-03-07
**Context:** The current admin dashboard has a simple header bar with "Tropico Retreats" title, user email, and sign-out button. Navigation between sections (currently only "Leads") is implicit. Adding 6+ new sections (blog, analytics, SEO, keywords, content) requires explicit navigation.

**Options:**
1. **Sidebar with icons + labels** -- Fixed sidebar on desktop, collapsible on mobile
2. **Header tabs** -- Horizontal tab bar below the header
3. **Dropdown menu** -- Hamburger menu in the header

**Decision:** Option 1 -- Sidebar with icons + labels.

**Rationale:**
- Sidebar is the standard pattern for admin dashboards with 5+ sections
- Icons provide visual scanning; labels provide clarity. Both together support both novice and experienced users
- Sidebar scales to 10+ sections without redesign (future sections like CRM email settings, user management)
- Header tabs (Option 2) don't scale past ~5 items on smaller screens
- Dropdown menu (Option 3) hides navigation behind a click -- less discoverable, worse for frequent navigation
- The sidebar collapses to icons-only on mobile, preserving screen real estate
- Existing `AppShell.tsx` wraps all authenticated routes -- the sidebar is added here

**Consequences:**
- AppShell component needs significant refactoring (add sidebar layout, adjust main content area)
- Each section gets an icon from `lucide-react` (already a project dependency)
- Active section highlighted in sidebar
- Sidebar state (expanded/collapsed) persisted to localStorage
- Mobile: sidebar becomes a slide-out drawer with overlay

---

## ADR-012: Blog editor layout -- side-by-side vs. stacked vs. tabbed

**Status:** Accepted
**Date:** 2026-03-07
**Context:** The blog editor needs to show a Markdown input area and a live preview. Operators need to see what their content looks like as they type.

**Options:**
1. **Side-by-side** -- Markdown textarea on the left, rendered preview on the right
2. **Stacked** -- Markdown on top, preview below (or vice versa)
3. **Tabbed** -- Toggle between "Write" and "Preview" tabs

**Decision:** Option 1 -- Side-by-side.

**Rationale:**
- Side-by-side is the established pattern for Markdown editors (GitHub, StackEdit, HackMD, Obsidian)
- Operators see the rendered output immediately while typing -- no context switching
- Stacked (Option 2) pushes the preview off-screen as the Markdown grows, requiring scrolling
- Tabbed (Option 3) requires clicking to see the preview -- interrupts the writing flow
- The admin dashboard is primarily used on desktop (operators managing content are at their desks), so horizontal space is available
- On narrow screens, the layout can stack (responsive) or collapse to tabbed

**Consequences:**
- Each pane takes ~50% of the editor width. The Markdown pane can be resizable (drag handle) as a future enhancement
- Both panes scroll independently -- the preview auto-scrolls to match the edit position (approximate sync)
- The preview pane uses the same `react-markdown` renderer as the public blog post page (consistent rendering)

---

## ADR-013: Visitor uniqueness -- hashed IP vs. cookies vs. fingerprinting library

**Status:** Accepted
**Date:** 2026-03-07
**Context:** The analytics dashboard needs to show "unique visitors." Since we don't use any third-party analytics, we need our own mechanism to distinguish visitors.

**Options:**
1. **Hash of IP + user-agent** -- SHA256(sourceIp + userAgent), stored as visitorId. No cookies, no PII
2. **Cookie-based** -- Set a first-party cookie with a UUID, use as visitor ID
3. **Fingerprinting library** -- Use fingerprint.js to generate a browser fingerprint
4. **localStorage-based** -- Store a UUID in localStorage, use as visitor ID

**Decision:** Option 1 -- Hash of IP + user-agent.

**Rationale:**
- No cookies means no consent banner (GDPR, ePrivacy Directive). The site serves UK/EU corporate clients where cookie consent is legally required
- The hash is one-way (SHA256) -- the original IP address cannot be recovered, so it is not PII under GDPR
- User-agent adds differentiation: multiple people behind the same corporate IP (same public IP, different browsers/devices) get different hashes
- Fingerprint.js (Option 3) is a 50KB library that collects canvas rendering, WebGL info, fonts, etc. -- invasive and unnecessary for approximate unique visitor counts
- Cookie-based (Option 2) is more accurate but requires a consent banner, which adds friction for all site visitors
- localStorage (Option 4) doesn't survive incognito mode, clears on browser data clear, and varies by origin
- The hash-based approach underestimates unique visitors slightly (same device + network = same hash across days) -- this is acceptable for business metrics

**Consequences:**
- "Unique visitors" is approximate, not exact. Documented in the dashboard UI
- Multiple people on the same network with the same browser version will be counted as one visitor
- VPN users may appear as different visitors when their IP changes
- The hash is generated server-side (Lambda has access to source IP from API Gateway context), so no client-side computation needed

---

## ADR-014: Backlink tracking -- deferred vs. manual entry vs. GSC links report

**Status:** Accepted
**Date:** 2026-03-07
**Context:** The original MVP scope included "View backlink report" as User Action 5. Research revealed that the GSC API does not expose its Links report programmatically.

**Options:**
1. **Defer entirely** -- Replace User Action 5 with "Content performance" (traffic + GSC per blog post)
2. **Manual entry tracker** -- Admin form to manually add/remove backlink entries
3. **Free third-party API** -- Use a free backlink checker API (limited data, rate limits)

**Decision:** Option 1 -- Defer backlink tracking, replace with content performance.

**Rationale:**
- The GSC API does not expose backlink data programmatically (the Links report is web UI only)
- Manual entry of backlinks is tedious and unlikely to be maintained by non-technical operators
- Free third-party backlink APIs (e.g., Ahrefs free tier, Moz free tier) provide limited data and require separate account management
- Content performance (which blog posts get the most traffic + best keyword rankings) is directly actionable -- operators can see which content topics work and where to focus writing effort
- The content performance dashboard combines two data sources we already have (custom analytics + GSC per-page data), so it is efficient to build
- Backlink tracking can be revisited when the team has more SEO maturity and the data would be actionable

**Consequences:**
- No backlink data in the MVP dashboard
- Operators can still see backlink data manually via the GSC web UI
- The "Content Performance" page provides more actionable insights for content-driven SEO strategy

---

## ADR-015: Prerender strategy for blogs -- expand existing script vs. SSR vs. static site generator

**Status:** Accepted
**Date:** 2026-03-07
**Context:** Blog posts must be prerendered for SEO (search engines need HTML with meta tags and content, not just a JavaScript bundle). The existing frontend uses `@prerenderer/prerenderer` with Puppeteer to prerender a fixed list of routes at build time.

**Options:**
1. **Expand existing prerender script** -- Fetch published blog slugs from API, add to routes list, prerender each
2. **Server-side rendering (SSR)** -- Move to Next.js or similar SSR framework
3. **Static site generator** -- Use Astro, Eleventy, or similar for the blog section
4. **Lambda@Edge SSR** -- Lambda@Edge renders blog pages on CloudFront cache miss

**Decision:** Option 1 -- Expand existing prerender script.

**Rationale:**
- The existing prerender script works well for the current 10 static routes. Extending it to fetch dynamic blog routes is a natural, minimal change
- SSR (Option 2) requires migrating the entire frontend from Webpack to Next.js -- a massive scope change for one feature
- A separate static site generator (Option 3) creates a parallel build system, increasing maintenance burden
- Lambda@Edge (Option 4) adds significant infrastructure complexity (CloudFront Functions, cache management, cold start latency)
- The prerender script runs at build time: (1) fetch published blog slugs from API, (2) add `/blog/{slug}` to routes list, (3) prerender all routes with Puppeteer
- SEO overrides are fetched at prerender time and applied to the rendered HTML
- Build time increases linearly with blog post count. At <50 posts, build time is acceptable (<5 minutes)

**Consequences:**
- New blog posts require a frontend rebuild and redeploy to appear in prerendered form. Until redeployed, the post is still accessible via client-side routing (React loads the post via API) but may not have optimal SEO
- The Makefile deploy sequence already builds frontend before deploy -- no workflow changes needed
- If post count grows significantly (>100), prerender time may become a concern. Mitigation: incremental prerendering (only new/changed posts) as a future enhancement

---

## ADR-016: Terraform file organization -- feature-grouped vs. extend existing files

**Status:** Accepted
**Date:** 2026-03-07
**Context:** The SEO growth engine adds significant new infrastructure: 5 Lambda functions, 1 S3 bucket, 1 CloudFront distribution, 12 API Gateway routes, IAM roles/policies, and a Secrets Manager secret. The existing Terraform follows a flat file structure in `infra/api/`.

**Options:**
1. **Feature-grouped files** -- `blog.tf`, `analytics.tf`, `gsc.tf` for feature-specific resources, extend `iam.tf` and `main.tf` for cross-cutting concerns
2. **Extend existing files** -- Add all new Lambdas to `lambda.tf`, all routes to `main.tf`, etc.
3. **Terraform modules** -- Create a `blog/`, `analytics/`, `gsc/` submodule per feature

**Decision:** Option 1 -- Feature-grouped files.

**Rationale:**
- Feature-grouped files keep related infrastructure together (blog Lambda + S3 bucket + event notification in one file)
- This matches the precedent set by `notifications.tf` (notifications Lambda + DynamoDB Streams + DLQ in one file)
- Extending existing files (Option 2) would make `lambda.tf` unwieldy (~500+ lines with 9 total Lambda functions)
- Submodules (Option 3) add dependency management complexity between modules for a codebase that is already a single team
- Cross-cutting concerns (IAM roles, API Gateway routes) remain in their existing files (`iam.tf`, `main.tf`) for consistency
- New root-level files (`blog-cloudfront.tf`, `blog-route53.tf`) for resources that belong to the root Terraform module (CloudFront, Route53 are managed at root level, not in the api submodule)

**Consequences:**
- Three new files in `infra/api/`: `blog.tf`, `analytics.tf`, `gsc.tf`
- Two new files in `infra/`: `blog-cloudfront.tf`, `blog-route53.tf`
- `infra/api/iam.tf` extended with 4 new IAM roles + policies (one per Lambda, plus one shared by blog+seo)
- `infra/api/main.tf` extended with 12 new API Gateway routes + integrations

---

## Decision Summary

| # | Decision | Choice |
|---|---|---|
| ADR-001 | Blog/SEO/analytics storage table | Existing single-table (extended with new PK prefixes) |
| ADR-002 | Content authoring format | Markdown with live preview |
| ADR-003 | Image processing approach | Lambda + sharp (S3 event-driven) |
| ADR-004 | Analytics tracking method | Custom sendBeacon to Lambda + DynamoDB |
| ADR-005 | GSC authentication | Service account (no interactive OAuth) |
| ADR-006 | GSC data caching | DynamoDB cache with 6-hour TTL |
| ADR-007 | SEO override storage | DynamoDB items (PK=SEO#{path}) |
| ADR-008 | Slug uniqueness enforcement | Separate SLUG#{slug} item with TransactWriteItems |
| ADR-009 | Analytics DynamoDB partitioning | Partition by date (PK=PAGEVIEW#{date}) |
| ADR-010 | Blog image serving | Separate CloudFront distribution (images.tropicoretreat.com) |
| ADR-011 | Admin navigation | Sidebar with icons + labels, collapsible on mobile |
| ADR-012 | Blog editor layout | Side-by-side (Markdown left, preview right) |
| ADR-013 | Visitor uniqueness | Hash of IP + user-agent (SHA256, no cookies, no PII) |
| ADR-014 | Backlink tracking | Deferred; replaced with content performance dashboard |
| ADR-015 | Prerender strategy for blogs | Expand existing prerender script |
| ADR-016 | Terraform file organization | Feature-grouped (blog.tf, analytics.tf, gsc.tf) |
