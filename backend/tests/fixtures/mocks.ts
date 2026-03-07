import { vi } from 'vitest';
import type { BlogPostItem, SlugIndexItem } from './factories.js';

/**
 * Mock SES send function.
 *
 * Default behaviour: resolves with a successful SES response containing a MessageId.
 * Tests can override this with mockResolvedValueOnce / mockRejectedValueOnce.
 */
export const mockSESSend = vi.fn().mockResolvedValue({
  MessageId: 'ses-msg-id-0123456789ABCDEF',
  $metadata: {
    httpStatusCode: 200,
    requestId: 'ses-request-id',
  },
});

/**
 * Mock DynamoDB DocumentClient send function.
 *
 * Default behaviour: resolves with an empty successful response.
 * Individual tests control return values per call using mockResolvedValueOnce.
 */
export const mockDynamoDBSend = vi.fn().mockResolvedValue({
  $metadata: { httpStatusCode: 200 },
});

/**
 * Mock S3Client send function.
 *
 * Default behaviour: resolves with an empty successful response.
 * Use mockS3GetObject() and mockS3PutObject() to set up specific scenarios.
 */
export const mockS3Send = vi.fn().mockResolvedValue({
  $metadata: { httpStatusCode: 200 },
});

/**
 * Mock getSignedUrl function for S3 presigned URL generation.
 *
 * Default behaviour: resolves with a test presigned URL string.
 * Tests can override this with mockResolvedValueOnce / mockRejectedValueOnce.
 */
export const mockGetSignedUrl = vi.fn().mockResolvedValue(
  'https://tropico-blog-images-test.s3.us-east-1.amazonaws.com/uploads/01HTESTULID0001/photo.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Expires=300'
);

/**
 * Mock sharp instance methods.
 *
 * Each method returns the mock instance itself (for chaining), except
 * toBuffer() which resolves with processed image data.
 */
export const mockSharpInstance = {
  metadata: vi.fn().mockResolvedValue({
    format: 'jpeg',
    width: 2400,
    height: 1600,
  }),
  resize: vi.fn().mockReturnThis(),
  webp: vi.fn().mockReturnThis(),
  toBuffer: vi.fn().mockResolvedValue(Buffer.from('processed-image-data')),
};

/**
 * Mock sharp constructor function.
 *
 * Returns mockSharpInstance when called with image bytes.
 * Tests can inspect calls to mockSharpInstance.resize, .webp, .toBuffer.
 */
export const mockSharp = vi.fn().mockReturnValue(mockSharpInstance);

/**
 * Resets all mocks to their default resolved values.
 * Call this in beforeEach to ensure test isolation.
 */
export function resetAllMocks(): void {
  mockSESSend.mockReset();
  mockSESSend.mockResolvedValue({
    MessageId: 'ses-msg-id-0123456789ABCDEF',
    $metadata: { httpStatusCode: 200 },
  });

  mockDynamoDBSend.mockReset();
  mockDynamoDBSend.mockResolvedValue({
    $metadata: { httpStatusCode: 200 },
  });

  mockS3Send.mockReset();
  mockS3Send.mockResolvedValue({
    $metadata: { httpStatusCode: 200 },
  });

  mockGetSignedUrl.mockReset();
  mockGetSignedUrl.mockResolvedValue(
    'https://tropico-blog-images-test.s3.us-east-1.amazonaws.com/uploads/01HTESTULID0001/photo.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Expires=300'
  );

  mockSharp.mockReset();
  mockSharp.mockReturnValue(mockSharpInstance);

  mockSharpInstance.metadata.mockReset();
  mockSharpInstance.metadata.mockResolvedValue({
    format: 'jpeg',
    width: 2400,
    height: 1600,
  });
  mockSharpInstance.resize.mockReset();
  mockSharpInstance.resize.mockReturnValue(mockSharpInstance);
  mockSharpInstance.webp.mockReset();
  mockSharpInstance.webp.mockReturnValue(mockSharpInstance);
  mockSharpInstance.toBuffer.mockReset();
  mockSharpInstance.toBuffer.mockResolvedValue(Buffer.from('processed-image-data'));
}

/**
 * Configures mockS3Send to return raw email content on the first GetObject call.
 *
 * The handler calls GetObject to read the raw MIME email from S3. This helper
 * wraps the raw content in a ReadableStream-like async iterable, mirroring the
 * actual AWS SDK S3 GetObject response shape (Body as an async iterable).
 *
 * @param rawContent - Raw MIME email content as a Buffer or string
 */
export function mockS3GetObject(rawContent: Buffer | string): void {
  const buffer = Buffer.isBuffer(rawContent) ? rawContent : Buffer.from(rawContent);

  mockS3Send.mockResolvedValueOnce({
    Body: {
      transformToByteArray: async () => new Uint8Array(buffer),
      transformToString: async () => buffer.toString('utf-8'),
      transformToWebStream: () => {
        throw new Error('transformToWebStream not mocked');
      },
    },
    Metadata: {},
    $metadata: { httpStatusCode: 200 },
  });
}

/**
 * Configures mockS3Send to return image bytes with metadata on GetObject call.
 * Used by the image processor handler to read uploaded images from S3.
 *
 * @param imageContent - Image content as a Buffer or string
 * @param metadata - S3 object metadata (e.g. { purpose: 'hero' })
 */
export function mockS3GetObjectWithMetadata(
  imageContent: Buffer | string,
  metadata: Record<string, string> = {}
): void {
  const buffer = Buffer.isBuffer(imageContent) ? imageContent : Buffer.from(imageContent);

  mockS3Send.mockResolvedValueOnce({
    Body: {
      transformToByteArray: async () => new Uint8Array(buffer),
      transformToString: async () => buffer.toString('utf-8'),
      transformToWebStream: () => {
        throw new Error('transformToWebStream not mocked');
      },
    },
    Metadata: metadata,
    $metadata: { httpStatusCode: 200 },
  });
}

/**
 * Configures mockS3Send to reject a GetObject call with an error.
 * Used to test error handling when S3 read fails.
 *
 * @param errorMessage - Error message to return
 */
export function mockS3GetObjectError(errorMessage: string = 'NoSuchKey: The specified key does not exist.'): void {
  const error = new Error(errorMessage);
  (error as Record<string, unknown>).name = 'NoSuchKey';
  (error as Record<string, unknown>).$metadata = { httpStatusCode: 404 };
  mockS3Send.mockRejectedValueOnce(error);
}

/**
 * Configures mockS3Send to accept a PutObject call (attachment upload) successfully.
 *
 * Call once per attachment upload expected in the test. The handler calls S3 PutObject
 * for each attachment extracted from the MIME email.
 */
export function mockS3PutObject(): void {
  mockS3Send.mockResolvedValueOnce({
    ETag: '"test-etag"',
    $metadata: { httpStatusCode: 200 },
  });
}

/**
 * Configures mockS3Send to accept a DeleteObject call successfully.
 * Used when the image processor deletes invalid files from uploads/.
 */
export function mockS3DeleteObject(): void {
  mockS3Send.mockResolvedValueOnce({
    $metadata: { httpStatusCode: 204 },
  });
}

/**
 * Configures mockGetSignedUrl to reject with an error.
 * Used to test error handling when presigning fails.
 *
 * @param errorMessage - Error message to return
 */
export function mockPresignFailure(errorMessage: string = 'Failed to generate presigned URL'): void {
  mockGetSignedUrl.mockRejectedValueOnce(new Error(errorMessage));
}

/**
 * Configures mockDynamoDBSend for the full PATCH /emails/{leadId}/read flow.
 *
 * The mark-read handler makes these DynamoDB calls in order:
 *   1. GetCommand    (getLead) — verifies lead exists; returns the lead Item
 *   2. QueryCommand  (findUnreadInboundEmails) — returns Items with direction='inbound' and readAt=null
 *   3. UpdateCommand x N (markEmailRead) — one per unread email: SET readAt = :now, updatedAt = :now
 *   4. UpdateCommand (resetLeadUnreadCount) — SET unreadEmailCount = :zero, updatedAt = :now on the lead
 *
 * When unreadEmails is empty the per-email UpdateCommand calls are skipped, but the
 * final lead UpdateCommand (resetLeadUnreadCount) is still issued.
 *
 * @param options.leadItem    - Lead record to return from GetCommand (omit for not-found)
 * @param options.unreadEmails - Array of unread email items returned by QueryCommand
 */
export function setupDynamoDBForMarkRead(options: {
  leadItem?: Record<string, unknown>;
  unreadEmails?: Record<string, unknown>[];
} = {}): void {
  const { leadItem, unreadEmails = [] } = options;

  // Call 1: GetCommand (getLead)
  mockDynamoDBSend.mockResolvedValueOnce({
    Item: leadItem,
    $metadata: { httpStatusCode: 200 },
  });

  if (leadItem === undefined) {
    // Lead not found — handler returns 404 immediately; no further DynamoDB calls.
    return;
  }

  // Call 2: QueryCommand (findUnreadInboundEmails)
  mockDynamoDBSend.mockResolvedValueOnce({
    Items: unreadEmails,
    Count: unreadEmails.length,
    ScannedCount: unreadEmails.length,
    $metadata: { httpStatusCode: 200 },
  });

  // Calls 3..N: UpdateCommand per unread email (SET readAt + updatedAt)
  for (let index = 0; index < unreadEmails.length; index++) {
    mockDynamoDBSend.mockResolvedValueOnce({
      $metadata: { httpStatusCode: 200 },
    });
  }

  // Final call: UpdateCommand (resetLeadUnreadCount — SET unreadEmailCount = 0)
  mockDynamoDBSend.mockResolvedValueOnce({
    $metadata: { httpStatusCode: 200 },
  });
}

/**
 * Configures mockDynamoDBSend for the full inbound email processing flow.
 *
 * The inbound handler makes these DynamoDB calls in order:
 *   1. ScanCommand (findLeadByEmail — lead email match) — returns lead Items array or empty
 *   2. (if lead not found) ScanCommand (findLeadByEmail — outbound toAddress match) — returns outbound email Items or empty
 *   3. (if outbound match found) GetCommand (fetch lead by leadId from outbound email)
 *   2b. (if no match at all) PutCommand (putLead) — writes the auto-created lead
 *   N-1. PutCommand (putEmail) — writes the email record
 *   N.   UpdateCommand (updateLeadEmailMetadata) — updates lastEmailAt + unreadCount
 *
 * @param options.leadItem - Existing lead to return from the Scan (omit to simulate not found)
 * @param options.autoCreateLead - Whether the handler will auto-create a lead (no match found at all)
 * @param options.outboundMatchLeadItem - Lead found via outbound email toAddress match (reply threading)
 */
export function setupDynamoDBForInbound(options: {
  leadItem?: Record<string, unknown>;
  autoCreateLead?: boolean;
  outboundMatchLeadItem?: Record<string, unknown>;
} = {}): void {
  const { leadItem, autoCreateLead = false, outboundMatchLeadItem } = options;

  // Call 1: ScanCommand (findLeadByEmail — match by lead's email field)
  if (leadItem !== undefined) {
    mockDynamoDBSend.mockResolvedValueOnce({
      Items: [leadItem],
      Count: 1,
      ScannedCount: 1,
      $metadata: { httpStatusCode: 200 },
    });
  } else {
    // Lead not found by email — empty Items array
    mockDynamoDBSend.mockResolvedValueOnce({
      Items: [],
      Count: 0,
      ScannedCount: 0,
      $metadata: { httpStatusCode: 200 },
    });

    // Call 2: ScanCommand (findLeadByEmail — match by outbound toAddress)
    if (outboundMatchLeadItem !== undefined) {
      // Found an outbound email sent to this address
      mockDynamoDBSend.mockResolvedValueOnce({
        Items: [{ leadId: (outboundMatchLeadItem as Record<string, unknown>).id }],
        Count: 1,
        ScannedCount: 1,
        $metadata: { httpStatusCode: 200 },
      });
      // Call 3: GetCommand (fetch the lead record by leadId)
      mockDynamoDBSend.mockResolvedValueOnce({
        Item: outboundMatchLeadItem,
        $metadata: { httpStatusCode: 200 },
      });
    } else {
      // No outbound match either — empty Items
      mockDynamoDBSend.mockResolvedValueOnce({
        Items: [],
        Count: 0,
        ScannedCount: 0,
        $metadata: { httpStatusCode: 200 },
      });
    }
  }

  if (autoCreateLead) {
    // PutCommand (putLead — auto-create)
    mockDynamoDBSend.mockResolvedValueOnce({
      $metadata: { httpStatusCode: 200 },
    });
  }

  // Next call: PutCommand (putEmail)
  mockDynamoDBSend.mockResolvedValueOnce({
    $metadata: { httpStatusCode: 200 },
  });

  // Next call: UpdateCommand (updateLeadEmailMetadata)
  mockDynamoDBSend.mockResolvedValueOnce({
    $metadata: { httpStatusCode: 200 },
  });
}

/**
 * Configures mockDynamoDBSend to return a lead on the first GetCommand call
 * and succeed silently on subsequent PutCommand / UpdateCommand calls.
 *
 * The order matters:
 *   1st call: GetCommand (getLead — lead exists check)
 *   2nd call: PutCommand (putEmail — write email record)
 *   3rd call: UpdateCommand (updateLeadEmailMetadata — update lastEmailAt)
 *
 * @param leadItem - The DynamoDB Item to return for the GetCommand
 */
export function setupDynamoDBWithLead(leadItem: Record<string, unknown>): void {
  mockDynamoDBSend
    .mockResolvedValueOnce({
      Item: leadItem,
      $metadata: { httpStatusCode: 200 },
    })
    .mockResolvedValue({
      $metadata: { httpStatusCode: 200 },
    });
}

/**
 * Configures mockDynamoDBSend to return no item (lead not found).
 */
export function setupDynamoDBLeadNotFound(): void {
  mockDynamoDBSend.mockResolvedValueOnce({
    Item: undefined,
    $metadata: { httpStatusCode: 200 },
  });
}

/**
 * Configures mockDynamoDBSend to return a paginated list of email items from a
 * DynamoDB Query call (the GET /emails/{leadId} route).
 *
 * When nextCursor is provided the response includes a LastEvaluatedKey so the
 * handler can encode and return it as a pagination cursor.
 *
 * The totalCount is returned as a separate Count field on the same response
 * object, matching the shape the handler reads via QueryCommand.
 *
 * @param emails - Array of DynamoDB email items to return
 * @param totalCount - Total number of emails stored for this lead
 * @param nextCursor - Optional base64-encoded LastEvaluatedKey for pagination
 */
export function setupDynamoDBWithEmails(
  emails: Record<string, unknown>[],
  totalCount: number,
  nextCursor?: string
): void {
  const lastEvaluatedKey = nextCursor
    ? JSON.parse(Buffer.from(nextCursor, 'base64').toString('utf-8'))
    : undefined;

  mockDynamoDBSend.mockResolvedValueOnce({
    Items: emails,
    Count: emails.length,
    ScannedCount: emails.length,
    ...(lastEvaluatedKey !== undefined ? { LastEvaluatedKey: lastEvaluatedKey } : {}),
    $metadata: { httpStatusCode: 200 },
  });

  // Second call is a Count query that returns the total for this lead
  mockDynamoDBSend.mockResolvedValueOnce({
    Count: totalCount,
    ScannedCount: totalCount,
    $metadata: { httpStatusCode: 200 },
  });
}

// ---------------------------------------------------------------------------
// Blog CMS mock helpers (Slice S-1)
// ---------------------------------------------------------------------------

/**
 * Configures mockDynamoDBSend for the blog post creation flow.
 *
 * The create handler makes one DynamoDB call:
 *   1. TransactWriteCommand — atomically creates blog post + slug index
 *
 * When slugConflict is true, the TransactWriteCommand rejects with a
 * TransactionCanceledException to simulate a duplicate slug condition.
 *
 * @param options.slugConflict - If true, simulates slug already exists (409)
 */
export function setupDynamoDBForBlogCreate(options: {
  slugConflict?: boolean;
} = {}): void {
  const { slugConflict = false } = options;

  if (slugConflict) {
    const error = new Error('Transaction cancelled');
    (error as Record<string, unknown>).name = 'TransactionCanceledException';
    (error as Record<string, unknown>).CancellationReasons = [
      { Code: 'None' },
      { Code: 'ConditionalCheckFailed' },
    ];
    mockDynamoDBSend.mockRejectedValueOnce(error);
  } else {
    // TransactWriteCommand succeeds
    mockDynamoDBSend.mockResolvedValueOnce({
      $metadata: { httpStatusCode: 200 },
    });
  }
}

/**
 * Configures mockDynamoDBSend for blog post retrieval by slug.
 *
 * The get-by-slug handler makes two DynamoDB calls:
 *   1. GetCommand (slug index) — returns SlugIndexItem with blogId
 *   2. GetCommand (blog post) — returns BlogPostItem
 *
 * When blogPost is undefined, simulates a not-found scenario.
 *
 * @param blogPost - The BlogPostItem to return (omit for not-found)
 * @param slugIndex - The SlugIndexItem to return (omit for slug not found)
 */
export function setupDynamoDBForBlogGet(
  blogPost?: BlogPostItem,
  slugIndex?: SlugIndexItem
): void {
  // Call 1: GetCommand (slug index lookup)
  mockDynamoDBSend.mockResolvedValueOnce({
    Item: slugIndex,
    $metadata: { httpStatusCode: 200 },
  });

  if (slugIndex !== undefined) {
    // Call 2: GetCommand (blog post lookup by ID)
    mockDynamoDBSend.mockResolvedValueOnce({
      Item: blogPost,
      $metadata: { httpStatusCode: 200 },
    });
  }
}

/**
 * Configures mockDynamoDBSend for listing published blog posts.
 *
 * The list handler makes one DynamoDB call:
 *   1. QueryCommand (GSI1) — returns published posts ordered by publishedAt desc
 *
 * @param posts - Array of BlogPostItem to return
 * @param nextCursor - Optional base64-encoded LastEvaluatedKey for pagination
 */
export function setupDynamoDBForBlogList(
  posts: BlogPostItem[],
  nextCursor?: string
): void {
  const lastEvaluatedKey = nextCursor
    ? JSON.parse(Buffer.from(nextCursor, 'base64').toString('utf-8'))
    : undefined;

  mockDynamoDBSend.mockResolvedValueOnce({
    Items: posts,
    Count: posts.length,
    ScannedCount: posts.length,
    ...(lastEvaluatedKey !== undefined ? { LastEvaluatedKey: lastEvaluatedKey } : {}),
    $metadata: { httpStatusCode: 200 },
  });
}

/**
 * Configures mockDynamoDBSend for the blog post update flow.
 *
 * The update handler makes these DynamoDB calls:
 *   1. GetCommand (get existing post by ID) — returns the existing BlogPostItem
 *   2. TransactWriteCommand or UpdateCommand — updates the post
 *      (TransactWriteCommand if slug changes, UpdateCommand otherwise)
 *
 * When existingPost is undefined, simulates a not-found scenario.
 * When slugConflict is true and a slug change is attempted, TransactWriteCommand fails.
 *
 * @param existingPost - Existing blog post to return from GetCommand (omit for not-found)
 * @param options.slugConflict - If true, simulates slug already exists on update (409)
 */
export function setupDynamoDBForBlogUpdate(
  existingPost?: BlogPostItem,
  options: { slugConflict?: boolean } = {}
): void {
  const { slugConflict = false } = options;

  // Call 1: GetCommand (get existing post by ID)
  mockDynamoDBSend.mockResolvedValueOnce({
    Item: existingPost,
    $metadata: { httpStatusCode: 200 },
  });

  if (existingPost === undefined) {
    // Post not found — handler returns 404 immediately; no further DynamoDB calls.
    return;
  }

  if (slugConflict) {
    const error = new Error('Transaction cancelled');
    (error as Record<string, unknown>).name = 'TransactionCanceledException';
    (error as Record<string, unknown>).CancellationReasons = [
      { Code: 'None' },
      { Code: 'ConditionalCheckFailed' },
    ];
    mockDynamoDBSend.mockRejectedValueOnce(error);
  } else {
    // TransactWriteCommand or UpdateCommand succeeds
    mockDynamoDBSend.mockResolvedValueOnce({
      $metadata: { httpStatusCode: 200 },
    });
  }
}

/**
 * Configures mockDynamoDBSend for the blog post delete flow.
 *
 * The delete handler makes these DynamoDB calls:
 *   1. GetCommand (get existing post by ID) — returns the existing BlogPostItem
 *   2. TransactWriteCommand — atomically soft-deletes post + removes slug index
 *
 * When existingPost is undefined, simulates a not-found scenario.
 *
 * @param existingPost - Existing blog post to return from GetCommand (omit for not-found)
 */
export function setupDynamoDBForBlogDelete(
  existingPost?: BlogPostItem
): void {
  // Call 1: GetCommand (get existing post by ID)
  mockDynamoDBSend.mockResolvedValueOnce({
    Item: existingPost,
    $metadata: { httpStatusCode: 200 },
  });

  if (existingPost === undefined) {
    // Post not found — handler returns 404 immediately; no further DynamoDB calls.
    return;
  }

  // Call 2: TransactWriteCommand (soft delete post + remove slug index)
  mockDynamoDBSend.mockResolvedValueOnce({
    $metadata: { httpStatusCode: 200 },
  });
}
