/**
 * Integration tests for Slice S-2: PresignImageUpload Contract
 *
 * Contract under test:
 *   - POST /blog/images (JWT required) — returns presigned S3 upload URL,
 *     CloudFront image URL, and S3 key for the uploaded image.
 *
 * These tests drive the blogAdmin Lambda handler directly — no HTTP server,
 * no API Gateway. All AWS SDK boundaries are mocked at the module level.
 *
 * Tests will FAIL until the image upload route is implemented in
 * backend/src/handlers/blogAdmin.ts. That is intentional: these tests
 * ARE the specification.
 *
 * Handler flow under test:
 *   1. Validate JWT claims exist (auth check)
 *   2. Parse + validate request body against ImageUploadSchema
 *   3. Generate ULID for the upload key
 *   4. Create presigned PUT URL via @aws-sdk/s3-request-presigner
 *   5. Return { uploadUrl, imageUrl, key }
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { APIGatewayProxyResultV2 } from 'aws-lambda';
import {
  createMockApiEvent,
  createImageUploadRequest,
  createUnauthenticatedApiEvent,
} from '../fixtures/factories.js';
import {
  mockDynamoDBSend,
  mockS3Send,
  mockGetSignedUrl,
  resetAllMocks,
  mockPresignFailure,
} from '../fixtures/mocks.js';

// ---------------------------------------------------------------------------
// Predictable ULID for assertions
// ---------------------------------------------------------------------------

const MOCK_ULID = '01HTESTULID_IMG_0001';

// ---------------------------------------------------------------------------
// Module-level mocks — must be hoisted before any imports of the handler
// ---------------------------------------------------------------------------

vi.mock('@aws-sdk/client-s3', () => {
  const S3Client = vi.fn().mockImplementation(() => ({
    send: mockS3Send,
  }));
  const PutObjectCommand = vi.fn().mockImplementation((input) => ({ input }));
  const GetObjectCommand = vi.fn().mockImplementation((input) => ({ input }));
  const DeleteObjectCommand = vi.fn().mockImplementation((input) => ({ input }));
  return { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand };
});

vi.mock('@aws-sdk/s3-request-presigner', () => {
  return { getSignedUrl: mockGetSignedUrl };
});

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

vi.mock('ulidx', () => {
  const ulid = vi.fn().mockReturnValue(MOCK_ULID);
  return { ulid };
});

// ---------------------------------------------------------------------------
// Import handler AFTER mocks are registered
// ---------------------------------------------------------------------------

// This import will fail until the blogAdmin handler supports POST /blog/images.
// That failure is the expected state before the implementation slice runs.
const { handler } = await import('../../src/handlers/blogAdmin.js');

// ---------------------------------------------------------------------------
// Test constants
// ---------------------------------------------------------------------------

const OPERATOR_EMAIL = 'operator@tropicoretreat.com';
const CLOUDFRONT_DOMAIN = 'images.tropicoretreat.com';

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
 * Builds a POST /blog/images event for requesting a presigned upload URL.
 */
function buildPresignEvent(body: Record<string, unknown>) {
  return createMockApiEvent({
    method: 'POST',
    path: '/blog/images',
    body: JSON.stringify(body),
    email: OPERATOR_EMAIL,
  });
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('Image Pipeline — PresignImageUpload (S-2)', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  // =========================================================================
  // POST /blog/images — Success cases
  // =========================================================================

  describe('POST /blog/images (PresignImageUpload)', () => {
    describe('success cases', () => {
      it('should return 200 with uploadUrl, imageUrl, and key when request is valid', async () => {
        const request = createImageUploadRequest({
          filename: 'retreat-hero.jpg',
          contentType: 'image/jpeg',
          purpose: 'hero',
        });
        const event = buildPresignEvent(request);
        const result = await handler(event);

        expect(statusCode(result)).toBe(200);

        const body = parseBody(result);
        expect(body.uploadUrl).toBeDefined();
        expect(body.imageUrl).toBeDefined();
        expect(body.key).toBeDefined();
      });

      it('should return a presigned URL string in uploadUrl', async () => {
        const request = createImageUploadRequest();
        const event = buildPresignEvent(request);
        const result = await handler(event);

        const body = parseBody(result);
        expect(typeof body.uploadUrl).toBe('string');
        expect((body.uploadUrl as string).length).toBeGreaterThan(0);
      });

      it('should return an S3 key following the uploads/{ulid}/{filename} pattern', async () => {
        const request = createImageUploadRequest({
          filename: 'my-photo.png',
        });
        const event = buildPresignEvent(request);
        const result = await handler(event);

        const body = parseBody(result);
        const key = body.key as string;

        // Key must start with uploads/ prefix
        expect(key).toMatch(/^uploads\//);

        // Key must contain a ULID-like segment followed by the filename
        expect(key).toMatch(/^uploads\/[A-Z0-9_]+\/my-photo\.png$/);
      });

      it('should return a CloudFront imageUrl for hero purpose', async () => {
        const request = createImageUploadRequest({
          filename: 'hero-banner.jpg',
          contentType: 'image/jpeg',
          purpose: 'hero',
        });
        const event = buildPresignEvent(request);
        const result = await handler(event);

        const body = parseBody(result);
        const imageUrl = body.imageUrl as string;

        // Must point to the CloudFront domain
        expect(imageUrl).toContain(CLOUDFRONT_DOMAIN);

        // Must point to the processed hero path
        expect(imageUrl).toMatch(/\/processed\/[A-Z0-9_]+\/hero\.webp$/);
      });

      it('should return a CloudFront imageUrl for inline purpose', async () => {
        const request = createImageUploadRequest({
          filename: 'inline-photo.png',
          contentType: 'image/png',
          purpose: 'inline',
        });
        const event = buildPresignEvent(request);
        const result = await handler(event);

        const body = parseBody(result);
        const imageUrl = body.imageUrl as string;

        expect(imageUrl).toContain(CLOUDFRONT_DOMAIN);
        expect(imageUrl).toMatch(/\/processed\/[A-Z0-9_]+\/inline\.webp$/);
      });

      it('should accept image/jpeg content type', async () => {
        const request = createImageUploadRequest({ contentType: 'image/jpeg' });
        const event = buildPresignEvent(request);
        const result = await handler(event);

        expect(statusCode(result)).toBe(200);
      });

      it('should accept image/png content type', async () => {
        const request = createImageUploadRequest({ contentType: 'image/png' });
        const event = buildPresignEvent(request);
        const result = await handler(event);

        expect(statusCode(result)).toBe(200);
      });

      it('should accept image/webp content type', async () => {
        const request = createImageUploadRequest({ contentType: 'image/webp' });
        const event = buildPresignEvent(request);
        const result = await handler(event);

        expect(statusCode(result)).toBe(200);
      });

      it('should accept image/gif content type', async () => {
        const request = createImageUploadRequest({ contentType: 'image/gif' });
        const event = buildPresignEvent(request);
        const result = await handler(event);

        expect(statusCode(result)).toBe(200);
      });

      it('should use the ULID in the S3 key', async () => {
        const request = createImageUploadRequest({ filename: 'photo.jpg' });
        const event = buildPresignEvent(request);
        const result = await handler(event);

        const body = parseBody(result);
        const key = body.key as string;

        // The mocked ULID should appear in the key
        expect(key).toContain(MOCK_ULID);
      });

      it('should call getSignedUrl to generate the presigned URL', async () => {
        const request = createImageUploadRequest();
        const event = buildPresignEvent(request);
        await handler(event);

        expect(mockGetSignedUrl).toHaveBeenCalledTimes(1);
      });
    });

    // =========================================================================
    // Validation
    // =========================================================================

    describe('validation', () => {
      it('should return 400 when filename is missing', async () => {
        const request = { contentType: 'image/jpeg', purpose: 'hero' };
        const event = buildPresignEvent(request);
        const result = await handler(event);

        expect(statusCode(result)).toBe(400);
      });

      it('should return 400 when filename is empty string', async () => {
        const request = createImageUploadRequest({ filename: '' });
        const event = buildPresignEvent(request);
        const result = await handler(event);

        expect(statusCode(result)).toBe(400);
      });

      it('should return 400 when contentType is missing', async () => {
        const request = { filename: 'photo.jpg', purpose: 'hero' };
        const event = buildPresignEvent(request);
        const result = await handler(event);

        expect(statusCode(result)).toBe(400);
      });

      it('should return 400 when contentType is not an allowed image MIME type', async () => {
        const request = createImageUploadRequest({ contentType: 'application/pdf' });
        const event = buildPresignEvent(request);
        const result = await handler(event);

        expect(statusCode(result)).toBe(400);
      });

      it('should return 400 when contentType is text/plain', async () => {
        const request = createImageUploadRequest({ contentType: 'text/plain' });
        const event = buildPresignEvent(request);
        const result = await handler(event);

        expect(statusCode(result)).toBe(400);
      });

      it('should return 400 when contentType is image/svg+xml (not in allowed list)', async () => {
        const request = createImageUploadRequest({ contentType: 'image/svg+xml' });
        const event = buildPresignEvent(request);
        const result = await handler(event);

        expect(statusCode(result)).toBe(400);
      });

      it('should return 400 when purpose is missing', async () => {
        const request = { filename: 'photo.jpg', contentType: 'image/jpeg' };
        const event = buildPresignEvent(request);
        const result = await handler(event);

        expect(statusCode(result)).toBe(400);
      });

      it('should return 400 when purpose is not hero or inline', async () => {
        const request = createImageUploadRequest({ purpose: 'thumbnail' });
        const event = buildPresignEvent(request);
        const result = await handler(event);

        expect(statusCode(result)).toBe(400);
      });

      it('should return 400 when request body is empty', async () => {
        const event = createMockApiEvent({
          method: 'POST',
          path: '/blog/images',
          body: null,
          email: OPERATOR_EMAIL,
        });
        const result = await handler(event);

        expect(statusCode(result)).toBe(400);
      });

      it('should return 400 when request body is invalid JSON', async () => {
        const event = createMockApiEvent({
          method: 'POST',
          path: '/blog/images',
          body: 'not-json',
          email: OPERATOR_EMAIL,
        });
        const result = await handler(event);

        expect(statusCode(result)).toBe(400);
      });

      it('should return 400 with an error message describing the validation failure', async () => {
        const request = createImageUploadRequest({ contentType: 'video/mp4' });
        const event = buildPresignEvent(request);
        const result = await handler(event);

        expect(statusCode(result)).toBe(400);
        const body = parseBody(result);
        expect(body.error).toBeDefined();
      });

      it('should return 400 when filename exceeds 255 characters', async () => {
        const longFilename = 'a'.repeat(252) + '.jpg'; // 256 chars total
        const request = createImageUploadRequest({ filename: longFilename });
        const event = buildPresignEvent(request);
        const result = await handler(event);

        expect(statusCode(result)).toBe(400);
      });
    });

    // =========================================================================
    // Security — Auth
    // =========================================================================

    describe('security', () => {
      it('should return 401 when JWT authorizer is missing from the event', async () => {
        const request = createImageUploadRequest();
        const event = createUnauthenticatedApiEvent({
          method: 'POST',
          path: '/blog/images',
          body: JSON.stringify(request),
        });
        const result = await handler(event);

        expect(statusCode(result)).toBe(401);
      });

      it('should return 401 when JWT claims have no sub', async () => {
        const request = createImageUploadRequest();
        const event = createMockApiEvent({
          method: 'POST',
          path: '/blog/images',
          body: JSON.stringify(request),
          sub: '',
          email: OPERATOR_EMAIL,
        });
        const result = await handler(event);

        // Handler should reject empty sub as unauthenticated
        expect(statusCode(result)).toBe(401);
      });
    });

    // =========================================================================
    // Error handling
    // =========================================================================

    describe('error handling', () => {
      it('should return 500 when S3 presign fails', async () => {
        mockPresignFailure('AccessDenied: Unable to generate presigned URL');

        const request = createImageUploadRequest();
        const event = buildPresignEvent(request);
        const result = await handler(event);

        expect(statusCode(result)).toBe(500);
      });

      it('should return an error message when S3 presign fails', async () => {
        mockPresignFailure('Internal service error');

        const request = createImageUploadRequest();
        const event = buildPresignEvent(request);
        const result = await handler(event);

        expect(statusCode(result)).toBe(500);
        const body = parseBody(result);
        expect(body.error).toBeDefined();
      });

      it('should not expose internal error details in the 500 response', async () => {
        mockPresignFailure('S3 bucket policy denies access for arn:aws:iam::123456:role/lambda');

        const request = createImageUploadRequest();
        const event = buildPresignEvent(request);
        const result = await handler(event);

        expect(statusCode(result)).toBe(500);
        const body = parseBody(result);
        // Should not leak IAM ARN or internal details
        const bodyString = JSON.stringify(body);
        expect(bodyString).not.toContain('arn:aws:iam');
        expect(bodyString).not.toContain('bucket policy');
      });
    });

    // =========================================================================
    // Invariants
    // =========================================================================

    describe('invariants', () => {
      it('should use the uploads/ prefix in the S3 key', async () => {
        const request = createImageUploadRequest({ filename: 'test.jpg' });
        const event = buildPresignEvent(request);
        const result = await handler(event);

        const body = parseBody(result);
        expect((body.key as string).startsWith('uploads/')).toBe(true);
      });

      it('should include the original filename in the S3 key', async () => {
        const request = createImageUploadRequest({ filename: 'my-vacation-photo.jpg' });
        const event = buildPresignEvent(request);
        const result = await handler(event);

        const body = parseBody(result);
        expect((body.key as string).endsWith('/my-vacation-photo.jpg')).toBe(true);
      });

      it('should produce a unique ULID segment in the S3 key', async () => {
        const request = createImageUploadRequest({ filename: 'photo.jpg' });
        const event = buildPresignEvent(request);
        const result = await handler(event);

        const body = parseBody(result);
        const key = body.key as string;
        // Pattern: uploads/{ulid}/photo.jpg — the ULID segment should not be empty
        const parts = key.split('/');
        expect(parts.length).toBe(3);
        expect(parts[1].length).toBeGreaterThan(0);
      });

      it('should return imageUrl using https protocol', async () => {
        const request = createImageUploadRequest();
        const event = buildPresignEvent(request);
        const result = await handler(event);

        const body = parseBody(result);
        expect((body.imageUrl as string).startsWith('https://')).toBe(true);
      });

      it('should return imageUrl with .webp extension for the processed image', async () => {
        const request = createImageUploadRequest({
          filename: 'photo.jpg',
          purpose: 'hero',
        });
        const event = buildPresignEvent(request);
        const result = await handler(event);

        const body = parseBody(result);
        expect((body.imageUrl as string).endsWith('.webp')).toBe(true);
      });

      it('should use the same ULID in both the key and imageUrl', async () => {
        const request = createImageUploadRequest({
          filename: 'photo.jpg',
          purpose: 'hero',
        });
        const event = buildPresignEvent(request);
        const result = await handler(event);

        const body = parseBody(result);
        const key = body.key as string;
        const imageUrl = body.imageUrl as string;

        // Extract ULID from key: uploads/{ulid}/photo.jpg
        const keyUlid = key.split('/')[1];
        // imageUrl should contain the same ULID
        expect(imageUrl).toContain(keyUlid);
      });
    });
  });
});
