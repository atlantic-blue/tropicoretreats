import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';
import type { Lead } from '../../src/lib/types.js';

/**
 * Default test operator identity extracted from JWT claims.
 * Mirrors the shape that Cognito JWT authorizer provides.
 */
const DEFAULT_OPERATOR_SUB = 'usr_test-operator-sub-001';
const DEFAULT_OPERATOR_EMAIL = 'operator@tropicoretreat.com';

/**
 * Builds a mock APIGatewayProxyEventV2WithJWTAuthorizer for the emailAdmin handler.
 *
 * Defaults:
 * - method: POST
 * - path: /emails/send
 * - body: serialized createSendEmailRequest()
 * - JWT claims: DEFAULT_OPERATOR_SUB + DEFAULT_OPERATOR_EMAIL
 *
 * @param overrides - Partial event fields to override defaults
 */
export function createMockApiEvent(
  overrides: {
    method?: string;
    path?: string;
    body?: string | null;
    sub?: string;
    email?: string;
    pathParameters?: Record<string, string>;
  } = {}
): APIGatewayProxyEventV2WithJWTAuthorizer {
  const {
    method = 'POST',
    path = '/emails/send',
    body = JSON.stringify(createSendEmailRequest()),
    sub = DEFAULT_OPERATOR_SUB,
    email = DEFAULT_OPERATOR_EMAIL,
    pathParameters = {},
  } = overrides;

  return {
    version: '2.0',
    routeKey: `${method} ${path}`,
    rawPath: path,
    rawQueryString: '',
    headers: {
      'content-type': 'application/json',
    },
    requestContext: {
      accountId: '123456789012',
      apiId: 'test-api-id',
      domainName: 'test.execute-api.us-east-1.amazonaws.com',
      domainPrefix: 'test',
      http: {
        method,
        path,
        protocol: 'HTTP/1.1',
        sourceIp: '127.0.0.1',
        userAgent: 'test-agent',
      },
      requestId: 'test-request-id',
      routeKey: `${method} ${path}`,
      stage: '$default',
      time: '01/Jan/2026:00:00:00 +0000',
      timeEpoch: 1735689600000,
      authorizer: {
        jwt: {
          claims: {
            sub,
            email,
            iss: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_test',
            aud: 'test-client-id',
            token_use: 'access',
          },
          scopes: null,
        },
        principalId: sub,
        integrationLatency: 0,
      },
    },
    body: body ?? undefined,
    pathParameters: Object.keys(pathParameters).length > 0 ? pathParameters : undefined,
    queryStringParameters: undefined,
    stageVariables: undefined,
    isBase64Encoded: false,
  } as unknown as APIGatewayProxyEventV2WithJWTAuthorizer;
}

/**
 * Builds a valid send-email request body.
 * All fields comply with SendEmailRequestSchema constraints.
 *
 * @param overrides - Field overrides to test validation boundaries
 */
export function createSendEmailRequest(
  overrides: {
    leadId?: string;
    to?: string;
    subject?: string;
    bodyText?: string;
    bodyHtml?: string;
  } = {}
): {
  leadId: string;
  to: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
} {
  return {
    leadId: 'lead_01HTEST123456789ABCDE',
    to: 'guest@example.com',
    subject: 'Your Tropico Retreat Enquiry',
    bodyText: 'Thank you for your enquiry. We will be in touch shortly.',
    ...overrides,
  };
}

/**
 * Builds a mock Lead entity as it would be returned from DynamoDB.
 * Conforms to the Lead interface in src/lib/types.ts.
 *
 * @param overrides - Field overrides for specific test scenarios
 */
export function createMockLead(overrides: Partial<Lead> = {}): Lead {
  const id = overrides.id ?? 'lead_01HTEST123456789ABCDE';
  const now = '2026-01-15T10:00:00.000Z';

  return {
    PK: `LEAD#${id}`,
    SK: `LEAD#${id}`,
    GSI1PK: 'STATUS#NEW',
    GSI1SK: now,
    id,
    status: 'NEW',
    temperature: 'WARM',
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'guest@example.com',
    message: 'Interested in a corporate retreat for 20 people.',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}
