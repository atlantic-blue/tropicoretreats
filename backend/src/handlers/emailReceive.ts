import type { S3Event } from 'aws-lambda';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  ScanCommand,
  PutCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { simpleParser } from 'mailparser';
import { ulid } from 'ulidx';
import type { Lead, EmailAttachment } from '../lib/types.js';

// ---------------------------------------------------------------------------
// AWS client setup — uses tryConstruct pattern for test compatibility
//
// In test environments (Vitest 4+), vi.fn().mockImplementation(arrowFn) cannot
// be used as a constructor. The try/catch pattern falls back to calling the
// mock function directly when `new` throws a TypeError.
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

const s3Client = tryConstruct(S3Client as new (...args: unknown[]) => S3Client, {});

const sesClient = tryConstruct(SESClient as new (...args: unknown[]) => SESClient, {});

const dynamoDBRawClient = tryConstruct(
  DynamoDBClient as new (...args: unknown[]) => DynamoDBClient,
  {}
);
const docClient = DynamoDBDocumentClient.from(
  dynamoDBRawClient as Parameters<typeof DynamoDBDocumentClient.from>[0],
  { marshallOptions: { removeUndefinedValues: true } }
);

// ---------------------------------------------------------------------------
// Environment configuration
// ---------------------------------------------------------------------------

const TABLE_NAME = process.env.TABLE_NAME;
const EMAIL_BUCKET = process.env.EMAIL_BUCKET;
const FROM_EMAIL_CRM =
  process.env.FROM_EMAIL_CRM ?? 'Tropico Retreats <team@tropicoretreat.com>';

/**
 * Extract the bare email address from a potentially formatted "Display Name <email>" string.
 */
function extractBareAddress(addressField: string): string {
  const match = addressField.match(/<(.+?)>/);
  return match ? match[1].toLowerCase() : addressField.toLowerCase();
}

const CRM_BARE_ADDRESS = extractBareAddress(FROM_EMAIL_CRM);

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_BODY_TEXT_LENGTH = 100_000;
const MAX_LEAD_MESSAGE_LENGTH = 5_000;

// ---------------------------------------------------------------------------
// findLeadByEmail — DynamoDB Scan
// ---------------------------------------------------------------------------

/**
 * Scans DynamoDB for a lead record matching the given email address.
 * Normalizes email to lowercase before scanning.
 *
 * @param email - Sender email address to search for
 * @returns Matching Lead or null if not found
 * @throws DynamoDB service errors (Lambda retries on failure)
 */
async function findLeadByEmail(email: string): Promise<Lead | null> {
  if (!TABLE_NAME) {
    throw new Error('TABLE_NAME environment variable is not set');
  }

  const normalizedEmail = email.toLowerCase();

  const scanCommand = tryConstruct(
    ScanCommand as new (...args: unknown[]) => ScanCommand,
    {
      TableName: TABLE_NAME,
      FilterExpression: 'begins_with(SK, :skPrefix) AND #email = :emailLower',
      ExpressionAttributeNames: {
        '#email': 'email',
      },
      ExpressionAttributeValues: {
        ':skPrefix': 'LEAD#',
        ':emailLower': normalizedEmail,
      },
    }
  );

  const result = await docClient.send(
    scanCommand as Parameters<typeof docClient.send>[0]
  ) as { Items?: Lead[] };

  const items = result.Items ?? [];
  return items.length > 0 ? items[0] : null;
}

// ---------------------------------------------------------------------------
// sanitizeFilename — replace unsafe characters with underscores
// ---------------------------------------------------------------------------

/**
 * Sanitizes an attachment filename by replacing any character outside the
 * safe set [a-zA-Z0-9._-] with an underscore.
 *
 * @param filename - Original attachment filename
 * @returns Sanitized filename safe for S3 keys
 */
function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
}

// ---------------------------------------------------------------------------
// sanitizeHtml — strip dangerous tags and event handlers
// ---------------------------------------------------------------------------

/**
 * Strips dangerous HTML elements and event handler attributes to prevent XSS.
 *
 * @param html - Raw HTML string from parsed email
 * @returns Sanitized HTML string
 */
function sanitizeHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^>]*>/gi, '')
    .replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, '');
}

// ---------------------------------------------------------------------------
// handler — S3 ObjectCreated event entry point
// ---------------------------------------------------------------------------

/**
 * S3 event handler for inbound email processing.
 *
 * Triggered when SES deposits a raw MIME email into S3. Processes the email:
 *   1. Read raw MIME from S3 (throws on failure — Lambda retries)
 *   2. Parse MIME with mailparser (throws on failure — Lambda retries)
 *   3. Loop prevention: skip if sender matches CRM outbound address
 *   4. Find lead by sender email via DynamoDB Scan (throws on failure)
 *   5. Auto-create lead if not found
 *   6. Upload each attachment to S3 (non-blocking: logs error, continues)
 *   7. Write inbound email record to DynamoDB (throws on failure — Lambda retries)
 *   8. Update lead metadata: lastEmailAt + unreadEmailCount (non-blocking)
 *
 * @param event - S3Event from Lambda trigger
 */
export const handler = async (event: S3Event): Promise<void> => {
  const record = event.Records[0];
  const bucketName = record.s3.bucket.name;
  const objectKey = record.s3.object.key;

  // Step 1: Read raw MIME email from S3 — throw on failure so Lambda retries
  const getObjectCommand = tryConstruct(
    GetObjectCommand as new (...args: unknown[]) => GetObjectCommand,
    { Bucket: bucketName, Key: objectKey }
  );

  const s3Response = await s3Client.send(
    getObjectCommand as Parameters<typeof s3Client.send>[0]
  ) as { Body: { transformToByteArray: () => Promise<Uint8Array>; transformToString: () => Promise<string> } };

  const rawBytes = await s3Response.Body.transformToByteArray();

  // Step 2: Parse MIME — throw on failure so Lambda retries
  const parsed = await simpleParser(Buffer.from(rawBytes));

  // Step 3: Loop prevention — skip emails sent by the CRM itself
  const fromAddress = parsed.from?.value?.[0]?.address ?? '';
  const normalizedFromAddress = fromAddress.toLowerCase();

  if (normalizedFromAddress === CRM_BARE_ADDRESS) {
    console.warn('Loop detected: skipping email from CRM address', normalizedFromAddress);
    return;
  }

  // Step 4: Find lead by sender email — throws on DynamoDB failure
  const existingLead = await findLeadByEmail(normalizedFromAddress);

  // Step 5: Determine the lead to use (existing or auto-created)
  const fromName = parsed.from?.value?.[0]?.name ?? '';
  const bodyText = (parsed.text ?? '').slice(0, MAX_BODY_TEXT_LENGTH);
  const toAddress = parsed.to
    ? (Array.isArray(parsed.to)
        ? parsed.to[0]?.value?.[0]?.address
        : parsed.to?.value?.[0]?.address) ?? ''
    : '';

  let leadId: string;

  if (existingLead) {
    leadId = existingLead.id;
  } else {
    // Auto-create lead
    const newLeadId = ulid();
    const now = new Date().toISOString();

    const nameParts = fromName.trim().split(' ').filter(Boolean);
    const firstName = nameParts.length > 0 ? nameParts[0] : 'Unknown';
    const lastName = nameParts.slice(1).join(' ');

    const newLead: Lead = {
      PK: `LEAD#${newLeadId}`,
      SK: `LEAD#${newLeadId}`,
      GSI1PK: 'STATUS#NEW',
      GSI1SK: now,
      id: newLeadId,
      status: 'NEW',
      temperature: 'WARM',
      firstName,
      lastName,
      email: normalizedFromAddress,
      message: bodyText.slice(0, MAX_LEAD_MESSAGE_LENGTH),
      createdAt: now,
      updatedAt: now,
    };

    const putLeadCommand = tryConstruct(
      PutCommand as new (...args: unknown[]) => PutCommand,
      {
        TableName: TABLE_NAME,
        Item: newLead,
      }
    );

    await docClient.send(putLeadCommand as Parameters<typeof docClient.send>[0]);

    leadId = newLeadId;
  }

  // Step 6: Generate message ID and process attachments
  const messageId = ulid();
  const now = new Date().toISOString();
  const sentAt = parsed.date ? parsed.date.toISOString() : now;

  const attachmentMeta: EmailAttachment[] = [];
  const rawAttachments = parsed.attachments ?? [];

  for (const attachment of rawAttachments) {
    const originalFilename = attachment.filename ?? 'attachment';
    const safeFilename = sanitizeFilename(originalFilename);
    const attachmentKey = `attachments/${leadId}/${messageId}/${safeFilename}`;

    try {
      const putObjectCommand = tryConstruct(
        PutObjectCommand as new (...args: unknown[]) => PutObjectCommand,
        {
          Bucket: bucketName,
          Key: attachmentKey,
          Body: attachment.content,
          ContentType: attachment.contentType,
        }
      );

      await s3Client.send(putObjectCommand as Parameters<typeof s3Client.send>[0]);

      attachmentMeta.push({
        filename: originalFilename,
        s3Key: attachmentKey,
        contentType: attachment.contentType,
        size: attachment.size,
      });
    } catch (error) {
      console.error('Attachment upload failed, continuing:', attachmentKey, error);
    }
  }

  // Step 7: Write inbound email record — throw on failure so Lambda retries
  const subject = parsed.subject ?? '';
  const rawHtml = parsed.html !== false ? (parsed.html ?? undefined) : undefined;
  const bodyHtml = rawHtml ? sanitizeHtml(rawHtml) : undefined;

  const emailRecord = {
    PK: `LEAD#${leadId}`,
    SK: `EMAIL#${sentAt}#${messageId}`,
    id: messageId,
    leadId,
    direction: 'inbound' as const,
    fromAddress: normalizedFromAddress,
    toAddress,
    subject,
    bodyText,
    ...(bodyHtml !== undefined ? { bodyHtml } : {}),
    attachments: attachmentMeta,
    sentAt,
    readAt: null,
    s3Key: objectKey,
    operator: null,
    createdAt: now,
    updatedAt: now,
  };

  const putEmailCommand = tryConstruct(
    PutCommand as new (...args: unknown[]) => PutCommand,
    {
      TableName: TABLE_NAME,
      Item: emailRecord,
    }
  );

  await docClient.send(putEmailCommand as Parameters<typeof docClient.send>[0]);

  // Step 8: Update lead metadata — non-blocking (log error, do not throw)
  try {
    const updateCommand = tryConstruct(
      UpdateCommand as new (...args: unknown[]) => UpdateCommand,
      {
        TableName: TABLE_NAME,
        Key: {
          PK: `LEAD#${leadId}`,
          SK: `LEAD#${leadId}`,
        },
        UpdateExpression:
          'SET lastEmailAt = :lastEmailAt, #updatedAt = :updatedAt ADD #unreadEmailCount :increment',
        ExpressionAttributeNames: {
          '#updatedAt': 'updatedAt',
          '#unreadEmailCount': 'unreadEmailCount',
        },
        ExpressionAttributeValues: {
          ':lastEmailAt': sentAt,
          ':updatedAt': now,
          ':increment': 1,
        },
      }
    );

    await docClient.send(updateCommand as Parameters<typeof docClient.send>[0]);
  } catch (error) {
    console.error('Failed to update lead email metadata, continuing:', leadId, error);
  }

  // Step 9: Send backup forward via SES — non-blocking (last step)
  const backupForwardEmail = process.env.BACKUP_FORWARD_EMAIL;

  if (!backupForwardEmail) {
    return;
  }

  const adminDashboardUrl = process.env.ADMIN_DASHBOARD_URL;

  const metadataLines = [
    `From: ${normalizedFromAddress}`,
    `Lead: ${leadId}`,
    `Received: ${now}`,
    ...(adminDashboardUrl ? [`Dashboard: ${adminDashboardUrl}/leads/${leadId}`] : []),
  ];

  const backupBodyText = [
    '---',
    ...metadataLines,
    '---',
    bodyText,
  ].join('\n');

  try {
    const sendEmailCommand = tryConstruct(
      SendEmailCommand as new (...args: unknown[]) => SendEmailCommand,
      {
        Source: FROM_EMAIL_CRM,
        Destination: { ToAddresses: [backupForwardEmail] },
        Message: {
          Subject: { Data: `[Tropico CRM] ${subject}` },
          Body: {
            Text: { Data: backupBodyText },
          },
        },
      }
    );

    await sesClient.send(sendEmailCommand as Parameters<typeof sesClient.send>[0]);
  } catch (error) {
    console.error('Failed to send backup forward email, continuing:', leadId, error);
  }
};
