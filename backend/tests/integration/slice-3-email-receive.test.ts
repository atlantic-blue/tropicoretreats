/**
 * Integration tests for Slice 3: Inbound Email Processing
 *
 * Contract under test: emailReceive Lambda handler triggered by S3 events.
 *
 * These tests drive the emailReceive handler directly — no HTTP server, no API
 * Gateway. All AWS SDK boundaries and third-party parsers are mocked at the
 * module level.
 *
 * Tests will FAIL until backend/src/handlers/emailReceive.ts is implemented.
 * That is intentional: these tests ARE the specification.
 *
 * Handler flow under test:
 *   1. S3 GetObject — reads raw MIME email from the bucket/key in the S3Event
 *   2. mailparser simpleParser — parses MIME into structured fields
 *   3. DynamoDB ScanCommand — finds lead by sender email address
 *   4. DynamoDB PutCommand (conditional) — auto-creates lead when not found
 *   5. S3 PutObject (per attachment) — stores attachment files
 *   6. DynamoDB PutCommand — writes the inbound email record
 *   7. DynamoDB UpdateCommand — updates lead lastEmailAt + unreadEmailCount
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createMockLead,
  createMockS3Event,
  createRawMimeEmail,
} from '../fixtures/factories.js';
import {
  mockDynamoDBSend,
  mockS3Send,
  mockS3GetObject,
  mockS3PutObject,
  resetAllMocks,
  setupDynamoDBForInbound,
} from '../fixtures/mocks.js';

// ---------------------------------------------------------------------------
// Predictable ULID for assertions
// ---------------------------------------------------------------------------

const MOCK_ULID = '01HTESTULID0000000001';

// ---------------------------------------------------------------------------
// Parsed email shape returned by the mocked mailparser simpleParser.
// Tests override individual fields using mockResolvedValueOnce.
// ---------------------------------------------------------------------------

const DEFAULT_PARSED_EMAIL = {
  from: {
    value: [{ address: 'guest@example.com', name: 'Guest User' }],
    text: 'Guest User <guest@example.com>',
  },
  to: {
    value: [{ address: 'team@tropicoretreat.com', name: '' }],
    text: 'team@tropicoretreat.com',
  },
  subject: 'Interested in a retreat',
  text: 'Hello, I am interested in booking a corporate retreat for my team.',
  html: '<p>Hello, I am interested in booking a corporate retreat for my team.</p>',
  date: new Date('2026-01-15T10:00:00.000Z'),
  attachments: [],
};

// ---------------------------------------------------------------------------
// Module-level mocks — must be hoisted before any handler import
// ---------------------------------------------------------------------------

vi.mock('@aws-sdk/client-s3', () => {
  const S3Client = vi.fn().mockImplementation(() => ({
    send: mockS3Send,
  }));
  const GetObjectCommand = vi.fn().mockImplementation((input) => ({ input }));
  const PutObjectCommand = vi.fn().mockImplementation((input) => ({ input }));
  return { S3Client, GetObjectCommand, PutObjectCommand };
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
  const UpdateCommand = vi.fn().mockImplementation((input) => ({ input }));
  const ScanCommand = vi.fn().mockImplementation((input) => ({ input }));
  return { DynamoDBDocumentClient, PutCommand, UpdateCommand, ScanCommand };
});

vi.mock('mailparser', () => {
  const simpleParser = vi.fn().mockResolvedValue(DEFAULT_PARSED_EMAIL);
  return { simpleParser };
});

vi.mock('ulidx', () => {
  const ulid = vi.fn().mockReturnValue(MOCK_ULID);
  return { ulid };
});

// ---------------------------------------------------------------------------
// Import handler AFTER mocks are registered.
// This will fail until src/handlers/emailReceive.ts is implemented.
// That failure is the expected state before the implementation slice runs.
// ---------------------------------------------------------------------------

const { handler } = await import('../../src/handlers/emailReceive.js');

// ---------------------------------------------------------------------------
// Test constants
// ---------------------------------------------------------------------------

const VALID_LEAD_ID = 'lead_01HTEST123456789ABCDE';
const EMAIL_BUCKET = 'tropicoretreat-email-store-test';
const TABLE_NAME = 'test-tropico-leads';
const CRM_FROM_ADDRESS = 'team@tropicoretreat.com';
const INBOUND_S3_KEY = 'incoming/test-message-id';

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('emailReceive S3 Lambda handler', () => {
  beforeEach(() => {
    resetAllMocks();
    vi.resetModules();
  });

  // -------------------------------------------------------------------------
  // Happy path: existing lead
  // -------------------------------------------------------------------------

  describe('happy path — existing lead', () => {
    it('should process S3 event without throwing when an existing lead is found', async () => {
      const lead = createMockLead({ id: VALID_LEAD_ID, email: 'guest@example.com' });
      setupDynamoDBForInbound({ leadItem: lead as unknown as Record<string, unknown> });
      mockS3GetObject(createRawMimeEmail());

      const event = createMockS3Event({ bucketName: EMAIL_BUCKET, objectKey: INBOUND_S3_KEY });

      await expect(handler(event)).resolves.toBeUndefined();
    });

    it('should call S3 GetObject with the bucket and key from the S3 event record', async () => {
      const lead = createMockLead({ id: VALID_LEAD_ID, email: 'guest@example.com' });
      setupDynamoDBForInbound({ leadItem: lead as unknown as Record<string, unknown> });
      mockS3GetObject(createRawMimeEmail());

      const event = createMockS3Event({ bucketName: EMAIL_BUCKET, objectKey: INBOUND_S3_KEY });
      await handler(event);

      expect(mockS3Send).toHaveBeenCalled();
      const firstCall = mockS3Send.mock.calls[0][0] as { input: Record<string, unknown> };
      expect(firstCall.input).toMatchObject({
        Bucket: EMAIL_BUCKET,
        Key: INBOUND_S3_KEY,
      });
    });

    it('should call DynamoDB Scan to find lead by sender email address', async () => {
      const lead = createMockLead({ id: VALID_LEAD_ID, email: 'guest@example.com' });
      setupDynamoDBForInbound({ leadItem: lead as unknown as Record<string, unknown> });
      mockS3GetObject(createRawMimeEmail({ from: 'Guest User <guest@example.com>' }));

      const event = createMockS3Event();
      await handler(event);

      const scanCall = mockDynamoDBSend.mock.calls[0][0] as { input: Record<string, unknown> };
      const expressionValues = scanCall.input.ExpressionAttributeValues as Record<string, unknown>;

      // The Scan filter must include the normalized sender email
      const emailValue = Object.values(expressionValues).find(
        (value) => value === 'guest@example.com'
      );
      expect(emailValue).toBeDefined();
    });

    it('should normalize sender email to lowercase when scanning for lead', async () => {
      const { simpleParser } = await import('mailparser');
      (simpleParser as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ...DEFAULT_PARSED_EMAIL,
        from: {
          value: [{ address: 'GUEST@EXAMPLE.COM', name: 'Guest User' }],
          text: 'Guest User <GUEST@EXAMPLE.COM>',
        },
      });

      const lead = createMockLead({ id: VALID_LEAD_ID, email: 'guest@example.com' });
      setupDynamoDBForInbound({ leadItem: lead as unknown as Record<string, unknown> });
      mockS3GetObject(createRawMimeEmail());

      const event = createMockS3Event();
      await handler(event);

      const scanCall = mockDynamoDBSend.mock.calls[0][0] as { input: Record<string, unknown> };
      const expressionValues = scanCall.input.ExpressionAttributeValues as Record<string, unknown>;

      // Must have normalized to lowercase
      const lowercaseEmailValue = Object.values(expressionValues).find(
        (value) => value === 'guest@example.com'
      );
      expect(lowercaseEmailValue).toBeDefined();

      // Must NOT contain the uppercase original
      const uppercaseEmailValue = Object.values(expressionValues).find(
        (value) => value === 'GUEST@EXAMPLE.COM'
      );
      expect(uppercaseEmailValue).toBeUndefined();
    });

    it('should write an inbound email record to DynamoDB with direction=inbound, readAt=null, operator=null', async () => {
      const lead = createMockLead({ id: VALID_LEAD_ID, email: 'guest@example.com' });
      setupDynamoDBForInbound({ leadItem: lead as unknown as Record<string, unknown> });
      mockS3GetObject(createRawMimeEmail());

      const event = createMockS3Event();
      await handler(event);

      // With an existing lead: calls are Scan → PutEmail → UpdateMetadata
      const putEmailCall = mockDynamoDBSend.mock.calls[1][0] as {
        input: Record<string, unknown>;
      };
      const item = putEmailCall.input.Item as Record<string, unknown>;

      expect(item).toMatchObject({
        PK: `LEAD#${VALID_LEAD_ID}`,
        direction: 'inbound',
        readAt: null,
        operator: null,
      });
    });

    it('should set the email record PK to LEAD#{leadId}', async () => {
      const lead = createMockLead({ id: VALID_LEAD_ID, email: 'guest@example.com' });
      setupDynamoDBForInbound({ leadItem: lead as unknown as Record<string, unknown> });
      mockS3GetObject(createRawMimeEmail());

      const event = createMockS3Event();
      await handler(event);

      const putEmailCall = mockDynamoDBSend.mock.calls[1][0] as {
        input: Record<string, unknown>;
      };
      const item = putEmailCall.input.Item as Record<string, unknown>;
      expect(item.PK).toBe(`LEAD#${VALID_LEAD_ID}`);
    });

    it('should set the email record SK starting with EMAIL#', async () => {
      const lead = createMockLead({ id: VALID_LEAD_ID, email: 'guest@example.com' });
      setupDynamoDBForInbound({ leadItem: lead as unknown as Record<string, unknown> });
      mockS3GetObject(createRawMimeEmail());

      const event = createMockS3Event();
      await handler(event);

      const putEmailCall = mockDynamoDBSend.mock.calls[1][0] as {
        input: Record<string, unknown>;
      };
      const item = putEmailCall.input.Item as Record<string, unknown>;
      expect(typeof item.SK).toBe('string');
      expect(item.SK as string).toMatch(/^EMAIL#/);
    });

    it('should update lead metadata with lastEmailAt and incrementUnreadCount after writing email', async () => {
      const lead = createMockLead({ id: VALID_LEAD_ID, email: 'guest@example.com' });
      setupDynamoDBForInbound({ leadItem: lead as unknown as Record<string, unknown> });
      mockS3GetObject(createRawMimeEmail());

      const event = createMockS3Event();
      await handler(event);

      // UpdateCommand is the 3rd DynamoDB call (Scan → Put email → Update)
      const updateCall = mockDynamoDBSend.mock.calls[2][0] as {
        input: Record<string, unknown>;
      };
      const updateInput = updateCall.input;

      expect(updateInput).toMatchObject({
        TableName: TABLE_NAME,
        Key: {
          PK: `LEAD#${VALID_LEAD_ID}`,
          SK: `LEAD#${VALID_LEAD_ID}`,
        },
      });

      const updateExpression = updateInput.UpdateExpression as string;
      expect(updateExpression).toContain('lastEmailAt');

      // Must reference unread count increment somewhere in the expression or attribute names
      const expressionAttributeNames = updateInput.ExpressionAttributeNames as Record<string, unknown> ?? {};
      const expressionValues = updateInput.ExpressionAttributeValues as Record<string, unknown>;
      const hasUnreadIncrement =
        updateExpression.toLowerCase().includes('unread') ||
        Object.values(expressionAttributeNames).some(
          (alias) => alias === 'unreadEmailCount'
        ) ||
        Object.values(expressionValues).some((value) => value === 1);
      expect(hasUnreadIncrement).toBe(true);
    });

    it('should call DynamoDB exactly 3 times for a successful inbound with existing lead', async () => {
      const lead = createMockLead({ id: VALID_LEAD_ID, email: 'guest@example.com' });
      setupDynamoDBForInbound({ leadItem: lead as unknown as Record<string, unknown> });
      mockS3GetObject(createRawMimeEmail());

      const event = createMockS3Event();
      await handler(event);

      // 1: ScanCommand (findLeadByEmail)
      // 2: PutCommand (putEmail)
      // 3: UpdateCommand (updateLeadEmailMetadata)
      expect(mockDynamoDBSend).toHaveBeenCalledTimes(3);
    });
  });

  // -------------------------------------------------------------------------
  // Auto-create lead (sender not found)
  // -------------------------------------------------------------------------

  describe('auto-create lead — sender not found', () => {
    it('should create a new lead when no existing lead matches the sender email', async () => {
      const { simpleParser } = await import('mailparser');
      (simpleParser as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ...DEFAULT_PARSED_EMAIL,
        from: {
          value: [{ address: 'newperson@domain.com', name: 'New Person' }],
          text: 'New Person <newperson@domain.com>',
        },
      });

      setupDynamoDBForInbound({ autoCreateLead: true });
      mockS3GetObject(createRawMimeEmail({ from: 'New Person <newperson@domain.com>' }));

      const event = createMockS3Event();
      await expect(handler(event)).resolves.toBeUndefined();

      // Second DynamoDB call must be PutCommand for the new lead
      const putLeadCall = mockDynamoDBSend.mock.calls[1][0] as {
        input: Record<string, unknown>;
      };
      const newLead = putLeadCall.input.Item as Record<string, unknown>;
      expect(newLead).toBeDefined();
    });

    it('should set new lead status to NEW and temperature to WARM', async () => {
      const { simpleParser } = await import('mailparser');
      (simpleParser as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ...DEFAULT_PARSED_EMAIL,
        from: {
          value: [{ address: 'newperson@domain.com', name: 'New Person' }],
          text: 'New Person <newperson@domain.com>',
        },
      });

      setupDynamoDBForInbound({ autoCreateLead: true });
      mockS3GetObject(createRawMimeEmail());

      const event = createMockS3Event();
      await handler(event);

      const putLeadCall = mockDynamoDBSend.mock.calls[1][0] as {
        input: Record<string, unknown>;
      };
      const newLead = putLeadCall.input.Item as Record<string, unknown>;
      expect(newLead.status).toBe('NEW');
      expect(newLead.temperature).toBe('WARM');
    });

    it('should set new lead firstName to first word of sender display name', async () => {
      const { simpleParser } = await import('mailparser');
      (simpleParser as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ...DEFAULT_PARSED_EMAIL,
        from: {
          value: [{ address: 'maria@company.com', name: 'Maria Garcia Lopez' }],
          text: 'Maria Garcia Lopez <maria@company.com>',
        },
      });

      setupDynamoDBForInbound({ autoCreateLead: true });
      mockS3GetObject(createRawMimeEmail());

      const event = createMockS3Event();
      await handler(event);

      const putLeadCall = mockDynamoDBSend.mock.calls[1][0] as {
        input: Record<string, unknown>;
      };
      const newLead = putLeadCall.input.Item as Record<string, unknown>;
      expect(newLead.firstName).toBe('Maria');
    });

    it('should set new lead firstName to Unknown when sender has no display name', async () => {
      const { simpleParser } = await import('mailparser');
      (simpleParser as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ...DEFAULT_PARSED_EMAIL,
        from: {
          value: [{ address: 'noreply@domain.com', name: '' }],
          text: 'noreply@domain.com',
        },
      });

      setupDynamoDBForInbound({ autoCreateLead: true });
      mockS3GetObject(createRawMimeEmail());

      const event = createMockS3Event();
      await handler(event);

      const putLeadCall = mockDynamoDBSend.mock.calls[1][0] as {
        input: Record<string, unknown>;
      };
      const newLead = putLeadCall.input.Item as Record<string, unknown>;
      expect(newLead.firstName).toBe('Unknown');
    });

    it('should set new lead email to normalized lowercase sender address', async () => {
      const { simpleParser } = await import('mailparser');
      (simpleParser as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ...DEFAULT_PARSED_EMAIL,
        from: {
          value: [{ address: 'MixedCase@Domain.COM', name: 'Test' }],
          text: 'Test <MixedCase@Domain.COM>',
        },
      });

      setupDynamoDBForInbound({ autoCreateLead: true });
      mockS3GetObject(createRawMimeEmail());

      const event = createMockS3Event();
      await handler(event);

      const putLeadCall = mockDynamoDBSend.mock.calls[1][0] as {
        input: Record<string, unknown>;
      };
      const newLead = putLeadCall.input.Item as Record<string, unknown>;
      expect(newLead.email).toBe('mixedcase@domain.com');
    });

    it('should set new lead message to first 5000 chars of email body', async () => {
      const longBody = 'A'.repeat(10_000);
      const { simpleParser } = await import('mailparser');
      (simpleParser as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ...DEFAULT_PARSED_EMAIL,
        from: {
          value: [{ address: 'newperson@domain.com', name: 'New Person' }],
          text: 'New Person <newperson@domain.com>',
        },
        text: longBody,
      });

      setupDynamoDBForInbound({ autoCreateLead: true });
      mockS3GetObject(createRawMimeEmail());

      const event = createMockS3Event();
      await handler(event);

      const putLeadCall = mockDynamoDBSend.mock.calls[1][0] as {
        input: Record<string, unknown>;
      };
      const newLead = putLeadCall.input.Item as Record<string, unknown>;
      expect(typeof newLead.message).toBe('string');
      expect((newLead.message as string).length).toBeLessThanOrEqual(5000);
    });

    it('should link the email record to the newly created lead id', async () => {
      const { simpleParser } = await import('mailparser');
      (simpleParser as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ...DEFAULT_PARSED_EMAIL,
        from: {
          value: [{ address: 'newperson@domain.com', name: 'New Person' }],
          text: 'New Person <newperson@domain.com>',
        },
      });

      setupDynamoDBForInbound({ autoCreateLead: true });
      mockS3GetObject(createRawMimeEmail());

      const event = createMockS3Event();
      await handler(event);

      // Call order: Scan → PutLead → PutEmail → Update
      const putLeadCall = mockDynamoDBSend.mock.calls[1][0] as { input: Record<string, unknown> };
      const newLead = putLeadCall.input.Item as Record<string, unknown>;
      const newLeadId = newLead.id as string;

      const putEmailCall = mockDynamoDBSend.mock.calls[2][0] as { input: Record<string, unknown> };
      const emailItem = putEmailCall.input.Item as Record<string, unknown>;

      expect(emailItem.PK).toBe(`LEAD#${newLeadId}`);
      expect(emailItem.leadId).toBe(newLeadId);
    });
  });

  // -------------------------------------------------------------------------
  // Email parsing
  // -------------------------------------------------------------------------

  describe('email parsing', () => {
    it('should extract sender email address normalized to lowercase and write to email record', async () => {
      const { simpleParser } = await import('mailparser');
      (simpleParser as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ...DEFAULT_PARSED_EMAIL,
        from: {
          value: [{ address: 'Guest@Example.COM', name: 'Guest User' }],
          text: 'Guest User <Guest@Example.COM>',
        },
      });

      const lead = createMockLead({ id: VALID_LEAD_ID, email: 'guest@example.com' });
      setupDynamoDBForInbound({ leadItem: lead as unknown as Record<string, unknown> });
      mockS3GetObject(createRawMimeEmail());

      const event = createMockS3Event();
      await handler(event);

      const putEmailCall = mockDynamoDBSend.mock.calls[1][0] as { input: Record<string, unknown> };
      const emailItem = putEmailCall.input.Item as Record<string, unknown>;
      expect(emailItem.fromAddress).toBe('guest@example.com');
    });

    it('should extract subject line from parsed email and write it to the email record', async () => {
      const { simpleParser } = await import('mailparser');
      (simpleParser as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ...DEFAULT_PARSED_EMAIL,
        subject: 'My Custom Subject Line',
      });

      const lead = createMockLead({ id: VALID_LEAD_ID, email: 'guest@example.com' });
      setupDynamoDBForInbound({ leadItem: lead as unknown as Record<string, unknown> });
      mockS3GetObject(createRawMimeEmail({ subject: 'My Custom Subject Line' }));

      const event = createMockS3Event();
      await handler(event);

      const putEmailCall = mockDynamoDBSend.mock.calls[1][0] as { input: Record<string, unknown> };
      const emailItem = putEmailCall.input.Item as Record<string, unknown>;
      expect(emailItem.subject).toBe('My Custom Subject Line');
    });

    it('should write the plain text body to the email record', async () => {
      const { simpleParser } = await import('mailparser');
      (simpleParser as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ...DEFAULT_PARSED_EMAIL,
        text: 'Plain text body content here.',
      });

      const lead = createMockLead({ id: VALID_LEAD_ID, email: 'guest@example.com' });
      setupDynamoDBForInbound({ leadItem: lead as unknown as Record<string, unknown> });
      mockS3GetObject(createRawMimeEmail({ bodyText: 'Plain text body content here.' }));

      const event = createMockS3Event();
      await handler(event);

      const putEmailCall = mockDynamoDBSend.mock.calls[1][0] as { input: Record<string, unknown> };
      const emailItem = putEmailCall.input.Item as Record<string, unknown>;
      expect(emailItem.bodyText).toBe('Plain text body content here.');
    });

    it('should leave bodyHtml undefined when parsed email has no HTML part', async () => {
      const { simpleParser } = await import('mailparser');
      (simpleParser as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ...DEFAULT_PARSED_EMAIL,
        html: undefined,
      });

      const lead = createMockLead({ id: VALID_LEAD_ID, email: 'guest@example.com' });
      setupDynamoDBForInbound({ leadItem: lead as unknown as Record<string, unknown> });
      mockS3GetObject(createRawMimeEmail());

      const event = createMockS3Event();
      await handler(event);

      const putEmailCall = mockDynamoDBSend.mock.calls[1][0] as { input: Record<string, unknown> };
      const emailItem = putEmailCall.input.Item as Record<string, unknown>;
      expect(emailItem.bodyHtml === undefined || emailItem.bodyHtml === null).toBe(true);
    });

    it('should truncate bodyText at 100,000 characters', async () => {
      const { simpleParser } = await import('mailparser');
      (simpleParser as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ...DEFAULT_PARSED_EMAIL,
        text: 'B'.repeat(200_000),
      });

      const lead = createMockLead({ id: VALID_LEAD_ID, email: 'guest@example.com' });
      setupDynamoDBForInbound({ leadItem: lead as unknown as Record<string, unknown> });
      mockS3GetObject(createRawMimeEmail());

      const event = createMockS3Event();
      await handler(event);

      const putEmailCall = mockDynamoDBSend.mock.calls[1][0] as { input: Record<string, unknown> };
      const emailItem = putEmailCall.input.Item as Record<string, unknown>;
      expect((emailItem.bodyText as string).length).toBeLessThanOrEqual(100_000);
    });

    it('should generate a ULID for the message ID rather than using the From header Message-ID', async () => {
      const { simpleParser } = await import('mailparser');
      (simpleParser as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ...DEFAULT_PARSED_EMAIL,
        messageId: '<should-not-be-used@mail.example.com>',
      });

      const lead = createMockLead({ id: VALID_LEAD_ID, email: 'guest@example.com' });
      setupDynamoDBForInbound({ leadItem: lead as unknown as Record<string, unknown> });
      mockS3GetObject(createRawMimeEmail({ messageId: '<should-not-be-used@mail.example.com>' }));

      const event = createMockS3Event();
      await handler(event);

      const putEmailCall = mockDynamoDBSend.mock.calls[1][0] as { input: Record<string, unknown> };
      const emailItem = putEmailCall.input.Item as Record<string, unknown>;

      // The id must be the ULID from our mock, not the header Message-ID
      expect(emailItem.id).toBe(MOCK_ULID);
    });
  });

  // -------------------------------------------------------------------------
  // Attachment handling
  // -------------------------------------------------------------------------

  describe('attachment handling', () => {
    it('should store each attachment to S3 under attachments/{leadId}/{messageId}/{filename}', async () => {
      const { simpleParser } = await import('mailparser');
      (simpleParser as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ...DEFAULT_PARSED_EMAIL,
        attachments: [
          {
            filename: 'document.pdf',
            content: Buffer.from('fake-pdf-content'),
            contentType: 'application/pdf',
            size: 16,
          },
        ],
      });

      const lead = createMockLead({ id: VALID_LEAD_ID, email: 'guest@example.com' });
      setupDynamoDBForInbound({ leadItem: lead as unknown as Record<string, unknown> });
      mockS3GetObject(createRawMimeEmail({ includeAttachment: true }));
      mockS3PutObject();

      const event = createMockS3Event();
      await handler(event);

      // Second S3 call is the PutObject for the attachment (first was GetObject)
      const putObjectCall = mockS3Send.mock.calls[1][0] as { input: Record<string, unknown> };
      const s3Key = putObjectCall.input.Key as string;

      expect(s3Key).toMatch(
        new RegExp(`^attachments/${VALID_LEAD_ID}/${MOCK_ULID}/document\\.pdf$`)
      );
    });

    it('should sanitize attachment filenames by replacing special characters with underscores', async () => {
      const { simpleParser } = await import('mailparser');
      (simpleParser as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ...DEFAULT_PARSED_EMAIL,
        attachments: [
          {
            filename: 'my file (v2)!.pdf',
            content: Buffer.from('content'),
            contentType: 'application/pdf',
            size: 7,
          },
        ],
      });

      const lead = createMockLead({ id: VALID_LEAD_ID, email: 'guest@example.com' });
      setupDynamoDBForInbound({ leadItem: lead as unknown as Record<string, unknown> });
      mockS3GetObject(createRawMimeEmail({ includeAttachment: true, attachmentFilename: 'my file (v2)!.pdf' }));
      mockS3PutObject();

      const event = createMockS3Event();
      await handler(event);

      const putObjectCall = mockS3Send.mock.calls[1][0] as { input: Record<string, unknown> };
      const s3Key = putObjectCall.input.Key as string;
      const filename = s3Key.split('/').pop() as string;

      // After sanitization the filename must only contain safe characters
      expect(filename).toMatch(/^[a-zA-Z0-9._-]+$/);
      expect(filename).not.toContain(' ');
      expect(filename).not.toContain('(');
      expect(filename).not.toContain('!');
    });

    it('should include attachment metadata in the email record written to DynamoDB', async () => {
      const { simpleParser } = await import('mailparser');
      (simpleParser as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ...DEFAULT_PARSED_EMAIL,
        attachments: [
          {
            filename: 'report.pdf',
            content: Buffer.from('pdf-content'),
            contentType: 'application/pdf',
            size: 11,
          },
        ],
      });

      const lead = createMockLead({ id: VALID_LEAD_ID, email: 'guest@example.com' });
      setupDynamoDBForInbound({ leadItem: lead as unknown as Record<string, unknown> });
      mockS3GetObject(createRawMimeEmail({ includeAttachment: true }));
      mockS3PutObject();

      const event = createMockS3Event();
      await handler(event);

      const putEmailCall = mockDynamoDBSend.mock.calls[1][0] as { input: Record<string, unknown> };
      const emailItem = putEmailCall.input.Item as Record<string, unknown>;
      const attachments = emailItem.attachments as unknown[];

      expect(Array.isArray(attachments)).toBe(true);
      expect(attachments.length).toBe(1);

      const attachment = attachments[0] as Record<string, unknown>;
      expect(attachment).toMatchObject({
        filename: 'report.pdf',
        contentType: 'application/pdf',
        size: 11,
      });
      expect(typeof attachment.s3Key).toBe('string');
    });

    it('should continue processing email if S3 attachment upload fails (non-blocking)', async () => {
      const { simpleParser } = await import('mailparser');
      (simpleParser as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ...DEFAULT_PARSED_EMAIL,
        attachments: [
          {
            filename: 'broken.pdf',
            content: Buffer.from('content'),
            contentType: 'application/pdf',
            size: 7,
          },
        ],
      });

      const lead = createMockLead({ id: VALID_LEAD_ID, email: 'guest@example.com' });
      setupDynamoDBForInbound({ leadItem: lead as unknown as Record<string, unknown> });

      // GetObject succeeds, then PutObject (attachment upload) fails
      mockS3GetObject(createRawMimeEmail({ includeAttachment: true }));
      mockS3Send.mockRejectedValueOnce(new Error('S3 PutObject: AccessDenied'));

      const event = createMockS3Event();

      // Handler must NOT throw — attachment failure is non-blocking
      await expect(handler(event)).resolves.toBeUndefined();

      // Email record must still be written to DynamoDB despite attachment failure
      const putEmailCall = mockDynamoDBSend.mock.calls[1][0] as { input: Record<string, unknown> };
      expect(putEmailCall.input.Item).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // Loop prevention (ADR-015)
  // -------------------------------------------------------------------------

  describe('loop prevention', () => {
    it('should skip processing when sender matches FROM_EMAIL_CRM bare address', async () => {
      const { simpleParser } = await import('mailparser');
      (simpleParser as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ...DEFAULT_PARSED_EMAIL,
        from: {
          value: [{ address: CRM_FROM_ADDRESS, name: 'Tropico Retreats' }],
          text: `Tropico Retreats <${CRM_FROM_ADDRESS}>`,
        },
      });

      mockS3GetObject(createRawMimeEmail({ from: `Tropico Retreats <${CRM_FROM_ADDRESS}>` }));

      const event = createMockS3Event();
      await handler(event);

      // DynamoDB must NOT be called at all — loop detected, skip entirely
      expect(mockDynamoDBSend).not.toHaveBeenCalled();
    });

    it('should not write any DynamoDB records for looped emails', async () => {
      const { simpleParser } = await import('mailparser');
      (simpleParser as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ...DEFAULT_PARSED_EMAIL,
        from: {
          value: [{ address: CRM_FROM_ADDRESS, name: 'CRM' }],
          text: `CRM <${CRM_FROM_ADDRESS}>`,
        },
      });

      mockS3GetObject(createRawMimeEmail({ from: `CRM <${CRM_FROM_ADDRESS}>` }));

      const event = createMockS3Event();
      await handler(event);

      expect(mockDynamoDBSend).not.toHaveBeenCalled();
    });

    it('should not throw an error when a loop is detected and returns silently', async () => {
      const { simpleParser } = await import('mailparser');
      (simpleParser as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ...DEFAULT_PARSED_EMAIL,
        from: {
          value: [{ address: CRM_FROM_ADDRESS, name: 'Tropico Retreats' }],
          text: `Tropico Retreats <${CRM_FROM_ADDRESS}>`,
        },
      });

      mockS3GetObject(createRawMimeEmail({ from: `Tropico Retreats <${CRM_FROM_ADDRESS}>` }));

      const event = createMockS3Event();

      // Must resolve (not reject) — no error thrown for loop prevention
      await expect(handler(event)).resolves.toBeUndefined();
    });

    it('should detect loop using the bare address extracted from the FROM_EMAIL_CRM env var', async () => {
      // FROM_EMAIL_CRM is set to 'Tropico Retreats <team@tropicoretreat.com>'
      // The handler must extract 'team@tropicoretreat.com' and compare against it
      const { simpleParser } = await import('mailparser');
      (simpleParser as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ...DEFAULT_PARSED_EMAIL,
        from: {
          // Exact bare address that should trigger loop prevention
          value: [{ address: 'team@tropicoretreat.com', name: '' }],
          text: 'team@tropicoretreat.com',
        },
      });

      mockS3GetObject(createRawMimeEmail({ from: 'team@tropicoretreat.com' }));

      const event = createMockS3Event();
      await handler(event);

      expect(mockDynamoDBSend).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Error handling
  // -------------------------------------------------------------------------

  describe('error handling', () => {
    it('should throw when S3 GetObject fails so Lambda retries the event', async () => {
      mockS3Send.mockRejectedValueOnce(new Error('S3 GetObject: NoSuchKey'));

      const event = createMockS3Event();

      await expect(handler(event)).rejects.toThrow();
    });

    it('should throw when mailparser completely fails to parse the MIME email', async () => {
      const { simpleParser } = await import('mailparser');
      (simpleParser as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('MIME parse error: corrupted content')
      );

      mockS3GetObject(createRawMimeEmail());

      const event = createMockS3Event();

      await expect(handler(event)).rejects.toThrow();
    });

    it('should throw when DynamoDB putEmail fails so Lambda retries the event', async () => {
      const lead = createMockLead({ id: VALID_LEAD_ID, email: 'guest@example.com' });

      // Call 1: Scan — lead found
      mockDynamoDBSend.mockResolvedValueOnce({
        Items: [lead],
        Count: 1,
        $metadata: { httpStatusCode: 200 },
      });
      // Call 2: PutCommand (putEmail) — failure
      mockDynamoDBSend.mockRejectedValueOnce(new Error('DynamoDB write throughput exceeded'));

      mockS3GetObject(createRawMimeEmail());

      const event = createMockS3Event();

      await expect(handler(event)).rejects.toThrow();
    });

    it('should NOT throw when DynamoDB metadata update fails — logs error and continues', async () => {
      const lead = createMockLead({ id: VALID_LEAD_ID, email: 'guest@example.com' });

      // Call 1: Scan — lead found
      mockDynamoDBSend.mockResolvedValueOnce({
        Items: [lead],
        Count: 1,
        $metadata: { httpStatusCode: 200 },
      });
      // Call 2: PutCommand (putEmail) — success
      mockDynamoDBSend.mockResolvedValueOnce({
        $metadata: { httpStatusCode: 200 },
      });
      // Call 3: UpdateCommand (updateLeadEmailMetadata) — failure
      mockDynamoDBSend.mockRejectedValueOnce(new Error('DynamoDB conditional check failed'));

      mockS3GetObject(createRawMimeEmail());

      const event = createMockS3Event();

      // Must resolve (not reject) — metadata update failure is non-blocking
      await expect(handler(event)).resolves.toBeUndefined();
    });

    it('should throw when DynamoDB Scan for findLeadByEmail fails', async () => {
      mockDynamoDBSend.mockRejectedValueOnce(
        new Error('DynamoDB provisioned throughput exceeded')
      );

      mockS3GetObject(createRawMimeEmail());

      const event = createMockS3Event();

      await expect(handler(event)).rejects.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // Environment variables
  // -------------------------------------------------------------------------

  describe('environment variables', () => {
    it('should use EMAIL_BUCKET env var for reading the raw email from S3', async () => {
      const lead = createMockLead({ id: VALID_LEAD_ID, email: 'guest@example.com' });
      setupDynamoDBForInbound({ leadItem: lead as unknown as Record<string, unknown> });
      mockS3GetObject(createRawMimeEmail());

      const event = createMockS3Event({ bucketName: EMAIL_BUCKET });
      await handler(event);

      const getObjectCall = mockS3Send.mock.calls[0][0] as { input: Record<string, unknown> };
      expect(getObjectCall.input.Bucket).toBe(EMAIL_BUCKET);
    });

    it('should use TABLE_NAME env var when writing the email record to DynamoDB', async () => {
      const lead = createMockLead({ id: VALID_LEAD_ID, email: 'guest@example.com' });
      setupDynamoDBForInbound({ leadItem: lead as unknown as Record<string, unknown> });
      mockS3GetObject(createRawMimeEmail());

      const event = createMockS3Event();
      await handler(event);

      const putEmailCall = mockDynamoDBSend.mock.calls[1][0] as { input: Record<string, unknown> };
      expect(putEmailCall.input.TableName).toBe(TABLE_NAME);
    });

    it('should use TABLE_NAME env var when scanning for lead by email address', async () => {
      const lead = createMockLead({ id: VALID_LEAD_ID, email: 'guest@example.com' });
      setupDynamoDBForInbound({ leadItem: lead as unknown as Record<string, unknown> });
      mockS3GetObject(createRawMimeEmail());

      const event = createMockS3Event();
      await handler(event);

      const scanCall = mockDynamoDBSend.mock.calls[0][0] as { input: Record<string, unknown> };
      expect(scanCall.input.TableName).toBe(TABLE_NAME);
    });
  });
});
