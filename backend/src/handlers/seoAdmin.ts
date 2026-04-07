import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { SeoOverrideSchema } from '../lib/validation.js';
import {
  ok,
  badRequest,
  serverError,
} from '../utils/response.js';

// ---------------------------------------------------------------------------
// AWS client setup — uses tryConstruct pattern for Vitest 4+ compatibility
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

const dynamoDBRawClient = tryConstruct(
  DynamoDBClient as new (...args: unknown[]) => DynamoDBClient,
  {}
);
const docClient = DynamoDBDocumentClient.from(dynamoDBRawClient, {
  marshallOptions: { removeUndefinedValues: true },
});

const TABLE_NAME = process.env.TABLE_NAME;

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

async function handleGetSettings(): Promise<APIGatewayProxyResultV2> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: {
        ':pk': 'SEO#ALL',
      },
      ScanIndexForward: true,
    })
  );

  const settings = (result.Items ?? []).map(stripDynamoDBKeys);
  return ok({ settings });
}

async function handleUpsertSetting(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const rawPath = event.pathParameters?.proxy;
  if (!rawPath) {
    return badRequest('Path parameter is required');
  }

  const path = decodeURIComponent(rawPath);

  let body: unknown;
  try {
    body = JSON.parse(event.body ?? '');
  } catch {
    return badRequest('Invalid JSON body');
  }

  const validation = SeoOverrideSchema.safeParse(body);
  if (!validation.success) {
    return badRequest('Validation failed', validation.error.flatten().fieldErrors);
  }

  const { metaTitle, metaDescription, ogTitle, ogDescription, ogImageUrl, keywords } = validation.data;
  const email = event.requestContext.authorizer.jwt.claims.email as string;
  const now = new Date().toISOString();

  const setting = {
    path,
    metaTitle,
    metaDescription,
    ogTitle: ogTitle ?? metaTitle,
    ogDescription: ogDescription ?? metaDescription,
    ogImageUrl,
    keywords,
    updatedAt: now,
    updatedBy: email,
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `SEO#${path}`,
        SK: `SEO#${path}`,
        GSI1PK: 'SEO#ALL',
        GSI1SK: path,
        ...setting,
      },
    })
  );

  return ok({ setting });
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function stripDynamoDBKeys(item: Record<string, unknown>): Record<string, unknown> {
  const { PK, SK, GSI1PK, GSI1SK, ...rest } = item;
  return rest;
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

export async function handler(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  try {
    const method = event.requestContext.http.method;
    const path = event.rawPath;

    if (method === 'GET' && path === '/seo/settings') {
      return await handleGetSettings();
    }

    if (method === 'PUT' && path.startsWith('/seo/settings/')) {
      return await handleUpsertSetting(event);
    }

    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  } catch (error) {
    console.error('Error in seoAdmin handler:', error);
    return serverError();
  }
}
