import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  QueryCommand,
  TransactWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import { ulid } from 'ulidx';
import {
  CreateBlogPostSchema,
  UpdateBlogPostSchema,
} from '../lib/validation.js';
import type { BlogPostItem, SlugIndexItem } from '../lib/types.js';
import {
  created,
  ok,
  badRequest,
  serverError,
  notFound,
  conflict,
  unauthorized,
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
const docClient = DynamoDBDocumentClient.from(
  dynamoDBRawClient as Parameters<typeof DynamoDBDocumentClient.from>[0],
  { marshallOptions: { removeUndefinedValues: true } }
);

const TABLE_NAME = process.env.TABLE_NAME;

// ---------------------------------------------------------------------------
// DynamoDB key field stripping
// ---------------------------------------------------------------------------

const DYNAMO_KEY_FIELDS = ['PK', 'SK', 'GSI1PK', 'GSI1SK'] as const;

function stripKeyFields(
  post: BlogPostItem
): Omit<BlogPostItem, 'PK' | 'SK' | 'GSI1PK' | 'GSI1SK'> {
  const result = { ...post };
  for (const field of DYNAMO_KEY_FIELDS) {
    delete (result as Record<string, unknown>)[field];
  }
  return result;
}

// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------

/**
 * Generates a URL-safe slug from a title.
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Generates a plain-text excerpt from content (first ~200 characters).
 */
function generateExcerpt(content: string): string {
  const plainText = content.replace(/[#*_~`>\[\]()!]/g, '').trim();
  if (plainText.length <= 200) {
    return plainText;
  }
  return plainText.slice(0, 200).trim();
}

/**
 * Checks whether an error is a TransactionCanceledException (slug conflict).
 */
function isSlugConflictError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  return (error as Record<string, unknown>).name === 'TransactionCanceledException';
}

/**
 * Extracts author name from JWT claims.
 */
function extractAuthorName(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): string {
  return (
    (event.requestContext.authorizer?.jwt?.claims?.email as string) ||
    (event.requestContext.authorizer?.jwt?.claims?.username as string) ||
    'Unknown'
  );
}

/**
 * Checks whether valid JWT claims exist on the event.
 * Returns true if the request has a valid authenticated identity.
 */
function hasValidJwtClaims(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): boolean {
  const claims = event.requestContext?.authorizer?.jwt?.claims;
  if (!claims) {
    return false;
  }
  const hasSub = typeof claims.sub === 'string' && claims.sub.length > 0;
  const hasEmail = typeof claims.email === 'string' && claims.email.length > 0;
  const hasUsername =
    typeof claims.username === 'string' && claims.username.length > 0;
  return hasSub || hasEmail || hasUsername;
}

/** ULID pattern: 26 alphanumeric characters (Crockford Base32). */
const ULID_PATTERN = /^[0-9A-Za-z_-]{1,128}$/;

/** Slug pattern: lowercase alphanumeric segments separated by hyphens. */
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Validates a blog post ID matches the expected format.
 * Rejects path traversal, DynamoDB key prefixes, and other injection.
 */
function isValidBlogId(id: string): boolean {
  if (id.includes('..') || id.includes('/')) {
    return false;
  }
  if (id.includes('#')) {
    return false;
  }
  return ULID_PATTERN.test(id);
}

/**
 * Validates a slug matches the expected format.
 * Rejects path traversal, URL-encoded traversal, and DynamoDB key patterns.
 */
function isValidSlug(slug: string): boolean {
  if (slug.includes('..') || slug.includes('#') || slug.includes('%')) {
    return false;
  }
  return SLUG_PATTERN.test(slug);
}

/** Expected keys in a valid blog pagination cursor. */
const VALID_CURSOR_KEYS = new Set(['GSI1PK', 'GSI1SK']);

/**
 * Validates a decoded pagination cursor contains only expected
 * DynamoDB GSI1 keys (GSI1PK, GSI1SK) and no others (PK, SK, etc.).
 */
function isValidCursor(decoded: Record<string, unknown>): boolean {
  const keys = Object.keys(decoded);
  if (keys.length === 0) {
    return false;
  }
  return keys.every((key) => VALID_CURSOR_KEYS.has(key));
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

/**
 * Multi-route Lambda handler for blog CMS operations.
 *
 * Routes:
 * - GET    /blog/posts          -> handleListPosts (public)
 * - GET    /blog/posts/{slug}   -> handleGetPost (public)
 * - POST   /blog/posts          -> handleCreatePost (JWT)
 * - PUT    /blog/posts/{id}     -> handleUpdatePost (JWT)
 * - DELETE /blog/posts/{id}     -> handleDeletePost (JWT)
 */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  const method = event.requestContext.http.method;
  const path = event.requestContext.http.path;

  try {
    if (method === 'GET' && path === '/blog/posts') {
      return await handleListPosts(event);
    }

    if (method === 'GET' && path.startsWith('/blog/posts/')) {
      return await handleGetPost(event);
    }

    if (!hasValidJwtClaims(event)) {
      return unauthorized();
    }

    if (method === 'POST' && path === '/blog/posts') {
      return await handleCreatePost(event);
    }

    if (method === 'PUT' && path.startsWith('/blog/posts/')) {
      return await handleUpdatePost(event);
    }

    if (method === 'DELETE' && path.startsWith('/blog/posts/')) {
      return await handleDeletePost(event);
    }

    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  } catch (error) {
    console.error('Error in blogAdmin handler:', error);
    return serverError();
  }
};

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

/**
 * POST /blog/posts - Create a new blog post.
 */
async function handleCreatePost(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  let body: unknown;
  try {
    const rawBody = event.body;
    if (!rawBody) {
      return badRequest('Request body is required');
    }
    body = JSON.parse(rawBody);
  } catch {
    return badRequest('Invalid JSON in request body');
  }

  const validation = CreateBlogPostSchema.safeParse(body);
  if (!validation.success) {
    return badRequest(
      'Validation failed',
      validation.error.flatten().fieldErrors
    );
  }

  const input = validation.data;
  const now = new Date().toISOString();
  const id = ulid();
  const slug = input.slug ?? generateSlug(input.title);
  const excerpt = generateExcerpt(input.content);
  const authorName = input.authorName || extractAuthorName(event);
  const authorOrg = input.authorOrg ?? 'Tropico Retreats';

  const post: BlogPostItem = buildBlogPostItem({
    id,
    title: input.title,
    slug,
    content: input.content,
    excerpt,
    heroImageUrl: input.heroImageUrl ?? '',
    metaTitle: input.metaTitle ?? input.title,
    metaDescription: input.metaDescription ?? excerpt,
    ogImageUrl: input.ogImageUrl ?? input.heroImageUrl ?? '',
    authorName,
    authorOrg,
    now,
    status: input.status,
  });

  const slugItem: SlugIndexItem = {
    PK: `SLUG#${slug}`,
    SK: `SLUG#${slug}`,
    slug,
    blogId: id,
  };

  try {
    await putBlogPostWithSlug(post, slugItem);
  } catch (error) {
    if (isSlugConflictError(error)) {
      return conflict('Slug already exists');
    }
    throw error;
  }

  return created({ post: stripKeyFields(post) });
}

/**
 * PUT /blog/posts/{id} - Update an existing blog post.
 */
async function handleUpdatePost(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const id = event.pathParameters?.id;
  if (!id) {
    return badRequest('Post ID is required');
  }

  if (!isValidBlogId(id)) {
    return badRequest('Invalid post ID format');
  }

  if (!event.body) {
    return badRequest('Request body is required');
  }

  let body: unknown;
  try {
    body = JSON.parse(event.body);
  } catch {
    return badRequest('Invalid JSON in request body');
  }

  const validation = UpdateBlogPostSchema.safeParse(body);
  if (!validation.success) {
    return badRequest(
      'Validation failed',
      validation.error.flatten().fieldErrors
    );
  }

  const input = validation.data;
  const existingPost = await fetchBlogPost(id);

  if (!existingPost || existingPost.status === 'deleted') {
    return notFound('Post not found');
  }

  const now = new Date().toISOString();
  const updatedPost: BlogPostItem = { ...existingPost };

  applyUpdatesToPost(updatedPost, input);
  updatedPost.updatedAt = now;

  const slugChange =
    input.slug && input.slug !== existingPost.slug
      ? { oldSlug: existingPost.slug, newSlug: input.slug }
      : undefined;

  if (slugChange) {
    updatedPost.slug = slugChange.newSlug;
  }

  try {
    await updateBlogPostInDb(id, updatedPost, slugChange);
  } catch (error) {
    if (isSlugConflictError(error)) {
      return conflict('Slug already exists');
    }
    throw error;
  }

  return ok({ post: stripKeyFields(updatedPost) });
}

/**
 * DELETE /blog/posts/{id} - Soft-delete a blog post.
 */
async function handleDeletePost(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const id = event.pathParameters?.id;
  if (!id) {
    return badRequest('Post ID is required');
  }

  if (!isValidBlogId(id)) {
    return badRequest('Invalid post ID format');
  }

  const existingPost = await fetchBlogPost(id);

  if (!existingPost || existingPost.status === 'deleted') {
    return notFound('Post not found');
  }

  const now = new Date().toISOString();
  const deletedPost: BlogPostItem = {
    ...existingPost,
    status: 'deleted',
    GSI1PK: '',
    GSI1SK: '',
    updatedAt: now,
  };

  await softDeleteBlogPost(existingPost.slug, deletedPost);

  return ok({ message: 'Post deleted' });
}

/**
 * GET /blog/posts - List published blog posts with pagination.
 */
async function handleListPosts(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const queryParams = event.queryStringParameters ?? {};

  const limitParam = queryParams.limit;
  let limit = 20;

  if (limitParam !== undefined) {
    limit = parseInt(limitParam, 10);
    if (isNaN(limit) || limit < 1 || limit > 50) {
      return badRequest('Limit must be between 1 and 50');
    }
  }

  const cursor = queryParams.cursor;
  if (cursor) {
    try {
      const decoded = JSON.parse(
        Buffer.from(cursor, 'base64').toString('utf-8')
      ) as Record<string, unknown>;
      if (!isValidCursor(decoded)) {
        return badRequest('Invalid pagination cursor');
      }
    } catch {
      return badRequest('Invalid pagination cursor');
    }
  }

  const includeDrafts =
    queryParams.includeDrafts === 'true' && hasValidJwtClaims(event);

  let allPosts: BlogPostItem[];
  let nextCursor: string | undefined;

  if (includeDrafts) {
    const [published, drafts] = await Promise.all([
      queryPostsByStatus('BLOG#PUBLISHED', limit),
      queryPostsByStatus('BLOG#DRAFT', limit),
    ]);
    allPosts = [...published.posts, ...drafts.posts].sort(
      (a, b) => b.updatedAt.localeCompare(a.updatedAt)
    );
    nextCursor = undefined;
  } else {
    const result = await queryPostsByStatus('BLOG#PUBLISHED', limit, cursor);
    allPosts = result.posts;
    nextCursor = result.nextCursor;
  }

  const posts = allPosts.map(toListingItem);

  const response: Record<string, unknown> = { posts };
  if (nextCursor) {
    response.nextCursor = nextCursor;
  }

  return ok(response);
}

/**
 * GET /blog/posts/{slug} - Get a single blog post by slug.
 */
async function handleGetPost(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const slug = event.pathParameters?.slug;
  if (!slug) {
    return badRequest('Slug is required');
  }

  if (!isValidSlug(slug)) {
    return badRequest('Invalid slug format');
  }

  const post = await fetchBlogPostBySlug(slug);

  if (!post || post.status === 'deleted') {
    return notFound('Post not found');
  }

  return ok({ post: stripKeyFields(post) });
}

// ---------------------------------------------------------------------------
// DynamoDB operations
// ---------------------------------------------------------------------------

/**
 * Atomically creates a blog post and its slug index.
 */
async function putBlogPostWithSlug(
  post: BlogPostItem,
  slugItem: SlugIndexItem
): Promise<void> {
  const command = tryConstruct(
    TransactWriteCommand as unknown as new (
      ...args: unknown[]
    ) => TransactWriteCommand,
    {
      TransactItems: [
        { Put: { TableName: TABLE_NAME, Item: post } },
        {
          Put: {
            TableName: TABLE_NAME,
            Item: slugItem,
            ConditionExpression: 'attribute_not_exists(PK)',
          },
        },
      ],
    }
  );
  await docClient.send(command);
}

/**
 * Fetches a blog post by ID.
 */
async function fetchBlogPost(id: string): Promise<BlogPostItem | null> {
  const command = tryConstruct(
    GetCommand as unknown as new (...args: unknown[]) => GetCommand,
    {
      TableName: TABLE_NAME,
      Key: { PK: `BLOG#${id}`, SK: `BLOG#${id}` },
    }
  );
  const result = await docClient.send(command);
  return (result.Item as BlogPostItem) ?? null;
}

/**
 * Two-step slug lookup: SLUG#{slug} -> blogId -> BLOG#{blogId}.
 */
async function fetchBlogPostBySlug(
  slug: string
): Promise<BlogPostItem | null> {
  const slugCommand = tryConstruct(
    GetCommand as unknown as new (...args: unknown[]) => GetCommand,
    {
      TableName: TABLE_NAME,
      Key: { PK: `SLUG#${slug}`, SK: `SLUG#${slug}` },
    }
  );
  const slugResult = await docClient.send(slugCommand);
  const slugItem = slugResult.Item as SlugIndexItem | undefined;

  if (!slugItem) {
    return null;
  }

  const postCommand = tryConstruct(
    GetCommand as unknown as new (...args: unknown[]) => GetCommand,
    {
      TableName: TABLE_NAME,
      Key: {
        PK: `BLOG#${slugItem.blogId}`,
        SK: `BLOG#${slugItem.blogId}`,
      },
    }
  );
  const postResult = await docClient.send(postCommand);
  return (postResult.Item as BlogPostItem) ?? null;
}

/**
 * Queries posts by GSI1PK status partition in reverse chronological order.
 */
async function queryPostsByStatus(
  gsi1pk: string,
  limit: number,
  cursor?: string
): Promise<{ posts: BlogPostItem[]; nextCursor?: string }> {
  let exclusiveStartKey: Record<string, unknown> | undefined;
  if (cursor) {
    exclusiveStartKey = JSON.parse(
      Buffer.from(cursor, 'base64').toString('utf-8')
    );
  }

  const command = tryConstruct(
    QueryCommand as unknown as new (...args: unknown[]) => QueryCommand,
    {
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :gsi1pk',
      ExpressionAttributeValues: { ':gsi1pk': gsi1pk },
      ScanIndexForward: false,
      Limit: limit,
      ExclusiveStartKey: exclusiveStartKey,
    }
  );

  const result = await docClient.send(command);
  const posts = (result.Items ?? []) as BlogPostItem[];

  let nextCursor: string | undefined;
  if (result.LastEvaluatedKey) {
    nextCursor = Buffer.from(
      JSON.stringify(result.LastEvaluatedKey)
    ).toString('base64');
  }

  return { posts, nextCursor };
}

/**
 * Updates a blog post, optionally changing the slug atomically.
 */
async function updateBlogPostInDb(
  id: string,
  updatedPost: BlogPostItem,
  slugChange?: { oldSlug: string; newSlug: string }
): Promise<void> {
  const transactItems: Record<string, unknown>[] = [
    { Put: { TableName: TABLE_NAME, Item: updatedPost } },
  ];

  if (slugChange) {
    transactItems.push({
      Delete: {
        TableName: TABLE_NAME,
        Key: {
          PK: `SLUG#${slugChange.oldSlug}`,
          SK: `SLUG#${slugChange.oldSlug}`,
        },
      },
    });
    transactItems.push({
      Put: {
        TableName: TABLE_NAME,
        Item: {
          PK: `SLUG#${slugChange.newSlug}`,
          SK: `SLUG#${slugChange.newSlug}`,
          slug: slugChange.newSlug,
          blogId: id,
        },
        ConditionExpression: 'attribute_not_exists(PK)',
      },
    });
  }

  const command = tryConstruct(
    TransactWriteCommand as unknown as new (
      ...args: unknown[]
    ) => TransactWriteCommand,
    { TransactItems: transactItems }
  );
  await docClient.send(command);
}

/**
 * Soft-deletes a blog post and removes its slug index atomically.
 */
async function softDeleteBlogPost(
  slug: string,
  deletedPost: BlogPostItem
): Promise<void> {
  const command = tryConstruct(
    TransactWriteCommand as unknown as new (
      ...args: unknown[]
    ) => TransactWriteCommand,
    {
      TransactItems: [
        { Put: { TableName: TABLE_NAME, Item: deletedPost } },
        {
          Delete: {
            TableName: TABLE_NAME,
            Key: { PK: `SLUG#${slug}`, SK: `SLUG#${slug}` },
          },
        },
      ],
    }
  );
  await docClient.send(command);
}

// ---------------------------------------------------------------------------
// Helper builders
// ---------------------------------------------------------------------------

interface BuildBlogPostParams {
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
  now: string;
}

function buildBlogPostItem(
  params: BuildBlogPostParams & { status?: 'draft' | 'published' }
): BlogPostItem {
  const status = params.status ?? 'published';
  const isPublished = status === 'published';

  return {
    PK: `BLOG#${params.id}`,
    SK: `BLOG#${params.id}`,
    GSI1PK: isPublished ? 'BLOG#PUBLISHED' : 'BLOG#DRAFT',
    GSI1SK: params.now,
    id: params.id,
    title: params.title,
    slug: params.slug,
    content: params.content,
    excerpt: params.excerpt,
    heroImageUrl: params.heroImageUrl,
    metaTitle: params.metaTitle,
    metaDescription: params.metaDescription,
    ogImageUrl: params.ogImageUrl,
    authorName: params.authorName,
    authorOrg: params.authorOrg,
    status,
    publishedAt: isPublished ? params.now : '',
    createdAt: params.now,
    updatedAt: params.now,
  };
}

/**
 * Applies partial update fields to a blog post object.
 */
function applyUpdatesToPost(
  post: BlogPostItem,
  input: Record<string, unknown>
): void {
  if (input.title !== undefined) {
    post.title = input.title as string;
  }
  if (input.content !== undefined) {
    post.content = input.content as string;
    post.excerpt = generateExcerpt(input.content as string);
  }
  if (input.heroImageUrl !== undefined) {
    post.heroImageUrl = input.heroImageUrl as string;
  }
  if (input.metaTitle !== undefined) {
    post.metaTitle = input.metaTitle as string;
  }
  if (input.metaDescription !== undefined) {
    post.metaDescription = input.metaDescription as string;
  }
  if (input.ogImageUrl !== undefined) {
    post.ogImageUrl = input.ogImageUrl as string;
  }
  if (input.authorName !== undefined) {
    post.authorName = input.authorName as string;
  }
  if (input.authorOrg !== undefined) {
    post.authorOrg = input.authorOrg as string;
  }
  if (input.status !== undefined) {
    const newStatus = input.status as 'draft' | 'published';
    post.status = newStatus;
    if (newStatus === 'published') {
      post.GSI1PK = 'BLOG#PUBLISHED';
      if (!post.publishedAt) {
        post.publishedAt = new Date().toISOString();
      }
    } else {
      post.GSI1PK = 'BLOG#DRAFT';
    }
  }
}

/** Listing fields for the list endpoint (no content, no DynamoDB keys). */
const LISTING_FIELDS = [
  'id',
  'title',
  'slug',
  'excerpt',
  'heroImageUrl',
  'authorName',
  'authorOrg',
  'status',
  'publishedAt',
  'createdAt',
  'updatedAt',
] as const;

function toListingItem(
  post: BlogPostItem
): Record<string, unknown> {
  const listing: Record<string, unknown> = {};
  for (const field of LISTING_FIELDS) {
    listing[field] = post[field];
  }
  return listing;
}
