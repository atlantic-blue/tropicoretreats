/**
 * Security tests for Slice S-2: Image Pipeline
 *
 * These tests prove the existence of security vulnerabilities in the
 * image upload presign handler (blogAdmin) and image processor handler.
 * Each test is expected to FAIL until the implementer fixes the
 * underlying vulnerability.
 *
 * Vulnerabilities covered:
 *   1. CRITICAL: Path traversal / S3 key injection via filename — attacker
 *      can craft filenames with "../" or "/" to write outside uploads/ prefix
 *   2. HIGH: No ContentLength restriction on presigned URL — arbitrary file
 *      size uploads possible (contract says 10MB limit)
 *   3. HIGH: SVG bomb / decompression bomb via sharp — malicious images with
 *      extreme dimensions can exhaust Lambda memory
 *   4. MEDIUM: Filename allows null bytes and control characters — can cause
 *      truncation or log injection
 *   5. MEDIUM: Image processor does not validate pixel dimensions before
 *      resizing — extreme-dimension images cause OOM
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { APIGatewayProxyResultV2 } from 'aws-lambda';
import {
  createMockApiEvent,
  createImageUploadRequest,
  createMockImageS3Event,
} from '../fixtures/factories.js';
import {
  mockDynamoDBSend,
  mockS3Send,
  mockGetSignedUrl,
  mockSharp,
  mockSharpInstance,
  resetAllMocks,
  mockS3GetObjectWithMetadata,
  mockS3PutObject,
  mockS3DeleteObject,
} from '../fixtures/mocks.js';

// ---------------------------------------------------------------------------
// Predictable ULID for assertions
// ---------------------------------------------------------------------------

const MOCK_ULID = '01HTESTULID_SEC_0001';

// ---------------------------------------------------------------------------
// Module-level mocks — must be hoisted before any imports of the handler
// ---------------------------------------------------------------------------

vi.mock('@aws-sdk/client-s3', () => {
  const S3Client = vi.fn().mockImplementation(() => ({
    send: mockS3Send,
  }));
  const PutObjectCommand = vi.fn().mockImplementation((input) => ({
    input,
    _commandName: 'PutObjectCommand',
  }));
  const GetObjectCommand = vi.fn().mockImplementation((input) => ({
    input,
    _commandName: 'GetObjectCommand',
  }));
  const DeleteObjectCommand = vi.fn().mockImplementation((input) => ({
    input,
    _commandName: 'DeleteObjectCommand',
  }));
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

vi.mock('sharp', () => {
  return { default: mockSharp };
});

// ---------------------------------------------------------------------------
// Import handlers AFTER mocks are registered
// ---------------------------------------------------------------------------

const { handler: blogAdminHandler } = await import('../../src/handlers/blogAdmin.js');
const { handler: imageProcessorHandler } = await import('../../src/handlers/imageProcessor.js');

// ---------------------------------------------------------------------------
// Test constants
// ---------------------------------------------------------------------------

const OPERATOR_EMAIL = 'operator@tropicoretreat.com';
const TEST_BUCKET = 'tropico-blog-images-test';
const FAKE_IMAGE_BYTES = Buffer.from('fake-jpeg-image-bytes');

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

describe('Security: Image Pipeline (S-2)', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  // =========================================================================
  // 1. CRITICAL: Path traversal / S3 key injection via filename
  // =========================================================================

  describe('[Input Handling] Path traversal in filename', () => {
    it('should reject filename containing path traversal sequences (../)', async () => {
      // An attacker crafts a filename with ../ to escape the uploads/{ulid}/ directory.
      // Without validation, the S3 key becomes: uploads/{ulid}/../../processed/VICTIM/hero.webp
      // This could overwrite another user's processed images.
      const request = createImageUploadRequest({
        filename: '../../processed/VICTIM_ULID/hero.webp',
      });
      const event = buildPresignEvent(request);
      const result = await blogAdminHandler(event);

      // Should reject with 400, not generate a presigned URL with a traversal path
      expect(statusCode(result)).toBe(400);
    });

    it('should reject filename containing forward slashes', async () => {
      // Forward slashes in filenames create additional S3 key segments,
      // allowing the attacker to write to arbitrary S3 key paths within
      // the bucket. The key would become: uploads/{ulid}/subdir/../../other-prefix/file.jpg
      const request = createImageUploadRequest({
        filename: 'subdir/../../other-prefix/malicious.jpg',
      });
      const event = buildPresignEvent(request);
      const result = await blogAdminHandler(event);

      expect(statusCode(result)).toBe(400);
    });

    it('should reject filename containing backslashes', async () => {
      // Backslashes can be interpreted as path separators on some systems
      // and some S3 client libraries normalize them to forward slashes.
      const request = createImageUploadRequest({
        filename: '..\\..\\processed\\VICTIM\\hero.webp',
      });
      const event = buildPresignEvent(request);
      const result = await blogAdminHandler(event);

      expect(statusCode(result)).toBe(400);
    });

    it('should reject filename containing URL-encoded traversal (%2e%2e%2f)', async () => {
      // URL-encoded path traversal sequences may be decoded by downstream
      // systems (S3, CloudFront, or CDN), resulting in key confusion.
      const request = createImageUploadRequest({
        filename: '%2e%2e%2fprocessed%2fVICTIM%2fhero.webp',
      });
      const event = buildPresignEvent(request);
      const result = await blogAdminHandler(event);

      expect(statusCode(result)).toBe(400);
    });

    it('should reject filename that is just path traversal dots', async () => {
      const request = createImageUploadRequest({
        filename: '..',
      });
      const event = buildPresignEvent(request);
      const result = await blogAdminHandler(event);

      expect(statusCode(result)).toBe(400);
    });

    it('should not produce an S3 key containing path traversal when filename has dots and slashes', async () => {
      // Even if the handler does not return 400, the generated S3 key
      // must never contain ../ sequences or escape the uploads/ prefix.
      const request = createImageUploadRequest({
        filename: '../../../etc/passwd',
      });
      const event = buildPresignEvent(request);
      const result = await blogAdminHandler(event);

      if (statusCode(result) === 200) {
        const body = parseBody(result);
        const key = body.key as string;
        expect(key).not.toContain('..');
        expect(key).toMatch(/^uploads\/[^/]+\/[^/]+$/);
      } else {
        // Rejecting is also acceptable
        expect(statusCode(result)).toBe(400);
      }
    });
  });

  // =========================================================================
  // 2. CRITICAL: Null bytes and control characters in filename
  // =========================================================================

  describe('[Input Handling] Null bytes and control characters in filename', () => {
    it('should reject filename containing null byte', async () => {
      // Null bytes can cause string truncation in C-based libraries and some
      // file systems, potentially leading to file type confusion.
      // e.g., "malicious.exe\0.jpg" might be stored as "malicious.exe"
      const request = createImageUploadRequest({
        filename: 'malicious.exe\0.jpg',
      });
      const event = buildPresignEvent(request);
      const result = await blogAdminHandler(event);

      expect(statusCode(result)).toBe(400);
    });

    it('should reject filename containing newline characters', async () => {
      // Newlines in filenames can enable log injection attacks and
      // cause issues with HTTP headers if the filename is reflected.
      const request = createImageUploadRequest({
        filename: 'image\nX-Injected-Header: malicious\n.jpg',
      });
      const event = buildPresignEvent(request);
      const result = await blogAdminHandler(event);

      expect(statusCode(result)).toBe(400);
    });

    it('should reject filename containing carriage return', async () => {
      const request = createImageUploadRequest({
        filename: 'image\r\nContent-Type: text/html\r\n.jpg',
      });
      const event = buildPresignEvent(request);
      const result = await blogAdminHandler(event);

      expect(statusCode(result)).toBe(400);
    });
  });

  // =========================================================================
  // 3. HIGH: Missing ContentLength limit on presigned URL
  // =========================================================================

  describe('[Business Logic] Presigned URL content-length enforcement', () => {
    it('should include ContentLengthRange condition in presigned URL to enforce 10MB limit', async () => {
      // The contract specifies a 10MB size limit enforced via presigned URL.
      // Without ContentLength conditions, the presigned URL allows arbitrary
      // file sizes, enabling storage cost attacks and DoS via the processor.
      const request = createImageUploadRequest({
        filename: 'photo.jpg',
        contentType: 'image/jpeg',
        purpose: 'hero',
      });
      const event = buildPresignEvent(request);
      const result = await blogAdminHandler(event);

      expect(statusCode(result)).toBe(200);

      // Verify that getSignedUrl was called with a PutObjectCommand that
      // includes a content-length condition. The PutObjectCommand should have
      // ContentLength set, or the presigned URL conditions should restrict size.
      expect(mockGetSignedUrl).toHaveBeenCalledTimes(1);

      // Extract the PutObjectCommand input that was used to generate the URL
      const putCommandArg = mockGetSignedUrl.mock.calls[0][1];
      const commandInput = putCommandArg?.input;

      // The presigned URL must enforce a size limit. This can be done via:
      // 1. Setting ContentLength on the PutObjectCommand
      // 2. Using Conditions on the getSignedUrl call
      // Either the command input must have ContentLength, or the
      // getSignedUrl options must include conditions.
      const signedUrlOptions = mockGetSignedUrl.mock.calls[0][2];

      const hasContentLength = commandInput?.ContentLength !== undefined;
      const hasConditions = signedUrlOptions?.conditions !== undefined;

      // At least one of these size-limiting mechanisms must be present
      expect(hasContentLength || hasConditions).toBe(true);
    });
  });

  // =========================================================================
  // 4. HIGH: Image processor pixel dimension limits
  // =========================================================================

  describe('[Business Logic] Image dimension validation in processor', () => {
    it('should reject images with extreme pixel dimensions to prevent memory exhaustion', async () => {
      // An attacker uploads a valid image file with extreme dimensions
      // (e.g., 100000x100000 pixels). When sharp loads this into memory
      // for resizing, it can consume gigabytes of RAM, crashing the Lambda.
      //
      // sharp.metadata() reports dimensions without loading the full image.
      // The processor should check these dimensions and reject extreme values
      // BEFORE calling resize().
      const ulid = '01HTESTULID_DIM_001';
      const event = createMockImageS3Event({
        bucketName: TEST_BUCKET,
        objectKey: `uploads/${ulid}/huge-image.jpg`,
      });

      // Mock S3 GetObject: return image bytes
      mockS3GetObjectWithMetadata(FAKE_IMAGE_BYTES, { purpose: 'hero' });

      // Mock sharp.metadata to report extreme dimensions
      mockSharpInstance.metadata.mockResolvedValueOnce({
        format: 'jpeg',
        width: 100000,
        height: 100000,
      });

      // Mock S3 DeleteObject for cleanup
      mockS3DeleteObject();

      await imageProcessorHandler(event);

      // The processor should NOT proceed to resize an image with extreme
      // dimensions. It should either delete it or skip processing.
      // Verify no PutObject calls were made (no processed output).
      const putObjectCalls = mockS3Send.mock.calls.filter(
        (call) => call[0]?._commandName === 'PutObjectCommand'
      );
      expect(putObjectCalls.length).toBe(0);
    });

    it('should reject images where width * height exceeds a safe pixel count', async () => {
      // Even if individual dimensions are not extreme, the product can be.
      // A 50000x50000 image = 2.5 billion pixels = ~10GB uncompressed RGBA.
      const ulid = '01HTESTULID_DIM_002';
      const event = createMockImageS3Event({
        bucketName: TEST_BUCKET,
        objectKey: `uploads/${ulid}/wide-image.jpg`,
      });

      mockS3GetObjectWithMetadata(FAKE_IMAGE_BYTES, { purpose: 'inline' });

      mockSharpInstance.metadata.mockResolvedValueOnce({
        format: 'png',
        width: 50000,
        height: 50000,
      });

      mockS3DeleteObject();

      await imageProcessorHandler(event);

      const putObjectCalls = mockS3Send.mock.calls.filter(
        (call) => call[0]?._commandName === 'PutObjectCommand'
      );
      expect(putObjectCalls.length).toBe(0);
    });
  });

  // =========================================================================
  // 5. MEDIUM: SVG format bypass in image processor
  // =========================================================================

  describe('[Input Handling] SVG format rejection in processor', () => {
    it('should reject SVG files even if sharp.metadata succeeds', async () => {
      // While the presign endpoint rejects image/svg+xml content type,
      // an attacker can upload an SVG with a presigned URL by ignoring
      // the ContentType constraint. Sharp can process SVGs, which may
      // contain XML entity expansion attacks (billion laughs) or external
      // entity references (XXE) that cause DoS or SSRF.
      //
      // The image processor should check the format from sharp.metadata()
      // and reject SVG files explicitly.
      const ulid = '01HTESTULID_SVG_001';
      const event = createMockImageS3Event({
        bucketName: TEST_BUCKET,
        objectKey: `uploads/${ulid}/malicious.svg`,
      });

      mockS3GetObjectWithMetadata(
        Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>'),
        { purpose: 'hero' }
      );

      // Sharp identifies SVGs via magic bytes
      mockSharpInstance.metadata.mockResolvedValueOnce({
        format: 'svg',
        width: 800,
        height: 600,
      });

      mockS3DeleteObject();

      await imageProcessorHandler(event);

      // SVG files must not be processed — they should be deleted or skipped.
      // No PutObject calls should be made for SVG format.
      const putObjectCalls = mockS3Send.mock.calls.filter(
        (call) => call[0]?._commandName === 'PutObjectCommand'
      );
      expect(putObjectCalls.length).toBe(0);
    });
  });

  // =========================================================================
  // 6. MEDIUM: Image format whitelist validation in processor
  // =========================================================================

  describe('[Input Handling] Image format whitelist in processor', () => {
    it('should only process images with allowed formats (jpeg, png, webp, gif)', async () => {
      // The presign endpoint restricts contentType to jpeg/png/webp/gif,
      // but an attacker could upload a TIFF file (which sharp supports)
      // using a JPEG presigned URL. TIFF files can be very large when
      // decompressed and may contain exploitable features.
      //
      // The processor should validate the detected format against the
      // same whitelist as the presign schema.
      const ulid = '01HTESTULID_TIFF_001';
      const event = createMockImageS3Event({
        bucketName: TEST_BUCKET,
        objectKey: `uploads/${ulid}/photo.tiff`,
      });

      mockS3GetObjectWithMetadata(FAKE_IMAGE_BYTES, { purpose: 'hero' });

      mockSharpInstance.metadata.mockResolvedValueOnce({
        format: 'tiff',
        width: 2000,
        height: 1500,
      });

      mockS3DeleteObject();

      await imageProcessorHandler(event);

      // TIFF is not in the allowed format list — should not be processed
      const putObjectCalls = mockS3Send.mock.calls.filter(
        (call) => call[0]?._commandName === 'PutObjectCommand'
      );
      expect(putObjectCalls.length).toBe(0);
    });
  });
});
