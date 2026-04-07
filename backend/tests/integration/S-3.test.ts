import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockDynamoDBSend, resetAllMocks } from '../fixtures/mocks.js';
import {
  createMockApiEvent,
  createSeoOverrideRequest,
  createMockSeoOverride,
} from '../fixtures/factories.js';

// ---------------------------------------------------------------------------
// Module mocks — must be declared before handler import
// ---------------------------------------------------------------------------

vi.mock('@aws-sdk/client-dynamodb', () => {
  const DynamoDBClient = vi.fn().mockImplementation(() => ({}));
  return { DynamoDBClient };
});

vi.mock('@aws-sdk/lib-dynamodb', () => {
  const DynamoDBDocumentClient = {
    from: vi.fn().mockReturnValue({ send: mockDynamoDBSend }),
  };
  function PutCommand(input: unknown) { return { input }; }
  function QueryCommand(input: unknown) { return { input }; }
  return {
    DynamoDBDocumentClient,
    PutCommand,
    QueryCommand,
  };
});

// ---------------------------------------------------------------------------
// Import handler after mocks
// ---------------------------------------------------------------------------

const { handler } = await import('../../src/handlers/seoAdmin.js');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setupDynamoDBForSeoList(
  overrides: Array<Record<string, unknown>> = []
): void {
  mockDynamoDBSend.mockResolvedValueOnce({
    Items: overrides,
    Count: overrides.length,
    ScannedCount: overrides.length,
    $metadata: { httpStatusCode: 200 },
  });
}

function setupDynamoDBForSeoUpsert(): void {
  // PutCommand succeeds
  mockDynamoDBSend.mockResolvedValueOnce({
    $metadata: { httpStatusCode: 200 },
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SEO Settings (S-3)', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  // =========================================================================
  // GET /seo/settings (GetSeoSettings)
  // =========================================================================

  describe('GET /seo/settings (GetSeoSettings)', () => {
    describe('success', () => {
      it('should return all SEO overrides as an array', async () => {
        const override1 = createMockSeoOverride({ path: '/about' });
        const override2 = createMockSeoOverride({ path: '/blog/my-post' });
        setupDynamoDBForSeoList([override1, override2]);

        const event = createMockApiEvent({
          method: 'GET',
          path: '/seo/settings',
          body: null,
        });
        const response = await handler(event);

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body as string);
        expect(body.settings).toHaveLength(2);
        expect(body.settings[0].path).toBe('/about');
        expect(body.settings[1].path).toBe('/blog/my-post');
      });

      it('should return empty array when no overrides exist', async () => {
        setupDynamoDBForSeoList([]);

        const event = createMockApiEvent({
          method: 'GET',
          path: '/seo/settings',
          body: null,
        });
        const response = await handler(event);

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body as string);
        expect(body.settings).toEqual([]);
      });

      it('should strip DynamoDB key fields from response', async () => {
        const override = createMockSeoOverride({ path: '/about' });
        setupDynamoDBForSeoList([override]);

        const event = createMockApiEvent({
          method: 'GET',
          path: '/seo/settings',
          body: null,
        });
        const response = await handler(event);

        const body = JSON.parse(response.body as string);
        const setting = body.settings[0];
        expect(setting).not.toHaveProperty('PK');
        expect(setting).not.toHaveProperty('SK');
        expect(setting).not.toHaveProperty('GSI1PK');
        expect(setting).not.toHaveProperty('GSI1SK');
        expect(setting).toHaveProperty('path');
        expect(setting).toHaveProperty('metaTitle');
        expect(setting).toHaveProperty('metaDescription');
      });
    });

    describe('error handling', () => {
      it('should return 500 when DynamoDB fails', async () => {
        mockDynamoDBSend.mockRejectedValueOnce(new Error('DynamoDB unavailable'));

        const event = createMockApiEvent({
          method: 'GET',
          path: '/seo/settings',
          body: null,
        });
        const response = await handler(event);

        expect(response.statusCode).toBe(500);
      });
    });
  });

  // =========================================================================
  // PUT /seo/settings/{path} (UpsertSeoOverride)
  // =========================================================================

  describe('PUT /seo/settings/{path} (UpsertSeoOverride)', () => {
    describe('success', () => {
      it('should create a new SEO override', async () => {
        setupDynamoDBForSeoUpsert();

        const event = createMockApiEvent({
          method: 'PUT',
          path: '/seo/settings/%2Fabout',
          body: JSON.stringify(createSeoOverrideRequest()),
          pathParameters: { proxy: '%2Fabout' },
        });
        const response = await handler(event);

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body as string);
        expect(body.setting.path).toBe('/about');
        expect(body.setting.metaTitle).toBe('About Tropico Retreats');
        expect(body.setting.metaDescription).toBe('Learn about our luxury retreat experiences in the Caribbean.');
      });

      it('should extract updatedBy from JWT claims email', async () => {
        setupDynamoDBForSeoUpsert();

        const event = createMockApiEvent({
          method: 'PUT',
          path: '/seo/settings/%2Fabout',
          body: JSON.stringify(createSeoOverrideRequest()),
          pathParameters: { proxy: '%2Fabout' },
          email: 'admin@tropicoretreat.com',
        });
        const response = await handler(event);

        const body = JSON.parse(response.body as string);
        expect(body.setting.updatedBy).toBe('admin@tropicoretreat.com');
      });

      it('should default ogTitle to metaTitle when not provided', async () => {
        setupDynamoDBForSeoUpsert();

        const request = createSeoOverrideRequest();
        delete (request as Record<string, unknown>).ogTitle;

        const event = createMockApiEvent({
          method: 'PUT',
          path: '/seo/settings/%2Fabout',
          body: JSON.stringify(request),
          pathParameters: { proxy: '%2Fabout' },
        });
        const response = await handler(event);

        const body = JSON.parse(response.body as string);
        expect(body.setting.ogTitle).toBe(request.metaTitle);
      });

      it('should default ogDescription to metaDescription when not provided', async () => {
        setupDynamoDBForSeoUpsert();

        const request = createSeoOverrideRequest();
        delete (request as Record<string, unknown>).ogDescription;

        const event = createMockApiEvent({
          method: 'PUT',
          path: '/seo/settings/%2Fabout',
          body: JSON.stringify(request),
          pathParameters: { proxy: '%2Fabout' },
        });
        const response = await handler(event);

        const body = JSON.parse(response.body as string);
        expect(body.setting.ogDescription).toBe(request.metaDescription);
      });

      it('should decode URL-encoded path parameter', async () => {
        setupDynamoDBForSeoUpsert();

        const event = createMockApiEvent({
          method: 'PUT',
          path: '/seo/settings/%2Fblog%2Fmy-post',
          body: JSON.stringify(createSeoOverrideRequest()),
          pathParameters: { proxy: '%2Fblog%2Fmy-post' },
        });
        const response = await handler(event);

        const body = JSON.parse(response.body as string);
        expect(body.setting.path).toBe('/blog/my-post');
      });

      it('should write correct DynamoDB item with SEO# prefix', async () => {
        setupDynamoDBForSeoUpsert();

        const event = createMockApiEvent({
          method: 'PUT',
          path: '/seo/settings/%2Fabout',
          body: JSON.stringify(createSeoOverrideRequest()),
          pathParameters: { proxy: '%2Fabout' },
        });
        await handler(event);

        const putCall = mockDynamoDBSend.mock.calls[0][0];
        const item = putCall.input.Item;
        expect(item.PK).toBe('SEO#/about');
        expect(item.SK).toBe('SEO#/about');
        expect(item.GSI1PK).toBe('SEO#ALL');
        expect(item.GSI1SK).toBe('/about');
      });

      it('should set updatedAt timestamp', async () => {
        setupDynamoDBForSeoUpsert();

        const event = createMockApiEvent({
          method: 'PUT',
          path: '/seo/settings/%2Fabout',
          body: JSON.stringify(createSeoOverrideRequest()),
          pathParameters: { proxy: '%2Fabout' },
        });
        const response = await handler(event);

        const body = JSON.parse(response.body as string);
        expect(body.setting.updatedAt).toBeDefined();
        expect(new Date(body.setting.updatedAt).toISOString()).toBe(body.setting.updatedAt);
      });
    });

    describe('validation', () => {
      it('should return 400 when metaTitle exceeds 70 characters', async () => {
        const event = createMockApiEvent({
          method: 'PUT',
          path: '/seo/settings/%2Fabout',
          body: JSON.stringify(createSeoOverrideRequest({ metaTitle: 'A'.repeat(71) })),
          pathParameters: { proxy: '%2Fabout' },
        });
        const response = await handler(event);

        expect(response.statusCode).toBe(400);
      });

      it('should return 400 when metaDescription exceeds 160 characters', async () => {
        const event = createMockApiEvent({
          method: 'PUT',
          path: '/seo/settings/%2Fabout',
          body: JSON.stringify(createSeoOverrideRequest({ metaDescription: 'A'.repeat(161) })),
          pathParameters: { proxy: '%2Fabout' },
        });
        const response = await handler(event);

        expect(response.statusCode).toBe(400);
      });

      it('should return 400 when metaTitle is empty', async () => {
        const event = createMockApiEvent({
          method: 'PUT',
          path: '/seo/settings/%2Fabout',
          body: JSON.stringify(createSeoOverrideRequest({ metaTitle: '' })),
          pathParameters: { proxy: '%2Fabout' },
        });
        const response = await handler(event);

        expect(response.statusCode).toBe(400);
      });

      it('should return 400 when metaDescription is empty', async () => {
        const event = createMockApiEvent({
          method: 'PUT',
          path: '/seo/settings/%2Fabout',
          body: JSON.stringify(createSeoOverrideRequest({ metaDescription: '' })),
          pathParameters: { proxy: '%2Fabout' },
        });
        const response = await handler(event);

        expect(response.statusCode).toBe(400);
      });

      it('should return 400 when body is missing', async () => {
        const event = createMockApiEvent({
          method: 'PUT',
          path: '/seo/settings/%2Fabout',
          body: null,
          pathParameters: { proxy: '%2Fabout' },
        });
        const response = await handler(event);

        expect(response.statusCode).toBe(400);
      });

      it('should return 400 when body is invalid JSON', async () => {
        const event = createMockApiEvent({
          method: 'PUT',
          path: '/seo/settings/%2Fabout',
          body: 'not-json',
          pathParameters: { proxy: '%2Fabout' },
        });
        const response = await handler(event);

        expect(response.statusCode).toBe(400);
      });

      it('should return 400 when ogImageUrl is not a valid URL', async () => {
        const event = createMockApiEvent({
          method: 'PUT',
          path: '/seo/settings/%2Fabout',
          body: JSON.stringify(createSeoOverrideRequest({ ogImageUrl: 'not-a-url' })),
          pathParameters: { proxy: '%2Fabout' },
        });
        const response = await handler(event);

        expect(response.statusCode).toBe(400);
      });

      it('should return 400 when keywords exceeds 500 characters', async () => {
        const event = createMockApiEvent({
          method: 'PUT',
          path: '/seo/settings/%2Fabout',
          body: JSON.stringify(createSeoOverrideRequest({ keywords: 'A'.repeat(501) })),
          pathParameters: { proxy: '%2Fabout' },
        });
        const response = await handler(event);

        expect(response.statusCode).toBe(400);
      });

      it('should accept valid optional fields', async () => {
        setupDynamoDBForSeoUpsert();

        const event = createMockApiEvent({
          method: 'PUT',
          path: '/seo/settings/%2Fabout',
          body: JSON.stringify(createSeoOverrideRequest({
            ogTitle: 'OG Title',
            ogDescription: 'OG Description',
            ogImageUrl: 'https://images.tropicoretreat.com/og.webp',
            keywords: 'retreats, caribbean, luxury',
          })),
          pathParameters: { proxy: '%2Fabout' },
        });
        const response = await handler(event);

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body as string);
        expect(body.setting.ogTitle).toBe('OG Title');
        expect(body.setting.keywords).toBe('retreats, caribbean, luxury');
      });
    });

    describe('error handling', () => {
      it('should return 500 when DynamoDB fails', async () => {
        mockDynamoDBSend.mockRejectedValueOnce(new Error('DynamoDB unavailable'));

        const event = createMockApiEvent({
          method: 'PUT',
          path: '/seo/settings/%2Fabout',
          body: JSON.stringify(createSeoOverrideRequest()),
          pathParameters: { proxy: '%2Fabout' },
        });
        const response = await handler(event);

        expect(response.statusCode).toBe(500);
      });
    });
  });

  // =========================================================================
  // Route matching
  // =========================================================================

  describe('route matching', () => {
    it('should return 405 for unsupported methods', async () => {
      const event = createMockApiEvent({
        method: 'DELETE',
        path: '/seo/settings/%2Fabout',
        body: null,
        pathParameters: { proxy: '%2Fabout' },
      });
      const response = await handler(event);

      expect(response.statusCode).toBe(405);
    });

    it('should return 405 for POST /seo/settings', async () => {
      const event = createMockApiEvent({
        method: 'POST',
        path: '/seo/settings',
        body: JSON.stringify(createSeoOverrideRequest()),
      });
      const response = await handler(event);

      expect(response.statusCode).toBe(405);
    });
  });
});
