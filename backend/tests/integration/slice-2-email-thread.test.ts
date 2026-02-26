/**
 * Integration tests for Slice 2: Email Thread View
 *
 * Contract under test: GET /emails/{leadId} (emailAdmin handler)
 *
 * These tests drive the emailAdmin handler directly — no HTTP server,
 * no API Gateway. All AWS SDK boundaries are mocked at the module level.
 *
 * Tests will FAIL until the GET /emails/{leadId} route is added to
 * backend/src/handlers/emailAdmin.ts. That is intentional: these tests
 * ARE the specification for Slice 2.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { APIGatewayProxyResultV2 } from 'aws-lambda';
import { createMockApiEvent, createMockEmail } from '../fixtures/factories.js';
import {
  mockDynamoDBSend,
  resetAllMocks,
  setupDynamoDBWithEmails,
} from '../fixtures/mocks.js';

// ---------------------------------------------------------------------------
// Module-level mocks — must be hoisted before any imports of the handler.
// All commands used across slice 1 AND slice 2 must be registered here so
// the handler module resolves them on its first import.
// ---------------------------------------------------------------------------

vi.mock('@aws-sdk/client-ses', () => {
  const SendEmailCommand = vi.fn().mockImplementation((input) => ({ input }));
  const SESClient = vi.fn().mockImplementation(() => ({
    send: vi.fn().mockResolvedValue({
      MessageId: 'ses-msg-id-0123456789ABCDEF',
      $metadata: { httpStatusCode: 200 },
    }),
  }));
  return { SESClient, SendEmailCommand };
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
  return { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, QueryCommand };
});

// ---------------------------------------------------------------------------
// Import handler AFTER mocks are registered
// ---------------------------------------------------------------------------

// This import will fail until GET /emails/{leadId} is implemented in
// src/handlers/emailAdmin.ts. The failure is expected: tests are the spec.
const { handler } = await import('../../src/handlers/emailAdmin.js');

// ---------------------------------------------------------------------------
// Test constants
// ---------------------------------------------------------------------------

const VALID_LEAD_ID = 'lead_01HTEST123456789ABCDE';
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
 * Builds a GET /emails/{leadId} event.
 * Passes leadId both in the path and in pathParameters as the handler requires.
 */
function buildGetThreadEvent(
  leadId: string,
  queryStringParameters?: Record<string, string>
) {
  return createMockApiEvent({
    method: 'GET',
    path: `/emails/${leadId}`,
    body: null,
    pathParameters: { leadId },
    queryStringParameters,
  });
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('GET /emails/{leadId}', () => {
  beforeEach(() => {
    resetAllMocks();
    vi.resetModules();
  });

  // -------------------------------------------------------------------------
  // Happy Path
  // -------------------------------------------------------------------------

  describe('happy path', () => {
    it('should return 200 with emails in chronological order (oldest first)', async () => {
      const oldest = createMockEmail({
        id: 'msg-001',
        leadId: VALID_LEAD_ID,
        sentAt: '2026-01-10T08:00:00.000Z',
      });
      const newest = createMockEmail({
        id: 'msg-002',
        leadId: VALID_LEAD_ID,
        sentAt: '2026-01-15T10:00:00.000Z',
      });

      setupDynamoDBWithEmails(
        [oldest, newest] as unknown as Record<string, unknown>[],
        2
      );

      const event = buildGetThreadEvent(VALID_LEAD_ID);
      const result = await handler(event);

      expect(statusCode(result)).toBe(200);

      const body = parseBody(result);
      expect(Array.isArray(body.emails)).toBe(true);

      const emails = body.emails as Record<string, unknown>[];
      expect(emails).toHaveLength(2);

      // Oldest must appear first — ScanIndexForward=true preserves DynamoDB order
      expect(emails[0].id).toBe('msg-001');
      expect(emails[1].id).toBe('msg-002');
    });

    it('should return totalCount of all emails for the lead', async () => {
      const email = createMockEmail({ leadId: VALID_LEAD_ID });
      setupDynamoDBWithEmails(
        [email] as unknown as Record<string, unknown>[],
        42
      );

      const event = buildGetThreadEvent(VALID_LEAD_ID);
      const result = await handler(event);

      expect(statusCode(result)).toBe(200);

      const body = parseBody(result);
      expect(body.totalCount).toBe(42);
    });

    it('should return an empty emails array when the lead has no emails', async () => {
      setupDynamoDBWithEmails([], 0);

      const event = buildGetThreadEvent(VALID_LEAD_ID);
      const result = await handler(event);

      expect(statusCode(result)).toBe(200);

      const body = parseBody(result);
      expect(Array.isArray(body.emails)).toBe(true);
      expect((body.emails as unknown[]).length).toBe(0);
      expect(body.totalCount).toBe(0);
    });

    it('should use a default limit of 50 when no limit is provided', async () => {
      setupDynamoDBWithEmails([], 0);

      const event = buildGetThreadEvent(VALID_LEAD_ID);
      await handler(event);

      const queryCallArg = mockDynamoDBSend.mock.calls[0][0] as {
        input: Record<string, unknown>;
      };
      expect(queryCallArg.input.Limit).toBe(50);
    });

    it('should pass the requested limit to DynamoDB', async () => {
      setupDynamoDBWithEmails([], 0);

      const event = buildGetThreadEvent(VALID_LEAD_ID, { limit: '10' });
      await handler(event);

      const queryCallArg = mockDynamoDBSend.mock.calls[0][0] as {
        input: Record<string, unknown>;
      };
      expect(queryCallArg.input.Limit).toBe(10);
    });

    it('should return nextCursor when DynamoDB returns a LastEvaluatedKey', async () => {
      const lastKey = { PK: `LEAD#${VALID_LEAD_ID}`, SK: 'EMAIL#2026-01-15T10:00:00.000Z#msg-001' };
      const cursor = encodeAsCursor(lastKey);

      const email = createMockEmail({ leadId: VALID_LEAD_ID });
      setupDynamoDBWithEmails(
        [email] as unknown as Record<string, unknown>[],
        10,
        cursor
      );

      const event = buildGetThreadEvent(VALID_LEAD_ID);
      const result = await handler(event);

      expect(statusCode(result)).toBe(200);

      const body = parseBody(result);
      expect(typeof body.nextCursor).toBe('string');
      expect((body.nextCursor as string).length).toBeGreaterThan(0);
    });

    it('should NOT include nextCursor when there are no more results', async () => {
      const email = createMockEmail({ leadId: VALID_LEAD_ID });
      // No cursor argument — no LastEvaluatedKey returned by DynamoDB
      setupDynamoDBWithEmails(
        [email] as unknown as Record<string, unknown>[],
        1
      );

      const event = buildGetThreadEvent(VALID_LEAD_ID);
      const result = await handler(event);

      expect(statusCode(result)).toBe(200);

      const body = parseBody(result);
      expect(body.nextCursor).toBeUndefined();
    });

    it('should accept a valid base64 cursor parameter and pass it to DynamoDB', async () => {
      const lastKey = { PK: `LEAD#${VALID_LEAD_ID}`, SK: 'EMAIL#2026-01-10T08:00:00.000Z#msg-000' };
      const cursor = encodeAsCursor(lastKey);

      setupDynamoDBWithEmails([], 5);

      const event = buildGetThreadEvent(VALID_LEAD_ID, { cursor });
      await handler(event);

      const queryCallArg = mockDynamoDBSend.mock.calls[0][0] as {
        input: Record<string, unknown>;
      };
      // ExclusiveStartKey must be present and decoded from the cursor
      expect(queryCallArg.input.ExclusiveStartKey).toMatchObject(lastKey);
    });

    it('should return all required fields on each email in the response', async () => {
      const email = createMockEmail({
        id: 'msg-fields-check',
        leadId: VALID_LEAD_ID,
        direction: 'outbound',
        fromAddress: 'team@tropicoretreat.com',
        toAddress: 'guest@example.com',
        subject: 'Field Verification',
        bodyText: 'All required fields must be present.',
        sentAt: '2026-01-15T10:00:00.000Z',
        readAt: null,
        operator: 'operator@tropicoretreat.com',
        s3Key: null,
        attachments: [],
        createdAt: '2026-01-15T10:00:00.000Z',
        updatedAt: '2026-01-15T10:00:00.000Z',
      });

      setupDynamoDBWithEmails(
        [email] as unknown as Record<string, unknown>[],
        1
      );

      const event = buildGetThreadEvent(VALID_LEAD_ID);
      const result = await handler(event);

      const body = parseBody(result);
      const emails = body.emails as Record<string, unknown>[];
      const first = emails[0];

      const requiredFields = [
        'id',
        'leadId',
        'direction',
        'fromAddress',
        'toAddress',
        'subject',
        'bodyText',
        'sentAt',
        'readAt',
        'operator',
        's3Key',
        'createdAt',
        'updatedAt',
        'attachments',
      ];

      for (const field of requiredFields) {
        expect(first, `Field "${field}" must be present on each email`).toHaveProperty(field);
      }

      expect(Array.isArray(first.attachments)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Input Validation
  // -------------------------------------------------------------------------

  describe('input validation', () => {
    it('should return 400 when limit is 0', async () => {
      const event = buildGetThreadEvent(VALID_LEAD_ID, { limit: '0' });
      const result = await handler(event);

      expect(statusCode(result)).toBe(400);
      const body = parseBody(result);
      expect(body.error).toBe('Invalid limit parameter. Must be between 1 and 100.');
    });

    it('should return 400 when limit exceeds 100', async () => {
      const event = buildGetThreadEvent(VALID_LEAD_ID, { limit: '101' });
      const result = await handler(event);

      expect(statusCode(result)).toBe(400);
      const body = parseBody(result);
      expect(body.error).toBe('Invalid limit parameter. Must be between 1 and 100.');
    });

    it('should return 400 when limit is negative', async () => {
      const event = buildGetThreadEvent(VALID_LEAD_ID, { limit: '-1' });
      const result = await handler(event);

      expect(statusCode(result)).toBe(400);
      const body = parseBody(result);
      expect(body.error).toBe('Invalid limit parameter. Must be between 1 and 100.');
    });

    it('should return 400 when limit is not a number', async () => {
      const event = buildGetThreadEvent(VALID_LEAD_ID, { limit: 'abc' });
      const result = await handler(event);

      expect(statusCode(result)).toBe(400);
      const body = parseBody(result);
      expect(body.error).toBe('Invalid limit parameter. Must be between 1 and 100.');
    });

    it('should return 400 when cursor is not valid base64 JSON', async () => {
      const event = buildGetThreadEvent(VALID_LEAD_ID, { cursor: '!!!not-valid-base64!!!' });
      const result = await handler(event);

      expect(statusCode(result)).toBe(400);
      const body = parseBody(result);
      expect(body.error).toBe('Invalid pagination cursor');
    });

    it('should return 400 when cursor is valid base64 but not a JSON object', async () => {
      // "hello" is valid base64 but decodes to a plain string, not a JSON object
      const notAnObject = Buffer.from('"just a string"').toString('base64');
      const event = buildGetThreadEvent(VALID_LEAD_ID, { cursor: notAnObject });
      const result = await handler(event);

      expect(statusCode(result)).toBe(400);
      const body = parseBody(result);
      expect(body.error).toBe('Invalid pagination cursor');
    });
  });

  // -------------------------------------------------------------------------
  // Error Handling
  // -------------------------------------------------------------------------

  describe('error handling', () => {
    it('should return 500 when DynamoDB query fails', async () => {
      mockDynamoDBSend.mockRejectedValueOnce(new Error('DynamoDB provisioned throughput exceeded'));

      const event = buildGetThreadEvent(VALID_LEAD_ID);
      const result = await handler(event);

      expect(statusCode(result)).toBe(500);
      const body = parseBody(result);
      expect(body.error).toBeDefined();
    });

    it('should return 500 when TABLE_NAME environment variable is not set', async () => {
      const originalTableName = process.env.TABLE_NAME;
      delete process.env.TABLE_NAME;

      try {
        // Re-import the handler so it picks up the missing env var.
        // vi.resetModules() was called in beforeEach, so a fresh module is loaded.
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
          return { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, QueryCommand };
        });

        const { handler: freshHandler } = await import('../../src/handlers/emailAdmin.js');
        const event = buildGetThreadEvent(VALID_LEAD_ID);
        const result = await freshHandler(event);

        expect(statusCode(result)).toBe(500);
        const body = parseBody(result);
        expect(body.error).toBeDefined();
      } finally {
        process.env.TABLE_NAME = originalTableName;
      }
    });
  });

  // -------------------------------------------------------------------------
  // DynamoDB call verification
  // -------------------------------------------------------------------------

  describe('DynamoDB query parameters', () => {
    it('should query DynamoDB with PK = LEAD#{leadId}', async () => {
      setupDynamoDBWithEmails([], 0);

      const event = buildGetThreadEvent(VALID_LEAD_ID);
      await handler(event);

      const queryCallArg = mockDynamoDBSend.mock.calls[0][0] as {
        input: Record<string, unknown>;
      };
      const expressionValues = queryCallArg.input
        .ExpressionAttributeValues as Record<string, unknown>;

      // The PK condition value must be LEAD#{leadId}
      const pkValue = Object.values(expressionValues).find(
        (value) => value === `LEAD#${VALID_LEAD_ID}`
      );
      expect(pkValue).toBeDefined();
    });

    it('should query DynamoDB with begins_with SK filter on EMAIL#', async () => {
      setupDynamoDBWithEmails([], 0);

      const event = buildGetThreadEvent(VALID_LEAD_ID);
      await handler(event);

      const queryCallArg = mockDynamoDBSend.mock.calls[0][0] as {
        input: Record<string, unknown>;
      };

      // The KeyConditionExpression must reference begins_with and EMAIL#
      const keyConditionExpression = queryCallArg.input
        .KeyConditionExpression as string;
      expect(keyConditionExpression).toContain('begins_with');

      const expressionValues = queryCallArg.input
        .ExpressionAttributeValues as Record<string, unknown>;
      const skPrefixValue = Object.values(expressionValues).find(
        (value) => value === 'EMAIL#'
      );
      expect(skPrefixValue).toBeDefined();
    });

    it('should query DynamoDB with ScanIndexForward set to true', async () => {
      setupDynamoDBWithEmails([], 0);

      const event = buildGetThreadEvent(VALID_LEAD_ID);
      await handler(event);

      const queryCallArg = mockDynamoDBSend.mock.calls[0][0] as {
        input: Record<string, unknown>;
      };
      expect(queryCallArg.input.ScanIndexForward).toBe(true);
    });

    it('should pass the correct Limit value to DynamoDB', async () => {
      setupDynamoDBWithEmails([], 0);

      const event = buildGetThreadEvent(VALID_LEAD_ID, { limit: '25' });
      await handler(event);

      const queryCallArg = mockDynamoDBSend.mock.calls[0][0] as {
        input: Record<string, unknown>;
      };
      expect(queryCallArg.input.Limit).toBe(25);
    });

    it('should query the correct table name from TABLE_NAME env var', async () => {
      setupDynamoDBWithEmails([], 0);

      const event = buildGetThreadEvent(VALID_LEAD_ID);
      await handler(event);

      const queryCallArg = mockDynamoDBSend.mock.calls[0][0] as {
        input: Record<string, unknown>;
      };
      expect(queryCallArg.input.TableName).toBe(TABLE_NAME);
    });
  });

  // -------------------------------------------------------------------------
  // Route matching
  // -------------------------------------------------------------------------

  describe('route matching', () => {
    it('should handle GET /emails/{leadId} and return 200', async () => {
      setupDynamoDBWithEmails([], 0);

      const event = buildGetThreadEvent(VALID_LEAD_ID);
      const result = await handler(event);

      expect(statusCode(result)).toBe(200);
    });

    it('should return 405 when DELETE is sent to /emails/{leadId}', async () => {
      const event = createMockApiEvent({
        method: 'DELETE',
        path: `/emails/${VALID_LEAD_ID}`,
        body: null,
        pathParameters: { leadId: VALID_LEAD_ID },
      });

      const result = await handler(event);

      expect(statusCode(result)).toBe(405);
      const body = parseBody(result);
      expect(body.error).toBeDefined();
    });

    it('should return 405 when PATCH is sent to /emails/{leadId}', async () => {
      const event = createMockApiEvent({
        method: 'PATCH',
        path: `/emails/${VALID_LEAD_ID}`,
        body: null,
        pathParameters: { leadId: VALID_LEAD_ID },
      });

      const result = await handler(event);

      expect(statusCode(result)).toBe(405);
      const body = parseBody(result);
      expect(body.error).toBeDefined();
    });

    it('should still return 405 for unsupported methods on the /emails/send route', async () => {
      const event = createMockApiEvent({
        method: 'PUT',
        path: '/emails/send',
        body: null,
      });

      const result = await handler(event);

      expect(statusCode(result)).toBe(405);
    });
  });
});
