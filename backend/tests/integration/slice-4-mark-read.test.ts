/**
 * Integration tests for Slice 4: Mark Emails as Read
 *
 * Contract under test: PATCH /emails/{leadId}/read (emailAdmin handler)
 *
 * These tests drive the emailAdmin handler directly — no HTTP server,
 * no API Gateway. All AWS SDK boundaries are mocked at the module level.
 *
 * Tests will FAIL until the PATCH /emails/{leadId}/read route is added to
 * backend/src/handlers/emailAdmin.ts. That is intentional: these tests
 * ARE the specification for Slice 4.
 *
 * DynamoDB call sequence for a successful mark-read:
 *   1. GetCommand   — verify lead exists (PK = LEAD#{leadId}, SK = LEAD#{leadId})
 *   2. QueryCommand — find unread inbound emails (direction = 'inbound', readAt = null)
 *   3. UpdateCommand × N — SET readAt = :now, updatedAt = :now on each unread email
 *   4. UpdateCommand — reset lead unreadEmailCount = 0, SET updatedAt = :now
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { APIGatewayProxyResultV2 } from 'aws-lambda';
import { createMockApiEvent, createMockEmail, createMockLead } from '../fixtures/factories.js';
import {
  mockDynamoDBSend,
  resetAllMocks,
  setupDynamoDBLeadNotFound,
  setupDynamoDBForMarkRead,
} from '../fixtures/mocks.js';

// ---------------------------------------------------------------------------
// Module-level mocks — must be hoisted before any imports of the handler.
// All commands used across all slices must be registered here.
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

// This import will fail until PATCH /emails/{leadId}/read is implemented in
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
 * Builds a PATCH /emails/{leadId}/read event.
 * Passes leadId both in the path and in pathParameters as the handler requires.
 */
function buildMarkReadEvent(leadId: string) {
  return createMockApiEvent({
    method: 'PATCH',
    path: `/emails/${leadId}/read`,
    body: JSON.stringify({}),
    pathParameters: { leadId },
  });
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('PATCH /emails/{leadId}/read', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  // -------------------------------------------------------------------------
  // Happy Path
  // -------------------------------------------------------------------------

  describe('happy path', () => {
    it('should return 200 with markedCount and leadId when unread emails exist', async () => {
      const lead = createMockLead({ id: VALID_LEAD_ID });
      const unreadEmail1 = createMockEmail({
        id: 'inbound-msg-001',
        leadId: VALID_LEAD_ID,
        direction: 'inbound',
        readAt: null,
        sentAt: '2026-01-15T09:00:00.000Z',
      });
      const unreadEmail2 = createMockEmail({
        id: 'inbound-msg-002',
        leadId: VALID_LEAD_ID,
        direction: 'inbound',
        readAt: null,
        sentAt: '2026-01-15T10:00:00.000Z',
      });

      setupDynamoDBForMarkRead({
        leadItem: lead as unknown as Record<string, unknown>,
        unreadEmails: [
          unreadEmail1 as unknown as Record<string, unknown>,
          unreadEmail2 as unknown as Record<string, unknown>,
        ],
      });

      const event = buildMarkReadEvent(VALID_LEAD_ID);
      const result = await handler(event);

      expect(statusCode(result)).toBe(200);

      const body = parseBody(result);
      expect(body.markedCount).toBe(2);
      expect(body.leadId).toBe(VALID_LEAD_ID);
    });

    it('should return markedCount of 0 when there are no unread inbound emails', async () => {
      const lead = createMockLead({ id: VALID_LEAD_ID });

      setupDynamoDBForMarkRead({
        leadItem: lead as unknown as Record<string, unknown>,
        unreadEmails: [],
      });

      const event = buildMarkReadEvent(VALID_LEAD_ID);
      const result = await handler(event);

      expect(statusCode(result)).toBe(200);

      const body = parseBody(result);
      expect(body.markedCount).toBe(0);
      expect(body.leadId).toBe(VALID_LEAD_ID);
    });

    it('should return markedCount of 1 when exactly one unread email exists', async () => {
      const lead = createMockLead({ id: VALID_LEAD_ID });
      const singleUnread = createMockEmail({
        id: 'inbound-msg-only',
        leadId: VALID_LEAD_ID,
        direction: 'inbound',
        readAt: null,
      });

      setupDynamoDBForMarkRead({
        leadItem: lead as unknown as Record<string, unknown>,
        unreadEmails: [singleUnread as unknown as Record<string, unknown>],
      });

      const event = buildMarkReadEvent(VALID_LEAD_ID);
      const result = await handler(event);

      expect(statusCode(result)).toBe(200);

      const body = parseBody(result);
      expect(body.markedCount).toBe(1);
    });

    it('should return leadId matching the path parameter', async () => {
      const specificLeadId = 'lead_specific-99999ZZZZZ';
      const lead = createMockLead({ id: specificLeadId });

      setupDynamoDBForMarkRead({
        leadItem: lead as unknown as Record<string, unknown>,
        unreadEmails: [],
      });

      const event = buildMarkReadEvent(specificLeadId);
      const result = await handler(event);

      expect(statusCode(result)).toBe(200);

      const body = parseBody(result);
      expect(body.leadId).toBe(specificLeadId);
    });

    it('should accept an empty request body without returning a validation error', async () => {
      const lead = createMockLead({ id: VALID_LEAD_ID });

      setupDynamoDBForMarkRead({
        leadItem: lead as unknown as Record<string, unknown>,
        unreadEmails: [],
      });

      const event = buildMarkReadEvent(VALID_LEAD_ID);
      const result = await handler(event);

      expect(statusCode(result)).toBe(200);
    });

    it('should accept a null body without returning a validation error', async () => {
      const lead = createMockLead({ id: VALID_LEAD_ID });

      setupDynamoDBForMarkRead({
        leadItem: lead as unknown as Record<string, unknown>,
        unreadEmails: [],
      });

      const event = createMockApiEvent({
        method: 'PATCH',
        path: `/emails/${VALID_LEAD_ID}/read`,
        body: null,
        pathParameters: { leadId: VALID_LEAD_ID },
      });

      const result = await handler(event);

      expect(statusCode(result)).toBe(200);
    });
  });

  // -------------------------------------------------------------------------
  // DynamoDB Call Ordering and Parameter Verification
  // -------------------------------------------------------------------------

  describe('DynamoDB call ordering', () => {
    it('should call DynamoDB GetCommand first to verify lead exists', async () => {
      const lead = createMockLead({ id: VALID_LEAD_ID });

      setupDynamoDBForMarkRead({
        leadItem: lead as unknown as Record<string, unknown>,
        unreadEmails: [],
      });

      const event = buildMarkReadEvent(VALID_LEAD_ID);
      await handler(event);

      // First call must be GetCommand for the lead
      const firstCallArg = mockDynamoDBSend.mock.calls[0][0] as { input: Record<string, unknown> };
      expect(firstCallArg.input).toMatchObject({
        TableName: TABLE_NAME,
        Key: {
          PK: `LEAD#${VALID_LEAD_ID}`,
          SK: `LEAD#${VALID_LEAD_ID}`,
        },
      });
    });

    it('should call DynamoDB QueryCommand second to find unread inbound emails', async () => {
      const lead = createMockLead({ id: VALID_LEAD_ID });

      setupDynamoDBForMarkRead({
        leadItem: lead as unknown as Record<string, unknown>,
        unreadEmails: [],
      });

      const event = buildMarkReadEvent(VALID_LEAD_ID);
      await handler(event);

      // Second call must be QueryCommand for unread emails
      const secondCallArg = mockDynamoDBSend.mock.calls[1][0] as {
        input: Record<string, unknown>;
      };

      expect(secondCallArg.input.TableName).toBe(TABLE_NAME);

      // Must query PK = LEAD#{leadId}
      const expressionValues = secondCallArg.input
        .ExpressionAttributeValues as Record<string, unknown>;
      const pkValue = Object.values(expressionValues).find(
        (value) => value === `LEAD#${VALID_LEAD_ID}`
      );
      expect(pkValue).toBeDefined();

      // Must filter on SK begins_with EMAIL#
      const keyConditionExpression = secondCallArg.input.KeyConditionExpression as string;
      expect(keyConditionExpression).toContain('begins_with');
      const skPrefixValue = Object.values(expressionValues).find(
        (value) => value === 'EMAIL#'
      );
      expect(skPrefixValue).toBeDefined();
    });

    it('should call UpdateCommand for each unread email to set readAt', async () => {
      const lead = createMockLead({ id: VALID_LEAD_ID });
      const unreadEmail1 = createMockEmail({
        id: 'inbound-msg-001',
        leadId: VALID_LEAD_ID,
        direction: 'inbound',
        readAt: null,
        sentAt: '2026-01-15T09:00:00.000Z',
      });
      const unreadEmail2 = createMockEmail({
        id: 'inbound-msg-002',
        leadId: VALID_LEAD_ID,
        direction: 'inbound',
        readAt: null,
        sentAt: '2026-01-15T10:00:00.000Z',
      });

      setupDynamoDBForMarkRead({
        leadItem: lead as unknown as Record<string, unknown>,
        unreadEmails: [
          unreadEmail1 as unknown as Record<string, unknown>,
          unreadEmail2 as unknown as Record<string, unknown>,
        ],
      });

      const event = buildMarkReadEvent(VALID_LEAD_ID);
      await handler(event);

      // Total calls: 1 GetCommand + 1 QueryCommand + 2 UpdateCommand (emails) + 1 UpdateCommand (lead)
      expect(mockDynamoDBSend).toHaveBeenCalledTimes(5);

      // Calls 3 and 4 (index 2 and 3) must be UpdateCommand for email records
      const emailUpdate1 = mockDynamoDBSend.mock.calls[2][0] as { input: Record<string, unknown> };
      const emailUpdate2 = mockDynamoDBSend.mock.calls[3][0] as { input: Record<string, unknown> };

      expect(emailUpdate1.input.TableName).toBe(TABLE_NAME);
      expect(emailUpdate2.input.TableName).toBe(TABLE_NAME);

      // Each UpdateCommand must set readAt and updatedAt
      const updateExpression1 = emailUpdate1.input.UpdateExpression as string;
      expect(updateExpression1).toContain('readAt');
      expect(updateExpression1).toContain('updatedAt');

      const updateExpression2 = emailUpdate2.input.UpdateExpression as string;
      expect(updateExpression2).toContain('readAt');
      expect(updateExpression2).toContain('updatedAt');
    });

    it('should call final UpdateCommand to reset lead unreadEmailCount to 0', async () => {
      const lead = createMockLead({ id: VALID_LEAD_ID });
      const unreadEmail = createMockEmail({
        id: 'inbound-msg-001',
        leadId: VALID_LEAD_ID,
        direction: 'inbound',
        readAt: null,
      });

      setupDynamoDBForMarkRead({
        leadItem: lead as unknown as Record<string, unknown>,
        unreadEmails: [unreadEmail as unknown as Record<string, unknown>],
      });

      const event = buildMarkReadEvent(VALID_LEAD_ID);
      await handler(event);

      // Total calls: 1 GetCommand + 1 QueryCommand + 1 UpdateCommand (email) + 1 UpdateCommand (lead)
      expect(mockDynamoDBSend).toHaveBeenCalledTimes(4);

      // Last call must update the lead record with unreadEmailCount = 0
      const lastCallIndex = mockDynamoDBSend.mock.calls.length - 1;
      const leadUpdateArg = mockDynamoDBSend.mock.calls[lastCallIndex][0] as {
        input: Record<string, unknown>;
      };

      expect(leadUpdateArg.input).toMatchObject({
        TableName: TABLE_NAME,
        Key: {
          PK: `LEAD#${VALID_LEAD_ID}`,
          SK: `LEAD#${VALID_LEAD_ID}`,
        },
      });

      // ExpressionAttributeValues must include a zero value for unreadEmailCount
      const attributeValues = leadUpdateArg.input
        .ExpressionAttributeValues as Record<string, unknown>;
      const zeroValue = Object.values(attributeValues).find((value) => value === 0);
      expect(zeroValue).toBeDefined();

      // UpdateExpression must reference unreadEmailCount
      const updateExpression = leadUpdateArg.input.UpdateExpression as string;
      expect(updateExpression).toContain('unreadEmailCount');
    });

    it('should call DynamoDB exactly 2 times when there are no unread emails', async () => {
      const lead = createMockLead({ id: VALID_LEAD_ID });

      setupDynamoDBForMarkRead({
        leadItem: lead as unknown as Record<string, unknown>,
        unreadEmails: [],
      });

      const event = buildMarkReadEvent(VALID_LEAD_ID);
      await handler(event);

      // 1: GetCommand (getLead) + 1: QueryCommand (findUnread) + 1: UpdateCommand (resetCount)
      // The lead unreadEmailCount update should still happen even with zero unread emails
      expect(mockDynamoDBSend).toHaveBeenCalledTimes(3);
    });

    it('should set readAt to a valid ISO 8601 timestamp on each updated email', async () => {
      const lead = createMockLead({ id: VALID_LEAD_ID });
      const unreadEmail = createMockEmail({
        id: 'inbound-ts-check',
        leadId: VALID_LEAD_ID,
        direction: 'inbound',
        readAt: null,
      });

      setupDynamoDBForMarkRead({
        leadItem: lead as unknown as Record<string, unknown>,
        unreadEmails: [unreadEmail as unknown as Record<string, unknown>],
      });

      const event = buildMarkReadEvent(VALID_LEAD_ID);
      await handler(event);

      // Call index 2 is the first email UpdateCommand
      const emailUpdateArg = mockDynamoDBSend.mock.calls[2][0] as {
        input: Record<string, unknown>;
      };

      const attributeValues = emailUpdateArg.input
        .ExpressionAttributeValues as Record<string, unknown>;

      // readAt must be an ISO 8601 timestamp string
      const timestampValue = Object.values(attributeValues).find(
        (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(value as string)
      );
      expect(timestampValue).toBeDefined();
    });

    it('should use TABLE_NAME from environment for all DynamoDB calls', async () => {
      const lead = createMockLead({ id: VALID_LEAD_ID });

      setupDynamoDBForMarkRead({
        leadItem: lead as unknown as Record<string, unknown>,
        unreadEmails: [],
      });

      const event = buildMarkReadEvent(VALID_LEAD_ID);
      await handler(event);

      // Every DynamoDB call must use TABLE_NAME from the environment
      for (const call of mockDynamoDBSend.mock.calls) {
        const callArg = call[0] as { input: Record<string, unknown> };
        expect(callArg.input.TableName).toBe(TABLE_NAME);
      }
    });

    it('should update each email record with the correct PK and SK key', async () => {
      const lead = createMockLead({ id: VALID_LEAD_ID });
      const unreadEmail = createMockEmail({
        id: 'inbound-key-check',
        leadId: VALID_LEAD_ID,
        direction: 'inbound',
        readAt: null,
        sentAt: '2026-01-15T10:00:00.000Z',
      });

      setupDynamoDBForMarkRead({
        leadItem: lead as unknown as Record<string, unknown>,
        unreadEmails: [unreadEmail as unknown as Record<string, unknown>],
      });

      const event = buildMarkReadEvent(VALID_LEAD_ID);
      await handler(event);

      // Call index 2 is the email UpdateCommand
      const emailUpdateArg = mockDynamoDBSend.mock.calls[2][0] as {
        input: Record<string, unknown>;
      };
      const key = emailUpdateArg.input.Key as Record<string, unknown>;

      // PK must be LEAD#{leadId}
      expect(key.PK).toBe(`LEAD#${VALID_LEAD_ID}`);

      // SK must follow the EMAIL#{timestamp}#{messageId} pattern
      expect(key.SK).toMatch(/^EMAIL#\d{4}-\d{2}-\d{2}T[\d:.]+Z#.+$/);
    });
  });

  // -------------------------------------------------------------------------
  // Error Cases
  // -------------------------------------------------------------------------

  describe('error cases', () => {
    it('should return 404 when lead does not exist', async () => {
      setupDynamoDBLeadNotFound();

      const event = buildMarkReadEvent('lead_nonexistent-00000');
      const result = await handler(event);

      expect(statusCode(result)).toBe(404);

      const body = parseBody(result);
      expect(body.error).toBe('Lead not found');
    });

    it('should NOT call QueryCommand or UpdateCommand when lead is not found', async () => {
      setupDynamoDBLeadNotFound();

      const event = buildMarkReadEvent('lead_ghost-99999');
      await handler(event);

      // Only the initial GetCommand should have been called — no further DynamoDB calls
      expect(mockDynamoDBSend).toHaveBeenCalledTimes(1);
    });

    it('should return 500 when the GetCommand for the lead fails', async () => {
      mockDynamoDBSend.mockRejectedValueOnce(new Error('DynamoDB service unavailable'));

      const event = buildMarkReadEvent(VALID_LEAD_ID);
      const result = await handler(event);

      expect(statusCode(result)).toBe(500);

      const body = parseBody(result);
      expect(body.error).toBeDefined();
    });

    it('should return 500 when the QueryCommand for unread emails fails', async () => {
      const lead = createMockLead({ id: VALID_LEAD_ID });

      // Call 1: GetCommand (getLead) — success
      mockDynamoDBSend.mockResolvedValueOnce({
        Item: lead,
        $metadata: { httpStatusCode: 200 },
      });
      // Call 2: QueryCommand (findUnreadEmails) — failure
      mockDynamoDBSend.mockRejectedValueOnce(
        new Error('DynamoDB provisioned throughput exceeded')
      );

      const event = buildMarkReadEvent(VALID_LEAD_ID);
      const result = await handler(event);

      expect(statusCode(result)).toBe(500);

      const body = parseBody(result);
      expect(body.error).toBeDefined();
    });

    it('should return 500 when an UpdateCommand on an email record fails', async () => {
      const lead = createMockLead({ id: VALID_LEAD_ID });
      const unreadEmail = createMockEmail({
        id: 'inbound-fail-update',
        leadId: VALID_LEAD_ID,
        direction: 'inbound',
        readAt: null,
      });

      // Call 1: GetCommand (getLead) — success
      mockDynamoDBSend.mockResolvedValueOnce({
        Item: lead,
        $metadata: { httpStatusCode: 200 },
      });
      // Call 2: QueryCommand (findUnreadEmails) — returns one unread email
      mockDynamoDBSend.mockResolvedValueOnce({
        Items: [unreadEmail],
        Count: 1,
        $metadata: { httpStatusCode: 200 },
      });
      // Call 3: UpdateCommand (markEmailRead) — failure
      mockDynamoDBSend.mockRejectedValueOnce(
        new Error('DynamoDB conditional check failed')
      );

      const event = buildMarkReadEvent(VALID_LEAD_ID);
      const result = await handler(event);

      expect(statusCode(result)).toBe(500);

      const body = parseBody(result);
      expect(body.error).toBeDefined();
    });

    it('should return 500 when the lead unreadEmailCount reset UpdateCommand fails', async () => {
      const lead = createMockLead({ id: VALID_LEAD_ID });

      // Call 1: GetCommand (getLead) — success
      mockDynamoDBSend.mockResolvedValueOnce({
        Item: lead,
        $metadata: { httpStatusCode: 200 },
      });
      // Call 2: QueryCommand (findUnreadEmails) — returns empty list
      mockDynamoDBSend.mockResolvedValueOnce({
        Items: [],
        Count: 0,
        $metadata: { httpStatusCode: 200 },
      });
      // Call 3: UpdateCommand (resetUnreadCount) — failure
      mockDynamoDBSend.mockRejectedValueOnce(
        new Error('DynamoDB write throughput exceeded')
      );

      const event = buildMarkReadEvent(VALID_LEAD_ID);
      const result = await handler(event);

      expect(statusCode(result)).toBe(500);

      const body = parseBody(result);
      expect(body.error).toBeDefined();
    });

    it('should return 500 when TABLE_NAME environment variable is not set', async () => {
      const originalTableName = process.env.TABLE_NAME;
      delete process.env.TABLE_NAME;

      try {
        vi.resetModules();

        vi.mock('@aws-sdk/client-dynamodb', () => {
          const DynamoDBClient = vi.fn().mockImplementation(() => ({}));
          return { DynamoDBClient };
        });

        vi.mock('@aws-sdk/lib-dynamodb', () => {
          const DynamoDBDocumentClient = {
            from: vi.fn().mockReturnValue({ send: mockDynamoDBSend }),
          };
          const PutCommand = vi.fn().mockImplementation((input: unknown) => ({ input }));
          const GetCommand = vi.fn().mockImplementation((input: unknown) => ({ input }));
          const UpdateCommand = vi.fn().mockImplementation((input: unknown) => ({ input }));
          const QueryCommand = vi.fn().mockImplementation((input: unknown) => ({ input }));
          return { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, QueryCommand };
        });

        const { handler: freshHandler } = await import('../../src/handlers/emailAdmin.js');
        const event = buildMarkReadEvent(VALID_LEAD_ID);
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
  // Route Matching
  // -------------------------------------------------------------------------

  describe('route matching', () => {
    it('should handle PATCH /emails/{leadId}/read and return 200', async () => {
      const lead = createMockLead({ id: VALID_LEAD_ID });

      setupDynamoDBForMarkRead({
        leadItem: lead as unknown as Record<string, unknown>,
        unreadEmails: [],
      });

      const event = buildMarkReadEvent(VALID_LEAD_ID);
      const result = await handler(event);

      expect(statusCode(result)).toBe(200);
    });

    it('should return 405 when GET is sent to /emails/{leadId}/read', async () => {
      const event = createMockApiEvent({
        method: 'GET',
        path: `/emails/${VALID_LEAD_ID}/read`,
        body: null,
        pathParameters: { leadId: VALID_LEAD_ID },
      });

      const result = await handler(event);

      expect(statusCode(result)).toBe(405);

      const body = parseBody(result);
      expect(body.error).toBeDefined();
    });

    it('should return 405 when DELETE is sent to /emails/{leadId}/read', async () => {
      const event = createMockApiEvent({
        method: 'DELETE',
        path: `/emails/${VALID_LEAD_ID}/read`,
        body: null,
        pathParameters: { leadId: VALID_LEAD_ID },
      });

      const result = await handler(event);

      expect(statusCode(result)).toBe(405);

      const body = parseBody(result);
      expect(body.error).toBeDefined();
    });

    it('should return 405 when POST is sent to /emails/{leadId}/read', async () => {
      const event = createMockApiEvent({
        method: 'POST',
        path: `/emails/${VALID_LEAD_ID}/read`,
        body: JSON.stringify({}),
        pathParameters: { leadId: VALID_LEAD_ID },
      });

      const result = await handler(event);

      expect(statusCode(result)).toBe(405);

      const body = parseBody(result);
      expect(body.error).toBeDefined();
    });

    it('should NOT treat PATCH /emails/{leadId} (without /read) as the mark-read route', async () => {
      // PATCH to /emails/{leadId} without /read suffix should NOT trigger the mark-read handler.
      // Slice 2 tests verify this returns 405 (no route matched) — confirmed here as well.
      const event = createMockApiEvent({
        method: 'PATCH',
        path: `/emails/${VALID_LEAD_ID}`,
        body: null,
        pathParameters: { leadId: VALID_LEAD_ID },
      });

      const result = await handler(event);

      // Must not return 200 — route is unmatched
      expect(statusCode(result)).not.toBe(200);
    });
  });

  // -------------------------------------------------------------------------
  // Response Envelope Shape
  // -------------------------------------------------------------------------

  describe('response envelope shape', () => {
    it('should return both required contract fields: markedCount and leadId', async () => {
      const lead = createMockLead({ id: VALID_LEAD_ID });

      setupDynamoDBForMarkRead({
        leadItem: lead as unknown as Record<string, unknown>,
        unreadEmails: [],
      });

      const event = buildMarkReadEvent(VALID_LEAD_ID);
      const result = await handler(event);

      const body = parseBody(result);

      expect(body).toHaveProperty('markedCount');
      expect(body).toHaveProperty('leadId');
    });

    it('should return markedCount as a number', async () => {
      const lead = createMockLead({ id: VALID_LEAD_ID });

      setupDynamoDBForMarkRead({
        leadItem: lead as unknown as Record<string, unknown>,
        unreadEmails: [],
      });

      const event = buildMarkReadEvent(VALID_LEAD_ID);
      const result = await handler(event);

      const body = parseBody(result);

      expect(typeof body.markedCount).toBe('number');
    });

    it('should return leadId as a string matching the path parameter', async () => {
      const lead = createMockLead({ id: VALID_LEAD_ID });

      setupDynamoDBForMarkRead({
        leadItem: lead as unknown as Record<string, unknown>,
        unreadEmails: [],
      });

      const event = buildMarkReadEvent(VALID_LEAD_ID);
      const result = await handler(event);

      const body = parseBody(result);

      expect(typeof body.leadId).toBe('string');
      expect(body.leadId).toBe(VALID_LEAD_ID);
    });

    it('should return 404 error body with error field when lead not found', async () => {
      setupDynamoDBLeadNotFound();

      const event = buildMarkReadEvent('lead_missing-12345');
      const result = await handler(event);

      const body = parseBody(result);
      expect(body).toHaveProperty('error');
      expect(typeof body.error).toBe('string');
    });
  });

  // -------------------------------------------------------------------------
  // Idempotency
  // -------------------------------------------------------------------------

  describe('idempotency', () => {
    it('should return markedCount of 0 on a second call when all emails are already read', async () => {
      const lead = createMockLead({ id: VALID_LEAD_ID });

      // Second call: lead exists but query returns no unread emails (already marked)
      setupDynamoDBForMarkRead({
        leadItem: lead as unknown as Record<string, unknown>,
        unreadEmails: [],
      });

      const event = buildMarkReadEvent(VALID_LEAD_ID);
      const result = await handler(event);

      expect(statusCode(result)).toBe(200);

      const body = parseBody(result);
      expect(body.markedCount).toBe(0);
    });

    it('should not affect already-read emails — only readAt=null inbound emails are updated', async () => {
      const lead = createMockLead({ id: VALID_LEAD_ID });

      // Query returns 0 unread (all emails already have readAt set, so filter excludes them)
      setupDynamoDBForMarkRead({
        leadItem: lead as unknown as Record<string, unknown>,
        unreadEmails: [],
      });

      const event = buildMarkReadEvent(VALID_LEAD_ID);
      await handler(event);

      // With 0 unread emails: GetCommand + QueryCommand + UpdateCommand(resetCount) = 3 calls
      // No per-email UpdateCommand calls should occur
      expect(mockDynamoDBSend).toHaveBeenCalledTimes(3);
    });
  });
});
