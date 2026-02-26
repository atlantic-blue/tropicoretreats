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
