/**
 * Integration tests for Slice S-2: ImageProcessor Contract
 *
 * Contract under test:
 *   - S3 PutObject event on uploads/ prefix triggers imageProcessor Lambda
 *   - Handler reads uploaded image from S3, validates magic bytes via sharp,
 *     resizes to appropriate dimensions, converts to WebP, writes to processed/ prefix.
 *
 * These tests drive the imageProcessor Lambda handler directly — no HTTP server,
 * no API Gateway. All AWS SDK boundaries and sharp are mocked at the module level.
 *
 * Tests will FAIL until backend/src/handlers/imageProcessor.ts is implemented.
 * That is intentional: these tests ARE the specification.
 *
 * Handler flow under test:
 *   1. Extract bucket name and object key from S3Event
 *   2. Ignore events for keys outside uploads/ prefix
 *   3. S3 GetObject — read source image bytes + metadata (purpose)
 *   4. sharp(bytes).metadata() — validate image via magic bytes check
 *   5. If invalid image: delete from uploads/, do not process
 *   6. Resize + convert to WebP based on purpose:
 *      - hero: 1200px max width, quality 80 + thumbnail 400px, quality 70
 *      - inline: 800px max width, quality 80 + thumbnail 400px, quality 70
 *   7. S3 PutObject x2 — write processed/{ulid}/hero.webp (or inline.webp) + thumbnail.webp
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createMockImageS3Event,
} from '../fixtures/factories.js';
import {
  mockS3Send,
  mockSharp,
  mockSharpInstance,
  resetAllMocks,
  mockS3GetObjectWithMetadata,
  mockS3GetObjectError,
  mockS3PutObject,
  mockS3DeleteObject,
} from '../fixtures/mocks.js';

// ---------------------------------------------------------------------------
// Module-level mocks — must be hoisted before any imports of the handler
// ---------------------------------------------------------------------------

vi.mock('@aws-sdk/client-s3', () => {
  const S3Client = vi.fn().mockImplementation(() => ({
    send: mockS3Send,
  }));
  const GetObjectCommand = vi.fn().mockImplementation((input) => ({
    input,
    _commandName: 'GetObjectCommand',
  }));
  const PutObjectCommand = vi.fn().mockImplementation((input) => ({
    input,
    _commandName: 'PutObjectCommand',
  }));
  const DeleteObjectCommand = vi.fn().mockImplementation((input) => ({
    input,
    _commandName: 'DeleteObjectCommand',
  }));
  return { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand };
});

vi.mock('sharp', () => {
  return { default: mockSharp };
});

// ---------------------------------------------------------------------------
// Import handler AFTER mocks are registered
// ---------------------------------------------------------------------------

// This import will fail until src/handlers/imageProcessor.ts is implemented.
// That failure is the expected state before the implementation slice runs.
const { handler } = await import('../../src/handlers/imageProcessor.js');

// ---------------------------------------------------------------------------
// Test constants
// ---------------------------------------------------------------------------

const TEST_BUCKET = 'tropico-blog-images-test';
const FAKE_IMAGE_BYTES = Buffer.from('fake-jpeg-image-bytes');

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('Image Pipeline — ImageProcessor (S-2)', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  // =========================================================================
  // Success cases — Hero purpose
  // =========================================================================

  describe('hero purpose processing', () => {
    it('should write hero.webp to the processed/ prefix when purpose is hero', async () => {
      // Arrange: S3 event for uploads/{ulid}/photo.jpg
      const ulid = '01HTESTULID_HERO01';
      const event = createMockImageS3Event({
        bucketName: TEST_BUCKET,
        objectKey: `uploads/${ulid}/photo.jpg`,
      });

      // Mock S3 GetObject: return image bytes with purpose=hero metadata
      mockS3GetObjectWithMetadata(FAKE_IMAGE_BYTES, { purpose: 'hero' });
      // Mock S3 PutObject: hero.webp + thumbnail.webp
      mockS3PutObject();
      mockS3PutObject();

      await handler(event);

      // Verify S3 PutObject was called at least twice (hero + thumbnail)
      // Calls: 1=GetObject, 2=PutObject(hero), 3=PutObject(thumbnail)
      const putObjectCalls = mockS3Send.mock.calls.filter(
        (call) => call[0]?._commandName === 'PutObjectCommand'
      );
      expect(putObjectCalls.length).toBeGreaterThanOrEqual(2);
    });

    it('should write hero.webp to processed/{ulid}/hero.webp key', async () => {
      const ulid = '01HTESTULID_HERO02';
      const event = createMockImageS3Event({
        bucketName: TEST_BUCKET,
        objectKey: `uploads/${ulid}/photo.jpg`,
      });

      mockS3GetObjectWithMetadata(FAKE_IMAGE_BYTES, { purpose: 'hero' });
      mockS3PutObject();
      mockS3PutObject();

      await handler(event);

      const putObjectCalls = mockS3Send.mock.calls.filter(
        (call) => call[0]?._commandName === 'PutObjectCommand'
      );
      const putKeys = putObjectCalls.map((call) => call[0]?.input?.Key);

      expect(putKeys).toContain(`processed/${ulid}/hero.webp`);
    });

    it('should resize hero images to max 1200px width', async () => {
      const ulid = '01HTESTULID_HERO03';
      const event = createMockImageS3Event({
        bucketName: TEST_BUCKET,
        objectKey: `uploads/${ulid}/large-photo.jpg`,
      });

      mockS3GetObjectWithMetadata(FAKE_IMAGE_BYTES, { purpose: 'hero' });
      mockS3PutObject();
      mockS3PutObject();

      await handler(event);

      // Verify sharp.resize was called with width: 1200
      const resizeCalls = mockSharpInstance.resize.mock.calls;
      const hasHeroResize = resizeCalls.some(
        (call) => call[0] === 1200 || call[0]?.width === 1200
      );
      expect(hasHeroResize).toBe(true);
    });

    it('should convert hero images to WebP with quality 80', async () => {
      const ulid = '01HTESTULID_HERO04';
      const event = createMockImageS3Event({
        bucketName: TEST_BUCKET,
        objectKey: `uploads/${ulid}/photo.jpg`,
      });

      mockS3GetObjectWithMetadata(FAKE_IMAGE_BYTES, { purpose: 'hero' });
      mockS3PutObject();
      mockS3PutObject();

      await handler(event);

      // Verify sharp.webp was called with quality: 80
      const webpCalls = mockSharpInstance.webp.mock.calls;
      const hasQuality80 = webpCalls.some(
        (call) => call[0]?.quality === 80
      );
      expect(hasQuality80).toBe(true);
    });
  });

  // =========================================================================
  // Success cases — Inline purpose
  // =========================================================================

  describe('inline purpose processing', () => {
    it('should write inline.webp to the processed/ prefix when purpose is inline', async () => {
      const ulid = '01HTESTULID_INLN01';
      const event = createMockImageS3Event({
        bucketName: TEST_BUCKET,
        objectKey: `uploads/${ulid}/content-image.png`,
      });

      mockS3GetObjectWithMetadata(FAKE_IMAGE_BYTES, { purpose: 'inline' });
      mockS3PutObject();
      mockS3PutObject();

      await handler(event);

      const putObjectCalls = mockS3Send.mock.calls.filter(
        (call) => call[0]?._commandName === 'PutObjectCommand'
      );
      expect(putObjectCalls.length).toBeGreaterThanOrEqual(2);
    });

    it('should write inline.webp to processed/{ulid}/inline.webp key', async () => {
      const ulid = '01HTESTULID_INLN02';
      const event = createMockImageS3Event({
        bucketName: TEST_BUCKET,
        objectKey: `uploads/${ulid}/content-image.png`,
      });

      mockS3GetObjectWithMetadata(FAKE_IMAGE_BYTES, { purpose: 'inline' });
      mockS3PutObject();
      mockS3PutObject();

      await handler(event);

      const putObjectCalls = mockS3Send.mock.calls.filter(
        (call) => call[0]?._commandName === 'PutObjectCommand'
      );
      const putKeys = putObjectCalls.map((call) => call[0]?.input?.Key);

      expect(putKeys).toContain(`processed/${ulid}/inline.webp`);
    });

    it('should resize inline images to max 800px width', async () => {
      const ulid = '01HTESTULID_INLN03';
      const event = createMockImageS3Event({
        bucketName: TEST_BUCKET,
        objectKey: `uploads/${ulid}/photo.png`,
      });

      mockS3GetObjectWithMetadata(FAKE_IMAGE_BYTES, { purpose: 'inline' });
      mockS3PutObject();
      mockS3PutObject();

      await handler(event);

      const resizeCalls = mockSharpInstance.resize.mock.calls;
      const hasInlineResize = resizeCalls.some(
        (call) => call[0] === 800 || call[0]?.width === 800
      );
      expect(hasInlineResize).toBe(true);
    });

    it('should convert inline images to WebP with quality 80', async () => {
      const ulid = '01HTESTULID_INLN04';
      const event = createMockImageS3Event({
        bucketName: TEST_BUCKET,
        objectKey: `uploads/${ulid}/photo.png`,
      });

      mockS3GetObjectWithMetadata(FAKE_IMAGE_BYTES, { purpose: 'inline' });
      mockS3PutObject();
      mockS3PutObject();

      await handler(event);

      const webpCalls = mockSharpInstance.webp.mock.calls;
      const hasQuality80 = webpCalls.some(
        (call) => call[0]?.quality === 80
      );
      expect(hasQuality80).toBe(true);
    });
  });

  // =========================================================================
  // Thumbnail generation (always generated)
  // =========================================================================

  describe('thumbnail generation', () => {
    it('should always generate a thumbnail.webp for hero purpose', async () => {
      const ulid = '01HTESTULID_THMB01';
      const event = createMockImageS3Event({
        bucketName: TEST_BUCKET,
        objectKey: `uploads/${ulid}/photo.jpg`,
      });

      mockS3GetObjectWithMetadata(FAKE_IMAGE_BYTES, { purpose: 'hero' });
      mockS3PutObject();
      mockS3PutObject();

      await handler(event);

      const putObjectCalls = mockS3Send.mock.calls.filter(
        (call) => call[0]?._commandName === 'PutObjectCommand'
      );
      const putKeys = putObjectCalls.map((call) => call[0]?.input?.Key);

      expect(putKeys).toContain(`processed/${ulid}/thumbnail.webp`);
    });

    it('should always generate a thumbnail.webp for inline purpose', async () => {
      const ulid = '01HTESTULID_THMB02';
      const event = createMockImageS3Event({
        bucketName: TEST_BUCKET,
        objectKey: `uploads/${ulid}/photo.png`,
      });

      mockS3GetObjectWithMetadata(FAKE_IMAGE_BYTES, { purpose: 'inline' });
      mockS3PutObject();
      mockS3PutObject();

      await handler(event);

      const putObjectCalls = mockS3Send.mock.calls.filter(
        (call) => call[0]?._commandName === 'PutObjectCommand'
      );
      const putKeys = putObjectCalls.map((call) => call[0]?.input?.Key);

      expect(putKeys).toContain(`processed/${ulid}/thumbnail.webp`);
    });

    it('should resize thumbnails to max 400px width', async () => {
      const ulid = '01HTESTULID_THMB03';
      const event = createMockImageS3Event({
        bucketName: TEST_BUCKET,
        objectKey: `uploads/${ulid}/photo.jpg`,
      });

      mockS3GetObjectWithMetadata(FAKE_IMAGE_BYTES, { purpose: 'hero' });
      mockS3PutObject();
      mockS3PutObject();

      await handler(event);

      const resizeCalls = mockSharpInstance.resize.mock.calls;
      const hasThumbnailResize = resizeCalls.some(
        (call) => call[0] === 400 || call[0]?.width === 400
      );
      expect(hasThumbnailResize).toBe(true);
    });

    it('should convert thumbnails to WebP with quality 70', async () => {
      const ulid = '01HTESTULID_THMB04';
      const event = createMockImageS3Event({
        bucketName: TEST_BUCKET,
        objectKey: `uploads/${ulid}/photo.jpg`,
      });

      mockS3GetObjectWithMetadata(FAKE_IMAGE_BYTES, { purpose: 'hero' });
      mockS3PutObject();
      mockS3PutObject();

      await handler(event);

      const webpCalls = mockSharpInstance.webp.mock.calls;
      const hasQuality70 = webpCalls.some(
        (call) => call[0]?.quality === 70
      );
      expect(hasQuality70).toBe(true);
    });
  });

  // =========================================================================
  // Validation — Magic bytes check
  // =========================================================================

  describe('validation', () => {
    it('should delete the file from uploads/ when magic bytes check fails', async () => {
      const ulid = '01HTESTULID_INVL01';
      const event = createMockImageS3Event({
        bucketName: TEST_BUCKET,
        objectKey: `uploads/${ulid}/malicious.exe`,
      });

      // Mock S3 GetObject: return non-image bytes
      mockS3GetObjectWithMetadata(Buffer.from('this-is-not-an-image'), { purpose: 'hero' });

      // Mock sharp to reject with invalid image error
      mockSharpInstance.metadata.mockRejectedValueOnce(
        new Error('Input buffer contains unsupported image format')
      );

      // Mock S3 DeleteObject: accept the delete
      mockS3DeleteObject();

      await handler(event);

      // Verify S3 DeleteObject was called for the invalid file
      const deleteObjectCalls = mockS3Send.mock.calls.filter(
        (call) => call[0]?._commandName === 'DeleteObjectCommand'
      );
      expect(deleteObjectCalls.length).toBeGreaterThanOrEqual(1);

      // Verify the key being deleted matches the uploads key
      const deleteKey = deleteObjectCalls[0]?.[0]?.input?.Key;
      expect(deleteKey).toBe(`uploads/${ulid}/malicious.exe`);
    });

    it('should not write to processed/ when the file is not a valid image', async () => {
      const ulid = '01HTESTULID_INVL02';
      const event = createMockImageS3Event({
        bucketName: TEST_BUCKET,
        objectKey: `uploads/${ulid}/text-file.txt`,
      });

      mockS3GetObjectWithMetadata(Buffer.from('just some text'), { purpose: 'inline' });
      mockSharpInstance.metadata.mockRejectedValueOnce(
        new Error('Input buffer contains unsupported image format')
      );
      mockS3DeleteObject();

      await handler(event);

      // Verify no PutObject calls were made (only GetObject + DeleteObject)
      const putObjectCalls = mockS3Send.mock.calls.filter(
        (call) => call[0]?._commandName === 'PutObjectCommand'
      );
      expect(putObjectCalls.length).toBe(0);
    });

    it('should call sharp metadata to validate image before processing', async () => {
      const ulid = '01HTESTULID_INVL03';
      const event = createMockImageS3Event({
        bucketName: TEST_BUCKET,
        objectKey: `uploads/${ulid}/photo.jpg`,
      });

      mockS3GetObjectWithMetadata(FAKE_IMAGE_BYTES, { purpose: 'hero' });
      mockS3PutObject();
      mockS3PutObject();

      await handler(event);

      // Verify sharp was called with the image bytes
      expect(mockSharp).toHaveBeenCalled();
      // Verify metadata was called to validate
      expect(mockSharpInstance.metadata).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Error handling
  // =========================================================================

  describe('error handling', () => {
    it('should handle S3 read failure gracefully without throwing', async () => {
      const ulid = '01HTESTULID_ERR01';
      const event = createMockImageS3Event({
        bucketName: TEST_BUCKET,
        objectKey: `uploads/${ulid}/photo.jpg`,
      });

      // Mock S3 GetObject to fail
      mockS3GetObjectError('NoSuchKey: The specified key does not exist.');

      // Should not throw — handler should catch and log
      await expect(handler(event)).resolves.not.toThrow();
    });

    it('should not write processed files when S3 read fails', async () => {
      const ulid = '01HTESTULID_ERR02';
      const event = createMockImageS3Event({
        bucketName: TEST_BUCKET,
        objectKey: `uploads/${ulid}/photo.jpg`,
      });

      mockS3GetObjectError('Internal server error');

      await handler(event);

      // Verify no PutObject calls were made
      const putObjectCalls = mockS3Send.mock.calls.filter(
        (call) => call[0]?._commandName === 'PutObjectCommand'
      );
      expect(putObjectCalls.length).toBe(0);
    });

    it('should handle sharp processing failure gracefully', async () => {
      const ulid = '01HTESTULID_ERR03';
      const event = createMockImageS3Event({
        bucketName: TEST_BUCKET,
        objectKey: `uploads/${ulid}/corrupt-image.jpg`,
      });

      mockS3GetObjectWithMetadata(FAKE_IMAGE_BYTES, { purpose: 'hero' });

      // Metadata passes but resize fails
      mockSharpInstance.toBuffer.mockRejectedValueOnce(
        new Error('Failed to process image: corrupt data')
      );

      // Should not throw — handler should catch and log
      await expect(handler(event)).resolves.not.toThrow();
    });
  });

  // =========================================================================
  // Event filtering
  // =========================================================================

  describe('event filtering', () => {
    it('should ignore events for keys outside the uploads/ prefix', async () => {
      const event = createMockImageS3Event({
        bucketName: TEST_BUCKET,
        objectKey: 'processed/01HTESTULID/hero.webp',
      });

      await handler(event);

      // Should not call S3 GetObject — event should be ignored
      expect(mockS3Send).not.toHaveBeenCalled();
    });

    it('should ignore events for keys in root (no prefix)', async () => {
      const event = createMockImageS3Event({
        bucketName: TEST_BUCKET,
        objectKey: 'some-random-file.jpg',
      });

      await handler(event);

      expect(mockS3Send).not.toHaveBeenCalled();
    });

    it('should ignore events for keys in other prefixes', async () => {
      const event = createMockImageS3Event({
        bucketName: TEST_BUCKET,
        objectKey: 'attachments/some-file.jpg',
      });

      await handler(event);

      expect(mockS3Send).not.toHaveBeenCalled();
    });

    it('should process events for keys in the uploads/ prefix', async () => {
      const event = createMockImageS3Event({
        bucketName: TEST_BUCKET,
        objectKey: 'uploads/01HTESTULID_FILT/photo.jpg',
      });

      mockS3GetObjectWithMetadata(FAKE_IMAGE_BYTES, { purpose: 'hero' });
      mockS3PutObject();
      mockS3PutObject();

      await handler(event);

      // Should call S3 GetObject (at minimum)
      expect(mockS3Send).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Invariants
  // =========================================================================

  describe('invariants', () => {
    it('should always produce WebP format output files', async () => {
      const ulid = '01HTESTULID_INV01';
      const event = createMockImageS3Event({
        bucketName: TEST_BUCKET,
        objectKey: `uploads/${ulid}/photo.jpg`,
      });

      mockS3GetObjectWithMetadata(FAKE_IMAGE_BYTES, { purpose: 'hero' });
      mockS3PutObject();
      mockS3PutObject();

      await handler(event);

      const putObjectCalls = mockS3Send.mock.calls.filter(
        (call) => call[0]?._commandName === 'PutObjectCommand'
      );
      for (const call of putObjectCalls) {
        const key = call[0]?.input?.Key as string;
        expect(key).toMatch(/\.webp$/);
      }
    });

    it('should write processed files to the same ULID directory as the upload', async () => {
      const ulid = '01HTESTULID_INV02';
      const event = createMockImageS3Event({
        bucketName: TEST_BUCKET,
        objectKey: `uploads/${ulid}/photo.jpg`,
      });

      mockS3GetObjectWithMetadata(FAKE_IMAGE_BYTES, { purpose: 'inline' });
      mockS3PutObject();
      mockS3PutObject();

      await handler(event);

      const putObjectCalls = mockS3Send.mock.calls.filter(
        (call) => call[0]?._commandName === 'PutObjectCommand'
      );
      for (const call of putObjectCalls) {
        const key = call[0]?.input?.Key as string;
        expect(key).toContain(`processed/${ulid}/`);
      }
    });

    it('should preserve the original file in uploads/ after processing', async () => {
      const ulid = '01HTESTULID_INV03';
      const event = createMockImageS3Event({
        bucketName: TEST_BUCKET,
        objectKey: `uploads/${ulid}/photo.jpg`,
      });

      mockS3GetObjectWithMetadata(FAKE_IMAGE_BYTES, { purpose: 'hero' });
      mockS3PutObject();
      mockS3PutObject();

      await handler(event);

      // Verify NO DeleteObject calls were made for the original valid image
      const deleteObjectCalls = mockS3Send.mock.calls.filter(
        (call) => call[0]?._commandName === 'DeleteObjectCommand'
      );
      expect(deleteObjectCalls.length).toBe(0);
    });

    it('should read purpose from S3 object metadata', async () => {
      const ulid = '01HTESTULID_INV04';
      const event = createMockImageS3Event({
        bucketName: TEST_BUCKET,
        objectKey: `uploads/${ulid}/photo.jpg`,
      });

      // Provide purpose=inline in metadata — should produce inline.webp, not hero.webp
      mockS3GetObjectWithMetadata(FAKE_IMAGE_BYTES, { purpose: 'inline' });
      mockS3PutObject();
      mockS3PutObject();

      await handler(event);

      const putObjectCalls = mockS3Send.mock.calls.filter(
        (call) => call[0]?._commandName === 'PutObjectCommand'
      );
      const putKeys = putObjectCalls.map((call) => call[0]?.input?.Key);

      // Should have inline.webp, NOT hero.webp
      expect(putKeys).toContain(`processed/${ulid}/inline.webp`);
      expect(putKeys).not.toContain(`processed/${ulid}/hero.webp`);
    });

    it('should maintain aspect ratio when resizing (withoutEnlargement)', async () => {
      const ulid = '01HTESTULID_INV05';
      const event = createMockImageS3Event({
        bucketName: TEST_BUCKET,
        objectKey: `uploads/${ulid}/photo.jpg`,
      });

      mockS3GetObjectWithMetadata(FAKE_IMAGE_BYTES, { purpose: 'hero' });
      mockS3PutObject();
      mockS3PutObject();

      await handler(event);

      // Verify resize calls do NOT specify a fixed height (aspect ratio preserved)
      const resizeCalls = mockSharpInstance.resize.mock.calls;
      for (const call of resizeCalls) {
        // When a single number is passed, sharp uses it as width and preserves aspect ratio.
        // When an options object is passed, height should not be set, or fit should be set.
        if (typeof call[0] === 'object' && call[0] !== null) {
          // If using options object: should not have a hard-coded height that breaks ratio
          // Acceptable: { width: N, withoutEnlargement: true } or { width: N, fit: 'inside' }
          expect(call[0].height).toBeUndefined();
        }
      }
    });

    it('should write to the same bucket that the event came from', async () => {
      const ulid = '01HTESTULID_INV06';
      const event = createMockImageS3Event({
        bucketName: TEST_BUCKET,
        objectKey: `uploads/${ulid}/photo.jpg`,
      });

      mockS3GetObjectWithMetadata(FAKE_IMAGE_BYTES, { purpose: 'hero' });
      mockS3PutObject();
      mockS3PutObject();

      await handler(event);

      const putObjectCalls = mockS3Send.mock.calls.filter(
        (call) => call[0]?._commandName === 'PutObjectCommand'
      );
      for (const call of putObjectCalls) {
        expect(call[0]?.input?.Bucket).toBe(TEST_BUCKET);
      }
    });

    it('should set content type to image/webp on processed files', async () => {
      const ulid = '01HTESTULID_INV07';
      const event = createMockImageS3Event({
        bucketName: TEST_BUCKET,
        objectKey: `uploads/${ulid}/photo.jpg`,
      });

      mockS3GetObjectWithMetadata(FAKE_IMAGE_BYTES, { purpose: 'hero' });
      mockS3PutObject();
      mockS3PutObject();

      await handler(event);

      const putObjectCalls = mockS3Send.mock.calls.filter(
        (call) => call[0]?._commandName === 'PutObjectCommand'
      );
      for (const call of putObjectCalls) {
        expect(call[0]?.input?.ContentType).toBe('image/webp');
      }
    });
  });
});
