/**
 * Security tests for Slice S-1: Blog CMS (Create + Publish + Render)
 *
 * These tests prove the existence of security vulnerabilities in the
 * blogAdmin handler. Each test is expected to FAIL until the implementer
 * fixes the underlying vulnerability.
 *
 * Vulnerabilities covered:
 *   1. CRITICAL: No handler-level auth check — write operations proceed
 *      without verifying JWT claims exist
 *   2. HIGH: Pagination cursor injection — attacker-crafted ExclusiveStartKey
 *      can scan arbitrary DynamoDB partitions
 *   3. HIGH: Unvalidated path parameter `id` — NoSQL key injection via
 *      specially crafted ID values in PUT/DELETE routes
 *   4. MEDIUM: Unvalidated slug path parameter — slug used directly in
 *      DynamoDB key construction without regex validation
 *   5. MEDIUM: Prototype pollution via __proto__ in JSON body
 *   6. MEDIUM: XSS payloads accepted in title/content fields
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

const { handler } = await import('../../src/handlers/blogAdmin.js');

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
 * Builds a mock event with NO JWT authorizer context, simulating a request
 * that bypasses API Gateway auth (e.g., direct Lambda invocation, or
 * misconfigured API Gateway route without authorizer).
 */
function buildUnauthenticatedEvent(
  method: string,
  path: string,
  body?: string | null,
  pathParameters?: Record<string, string>
) {
  return {
    version: '2.0',
    routeKey: `${method} ${path}`,
    rawPath: path,
    rawQueryString: '',
    headers: { 'content-type': 'application/json' },
    requestContext: {
      accountId: '123456789012',
      apiId: 'test-api-id',
      domainName: 'test.execute-api.us-east-1.amazonaws.com',
      domainPrefix: 'test',
      http: {
        method,
        path,
        protocol: 'HTTP/1.1',
        sourceIp: '127.0.0.1',
        userAgent: 'test-agent',
      },
      requestId: 'test-request-id',
      routeKey: `${method} ${path}`,
      stage: '$default',
      time: '01/Jan/2026:00:00:00 +0000',
      timeEpoch: 1735689600000,
      // NO authorizer field — simulates missing JWT
    },
    body: body ?? undefined,
    pathParameters: pathParameters
      ? pathParameters
      : undefined,
    isBase64Encoded: false,
  };
}

/**
 * Builds an event where authorizer exists but claims are empty/missing,
 * simulating a malformed or expired token scenario.
 */
function buildEmptyClaimsEvent(
  method: string,
  path: string,
  body?: string | null,
  pathParameters?: Record<string, string>
) {
  return {
    version: '2.0',
    routeKey: `${method} ${path}`,
    rawPath: path,
    rawQueryString: '',
    headers: { 'content-type': 'application/json' },
    requestContext: {
      accountId: '123456789012',
      apiId: 'test-api-id',
      domainName: 'test.execute-api.us-east-1.amazonaws.com',
      domainPrefix: 'test',
      http: {
        method,
        path,
        protocol: 'HTTP/1.1',
        sourceIp: '127.0.0.1',
        userAgent: 'test-agent',
      },
      requestId: 'test-request-id',
      routeKey: `${method} ${path}`,
      stage: '$default',
      time: '01/Jan/2026:00:00:00 +0000',
      timeEpoch: 1735689600000,
      authorizer: {
        jwt: {
          claims: {},
          scopes: null,
        },
      },
    },
    body: body ?? undefined,
    pathParameters: pathParameters
      ? pathParameters
      : undefined,
    isBase64Encoded: false,
  };
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('Security: Blog CMS (S-1)', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  // =========================================================================
  // 1. Authentication — handler-level auth checks
  // =========================================================================

  describe('[Authentication] Handler-level auth enforcement', () => {
    it('should reject POST /blog/posts with 401 when JWT authorizer is missing', async () => {
      setupDynamoDBForBlogCreate();

      const body = createBlogPostRequest({
        title: 'Malicious Post',
        content: 'Created without authentication',
      });
      const event = buildUnauthenticatedEvent(
        'POST',
        '/blog/posts',
        JSON.stringify(body)
      );

      const result = await handler(event);

      // The handler should return 401 when no JWT claims are present.
      // Currently it proceeds with creation and falls back to 'Unknown' author.
      expect(statusCode(result)).toBe(401);
    });

    it('should reject PUT /blog/posts/{id} with 401 when JWT authorizer is missing', async () => {
      const existingPost = createMockBlogPost({ id: 'BLOG_AUTH_TEST_001' });
      setupDynamoDBForBlogUpdate(existingPost);

      const event = buildUnauthenticatedEvent(
        'PUT',
        '/blog/posts/BLOG_AUTH_TEST_001',
        JSON.stringify({ title: 'Hijacked Title' }),
        { id: 'BLOG_AUTH_TEST_001' }
      );

      const result = await handler(event);

      // Should return 401, not allow the update
      expect(statusCode(result)).toBe(401);
    });

    it('should reject DELETE /blog/posts/{id} with 401 when JWT authorizer is missing', async () => {
      const existingPost = createMockBlogPost({ id: 'BLOG_AUTH_TEST_002' });
      setupDynamoDBForBlogDelete(existingPost);

      const event = buildUnauthenticatedEvent(
        'DELETE',
        '/blog/posts/BLOG_AUTH_TEST_002',
        null,
        { id: 'BLOG_AUTH_TEST_002' }
      );

      const result = await handler(event);

      // Should return 401, not delete the post
      expect(statusCode(result)).toBe(401);
    });

    it('should reject POST /blog/posts with 401 when JWT claims are empty', async () => {
      setupDynamoDBForBlogCreate();

      const body = createBlogPostRequest({
        title: 'Empty Claims Post',
        content: 'Created with empty JWT claims',
      });
      const event = buildEmptyClaimsEvent(
        'POST',
        '/blog/posts',
        JSON.stringify(body)
      );

      const result = await handler(event);

      // Empty claims (no email, no username, no sub) should not be allowed
      // to create posts. Currently falls back to 'Unknown' author.
      expect(statusCode(result)).toBe(401);
    });

    it('should allow GET /blog/posts without auth (public route)', async () => {
      setupDynamoDBForBlogList([]);

      const event = buildUnauthenticatedEvent('GET', '/blog/posts');

      const result = await handler(event);

      // Public route should work without auth
      expect(statusCode(result)).toBe(200);
    });

    it('should allow GET /blog/posts/{slug} without auth (public route)', async () => {
      const blogPost = createMockBlogPost({ slug: 'test-public-slug' });
      const slugIndex = createMockSlugIndex({ slug: 'test-public-slug', blogId: blogPost.id });
      setupDynamoDBForBlogGet(blogPost, slugIndex);

      const event = buildUnauthenticatedEvent(
        'GET',
        '/blog/posts/test-public-slug',
        null,
        { slug: 'test-public-slug' }
      );

      const result = await handler(event);

      // Public route should work without auth
      expect(statusCode(result)).toBe(200);
    });
  });

  // =========================================================================
  // 2. Pagination cursor injection
  // =========================================================================

  describe('[Input Handling] Pagination cursor validation', () => {
    it('should reject cursor containing DynamoDB key fields targeting other partitions', async () => {
      // An attacker crafts a cursor that points DynamoDB's ExclusiveStartKey
      // to a completely different partition (e.g., LEAD# instead of BLOG#)
      const maliciousCursor = Buffer.from(
        JSON.stringify({
          PK: 'LEAD#secret-lead-id',
          SK: 'LEAD#secret-lead-id',
          GSI1PK: 'STATUS#NEW',
          GSI1SK: '2026-01-01T00:00:00.000Z',
        })
      ).toString('base64');

      setupDynamoDBForBlogList([]);

      const event = createMockApiEvent({
        method: 'GET',
        path: '/blog/posts',
        body: null,
        queryStringParameters: { cursor: maliciousCursor },
      });

      const result = await handler(event);

      // The cursor should be validated to ensure it only references the
      // blog GSI1 partition, not arbitrary DynamoDB partitions.
      // A 400 response means the cursor was rejected as invalid.
      expect(statusCode(result)).toBe(400);
    });

    it('should reject cursor with unexpected structure to prevent DynamoDB key manipulation', async () => {
      // Cursor with extra fields that could leak into ExclusiveStartKey
      const craftedCursor = Buffer.from(
        JSON.stringify({
          PK: 'SLUG#admin-secret-slug',
          SK: 'SLUG#admin-secret-slug',
        })
      ).toString('base64');

      setupDynamoDBForBlogList([]);

      const event = createMockApiEvent({
        method: 'GET',
        path: '/blog/posts',
        body: null,
        queryStringParameters: { cursor: craftedCursor },
      });

      const result = await handler(event);

      // Cursor structure should be validated against expected key schema
      expect(statusCode(result)).toBe(400);
    });
  });

  // =========================================================================
  // 3. Path parameter injection
  // =========================================================================

  describe('[Input Handling] Path parameter validation', () => {
    it('should reject PUT with id containing path traversal characters', async () => {
      const event = createMockApiEvent({
        method: 'PUT',
        path: '/blog/posts/../../admin',
        body: JSON.stringify({ title: 'Traversal Attack' }),
        pathParameters: { id: '../../admin' },
      });

      const result = await handler(event);

      // Path traversal in ID should be rejected at the boundary
      expect(statusCode(result)).toBe(400);
    });

    it('should reject DELETE with id containing DynamoDB key injection', async () => {
      // Attacker tries to inject a crafted ID that resolves to a different
      // DynamoDB partition key pattern
      const maliciousId = 'LEAD#secret-id';

      const event = createMockApiEvent({
        method: 'DELETE',
        path: `/blog/posts/${maliciousId}`,
        body: null,
        pathParameters: { id: maliciousId },
      });

      const result = await handler(event);

      // The ID format should be validated (e.g., ULID pattern only)
      expect(statusCode(result)).toBe(400);
    });

    it('should reject GET with slug containing path traversal', async () => {
      const maliciousSlug = '..%2F..%2Fadmin';

      const event = createMockApiEvent({
        method: 'GET',
        path: `/blog/posts/${maliciousSlug}`,
        body: null,
        pathParameters: { slug: maliciousSlug },
      });

      const result = await handler(event);

      // Slug should be validated against SLUG_REGEX before DynamoDB lookup
      expect(statusCode(result)).toBe(400);
    });

    it('should reject GET with slug containing DynamoDB key prefix injection', async () => {
      // Slug is used directly in PK: SLUG#{slug} — an attacker could
      // craft a slug like "x\nPK:LEAD#id" to attempt key confusion
      const maliciousSlug = 'LEAD#steal-data';

      const event = createMockApiEvent({
        method: 'GET',
        path: `/blog/posts/${maliciousSlug}`,
        body: null,
        pathParameters: { slug: maliciousSlug },
      });

      const result = await handler(event);

      // Slug should be validated against the slug regex pattern
      // before being used in DynamoDB key construction
      expect(statusCode(result)).toBe(400);
    });
  });

  // =========================================================================
  // 4. Information disclosure
  // =========================================================================

  describe('[Data Protection] Response content', () => {
    it('should not include DynamoDB key fields in create response', async () => {
      setupDynamoDBForBlogCreate();

      const body = createBlogPostRequest({
        title: 'Key Leak Test',
        content: 'Testing that DynamoDB keys are stripped',
      });
      const event = createMockApiEvent({
        method: 'POST',
        path: '/blog/posts',
        body: JSON.stringify(body),
      });

      const result = await handler(event);
      const responseBody = parseBody(result);
      const post = responseBody.post as Record<string, unknown>;

      expect(post).not.toHaveProperty('PK');
      expect(post).not.toHaveProperty('SK');
      expect(post).not.toHaveProperty('GSI1PK');
      expect(post).not.toHaveProperty('GSI1SK');
    });

    it('should not include DynamoDB key fields in list response items', async () => {
      const posts = [
        createMockBlogPost({ slug: 'leak-test-1' }),
        createMockBlogPost({ slug: 'leak-test-2' }),
      ];
      setupDynamoDBForBlogList(posts);

      const event = createMockApiEvent({
        method: 'GET',
        path: '/blog/posts',
        body: null,
      });

      const result = await handler(event);
      const responseBody = parseBody(result);
      const responsePosts = responseBody.posts as Record<string, unknown>[];

      for (const post of responsePosts) {
        expect(post).not.toHaveProperty('PK');
        expect(post).not.toHaveProperty('SK');
        expect(post).not.toHaveProperty('GSI1PK');
        expect(post).not.toHaveProperty('GSI1SK');
      }
    });

    it('should not expose server error details in 500 response body', async () => {
      // Force an internal error by making DynamoDB throw
      mockDynamoDBSend.mockRejectedValueOnce(
        new Error('AccessDeniedException: User is not authorized')
      );

      const body = createBlogPostRequest({
        title: 'Error Leak Test',
        content: 'Testing error message safety',
      });
      const event = createMockApiEvent({
        method: 'POST',
        path: '/blog/posts',
        body: JSON.stringify(body),
      });

      const result = await handler(event);
      const responseBody = parseBody(result);

      expect(statusCode(result)).toBe(500);
      // Error response should not contain internal error details
      expect(JSON.stringify(responseBody)).not.toContain('AccessDeniedException');
      expect(JSON.stringify(responseBody)).not.toContain('not authorized');
      expect(responseBody).not.toHaveProperty('stack');
    });
  });

  // =========================================================================
  // 5. Input validation edge cases
  // =========================================================================

  describe('[Input Handling] Schema bypass attempts', () => {
    it('should reject blog post with __proto__ pollution attempt in body', async () => {
      setupDynamoDBForBlogCreate();

      const maliciousBody = JSON.stringify({
        title: 'Normal Title',
        content: 'Normal content',
        '__proto__': { isAdmin: true },
        'constructor': { prototype: { isAdmin: true } },
      });

      const event = createMockApiEvent({
        method: 'POST',
        path: '/blog/posts',
        body: maliciousBody,
      });

      const result = await handler(event);

      // If the request succeeds (201), verify __proto__ fields are NOT
      // persisted to DynamoDB. Check what was sent to DynamoDB.
      if (statusCode(result) === 201) {
        const dynamoCall = mockDynamoDBSend.mock.calls[0];
        const transactInput = dynamoCall[0]?.input;
        const putItem = transactInput?.TransactItems?.[0]?.Put?.Item;

        // The persisted item must not contain prototype pollution fields
        expect(putItem).not.toHaveProperty('__proto__');
        expect(putItem).not.toHaveProperty('constructor');
      }
      // Alternatively, the request should be rejected entirely
      // (either outcome is acceptable as long as pollution doesn't occur)
    });

    it('should reject blog post with content exceeding 100KB', async () => {
      const oversizedContent = 'x'.repeat(102_401); // 100KB + 1 byte

      const event = createMockApiEvent({
        method: 'POST',
        path: '/blog/posts',
        body: JSON.stringify({
          title: 'Oversized Post',
          content: oversizedContent,
        }),
      });

      const result = await handler(event);

      expect(statusCode(result)).toBe(400);
    });

    it('should reject update with status field (mass assignment prevention)', async () => {
      const existingPost = createMockBlogPost({
        id: 'MASS_ASSIGN_TEST',
        status: 'deleted',
      });
      setupDynamoDBForBlogUpdate(existingPost);

      // Attacker tries to restore a deleted post by passing status in update
      const event = createMockApiEvent({
        method: 'PUT',
        path: '/blog/posts/MASS_ASSIGN_TEST',
        body: JSON.stringify({
          title: 'Restored Post',
          status: 'published', // Should be stripped by Zod
        }),
        pathParameters: { id: 'MASS_ASSIGN_TEST' },
      });

      const result = await handler(event);

      // If the update succeeds, the status should NOT have changed
      // The post was deleted and should remain deleted (or return 404)
      if (statusCode(result) === 200) {
        const responseBody = parseBody(result);
        const post = responseBody.post as Record<string, unknown>;
        expect(post.status).not.toBe('published');
      }
    });

    it('should reject update with PK/SK/GSI fields (DynamoDB key injection via body)', async () => {
      const existingPost = createMockBlogPost({ id: 'KEY_INJECT_TEST' });
      setupDynamoDBForBlogUpdate(existingPost);

      const event = createMockApiEvent({
        method: 'PUT',
        path: '/blog/posts/KEY_INJECT_TEST',
        body: JSON.stringify({
          title: 'Innocent Title',
          PK: 'LEAD#stolen-lead-id',
          SK: 'LEAD#stolen-lead-id',
          GSI1PK: 'STATUS#NEW',
        }),
        pathParameters: { id: 'KEY_INJECT_TEST' },
      });

      const result = await handler(event);

      // Even if the update succeeds, the DynamoDB keys must not be overwritten
      if (statusCode(result) === 200) {
        const dynamoCall = mockDynamoDBSend.mock.calls[1]; // second call is the update
        const transactInput = dynamoCall[0]?.input;
        const putItem = transactInput?.TransactItems?.[0]?.Put?.Item;

        if (putItem) {
          expect(putItem.PK).toBe(`BLOG#KEY_INJECT_TEST`);
          expect(putItem.SK).toBe(`BLOG#KEY_INJECT_TEST`);
          expect(putItem.PK).not.toBe('LEAD#stolen-lead-id');
        }
      }
    });

    it('should reject slug with uppercase characters in create request', async () => {
      const event = createMockApiEvent({
        method: 'POST',
        path: '/blog/posts',
        body: JSON.stringify({
          title: 'Test Post',
          slug: 'Invalid-UPPERCASE-Slug',
          content: 'Test content here',
        }),
      });

      const result = await handler(event);

      expect(statusCode(result)).toBe(400);
    });

    it('should reject slug with special characters in create request', async () => {
      const event = createMockApiEvent({
        method: 'POST',
        path: '/blog/posts',
        body: JSON.stringify({
          title: 'Test Post',
          slug: 'slug-with-<script>alert(1)</script>',
          content: 'Test content here',
        }),
      });

      const result = await handler(event);

      expect(statusCode(result)).toBe(400);
    });

    it('should reject empty body on update with 400 not proceed with empty update', async () => {
      const existingPost = createMockBlogPost({ id: 'EMPTY_BODY_TEST' });
      setupDynamoDBForBlogUpdate(existingPost);

      // event.body is null — handler currently defaults to '{}'
      const event = createMockApiEvent({
        method: 'PUT',
        path: '/blog/posts/EMPTY_BODY_TEST',
        body: null,
        pathParameters: { id: 'EMPTY_BODY_TEST' },
      });

      const result = await handler(event);

      // Should reject with 400 "Request body is required",
      // not silently accept empty object
      expect(statusCode(result)).toBe(400);
    });
  });

  // =========================================================================
  // 6. URL validation (SSRF prevention)
  // =========================================================================

  describe('[Input Handling] URL field validation', () => {
    it('should reject heroImageUrl with file:// protocol (SSRF prevention)', async () => {
      const event = createMockApiEvent({
        method: 'POST',
        path: '/blog/posts',
        body: JSON.stringify({
          title: 'SSRF Test Post',
          content: 'Testing URL validation',
          heroImageUrl: 'file:///etc/passwd',
        }),
      });

      const result = await handler(event);

      expect(statusCode(result)).toBe(400);
    });

    it('should reject heroImageUrl with javascript: protocol', async () => {
      const event = createMockApiEvent({
        method: 'POST',
        path: '/blog/posts',
        body: JSON.stringify({
          title: 'XSS URL Test',
          content: 'Testing URL validation',
          heroImageUrl: 'javascript:alert(1)',
        }),
      });

      const result = await handler(event);

      expect(statusCode(result)).toBe(400);
    });

    it('should reject ogImageUrl with internal network address (SSRF)', async () => {
      const event = createMockApiEvent({
        method: 'POST',
        path: '/blog/posts',
        body: JSON.stringify({
          title: 'SSRF Internal Test',
          content: 'Testing internal URL rejection',
          ogImageUrl: 'http://169.254.169.254/latest/meta-data/',
        }),
      });

      const result = await handler(event);

      // AWS metadata endpoint should be rejected to prevent SSRF
      // Note: Zod's z.string().url() accepts any valid URL including http://
      // This test verifies that only safe URL schemes (https://) are allowed
      expect(statusCode(result)).toBe(400);
    });
  });
});
