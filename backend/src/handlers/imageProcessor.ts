import type { S3Event } from 'aws-lambda';
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import sharp from 'sharp';

// ---------------------------------------------------------------------------
// AWS client setup — uses tryConstruct pattern for Vitest 4+ compatibility
// ---------------------------------------------------------------------------

function tryConstruct<T>(
  Constructor: new (...args: unknown[]) => T,
  ...args: unknown[]
): T {
  try {
    return new Constructor(...args);
  } catch {
    return (Constructor as unknown as (...args: unknown[]) => T)(...args);
  }
}

const s3Client = tryConstruct(
  S3Client as new (...args: unknown[]) => S3Client,
  {}
);

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const UPLOADS_PREFIX = 'uploads/';
const ALLOWED_IMAGE_FORMATS = new Set(['jpeg', 'png', 'webp', 'gif']);
const MAX_DIMENSION_PX = 10000;
const MAX_PIXEL_COUNT = 100_000_000; // 100 million pixels

interface ResizeConfig {
  width: number;
  quality: number;
  outputFilename: string;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

/**
 * S3 event-triggered Lambda handler for image processing.
 *
 * Reads uploaded images from the uploads/ prefix, validates them via
 * sharp metadata (magic bytes check), resizes to appropriate dimensions,
 * converts to WebP, and writes processed files to the processed/ prefix.
 */
export const handler = async (event: S3Event): Promise<void> => {
  for (const record of event.Records) {
    const bucketName = record.s3.bucket.name;
    const objectKey = record.s3.object.key;

    if (!objectKey.startsWith(UPLOADS_PREFIX)) {
      return;
    }

    try {
      await processImage(bucketName, objectKey);
    } catch (error) {
      console.error('Image processing failed:', {
        bucket: bucketName,
        key: objectKey,
        error,
      });
    }
  }
};

// ---------------------------------------------------------------------------
// Core processing
// ---------------------------------------------------------------------------

/**
 * Processes a single uploaded image: reads from S3, validates, resizes,
 * converts to WebP, and writes processed files back to S3.
 */
async function processImage(
  bucketName: string,
  objectKey: string
): Promise<void> {
  const s3Object = await readS3Object(bucketName, objectKey);

  const imageBytes = await s3Object.Body.transformToByteArray();
  const purpose = s3Object.Metadata?.purpose ?? 'inline';
  const ulidSegment = extractUlidFromKey(objectKey);

  const isValid = await validateImageBytes(imageBytes);
  if (!isValid) {
    await deleteS3Object(bucketName, objectKey);
    return;
  }

  const resizeConfigs = buildResizeConfigs(purpose, ulidSegment);

  for (const config of resizeConfigs) {
    await resizeAndUpload(bucketName, imageBytes, config);
  }
}

/**
 * Reads an S3 object and returns the response including Body and Metadata.
 */
async function readS3Object(
  bucketName: string,
  objectKey: string
): Promise<{ Body: { transformToByteArray: () => Promise<Uint8Array> }; Metadata?: Record<string, string> }> {
  const command = tryConstruct(
    GetObjectCommand as unknown as new (
      ...args: unknown[]
    ) => GetObjectCommand,
    { Bucket: bucketName, Key: objectKey }
  );

  return s3Client.send(command) as Promise<{
    Body: { transformToByteArray: () => Promise<Uint8Array> };
    Metadata?: Record<string, string>;
  }>;
}

/**
 * Validates image bytes using sharp metadata: checks magic bytes,
 * enforces format allowlist, and rejects extreme pixel dimensions.
 * Returns true if the file is a safe, valid raster image.
 */
async function validateImageBytes(
  imageBytes: Uint8Array
): Promise<boolean> {
  try {
    const metadata = await sharp(Buffer.from(imageBytes)).metadata();
    return isAllowedFormat(metadata.format) && isWithinDimensionLimits(metadata.width, metadata.height);
  } catch {
    return false;
  }
}

/**
 * Checks whether the detected image format is in the safe raster allowlist.
 * Rejects SVG, TIFF, and other potentially dangerous formats.
 */
function isAllowedFormat(format: string | undefined): boolean {
  if (!format) {
    return false;
  }
  return ALLOWED_IMAGE_FORMATS.has(format);
}

/**
 * Checks whether pixel dimensions are within safe limits.
 * Rejects images that could cause memory exhaustion during resize.
 */
function isWithinDimensionLimits(
  width: number | undefined,
  height: number | undefined
): boolean {
  if (!width || !height) {
    return false;
  }
  if (width > MAX_DIMENSION_PX || height > MAX_DIMENSION_PX) {
    return false;
  }
  return width * height <= MAX_PIXEL_COUNT;
}

/**
 * Deletes an S3 object (used for invalid image cleanup).
 */
async function deleteS3Object(
  bucketName: string,
  objectKey: string
): Promise<void> {
  const command = tryConstruct(
    DeleteObjectCommand as unknown as new (
      ...args: unknown[]
    ) => DeleteObjectCommand,
    { Bucket: bucketName, Key: objectKey }
  );

  await s3Client.send(command);
}

/**
 * Extracts the ULID segment from an S3 key like uploads/{ulid}/{filename}.
 */
function extractUlidFromKey(objectKey: string): string {
  const parts = objectKey.split('/');
  return parts[1];
}

/**
 * Builds the resize configuration array based on purpose.
 * Always includes a thumbnail. Hero gets 1200px, inline gets 800px.
 */
function buildResizeConfigs(
  purpose: string,
  ulidSegment: string
): ResizeConfig[] {
  const primaryConfig: ResizeConfig =
    purpose === 'hero'
      ? { width: 1200, quality: 80, outputFilename: `processed/${ulidSegment}/hero.webp` }
      : { width: 800, quality: 80, outputFilename: `processed/${ulidSegment}/inline.webp` };

  const thumbnailConfig: ResizeConfig = {
    width: 400,
    quality: 70,
    outputFilename: `processed/${ulidSegment}/thumbnail.webp`,
  };

  return [primaryConfig, thumbnailConfig];
}

/**
 * Resizes image bytes and uploads the result to S3 as WebP.
 */
async function resizeAndUpload(
  bucketName: string,
  imageBytes: Uint8Array,
  config: ResizeConfig
): Promise<void> {
  const processedBuffer = await sharp(Buffer.from(imageBytes))
    .resize({ width: config.width, withoutEnlargement: true })
    .webp({ quality: config.quality })
    .toBuffer();

  const command = tryConstruct(
    PutObjectCommand as unknown as new (
      ...args: unknown[]
    ) => PutObjectCommand,
    {
      Bucket: bucketName,
      Key: config.outputFilename,
      Body: processedBuffer,
      ContentType: 'image/webp',
    }
  );

  await s3Client.send(command);
}
