/**
 * Integration tests for Slice 1: Email Infrastructure + Send
 *
 * Contract under test: POST /emails/send (emailAdmin handler)
 *
 * These tests drive the emailAdmin handler directly — no HTTP server,
 * no API Gateway. All AWS SDK boundaries are mocked at the module level.
 *
 * Tests will FAIL until backend/src/handlers/emailAdmin.ts is implemented.
 * That is intentional: these tests ARE the specification.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { APIGatewayProxyResultV2 } from 'aws-lambda';
import {
  createMockApiEvent,
  createMockLead,
  createSendEmailRequest,
} from '../fixtures/factories.js';
import {
  mockDynamoDBSend,
  mockSESSend,
  resetAllMocks,
  setupDynamoDBLeadNotFound,
  setupDynamoDBWithLead,
} from '../fixtures/mocks.js';

// ---------------------------------------------------------------------------
// Module-level mocks — must be hoisted before any imports of the handler
// ---------------------------------------------------------------------------

vi.mock('@aws-sdk/client-ses', () => {
  const SendEmailCommand = vi.fn().mockImplementation((input) => ({ input }));
  const SESClient = vi.fn().mockImplementation(() => ({
    send: mockSESSend,
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

// This import will fail until src/handlers/emailAdmin.ts is implemented.
// That failure is the expected state before the implementation slice runs.
const { handler } = await import('../../src/handlers/emailAdmin.js');

// ---------------------------------------------------------------------------
// Test constants
// ---------------------------------------------------------------------------

const VALID_LEAD_ID = 'lead_01HTEST123456789ABCDE';
const SES_MESSAGE_ID = 'ses-msg-id-0123456789ABCDEF';
const FROM_ADDRESS = 'Tropico Retreats <team@tropicoretreat.com>';
const REPLY_TO_ADDRESS = 'team@tropicoretreat.com';
const OPERATOR_EMAIL = 'operator@tropicoretreat.com';
const OPERATOR_SUB = 'usr_test-operator-sub-001';

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

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('POST /emails/send', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  // -------------------------------------------------------------------------
  // Happy Path
  // -------------------------------------------------------------------------

  describe('happy path', () => {
    it('should send email and return 201 with email record', async () => {
      const lead = createMockLead({ id: VALID_LEAD_ID });
      setupDynamoDBWithLead(lead as unknown as Record<string, unknown>);

      const event = createMockApiEvent({
        body: JSON.stringify(createSendEmailRequest({ leadId: VALID_LEAD_ID })),
      });

      const result = await handler(event);

      expect(statusCode(result)).toBe(201);

      const body = parseBody(result);
      expect(body).toMatchObject({
        leadId: VALID_LEAD_ID,
        direction: 'outbound',
        toAddress: 'guest@example.com',
        subject: 'Your Tropico Retreat Enquiry',
        bodyText: 'Thank you for your enquiry. We will be in touch shortly.',
        attachments: [],
        readAt: null,
        s3Key: null,
      });

      // id must be a non-empty string (the SES MessageId)
      expect(typeof body.id).toBe('string');
      expect((body.id as string).length).toBeGreaterThan(0);

      // Timestamps must be present and ISO 8601
      expect(typeof body.sentAt).toBe('string');
      expect(new Date(body.sentAt as string).toISOString()).toBe(body.sentAt);
      expect(typeof body.createdAt).toBe('string');
      expect(typeof body.updatedAt).toBe('string');
    });

    it('should call SES with correct source, destination, replyTo, subject, and body', async () => {
      const lead = createMockLead({ id: VALID_LEAD_ID });
      setupDynamoDBWithLead(lead as unknown as Record<string, unknown>);

      const request = createSendEmailRequest({
        leadId: VALID_LEAD_ID,
        to: 'guest@example.com',
        subject: 'Custom Subject Line',
        bodyText: 'Plain text content here.',
        bodyHtml: '<p>HTML content here.</p>',
      });

      const event = createMockApiEvent({ body: JSON.stringify(request) });
      await handler(event);

      expect(mockSESSend).toHaveBeenCalledOnce();

      // The SES command input is wrapped by our mock: { input: <SendEmailCommand input> }
      const sentCommandArg = mockSESSend.mock.calls[0][0] as { input: Record<string, unknown> };
      const commandInput = sentCommandArg.input;

      expect(commandInput).toMatchObject({
        Source: FROM_ADDRESS,
        Destination: { ToAddresses: ['guest@example.com'] },
        ReplyToAddresses: [REPLY_TO_ADDRESS],
        Message: {
          Subject: { Data: 'Custom Subject Line' },
          Body: {
            Text: { Data: 'Plain text content here.' },
            Html: { Data: '<p>HTML content here.</p>' },
          },
        },
      });
    });

    it('should write email record to DynamoDB with correct PK/SK pattern', async () => {
      const lead = createMockLead({ id: VALID_LEAD_ID });
      setupDynamoDBWithLead(lead as unknown as Record<string, unknown>);

      const event = createMockApiEvent({
        body: JSON.stringify(createSendEmailRequest({ leadId: VALID_LEAD_ID })),
      });

      await handler(event);

      // Find the PutCommand call for the email record.
      // DynamoDB calls order: 1=GetCommand (getLead), 2=PutCommand (putEmail), 3=UpdateCommand (metadata)
      const putCallArg = mockDynamoDBSend.mock.calls[1][0] as { input: Record<string, unknown> };
      const putInput = putCallArg.input;

      expect(putInput).toMatchObject({
        TableName: 'test-tropico-leads',
        Item: expect.objectContaining({
          PK: `LEAD#${VALID_LEAD_ID}`,
          leadId: VALID_LEAD_ID,
          direction: 'outbound',
        }),
      });

      // SK must follow the EMAIL#{timestamp}#{messageId} pattern
      const skValue = (putInput.Item as Record<string, unknown>).SK as string;
      expect(skValue).toMatch(/^EMAIL#\d{4}-\d{2}-\d{2}T[\d:.]+Z#.+$/);
    });

    it('should update lead lastEmailAt metadata after sending', async () => {
      const lead = createMockLead({ id: VALID_LEAD_ID });
      setupDynamoDBWithLead(lead as unknown as Record<string, unknown>);

      const event = createMockApiEvent({
        body: JSON.stringify(createSendEmailRequest({ leadId: VALID_LEAD_ID })),
      });

      await handler(event);

      // UpdateCommand is the third DynamoDB call
      const updateCallArg = mockDynamoDBSend.mock.calls[2][0] as { input: Record<string, unknown> };
      const updateInput = updateCallArg.input;

      expect(updateInput).toMatchObject({
        TableName: 'test-tropico-leads',
        Key: {
          PK: `LEAD#${VALID_LEAD_ID}`,
          SK: `LEAD#${VALID_LEAD_ID}`,
        },
      });

      // lastEmailAt must be set — it is present in ExpressionAttributeValues
      const attributeValues = updateInput.ExpressionAttributeValues as Record<string, unknown>;
      const lastEmailAtValue = Object.values(attributeValues).find(
        (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value as string)
      );
      expect(lastEmailAtValue).toBeDefined();

      // Verify lastEmailAt is referenced somewhere in the UpdateExpression
      const updateExpression = updateInput.UpdateExpression as string;
      expect(updateExpression).toContain('lastEmailAt');
    });

    it('should extract operator from JWT claims and set it on the email record', async () => {
      const lead = createMockLead({ id: VALID_LEAD_ID });
      setupDynamoDBWithLead(lead as unknown as Record<string, unknown>);

      const event = createMockApiEvent({
        sub: OPERATOR_SUB,
        email: OPERATOR_EMAIL,
        body: JSON.stringify(createSendEmailRequest({ leadId: VALID_LEAD_ID })),
      });

      const result = await handler(event);
      const body = parseBody(result);

      // operator field must reflect the JWT claims email (or sub as fallback)
      expect(body.operator).toBeDefined();
      expect(
        body.operator === OPERATOR_EMAIL || body.operator === OPERATOR_SUB
      ).toBe(true);
    });

    it('should set direction to outbound, readAt to null, and s3Key to null', async () => {
      const lead = createMockLead({ id: VALID_LEAD_ID });
      setupDynamoDBWithLead(lead as unknown as Record<string, unknown>);

      const event = createMockApiEvent({
        body: JSON.stringify(createSendEmailRequest({ leadId: VALID_LEAD_ID })),
      });

      const result = await handler(event);
      const body = parseBody(result);

      expect(body.direction).toBe('outbound');
      expect(body.readAt).toBeNull();
      expect(body.s3Key).toBeNull();
    });

    it('should return SES messageId as the email record id', async () => {
      const lead = createMockLead({ id: VALID_LEAD_ID });
      setupDynamoDBWithLead(lead as unknown as Record<string, unknown>);

      // Override SES to return a specific MessageId
      mockSESSend.mockResolvedValueOnce({
        MessageId: 'deterministic-ses-message-id',
        $metadata: { httpStatusCode: 200 },
      });

      const event = createMockApiEvent({
        body: JSON.stringify(createSendEmailRequest({ leadId: VALID_LEAD_ID })),
      });

      const result = await handler(event);
      const body = parseBody(result);

      expect(body.id).toBe('deterministic-ses-message-id');
    });

    it('should set fromAddress to team@tropicoretreat.com on the email record', async () => {
      const lead = createMockLead({ id: VALID_LEAD_ID });
      setupDynamoDBWithLead(lead as unknown as Record<string, unknown>);

      const event = createMockApiEvent({
        body: JSON.stringify(createSendEmailRequest({ leadId: VALID_LEAD_ID })),
      });

      const result = await handler(event);
      const body = parseBody(result);

      expect(body.fromAddress).toBe('team@tropicoretreat.com');
    });

    it('should accept request without bodyHtml (optional field)', async () => {
      const lead = createMockLead({ id: VALID_LEAD_ID });
      setupDynamoDBWithLead(lead as unknown as Record<string, unknown>);

      const requestWithoutHtml = createSendEmailRequest({ leadId: VALID_LEAD_ID });
      // Explicitly ensure bodyHtml is absent
      delete (requestWithoutHtml as { bodyHtml?: string }).bodyHtml;

      const event = createMockApiEvent({ body: JSON.stringify(requestWithoutHtml) });
      const result = await handler(event);

      expect(statusCode(result)).toBe(201);

      const body = parseBody(result);
      // bodyHtml should be absent or undefined in the response — not a validation error
      expect(body.bodyHtml === undefined || body.bodyHtml === null).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Input Validation (Contract 1 — Zod schema boundaries)
  // -------------------------------------------------------------------------

  describe('input validation', () => {
    it('should return 400 when leadId is missing', async () => {
      const request = createSendEmailRequest();
      delete (request as { leadId?: string }).leadId;

      const event = createMockApiEvent({ body: JSON.stringify(request) });
      const result = await handler(event);

      expect(statusCode(result)).toBe(400);
      const body = parseBody(result);
      expect(body.error).toBeDefined();
    });

    it('should return 400 when leadId is empty string', async () => {
      const event = createMockApiEvent({
        body: JSON.stringify(createSendEmailRequest({ leadId: '' })),
      });
      const result = await handler(event);

      expect(statusCode(result)).toBe(400);
      const body = parseBody(result);
      expect(body.error).toBeDefined();
    });

    it('should return 400 when to is not a valid email address', async () => {
      const event = createMockApiEvent({
        body: JSON.stringify(createSendEmailRequest({ to: 'not-an-email' })),
      });
      const result = await handler(event);

      expect(statusCode(result)).toBe(400);
      const body = parseBody(result);
      expect(body.error).toBeDefined();
    });

    it('should return 400 when subject is empty string', async () => {
      const event = createMockApiEvent({
        body: JSON.stringify(createSendEmailRequest({ subject: '' })),
      });
      const result = await handler(event);

      expect(statusCode(result)).toBe(400);
      const body = parseBody(result);
      expect(body.error).toBeDefined();
    });

    it('should return 400 when bodyText is empty string', async () => {
      const event = createMockApiEvent({
        body: JSON.stringify(createSendEmailRequest({ bodyText: '' })),
      });
      const result = await handler(event);

      expect(statusCode(result)).toBe(400);
      const body = parseBody(result);
      expect(body.error).toBeDefined();
    });

    it('should return 400 when bodyText exceeds 100,000 characters', async () => {
      const oversizedBody = 'x'.repeat(100_001);
      const event = createMockApiEvent({
        body: JSON.stringify(createSendEmailRequest({ bodyText: oversizedBody })),
      });
      const result = await handler(event);

      expect(statusCode(result)).toBe(400);
      const body = parseBody(result);
      expect(body.error).toBeDefined();
    });

    it('should return 400 when request body is malformed JSON', async () => {
      const event = createMockApiEvent({ body: '{this is not valid json' });
      const result = await handler(event);

      expect(statusCode(result)).toBe(400);
      const body = parseBody(result);
      expect(body.error).toBeDefined();
    });

    it('should return 400 with Validation failed message on schema error', async () => {
      const event = createMockApiEvent({
        body: JSON.stringify(createSendEmailRequest({ to: 'bad' })),
      });
      const result = await handler(event);

      expect(statusCode(result)).toBe(400);
      const body = parseBody(result);
      expect(body.error).toBe('Validation failed');
    });
  });

  // -------------------------------------------------------------------------
  // Error Cases
  // -------------------------------------------------------------------------

  describe('error cases', () => {
    it('should return 404 when lead does not exist', async () => {
      setupDynamoDBLeadNotFound();

      const event = createMockApiEvent({
        body: JSON.stringify(createSendEmailRequest({ leadId: 'lead_nonexistent' })),
      });
      const result = await handler(event);

      expect(statusCode(result)).toBe(404);
      const body = parseBody(result);
      expect(body.error).toBe('Lead not found');
    });

    it('should return 500 when SES send fails', async () => {
      const lead = createMockLead({ id: VALID_LEAD_ID });
      // DynamoDB succeeds (lead found), but SES fails
      mockDynamoDBSend.mockResolvedValueOnce({
        Item: lead,
        $metadata: { httpStatusCode: 200 },
      });
      mockSESSend.mockRejectedValueOnce(new Error('SES service unavailable'));

      const event = createMockApiEvent({
        body: JSON.stringify(createSendEmailRequest({ leadId: VALID_LEAD_ID })),
      });
      const result = await handler(event);

      expect(statusCode(result)).toBe(500);
      const body = parseBody(result);
      expect(body.error).toBeDefined();
    });

    it('should return 500 when DynamoDB write fails after SES send', async () => {
      const lead = createMockLead({ id: VALID_LEAD_ID });

      // Call 1: GetCommand (getLead) — success
      mockDynamoDBSend.mockResolvedValueOnce({
        Item: lead,
        $metadata: { httpStatusCode: 200 },
      });
      // Call 2: PutCommand (putEmail) — failure
      mockDynamoDBSend.mockRejectedValueOnce(new Error('DynamoDB write throughput exceeded'));

      const event = createMockApiEvent({
        body: JSON.stringify(createSendEmailRequest({ leadId: VALID_LEAD_ID })),
      });
      const result = await handler(event);

      expect(statusCode(result)).toBe(500);
      const body = parseBody(result);
      expect(body.error).toBeDefined();
    });

    it('should return 500 when DynamoDB metadata update fails', async () => {
      const lead = createMockLead({ id: VALID_LEAD_ID });

      // Call 1: GetCommand (getLead) — success
      mockDynamoDBSend.mockResolvedValueOnce({
        Item: lead,
        $metadata: { httpStatusCode: 200 },
      });
      // Call 2: PutCommand (putEmail) — success
      mockDynamoDBSend.mockResolvedValueOnce({
        $metadata: { httpStatusCode: 200 },
      });
      // Call 3: UpdateCommand (updateLeadEmailMetadata) — failure
      mockDynamoDBSend.mockRejectedValueOnce(new Error('DynamoDB conditional check failed'));

      const event = createMockApiEvent({
        body: JSON.stringify(createSendEmailRequest({ leadId: VALID_LEAD_ID })),
      });
      const result = await handler(event);

      expect(statusCode(result)).toBe(500);
      const body = parseBody(result);
      expect(body.error).toBeDefined();
    });

    it('should return 405 for unsupported HTTP method on /emails/send', async () => {
      const event = createMockApiEvent({
        method: 'DELETE',
        path: '/emails/send',
        body: JSON.stringify(createSendEmailRequest()),
      });
      const result = await handler(event);

      expect(statusCode(result)).toBe(405);
      const body = parseBody(result);
      expect(body.error).toBeDefined();
    });

    it('should return 405 for GET on /emails/send', async () => {
      const event = createMockApiEvent({
        method: 'GET',
        path: '/emails/send',
        body: null,
      });
      const result = await handler(event);

      expect(statusCode(result)).toBe(405);
    });
  });

  // -------------------------------------------------------------------------
  // DynamoDB call ordering and parameter correctness
  // -------------------------------------------------------------------------

  describe('DynamoDB call ordering', () => {
    it('should call DynamoDB GetCommand before SES to verify lead exists', async () => {
      const lead = createMockLead({ id: VALID_LEAD_ID });
      setupDynamoDBWithLead(lead as unknown as Record<string, unknown>);

      const event = createMockApiEvent({
        body: JSON.stringify(createSendEmailRequest({ leadId: VALID_LEAD_ID })),
      });

      await handler(event);

      // DynamoDB must be called at least once (GetCommand first)
      expect(mockDynamoDBSend.mock.calls.length).toBeGreaterThanOrEqual(1);

      // SES must also have been called
      expect(mockSESSend).toHaveBeenCalledOnce();

      // GetCommand is first, SES is only called if lead exists
      // We verify this by checking that when lead is not found, SES is NOT called
    });

    it('should NOT call SES when lead is not found', async () => {
      setupDynamoDBLeadNotFound();

      const event = createMockApiEvent({
        body: JSON.stringify(createSendEmailRequest({ leadId: 'lead_ghost' })),
      });

      await handler(event);

      expect(mockSESSend).not.toHaveBeenCalled();
    });

    it('should call DynamoDB exactly 3 times for a successful send', async () => {
      const lead = createMockLead({ id: VALID_LEAD_ID });
      setupDynamoDBWithLead(lead as unknown as Record<string, unknown>);

      const event = createMockApiEvent({
        body: JSON.stringify(createSendEmailRequest({ leadId: VALID_LEAD_ID })),
      });

      await handler(event);

      // 1: GetCommand (getLead)
      // 2: PutCommand (putEmail)
      // 3: UpdateCommand (updateLeadEmailMetadata)
      expect(mockDynamoDBSend).toHaveBeenCalledTimes(3);
    });

    it('should write email to DynamoDB using TABLE_NAME from environment', async () => {
      const lead = createMockLead({ id: VALID_LEAD_ID });
      setupDynamoDBWithLead(lead as unknown as Record<string, unknown>);

      const event = createMockApiEvent({
        body: JSON.stringify(createSendEmailRequest({ leadId: VALID_LEAD_ID })),
      });

      await handler(event);

      // PutCommand (2nd DynamoDB call) must use the env TABLE_NAME
      const putCallArg = mockDynamoDBSend.mock.calls[1][0] as { input: Record<string, unknown> };
      expect(putCallArg.input.TableName).toBe('test-tropico-leads');
    });
  });

  // -------------------------------------------------------------------------
  // Response envelope shape (Contract 1 response schema)
  // -------------------------------------------------------------------------

  describe('response envelope shape', () => {
    it('should return all required fields defined in the email record contract', async () => {
      const lead = createMockLead({ id: VALID_LEAD_ID });
      setupDynamoDBWithLead(lead as unknown as Record<string, unknown>);

      const event = createMockApiEvent({
        body: JSON.stringify(
          createSendEmailRequest({
            leadId: VALID_LEAD_ID,
            to: 'guest@example.com',
            subject: 'Contract Verification',
            bodyText: 'Verifying all required fields are present.',
            bodyHtml: '<p>HTML variant.</p>',
          })
        ),
      });

      const result = await handler(event);
      const body = parseBody(result);

      // All required contract fields must be present
      const requiredFields = [
        'id',
        'leadId',
        'direction',
        'fromAddress',
        'toAddress',
        'subject',
        'bodyText',
        'attachments',
        'sentAt',
        'readAt',
        'operator',
        's3Key',
        'createdAt',
        'updatedAt',
      ];

      for (const field of requiredFields) {
        expect(body, `Field "${field}" must be present in the response`).toHaveProperty(field);
      }

      expect(Array.isArray(body.attachments)).toBe(true);
      expect((body.attachments as unknown[]).length).toBe(0);
    });

    it('should include bodyHtml in response when provided in request', async () => {
      const lead = createMockLead({ id: VALID_LEAD_ID });
      setupDynamoDBWithLead(lead as unknown as Record<string, unknown>);

      const event = createMockApiEvent({
        body: JSON.stringify(
          createSendEmailRequest({
            leadId: VALID_LEAD_ID,
            bodyHtml: '<p>HTML content</p>',
          })
        ),
      });

      const result = await handler(event);
      const body = parseBody(result);

      expect(body.bodyHtml).toBe('<p>HTML content</p>');
    });

    it('should return toAddress matching the request to field', async () => {
      const lead = createMockLead({ id: VALID_LEAD_ID });
      setupDynamoDBWithLead(lead as unknown as Record<string, unknown>);

      const event = createMockApiEvent({
        body: JSON.stringify(
          createSendEmailRequest({
            leadId: VALID_LEAD_ID,
            to: 'specific-recipient@domain.com',
          })
        ),
      });

      const result = await handler(event);
      const body = parseBody(result);

      expect(body.toAddress).toBe('specific-recipient@domain.com');
    });

    it('should return leadId matching the request leadId field', async () => {
      const lead = createMockLead({ id: VALID_LEAD_ID });
      setupDynamoDBWithLead(lead as unknown as Record<string, unknown>);

      const event = createMockApiEvent({
        body: JSON.stringify(createSendEmailRequest({ leadId: VALID_LEAD_ID })),
      });

      const result = await handler(event);
      const body = parseBody(result);

      expect(body.leadId).toBe(VALID_LEAD_ID);
    });
  });
});
