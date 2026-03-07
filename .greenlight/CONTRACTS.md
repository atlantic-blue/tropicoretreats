# SEO Growth Engine Typed Contracts

Every boundary in the SEO Growth Engine MVP is defined below with TypeScript types, Zod schemas, input/output shapes, and error cases. These contracts are the source of truth for test writers and implementers.

---

## Slice 1: Blog CMS (Create + Publish + Render)

### Contract: BlogPostSchema

**Boundary:** Service -> Database
**Slice:** S-1

**Input:**
```typescript
interface BlogPostItem {
  PK: string;                // BLOG#{id}
  SK: string;                // BLOG#{id}
  GSI1PK: string;            // BLOG#PUBLISHED (only when status=published)
  GSI1SK: string;            // {publishedAt ISO 8601}
  id: string;                // ULID
  title: string;
  slug: string;              // URL-safe, lowercase [a-z0-9-], max 200 chars
  content: string;           // Markdown, max 100KB
  excerpt: string;           // Auto-generated, first ~200 chars of plain text
  heroImageUrl: string;      // CloudFront URL of processed hero WebP (or empty)
  metaTitle: string;         // Defaults to title
  metaDescription: string;   // Defaults to excerpt
  ogImageUrl: string;        // Defaults to heroImageUrl
  authorName: string;        // Operator name from JWT claims
  authorOrg: string;         // "Tropico Retreats"
  status: "published" | "deleted";
  publishedAt: string;       // ISO 8601
  createdAt: string;         // ISO 8601
  updatedAt: string;         // ISO 8601
}

interface SlugIndexItem {
  PK: string;                // SLUG#{slug}
  SK: string;                // SLUG#{slug}
  slug: string;
  blogId: string;            // ULID of the blog post
}
```

**Output:** N/A (schema definition)

**Errors:** N/A

**Invariants:**
- Blog post PK/SK always uses format `BLOG#{id}`
- Slug index PK/SK always uses format `SLUG#{slug}`
- GSI1PK is set to `BLOG#PUBLISHED` only when status is `published`; removed on delete
- Slugs are globally unique, enforced by conditional PutItem on slug index
- Blog post and slug index are created/deleted atomically via TransactWriteItems
- All timestamps are UTC ISO 8601
- IDs are ULIDs

**Security:**
- Auth: N/A (data schema)
- Input validation: Zod schemas enforce constraints at API boundary

**Verification:** auto
**Dependencies:** None

---

### Contract: CreateBlogPost

**Boundary:** Client -> API
**Slice:** S-1

**Input:**
```typescript
// POST /v1/blog/posts (JWT required)

import { z } from 'zod';

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const CreateBlogPostSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().regex(slugPattern).max(200).optional(),  // Auto-generated from title if absent
  content: z.string().min(1).max(102_400),                  // 100KB
  heroImageUrl: z.string().url().optional(),
  metaTitle: z.string().max(70).optional(),                  // Defaults to title
  metaDescription: z.string().max(160).optional(),           // Defaults to auto excerpt
  ogImageUrl: z.string().url().optional(),                   // Defaults to heroImageUrl
});

type CreateBlogPostInput = z.infer<typeof CreateBlogPostSchema>;
```

**Output:**
```typescript
// Response 201
interface CreateBlogPostResponse {
  post: {
    id: string;
    title: string;
    slug: string;
    content: string;
    excerpt: string;
    heroImageUrl: string;
    metaTitle: string;
    metaDescription: string;
    ogImageUrl: string;
    authorName: string;
    authorOrg: string;
    status: "published";
    publishedAt: string;
    createdAt: string;
    updatedAt: string;
  };
}
```

**Errors:**
| Error | Status | When |
|-------|--------|------|
| ValidationError | 400 | Missing/invalid fields per Zod schema |
| SlugExistsError | 409 | Slug already taken by another post |
| ServerError | 500 | DynamoDB or internal failure |

**Invariants:**
- Slug is auto-generated from title (lowercase, hyphens, alphanumeric) if not provided
- Slug must not start or end with a hyphen
- Author name extracted from JWT claims (`event.requestContext.authorizer.jwt.claims`)
- Author org is always "Tropico Retreats"
- Blog post and slug index created atomically (TransactWriteItems)
- Excerpt auto-generated from content plain text (first ~200 chars)
- Response never contains DynamoDB key fields (PK, SK, GSI1PK, GSI1SK)

**Security:**
- Auth: JWT required (Cognito)
- Input validation: Zod schema, content max 100KB, slug pattern enforced
- Rate limit: API Gateway default (10 req/s)

**Verification:** verify
**Acceptance Criteria:**
- POST with valid blog data returns 201 with the full blog post object
- Auto-generated slug from title matches expected pattern (lowercase, hyphens)
- Duplicate slug returns 409 error
- Missing required fields return 400 with field-level error details
**Steps:**
- Send POST /v1/blog/posts with title "Test Post" and content "Hello world"
- Verify 201 response contains slug "test-post", excerpt, and publishedAt
- Send same request again and verify 409 slug conflict

**Dependencies:** [BlogPostSchema]

---

### Contract: UpdateBlogPost

**Boundary:** Client -> API
**Slice:** S-1

**Input:**
```typescript
// PUT /v1/blog/posts/{id} (JWT required)

export const UpdateBlogPostSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  slug: z.string().regex(slugPattern).max(200).optional(),
  content: z.string().min(1).max(102_400).optional(),
  heroImageUrl: z.string().url().optional(),
  metaTitle: z.string().max(70).optional(),
  metaDescription: z.string().max(160).optional(),
  ogImageUrl: z.string().url().optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided',
});

type UpdateBlogPostInput = z.infer<typeof UpdateBlogPostSchema>;
```

**Output:**
```typescript
// Response 200
interface UpdateBlogPostResponse {
  post: {
    id: string;
    title: string;
    slug: string;
    content: string;
    excerpt: string;
    heroImageUrl: string;
    metaTitle: string;
    metaDescription: string;
    ogImageUrl: string;
    authorName: string;
    authorOrg: string;
    status: "published";
    publishedAt: string;
    createdAt: string;
    updatedAt: string;
  };
}
```

**Errors:**
| Error | Status | When |
|-------|--------|------|
| ValidationError | 400 | Invalid fields or empty update body |
| NotFoundError | 404 | Post with given ID does not exist or is deleted |
| SlugExistsError | 409 | New slug already taken by another post |
| ServerError | 500 | DynamoDB or internal failure |

**Invariants:**
- If slug changes: old slug index deleted, new slug index created, blog post updated -- all atomically (TransactWriteItems)
- If content changes: excerpt is re-generated
- updatedAt is always refreshed
- Cannot update a deleted post (returns 404)

**Security:**
- Auth: JWT required (Cognito)
- Input validation: Zod schema, at least one field required

**Verification:** verify
**Acceptance Criteria:**
- PUT with partial fields updates only those fields
- Slug change frees old slug and reserves new slug atomically
- Updating a non-existent post returns 404

**Dependencies:** [BlogPostSchema, CreateBlogPost]

---

### Contract: DeleteBlogPost

**Boundary:** Client -> API
**Slice:** S-1

**Input:**
```typescript
// DELETE /v1/blog/posts/{id} (JWT required)
// Path parameter: id (ULID)
```

**Output:**
```typescript
// Response 200
interface DeleteBlogPostResponse {
  message: "Post deleted";
}
```

**Errors:**
| Error | Status | When |
|-------|--------|------|
| NotFoundError | 404 | Post with given ID does not exist or already deleted |
| ServerError | 500 | DynamoDB or internal failure |

**Invariants:**
- Soft delete: sets status to "deleted", removes GSI1PK (disappears from published listing)
- Slug index item is deleted (frees slug for reuse)
- Blog post item and slug deletion are atomic (TransactWriteItems)
- Deleted posts are not accessible via public read endpoints

**Security:**
- Auth: JWT required (Cognito)

**Verification:** verify
**Acceptance Criteria:**
- DELETE returns 200 and the post no longer appears in public listing
- The deleted post's slug is freed and can be reused by a new post
- Deleting a non-existent post returns 404

**Dependencies:** [BlogPostSchema, CreateBlogPost]

---

### Contract: ListPublishedPosts

**Boundary:** Client -> API (public)
**Slice:** S-1

**Input:**
```typescript
// GET /v1/blog/posts (No auth)
// Query parameters:
interface ListPublishedPostsParams {
  limit?: number;   // 1-50, default 20
  cursor?: string;  // base64-encoded pagination key
}
```

**Output:**
```typescript
// Response 200
interface ListPublishedPostsResponse {
  posts: Array<{
    id: string;
    title: string;
    slug: string;
    excerpt: string;
    heroImageUrl: string;
    authorName: string;
    authorOrg: string;
    publishedAt: string;
  }>;
  nextCursor?: string;
}
```

**Errors:**
| Error | Status | When |
|-------|--------|------|
| ValidationError | 400 | Invalid limit or malformed cursor |
| ServerError | 500 | DynamoDB or internal failure |

**Invariants:**
- Only published posts are returned (not deleted)
- Posts are returned in reverse chronological order (newest first)
- Response does not include content field (list is lightweight)
- Pagination uses base64-encoded DynamoDB LastEvaluatedKey
- Query uses GSI1 with GSI1PK = BLOG#PUBLISHED, ScanIndexForward = false

**Security:**
- Auth: public (no auth required)
- Input validation: limit clamped to 1-50
- Rate limit: API Gateway default

**Verification:** verify
**Acceptance Criteria:**
- GET /v1/blog/posts returns published posts in reverse chronological order
- Pagination cursor enables fetching the next page
- Deleted posts do not appear in the listing
- Response includes excerpt but not full content

**Dependencies:** [BlogPostSchema, CreateBlogPost]

---

### Contract: GetPostBySlug

**Boundary:** Client -> API (public)
**Slice:** S-1

**Input:**
```typescript
// GET /v1/blog/posts/{slug} (No auth)
// Path parameter: slug (URL-safe string)
```

**Output:**
```typescript
// Response 200
interface GetPostBySlugResponse {
  post: {
    id: string;
    title: string;
    slug: string;
    content: string;          // Full Markdown content
    excerpt: string;
    heroImageUrl: string;
    metaTitle: string;
    metaDescription: string;
    ogImageUrl: string;
    authorName: string;
    authorOrg: string;
    publishedAt: string;
    updatedAt: string;
  };
}
```

**Errors:**
| Error | Status | When |
|-------|--------|------|
| NotFoundError | 404 | No published post with given slug |
| ServerError | 500 | DynamoDB or internal failure |

**Invariants:**
- Slug lookup uses GetItem on SLUG#{slug} to find blogId, then GetItem on BLOG#{blogId}
- Deleted posts return 404 (same as non-existent)
- Full Markdown content is returned for rendering
- Response includes SEO meta fields for the frontend SEO component

**Security:**
- Auth: public (no auth required)
- Rate limit: API Gateway default

**Verification:** verify
**Acceptance Criteria:**
- GET /v1/blog/posts/valid-slug returns the full post with content
- GET /v1/blog/posts/nonexistent returns 404
- Response includes metaTitle and metaDescription for SEO

**Dependencies:** [BlogPostSchema, CreateBlogPost]

---

### Contract: BlogAdminHandler

**Boundary:** API Gateway -> Lambda
**Slice:** S-1

**Input:**
```typescript
// Multi-route Lambda handler matching existing leadsAdmin pattern
// Handler: backend/src/handlers/blogAdmin.ts
// Routes:
//   GET  /blog/posts          -> handleListPosts (public, no auth)
//   GET  /blog/posts/{slug}   -> handleGetPost (public, no auth)
//   POST /blog/posts          -> handleCreatePost (JWT required)
//   PUT  /blog/posts/{id}     -> handleUpdatePost (JWT required)
//   DELETE /blog/posts/{id}   -> handleDeletePost (JWT required)
//   POST /blog/images         -> handlePresignImage (JWT required)

import type { APIGatewayProxyEventV2, APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';

type BlogAdminHandler = (
  event: APIGatewayProxyEventV2 | APIGatewayProxyEventV2WithJWTAuthorizer
) => Promise<APIGatewayProxyResultV2>;
```

**Output:** Delegates to individual route handlers (see individual contracts)

**Errors:**
| Error | Status | When |
|-------|--------|------|
| MethodNotAllowed | 405 | Unrecognized method + path combination |

**Invariants:**
- Routes method + path matching via the same pattern as leadsAdmin.ts
- Public routes (GET) do not require JWT claims
- Admin routes (POST, PUT, DELETE) extract author from JWT claims
- All responses use existing response helpers (ok, created, badRequest, notFound, serverError)
- Environment variable TABLE_NAME provides DynamoDB table name
- Handler is added to esbuild.config.js entry points
- Output: backend/dist/blogAdmin.mjs

**Security:**
- Auth: mixed (public reads, JWT for writes)

**Verification:** auto
**Dependencies:** [CreateBlogPost, UpdateBlogPost, DeleteBlogPost, ListPublishedPosts, GetPostBySlug, PresignImageUpload]

---

### Contract: BlogDynamoDBFunctions

**Boundary:** Service -> Database
**Slice:** S-1

**Input:**
```typescript
// Functions added to backend/src/lib/dynamodb.ts

// Create blog post + slug index atomically
type PutBlogPost = (post: BlogPostItem, slugItem: SlugIndexItem) => Promise<void>;
// TransactWriteItems: conditional PutItem on slug (attribute_not_exists(PK))

// Get blog post by ID
type GetBlogPost = (id: string) => Promise<BlogPostItem | null>;
// GetItem: PK=BLOG#{id}, SK=BLOG#{id}

// Get blog post by slug (two-step: slug index -> blog post)
type GetBlogPostBySlug = (slug: string) => Promise<BlogPostItem | null>;
// GetItem: PK=SLUG#{slug} -> blogId -> GetItem: PK=BLOG#{blogId}

// List published posts (paginated, newest first)
type ListPublishedBlogPosts = (params: {
  limit?: number;
  cursor?: string;
}) => Promise<{ posts: BlogPostItem[]; nextCursor?: string }>;
// Query GSI1: GSI1PK=BLOG#PUBLISHED, ScanIndexForward=false

// Update blog post (partial update)
type UpdateBlogPost = (id: string, updates: Partial<BlogPostItem>, slugChange?: {
  oldSlug: string;
  newSlugItem: SlugIndexItem;
}) => Promise<BlogPostItem>;
// If slug change: TransactWriteItems (delete old slug, create new slug, update post)
// If no slug change: UpdateItem with expression

// Soft delete blog post + remove slug index
type DeleteBlogPost = (id: string, slug: string) => Promise<void>;
// TransactWriteItems: update post (status=deleted, remove GSI1PK) + delete slug item
```

**Output:** As specified per function signature

**Errors:**
| Error | Status | When |
|-------|--------|------|
| TransactionCanceledException | N/A | Slug already exists (conditional check failure) |
| ConditionalCheckFailedException | N/A | Post not found during update/delete |

**Invariants:**
- All blog DynamoDB functions use the existing docClient singleton and TABLE_NAME
- TransactWriteItems used whenever slug + post must be consistent
- Cursor is base64-encoded JSON of DynamoDB LastEvaluatedKey

**Security:**
- Auth: N/A (internal service boundary)
- Input validation: Callers validate before invoking

**Verification:** auto
**Dependencies:** [BlogPostSchema]

---

### Contract: BlogAdminApiClient

**Boundary:** Admin Frontend -> API
**Slice:** S-1

**Input:**
```typescript
// admin/src/api/blog.ts — parallel to admin/src/api/leads.ts

import { fetchWithAuth } from './client';

export const blogApi = {
  list: (params?: { limit?: number; cursor?: string }): Promise<ListPublishedPostsResponse> => {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.cursor) searchParams.set('cursor', params.cursor);
    const query = searchParams.toString();
    return fetchWithAuth<ListPublishedPostsResponse>(`/blog/posts${query ? `?${query}` : ''}`);
  },

  get: (slug: string): Promise<GetPostBySlugResponse> =>
    fetchWithAuth<GetPostBySlugResponse>(`/blog/posts/${slug}`),

  create: (data: CreateBlogPostInput): Promise<CreateBlogPostResponse> =>
    fetchWithAuth<CreateBlogPostResponse>('/blog/posts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: UpdateBlogPostInput): Promise<UpdateBlogPostResponse> =>
    fetchWithAuth<UpdateBlogPostResponse>(`/blog/posts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string): Promise<DeleteBlogPostResponse> =>
    fetchWithAuth<DeleteBlogPostResponse>(`/blog/posts/${id}`, {
      method: 'DELETE',
    }),

  presignImage: (data: PresignImageInput): Promise<PresignImageResponse> =>
    fetchWithAuth<PresignImageResponse>('/blog/images', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
```

**Output:** Type-safe API client matching backend contracts

**Errors:** Throws Error with message from API response (matching existing fetchWithAuth pattern)

**Invariants:**
- Uses existing fetchWithAuth pattern (auto-injects JWT)
- All paths prefixed with /blog/
- Consistent with existing leadsApi and emailsApi patterns

**Security:**
- Auth: fetchWithAuth auto-injects Cognito JWT

**Verification:** auto
**Dependencies:** [CreateBlogPost, UpdateBlogPost, DeleteBlogPost, ListPublishedPosts, GetPostBySlug, PresignImageUpload]

---

### Contract: BlogQueryHooks

**Boundary:** Admin Components -> API Client
**Slice:** S-1

**Input:**
```typescript
// admin/src/hooks/useBlog.ts

// List posts with pagination
function useBlogPosts(params?: { limit?: number; cursor?: string }): UseQueryResult<ListPublishedPostsResponse>;
// Query key: ['blog-posts', params]
// staleTime: 5 * 60 * 1000 (matching existing pattern)

// Get single post for editing
function useBlogPost(slug: string): UseQueryResult<GetPostBySlugResponse>;
// Query key: ['blog-post', slug]

// Create post mutation
function useCreateBlogPost(): UseMutationResult<CreateBlogPostResponse, Error, CreateBlogPostInput>;
// onSettled: invalidate ['blog-posts']

// Update post mutation
function useUpdateBlogPost(id: string): UseMutationResult<UpdateBlogPostResponse, Error, UpdateBlogPostInput>;
// Optimistic update on ['blog-post', slug]
// onSettled: invalidate ['blog-posts'], ['blog-post', slug]

// Delete post mutation
function useDeleteBlogPost(): UseMutationResult<DeleteBlogPostResponse, Error, string>;
// onSettled: invalidate ['blog-posts']
```

**Output:** TanStack Query hooks with proper cache invalidation

**Errors:** Standard TanStack Query error handling (error state on UseQueryResult/UseMutationResult)

**Invariants:**
- Follows existing useLeads/useLeadMutations patterns
- Optimistic updates for edit operations
- Cache invalidation on mutations
- Query keys are stable and predictable

**Security:**
- Auth: Inherits from blogApi (fetchWithAuth)

**Verification:** auto
**Dependencies:** [BlogAdminApiClient]

---

### Contract: BlogEditorPage

**Boundary:** User -> Admin Dashboard
**Slice:** S-1

**Input:**
```typescript
// Admin routes:
//   /blog           -> BlogListPage (list posts, link to create)
//   /blog/new       -> BlogEditorPage (create mode)
//   /blog/:id/edit  -> BlogEditorPage (edit mode)

interface BlogEditorPageProps {
  mode: 'create' | 'edit';
  postId?: string;  // Present when mode=edit
}
```

**Output:** Visual page rendering

**Errors:** N/A (UI component)

**Invariants:**
- Side-by-side layout: Markdown textarea left, rendered preview right (ADR-012)
- Preview uses react-markdown with remark-gfm (same renderer as public blog)
- Hero image uploaded via dedicated file picker (calls presignImage, then uploads to presigned URL)
- Slug auto-generated from title, editable before publish
- SEO meta fields (metaTitle, metaDescription) displayed below content editor
- Publish button creates post and navigates to blog list
- On narrow screens, layout stacks or becomes tabbed

**Security:**
- Auth: Page behind AppShell auth guard
- Input validation: Client-side validation before API call

**Verification:** verify
**Acceptance Criteria:**
- Editor displays side-by-side Markdown input and live preview
- Typing Markdown in the textarea updates the preview in real time
- Hero image upload button triggers file picker and shows uploaded image
- Slug field auto-populates from title and is editable
- Publish button sends request and navigates to blog list on success
**Steps:**
- Navigate to /blog/new in admin dashboard
- Type "# Hello World" in the Markdown textarea
- Verify preview pane shows rendered heading
- Fill in title, verify slug field auto-populates
- Click Publish and verify redirect to /blog

**Dependencies:** [BlogQueryHooks, BlogAdminApiClient]

---

### Contract: BlogPublicPages

**Boundary:** User -> Public Frontend
**Slice:** S-1

**Input:**
```typescript
// Frontend routes:
//   /blog          -> BlogIndexPage (card grid of published posts)
//   /blog/:slug    -> BlogPostPage (full post with Markdown rendering)

// Route enum additions in frontend/src/Routes/appRoutes.tsx:
// BLOG_INDEX = '/blog'
// BLOG_POST = '/blog/:slug'
```

**Output:** Visual page rendering

**Errors:** N/A (UI component)

**Invariants:**
- Blog index shows cards with hero thumbnails, titles, excerpts, and publishedAt
- Blog post page renders Markdown content via react-markdown (no raw HTML allowed)
- Blog post page includes structured data (BlogPosting JSON-LD)
- Blog post page uses react-helmet-async for meta tags (metaTitle, metaDescription, ogImageUrl)
- Blog post page shows 404 page when slug not found
- Blog pages added to frontend/src/Routes/appRoutes.tsx enum and router.tsx

**Security:**
- Auth: public (no auth)
- Markdown rendered with react-markdown (strips raw HTML by default, preventing XSS)

**Verification:** verify
**Acceptance Criteria:**
- /blog displays a card grid of published posts with hero thumbnails
- Clicking a card navigates to /blog/{slug}
- Blog post page renders Markdown content correctly (headings, links, images, code blocks)
- Page source includes JSON-LD structured data for BlogPosting
- Non-existent slug shows 404 page
**Steps:**
- Create a blog post via admin, then visit /blog on the public frontend
- Click the post card and verify the full content renders at /blog/{slug}
- View page source and verify JSON-LD and meta tags are present

**Dependencies:** [ListPublishedPosts, GetPostBySlug]

---

### Contract: AdminSidebarNav

**Boundary:** User -> Admin Dashboard
**Slice:** S-1

**Input:**
```typescript
// Sidebar navigation sections (ADR-011):
interface NavItem {
  path: string;
  label: string;
  icon: string;  // lucide-react icon name
}

const navItems: NavItem[] = [
  { path: '/leads', label: 'Leads', icon: 'Users' },
  { path: '/blog', label: 'Blog', icon: 'FileText' },
  { path: '/analytics', label: 'Analytics', icon: 'BarChart3' },
  { path: '/seo', label: 'SEO', icon: 'Search' },
  { path: '/gsc', label: 'Keywords', icon: 'TrendingUp' },
  { path: '/content', label: 'Content', icon: 'PieChart' },
];
```

**Output:** Sidebar layout in AppShell

**Errors:** N/A (UI component)

**Invariants:**
- Sidebar replaces the current minimal header navigation
- Active section is visually highlighted
- Sidebar collapses to icons-only on mobile
- Sidebar state (expanded/collapsed) persisted to localStorage
- AppShell.tsx refactored to include sidebar layout

**Security:**
- Auth: Inside AppShell auth guard (all nav items require authentication)

**Verification:** verify
**Acceptance Criteria:**
- Sidebar displays all six navigation items with icons and labels
- Active route is visually highlighted in the sidebar
- Sidebar collapses to icon-only on narrow viewports
- Clicking each nav item navigates to the correct page
**Steps:**
- Log in to admin dashboard
- Verify sidebar is visible with all six items
- Click "Blog" and verify navigation to /blog
- Resize browser to narrow width and verify sidebar collapses

**Dependencies:** None

---

## Slice 2: Image Pipeline

### Contract: PresignImageUpload

**Boundary:** Client -> API
**Slice:** S-2

**Input:**
```typescript
// POST /v1/blog/images (JWT required)

export const ImageUploadSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  purpose: z.enum(['hero', 'inline']),
});

type PresignImageInput = z.infer<typeof ImageUploadSchema>;
```

**Output:**
```typescript
// Response 200
interface PresignImageResponse {
  uploadUrl: string;         // Presigned PUT URL (5 min expiry)
  imageUrl: string;          // Final CloudFront URL of processed image
  key: string;               // S3 key (uploads/{ulid}/{filename})
}
```

**Errors:**
| Error | Status | When |
|-------|--------|------|
| ValidationError | 400 | Invalid contentType or missing fields |
| ServerError | 500 | S3 presign failure |

**Invariants:**
- Presigned URL expires in 5 minutes
- Content-type restricted to image/jpeg, image/png, image/webp, image/gif
- Max file size enforced via presigned URL content-length condition (10 MB)
- S3 key pattern: `uploads/{ulid}/{filename}`
- imageUrl returns the expected CloudFront URL for the processed version: `https://images.tropicoretreat.com/processed/{ulid}/hero.webp` or `inline.webp`
- Purpose stored in S3 object metadata via presigned URL conditions

**Security:**
- Auth: JWT required (Cognito)
- Input validation: Zod schema restricts content type to image MIME types
- Size limit: 10MB enforced via presigned URL

**Verification:** verify
**Acceptance Criteria:**
- POST with valid image metadata returns presigned URL, final image URL, and S3 key
- Presigned URL accepts a PUT with the correct content type
- Invalid content type (e.g., "text/plain") returns 400
**Steps:**
- POST /v1/blog/images with filename "test.jpg", contentType "image/jpeg", purpose "hero"
- Verify response contains uploadUrl, imageUrl with CloudFront domain, and key

**Dependencies:** [BlogAdminHandler]

---

### Contract: ImageProcessor

**Boundary:** S3 Event -> Lambda
**Slice:** S-2

**Input:**
```typescript
// S3 PutObject event on uploads/ prefix triggers imageProcessor Lambda
import type { S3Event } from 'aws-lambda';

type ImageProcessorHandler = (event: S3Event) => Promise<void>;

// Event payload:
// Records[0].s3.bucket.name = "tropico-blog-images-{env}"
// Records[0].s3.object.key = "uploads/{ulid}/{filename}"
```

**Output:**
```typescript
// Writes to S3:
// processed/{ulid}/hero.webp     (1200px max width, WebP quality 80) -- when purpose=hero
// processed/{ulid}/inline.webp   (800px max width, WebP quality 80)  -- when purpose=inline
// processed/{ulid}/thumbnail.webp (400px max width, WebP quality 70) -- always
```

**Errors:**
| Error | Status | When |
|-------|--------|------|
| InvalidImageError | N/A | File is not a valid image (magic bytes check fails) |
| ProcessingError | N/A | sharp fails to resize/convert |
| S3ReadError | N/A | Cannot read source file from uploads/ |

**Invariants:**
- Validates file is an image via magic bytes check (sharp metadata)
- If magic bytes don't match content type, file is rejected (deleted from uploads/, not processed)
- Original file preserved in uploads/ prefix
- Processed files always WebP format
- Hero images: max 1200px wide, maintain aspect ratio, quality 80
- Inline images: max 800px wide, maintain aspect ratio, quality 80
- Thumbnails: max 400px wide, quality 70, always generated
- Purpose read from S3 object metadata
- Lambda memory: 512 MB, timeout: 60s

**Security:**
- Auth: S3 event (internal, no user auth)
- Validation: Magic bytes check before processing
- IAM: Lambda role has S3 read on uploads/, S3 write on processed/

**Verification:** verify
**Acceptance Criteria:**
- Uploading an image to uploads/ triggers processing within 10 seconds
- Processed images appear in processed/{ulid}/ with correct variants
- Non-image files are rejected and deleted from uploads/
- Processed images are valid WebP files with correct dimensions
**Steps:**
- Upload a 2000px wide JPEG to the presigned URL
- Wait up to 10 seconds, then verify processed/hero.webp exists with width <=1200px
- Verify processed/thumbnail.webp exists with width <=400px

**Dependencies:** [PresignImageUpload]

---

### Contract: ImageInfrastructure

**Boundary:** Terraform -> AWS
**Slice:** S-2

**Input:**
```typescript
// Terraform resources in infra/api/blog.tf and infra/blog-cloudfront.tf:

interface ImageInfraResources {
  s3Bucket: {
    name: string;                    // tropico-blog-images-{env}
    private: true;                   // No public access
    corsConfiguration: {
      allowOrigins: string[];        // admin domain + localhost
      allowMethods: ['PUT'];
      allowHeaders: ['Content-Type'];
    };
  };
  cloudFrontDistribution: {
    domain: string;                  // images.tropicoretreat.com (staging: staging-images.tropicoretreat.com)
    origin: string;                  // S3 bucket via OAC
    cachePolicy: string;            // Long TTL for immutable processed images
  };
  route53Record: {
    name: string;                    // images.tropicoretreat.com
    type: 'A';                       // Alias to CloudFront
  };
  lambdaFunction: {
    functionName: string;            // tropico-image-processor-{env}
    runtime: 'nodejs22.x';
    architecture: 'arm64';
    memory: 512;
    timeout: 60;
    handler: 'imageProcessor.handler';
  };
  s3EventNotification: {
    events: ['s3:ObjectCreated:*'];
    filterPrefix: 'uploads/';
  };
}
```

**Output:** AWS resources provisioned via Terraform

**Errors:** N/A (infrastructure definition)

**Invariants:**
- S3 bucket is private, served through CloudFront only (OAC)
- CloudFront uses existing wildcard ACM certificate (*.tropicoretreat.com)
- Image processor Lambda triggered only by uploads/ prefix
- Lambda has read access to uploads/ and write access to processed/
- S3 CORS allows PUT from admin domain for presigned uploads

**Security:**
- OAC restricts S3 access to CloudFront only
- Presigned URLs enforce content-type and content-length

**Verification:** auto
**Dependencies:** None

---

## Slice 3: SEO Settings

### Contract: GetSeoSettings

**Boundary:** Client -> API
**Slice:** S-3

**Input:**
```typescript
// GET /v1/seo/settings (JWT required)
// No query parameters
```

**Output:**
```typescript
// Response 200
interface GetSeoSettingsResponse {
  settings: Array<{
    path: string;              // e.g., "/about", "/blog/my-post"
    metaTitle: string;
    metaDescription: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImageUrl?: string;
    keywords?: string;
    updatedAt: string;         // ISO 8601
    updatedBy: string;         // Operator email from JWT
  }>;
}
```

**Errors:**
| Error | Status | When |
|-------|--------|------|
| ServerError | 500 | DynamoDB or internal failure |

**Invariants:**
- Returns all SEO overrides from DynamoDB (Query GSI1: GSI1PK = SEO#ALL)
- Empty array if no overrides exist
- Settings sorted by path alphabetically (GSI1SK = path)

**Security:**
- Auth: JWT required (Cognito)
- Rate limit: API Gateway default

**Verification:** verify
**Acceptance Criteria:**
- GET returns all SEO overrides as an array
- Empty array when no overrides exist
- Settings are sorted by path

**Dependencies:** [SeoOverrideSchema]

---

### Contract: UpsertSeoOverride

**Boundary:** Client -> API
**Slice:** S-3

**Input:**
```typescript
// PUT /v1/seo/settings/{encodedPath} (JWT required)
// Path parameter: encodedPath (URL-encoded, e.g., %2Fabout for /about)

export const SeoOverrideSchema = z.object({
  metaTitle: z.string().min(1).max(70),
  metaDescription: z.string().min(1).max(160),
  ogTitle: z.string().max(70).optional(),
  ogDescription: z.string().max(160).optional(),
  ogImageUrl: z.string().url().optional(),
  keywords: z.string().max(500).optional(),
});

type SeoOverrideInput = z.infer<typeof SeoOverrideSchema>;
```

**Output:**
```typescript
// Response 200
interface UpsertSeoOverrideResponse {
  setting: {
    path: string;
    metaTitle: string;
    metaDescription: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImageUrl?: string;
    keywords?: string;
    updatedAt: string;
    updatedBy: string;
  };
}
```

**Errors:**
| Error | Status | When |
|-------|--------|------|
| ValidationError | 400 | Invalid fields per Zod schema |
| ServerError | 500 | DynamoDB or internal failure |

**Invariants:**
- Upsert: creates if not exists, replaces if exists (PutItem)
- Path decoded from URL parameter
- ogTitle defaults to metaTitle if not provided
- ogDescription defaults to metaDescription if not provided
- updatedBy extracted from JWT claims email
- DynamoDB item: PK=SEO#{path}, SK=SEO#{path}, GSI1PK=SEO#ALL, GSI1SK={path}

**Security:**
- Auth: JWT required (Cognito)
- Input validation: Zod schema, metaTitle max 70 chars, metaDescription max 160 chars

**Verification:** verify
**Acceptance Criteria:**
- PUT creates a new SEO override for a page path
- PUT updates an existing SEO override (upsert behavior)
- metaTitle > 70 chars returns 400
- metaDescription > 160 chars returns 400
- updatedBy reflects the authenticated operator's email
**Steps:**
- PUT /v1/seo/settings/%2Fabout with valid body
- GET /v1/seo/settings and verify /about override appears
- PUT again with different values and verify update

**Dependencies:** [SeoOverrideSchema]

---

### Contract: SeoOverrideSchema

**Boundary:** Service -> Database
**Slice:** S-3

**Input:**
```typescript
interface SeoOverrideItem {
  PK: string;                // SEO#{path}
  SK: string;                // SEO#{path}
  GSI1PK: string;            // SEO#ALL
  GSI1SK: string;            // {path}
  path: string;              // URL path, e.g., "/about"
  metaTitle: string;
  metaDescription: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImageUrl?: string;
  keywords?: string;
  updatedAt: string;         // ISO 8601
  updatedBy: string;         // Operator email
}
```

**Output:** N/A (schema definition)

**Errors:** N/A

**Invariants:**
- PK/SK always uses format `SEO#{path}`
- GSI1PK is always `SEO#ALL` for listing all overrides
- Path stored as decoded URL path (e.g., "/about", not "%2Fabout")

**Security:**
- Auth: N/A (data schema)

**Verification:** auto
**Dependencies:** None

---

### Contract: SeoAdminHandler

**Boundary:** API Gateway -> Lambda
**Slice:** S-3

**Input:**
```typescript
// Multi-route Lambda handler
// Handler: backend/src/handlers/seoAdmin.ts
// Routes:
//   GET  /seo/settings           -> handleGetSettings (JWT)
//   PUT  /seo/settings/{path}    -> handleUpsertSetting (JWT)

import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';

type SeoAdminHandler = (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
) => Promise<APIGatewayProxyResultV2>;
```

**Output:** Delegates to individual route handlers

**Errors:**
| Error | Status | When |
|-------|--------|------|
| MethodNotAllowed | 405 | Unrecognized method + path combination |

**Invariants:**
- All routes require JWT
- Uses existing response helpers
- Environment variable TABLE_NAME provides DynamoDB table name
- Added to esbuild.config.js entry points
- Output: backend/dist/seoAdmin.mjs

**Security:**
- Auth: JWT required for all routes

**Verification:** auto
**Dependencies:** [GetSeoSettings, UpsertSeoOverride]

---

### Contract: SeoSettingsPage

**Boundary:** User -> Admin Dashboard
**Slice:** S-3

**Input:**
```typescript
// Admin route: /seo -> SeoSettingsPage

// Lists all pages with their current SEO settings
// Operator can edit any page's SEO meta
interface SeoSettingsPageState {
  settings: SeoOverrideItem[];
  editingPath: string | null;
}
```

**Output:** Visual page rendering

**Errors:** N/A (UI component)

**Invariants:**
- Lists all known pages (existing static pages + published blog posts)
- Shows current metaTitle, metaDescription for each page
- Edit form validates character counts (70 for title, 160 for description)
- Displays character count indicators
- Saves via PUT /v1/seo/settings/{encodedPath}

**Security:**
- Auth: Inside AppShell auth guard

**Verification:** verify
**Acceptance Criteria:**
- Page lists all site pages with their current SEO settings
- Clicking edit on a page opens an inline form with current values
- Character count indicators show remaining characters for title (70) and description (160)
- Save updates the SEO override and shows success feedback
**Steps:**
- Navigate to /seo in admin dashboard
- Click edit on the /about page entry
- Change the meta title and save
- Verify the updated title appears in the list

**Dependencies:** [GetSeoSettings, UpsertSeoOverride, BlogQueryHooks]

---

### Contract: SeoApiClient

**Boundary:** Admin Frontend -> API
**Slice:** S-3

**Input:**
```typescript
// admin/src/api/seo.ts

import { fetchWithAuth } from './client';

export const seoApi = {
  list: (): Promise<GetSeoSettingsResponse> =>
    fetchWithAuth<GetSeoSettingsResponse>('/seo/settings'),

  upsert: (path: string, data: SeoOverrideInput): Promise<UpsertSeoOverrideResponse> =>
    fetchWithAuth<UpsertSeoOverrideResponse>(`/seo/settings/${encodeURIComponent(path)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};
```

**Output:** Type-safe API client

**Errors:** Throws Error matching fetchWithAuth pattern

**Invariants:**
- Path is URL-encoded when sent to API
- Uses existing fetchWithAuth pattern

**Security:**
- Auth: fetchWithAuth auto-injects Cognito JWT

**Verification:** auto
**Dependencies:** [GetSeoSettings, UpsertSeoOverride]

---

## Slice 4: Custom Analytics

### Contract: AnalyticsCollect

**Boundary:** Public Frontend -> API
**Slice:** S-4

**Input:**
```typescript
// POST /v1/analytics/collect (No auth, public)

export const AnalyticsCollectSchema = z.object({
  path: z.string().min(1).max(500).startsWith('/'),
  referrer: z.string().max(2000).optional(),
});

type AnalyticsCollectInput = z.infer<typeof AnalyticsCollectSchema>;
```

**Output:**
```typescript
// Response 204 (No Content, empty body)
```

**Errors:**
| Error | Status | When |
|-------|--------|------|
| ValidationError | 400 | path missing, doesn't start with "/", or exceeds 500 chars |

**Invariants:**
- Fire-and-forget: returns 204 immediately after validation
- visitorId generated server-side: SHA256(sourceIp + userAgent) -- one-way hash, no PII
- Raw IP address is never written to DynamoDB
- User-agent stored as browser family only (e.g., "Chrome/120"), not full string
- Country extracted from CloudFront-Viewer-Country header (if available)
- DynamoDB item: PK=PAGEVIEW#{date}, SK=PAGEVIEW#{timestamp}#{ulid}
- Bot filtering: reject if Origin header doesn't match tropicoretreat.com domains

**Security:**
- Auth: public (no auth)
- Origin validation: reject requests not from tropicoretreat.com
- Input validation: Zod schema
- Rate limit: API Gateway default (10 req/s)
- No PII stored: visitor ID is irreversible hash

**Verification:** verify
**Acceptance Criteria:**
- POST with valid path returns 204 (no body)
- POST with missing path returns 400
- Page view record is created in DynamoDB with hashed visitorId
- Raw IP address is not present in the DynamoDB record
**Steps:**
- POST /v1/analytics/collect with { path: "/about" } and Origin header
- Verify 204 response
- Query DynamoDB PAGEVIEW#{today} partition and verify record exists with visitorId hash

**Dependencies:** [AnalyticsPageViewSchema]

---

### Contract: AnalyticsPageViewSchema

**Boundary:** Service -> Database
**Slice:** S-4

**Input:**
```typescript
interface AnalyticsPageViewItem {
  PK: string;                // PAGEVIEW#{date} (e.g., PAGEVIEW#2026-03-07)
  SK: string;                // PAGEVIEW#{timestamp}#{ulid}
  path: string;              // e.g., "/blog/corporate-retreat-colombia"
  referrer: string;          // e.g., "google.com" (domain only), or empty
  visitorId: string;         // SHA256 hash of IP + user-agent
  userAgent: string;         // Browser family only (e.g., "Chrome/120")
  country: string;           // From CloudFront header, optional
  createdAt: string;         // ISO 8601
}
```

**Output:** N/A (schema definition)

**Errors:** N/A

**Invariants:**
- Partitioned by date for efficient range queries
- Each day is a separate partition key
- ULID in sort key ensures uniqueness within a day
- No PII: visitorId is SHA256 hash, userAgent is family only, no IP stored

**Security:**
- Auth: N/A (data schema)

**Verification:** auto
**Dependencies:** None

---

### Contract: AnalyticsDashboard

**Boundary:** Client -> API
**Slice:** S-4

**Input:**
```typescript
// GET /v1/analytics/dashboard (JWT required)

interface AnalyticsDashboardParams {
  period?: "7d" | "30d" | "90d";  // Default: "7d"
}
```

**Output:**
```typescript
// Response 200
interface AnalyticsDashboardResponse {
  summary: {
    totalPageViews: number;
    uniqueVisitors: number;
    avgViewsPerDay: number;
  };
  topPages: Array<{
    path: string;
    views: number;
    uniqueVisitors: number;
  }>;                               // Top 10, sorted by views descending
  topReferrers: Array<{
    referrer: string;
    count: number;
  }>;                               // Top 10, sorted by count descending
  dailyViews: Array<{
    date: string;                    // YYYY-MM-DD
    views: number;
    uniqueVisitors: number;
  }>;                               // One entry per day in the period, chronological
}
```

**Errors:**
| Error | Status | When |
|-------|--------|------|
| ValidationError | 400 | Invalid period value |
| ServerError | 500 | DynamoDB or internal failure |

**Invariants:**
- Queries one DynamoDB partition per day in the range (parallelized with Promise.all)
- Aggregation happens in-memory on the Lambda
- topPages limited to 10 entries
- topReferrers limited to 10 entries, stores domain only (not full URL)
- dailyViews array has one entry per day, even if views are zero
- uniqueVisitors counted by distinct visitorId values

**Security:**
- Auth: JWT required (Cognito)
- Rate limit: API Gateway default

**Verification:** verify
**Acceptance Criteria:**
- GET with period=7d returns summary, topPages, topReferrers, and dailyViews
- dailyViews array has exactly 7 entries for period=7d
- topPages has at most 10 entries sorted by views descending
- Empty analytics data returns zero counts (not errors)
**Steps:**
- Seed several page view records across multiple days
- GET /v1/analytics/dashboard?period=7d
- Verify summary totals match seeded data
- Verify dailyViews has 7 entries in chronological order

**Dependencies:** [AnalyticsPageViewSchema, AnalyticsCollect]

---

### Contract: AnalyticsHandler

**Boundary:** API Gateway -> Lambda
**Slice:** S-4

**Input:**
```typescript
// Multi-route Lambda handler
// Handler: backend/src/handlers/analytics.ts
// Routes:
//   POST /analytics/collect     -> handleCollect (public, no auth)
//   GET  /analytics/dashboard   -> handleDashboard (JWT required)

import type { APIGatewayProxyEventV2, APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';

type AnalyticsHandler = (
  event: APIGatewayProxyEventV2 | APIGatewayProxyEventV2WithJWTAuthorizer
) => Promise<APIGatewayProxyResultV2>;
```

**Output:** Delegates to route handlers

**Errors:**
| Error | Status | When |
|-------|--------|------|
| MethodNotAllowed | 405 | Unrecognized method + path combination |

**Invariants:**
- Mixed auth: collect is public, dashboard requires JWT
- Uses existing response helpers
- Environment variable TABLE_NAME provides DynamoDB table name
- Added to esbuild.config.js entry points
- Output: backend/dist/analytics.mjs
- Lambda memory: 128 MB, timeout: 10s

**Security:**
- Auth: mixed (public collect, JWT dashboard)

**Verification:** auto
**Dependencies:** [AnalyticsCollect, AnalyticsDashboard]

---

### Contract: AnalyticsBeacon

**Boundary:** User -> Public Frontend
**Slice:** S-4

**Input:**
```typescript
// frontend/src/lib/analytics.ts
// Lightweight tracking script called on page load and route changes

function trackPageView(): void;
// Uses navigator.sendBeacon if available, falls back to fetch with keepalive
// Payload: { path: window.location.pathname, referrer: document.referrer }
// Target: ${API_URL}/analytics/collect
```

**Output:** Fire-and-forget (no return value)

**Errors:** Silently swallowed (fire-and-forget, errors must not affect user experience)

**Invariants:**
- Called once on initial page load
- Called on each route change (react-router navigation listener)
- Uses sendBeacon when available (non-blocking, works during page unload)
- Falls back to fetch with keepalive: true
- Errors never propagated to user
- No cookies, no localStorage, no PII collection

**Security:**
- No auth required
- Sends only path and referrer (minimal data)

**Verification:** verify
**Acceptance Criteria:**
- Navigating to any page on the public frontend sends a beacon to /analytics/collect
- Route changes (SPA navigation) trigger additional beacons
- No errors appear in the browser console from the analytics script
**Steps:**
- Open the public frontend and navigate to /about
- Check browser DevTools Network tab for a POST to /analytics/collect
- Navigate to /services via SPA link and verify another beacon fires

**Dependencies:** [AnalyticsCollect]

---

### Contract: AnalyticsDashboardPage

**Boundary:** User -> Admin Dashboard
**Slice:** S-4

**Input:**
```typescript
// Admin route: /analytics -> AnalyticsDashboardPage

interface AnalyticsDashboardPageState {
  period: "7d" | "30d" | "90d";
}
```

**Output:** Visual page with charts and metrics

**Errors:** N/A (UI component)

**Invariants:**
- Summary cards: total page views, unique visitors, avg views per day
- Line chart (recharts): daily views over selected period
- Top pages table: path, views, unique visitors (top 10)
- Top referrers table: domain, count (top 10)
- Period selector: 7d (default), 30d, 90d
- Loading skeleton while data fetches
- Empty state for zero analytics data

**Security:**
- Auth: Inside AppShell auth guard

**Verification:** verify
**Acceptance Criteria:**
- Dashboard displays summary cards with page view and visitor counts
- Line chart renders daily view trends for the selected period
- Top pages table shows at most 10 pages sorted by views
- Period selector switches between 7d, 30d, and 90d
- Empty state shown when no analytics data exists
**Steps:**
- Navigate to /analytics in admin dashboard
- Verify summary cards display numbers (or zeros for new install)
- Switch period to 30d and verify the chart updates
- Verify top pages table lists pages sorted by view count

**Dependencies:** [AnalyticsDashboard, AnalyticsApiClient]

---

### Contract: AnalyticsApiClient

**Boundary:** Admin Frontend -> API
**Slice:** S-4

**Input:**
```typescript
// admin/src/api/analytics.ts

import { fetchWithAuth } from './client';

export const analyticsApi = {
  dashboard: (period?: "7d" | "30d" | "90d"): Promise<AnalyticsDashboardResponse> => {
    const params = period ? `?period=${period}` : '';
    return fetchWithAuth<AnalyticsDashboardResponse>(`/analytics/dashboard${params}`);
  },
};
```

**Output:** Type-safe API client

**Errors:** Throws Error matching fetchWithAuth pattern

**Invariants:**
- Uses existing fetchWithAuth pattern
- Default period omitted from query string (server defaults to "7d")

**Security:**
- Auth: fetchWithAuth auto-injects Cognito JWT

**Verification:** auto
**Dependencies:** [AnalyticsDashboard]

---

## Slice 5: GSC Integration + Content Performance

### Contract: GscPerformance

**Boundary:** Client -> API
**Slice:** S-5

**Input:**
```typescript
// GET /v1/gsc/performance (JWT required)

interface GscPerformanceParams {
  period?: "7d" | "28d" | "90d";  // Default: "28d"
}
```

**Output:**
```typescript
// Response 200
interface GscPerformanceResponse {
  queries: Array<{
    query: string;
    clicks: number;
    impressions: number;
    ctr: number;              // 0-1 (not percentage)
    position: number;         // Average position
  }>;
  pages: Array<{
    page: string;             // Full URL
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }>;
  cachedAt: string;           // ISO 8601, when data was last fetched from GSC
  dataEndDate: string;        // ISO 8601, latest date of GSC data (2-3 days behind)
}
```

**Errors:**
| Error | Status | When |
|-------|--------|------|
| ValidationError | 400 | Invalid period value |
| GscUnavailableError | 503 | GSC API unreachable or credentials invalid |
| ServerError | 500 | Internal failure |

**Invariants:**
- Data cached in DynamoDB with 6-hour TTL (PK=GSC#CACHE, SK=GSC#performance#{period})
- If cache valid (expiresAt > now): return cached data
- If cache expired or missing: fetch fresh from GSC API, write cache, return
- GSC API uses service account auth (JSON key from Secrets Manager)
- cachedAt timestamp returned so frontend can display data freshness
- dataEndDate reflects GSC data lag (typically 2-3 days behind current date)
- Queries limited to 100 rows from GSC API
- Pages limited to 100 rows from GSC API

**Security:**
- Auth: JWT required (Cognito)
- GSC key in Secrets Manager, never exposed to frontend
- Service account has read-only access to GSC property

**Verification:** verify
**Acceptance Criteria:**
- GET returns queries and pages arrays with click/impression/CTR/position data
- cachedAt and dataEndDate are present and valid ISO 8601
- Subsequent requests within 6 hours return cached data (same cachedAt)
- Invalid period value returns 400
**Steps:**
- GET /v1/gsc/performance?period=28d
- Verify response contains queries and pages arrays
- Verify cachedAt is within the last 6 hours
- GET again and verify cachedAt is unchanged (cache hit)

**Dependencies:** [GscCacheSchema]

---

### Contract: GscContentPerformance

**Boundary:** Client -> API
**Slice:** S-5

**Input:**
```typescript
// GET /v1/gsc/content (JWT required)

interface GscContentParams {
  period?: "28d";  // Default and only option for MVP
}
```

**Output:**
```typescript
// Response 200
interface GscContentPerformanceResponse {
  posts: Array<{
    slug: string;
    title: string;
    publishedAt: string;
    analytics: {
      pageViews: number;
      uniqueVisitors: number;
    };
    gsc: {
      clicks: number;
      impressions: number;
      ctr: number;
      avgPosition: number;
      topQueries: string[];     // Top 5 queries driving traffic to this post
    };
  }>;
}
```

**Errors:**
| Error | Status | When |
|-------|--------|------|
| GscUnavailableError | 503 | GSC API unreachable or credentials invalid |
| ServerError | 500 | Internal failure |

**Invariants:**
- Combines data from three sources: blog posts list, custom analytics, GSC per-page data
- Posts sorted by total engagement (clicks + pageViews) descending
- analytics data comes from querying PAGEVIEW partitions for /blog/{slug} paths
- GSC data comes from pages dimension filtered to blog post URLs
- topQueries derived from GSC query dimension filtered by page
- Only published blog posts are included
- If a blog post has no analytics or GSC data, its counts are zero (not omitted)

**Security:**
- Auth: JWT required (Cognito)
- GSC credentials handled server-side

**Verification:** verify
**Acceptance Criteria:**
- GET returns posts array with combined analytics and GSC data
- Posts are sorted by total engagement (clicks + pageViews) descending
- Posts with no traffic data still appear with zero counts
- topQueries array contains at most 5 entries per post
**Steps:**
- Create blog posts, seed analytics data, ensure GSC has data for the domain
- GET /v1/gsc/content
- Verify posts array contains blog posts with analytics and gsc sub-objects

**Dependencies:** [GscPerformance, AnalyticsDashboard, ListPublishedPosts]

---

### Contract: GscCacheSchema

**Boundary:** Service -> Database
**Slice:** S-5

**Input:**
```typescript
interface GscCacheItem {
  PK: string;                // GSC#CACHE
  SK: string;                // GSC#{queryType}#{dateRange} (e.g., GSC#performance#28d)
  data: string;              // JSON-encoded GSC API response
  fetchedAt: string;         // ISO 8601
  expiresAt: string;         // ISO 8601 (fetchedAt + 6 hours)
}
```

**Output:** N/A (schema definition)

**Errors:** N/A

**Invariants:**
- Single cache partition (PK=GSC#CACHE)
- Cache items are small (~10KB each)
- expiresAt determines cache validity (checked by Lambda, not DynamoDB TTL)
- Concurrent cache writes are harmless (last write wins, both contain same data)

**Security:**
- Auth: N/A (data schema)

**Verification:** auto
**Dependencies:** None

---

### Contract: GscProxyHandler

**Boundary:** API Gateway -> Lambda
**Slice:** S-5

**Input:**
```typescript
// Multi-route Lambda handler
// Handler: backend/src/handlers/gscProxy.ts
// Routes:
//   GET  /gsc/performance   -> handlePerformance (JWT required)
//   GET  /gsc/content       -> handleContentPerformance (JWT required)

import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';

type GscProxyHandler = (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
) => Promise<APIGatewayProxyResultV2>;
```

**Output:** Delegates to route handlers

**Errors:**
| Error | Status | When |
|-------|--------|------|
| MethodNotAllowed | 405 | Unrecognized method + path combination |

**Invariants:**
- All routes require JWT
- GSC credentials loaded from Secrets Manager on cold start, cached in module scope
- Uses googleapis npm package for GSC API calls
- Environment variables: TABLE_NAME, GSC_SECRET_NAME, GSC_SITE_URL
- Added to esbuild.config.js entry points
- Output: backend/dist/gscProxy.mjs
- Lambda memory: 256 MB, timeout: 30s

**Security:**
- Auth: JWT required for all routes
- GSC key cached in Lambda memory, never in DynamoDB or API responses

**Verification:** auto
**Dependencies:** [GscPerformance, GscContentPerformance]

---

### Contract: GscPerformancePage

**Boundary:** User -> Admin Dashboard
**Slice:** S-5

**Input:**
```typescript
// Admin route: /gsc -> GscPerformancePage

interface GscPerformancePageState {
  period: "7d" | "28d" | "90d";
  activeTab: "queries" | "pages";
}
```

**Output:** Visual page with tables

**Errors:** N/A (UI component)

**Invariants:**
- Two tabs: Queries and Pages
- Queries tab: table with query, clicks, impressions, CTR, average position
- Pages tab: table with page URL, clicks, impressions, CTR, average position
- Period selector: 7d, 28d (default), 90d
- Data freshness indicator showing cachedAt and dataEndDate
- Loading skeleton while data fetches
- Error state with retry for GSC unavailability

**Security:**
- Auth: Inside AppShell auth guard

**Verification:** verify
**Acceptance Criteria:**
- Page displays queries table with click/impression/CTR/position columns
- Tab switching between Queries and Pages updates the displayed table
- Period selector changes the data period
- Data freshness indicator shows when data was last updated
- GSC unavailability shows a clear error state with retry option
**Steps:**
- Navigate to /gsc in admin dashboard
- Verify queries table displays keyword data
- Switch to Pages tab and verify page-level data
- Note the "Data as of" indicator and verify it shows a recent date

**Dependencies:** [GscPerformance, GscApiClient]

---

### Contract: ContentPerformancePage

**Boundary:** User -> Admin Dashboard
**Slice:** S-5

**Input:**
```typescript
// Admin route: /content -> ContentPerformancePage
```

**Output:** Visual page with combined table

**Errors:** N/A (UI component)

**Invariants:**
- Unified table showing blog posts with combined metrics
- Columns: post title, page views, unique visitors, clicks, impressions, CTR, avg position
- Sorted by total engagement (clicks + pageViews) descending
- Top queries shown as expandable detail per row
- Loading skeleton while data fetches

**Security:**
- Auth: Inside AppShell auth guard

**Verification:** verify
**Acceptance Criteria:**
- Page displays a table combining analytics and GSC data per blog post
- Table is sorted by total engagement (clicks + page views) descending
- Each row can be expanded to show top queries driving traffic to that post
- Posts with no traffic data show zero counts
**Steps:**
- Navigate to /content in admin dashboard
- Verify table shows blog posts with traffic and search metrics
- Click a row to expand and verify top queries are listed

**Dependencies:** [GscContentPerformance, GscApiClient]

---

### Contract: GscApiClient

**Boundary:** Admin Frontend -> API
**Slice:** S-5

**Input:**
```typescript
// admin/src/api/gsc.ts

import { fetchWithAuth } from './client';

export const gscApi = {
  performance: (period?: "7d" | "28d" | "90d"): Promise<GscPerformanceResponse> => {
    const params = period ? `?period=${period}` : '';
    return fetchWithAuth<GscPerformanceResponse>(`/gsc/performance${params}`);
  },

  contentPerformance: (period?: "28d"): Promise<GscContentPerformanceResponse> => {
    const params = period ? `?period=${period}` : '';
    return fetchWithAuth<GscContentPerformanceResponse>(`/gsc/content${params}`);
  },
};
```

**Output:** Type-safe API client

**Errors:** Throws Error matching fetchWithAuth pattern

**Invariants:**
- Uses existing fetchWithAuth pattern
- Default periods omitted from query string (server defaults apply)

**Security:**
- Auth: fetchWithAuth auto-injects Cognito JWT

**Verification:** auto
**Dependencies:** [GscPerformance, GscContentPerformance]

---

### Contract: GscInfrastructure

**Boundary:** Terraform -> AWS
**Slice:** S-5

**Input:**
```typescript
// Terraform resources in infra/api/gsc.tf:

interface GscInfraResources {
  secretsManager: {
    secretName: string;              // tropico/gsc-credentials-{env}
    description: string;             // "GSC service account JSON key"
  };
  lambdaFunction: {
    functionName: string;            // tropico-gsc-{env}
    runtime: 'nodejs22.x';
    architecture: 'arm64';
    memory: 256;
    timeout: 30;
    handler: 'gscProxy.handler';
    environmentVariables: {
      TABLE_NAME: string;
      GSC_SECRET_NAME: string;
      GSC_SITE_URL: string;          // "sc-domain:tropicoretreat.com"
    };
  };
}
```

**Output:** AWS resources provisioned via Terraform

**Errors:** N/A (infrastructure definition)

**Invariants:**
- Secrets Manager value set manually after Terraform apply (never in TF state as plaintext)
- Lambda has secretsmanager:GetSecretValue on the GSC secret ARN
- Lambda has DynamoDB read/write for cache operations
- Lambda has CloudWatch Logs access

**Security:**
- GSC credentials in Secrets Manager (encrypted at rest)
- IAM scoped to specific secret ARN

**Verification:** auto
**Dependencies:** None

---

## Cross-Slice Contracts

### Contract: BlogInfrastructure

**Boundary:** Terraform -> AWS
**Slice:** S-1, S-3

**Input:**
```typescript
// Terraform resources in infra/api/blog.tf:

interface BlogInfraResources {
  lambdaFunctions: {
    blogAdmin: {
      functionName: string;          // tropico-blog-admin-{env}
      runtime: 'nodejs22.x';
      architecture: 'arm64';
      memory: 256;
      timeout: 30;
      handler: 'blogAdmin.handler';
      environmentVariables: {
        TABLE_NAME: string;
        ENVIRONMENT: string;
        BLOG_IMAGES_BUCKET: string;
        IMAGES_DOMAIN: string;       // images.tropicoretreat.com
      };
    };
    seoAdmin: {
      functionName: string;          // tropico-seo-admin-{env}
      runtime: 'nodejs22.x';
      architecture: 'arm64';
      memory: 128;
      timeout: 10;
      handler: 'seoAdmin.handler';
      environmentVariables: {
        TABLE_NAME: string;
        ENVIRONMENT: string;
      };
    };
  };
  apiGatewayRoutes: Array<{
    method: string;
    path: string;
    integration: string;
    auth: 'JWT' | 'NONE';
  }>;
}

// API Gateway routes to add:
const newRoutes = [
  { method: 'GET',    path: '/blog/posts',        integration: 'blogAdmin', auth: 'NONE' },
  { method: 'GET',    path: '/blog/posts/{slug}',  integration: 'blogAdmin', auth: 'NONE' },
  { method: 'POST',   path: '/blog/posts',        integration: 'blogAdmin', auth: 'JWT' },
  { method: 'PUT',    path: '/blog/posts/{id}',   integration: 'blogAdmin', auth: 'JWT' },
  { method: 'DELETE', path: '/blog/posts/{id}',   integration: 'blogAdmin', auth: 'JWT' },
  { method: 'POST',   path: '/blog/images',       integration: 'blogAdmin', auth: 'JWT' },
  { method: 'GET',    path: '/seo/settings',      integration: 'seoAdmin',  auth: 'JWT' },
  { method: 'PUT',    path: '/seo/settings/{path}', integration: 'seoAdmin', auth: 'JWT' },
  { method: 'POST',   path: '/analytics/collect', integration: 'analytics', auth: 'NONE' },
  { method: 'GET',    path: '/analytics/dashboard', integration: 'analytics', auth: 'JWT' },
  { method: 'GET',    path: '/gsc/performance',   integration: 'gscProxy',  auth: 'JWT' },
  { method: 'GET',    path: '/gsc/content',       integration: 'gscProxy',  auth: 'JWT' },
];
```

**Output:** AWS resources provisioned via Terraform

**Errors:** N/A (infrastructure definition)

**Invariants:**
- New Lambdas follow existing naming convention: tropico-{component}-{env}
- IAM roles scoped per Lambda function
- API Gateway routes added to existing API (api.tropicoretreat.com)
- Blog admin Lambda role has DynamoDB access + S3 presign access
- SEO admin Lambda role has DynamoDB access only
- Analytics Lambda role has DynamoDB access only
- All Lambdas have CloudWatch Logs access
- Feature-grouped Terraform files: blog.tf, analytics.tf, gsc.tf (ADR-016)

**Security:**
- IAM follows least-privilege per Lambda
- Public routes (blog reads, analytics collect) have auth: NONE
- Admin routes have auth: JWT

**Verification:** auto
**Dependencies:** None

---

### Contract: AnalyticsInfrastructure

**Boundary:** Terraform -> AWS
**Slice:** S-4

**Input:**
```typescript
// Terraform resources in infra/api/analytics.tf:

interface AnalyticsInfraResources {
  lambdaFunction: {
    functionName: string;            // tropico-analytics-{env}
    runtime: 'nodejs22.x';
    architecture: 'arm64';
    memory: 128;
    timeout: 10;
    handler: 'analytics.handler';
    environmentVariables: {
      TABLE_NAME: string;
      ENVIRONMENT: string;
      ALLOWED_ORIGINS: string;       // Comma-separated list of allowed origins
    };
  };
}
```

**Output:** AWS resources provisioned via Terraform

**Errors:** N/A

**Invariants:**
- Lambda role has DynamoDB PutItem for page view writes
- Lambda role has DynamoDB Query for dashboard reads
- ALLOWED_ORIGINS used for origin validation on collect endpoint

**Security:**
- IAM scoped to DynamoDB table operations only

**Verification:** auto
**Dependencies:** None

---

## Global Invariants

These rules apply across all slices and contracts:

1. All timestamps are UTC ISO 8601 format
2. All IDs are ULIDs (lexicographically sortable)
3. All DynamoDB items use the existing `tropico-leads-{env}` table (ADR-001)
4. All responses use existing response helpers: ok(), created(), badRequest(), notFound(), serverError()
5. All admin API calls require Cognito JWT via existing authorizer
6. All public API calls have no auth requirement
7. All Zod schemas are added to existing `backend/src/lib/validation.ts`
8. All new types are added to existing `backend/src/lib/types.ts`
9. All new DynamoDB functions are added to existing `backend/src/lib/dynamodb.ts`
10. Passwords, tokens, and PII are never logged or stored (analytics uses hashed visitor ID)
11. All new handlers added to `backend/esbuild.config.js` entry points
12. All admin frontend API clients use existing `fetchWithAuth` pattern
13. All admin pages are inside AppShell auth guard
14. CORS handled by API Gateway, not Lambda
15. GSI1 (projection: ALL) reused for new entity types

---

## Slice-to-User-Action Mapping

| Slice | User Actions Enabled |
|-------|---------------------|
| S-1: Blog CMS | UA1: Publish a blog post (create, edit, delete, render on frontend) |
| S-2: Image Pipeline | Supports UA1: Image upload, processing, and serving for blog posts |
| S-3: SEO Settings | UA4: Edit page SEO settings for any page from admin |
| S-4: Custom Analytics | UA2: View traffic dashboard (beacon collection + dashboard) |
| S-5: GSC Integration + Content Performance | UA3: View keyword rankings, UA5: View content performance |
