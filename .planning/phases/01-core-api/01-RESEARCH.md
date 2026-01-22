# Phase 1: Core API - Research

**Researched:** 2026-01-22
**Domain:** AWS Serverless (API Gateway HTTP API + Lambda + DynamoDB)
**Confidence:** HIGH

## Summary

Phase 1 establishes the foundation for the lead management system: an API Gateway HTTP API endpoint that receives contact form submissions and persists them to DynamoDB via a Lambda function. The research confirms the prior decisions (HTTP API over REST, DynamoDB On-Demand, Terraform, Node.js 22.x ARM64) are optimal for this low-volume, high-value use case.

The standard approach is to use Terraform's native AWS provider resources (`aws_apigatewayv2_api`, `aws_lambda_function`, `aws_dynamodb_table`) rather than third-party modules, keeping infrastructure simple and maintainable. The Lambda function should be written in TypeScript, bundled with esbuild, and use AWS SDK v3 with the DynamoDB Document Client for simplified JSON handling.

**Primary recommendation:** Use native Terraform resources for HTTP API + Lambda + DynamoDB, TypeScript with esbuild bundling, Zod for validation, and ULID for sortable unique identifiers.

## Standard Stack

The established libraries and tools for this phase:

### Core Infrastructure (Terraform)

| Resource | Version | Purpose | Why Standard |
|----------|---------|---------|--------------|
| `aws_apigatewayv2_api` | AWS Provider 5.x | HTTP API definition with CORS | Native, no module overhead |
| `aws_apigatewayv2_stage` | AWS Provider 5.x | API deployment stage (dev/prod) | Required for HTTP API |
| `aws_apigatewayv2_integration` | AWS Provider 5.x | Lambda proxy integration | Standard pattern |
| `aws_apigatewayv2_route` | AWS Provider 5.x | Route definitions (POST /leads) | Standard pattern |
| `aws_lambda_function` | AWS Provider 5.x | Lambda compute | Native, ARM64 support |
| `aws_dynamodb_table` | AWS Provider 5.x | Lead storage | Native, GSI support |

### Lambda Runtime

| Technology | Version | Purpose | Why Standard |
|------------|---------|---------|--------------|
| Node.js | 22.x | Lambda runtime | Latest LTS, 8-11% faster than 20.x |
| ARM64 (Graviton) | - | Architecture | 30-40% lower cost, 15-20% faster |
| TypeScript | 5.8.x | Type safety | Matches existing frontend |
| esbuild | 0.24.x | Bundler | 10-100x faster than webpack |

### Lambda Dependencies

| Package | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@aws-sdk/client-dynamodb` | 3.x | DynamoDB operations | AWS SDK v3 (modular) |
| `@aws-sdk/lib-dynamodb` | 3.x | Document Client | Simplified JSON handling |
| `zod` | 3.x | Schema validation | TypeScript-first, AWS Powertools compatible |
| `ulidx` | 2.x | Unique IDs | Sortable, TypeScript-native, cryptographically secure |

### Dev Dependencies

| Package | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@types/aws-lambda` | Latest | Lambda type definitions | Official types |
| `esbuild` | 0.24.x | TypeScript bundling | Fast, tree-shaking |
| `typescript` | 5.8.x | Compiler | Match frontend |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native TF resources | terraform-aws-modules | Modules add abstraction; native is clearer for simple APIs |
| esbuild | tsc + webpack | esbuild is 10-100x faster |
| Zod | Joi, Yup | Zod has better TypeScript inference |
| ULID | UUIDv7 | Both are sortable; ULID is more established in DynamoDB patterns |
| lib-dynamodb | raw DynamoDB client | Document Client simplifies JSON marshalling |

**Installation (Lambda):**
```bash
npm install @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb zod ulidx
npm install -D @types/aws-lambda esbuild typescript
```

## Architecture Patterns

### Recommended Project Structure

```
infra/
  api/
    main.tf           # API Gateway HTTP API resources
    lambda.tf         # Lambda function resources
    dynamodb.tf       # DynamoDB table resources
    iam.tf            # IAM roles and policies
    variables.tf      # Input variables (environment, etc.)
    outputs.tf        # Output values (API URL, etc.)
  _providers.tf       # Existing AWS provider
  _vars.tf            # Existing variables
  main.tf             # Existing terraform config

backend/
  src/
    handlers/
      createLead.ts   # POST /leads handler
    lib/
      dynamodb.ts     # DynamoDB client singleton
      validation.ts   # Zod schemas
      types.ts        # TypeScript types
    utils/
      response.ts     # HTTP response helpers
  package.json
  tsconfig.json
  esbuild.config.js
```

### Pattern 1: Lambda Handler with Zod Validation

**What:** Validate API Gateway event body with Zod schema, return typed data or 400 error.
**When to use:** All API endpoints that receive JSON payloads.
**Example:**
```typescript
// Source: https://docs.aws.amazon.com/lambda/latest/dg/typescript-handler.html
// + https://dev.to/tmanning/validating-typescript-lambda-input-with-zod-1298
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { z } from 'zod';

const LeadSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email(),
  phone: z.string().optional(),
  company: z.string().optional(),
  groupSize: z.string().optional(),
  preferredDates: z.string().optional(),
  destination: z.string().optional(),
  message: z.string().min(1).max(5000),
});

export type LeadInput = z.infer<typeof LeadSchema>;

export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  const body = JSON.parse(event.body ?? '{}');
  const result = LeadSchema.safeParse(body);

  if (!result.success) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: 'Validation failed',
        details: result.error.flatten().fieldErrors,
      }),
    };
  }

  // result.data is fully typed as LeadInput
  // ... persist to DynamoDB
};
```

### Pattern 2: DynamoDB Document Client Singleton

**What:** Initialize SDK client outside handler for reuse across invocations.
**When to use:** All Lambda functions that interact with AWS services.
**Example:**
```typescript
// Source: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_dynamodb_code_examples.html
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

// Initialize outside handler - reused across warm invocations
const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME!;

export const putLead = async (lead: Lead): Promise<void> => {
  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: lead,
    })
  );
};
```

### Pattern 3: ULID for Sortable Primary Keys

**What:** Use ULID for lead IDs to enable time-based sorting without separate timestamp index.
**When to use:** Any entity that benefits from chronological ordering.
**Example:**
```typescript
// Source: https://www.trek10.com/blog/leveraging-ulids-to-create-order-in-unordered-datastores
import { ulid } from 'ulidx';

interface Lead {
  PK: string;           // "LEAD#01HXYZ..."
  SK: string;           // "LEAD#01HXYZ..."
  id: string;           // "01HXYZ..." (ULID)
  status: string;       // "NEW" | "CONTACTED" | "QUOTED" | "WON" | "LOST"
  createdAt: string;    // ISO 8601: "2026-01-22T10:30:00.000Z"
  // ... other fields
}

const createLead = (input: LeadInput): Lead => {
  const id = ulid();
  const now = new Date().toISOString();

  return {
    PK: `LEAD#${id}`,
    SK: `LEAD#${id}`,
    id,
    status: 'NEW',
    createdAt: now,
    updatedAt: now,
    ...input,
  };
};
```

### Pattern 4: HTTP Response Helpers

**What:** Consistent response format with CORS headers.
**When to use:** All Lambda handlers returning HTTP responses.
**Example:**
```typescript
// Note: CORS headers are handled by API Gateway cors_configuration
// Lambda only needs to return the body and status code

export const success = (data: unknown): APIGatewayProxyResultV2 => ({
  statusCode: 200,
  body: JSON.stringify(data),
});

export const created = (data: unknown): APIGatewayProxyResultV2 => ({
  statusCode: 201,
  body: JSON.stringify(data),
});

export const badRequest = (error: string, details?: unknown): APIGatewayProxyResultV2 => ({
  statusCode: 400,
  body: JSON.stringify({ error, details }),
});

export const serverError = (message = 'Internal server error'): APIGatewayProxyResultV2 => ({
  statusCode: 500,
  body: JSON.stringify({ error: message }),
});
```

### Anti-Patterns to Avoid

- **Initializing SDK clients inside handler:** Creates new connection per invocation, increases latency.
- **Using REST API for simple CRUD:** HTTP API is 70% cheaper and simpler for Lambda proxy.
- **Hand-rolling CORS in Lambda:** Configure CORS in API Gateway; it handles OPTIONS automatically.
- **Using `aws-sdk` (v2):** Deprecated; use `@aws-sdk/*` (v3) modular packages.
- **Using Express.js in Lambda:** Unnecessary overhead; use native handler pattern.
- **Provisioned DynamoDB capacity:** Overkill for 25 leads/year; On-Demand is cost-effective.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Unique sortable IDs | Custom timestamp+random | `ulidx` | Handles edge cases, cryptographically secure |
| JSON validation | Manual if/else checks | `zod` | Type inference, clear error messages |
| DynamoDB marshalling | Manual AttributeValue conversion | `@aws-sdk/lib-dynamodb` | Document Client handles all types |
| CORS handling | Manual headers in Lambda | API Gateway `cors_configuration` | Handles OPTIONS, error responses |
| HTTP response format | Inline JSON.stringify | Response helper functions | Consistency, no typos |
| Environment-based naming | String concatenation | Terraform `locals` | Consistent naming, less error-prone |

**Key insight:** At low volume (25 leads/year), simplicity beats optimization. Use libraries that reduce code, not custom solutions that require maintenance.

## Common Pitfalls

### Pitfall 1: CORS Not Working Despite Lambda Headers

**What goes wrong:** CORS errors in browser even though Lambda returns `Access-Control-Allow-Origin`.
**Why it happens:** HTTP API's `cors_configuration` overrides Lambda response headers. API Gateway errors (5xx) also need CORS headers.
**How to avoid:** Configure CORS entirely in API Gateway `cors_configuration` block. Don't add CORS headers in Lambda.
**Warning signs:** Preflight OPTIONS works, but actual request fails; or Lambda 500 error lacks CORS headers.

### Pitfall 2: Environment Variable Not Found in Lambda

**What goes wrong:** `TABLE_NAME` is undefined at runtime.
**Why it happens:** Terraform `environment` block not set, or Lambda not redeployed after change.
**How to avoid:** Always set environment variables in `aws_lambda_function` resource. Use `depends_on` if table is created in same apply.
**Warning signs:** Works locally with hardcoded values, fails in AWS.

### Pitfall 3: DynamoDB Attribute Type Mismatch

**What goes wrong:** `ValidationException: The provided key element does not match the schema`.
**Why it happens:** Using wrong attribute type (e.g., number instead of string) or missing required attributes.
**How to avoid:** Use Document Client (auto-marshalling). Define explicit TypeScript types matching DynamoDB schema.
**Warning signs:** PutItem works, GetItem/Query fails.

### Pitfall 4: Lambda Bundle Too Large

**What goes wrong:** Cold starts are slow (3-5 seconds) or deployment fails (size limit).
**Why it happens:** Bundling all dependencies, including unused AWS SDK modules.
**How to avoid:** Use esbuild with `--external:@aws-sdk/*` (SDK is pre-installed in runtime). Enable tree-shaking.
**Warning signs:** Deployment package > 5MB.

### Pitfall 5: GSI Not Returning Expected Results

**What goes wrong:** Query returns empty even though items exist in base table.
**Why it happens:** GSI is eventually consistent; items may not be replicated yet. Or projection doesn't include needed attributes.
**How to avoid:** Use `projection_type = "ALL"` for initial development. Account for eventual consistency in tests.
**Warning signs:** Query works seconds later, or returns partial attributes.

### Pitfall 6: API Gateway 403 Forbidden

**What goes wrong:** API returns 403 with no body or "Missing Authentication Token".
**Why it happens:** Route doesn't exist (returns 403, not 404), or wrong stage URL.
**How to avoid:** Verify route exists in Terraform. Use `$default` stage or explicit stage name in URL.
**Warning signs:** Works in console test but not from curl/browser.

## Code Examples

Verified patterns from official sources:

### Terraform: HTTP API with CORS

```hcl
# Source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/apigatewayv2_api
# + https://github.com/terraform-aws-modules/terraform-aws-apigateway-v2

resource "aws_apigatewayv2_api" "leads" {
  name          = "tropico-leads-api-${var.environment}"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = var.environment == "prod"
      ? ["https://tropicoretreat.com"]
      : ["http://localhost:3000", "https://tropicoretreat.com"]
    allow_methods = ["POST", "OPTIONS"]
    allow_headers = ["Content-Type", "Authorization"]
    max_age       = 3600
  }

  tags = local.tags
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.leads.id
  name        = "$default"
  auto_deploy = true

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api.arn
    format = jsonencode({
      requestId      = "$context.requestId"
      ip             = "$context.identity.sourceIp"
      requestTime    = "$context.requestTime"
      httpMethod     = "$context.httpMethod"
      routeKey       = "$context.routeKey"
      status         = "$context.status"
      responseLength = "$context.responseLength"
      errorMessage   = "$context.error.message"
    })
  }
}

resource "aws_apigatewayv2_integration" "create_lead" {
  api_id             = aws_apigatewayv2_api.leads.id
  integration_type   = "AWS_PROXY"
  integration_method = "POST"
  integration_uri    = aws_lambda_function.create_lead.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "create_lead" {
  api_id    = aws_apigatewayv2_api.leads.id
  route_key = "POST /leads"
  target    = "integrations/${aws_apigatewayv2_integration.create_lead.id}"
}
```

### Terraform: Lambda Function with ARM64

```hcl
# Source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function
# + https://learn.arm.com/learning-paths/servers-and-cloud-computing/lambda_functions/nodejs_deployment/

resource "aws_lambda_function" "create_lead" {
  filename         = data.archive_file.lambda.output_path
  function_name    = "tropico-create-lead-${var.environment}"
  role             = aws_iam_role.lambda.arn
  handler          = "index.handler"
  source_code_hash = data.archive_file.lambda.output_base64sha256
  runtime          = "nodejs22.x"
  architectures    = ["arm64"]
  memory_size      = 256
  timeout          = 30

  environment {
    variables = {
      TABLE_NAME  = aws_dynamodb_table.leads.name
      ENVIRONMENT = var.environment
    }
  }

  tags = local.tags
}

resource "aws_lambda_permission" "api" {
  statement_id  = "AllowAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.create_lead.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.leads.execution_arn}/*/*"
}
```

### Terraform: DynamoDB with Status GSI

```hcl
# Source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/dynamodb_table

resource "aws_dynamodb_table" "leads" {
  name         = "tropico-leads-${var.environment}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "PK"
  range_key    = "SK"

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  attribute {
    name = "GSI1PK"
    type = "S"
  }

  attribute {
    name = "GSI1SK"
    type = "S"
  }

  global_secondary_index {
    name            = "GSI1"
    hash_key        = "GSI1PK"
    range_key       = "GSI1SK"
    projection_type = "ALL"
  }

  tags = local.tags
}

# GSI Design:
# GSI1PK = "STATUS#NEW" | "STATUS#CONTACTED" | etc.
# GSI1SK = createdAt (ISO 8601)
# Enables: "Get all NEW leads sorted by creation date"
```

### Lambda: Complete Handler

```typescript
// Source: https://docs.aws.amazon.com/lambda/latest/dg/typescript-handler.html
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { ulid } from 'ulidx';
import { z } from 'zod';

// Initialize outside handler
const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME!;

// Validation schema
const LeadSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email(),
  phone: z.string().max(50).optional(),
  company: z.string().max(200).optional(),
  groupSize: z.string().max(20).optional(),
  preferredDates: z.string().max(100).optional(),
  destination: z.string().max(50).optional(),
  message: z.string().min(1).max(5000),
});

export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  try {
    // Parse and validate
    const body = JSON.parse(event.body ?? '{}');
    const validation = LeadSchema.safeParse(body);

    if (!validation.success) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Validation failed',
          details: validation.error.flatten().fieldErrors,
        }),
      };
    }

    // Create lead with ULID
    const id = ulid();
    const now = new Date().toISOString();
    const lead = {
      PK: `LEAD#${id}`,
      SK: `LEAD#${id}`,
      GSI1PK: 'STATUS#NEW',
      GSI1SK: now,
      id,
      status: 'NEW',
      createdAt: now,
      updatedAt: now,
      ...validation.data,
    };

    // Persist to DynamoDB
    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: lead,
      })
    );

    return {
      statusCode: 201,
      body: JSON.stringify({ id, message: 'Lead created successfully' }),
    };
  } catch (error) {
    console.error('Error creating lead:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
```

### esbuild Configuration

```javascript
// esbuild.config.js
// Source: https://cajuncodemonkey.com/posts/bundles-for-aws-lambda-with-esbuild/
const esbuild = require('esbuild');

esbuild.build({
  entryPoints: ['src/handlers/createLead.ts'],
  bundle: true,
  minify: true,
  sourcemap: true,
  platform: 'node',
  target: 'node22',
  outfile: 'dist/index.js',
  external: ['@aws-sdk/*'], // AWS SDK is pre-installed in Lambda runtime
}).catch(() => process.exit(1));
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Node.js 20.x | Node.js 22.x | Nov 2024 | 8-11% faster, new features |
| x86_64 | ARM64 (Graviton) | 2020 | 30-40% cost reduction |
| REST API | HTTP API | 2019 | 70% cost reduction |
| AWS SDK v2 | AWS SDK v3 | 2020 | Modular, smaller bundles |
| uuid (v4) | ULID or UUIDv7 | 2024 | Sortable identifiers |
| Callback handlers | Async/await handlers | 2018 | Cleaner code |

**Deprecated/outdated:**
- **Node.js 20.x**: EOL April 30, 2026 in Lambda; no new functions after June 1, 2026
- **AWS SDK v2**: Deprecated; use v3 for new projects
- **REST API for simple Lambda proxies**: HTTP API is cheaper and simpler
- **Callback-style Lambda handlers**: Deprecated from Node.js 24; use async/await

## Open Questions

Things that couldn't be fully resolved:

1. **esbuild vs native Terraform bundling**
   - What we know: esbuild is standard for TypeScript Lambda bundling
   - What's unclear: Whether to use `archive_file` + external build script or `terraform-aws-lambda` module with built-in bundling
   - Recommendation: Use external build script (`npm run build`) + `archive_file` for simplicity and control

2. **Contact form field mapping**
   - What we know: Existing form has fields: firstName, lastName, email, phone, company, groupSize, preferredDates, destination, message
   - What's unclear: Which fields are truly required vs optional for MVP
   - Recommendation: Make firstName, lastName, email, message required; others optional

## Sources

### Primary (HIGH confidence)
- [AWS Lambda TypeScript Handler Documentation](https://docs.aws.amazon.com/lambda/latest/dg/typescript-handler.html)
- [AWS SDK v3 DynamoDB Examples](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_dynamodb_code_examples.html)
- [AWS Node.js 22 Runtime Announcement](https://aws.amazon.com/blogs/compute/node-js-22-runtime-now-available-in-aws-lambda/)
- [API Gateway HTTP API CORS Documentation](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-cors.html)
- [Terraform AWS Provider - apigatewayv2_api](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/apigatewayv2_api)
- [Terraform AWS Provider - lambda_function](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function)
- [Terraform AWS Provider - dynamodb_table](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/dynamodb_table)

### Secondary (MEDIUM confidence)
- [HashiCorp Lambda API Gateway Tutorial](https://developer.hashicorp.com/terraform/tutorials/aws/lambda-api-gateway)
- [terraform-aws-modules/terraform-aws-apigateway-v2](https://github.com/terraform-aws-modules/terraform-aws-apigateway-v2)
- [Zod Documentation](https://zod.dev/)
- [ulidx npm Package](https://www.npmjs.com/package/ulidx)
- [ARM64 vs x86_64 Lambda Performance Comparison](https://chrisebert.net/comparing-aws-lambda-arm64-vs-x86_64-performance-across-multiple-runtimes-in-late-2025/)
- [AWS Powertools Parser (Zod)](https://docs.aws.amazon.com/powertools/typescript/2.14.0/utilities/parser/)

### Tertiary (LOW confidence)
- Community blog posts on esbuild bundling patterns
- DynamoDB single-table design discussions

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All based on AWS official documentation and Terraform registry
- Architecture: HIGH - Patterns verified with official AWS examples
- Pitfalls: MEDIUM - Based on community experience and AWS best practices
- Code examples: HIGH - Derived from official documentation with minor adaptation

**Research date:** 2026-01-22
**Valid until:** 2026-02-22 (30 days - stable domain)
