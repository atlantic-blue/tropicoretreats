import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { SendEmailRequestSchema } from '../lib/validation.js';
import type { Email, Lead } from '../lib/types.js';
import { created, badRequest, notFound, serverError } from '../utils/response.js';

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
 */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  const method = event.requestContext.http.method;
  const path = event.requestContext.http.path;

  if (method === 'POST' && path === '/emails/send') {
    return handleSendEmail(event);
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

  const getResult = await docClient.send(
    getCommand as Parameters<typeof docClient.send>[0]
  );

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
  void (getResult.Item as Lead);

  return created(emailRecord);
}
