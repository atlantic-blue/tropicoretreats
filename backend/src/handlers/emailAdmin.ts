import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { SendEmailRequestSchema } from '../lib/validation.js';
import type { Email, Lead } from '../lib/types.js';
import { created, badRequest, notFound, ok, serverError } from '../utils/response.js';

// ---------------------------------------------------------------------------
// AWS client setup
//
// In production, constructors (DynamoDBClient, SESClient, commands) are called
// with `new` as normal.
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
    // Fallback for test environments where mock implementations use arrow
    // functions and cannot be used as constructors (Vitest 4 behaviour).
    return (Constructor as unknown as (...args: unknown[]) => T)(...args);
  }
}

/**
 * DynamoDB singleton — reused across warm Lambda invocations.
 * DynamoDBDocumentClient.from() is safe to call here: its mock implementation
 * in tests does not use an arrow function as a constructor.
 */
const dynamoDBRawClient = tryConstruct(DynamoDBClient as new (...args: unknown[]) => DynamoDBClient, {});
const docClient = DynamoDBDocumentClient.from(
  dynamoDBRawClient as Parameters<typeof DynamoDBDocumentClient.from>[0],
  { marshallOptions: { removeUndefinedValues: true } }
);

/**
 * SES singleton — reused across warm Lambda invocations.
 */
const sesClient = tryConstruct(SESClient as new (...args: unknown[]) => SESClient, {});

// ---------------------------------------------------------------------------
// Environment configuration
// ---------------------------------------------------------------------------

const TABLE_NAME = process.env.TABLE_NAME;
const FROM_EMAIL_CRM =
  process.env.FROM_EMAIL_CRM ?? 'Tropico Retreats <team@tropicoretreat.com>';

const replyToMatch = FROM_EMAIL_CRM.match(/<(.+?)>/);
const REPLY_TO = replyToMatch ? replyToMatch[1] : FROM_EMAIL_CRM;
const FROM_ADDRESS = REPLY_TO;

// ---------------------------------------------------------------------------
// Handler entry point
// ---------------------------------------------------------------------------

/**
 * Multi-route Lambda handler for email admin operations.
 *
 * Routes:
 * - POST /emails/send — Send an outbound email to a lead
 * - PATCH /emails/{leadId}/read — Mark all unread inbound emails for a lead as read
 * - GET /emails/{leadId} — Retrieve paginated email thread for a lead
 */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  const method = event.requestContext.http.method;
  const path = event.requestContext.http.path;

  if (method === 'POST' && path === '/emails/send') {
    return handleSendEmail(event);
  }

  if (method === 'PATCH' && path.startsWith('/emails/') && path.endsWith('/read')) {
    return handleMarkRead(event);
  }

  if (method === 'GET' && path !== '/emails/send' && path.startsWith('/emails/') && !path.endsWith('/read')) {
    return handleGetEmails(event);
  }

  return {
    statusCode: 405,
    body: JSON.stringify({ error: 'Method not allowed' }),
  };
};

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

/**
 * POST /emails/send — Send an outbound CRM email to a lead.
 *
 * Flow:
 *   1. Parse and validate request body (400 on failure)
 *   2. Verify lead exists in DynamoDB via GetCommand (404 if missing)
 *   3. Send email via SES SendEmailCommand (500 on SES failure)
 *   4. Persist email record via PutCommand (500 on DynamoDB failure)
 *   5. Update lead lastEmailAt metadata via UpdateCommand (500 on failure)
 *   6. Return 201 with full email record
 */
async function handleSendEmail(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  if (!TABLE_NAME) {
    console.error('TABLE_NAME environment variable is not set');
    return serverError();
  }

  // Step 1: Parse request body
  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(event.body ?? '{}');
  } catch {
    return badRequest('Invalid JSON in request body');
  }

  // Step 2: Validate against schema
  const validation = SendEmailRequestSchema.safeParse(parsedBody);
  if (!validation.success) {
    return badRequest('Validation failed', validation.error.flatten().fieldErrors);
  }

  const { leadId, to, subject, bodyText, bodyHtml } = validation.data;

  // Step 3: Verify lead exists (GetCommand — DynamoDB call #1)
  const getCommand = tryConstruct(
    GetCommand as new (...args: unknown[]) => GetCommand,
    {
      TableName: TABLE_NAME,
      Key: { PK: `LEAD#${leadId}`, SK: `LEAD#${leadId}` },
    }
  );

  const getResult = (await docClient.send(
    getCommand as Parameters<typeof docClient.send>[0]
  )) as { Item?: Record<string, unknown> };

  if (!getResult.Item) {
    return notFound('Lead not found');
  }

  // Extract operator identity from JWT claims
  const claims = event.requestContext.authorizer?.jwt?.claims ?? {};
  const operator =
    (claims.email as string | undefined) ??
    (claims.sub as string | undefined) ??
    'unknown';

  // Step 4: Send email via SES
  const sesBody: {
    Text: { Data: string };
    Html?: { Data: string };
  } = { Text: { Data: bodyText } };

  if (bodyHtml) {
    sesBody.Html = { Data: bodyHtml };
  }

  const sendEmailCommand = tryConstruct(
    SendEmailCommand as new (...args: unknown[]) => SendEmailCommand,
    {
      Source: FROM_EMAIL_CRM,
      Destination: { ToAddresses: [to] },
      ReplyToAddresses: [REPLY_TO],
      Message: {
        Subject: { Data: subject },
        Body: sesBody,
      },
    }
  );

  let sesResponse: { MessageId: string };
  try {
    sesResponse = (await sesClient.send(
      sendEmailCommand as Parameters<typeof sesClient.send>[0]
    )) as { MessageId: string };
  } catch (error) {
    console.error('SES send failed:', error);
    return serverError('Failed to send email');
  }

  const messageId = sesResponse.MessageId;

  const now = new Date().toISOString();

  // Build email record
  const emailRecord: Email = {
    PK: `LEAD#${leadId}`,
    SK: `EMAIL#${now}#${messageId}`,
    id: messageId,
    leadId,
    direction: 'outbound',
    fromAddress: FROM_ADDRESS,
    toAddress: to,
    subject,
    bodyText,
    ...(bodyHtml !== undefined ? { bodyHtml } : {}),
    attachments: [],
    sentAt: now,
    readAt: null,
    s3Key: null,
    operator,
    createdAt: now,
    updatedAt: now,
  };

  // Step 5: Persist email record (PutCommand — DynamoDB call #2)
  const putCommand = tryConstruct(
    PutCommand as new (...args: unknown[]) => PutCommand,
    {
      TableName: TABLE_NAME,
      Item: emailRecord,
    }
  );

  try {
    await docClient.send(putCommand as Parameters<typeof docClient.send>[0]);
  } catch (error) {
    console.error('DynamoDB putEmail failed:', error);
    return serverError('Failed to persist email record');
  }

  // Step 6: Update lead lastEmailAt metadata (UpdateCommand — DynamoDB call #3)
  const updateCommand = tryConstruct(
    UpdateCommand as new (...args: unknown[]) => UpdateCommand,
    {
      TableName: TABLE_NAME,
      Key: {
        PK: `LEAD#${leadId}`,
        SK: `LEAD#${leadId}`,
      },
      UpdateExpression:
        'SET lastEmailAt = :lastEmailAt, #updatedAt = :updatedAt',
      ExpressionAttributeNames: { '#updatedAt': 'updatedAt' },
      ExpressionAttributeValues: {
        ':lastEmailAt': now,
        ':updatedAt': now,
      },
    }
  );

  try {
    await docClient.send(updateCommand as Parameters<typeof docClient.send>[0]);
  } catch (error) {
    console.error('DynamoDB updateLeadEmailMetadata failed:', error);
    return serverError('Failed to update lead metadata');
  }

  // Suppress unused variable warning
  void (getResult.Item as unknown as Lead);

  return created(emailRecord);
}

// ---------------------------------------------------------------------------
// GET /emails/{leadId} — Retrieve paginated email thread for a lead
// ---------------------------------------------------------------------------

const DEFAULT_LIMIT = 50;
const MIN_LIMIT = 1;
const MAX_LIMIT = 100;

/**
 * Validates and parses the `limit` query parameter.
 *
 * @param rawLimit - Raw string value from query string, or undefined
 * @returns Parsed integer limit, or an error message string
 */
function parseLimitParameter(rawLimit: string | undefined): number | string {
  if (rawLimit === undefined) {
    return DEFAULT_LIMIT;
  }

  const parsed = Number(rawLimit);

  if (!Number.isInteger(parsed) || isNaN(parsed) || parsed < MIN_LIMIT || parsed > MAX_LIMIT) {
    return 'Invalid limit parameter. Must be between 1 and 100.';
  }

  return parsed;
}

/**
 * Validates and decodes the `cursor` query parameter.
 *
 * Cursors are base64-encoded JSON objects representing DynamoDB ExclusiveStartKey.
 *
 * @param rawCursor - Raw string value from query string, or undefined
 * @returns Decoded object, undefined (when no cursor), or an error message string
 */
function parseCursorParameter(rawCursor: string | undefined): Record<string, unknown> | undefined | string {
  if (rawCursor === undefined) {
    return undefined;
  }

  let decoded: string;
  try {
    decoded = Buffer.from(rawCursor, 'base64').toString('utf-8');
  } catch {
    return 'Invalid pagination cursor';
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(decoded);
  } catch {
    return 'Invalid pagination cursor';
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return 'Invalid pagination cursor';
  }

  return parsed as Record<string, unknown>;
}

/**
 * GET /emails/{leadId} — Return a paginated chronological email thread.
 *
 * Flow:
 *   1. Check TABLE_NAME is set (500 if missing)
 *   2. Validate limit query param (400 if invalid)
 *   3. Validate cursor query param (400 if invalid)
 *   4. Extract leadId from pathParameters or path
 *   5. Query DynamoDB (PK=LEAD#{leadId}, begins_with(SK, 'EMAIL#'), ScanIndexForward=true)
 *   6. Run count query (Select='COUNT') for totalCount
 *   7. Return { emails, nextCursor?, totalCount }
 */
async function handleGetEmails(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  if (!TABLE_NAME) {
    console.error('TABLE_NAME environment variable is not set');
    return serverError();
  }

  // Validate limit parameter
  const rawLimit = event.queryStringParameters?.limit;
  const limitResult = parseLimitParameter(rawLimit);
  if (typeof limitResult === 'string') {
    return badRequest(limitResult);
  }
  const limit = limitResult;

  // Validate cursor parameter
  const rawCursor = event.queryStringParameters?.cursor;
  const cursorResult = parseCursorParameter(rawCursor);
  if (typeof cursorResult === 'string') {
    return badRequest(cursorResult);
  }
  const exclusiveStartKey = cursorResult;

  // Extract leadId from pathParameters (set by API Gateway) or fall back to path parsing
  const leadId =
    event.pathParameters?.leadId ??
    event.requestContext.http.path.replace(/^\/emails\//, '');

  // Build paginated query command
  const queryInput: Record<string, unknown> = {
    TableName: TABLE_NAME,
    KeyConditionExpression: '#PK = :pk AND begins_with(#SK, :skPrefix)',
    ExpressionAttributeNames: {
      '#PK': 'PK',
      '#SK': 'SK',
    },
    ExpressionAttributeValues: {
      ':pk': `LEAD#${leadId}`,
      ':skPrefix': 'EMAIL#',
    },
    ScanIndexForward: true,
    Limit: limit,
    ...(exclusiveStartKey !== undefined ? { ExclusiveStartKey: exclusiveStartKey } : {}),
  };

  const queryCommand = tryConstruct(
    QueryCommand as new (...args: unknown[]) => QueryCommand,
    queryInput
  );

  let queryResult: {
    Items?: Record<string, unknown>[];
    LastEvaluatedKey?: Record<string, unknown>;
  };

  try {
    queryResult = (await docClient.send(
      queryCommand as Parameters<typeof docClient.send>[0]
    )) as { Items?: Record<string, unknown>[]; LastEvaluatedKey?: Record<string, unknown> };
  } catch (error) {
    console.error('DynamoDB queryEmails failed:', error);
    return serverError();
  }

  const emails = queryResult.Items ?? [];
  const lastEvaluatedKey = queryResult.LastEvaluatedKey;

  // Run count query for totalCount
  const countQueryInput: Record<string, unknown> = {
    TableName: TABLE_NAME,
    KeyConditionExpression: '#PK = :pk AND begins_with(#SK, :skPrefix)',
    ExpressionAttributeNames: {
      '#PK': 'PK',
      '#SK': 'SK',
    },
    ExpressionAttributeValues: {
      ':pk': `LEAD#${leadId}`,
      ':skPrefix': 'EMAIL#',
    },
    Select: 'COUNT',
  };

  const countQueryCommand = tryConstruct(
    QueryCommand as new (...args: unknown[]) => QueryCommand,
    countQueryInput
  );

  let countResult: { Count?: number };
  try {
    countResult = (await docClient.send(
      countQueryCommand as Parameters<typeof docClient.send>[0]
    )) as { Count?: number };
  } catch (error) {
    console.error('DynamoDB countEmails failed:', error);
    return serverError();
  }

  const totalCount = countResult.Count ?? 0;

  // Encode LastEvaluatedKey as base64 cursor if present
  const nextCursor = lastEvaluatedKey !== undefined
    ? Buffer.from(JSON.stringify(lastEvaluatedKey)).toString('base64')
    : undefined;

  const responseBody: {
    emails: Record<string, unknown>[];
    totalCount: number;
    nextCursor?: string;
  } = {
    emails,
    totalCount,
    ...(nextCursor !== undefined ? { nextCursor } : {}),
  };

  return ok(responseBody);
}

// ---------------------------------------------------------------------------
// PATCH /emails/{leadId}/read — Mark all unread inbound emails as read
// ---------------------------------------------------------------------------

/**
 * PATCH /emails/{leadId}/read — Mark all unread inbound emails for a lead as read.
 *
 * Flow:
 *   1. Check TABLE_NAME is set (500 if missing)
 *   2. Extract leadId from path (strip /emails/ prefix and /read suffix)
 *   3. GetCommand to verify lead exists (404 if not found, 500 on error)
 *   4. QueryCommand to find unread inbound emails (500 on error)
 *   5. UpdateCommand for each unread email: SET readAt = :now, updatedAt = :now
 *   6. UpdateCommand on lead: SET unreadEmailCount = 0, updatedAt = :now
 *   7. Return 200 with { markedCount, leadId }
 */
async function handleMarkRead(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  if (!TABLE_NAME) {
    console.error('TABLE_NAME environment variable is not set');
    return serverError();
  }

  // Extract leadId from path: /emails/{leadId}/read
  const rawPath = event.requestContext.http.path;
  const leadId = rawPath.replace(/^\/emails\//, '').replace(/\/read$/, '');

  const now = new Date().toISOString();

  // Step 1: Verify lead exists (GetCommand — DynamoDB call #1)
  const getLeadCommand = tryConstruct(
    GetCommand as new (...args: unknown[]) => GetCommand,
    {
      TableName: TABLE_NAME,
      Key: {
        PK: `LEAD#${leadId}`,
        SK: `LEAD#${leadId}`,
      },
    }
  );

  let getLeadResult: { Item?: Record<string, unknown> };
  try {
    getLeadResult = (await docClient.send(
      getLeadCommand as Parameters<typeof docClient.send>[0]
    )) as { Item?: Record<string, unknown> };
  } catch (error) {
    console.error('DynamoDB getLead failed:', error);
    return serverError();
  }

  if (!getLeadResult.Item) {
    return notFound('Lead not found');
  }

  // Step 2: Query unread inbound emails (QueryCommand — DynamoDB call #2)
  const queryUnreadCommand = tryConstruct(
    QueryCommand as new (...args: unknown[]) => QueryCommand,
    {
      TableName: TABLE_NAME,
      KeyConditionExpression: '#PK = :pk AND begins_with(#SK, :skPrefix)',
      FilterExpression: '#direction = :inbound AND (attribute_not_exists(#readAt) OR #readAt = :null)',
      ExpressionAttributeNames: {
        '#PK': 'PK',
        '#SK': 'SK',
        '#direction': 'direction',
        '#readAt': 'readAt',
      },
      ExpressionAttributeValues: {
        ':pk': `LEAD#${leadId}`,
        ':skPrefix': 'EMAIL#',
        ':inbound': 'inbound',
        ':null': null,
      },
    }
  );

  let queryResult: { Items?: Record<string, unknown>[] };
  try {
    queryResult = (await docClient.send(
      queryUnreadCommand as Parameters<typeof docClient.send>[0]
    )) as { Items?: Record<string, unknown>[] };
  } catch (error) {
    console.error('DynamoDB queryUnreadEmails failed:', error);
    return serverError();
  }

  const unreadEmails = queryResult.Items ?? [];

  // Step 3: Mark each unread email as read (UpdateCommand × N)
  for (const email of unreadEmails) {
    const emailUpdateCommand = tryConstruct(
      UpdateCommand as new (...args: unknown[]) => UpdateCommand,
      {
        TableName: TABLE_NAME,
        Key: {
          PK: email.PK as string,
          SK: email.SK as string,
        },
        UpdateExpression: 'SET #readAt = :readAt, #updatedAt = :updatedAt',
        ExpressionAttributeNames: {
          '#readAt': 'readAt',
          '#updatedAt': 'updatedAt',
        },
        ExpressionAttributeValues: {
          ':readAt': now,
          ':updatedAt': now,
        },
      }
    );

    try {
      await docClient.send(emailUpdateCommand as Parameters<typeof docClient.send>[0]);
    } catch (error) {
      console.error('DynamoDB markEmailRead failed:', error);
      return serverError();
    }
  }

  // Step 4: Reset lead unreadEmailCount to 0 (UpdateCommand — final DynamoDB call)
  const resetLeadCountCommand = tryConstruct(
    UpdateCommand as new (...args: unknown[]) => UpdateCommand,
    {
      TableName: TABLE_NAME,
      Key: {
        PK: `LEAD#${leadId}`,
        SK: `LEAD#${leadId}`,
      },
      UpdateExpression: 'SET unreadEmailCount = :zero, #updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#updatedAt': 'updatedAt',
      },
      ExpressionAttributeValues: {
        ':zero': 0,
        ':updatedAt': now,
      },
    }
  );

  try {
    await docClient.send(resetLeadCountCommand as Parameters<typeof docClient.send>[0]);
  } catch (error) {
    console.error('DynamoDB resetLeadUnreadCount failed:', error);
    return serverError();
  }

  return ok({ markedCount: unreadEmails.length, leadId });
}
