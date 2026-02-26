import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    /**
     * Use Node environment for Lambda handler tests.
     * Handlers run in Node.js 22, not a browser context.
     */
    environment: 'node',

    /**
     * ESM is required — the backend uses "type": "module" in package.json
     * and all source files use .js extensions in imports.
     */
    pool: 'forks',

    /**
     * Resolve .js extension imports to .ts source files.
     * The backend uses NodeNext module resolution, which requires .js extensions
     * in TypeScript imports. Vitest needs to map those back to .ts during testing.
     */
    resolve: {
      conditions: ['import', 'node', 'default'],
    },

    /**
     * Global test setup: environment variables required by handlers.
     * Individual test files can override these in beforeEach/beforeAll.
     */
    env: {
      TABLE_NAME: 'test-tropico-leads',
      FROM_EMAIL_CRM: 'Tropico Retreats <team@tropicoretreat.com>',
      AWS_REGION: 'us-east-1',
    },

    /**
     * Coverage configuration for future use.
     */
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts'],
    },
  },
});
