/**
 * Integration tests for Slice 5: Backup Forwarding + Hardening
 *
 * Contract under test: Boundary 8 — emailReceive Lambda → SES backup forward.
 *
 * These tests extend the emailReceive handler (same handler as Slice 3).
 * After Slice 5 is implemented the handler gains a Step 9: send a backup
 * forward email via SES after all existing steps succeed.
 *
 * The backup forward is intentionally non-critical:
 *   - SES failure must NOT propagate — handler resolves normally.
 *   - When BACKUP_FORWARD_EMAIL is absent the SES call is skipped entirely.
 *
 * Tests will FAIL until backend/src/handlers/emailReceive.ts is updated with
 * the backup-forward logic described in Slice 5. That failure is intentional:
 * these tests ARE the specification.
 *
 * Handler flow under test (full 9-step flow):
 *   1. S3 GetObject — reads raw MIME email
 *   2. mailparser simpleParser — parses MIME into structured fields
 *   3. Loop prevention — skip if sender matches CRM address
 *   4. DynamoDB ScanCommand — finds lead by sender email
 *   5. DynamoDB PutCommand (conditional) — auto-creates lead if not found
 *   6. S3 PutObject (per attachment) — stores attachment files
 *   7. DynamoDB PutCommand — writes the inbound email record
 *   8. DynamoDB UpdateCommand — updates lead lastEmailAt + unreadEmailCount (non-blocking)
 *   9. NEW: SES SendEmailCommand — sends backup forward to BACKUP_FORWARD_EMAIL (non-blocking)
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createMockLead,
  createMockS3Event,
  createRawMimeEmail,
} from '../fixtures/factories.js';
import {
  mockDynamoDBSend,
  mockS3Send,
  mockSESSend,
  mockS3GetObject,
  resetAllMocks,
  setupDynamoDBForInbound,
} from '../fixtures/mocks.js';

// ---------------------------------------------------------------------------
// Predictable ULID — mirrors slice-3 to keep IDs deterministic
// ---------------------------------------------------------------------------

const MOCK_ULID = '01HTESTULID0000000001';

// ---------------------------------------------------------------------------
// Parsed email shape returned by the mocked mailparser simpleParser.
// Tests override individual fields via mockResolvedValueOnce.
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
// Module-level mocks — must be hoisted before any handler import.
// SES is added here because Slice 5 adds an SES client to emailReceive.
// ---------------------------------------------------------------------------

vi.mock('@aws-sdk/client-ses', () => {
  const SendEmailCommand = vi.fn().mockImplementation((input: unknown) => ({ input }));
  const SESClient = vi.fn().mockImplementation(() => ({
    send: mockSESSend,
  }));
  return { SESClient, SendEmailCommand };
});

vi.mock('@aws-sdk/client-s3', () => {
  const S3Client = vi.fn().mockImplementation(() => ({
    send: mockS3Send,
  }));
  const GetObjectCommand = vi.fn().mockImplementation((input: unknown) => ({ input }));
  const PutObjectCommand = vi.fn().mockImplementation((input: unknown) => ({ input }));
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
  const PutCommand = vi.fn().mockImplementation((input: unknown) => ({ input }));
  const UpdateCommand = vi.fn().mockImplementation((input: unknown) => ({ input }));
  const ScanCommand = vi.fn().mockImplementation((input: unknown) => ({ input }));
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
// This will fail until src/handlers/emailReceive.ts is updated with Slice 5.
// That failure is the expected state before the implementation slice runs.
// ---------------------------------------------------------------------------

const { handler } = await import('../../src/handlers/emailReceive.js');

// ---------------------------------------------------------------------------
// Test constants
// ---------------------------------------------------------------------------

const VALID_LEAD_ID = 'lead_01HTEST123456789ABCDE';
const EMAIL_BUCKET = 'tropicoretreat-email-store-test';
const INBOUND_S3_KEY = 'incoming/test-message-id';
const BACKUP_FORWARD_EMAIL = 'backup@tropicoretreat.com';
const ADMIN_DASHBOARD_URL = 'https://admin.tropicoretreat.com';
const CRM_SOURCE = 'Tropico Retreats <team@tropicoretreat.com>';

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('emailReceive handler — Slice 5: backup forwarding', () => {
  beforeEach(() => {
    resetAllMocks();
    process.env['BACKUP_FORWARD_EMAIL'] = BACKUP_FORWARD_EMAIL;
    process.env['ADMIN_DASHBOARD_URL'] = ADMIN_DASHBOARD_URL;
  });

  afterEach(() => {
    delete process.env['BACKUP_FORWARD_EMAIL'];
    delete process.env['ADMIN_DASHBOARD_URL'];
  });

  // -------------------------------------------------------------------------
  // Happy path: backup forward is sent with correct SES parameters
  // -------------------------------------------------------------------------

  describe('backup forwarding happy path', () => {
    it('should call SES once after successful email processing when BACKUP_FORWARD_EMAIL is set', async () => {
      const lead = createMockLead({ id: VALID_LEAD_ID, email: 'guest@example.com' });
      setupDynamoDBForInbound({ leadItem: lead as unknown as Record<string, unknown> });
      mockS3GetObject(createRawMimeEmail());

      const event = createMockS3Event({ bucketName: EMAIL_BUCKET, objectKey: INBOUND_S3_KEY });
      await handler(event);

      expect(mockSESSend).toHaveBeenCalledOnce();
    });

    it('should send backup forward with Source set to FROM_EMAIL_CRM', async () => {
      const lead = createMockLead({ id: VALID_LEAD_ID, email: 'guest@example.com' });
      setupDynamoDBForInbound({ leadItem: lead as unknown as Record<string, unknown> });
      mockS3GetObject(createRawMimeEmail());

      const event = createMockS3Event({ bucketName: EMAIL_BUCKET, objectKey: INBOUND_S3_KEY });
      await handler(event);

      const sesCall = mockSESSend.mock.calls[0][0] as { input: Record<string, unknown> };
      const commandInput = sesCall.input;

      expect(commandInput.Source).toBe(CRM_SOURCE);
    });

    it('should send backup forward to the BACKUP_FORWARD_EMAIL address', async () => {
      const lead = createMockLead({ id: VALID_LEAD_ID, email: 'guest@example.com' });
      setupDynamoDBForInbound({ leadItem: lead as unknown as Record<string, unknown> });
      mockS3GetObject(createRawMimeEmail());

      const event = createMockS3Event({ bucketName: EMAIL_BUCKET, objectKey: INBOUND_S3_KEY });
      await handler(event);

      const sesCall = mockSESSend.mock.calls[0][0] as { input: Record<string, unknown> };
      const commandInput = sesCall.input;
      const destination = commandInput.Destination as Record<string, unknown>;

      expect(destination.ToAddresses).toEqual([BACKUP_FORWARD_EMAIL]);
    });

    it('should prefix the subject with [Tropico CRM] followed by the original subject', async () => {
      const { simpleParser } = await import('mailparser');
      (simpleParser as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ...DEFAULT_PARSED_EMAIL,
        subject: 'Looking for a team retreat',
      });

      const lead = createMockLead({ id: VALID_LEAD_ID, email: 'guest@example.com' });
      setupDynamoDBForInbound({ leadItem: lead as unknown as Record<string, unknown> });
      mockS3GetObject(createRawMimeEmail({ subject: 'Looking for a team retreat' }));

      const event = createMockS3Event({ bucketName: EMAIL_BUCKET, objectKey: INBOUND_S3_KEY });
      await handler(event);

      const sesCall = mockSESSend.mock.calls[0][0] as { input: Record<string, unknown> };
      const commandInput = sesCall.input;
      const message = commandInput.Message as Record<string, unknown>;
      const subjectData = (message.Subject as Record<string, unknown>).Data as string;

      expect(subjectData).toBe('[Tropico CRM] Looking for a team retreat');
    });

    it('should include the original sender address in the email body', async () => {
      const { simpleParser } = await import('mailparser');
      (simpleParser as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ...DEFAULT_PARSED_EMAIL,
        from: {
          value: [{ address: 'uniquesender@specific.com', name: 'Unique Sender' }],
          text: 'Unique Sender <uniquesender@specific.com>',
        },
      });

      const lead = createMockLead({ id: VALID_LEAD_ID, email: 'uniquesender@specific.com' });
      setupDynamoDBForInbound({ leadItem: lead as unknown as Record<string, unknown> });
      mockS3GetObject(createRawMimeEmail({ from: 'Unique Sender <uniquesender@specific.com>' }));

      const event = createMockS3Event({ bucketName: EMAIL_BUCKET, objectKey: INBOUND_S3_KEY });
      await handler(event);

      const sesCall = mockSESSend.mock.calls[0][0] as { input: Record<string, unknown> };
      const commandInput = sesCall.input;
      const message = commandInput.Message as Record<string, unknown>;
      const bodyText = (message.Body as Record<string, unknown>);
      const textData = (bodyText.Text as Record<string, unknown>).Data as string;

      expect(textData).toContain('uniquesender@specific.com');
    });

    it('should include the lead ID in the email body', async () => {
      const lead = createMockLead({ id: VALID_LEAD_ID, email: 'guest@example.com' });
      setupDynamoDBForInbound({ leadItem: lead as unknown as Record<string, unknown> });
      mockS3GetObject(createRawMimeEmail());

      const event = createMockS3Event({ bucketName: EMAIL_BUCKET, objectKey: INBOUND_S3_KEY });
      await handler(event);

      const sesCall = mockSESSend.mock.calls[0][0] as { input: Record<string, unknown> };
      const commandInput = sesCall.input;
      const message = commandInput.Message as Record<string, unknown>;
      const textData = ((message.Body as Record<string, unknown>).Text as Record<string, unknown>).Data as string;

      expect(textData).toContain(VALID_LEAD_ID);
    });

    it('should include a receivedAt timestamp in the email body', async () => {
      const lead = createMockLead({ id: VALID_LEAD_ID, email: 'guest@example.com' });
      setupDynamoDBForInbound({ leadItem: lead as unknown as Record<string, unknown> });
      mockS3GetObject(createRawMimeEmail());

      const event = createMockS3Event({ bucketName: EMAIL_BUCKET, objectKey: INBOUND_S3_KEY });
      await handler(event);

      const sesCall = mockSESSend.mock.calls[0][0] as { input: Record<string, unknown> };
      const commandInput = sesCall.input;
      const message = commandInput.Message as Record<string, unknown>;
      const textData = ((message.Body as Record<string, unknown>).Text as Record<string, unknown>).Data as string;

      // Body must contain an ISO 8601 datetime string for the Received field
      expect(textData).toMatch(/\d{4}-\d{2}-\d{2}T[\d:.]+Z/);
    });

    it('should include the admin dashboard URL with the lead ID in the email body', async () => {
      const lead = createMockLead({ id: VALID_LEAD_ID, email: 'guest@example.com' });
      setupDynamoDBForInbound({ leadItem: lead as unknown as Record<string, unknown> });
      mockS3GetObject(createRawMimeEmail());

      const event = createMockS3Event({ bucketName: EMAIL_BUCKET, objectKey: INBOUND_S3_KEY });
      await handler(event);

      const sesCall = mockSESSend.mock.calls[0][0] as { input: Record<string, unknown> };
      const commandInput = sesCall.input;
      const message = commandInput.Message as Record<string, unknown>;
      const textData = ((message.Body as Record<string, unknown>).Text as Record<string, unknown>).Data as string;

      const expectedDashboardLink = `${ADMIN_DASHBOARD_URL}/leads/${VALID_LEAD_ID}`;
      expect(textData).toContain(expectedDashboardLink);
    });

    it('should include the original email plain text body content in the backup forward body', async () => {
      const originalBody = 'We are looking for a retreat for 50 people in Q3.';
      const { simpleParser } = await import('mailparser');
      (simpleParser as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ...DEFAULT_PARSED_EMAIL,
        text: originalBody,
      });

      const lead = createMockLead({ id: VALID_LEAD_ID, email: 'guest@example.com' });
      setupDynamoDBForInbound({ leadItem: lead as unknown as Record<string, unknown> });
      mockS3GetObject(createRawMimeEmail({ bodyText: originalBody }));

      const event = createMockS3Event({ bucketName: EMAIL_BUCKET, objectKey: INBOUND_S3_KEY });
      await handler(event);

      const sesCall = mockSESSend.mock.calls[0][0] as { input: Record<string, unknown> };
      const commandInput = sesCall.input;
      const message = commandInput.Message as Record<string, unknown>;
      const textData = ((message.Body as Record<string, unknown>).Text as Record<string, unknown>).Data as string;

      expect(textData).toContain(originalBody);
    });

    it('should include From, Lead, and Received labels in the email body metadata block', async () => {
      const lead = createMockLead({ id: VALID_LEAD_ID, email: 'guest@example.com' });
      setupDynamoDBForInbound({ leadItem: lead as unknown as Record<string, unknown> });
      mockS3GetObject(createRawMimeEmail());

      const event = createMockS3Event({ bucketName: EMAIL_BUCKET, objectKey: INBOUND_S3_KEY });
      await handler(event);

      const sesCall = mockSESSend.mock.calls[0][0] as { input: Record<string, unknown> };
      const commandInput = sesCall.input;
      const message = commandInput.Message as Record<string, unknown>;
      const textData = ((message.Body as Record<string, unknown>).Text as Record<string, unknown>).Data as string;

      expect(textData).toContain('From:');
      expect(textData).toContain('Lead:');
      expect(textData).toContain('Received:');
    });

    it('should resolve without error when the full flow succeeds', async () => {
      const lead = createMockLead({ id: VALID_LEAD_ID, email: 'guest@example.com' });
      setupDynamoDBForInbound({ leadItem: lead as unknown as Record<string, unknown> });
      mockS3GetObject(createRawMimeEmail());

      const event = createMockS3Event({ bucketName: EMAIL_BUCKET, objectKey: INBOUND_S3_KEY });

      await expect(handler(event)).resolves.toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // Backup forwarding is non-blocking: SES failure must not throw
  // -------------------------------------------------------------------------

  describe('backup forwarding is non-blocking', () => {
    it('should resolve successfully even when SES SendEmail fails', async () => {
      const lead = createMockLead({ id: VALID_LEAD_ID, email: 'guest@example.com' });
      setupDynamoDBForInbound({ leadItem: lead as unknown as Record<string, unknown> });
      mockS3GetObject(createRawMimeEmail());

      // SES send fails for the backup forward
      mockSESSend.mockRejectedValueOnce(new Error('SES: MessageRejected — daily limit exceeded'));

      const event = createMockS3Event({ bucketName: EMAIL_BUCKET, objectKey: INBOUND_S3_KEY });

      // Must NOT throw — backup forward failure is non-critical
      await expect(handler(event)).resolves.toBeUndefined();
    });

    it('should still write the email record to DynamoDB when SES backup forward fails', async () => {
      const lead = createMockLead({ id: VALID_LEAD_ID, email: 'guest@example.com' });
      setupDynamoDBForInbound({ leadItem: lead as unknown as Record<string, unknown> });
      mockS3GetObject(createRawMimeEmail());

      mockSESSend.mockRejectedValueOnce(new Error('SES: service unavailable'));

      const event = createMockS3Event({ bucketName: EMAIL_BUCKET, objectKey: INBOUND_S3_KEY });
      await handler(event);

      // DynamoDB must still have been called with the email PutCommand (2nd call)
      const putEmailCall = mockDynamoDBSend.mock.calls[1][0] as { input: Record<string, unknown> };
      const item = putEmailCall.input.Item as Record<string, unknown>;
      expect(item).toBeDefined();
      expect(item.direction).toBe('inbound');
    });

    it('should still update lead metadata when SES backup forward fails', async () => {
      const lead = createMockLead({ id: VALID_LEAD_ID, email: 'guest@example.com' });
      setupDynamoDBForInbound({ leadItem: lead as unknown as Record<string, unknown> });
      mockS3GetObject(createRawMimeEmail());

      mockSESSend.mockRejectedValueOnce(new Error('SES: connection timeout'));

      const event = createMockS3Event({ bucketName: EMAIL_BUCKET, objectKey: INBOUND_S3_KEY });
      await handler(event);

      // Metadata update is the 3rd DynamoDB call (Scan → PutEmail → UpdateMetadata)
      const updateCall = mockDynamoDBSend.mock.calls[2][0] as { input: Record<string, unknown> };
      expect(updateCall).toBeDefined();
      expect(updateCall.input.Key).toMatchObject({
        PK: `LEAD#${VALID_LEAD_ID}`,
        SK: `LEAD#${VALID_LEAD_ID}`,
      });
    });

    it('should still write the email record when SES throws a network error', async () => {
      const lead = createMockLead({ id: VALID_LEAD_ID, email: 'guest@example.com' });
      setupDynamoDBForInbound({ leadItem: lead as unknown as Record<string, unknown> });
      mockS3GetObject(createRawMimeEmail());

      mockSESSend.mockRejectedValueOnce(new Error('ECONNRESET: connection reset by peer'));

      const event = createMockS3Event({ bucketName: EMAIL_BUCKET, objectKey: INBOUND_S3_KEY });

      // Handler must complete successfully despite the network error on the SES call
      await expect(handler(event)).resolves.toBeUndefined();
      expect(mockDynamoDBSend).toHaveBeenCalledTimes(3);
    });
  });

  // -------------------------------------------------------------------------
  // Skip when BACKUP_FORWARD_EMAIL is not set
  // -------------------------------------------------------------------------

  describe('skip forwarding when BACKUP_FORWARD_EMAIL is not set', () => {
    it('should not call SES when BACKUP_FORWARD_EMAIL env var is not defined', async () => {
      delete process.env['BACKUP_FORWARD_EMAIL'];

      const lead = createMockLead({ id: VALID_LEAD_ID, email: 'guest@example.com' });
      setupDynamoDBForInbound({ leadItem: lead as unknown as Record<string, unknown> });
      mockS3GetObject(createRawMimeEmail());

      const event = createMockS3Event({ bucketName: EMAIL_BUCKET, objectKey: INBOUND_S3_KEY });
      await handler(event);

      expect(mockSESSend).not.toHaveBeenCalled();
    });

    it('should not call SES when BACKUP_FORWARD_EMAIL is set to an empty string', async () => {
      process.env['BACKUP_FORWARD_EMAIL'] = '';

      const lead = createMockLead({ id: VALID_LEAD_ID, email: 'guest@example.com' });
      setupDynamoDBForInbound({ leadItem: lead as unknown as Record<string, unknown> });
      mockS3GetObject(createRawMimeEmail());

      const event = createMockS3Event({ bucketName: EMAIL_BUCKET, objectKey: INBOUND_S3_KEY });
      await handler(event);

      expect(mockSESSend).not.toHaveBeenCalled();
    });

    it('should still write the email record even when BACKUP_FORWARD_EMAIL is absent', async () => {
      delete process.env['BACKUP_FORWARD_EMAIL'];

      const lead = createMockLead({ id: VALID_LEAD_ID, email: 'guest@example.com' });
      setupDynamoDBForInbound({ leadItem: lead as unknown as Record<string, unknown> });
      mockS3GetObject(createRawMimeEmail());

      const event = createMockS3Event({ bucketName: EMAIL_BUCKET, objectKey: INBOUND_S3_KEY });
      await handler(event);

      const putEmailCall = mockDynamoDBSend.mock.calls[1][0] as { input: Record<string, unknown> };
      const item = putEmailCall.input.Item as Record<string, unknown>;
      expect(item).toBeDefined();
      expect(item.direction).toBe('inbound');
    });

    it('should resolve without error when BACKUP_FORWARD_EMAIL is absent', async () => {
      delete process.env['BACKUP_FORWARD_EMAIL'];

      const lead = createMockLead({ id: VALID_LEAD_ID, email: 'guest@example.com' });
      setupDynamoDBForInbound({ leadItem: lead as unknown as Record<string, unknown> });
      mockS3GetObject(createRawMimeEmail());

      const event = createMockS3Event({ bucketName: EMAIL_BUCKET, objectKey: INBOUND_S3_KEY });

      await expect(handler(event)).resolves.toBeUndefined();
    });

    it('should resolve without error when BACKUP_FORWARD_EMAIL is an empty string', async () => {
      process.env['BACKUP_FORWARD_EMAIL'] = '';

      const lead = createMockLead({ id: VALID_LEAD_ID, email: 'guest@example.com' });
      setupDynamoDBForInbound({ leadItem: lead as unknown as Record<string, unknown> });
      mockS3GetObject(createRawMimeEmail());

      const event = createMockS3Event({ bucketName: EMAIL_BUCKET, objectKey: INBOUND_S3_KEY });

      await expect(handler(event)).resolves.toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // Dashboard URL handling: omit Dashboard line when ADMIN_DASHBOARD_URL not set
  // -------------------------------------------------------------------------

  describe('dashboard URL handling', () => {
    it('should include Dashboard line in body when ADMIN_DASHBOARD_URL is set', async () => {
      const lead = createMockLead({ id: VALID_LEAD_ID, email: 'guest@example.com' });
      setupDynamoDBForInbound({ leadItem: lead as unknown as Record<string, unknown> });
      mockS3GetObject(createRawMimeEmail());

      const event = createMockS3Event({ bucketName: EMAIL_BUCKET, objectKey: INBOUND_S3_KEY });
      await handler(event);

      const sesCall = mockSESSend.mock.calls[0][0] as { input: Record<string, unknown> };
      const commandInput = sesCall.input;
      const message = commandInput.Message as Record<string, unknown>;
      const textData = ((message.Body as Record<string, unknown>).Text as Record<string, unknown>).Data as string;

      expect(textData).toContain('Dashboard:');
      expect(textData).toContain(ADMIN_DASHBOARD_URL);
    });

    it('should omit the Dashboard line when ADMIN_DASHBOARD_URL is not defined', async () => {
      delete process.env['ADMIN_DASHBOARD_URL'];

      const lead = createMockLead({ id: VALID_LEAD_ID, email: 'guest@example.com' });
      setupDynamoDBForInbound({ leadItem: lead as unknown as Record<string, unknown> });
      mockS3GetObject(createRawMimeEmail());

      const event = createMockS3Event({ bucketName: EMAIL_BUCKET, objectKey: INBOUND_S3_KEY });
      await handler(event);

      const sesCall = mockSESSend.mock.calls[0][0] as { input: Record<string, unknown> };
      const commandInput = sesCall.input;
      const message = commandInput.Message as Record<string, unknown>;
      const textData = ((message.Body as Record<string, unknown>).Text as Record<string, unknown>).Data as string;

      expect(textData).not.toContain('Dashboard:');
    });

    it('should omit the Dashboard line when ADMIN_DASHBOARD_URL is an empty string', async () => {
      process.env['ADMIN_DASHBOARD_URL'] = '';

      const lead = createMockLead({ id: VALID_LEAD_ID, email: 'guest@example.com' });
      setupDynamoDBForInbound({ leadItem: lead as unknown as Record<string, unknown> });
      mockS3GetObject(createRawMimeEmail());

      const event = createMockS3Event({ bucketName: EMAIL_BUCKET, objectKey: INBOUND_S3_KEY });
      await handler(event);

      const sesCall = mockSESSend.mock.calls[0][0] as { input: Record<string, unknown> };
      const commandInput = sesCall.input;
      const message = commandInput.Message as Record<string, unknown>;
      const textData = ((message.Body as Record<string, unknown>).Text as Record<string, unknown>).Data as string;

      expect(textData).not.toContain('Dashboard:');
    });

    it('should still send backup forward even when ADMIN_DASHBOARD_URL is absent', async () => {
      delete process.env['ADMIN_DASHBOARD_URL'];

      const lead = createMockLead({ id: VALID_LEAD_ID, email: 'guest@example.com' });
      setupDynamoDBForInbound({ leadItem: lead as unknown as Record<string, unknown> });
      mockS3GetObject(createRawMimeEmail());

      const event = createMockS3Event({ bucketName: EMAIL_BUCKET, objectKey: INBOUND_S3_KEY });
      await handler(event);

      // SES must still be called — only the Dashboard line is omitted, not the whole email
      expect(mockSESSend).toHaveBeenCalledOnce();
    });

    it('should still include From, Lead, and Received fields when ADMIN_DASHBOARD_URL is absent', async () => {
      delete process.env['ADMIN_DASHBOARD_URL'];

      const lead = createMockLead({ id: VALID_LEAD_ID, email: 'guest@example.com' });
      setupDynamoDBForInbound({ leadItem: lead as unknown as Record<string, unknown> });
      mockS3GetObject(createRawMimeEmail());

      const event = createMockS3Event({ bucketName: EMAIL_BUCKET, objectKey: INBOUND_S3_KEY });
      await handler(event);

      const sesCall = mockSESSend.mock.calls[0][0] as { input: Record<string, unknown> };
      const commandInput = sesCall.input;
      const message = commandInput.Message as Record<string, unknown>;
      const textData = ((message.Body as Record<string, unknown>).Text as Record<string, unknown>).Data as string;

      expect(textData).toContain('From:');
      expect(textData).toContain('Lead:');
      expect(textData).toContain('Received:');
    });
  });

  // -------------------------------------------------------------------------
  // SES call ordering: backup forward happens AFTER all DynamoDB writes
  // -------------------------------------------------------------------------

  describe('SES call ordering', () => {
    it('should call SES AFTER the DynamoDB email record write (PutCommand)', async () => {
      const callOrder: string[] = [];

      mockDynamoDBSend.mockImplementation(async (command: unknown) => {
        callOrder.push('dynamodb');
        return { $metadata: { httpStatusCode: 200 } };
      });

      mockSESSend.mockImplementation(async () => {
        callOrder.push('ses');
        return {
          MessageId: 'ses-msg-id-0123456789ABCDEF',
          $metadata: { httpStatusCode: 200 },
        };
      });

      // Provide the Scan response (call 1 = lead found)
      mockDynamoDBSend.mockResolvedValueOnce({
        Items: [createMockLead({ id: VALID_LEAD_ID, email: 'guest@example.com' })],
        Count: 1,
        ScannedCount: 1,
        $metadata: { httpStatusCode: 200 },
      });
      // Subsequent DynamoDB calls succeed silently
      mockDynamoDBSend.mockResolvedValue({ $metadata: { httpStatusCode: 200 } });

      mockS3GetObject(createRawMimeEmail());

      const event = createMockS3Event({ bucketName: EMAIL_BUCKET, objectKey: INBOUND_S3_KEY });
      await handler(event);

      // SES must appear after at least two DynamoDB calls (Scan + PutEmail)
      const sesIndex = callOrder.lastIndexOf('ses');
      const putEmailIndex = callOrder.indexOf('dynamodb'); // first DynamoDB is Scan
      const dynamoCallCount = callOrder.filter((entry) => entry === 'dynamodb').length;

      // At least Scan + PutEmail must precede the SES call
      expect(dynamoCallCount).toBeGreaterThanOrEqual(2);
      expect(sesIndex).toBeGreaterThan(putEmailIndex);
    });

    it('should call SES AFTER the DynamoDB metadata update (UpdateCommand)', async () => {
      const callOrder: string[] = [];

      mockDynamoDBSend.mockImplementation(async () => {
        callOrder.push('dynamodb');
        return { $metadata: { httpStatusCode: 200 } };
      });

      mockSESSend.mockImplementation(async () => {
        callOrder.push('ses');
        return {
          MessageId: 'ses-msg-id-0123456789ABCDEF',
          $metadata: { httpStatusCode: 200 },
        };
      });

      // Provide Scan result first
      mockDynamoDBSend.mockResolvedValueOnce({
        Items: [createMockLead({ id: VALID_LEAD_ID, email: 'guest@example.com' })],
        Count: 1,
        ScannedCount: 1,
        $metadata: { httpStatusCode: 200 },
      });
      mockDynamoDBSend.mockResolvedValue({ $metadata: { httpStatusCode: 200 } });

      mockS3GetObject(createRawMimeEmail());

      const event = createMockS3Event({ bucketName: EMAIL_BUCKET, objectKey: INBOUND_S3_KEY });
      await handler(event);

      const sesIndex = callOrder.lastIndexOf('ses');
      const dynamoCallCount = callOrder.filter((entry) => entry === 'dynamodb').length;

      // SES comes after all DynamoDB calls (Scan + PutEmail + UpdateMetadata = 3)
      expect(dynamoCallCount).toBeGreaterThanOrEqual(3);
      expect(sesIndex).toBe(callOrder.length - 1);
    });

    it('should call DynamoDB exactly 3 times before SES for existing lead flow', async () => {
      const lead = createMockLead({ id: VALID_LEAD_ID, email: 'guest@example.com' });
      setupDynamoDBForInbound({ leadItem: lead as unknown as Record<string, unknown> });
      mockS3GetObject(createRawMimeEmail());

      const event = createMockS3Event({ bucketName: EMAIL_BUCKET, objectKey: INBOUND_S3_KEY });
      await handler(event);

      // DynamoDB: Scan + PutEmail + UpdateMetadata = 3
      expect(mockDynamoDBSend).toHaveBeenCalledTimes(3);
      // SES: backup forward = 1
      expect(mockSESSend).toHaveBeenCalledTimes(1);
    });

    it('should call DynamoDB exactly 4 times before SES when auto-creating a lead', async () => {
      const { simpleParser } = await import('mailparser');
      (simpleParser as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ...DEFAULT_PARSED_EMAIL,
        from: {
          value: [{ address: 'brandnew@domain.com', name: 'Brand New' }],
          text: 'Brand New <brandnew@domain.com>',
        },
      });

      setupDynamoDBForInbound({ autoCreateLead: true });
      mockS3GetObject(createRawMimeEmail({ from: 'Brand New <brandnew@domain.com>' }));

      const event = createMockS3Event({ bucketName: EMAIL_BUCKET, objectKey: INBOUND_S3_KEY });
      await handler(event);

      // DynamoDB: Scan + PutLead + PutEmail + UpdateMetadata = 4
      expect(mockDynamoDBSend).toHaveBeenCalledTimes(4);
      // SES: backup forward = 1
      expect(mockSESSend).toHaveBeenCalledTimes(1);
    });

    it('should use the newly created lead ID in the backup forward body when auto-creating a lead', async () => {
      const { simpleParser } = await import('mailparser');
      (simpleParser as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ...DEFAULT_PARSED_EMAIL,
        from: {
          value: [{ address: 'autocreated@domain.com', name: 'Auto Created' }],
          text: 'Auto Created <autocreated@domain.com>',
        },
      });

      setupDynamoDBForInbound({ autoCreateLead: true });
      mockS3GetObject(createRawMimeEmail({ from: 'Auto Created <autocreated@domain.com>' }));

      const event = createMockS3Event({ bucketName: EMAIL_BUCKET, objectKey: INBOUND_S3_KEY });
      await handler(event);

      // The new lead is created with the MOCK_ULID (our mocked ulid())
      const sesCall = mockSESSend.mock.calls[0][0] as { input: Record<string, unknown> };
      const commandInput = sesCall.input;
      const message = commandInput.Message as Record<string, unknown>;
      const textData = ((message.Body as Record<string, unknown>).Text as Record<string, unknown>).Data as string;

      expect(textData).toContain(MOCK_ULID);
    });
  });

  // -------------------------------------------------------------------------
  // Backup forward not triggered for loop-detected emails
  // -------------------------------------------------------------------------

  describe('backup forward is skipped for loop-detected emails', () => {
    it('should not call SES when sender matches the CRM address (loop prevention)', async () => {
      const { simpleParser } = await import('mailparser');
      (simpleParser as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ...DEFAULT_PARSED_EMAIL,
        from: {
          value: [{ address: 'team@tropicoretreat.com', name: 'Tropico Retreats' }],
          text: 'Tropico Retreats <team@tropicoretreat.com>',
        },
      });

      mockS3GetObject(createRawMimeEmail({ from: 'Tropico Retreats <team@tropicoretreat.com>' }));

      const event = createMockS3Event({ bucketName: EMAIL_BUCKET, objectKey: INBOUND_S3_KEY });
      await handler(event);

      // Both DynamoDB and SES must not be called for looped emails
      expect(mockDynamoDBSend).not.toHaveBeenCalled();
      expect(mockSESSend).not.toHaveBeenCalled();
    });
  });
});
