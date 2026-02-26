# Test Setup

## Install Required Dependencies

The backend has no test runner yet. Run the following from the `backend/` directory:

```bash
npm install --save-dev vitest @vitest/coverage-v8
```

Then add a `test` script to `backend/package.json`:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

## Running Tests

```bash
# Run all tests once
npm test

# Run in watch mode during development
npm run test:watch

# Run with coverage report
npm run test:coverage
```

## Environment Variables

Tests set the following environment variables automatically via `vitest.config.ts`:

| Variable        | Test Value                                    | Purpose                   |
|----------------|-----------------------------------------------|---------------------------|
| TABLE_NAME      | test-tropico-leads                            | DynamoDB table name       |
| FROM_EMAIL_CRM  | Tropico Retreats <team@tropicoretreat.com>    | SES sender address        |
| AWS_REGION      | us-east-1                                     | AWS region (mocked)       |

AWS SDK calls are mocked at the module level using `vi.mock()`. No real AWS credentials
are required to run the tests.

## Implementation File

The integration tests import from `backend/src/handlers/emailAdmin.ts`.
This file does not exist yet — that is intentional. The tests will fail until
the implementation is written. This follows the TDD contract: tests are the
specification, implementation is what makes them green.

## Notes

- All AWS SDK calls are mocked. No real DynamoDB or SES is contacted.
- Tests invoke the Lambda handler directly (no HTTP server, no API Gateway).
- Each test is fully isolated with `beforeEach` resetting all mocks.
