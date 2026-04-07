import type { APIGatewayProxyEventV2WithJWTAuthorizer, S3Event } from 'aws-lambda';
import type { Email, Lead } from '../../src/lib/types.js';

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
    queryStringParameters?: Record<string, string>;
  } = {}
): APIGatewayProxyEventV2WithJWTAuthorizer {
  const {
    method = 'POST',
    path = '/emails/send',
    body = JSON.stringify(createSendEmailRequest()),
    sub = DEFAULT_OPERATOR_SUB,
    email = DEFAULT_OPERATOR_EMAIL,
    pathParameters = {},
    queryStringParameters,
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
    queryStringParameters: queryStringParameters ?? undefined,
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

/**
 * Builds a mock S3Event as SES would deliver it after storing an inbound email.
 *
 * The handler reads the bucket name and object key from the first Record.
 *
 * @param overrides - Override bucket name, object key, or other fields
 */
export function createMockS3Event(
  overrides: {
    bucketName?: string;
    objectKey?: string;
    eventName?: string;
    objectSize?: number;
  } = {}
): S3Event {
  const {
    bucketName = 'tropicoretreat-email-store-test',
    objectKey = 'incoming/test-message-id',
    eventName = 'ObjectCreated:Put',
    objectSize = 1234,
  } = overrides;

  return {
    Records: [
      {
        eventVersion: '2.1',
        eventSource: 'aws:s3',
        awsRegion: 'us-east-1',
        eventTime: '2026-01-15T10:00:00.000Z',
        eventName,
        userIdentity: { principalId: 'AWS:EXAMPLE' },
        requestParameters: { sourceIPAddress: '127.0.0.1' },
        responseElements: {
          'x-amz-request-id': 'test-request-id',
          'x-amz-id-2': 'test-id-2',
        },
        s3: {
          s3SchemaVersion: '1.0',
          configurationId: 'test-config',
          bucket: {
            name: bucketName,
            ownerIdentity: { principalId: 'EXAMPLE' },
            arn: `arn:aws:s3:::${bucketName}`,
          },
          object: {
            key: objectKey,
            size: objectSize,
            eTag: 'test-etag',
            sequencer: 'test-sequencer',
          },
        },
      },
    ],
  };
}

/**
 * Builds a raw MIME email string suitable for use as the Buffer content
 * returned by S3 GetObject when the handler reads an inbound email.
 *
 * The returned string can be converted to a Buffer via Buffer.from(result).
 *
 * @param overrides - Override individual MIME header/body values
 */
export function createRawMimeEmail(
  overrides: {
    from?: string;
    to?: string;
    subject?: string;
    bodyText?: string;
    bodyHtml?: string;
    date?: string;
    messageId?: string;
    attachmentFilename?: string;
    attachmentContent?: string;
    includeAttachment?: boolean;
  } = {}
): string {
  const {
    from = 'Guest User <guest@example.com>',
    to = 'team@tropicoretreat.com',
    subject = 'Interested in a retreat',
    bodyText = 'Hello, I am interested in booking a corporate retreat for my team.',
    bodyHtml,
    date = 'Wed, 15 Jan 2026 10:00:00 +0000',
    messageId = '<original-message-id@mail.example.com>',
    attachmentFilename = 'document.pdf',
    attachmentContent = 'fake-pdf-content',
    includeAttachment = false,
  } = overrides;

  const boundary = 'boundary_test_12345';
  const htmlPart = bodyHtml ?? `<p>${bodyText}</p>`;

  if (includeAttachment) {
    const attachmentBase64 = Buffer.from(attachmentContent).toString('base64');
    return [
      `From: ${from}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      `Date: ${date}`,
      `Message-ID: ${messageId}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      `Content-Type: multipart/alternative; boundary="alt_${boundary}"`,
      '',
      `--alt_${boundary}`,
      `Content-Type: text/plain; charset=utf-8`,
      '',
      bodyText,
      '',
      `--alt_${boundary}`,
      `Content-Type: text/html; charset=utf-8`,
      '',
      htmlPart,
      '',
      `--alt_${boundary}--`,
      '',
      `--${boundary}`,
      `Content-Type: application/pdf`,
      `Content-Disposition: attachment; filename="${attachmentFilename}"`,
      `Content-Transfer-Encoding: base64`,
      '',
      attachmentBase64,
      '',
      `--${boundary}--`,
    ].join('\r\n');
  }

  return [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `Date: ${date}`,
    `Message-ID: ${messageId}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    `Content-Type: text/plain; charset=utf-8`,
    '',
    bodyText,
    '',
    `--${boundary}`,
    `Content-Type: text/html; charset=utf-8`,
    '',
    htmlPart,
    '',
    `--${boundary}--`,
  ].join('\r\n');
}

/**
 * Builds a mock Email entity as it would be returned from a DynamoDB Query.
 * Conforms to the Email interface in src/lib/types.ts.
 *
 * The SK follows the EMAIL#{timestamp}#{messageId} pattern used by the handler
 * when persisting email records, which also drives chronological ordering.
 *
 * @param overrides - Field overrides for specific test scenarios
 */
export function createMockEmail(overrides: Partial<Email> = {}): Email {
  const leadId = overrides.leadId ?? 'lead_01HTEST123456789ABCDE';
  const id = overrides.id ?? 'ses-msg-id-0123456789ABCDEF';
  const sentAt = overrides.sentAt ?? '2026-01-15T10:00:00.000Z';
  const now = sentAt;

  return {
    PK: `LEAD#${leadId}`,
    SK: `EMAIL#${sentAt}#${id}`,
    id,
    leadId,
    direction: 'outbound',
    fromAddress: 'team@tropicoretreat.com',
    toAddress: 'guest@example.com',
    subject: 'Your Tropico Retreat Enquiry',
    bodyText: 'Thank you for your enquiry. We will be in touch shortly.',
    attachments: [],
    sentAt,
    readAt: null,
    s3Key: null,
    operator: 'operator@tropicoretreat.com',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Blog CMS factories (Slice S-1)
// ---------------------------------------------------------------------------

/** Counter for unique slug generation across factory calls */
let blogPostCounter = 0;

/**
 * Represents a BlogPostItem as stored in DynamoDB.
 * Mirrors the BlogPostSchema contract.
 */
export interface BlogPostItem {
  PK: string;
  SK: string;
  GSI1PK: string;
  GSI1SK: string;
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  heroImageUrl: string;
  metaTitle: string;
  metaDescription: string;
  ogImageUrl: string;
  authorName: string;
  authorOrg: string;
  status: 'published' | 'deleted';
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Represents a SlugIndexItem as stored in DynamoDB.
 * Mirrors the BlogPostSchema contract for the slug uniqueness index.
 */
export interface SlugIndexItem {
  PK: string;
  SK: string;
  slug: string;
  blogId: string;
}

/**
 * Builds a valid CreateBlogPost request body.
 * All fields comply with CreateBlogPostSchema constraints.
 *
 * @param overrides - Field overrides to test validation boundaries
 */
export function createBlogPostRequest(
  overrides: {
    title?: string;
    slug?: string;
    content?: string;
    heroImageUrl?: string;
    metaTitle?: string;
    metaDescription?: string;
    ogImageUrl?: string;
  } = {}
): {
  title: string;
  content: string;
  slug?: string;
  heroImageUrl?: string;
  metaTitle?: string;
  metaDescription?: string;
  ogImageUrl?: string;
} {
  blogPostCounter++;
  return {
    title: `Test Blog Post ${blogPostCounter}`,
    content: `This is the content for test blog post ${blogPostCounter}. It contains enough text to generate a meaningful excerpt.`,
    ...overrides,
  };
}

/**
 * Builds a mock BlogPostItem entity as it would be returned from DynamoDB.
 * Conforms to the BlogPostSchema contract.
 *
 * @param overrides - Field overrides for specific test scenarios
 */
export function createMockBlogPost(overrides: Partial<BlogPostItem> = {}): BlogPostItem {
  blogPostCounter++;
  const id = overrides.id ?? `01HTEST_BLOG_${String(blogPostCounter).padStart(4, '0')}`;
  const slug = overrides.slug ?? `test-blog-post-${blogPostCounter}`;
  const now = overrides.createdAt ?? '2026-02-01T12:00:00.000Z';
  const title = overrides.title ?? `Test Blog Post ${blogPostCounter}`;
  const content = overrides.content ?? `This is the content for test blog post ${blogPostCounter}. It contains enough text to generate a meaningful excerpt for the listing page.`;
  const excerpt = overrides.excerpt ?? content.slice(0, 200);

  return {
    PK: `BLOG#${id}`,
    SK: `BLOG#${id}`,
    GSI1PK: 'BLOG#PUBLISHED',
    GSI1SK: now,
    id,
    title,
    slug,
    content,
    excerpt,
    heroImageUrl: '',
    metaTitle: title,
    metaDescription: excerpt,
    ogImageUrl: '',
    authorName: 'operator@tropicoretreat.com',
    authorOrg: 'Tropico Retreats',
    status: 'published',
    publishedAt: now,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * Builds a mock SlugIndexItem entity as it would be stored in DynamoDB.
 * Conforms to the BlogPostSchema contract for slug uniqueness.
 *
 * @param overrides - Field overrides for specific test scenarios
 */
export function createMockSlugIndex(
  overrides: {
    slug?: string;
    blogId?: string;
  } = {}
): SlugIndexItem {
  const slug = overrides.slug ?? 'test-blog-post';
  const blogId = overrides.blogId ?? '01HTEST_BLOG_0001';

  return {
    PK: `SLUG#${slug}`,
    SK: `SLUG#${slug}`,
    slug,
    blogId,
  };
}

// ---------------------------------------------------------------------------
// Image Pipeline factories (Slice S-2)
// ---------------------------------------------------------------------------

/** Counter for unique image filenames across factory calls */
let imageUploadCounter = 0;

/**
 * Builds a valid image upload presign request body.
 * All fields comply with ImageUploadSchema constraints.
 *
 * @param overrides - Field overrides to test validation boundaries
 */
export function createImageUploadRequest(
  overrides: {
    filename?: string;
    contentType?: string;
    purpose?: string;
  } = {}
): {
  filename: string;
  contentType: string;
  purpose: string;
} {
  imageUploadCounter++;
  return {
    filename: `test-image-${imageUploadCounter}.jpg`,
    contentType: 'image/jpeg',
    purpose: 'hero',
    ...overrides,
  };
}

/**
 * Builds a mock S3 event for the image processor Lambda.
 * Simulates an S3 PutObject event on the uploads/ prefix of the blog images bucket.
 *
 * @param overrides - Override bucket name, object key, or other fields
 */
export function createMockImageS3Event(
  overrides: {
    bucketName?: string;
    objectKey?: string;
    eventName?: string;
    objectSize?: number;
  } = {}
): S3Event {
  imageUploadCounter++;
  const {
    bucketName = 'tropico-blog-images-test',
    objectKey = `uploads/01HTESTULID${String(imageUploadCounter).padStart(4, '0')}/photo.jpg`,
    eventName = 'ObjectCreated:Put',
    objectSize = 500000,
  } = overrides;

  return createMockS3Event({ bucketName, objectKey, eventName, objectSize });
}

/**
 * Builds a mock event with NO JWT authorizer context, simulating a request
 * that bypasses API Gateway auth (e.g., direct Lambda invocation, or
 * misconfigured API Gateway route without authorizer).
 */
// ---------------------------------------------------------------------------
// SEO Settings factories (Slice S-3)
// ---------------------------------------------------------------------------

/**
 * Represents a SeoOverrideItem as stored in DynamoDB.
 * Mirrors the SeoOverrideSchema contract.
 */
export interface SeoOverrideItem {
  PK: string;
  SK: string;
  GSI1PK: string;
  GSI1SK: string;
  path: string;
  metaTitle: string;
  metaDescription: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImageUrl?: string;
  keywords?: string;
  updatedAt: string;
  updatedBy: string;
}

/**
 * Builds a valid SEO override upsert request body.
 * All fields comply with SeoOverrideSchema constraints.
 *
 * @param overrides - Field overrides to test validation boundaries
 */
export function createSeoOverrideRequest(
  overrides: {
    metaTitle?: string;
    metaDescription?: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImageUrl?: string;
    keywords?: string;
  } = {}
): {
  metaTitle: string;
  metaDescription: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImageUrl?: string;
  keywords?: string;
} {
  return {
    metaTitle: 'About Tropico Retreats',
    metaDescription: 'Learn about our luxury retreat experiences in the Caribbean.',
    ...overrides,
  };
}

/**
 * Builds a mock SeoOverrideItem entity as it would be returned from DynamoDB.
 * Conforms to the SeoOverrideSchema contract.
 *
 * @param overrides - Field overrides for specific test scenarios
 */
export function createMockSeoOverride(
  overrides: Partial<SeoOverrideItem> = {}
): SeoOverrideItem {
  const path = overrides.path ?? '/about';
  const now = overrides.updatedAt ?? '2026-03-01T12:00:00.000Z';

  return {
    PK: `SEO#${path}`,
    SK: `SEO#${path}`,
    GSI1PK: 'SEO#ALL',
    GSI1SK: path,
    path,
    metaTitle: 'About Tropico Retreats',
    metaDescription: 'Learn about our luxury retreat experiences in the Caribbean.',
    ogTitle: 'About Tropico Retreats',
    ogDescription: 'Learn about our luxury retreat experiences in the Caribbean.',
    updatedAt: now,
    updatedBy: 'operator@tropicoretreat.com',
    ...overrides,
  };
}

export function createUnauthenticatedApiEvent(
  overrides: {
    method?: string;
    path?: string;
    body?: string | null;
  } = {}
) {
  const {
    method = 'POST',
    path = '/blog/images',
    body = null,
  } = overrides;

  return {
    version: '2.0',
    routeKey: `${method} ${path}`,
    rawPath: path,
    rawQueryString: '',
    headers: { 'content-type': 'application/json' },
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
      // NO authorizer field -- simulates missing JWT
    },
    body: body ?? undefined,
    isBase64Encoded: false,
  };
}
