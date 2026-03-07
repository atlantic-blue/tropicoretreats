/**
 * Integration tests for Slice S-1: Blog CMS (Create + Publish + Render)
 *
 * Contracts under test:
 *   - POST   /blog/posts          (CreateBlogPost — JWT required)
 *   - PUT    /blog/posts/{id}     (UpdateBlogPost — JWT required)
 *   - DELETE /blog/posts/{id}     (DeleteBlogPost — JWT required)
 *   - GET    /blog/posts          (ListPublishedPosts — public)
 *   - GET    /blog/posts/{slug}   (GetPostBySlug — public)
 *   - BlogAdminHandler routing    (405 for unknown routes)
 *
 * These tests drive the blogAdmin Lambda handler directly — no HTTP server,
 * no API Gateway. All AWS SDK boundaries are mocked at the module level.
 *
 * Tests will FAIL until backend/src/handlers/blogAdmin.ts is implemented.
 * That is intentional: these tests ARE the specification.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { APIGatewayProxyResultV2 } from 'aws-lambda';
import {
  createMockApiEvent,
  createBlogPostRequest,
  createMockBlogPost,
  createMockSlugIndex,
} from '../fixtures/factories.js';
import {
  mockDynamoDBSend,
  resetAllMocks,
  setupDynamoDBForBlogCreate,
  setupDynamoDBForBlogGet,
  setupDynamoDBForBlogList,
  setupDynamoDBForBlogUpdate,
  setupDynamoDBForBlogDelete,
} from '../fixtures/mocks.js';

// ---------------------------------------------------------------------------
// Module-level mocks — must be hoisted before any imports of the handler
// ---------------------------------------------------------------------------

vi.mock('@aws-sdk/client-dynamodb', () => {
  const DynamoDBClient = vi.fn().mockImplementation(() => ({}));
  return { DynamoDBClient };
});

vi.mock('@aws-sdk/lib-dynamodb', () => {
  const DynamoDBDocumentClient = {
    from: vi.fn().mockReturnValue({ send: mockDynamoDBSend }),
  };
  const PutCommand = vi.fn().mockImplementation((input) => ({ input }));
  const GetCommand = vi.fn().mockImplementation((input) => ({ input }));
  const UpdateCommand = vi.fn().mockImplementation((input) => ({ input }));
  const QueryCommand = vi.fn().mockImplementation((input) => ({ input }));
  const DeleteCommand = vi.fn().mockImplementation((input) => ({ input }));
  const TransactWriteCommand = vi.fn().mockImplementation((input) => ({ input }));
  return {
    DynamoDBDocumentClient,
    PutCommand,
    GetCommand,
    UpdateCommand,
    QueryCommand,
    DeleteCommand,
    TransactWriteCommand,
  };
});

// ---------------------------------------------------------------------------
// Import handler AFTER mocks are registered
// ---------------------------------------------------------------------------

// This import will fail until src/handlers/blogAdmin.ts is implemented.
// That failure is the expected state before the implementation slice runs.
const { handler } = await import('../../src/handlers/blogAdmin.js');

// ---------------------------------------------------------------------------
// Test constants
// ---------------------------------------------------------------------------

const OPERATOR_EMAIL = 'operator@tropicoretreat.com';
const TABLE_NAME = 'test-tropico-leads';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseBody(result: APIGatewayProxyResultV2): Record<string, unknown> {
  if (typeof result === 'object' && result !== null && 'body' in result) {
    return JSON.parse((result as { body: string }).body);
  }
  throw new Error('Response has no body');
}

function statusCode(result: APIGatewayProxyResultV2): number {
  if (typeof result === 'object' && result !== null && 'statusCode' in result) {
    return (result as { statusCode: number }).statusCode;
  }
  throw new Error('Response has no statusCode');
}

/**
 * Encodes an arbitrary object as a base64 pagination cursor,
 * mirroring what the handler produces from DynamoDB's LastEvaluatedKey.
 */
function encodeAsCursor(value: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(value)).toString('base64');
}

/**
 * Builds a POST /blog/posts event for creating a blog post.
 */
function buildCreatePostEvent(body: Record<string, unknown>) {
  return createMockApiEvent({
    method: 'POST',
    path: '/blog/posts',
    body: JSON.stringify(body),
    email: OPERATOR_EMAIL,
  });
}

/**
 * Builds a PUT /blog/posts/{id} event for updating a blog post.
 */
function buildUpdatePostEvent(id: string, body: Record<string, unknown>) {
  return createMockApiEvent({
    method: 'PUT',
    path: `/blog/posts/${id}`,
    body: JSON.stringify(body),
    email: OPERATOR_EMAIL,
    pathParameters: { id },
  });
}

/**
 * Builds a DELETE /blog/posts/{id} event for deleting a blog post.
 */
function buildDeletePostEvent(id: string) {
  return createMockApiEvent({
    method: 'DELETE',
    path: `/blog/posts/${id}`,
    body: null,
    email: OPERATOR_EMAIL,
    pathParameters: { id },
  });
}

/**
 * Builds a GET /blog/posts event for listing published posts.
 */
function buildListPostsEvent(queryStringParameters?: Record<string, string>) {
  return createMockApiEvent({
    method: 'GET',
    path: '/blog/posts',
    body: null,
    queryStringParameters,
  });
}

/**
 * Builds a GET /blog/posts/{slug} event for getting a single post by slug.
 */
function buildGetPostBySlugEvent(slug: string) {
  return createMockApiEvent({
    method: 'GET',
    path: `/blog/posts/${slug}`,
    body: null,
    pathParameters: { slug },
  });
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('Blog CMS (S-1)', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  // =========================================================================
  // POST /blog/posts — CreateBlogPost
  // =========================================================================

  describe('POST /blog/posts (CreateBlogPost)', () => {
    describe('success cases', () => {
      it('should return 201 with the full blog post object when creation succeeds', async () => {
        setupDynamoDBForBlogCreate();

        const request = createBlogPostRequest({
          title: 'My First Blog Post',
          content: 'This is the content of my first blog post. It has enough text for an excerpt.',
        });
        const event = buildCreatePostEvent(request);
        const result = await handler(event);

        expect(statusCode(result)).toBe(201);

        const body = parseBody(result);
        expect(body.post).toBeDefined();

        const post = body.post as Record<string, unknown>;
        expect(post.title).toBe('My First Blog Post');
        expect(post.content).toBe(request.content);
        expect(post.status).toBe('published');
        expect(post.authorOrg).toBe('Tropico Retreats');
      });

      it('should auto-generate a slug from the title when slug is not provided', async () => {
        setupDynamoDBForBlogCreate();

        const request = createBlogPostRequest({
          title: 'My Amazing Blog Post',
          content: 'Content here.',
        });
        const event = buildCreatePostEvent(request);
        const result = await handler(event);

        expect(statusCode(result)).toBe(201);

        const body = parseBody(result);
        const post = body.post as Record<string, unknown>;
        const slug = post.slug as string;

        // Slug should be lowercase and use hyphens
        expect(slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
        // Slug should contain words from title
        expect(slug).toContain('my');
        expect(slug).toContain('amazing');
        expect(slug).toContain('blog');
        expect(slug).toContain('post');
      });

      it('should accept a custom slug when provided', async () => {
        setupDynamoDBForBlogCreate();

        const request = createBlogPostRequest({
          title: 'My Blog Post',
          slug: 'custom-slug-here',
          content: 'Content here.',
        });
        const event = buildCreatePostEvent(request);
        const result = await handler(event);

        expect(statusCode(result)).toBe(201);

        const body = parseBody(result);
        const post = body.post as Record<string, unknown>;
        expect(post.slug).toBe('custom-slug-here');
      });

      it('should generate an excerpt from the content', async () => {
        setupDynamoDBForBlogCreate();

        const longContent = 'This is a very long blog post. '.repeat(20);
        const request = createBlogPostRequest({
          title: 'Excerpt Test',
          content: longContent,
        });
        const event = buildCreatePostEvent(request);
        const result = await handler(event);

        expect(statusCode(result)).toBe(201);

        const body = parseBody(result);
        const post = body.post as Record<string, unknown>;
        expect(typeof post.excerpt).toBe('string');
        expect((post.excerpt as string).length).toBeGreaterThan(0);
        expect((post.excerpt as string).length).toBeLessThanOrEqual(250);
      });

      it('should set publishedAt to a valid ISO 8601 timestamp', async () => {
        setupDynamoDBForBlogCreate();

        const request = createBlogPostRequest({
          title: 'Timestamp Test',
          content: 'Content here.',
        });
        const event = buildCreatePostEvent(request);
        const result = await handler(event);

        expect(statusCode(result)).toBe(201);

        const body = parseBody(result);
        const post = body.post as Record<string, unknown>;
        expect(typeof post.publishedAt).toBe('string');
        expect(new Date(post.publishedAt as string).toISOString()).toBe(post.publishedAt);
      });

      it('should set createdAt and updatedAt to valid ISO 8601 timestamps', async () => {
        setupDynamoDBForBlogCreate();

        const request = createBlogPostRequest({
          title: 'Timestamp Test',
          content: 'Content here.',
        });
        const event = buildCreatePostEvent(request);
        const result = await handler(event);

        expect(statusCode(result)).toBe(201);

        const body = parseBody(result);
        const post = body.post as Record<string, unknown>;
        expect(typeof post.createdAt).toBe('string');
        expect(new Date(post.createdAt as string).toISOString()).toBe(post.createdAt);
        expect(typeof post.updatedAt).toBe('string');
        expect(new Date(post.updatedAt as string).toISOString()).toBe(post.updatedAt);
      });

      it('should generate a ULID for the post id', async () => {
        setupDynamoDBForBlogCreate();

        const request = createBlogPostRequest({
          title: 'ID Test',
          content: 'Content here.',
        });
        const event = buildCreatePostEvent(request);
        const result = await handler(event);

        expect(statusCode(result)).toBe(201);

        const body = parseBody(result);
        const post = body.post as Record<string, unknown>;
        expect(typeof post.id).toBe('string');
        expect((post.id as string).length).toBeGreaterThan(0);
      });

      it('should extract author name from JWT claims', async () => {
        setupDynamoDBForBlogCreate();

        const request = createBlogPostRequest({
          title: 'Author Test',
          content: 'Content here.',
        });
        const event = buildCreatePostEvent(request);
        const result = await handler(event);

        expect(statusCode(result)).toBe(201);

        const body = parseBody(result);
        const post = body.post as Record<string, unknown>;
        expect(post.authorName).toBeDefined();
        expect(typeof post.authorName).toBe('string');
        expect((post.authorName as string).length).toBeGreaterThan(0);
      });

      it('should default metaTitle to the title when not provided', async () => {
        setupDynamoDBForBlogCreate();

        const request = createBlogPostRequest({
          title: 'Meta Title Default',
          content: 'Content here.',
        });
        const event = buildCreatePostEvent(request);
        const result = await handler(event);

        expect(statusCode(result)).toBe(201);

        const body = parseBody(result);
        const post = body.post as Record<string, unknown>;
        expect(post.metaTitle).toBe('Meta Title Default');
      });

      it('should use provided metaTitle when given', async () => {
        setupDynamoDBForBlogCreate();

        const request = createBlogPostRequest({
          title: 'Blog Post Title',
          content: 'Content here.',
          metaTitle: 'Custom SEO Title',
        });
        const event = buildCreatePostEvent(request);
        const result = await handler(event);

        expect(statusCode(result)).toBe(201);

        const body = parseBody(result);
        const post = body.post as Record<string, unknown>;
        expect(post.metaTitle).toBe('Custom SEO Title');
      });

      it('should default metaDescription to the auto-generated excerpt when not provided', async () => {
        setupDynamoDBForBlogCreate();

        const request = createBlogPostRequest({
          title: 'Meta Desc Default',
          content: 'This is content that should become both the excerpt and the meta description.',
        });
        const event = buildCreatePostEvent(request);
        const result = await handler(event);

        expect(statusCode(result)).toBe(201);

        const body = parseBody(result);
        const post = body.post as Record<string, unknown>;
        expect(post.metaDescription).toBeDefined();
        expect(typeof post.metaDescription).toBe('string');
        expect((post.metaDescription as string).length).toBeGreaterThan(0);
      });

      it('should accept optional heroImageUrl', async () => {
        setupDynamoDBForBlogCreate();

        const request = createBlogPostRequest({
          title: 'Hero Image Test',
          content: 'Content here.',
          heroImageUrl: 'https://cdn.example.com/hero.webp',
        });
        const event = buildCreatePostEvent(request);
        const result = await handler(event);

        expect(statusCode(result)).toBe(201);

        const body = parseBody(result);
        const post = body.post as Record<string, unknown>;
        expect(post.heroImageUrl).toBe('https://cdn.example.com/hero.webp');
      });

      it('should accept optional ogImageUrl', async () => {
        setupDynamoDBForBlogCreate();

        const request = createBlogPostRequest({
          title: 'OG Image Test',
          content: 'Content here.',
          ogImageUrl: 'https://cdn.example.com/og.webp',
        });
        const event = buildCreatePostEvent(request);
        const result = await handler(event);

        expect(statusCode(result)).toBe(201);

        const body = parseBody(result);
        const post = body.post as Record<string, unknown>;
        expect(post.ogImageUrl).toBe('https://cdn.example.com/og.webp');
      });
    });

    describe('validation', () => {
      it('should return 400 when title is missing', async () => {
        const request = { content: 'Content without a title.' };
        const event = buildCreatePostEvent(request);
        const result = await handler(event);

        expect(statusCode(result)).toBe(400);
        const body = parseBody(result);
        expect(body.error).toBeDefined();
      });

      it('should return 400 when title is empty string', async () => {
        const request = createBlogPostRequest({ title: '' });
        const event = buildCreatePostEvent(request);
        const result = await handler(event);

        expect(statusCode(result)).toBe(400);
        const body = parseBody(result);
        expect(body.error).toBeDefined();
      });

      it('should return 400 when title exceeds 200 characters', async () => {
        const request = createBlogPostRequest({ title: 'a'.repeat(201) });
        const event = buildCreatePostEvent(request);
        const result = await handler(event);

        expect(statusCode(result)).toBe(400);
        const body = parseBody(result);
        expect(body.error).toBeDefined();
      });

      it('should return 400 when content is missing', async () => {
        const request = { title: 'Title without content' };
        const event = buildCreatePostEvent(request);
        const result = await handler(event);

        expect(statusCode(result)).toBe(400);
        const body = parseBody(result);
        expect(body.error).toBeDefined();
      });

      it('should return 400 when content is empty string', async () => {
        const request = createBlogPostRequest({ content: '' });
        const event = buildCreatePostEvent(request);
        const result = await handler(event);

        expect(statusCode(result)).toBe(400);
        const body = parseBody(result);
        expect(body.error).toBeDefined();
      });

      it('should return 400 when content exceeds 100KB (102400 characters)', async () => {
        const request = createBlogPostRequest({ content: 'x'.repeat(102_401) });
        const event = buildCreatePostEvent(request);
        const result = await handler(event);

        expect(statusCode(result)).toBe(400);
        const body = parseBody(result);
        expect(body.error).toBeDefined();
      });

      it('should return 400 when slug contains uppercase characters', async () => {
        const request = createBlogPostRequest({ slug: 'Invalid-Slug' });
        const event = buildCreatePostEvent(request);
        const result = await handler(event);

        expect(statusCode(result)).toBe(400);
        const body = parseBody(result);
        expect(body.error).toBeDefined();
      });

      it('should return 400 when slug contains special characters', async () => {
        const request = createBlogPostRequest({ slug: 'invalid_slug!' });
        const event = buildCreatePostEvent(request);
        const result = await handler(event);

        expect(statusCode(result)).toBe(400);
        const body = parseBody(result);
        expect(body.error).toBeDefined();
      });

      it('should return 400 when slug starts with a hyphen', async () => {
        const request = createBlogPostRequest({ slug: '-invalid-slug' });
        const event = buildCreatePostEvent(request);
        const result = await handler(event);

        expect(statusCode(result)).toBe(400);
        const body = parseBody(result);
        expect(body.error).toBeDefined();
      });

      it('should return 400 when slug ends with a hyphen', async () => {
        const request = createBlogPostRequest({ slug: 'invalid-slug-' });
        const event = buildCreatePostEvent(request);
        const result = await handler(event);

        expect(statusCode(result)).toBe(400);
        const body = parseBody(result);
        expect(body.error).toBeDefined();
      });

      it('should return 400 when slug exceeds 200 characters', async () => {
        const request = createBlogPostRequest({ slug: 'a'.repeat(201) });
        const event = buildCreatePostEvent(request);
        const result = await handler(event);

        expect(statusCode(result)).toBe(400);
        const body = parseBody(result);
        expect(body.error).toBeDefined();
      });

      it('should return 400 when heroImageUrl is not a valid URL', async () => {
        const request = createBlogPostRequest({ heroImageUrl: 'not-a-url' });
        const event = buildCreatePostEvent(request);
        const result = await handler(event);

        expect(statusCode(result)).toBe(400);
        const body = parseBody(result);
        expect(body.error).toBeDefined();
      });

      it('should return 400 when metaTitle exceeds 70 characters', async () => {
        const request = createBlogPostRequest({ metaTitle: 'a'.repeat(71) });
        const event = buildCreatePostEvent(request);
        const result = await handler(event);

        expect(statusCode(result)).toBe(400);
        const body = parseBody(result);
        expect(body.error).toBeDefined();
      });

      it('should return 400 when metaDescription exceeds 160 characters', async () => {
        const request = createBlogPostRequest({ metaDescription: 'a'.repeat(161) });
        const event = buildCreatePostEvent(request);
        const result = await handler(event);

        expect(statusCode(result)).toBe(400);
        const body = parseBody(result);
        expect(body.error).toBeDefined();
      });

      it('should return 400 when request body is malformed JSON', async () => {
        const event = createMockApiEvent({
          method: 'POST',
          path: '/blog/posts',
          body: '{this is not valid json',
        });
        const result = await handler(event);

        expect(statusCode(result)).toBe(400);
        const body = parseBody(result);
        expect(body.error).toBeDefined();
      });

      it('should return 400 when request body is empty', async () => {
        const event = createMockApiEvent({
          method: 'POST',
          path: '/blog/posts',
          body: null,
        });
        const result = await handler(event);

        expect(statusCode(result)).toBe(400);
        const body = parseBody(result);
        expect(body.error).toBeDefined();
      });
    });

    describe('conflicts', () => {
      it('should return 409 when slug already exists', async () => {
        setupDynamoDBForBlogCreate({ slugConflict: true });

        const request = createBlogPostRequest({
          title: 'Duplicate Slug Test',
          slug: 'existing-slug',
          content: 'Content here.',
        });
        const event = buildCreatePostEvent(request);
        const result = await handler(event);

        expect(statusCode(result)).toBe(409);
        const body = parseBody(result);
        expect(body.error).toBeDefined();
      });
    });

    describe('invariants', () => {
      it('should never include DynamoDB key fields (PK, SK, GSI1PK, GSI1SK) in the response', async () => {
        setupDynamoDBForBlogCreate();

        const request = createBlogPostRequest({
          title: 'Key Fields Test',
          content: 'Content here.',
        });
        const event = buildCreatePostEvent(request);
        const result = await handler(event);

        expect(statusCode(result)).toBe(201);

        const body = parseBody(result);
        const post = body.post as Record<string, unknown>;
        expect(post.PK).toBeUndefined();
        expect(post.SK).toBeUndefined();
        expect(post.GSI1PK).toBeUndefined();
        expect(post.GSI1SK).toBeUndefined();
      });

      it('should set authorOrg to Tropico Retreats', async () => {
        setupDynamoDBForBlogCreate();

        const request = createBlogPostRequest({
          title: 'Org Test',
          content: 'Content here.',
        });
        const event = buildCreatePostEvent(request);
        const result = await handler(event);

        expect(statusCode(result)).toBe(201);

        const body = parseBody(result);
        const post = body.post as Record<string, unknown>;
        expect(post.authorOrg).toBe('Tropico Retreats');
      });

      it('should return all required fields defined in the CreateBlogPostResponse contract', async () => {
        setupDynamoDBForBlogCreate();

        const request = createBlogPostRequest({
          title: 'Response Shape Test',
          content: 'Content here for response shape verification.',
        });
        const event = buildCreatePostEvent(request);
        const result = await handler(event);

        expect(statusCode(result)).toBe(201);

        const body = parseBody(result);
        const post = body.post as Record<string, unknown>;

        const requiredFields = [
          'id',
          'title',
          'slug',
          'content',
          'excerpt',
          'heroImageUrl',
          'metaTitle',
          'metaDescription',
          'ogImageUrl',
          'authorName',
          'authorOrg',
          'status',
          'publishedAt',
          'createdAt',
          'updatedAt',
        ];

        for (const field of requiredFields) {
          expect(post, `Field "${field}" must be present in the response`).toHaveProperty(field);
        }
      });
    });

    describe('error handling', () => {
      it('should return 500 when DynamoDB TransactWriteItems fails', async () => {
        mockDynamoDBSend.mockRejectedValueOnce(new Error('DynamoDB service unavailable'));

        const request = createBlogPostRequest({
          title: 'Server Error Test',
          content: 'Content here.',
        });
        const event = buildCreatePostEvent(request);
        const result = await handler(event);

        expect(statusCode(result)).toBe(500);
        const body = parseBody(result);
        expect(body.error).toBeDefined();
      });
    });
  });

  // =========================================================================
  // PUT /blog/posts/{id} — UpdateBlogPost
  // =========================================================================

  describe('PUT /blog/posts/{id} (UpdateBlogPost)', () => {
    describe('success cases', () => {
      it('should return 200 with the updated blog post when update succeeds', async () => {
        const existingPost = createMockBlogPost({
          id: 'blog-update-001',
          title: 'Original Title',
          slug: 'original-title',
          content: 'Original content.',
        });
        setupDynamoDBForBlogUpdate(existingPost);

        const event = buildUpdatePostEvent('blog-update-001', { title: 'Updated Title' });
        const result = await handler(event);

        expect(statusCode(result)).toBe(200);

        const body = parseBody(result);
        expect(body.post).toBeDefined();
        const post = body.post as Record<string, unknown>;
        expect(post.title).toBe('Updated Title');
      });

      it('should update only the provided fields and preserve others', async () => {
        const existingPost = createMockBlogPost({
          id: 'blog-partial-001',
          title: 'Original Title',
          slug: 'original-title',
          content: 'Original content that should remain.',
          heroImageUrl: 'https://cdn.example.com/original.webp',
        });
        setupDynamoDBForBlogUpdate(existingPost);

        const event = buildUpdatePostEvent('blog-partial-001', { title: 'New Title Only' });
        const result = await handler(event);

        expect(statusCode(result)).toBe(200);

        const body = parseBody(result);
        const post = body.post as Record<string, unknown>;
        expect(post.title).toBe('New Title Only');
        // Content should remain unchanged
        expect(post.content).toBe('Original content that should remain.');
      });

      it('should refresh updatedAt on successful update', async () => {
        const existingPost = createMockBlogPost({
          id: 'blog-timestamp-001',
          title: 'Timestamp Test',
          slug: 'timestamp-test',
          updatedAt: '2026-01-01T00:00:00.000Z',
        });
        setupDynamoDBForBlogUpdate(existingPost);

        const event = buildUpdatePostEvent('blog-timestamp-001', { title: 'Updated Timestamp' });
        const result = await handler(event);

        expect(statusCode(result)).toBe(200);

        const body = parseBody(result);
        const post = body.post as Record<string, unknown>;
        expect(post.updatedAt).not.toBe('2026-01-01T00:00:00.000Z');
        expect(new Date(post.updatedAt as string).toISOString()).toBe(post.updatedAt);
      });

      it('should re-generate excerpt when content is updated', async () => {
        const existingPost = createMockBlogPost({
          id: 'blog-excerpt-001',
          title: 'Excerpt Update Test',
          slug: 'excerpt-update-test',
          content: 'Old content.',
          excerpt: 'Old content.',
        });
        setupDynamoDBForBlogUpdate(existingPost);

        const newContent = 'This is completely new content that should generate a new excerpt for the blog post.';
        const event = buildUpdatePostEvent('blog-excerpt-001', { content: newContent });
        const result = await handler(event);

        expect(statusCode(result)).toBe(200);

        const body = parseBody(result);
        const post = body.post as Record<string, unknown>;
        expect(post.content).toBe(newContent);
        expect(post.excerpt).not.toBe('Old content.');
      });

      it('should update slug atomically when slug changes', async () => {
        const existingPost = createMockBlogPost({
          id: 'blog-slug-change-001',
          title: 'Slug Change Test',
          slug: 'old-slug',
          content: 'Content here.',
        });
        setupDynamoDBForBlogUpdate(existingPost);

        const event = buildUpdatePostEvent('blog-slug-change-001', { slug: 'new-slug' });
        const result = await handler(event);

        expect(statusCode(result)).toBe(200);

        const body = parseBody(result);
        const post = body.post as Record<string, unknown>;
        expect(post.slug).toBe('new-slug');
      });

      it('should allow updating content only', async () => {
        const existingPost = createMockBlogPost({
          id: 'blog-content-only-001',
          slug: 'content-update',
        });
        setupDynamoDBForBlogUpdate(existingPost);

        const event = buildUpdatePostEvent('blog-content-only-001', { content: 'Brand new content.' });
        const result = await handler(event);

        expect(statusCode(result)).toBe(200);

        const body = parseBody(result);
        const post = body.post as Record<string, unknown>;
        expect(post.content).toBe('Brand new content.');
      });

      it('should allow updating heroImageUrl', async () => {
        const existingPost = createMockBlogPost({
          id: 'blog-hero-update-001',
          slug: 'hero-update',
        });
        setupDynamoDBForBlogUpdate(existingPost);

        const event = buildUpdatePostEvent('blog-hero-update-001', {
          heroImageUrl: 'https://cdn.example.com/new-hero.webp',
        });
        const result = await handler(event);

        expect(statusCode(result)).toBe(200);

        const body = parseBody(result);
        const post = body.post as Record<string, unknown>;
        expect(post.heroImageUrl).toBe('https://cdn.example.com/new-hero.webp');
      });

      it('should allow updating metaTitle and metaDescription', async () => {
        const existingPost = createMockBlogPost({
          id: 'blog-meta-update-001',
          slug: 'meta-update',
        });
        setupDynamoDBForBlogUpdate(existingPost);

        const event = buildUpdatePostEvent('blog-meta-update-001', {
          metaTitle: 'New Meta Title',
          metaDescription: 'New meta description for SEO.',
        });
        const result = await handler(event);

        expect(statusCode(result)).toBe(200);

        const body = parseBody(result);
        const post = body.post as Record<string, unknown>;
        expect(post.metaTitle).toBe('New Meta Title');
        expect(post.metaDescription).toBe('New meta description for SEO.');
      });
    });

    describe('validation', () => {
      it('should return 400 when request body is empty (no fields provided)', async () => {
        const event = buildUpdatePostEvent('blog-empty-001', {});
        const result = await handler(event);

        expect(statusCode(result)).toBe(400);
        const body = parseBody(result);
        expect(body.error).toBeDefined();
      });

      it('should return 400 when title is empty string', async () => {
        const event = buildUpdatePostEvent('blog-val-001', { title: '' });
        const result = await handler(event);

        expect(statusCode(result)).toBe(400);
        const body = parseBody(result);
        expect(body.error).toBeDefined();
      });

      it('should return 400 when title exceeds 200 characters', async () => {
        const event = buildUpdatePostEvent('blog-val-002', { title: 'a'.repeat(201) });
        const result = await handler(event);

        expect(statusCode(result)).toBe(400);
        const body = parseBody(result);
        expect(body.error).toBeDefined();
      });

      it('should return 400 when content exceeds 100KB', async () => {
        const event = buildUpdatePostEvent('blog-val-003', { content: 'x'.repeat(102_401) });
        const result = await handler(event);

        expect(statusCode(result)).toBe(400);
        const body = parseBody(result);
        expect(body.error).toBeDefined();
      });

      it('should return 400 when slug has invalid format', async () => {
        const event = buildUpdatePostEvent('blog-val-004', { slug: 'INVALID-SLUG' });
        const result = await handler(event);

        expect(statusCode(result)).toBe(400);
        const body = parseBody(result);
        expect(body.error).toBeDefined();
      });

      it('should return 400 when metaTitle exceeds 70 characters', async () => {
        const existingPost = createMockBlogPost({ id: 'blog-val-005', slug: 'val-005' });
        setupDynamoDBForBlogUpdate(existingPost);

        const event = buildUpdatePostEvent('blog-val-005', { metaTitle: 'a'.repeat(71) });
        const result = await handler(event);

        expect(statusCode(result)).toBe(400);
        const body = parseBody(result);
        expect(body.error).toBeDefined();
      });

      it('should return 400 when request body is malformed JSON', async () => {
        const event = createMockApiEvent({
          method: 'PUT',
          path: '/blog/posts/some-id',
          body: '{broken json',
          pathParameters: { id: 'some-id' },
        });
        const result = await handler(event);

        expect(statusCode(result)).toBe(400);
        const body = parseBody(result);
        expect(body.error).toBeDefined();
      });
    });

    describe('error handling', () => {
      it('should return 404 when post with given ID does not exist', async () => {
        setupDynamoDBForBlogUpdate(undefined);

        const event = buildUpdatePostEvent('nonexistent-id', { title: 'Does not matter' });
        const result = await handler(event);

        expect(statusCode(result)).toBe(404);
        const body = parseBody(result);
        expect(body.error).toBeDefined();
      });

      it('should return 404 when updating a deleted post', async () => {
        const deletedPost = createMockBlogPost({
          id: 'blog-deleted-001',
          slug: 'deleted-post',
          status: 'deleted',
        });
        setupDynamoDBForBlogUpdate(deletedPost);

        const event = buildUpdatePostEvent('blog-deleted-001', { title: 'Cannot update deleted' });
        const result = await handler(event);

        expect(statusCode(result)).toBe(404);
        const body = parseBody(result);
        expect(body.error).toBeDefined();
      });

      it('should return 409 when new slug is already taken by another post', async () => {
        const existingPost = createMockBlogPost({
          id: 'blog-slug-conflict-001',
          slug: 'current-slug',
          content: 'Content here.',
        });
        setupDynamoDBForBlogUpdate(existingPost, { slugConflict: true });

        const event = buildUpdatePostEvent('blog-slug-conflict-001', { slug: 'taken-slug' });
        const result = await handler(event);

        expect(statusCode(result)).toBe(409);
        const body = parseBody(result);
        expect(body.error).toBeDefined();
      });

      it('should return 500 when DynamoDB fails during update', async () => {
        const existingPost = createMockBlogPost({
          id: 'blog-db-fail-001',
          slug: 'db-fail',
        });
        // Get existing post succeeds
        mockDynamoDBSend.mockResolvedValueOnce({
          Item: existingPost,
          $metadata: { httpStatusCode: 200 },
        });
        // Update fails
        mockDynamoDBSend.mockRejectedValueOnce(new Error('DynamoDB service unavailable'));

        const event = buildUpdatePostEvent('blog-db-fail-001', { title: 'Should fail' });
        const result = await handler(event);

        expect(statusCode(result)).toBe(500);
        const body = parseBody(result);
        expect(body.error).toBeDefined();
      });
    });

    describe('invariants', () => {
      it('should never include DynamoDB key fields in the update response', async () => {
        const existingPost = createMockBlogPost({
          id: 'blog-keys-001',
          slug: 'keys-test',
        });
        setupDynamoDBForBlogUpdate(existingPost);

        const event = buildUpdatePostEvent('blog-keys-001', { title: 'Keys Test' });
        const result = await handler(event);

        expect(statusCode(result)).toBe(200);

        const body = parseBody(result);
        const post = body.post as Record<string, unknown>;
        expect(post.PK).toBeUndefined();
        expect(post.SK).toBeUndefined();
        expect(post.GSI1PK).toBeUndefined();
        expect(post.GSI1SK).toBeUndefined();
      });
    });
  });

  // =========================================================================
  // DELETE /blog/posts/{id} — DeleteBlogPost
  // =========================================================================

  describe('DELETE /blog/posts/{id} (DeleteBlogPost)', () => {
    describe('success cases', () => {
      it('should return 200 with "Post deleted" message when deletion succeeds', async () => {
        const existingPost = createMockBlogPost({
          id: 'blog-delete-001',
          slug: 'delete-test',
          status: 'published',
        });
        setupDynamoDBForBlogDelete(existingPost);

        const event = buildDeletePostEvent('blog-delete-001');
        const result = await handler(event);

        expect(statusCode(result)).toBe(200);

        const body = parseBody(result);
        expect(body.message).toBe('Post deleted');
      });
    });

    describe('error handling', () => {
      it('should return 404 when post with given ID does not exist', async () => {
        setupDynamoDBForBlogDelete(undefined);

        const event = buildDeletePostEvent('nonexistent-id');
        const result = await handler(event);

        expect(statusCode(result)).toBe(404);
        const body = parseBody(result);
        expect(body.error).toBeDefined();
      });

      it('should return 404 when post is already deleted', async () => {
        const deletedPost = createMockBlogPost({
          id: 'blog-already-deleted-001',
          slug: 'already-deleted',
          status: 'deleted',
        });
        setupDynamoDBForBlogDelete(deletedPost);

        const event = buildDeletePostEvent('blog-already-deleted-001');
        const result = await handler(event);

        expect(statusCode(result)).toBe(404);
        const body = parseBody(result);
        expect(body.error).toBeDefined();
      });

      it('should return 500 when DynamoDB TransactWriteItems fails during delete', async () => {
        const existingPost = createMockBlogPost({
          id: 'blog-delete-fail-001',
          slug: 'delete-fail',
        });
        // GetCommand succeeds
        mockDynamoDBSend.mockResolvedValueOnce({
          Item: existingPost,
          $metadata: { httpStatusCode: 200 },
        });
        // TransactWriteCommand fails
        mockDynamoDBSend.mockRejectedValueOnce(new Error('DynamoDB service unavailable'));

        const event = buildDeletePostEvent('blog-delete-fail-001');
        const result = await handler(event);

        expect(statusCode(result)).toBe(500);
        const body = parseBody(result);
        expect(body.error).toBeDefined();
      });
    });
  });

  // =========================================================================
  // GET /blog/posts — ListPublishedPosts (public)
  // =========================================================================

  describe('GET /blog/posts (ListPublishedPosts)', () => {
    describe('success cases', () => {
      it('should return 200 with published posts in reverse chronological order', async () => {
        const olderPost = createMockBlogPost({
          id: 'blog-old-001',
          slug: 'older-post',
          title: 'Older Post',
          publishedAt: '2026-01-01T10:00:00.000Z',
          GSI1SK: '2026-01-01T10:00:00.000Z',
        });
        const newerPost = createMockBlogPost({
          id: 'blog-new-001',
          slug: 'newer-post',
          title: 'Newer Post',
          publishedAt: '2026-02-01T10:00:00.000Z',
          GSI1SK: '2026-02-01T10:00:00.000Z',
        });
        // DynamoDB returns newest first (ScanIndexForward=false)
        setupDynamoDBForBlogList([newerPost, olderPost]);

        const event = buildListPostsEvent();
        const result = await handler(event);

        expect(statusCode(result)).toBe(200);

        const body = parseBody(result);
        expect(Array.isArray(body.posts)).toBe(true);

        const posts = body.posts as Record<string, unknown>[];
        expect(posts).toHaveLength(2);
        // Newest first
        expect(posts[0].title).toBe('Newer Post');
        expect(posts[1].title).toBe('Older Post');
      });

      it('should return an empty posts array when no published posts exist', async () => {
        setupDynamoDBForBlogList([]);

        const event = buildListPostsEvent();
        const result = await handler(event);

        expect(statusCode(result)).toBe(200);

        const body = parseBody(result);
        expect(Array.isArray(body.posts)).toBe(true);
        expect((body.posts as unknown[]).length).toBe(0);
      });

      it('should not include the full content field in the listing', async () => {
        const post = createMockBlogPost({
          slug: 'listing-content-check',
          content: 'This content should NOT appear in the listing.',
        });
        setupDynamoDBForBlogList([post]);

        const event = buildListPostsEvent();
        const result = await handler(event);

        expect(statusCode(result)).toBe(200);

        const body = parseBody(result);
        const posts = body.posts as Record<string, unknown>[];
        expect(posts[0].content).toBeUndefined();
      });

      it('should include excerpt in the listing response', async () => {
        const post = createMockBlogPost({
          slug: 'listing-excerpt-check',
          excerpt: 'This is the excerpt text.',
        });
        setupDynamoDBForBlogList([post]);

        const event = buildListPostsEvent();
        const result = await handler(event);

        expect(statusCode(result)).toBe(200);

        const body = parseBody(result);
        const posts = body.posts as Record<string, unknown>[];
        expect(posts[0].excerpt).toBe('This is the excerpt text.');
      });

      it('should return listing fields matching ListPublishedPostsResponse schema', async () => {
        const post = createMockBlogPost({
          slug: 'listing-fields-check',
        });
        setupDynamoDBForBlogList([post]);

        const event = buildListPostsEvent();
        const result = await handler(event);

        expect(statusCode(result)).toBe(200);

        const body = parseBody(result);
        const posts = body.posts as Record<string, unknown>[];
        const first = posts[0];

        const requiredFields = [
          'id',
          'title',
          'slug',
          'excerpt',
          'heroImageUrl',
          'authorName',
          'authorOrg',
          'publishedAt',
        ];

        for (const field of requiredFields) {
          expect(first, `Field "${field}" must be present in the listing`).toHaveProperty(field);
        }
      });

      it('should return nextCursor when DynamoDB returns a LastEvaluatedKey', async () => {
        const post = createMockBlogPost({ slug: 'cursor-test' });
        const lastKey = { GSI1PK: 'BLOG#PUBLISHED', GSI1SK: '2026-01-01T10:00:00.000Z' };
        const cursor = encodeAsCursor(lastKey);
        setupDynamoDBForBlogList([post], cursor);

        const event = buildListPostsEvent();
        const result = await handler(event);

        expect(statusCode(result)).toBe(200);

        const body = parseBody(result);
        expect(typeof body.nextCursor).toBe('string');
        expect((body.nextCursor as string).length).toBeGreaterThan(0);
      });

      it('should not include nextCursor when there are no more results', async () => {
        const post = createMockBlogPost({ slug: 'no-cursor' });
        setupDynamoDBForBlogList([post]);

        const event = buildListPostsEvent();
        const result = await handler(event);

        expect(statusCode(result)).toBe(200);

        const body = parseBody(result);
        expect(body.nextCursor).toBeUndefined();
      });

      it('should accept and use cursor parameter for pagination', async () => {
        const lastKey = { GSI1PK: 'BLOG#PUBLISHED', GSI1SK: '2026-01-15T10:00:00.000Z' };
        const cursor = encodeAsCursor(lastKey);
        setupDynamoDBForBlogList([]);

        const event = buildListPostsEvent({ cursor });
        await handler(event);

        const queryCallArg = mockDynamoDBSend.mock.calls[0][0] as {
          input: Record<string, unknown>;
        };
        expect(queryCallArg.input.ExclusiveStartKey).toMatchObject(lastKey);
      });

      it('should use default limit of 20 when no limit is provided', async () => {
        setupDynamoDBForBlogList([]);

        const event = buildListPostsEvent();
        await handler(event);

        const queryCallArg = mockDynamoDBSend.mock.calls[0][0] as {
          input: Record<string, unknown>;
        };
        expect(queryCallArg.input.Limit).toBe(20);
      });

      it('should accept a custom limit parameter', async () => {
        setupDynamoDBForBlogList([]);

        const event = buildListPostsEvent({ limit: '10' });
        await handler(event);

        const queryCallArg = mockDynamoDBSend.mock.calls[0][0] as {
          input: Record<string, unknown>;
        };
        expect(queryCallArg.input.Limit).toBe(10);
      });
    });

    describe('validation', () => {
      it('should return 400 when limit is 0', async () => {
        const event = buildListPostsEvent({ limit: '0' });
        const result = await handler(event);

        expect(statusCode(result)).toBe(400);
        const body = parseBody(result);
        expect(body.error).toBeDefined();
      });

      it('should return 400 when limit exceeds 50', async () => {
        const event = buildListPostsEvent({ limit: '51' });
        const result = await handler(event);

        expect(statusCode(result)).toBe(400);
        const body = parseBody(result);
        expect(body.error).toBeDefined();
      });

      it('should return 400 when limit is negative', async () => {
        const event = buildListPostsEvent({ limit: '-5' });
        const result = await handler(event);

        expect(statusCode(result)).toBe(400);
        const body = parseBody(result);
        expect(body.error).toBeDefined();
      });

      it('should return 400 when limit is not a number', async () => {
        const event = buildListPostsEvent({ limit: 'abc' });
        const result = await handler(event);

        expect(statusCode(result)).toBe(400);
        const body = parseBody(result);
        expect(body.error).toBeDefined();
      });

      it('should return 400 when cursor is not valid base64 JSON', async () => {
        const event = buildListPostsEvent({ cursor: '!!!not-base64!!!' });
        const result = await handler(event);

        expect(statusCode(result)).toBe(400);
        const body = parseBody(result);
        expect(body.error).toBeDefined();
      });
    });

    describe('error handling', () => {
      it('should return 500 when DynamoDB query fails', async () => {
        mockDynamoDBSend.mockRejectedValueOnce(new Error('DynamoDB provisioned throughput exceeded'));

        const event = buildListPostsEvent();
        const result = await handler(event);

        expect(statusCode(result)).toBe(500);
        const body = parseBody(result);
        expect(body.error).toBeDefined();
      });
    });

    describe('invariants', () => {
      it('should query GSI1 with GSI1PK = BLOG#PUBLISHED and ScanIndexForward = false', async () => {
        setupDynamoDBForBlogList([]);

        const event = buildListPostsEvent();
        await handler(event);

        const queryCallArg = mockDynamoDBSend.mock.calls[0][0] as {
          input: Record<string, unknown>;
        };

        // Should use GSI1 index
        expect(queryCallArg.input.IndexName).toBeDefined();

        // ScanIndexForward must be false for reverse chronological order
        expect(queryCallArg.input.ScanIndexForward).toBe(false);

        // Expression attribute values must contain BLOG#PUBLISHED
        const expressionValues = queryCallArg.input.ExpressionAttributeValues as Record<string, unknown>;
        const gsiPKValue = Object.values(expressionValues).find(
          (value) => value === 'BLOG#PUBLISHED'
        );
        expect(gsiPKValue).toBeDefined();
      });
    });
  });

  // =========================================================================
  // GET /blog/posts/{slug} — GetPostBySlug (public)
  // =========================================================================

  describe('GET /blog/posts/{slug} (GetPostBySlug)', () => {
    describe('success cases', () => {
      it('should return 200 with the full blog post including content', async () => {
        const post = createMockBlogPost({
          id: 'blog-get-001',
          slug: 'my-great-post',
          title: 'My Great Post',
          content: '# Full Markdown Content\n\nThis is the full blog post.',
        });
        const slugIndex = createMockSlugIndex({
          slug: 'my-great-post',
          blogId: 'blog-get-001',
        });
        setupDynamoDBForBlogGet(post, slugIndex);

        const event = buildGetPostBySlugEvent('my-great-post');
        const result = await handler(event);

        expect(statusCode(result)).toBe(200);

        const body = parseBody(result);
        expect(body.post).toBeDefined();
        const responsePost = body.post as Record<string, unknown>;
        expect(responsePost.title).toBe('My Great Post');
        expect(responsePost.content).toBe('# Full Markdown Content\n\nThis is the full blog post.');
        expect(responsePost.slug).toBe('my-great-post');
      });

      it('should include SEO meta fields in the response', async () => {
        const post = createMockBlogPost({
          id: 'blog-seo-001',
          slug: 'seo-test',
          metaTitle: 'SEO Optimized Title',
          metaDescription: 'SEO optimized description for search engines.',
          ogImageUrl: 'https://cdn.example.com/og.webp',
        });
        const slugIndex = createMockSlugIndex({
          slug: 'seo-test',
          blogId: 'blog-seo-001',
        });
        setupDynamoDBForBlogGet(post, slugIndex);

        const event = buildGetPostBySlugEvent('seo-test');
        const result = await handler(event);

        expect(statusCode(result)).toBe(200);

        const body = parseBody(result);
        const responsePost = body.post as Record<string, unknown>;
        expect(responsePost.metaTitle).toBe('SEO Optimized Title');
        expect(responsePost.metaDescription).toBe('SEO optimized description for search engines.');
        expect(responsePost.ogImageUrl).toBe('https://cdn.example.com/og.webp');
      });

      it('should return all fields defined in GetPostBySlugResponse', async () => {
        const post = createMockBlogPost({
          id: 'blog-fields-001',
          slug: 'fields-test',
        });
        const slugIndex = createMockSlugIndex({
          slug: 'fields-test',
          blogId: 'blog-fields-001',
        });
        setupDynamoDBForBlogGet(post, slugIndex);

        const event = buildGetPostBySlugEvent('fields-test');
        const result = await handler(event);

        expect(statusCode(result)).toBe(200);

        const body = parseBody(result);
        const responsePost = body.post as Record<string, unknown>;

        const requiredFields = [
          'id',
          'title',
          'slug',
          'content',
          'excerpt',
          'heroImageUrl',
          'metaTitle',
          'metaDescription',
          'ogImageUrl',
          'authorName',
          'authorOrg',
          'publishedAt',
          'updatedAt',
        ];

        for (const field of requiredFields) {
          expect(responsePost, `Field "${field}" must be present in the response`).toHaveProperty(field);
        }
      });
    });

    describe('error handling', () => {
      it('should return 404 when slug does not exist', async () => {
        setupDynamoDBForBlogGet(undefined, undefined);

        const event = buildGetPostBySlugEvent('nonexistent-slug');
        const result = await handler(event);

        expect(statusCode(result)).toBe(404);
        const body = parseBody(result);
        expect(body.error).toBeDefined();
      });

      it('should return 404 when the post found by slug is deleted', async () => {
        const deletedPost = createMockBlogPost({
          id: 'blog-deleted-slug-001',
          slug: 'deleted-post-slug',
          status: 'deleted',
        });
        const slugIndex = createMockSlugIndex({
          slug: 'deleted-post-slug',
          blogId: 'blog-deleted-slug-001',
        });
        setupDynamoDBForBlogGet(deletedPost, slugIndex);

        const event = buildGetPostBySlugEvent('deleted-post-slug');
        const result = await handler(event);

        expect(statusCode(result)).toBe(404);
        const body = parseBody(result);
        expect(body.error).toBeDefined();
      });

      it('should return 500 when DynamoDB fails during slug lookup', async () => {
        mockDynamoDBSend.mockRejectedValueOnce(new Error('DynamoDB service unavailable'));

        const event = buildGetPostBySlugEvent('any-slug');
        const result = await handler(event);

        expect(statusCode(result)).toBe(500);
        const body = parseBody(result);
        expect(body.error).toBeDefined();
      });
    });

    describe('invariants', () => {
      it('should not include DynamoDB key fields in the response', async () => {
        const post = createMockBlogPost({
          id: 'blog-no-keys-001',
          slug: 'no-keys-test',
        });
        const slugIndex = createMockSlugIndex({
          slug: 'no-keys-test',
          blogId: 'blog-no-keys-001',
        });
        setupDynamoDBForBlogGet(post, slugIndex);

        const event = buildGetPostBySlugEvent('no-keys-test');
        const result = await handler(event);

        expect(statusCode(result)).toBe(200);

        const body = parseBody(result);
        const responsePost = body.post as Record<string, unknown>;
        expect(responsePost.PK).toBeUndefined();
        expect(responsePost.SK).toBeUndefined();
        expect(responsePost.GSI1PK).toBeUndefined();
        expect(responsePost.GSI1SK).toBeUndefined();
      });
    });
  });

  // =========================================================================
  // BlogAdminHandler — Route Matching
  // =========================================================================

  describe('BlogAdminHandler (routing)', () => {
    it('should return 405 for an unsupported HTTP method on /blog/posts', async () => {
      const event = createMockApiEvent({
        method: 'PATCH',
        path: '/blog/posts',
        body: null,
      });
      const result = await handler(event);

      expect(statusCode(result)).toBe(405);
      const body = parseBody(result);
      expect(body.error).toBeDefined();
    });

    it('should return 405 for POST on /blog/posts/{id} (create uses /blog/posts)', async () => {
      const event = createMockApiEvent({
        method: 'POST',
        path: '/blog/posts/some-id',
        body: JSON.stringify({ title: 'Test' }),
        pathParameters: { id: 'some-id' },
      });
      const result = await handler(event);

      expect(statusCode(result)).toBe(405);
      const body = parseBody(result);
      expect(body.error).toBeDefined();
    });

    it('should return 405 for an unrecognized path', async () => {
      const event = createMockApiEvent({
        method: 'GET',
        path: '/blog/unknown-route',
        body: null,
      });
      const result = await handler(event);

      expect(statusCode(result)).toBe(405);
      const body = parseBody(result);
      expect(body.error).toBeDefined();
    });
  });
});
