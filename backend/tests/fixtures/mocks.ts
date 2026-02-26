import { vi } from 'vitest';

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
    $metadata: { httpStatusCode: 200 },
  });
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
 * Configures mockDynamoDBSend for the full inbound email processing flow.
 *
 * The inbound handler makes these DynamoDB calls in order:
 *   1. ScanCommand (findLeadByEmail) — returns lead Items array or empty
 *   2. PutCommand (putEmail) — writes the email record
 *   3. UpdateCommand (updateLeadEmailMetadata) — updates lastEmailAt + unreadCount
 *
 * When autoCreateLead is true, a PutCommand for the new lead is inserted between
 * calls 1 and 2:
 *   1. ScanCommand (findLeadByEmail) — returns empty Items
 *   2. PutCommand (putLead) — writes the auto-created lead
 *   3. PutCommand (putEmail) — writes the email record
 *   4. UpdateCommand (updateLeadEmailMetadata) — updates metadata
 *
 * @param options.leadItem - Existing lead to return from the Scan (omit to simulate not found)
 * @param options.autoCreateLead - Whether the handler will auto-create a lead
 */
export function setupDynamoDBForInbound(options: {
  leadItem?: Record<string, unknown>;
  autoCreateLead?: boolean;
} = {}): void {
  const { leadItem, autoCreateLead = false } = options;

  // Call 1: ScanCommand (findLeadByEmail)
  if (leadItem !== undefined) {
    mockDynamoDBSend.mockResolvedValueOnce({
      Items: [leadItem],
      Count: 1,
      ScannedCount: 1,
      $metadata: { httpStatusCode: 200 },
    });
  } else {
    // Lead not found — empty Items array
    mockDynamoDBSend.mockResolvedValueOnce({
      Items: [],
      Count: 0,
      ScannedCount: 0,
      $metadata: { httpStatusCode: 200 },
    });
  }

  if (autoCreateLead) {
    // Call 2: PutCommand (putLead — auto-create)
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
