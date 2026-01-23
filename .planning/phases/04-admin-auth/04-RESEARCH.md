# Phase 4: Admin Auth - Research

**Researched:** 2026-01-23
**Domain:** AWS Cognito authentication with API Gateway HTTP API JWT authorizer
**Confidence:** HIGH

## Summary

This research covers implementing secure authentication for the admin dashboard using AWS Cognito User Pool with API Gateway HTTP API JWT authorizer. The stack leverages native JWT support in HTTP APIs (70% cheaper than REST APIs) and the AWS Amplify JavaScript SDK v6 for frontend integration.

The approach involves: (1) Cognito User Pool for user management and authentication, (2) API Gateway JWT authorizer for protecting backend routes, (3) Amplify v6 for React frontend auth flows. Identity Pool is NOT required for this phase since the admin dashboard only needs API access (JWT tokens), not direct AWS resource access (temporary credentials).

**Primary recommendation:** Use Cognito User Pool with admin-created users only (no public sign-up), API Gateway native JWT authorizer, and Amplify v6 functional APIs for frontend authentication. Configure 30-day refresh tokens and 1-hour access tokens for session persistence.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| AWS Cognito User Pool | - | User directory, authentication | Managed auth, scales to zero cost at low volume |
| API Gateway HTTP API | v2 | JWT authorization | Native JWT support, 70% cheaper than REST |
| aws-amplify | v6.x | Frontend auth SDK | Official AWS SDK, tree-shakeable, 59% smaller bundles |
| @aws-amplify/ui-react | v6.x | Pre-built auth UI components | Accelerates development with Authenticator component |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Cognito Identity Pool | - | Temporary AWS credentials | Only if admin needs direct S3/DynamoDB access (NOT needed for API-only access) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Cognito Hosted UI | Custom sign-in form | Custom form = more work but full control; Hosted UI = faster but limited customization |
| Amplify SDK | Direct Cognito APIs | Direct APIs = more control; Amplify = easier token management |
| JWT Authorizer | Lambda Authorizer | Lambda = custom logic; JWT = native, faster, cheaper |

**Installation:**
```bash
npm install aws-amplify @aws-amplify/ui-react
```

## Architecture Patterns

### Recommended Project Structure
```
infra/api/
├── cognito.tf           # User Pool, App Client
├── main.tf              # Existing API Gateway (add authorizer)
└── variables.tf         # Add auth-related variables

admin/                   # Admin dashboard (separate from marketing site)
├── src/
│   ├── config/
│   │   └── amplify.ts   # Amplify.configure() with Cognito settings
│   ├── components/
│   │   └── AuthProvider.tsx  # Auth context wrapper
│   └── pages/
│       ├── Login.tsx    # Sign-in page
│       └── Dashboard.tsx # Protected route
└── package.json
```

### Pattern 1: JWT Authorizer with Cognito
**What:** API Gateway validates JWT tokens against Cognito User Pool issuer
**When to use:** Protecting API routes that require authenticated users
**Example:**
```hcl
# Source: https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-jwt-authorizer.html
resource "aws_apigatewayv2_authorizer" "cognito" {
  api_id           = aws_apigatewayv2_api.leads.id
  authorizer_type  = "JWT"
  identity_sources = ["$request.header.Authorization"]
  name             = "cognito-authorizer-${var.environment}"

  jwt_configuration {
    audience = [aws_cognito_user_pool_client.admin.id]
    issuer   = "https://${aws_cognito_user_pool.admin.endpoint}"
  }
}

# Attach to protected route
resource "aws_apigatewayv2_route" "get_leads" {
  api_id             = aws_apigatewayv2_api.leads.id
  route_key          = "GET /leads"
  target             = "integrations/${aws_apigatewayv2_integration.get_leads.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}
```

### Pattern 2: Amplify v6 Manual Configuration
**What:** Configure Amplify to use existing (Terraform-provisioned) Cognito resources
**When to use:** When Cognito is managed by Terraform, not Amplify CLI
**Example:**
```typescript
// Source: https://docs.amplify.aws/react/build-a-backend/auth/use-existing-cognito-resources/
import { Amplify, type ResourcesConfig } from 'aws-amplify';

const authConfig: ResourcesConfig = {
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
      userPoolClientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
    },
  },
};

Amplify.configure(authConfig);
```

### Pattern 3: Protected Route with Auth Check
**What:** Check authentication state before rendering protected components
**When to use:** All admin dashboard routes
**Example:**
```typescript
// Source: https://docs.amplify.aws/gen1/react/build-a-backend/auth/manage-user-session/
import { getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';

async function checkAuth() {
  try {
    const { username, userId } = await getCurrentUser();
    const { tokens } = await fetchAuthSession();
    return { isAuthenticated: true, username, accessToken: tokens?.accessToken };
  } catch {
    return { isAuthenticated: false };
  }
}
```

### Anti-Patterns to Avoid
- **Public sign-up for admin dashboard:** Admin users should be created by administrators only, not self-registered
- **Client secret in frontend:** Never include client secrets in browser code; use public clients (no secret)
- **Storing tokens in localStorage:** Use Amplify's built-in secure storage; avoid manual localStorage
- **Excessive IAM permissions on Identity Pool:** If using Identity Pool, apply least-privilege IAM roles

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Token refresh | Custom refresh logic | Amplify fetchAuthSession() | Automatic refresh with forceRefresh option |
| JWT validation | Custom JWT parsing | API Gateway JWT Authorizer | Native, faster, handles JWKS caching |
| Password hashing | Any password storage | Cognito User Pool | Secure SRP protocol, never see passwords |
| Session management | Cookie/localStorage logic | Amplify Auth APIs | Handles token lifecycle, secure storage |
| Sign-in UI | Custom form from scratch | @aws-amplify/ui-react Authenticator | Production-ready, accessible, customizable |

**Key insight:** Authentication is security-critical. Using managed services (Cognito) and official SDKs (Amplify) reduces attack surface and handles edge cases (token expiry, rotation, revocation) correctly.

## Common Pitfalls

### Pitfall 1: Custom Attribute Write Permissions
**What goes wrong:** Cognito custom attributes have Read AND Write permissions by default. Users can modify their own role/privilege attributes.
**Why it happens:** AWS default settings; developers don't review App Client attribute permissions.
**How to avoid:** Explicitly configure attribute permissions in `aws_cognito_user_pool_client` to restrict write access for sensitive attributes.
**Warning signs:** Users have unexpected permissions; audit logs show self-modification of role attributes.

### Pitfall 2: Public Client with Client Secret
**What goes wrong:** Including client secret in browser JavaScript exposes it to inspection.
**Why it happens:** Confusion between confidential (server) and public (browser) clients.
**How to avoid:** Set `generate_secret = false` for App Client used by frontend; use confidential clients only for server-to-server.
**Warning signs:** Client secret visible in network requests or bundled JavaScript.

### Pitfall 3: JWT Issuer URL Format
**What goes wrong:** API Gateway rejects valid Cognito tokens because issuer URL doesn't match exactly.
**Why it happens:** Manual issuer URL construction with wrong format.
**How to avoid:** Use `"https://${aws_cognito_user_pool.admin.endpoint}"` - the endpoint attribute already includes the correct format.
**Warning signs:** 401 Unauthorized despite valid token; logs show "Token issuer does not match".

### Pitfall 4: Missing CORS Configuration for Auth
**What goes wrong:** Preflight requests fail; authentication works in Postman but not browser.
**Why it happens:** Forgetting to allow Authorization header in CORS config.
**How to avoid:** Ensure `allow_headers = ["Content-Type", "Authorization"]` in API Gateway CORS (already configured in existing infra).
**Warning signs:** Browser console shows CORS errors on auth endpoints.

### Pitfall 5: Forgetting Token Refresh for Long Sessions
**What goes wrong:** Users get logged out after 1 hour (default access token expiry).
**Why it happens:** Not implementing token refresh; relying only on access token.
**How to avoid:** Amplify handles this automatically; for manual flows, call `fetchAuthSession()` before API calls.
**Warning signs:** Users report being logged out unexpectedly; 401 errors after ~1 hour of idle time.

### Pitfall 6: Audience Mismatch
**What goes wrong:** JWT authorizer rejects tokens even though user is authenticated.
**Why it happens:** Audience in JWT config doesn't match the App Client ID in the token.
**How to avoid:** Set audience to exactly `[aws_cognito_user_pool_client.admin.id]`.
**Warning signs:** Token validation fails with audience error; check `aud` claim in token vs config.

## Code Examples

Verified patterns from official sources:

### Terraform: Cognito User Pool
```hcl
# Source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cognito_user_pool
resource "aws_cognito_user_pool" "admin" {
  name = "tropico-admin-${var.environment}"

  # Password policy
  password_policy {
    minimum_length    = 12
    require_lowercase = true
    require_uppercase = true
    require_numbers   = true
    require_symbols   = true
  }

  # MFA - optional but recommended
  mfa_configuration = "OPTIONAL"
  software_token_mfa_configuration {
    enabled = true
  }

  # Account recovery
  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  # Admin creates users only (no public sign-up)
  admin_create_user_config {
    allow_admin_create_user_only = true
    invite_message_template {
      email_subject = "Your Tropico Retreats Admin Account"
      email_message = "Your username is {username} and temporary password is {####}. Please sign in at https://admin.tropicoretreat.com"
      sms_message   = "Your username is {username} and temporary password is {####}"
    }
  }

  # Email configuration (use SES for production)
  email_configuration {
    email_sending_account = "COGNITO_DEFAULT"
  }

  # Auto-verify email
  auto_verified_attributes = ["email"]

  # User attributes
  schema {
    name                = "email"
    attribute_data_type = "String"
    required            = true
    mutable             = true
  }

  tags = local.tags
}
```

### Terraform: User Pool Client (Public - No Secret)
```hcl
# Source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cognito_user_pool_client
resource "aws_cognito_user_pool_client" "admin" {
  name         = "tropico-admin-client-${var.environment}"
  user_pool_id = aws_cognito_user_pool.admin.id

  # NO client secret for browser-based app
  generate_secret = false

  # Auth flows
  explicit_auth_flows = [
    "ALLOW_USER_SRP_AUTH",        # Secure Remote Password
    "ALLOW_REFRESH_TOKEN_AUTH",   # Token refresh
  ]

  # Token validity
  access_token_validity  = 1   # 1 hour
  id_token_validity      = 1   # 1 hour
  refresh_token_validity = 30  # 30 days

  token_validity_units {
    access_token  = "hours"
    id_token      = "hours"
    refresh_token = "days"
  }

  # Security
  prevent_user_existence_errors = "ENABLED"
  enable_token_revocation       = true

  # Callback URLs for OAuth (if using hosted UI)
  callback_urls = var.environment == "production" ? [
    "https://admin.tropicoretreat.com"
  ] : [
    "http://localhost:3000",
    "http://localhost:5173",
    "https://admin.tropicoretreat.com"
  ]

  logout_urls = var.environment == "production" ? [
    "https://admin.tropicoretreat.com"
  ] : [
    "http://localhost:3000",
    "http://localhost:5173",
    "https://admin.tropicoretreat.com"
  ]

  # Supported identity providers
  supported_identity_providers = ["COGNITO"]
}
```

### Terraform: JWT Authorizer
```hcl
# Source: https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-jwt-authorizer.html
resource "aws_apigatewayv2_authorizer" "cognito" {
  api_id           = aws_apigatewayv2_api.leads.id
  authorizer_type  = "JWT"
  identity_sources = ["$request.header.Authorization"]
  name             = "tropico-cognito-authorizer-${var.environment}"

  jwt_configuration {
    audience = [aws_cognito_user_pool_client.admin.id]
    issuer   = "https://${aws_cognito_user_pool.admin.endpoint}"
  }
}
```

### Amplify v6: signIn
```typescript
// Source: https://docs.amplify.aws/gen1/react/build-a-backend/auth/auth-migration-guide/
import { signIn } from 'aws-amplify/auth';

async function handleSignIn(username: string, password: string) {
  try {
    const { isSignedIn, nextStep } = await signIn({ username, password });

    if (nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
      // User must set new password (first sign-in after admin creation)
      return { needsNewPassword: true };
    }

    return { isSignedIn };
  } catch (error) {
    console.error('Sign in error:', error);
    throw error;
  }
}
```

### Amplify v6: signOut
```typescript
// Source: https://docs.amplify.aws/gen1/react/build-a-backend/auth/auth-migration-guide/
import { signOut } from 'aws-amplify/auth';

async function handleSignOut() {
  await signOut({ global: true }); // Signs out from all devices
}
```

### Amplify v6: Get Access Token for API Calls
```typescript
// Source: https://docs.amplify.aws/gen1/react/build-a-backend/auth/manage-user-session/
import { fetchAuthSession } from 'aws-amplify/auth';

async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    const { tokens } = await fetchAuthSession();
    const accessToken = tokens?.accessToken?.toString();

    if (!accessToken) {
      throw new Error('No access token available');
    }

    return {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };
  } catch (error) {
    console.error('Error getting auth headers:', error);
    throw error;
  }
}

// Usage with fetch
async function fetchProtectedData() {
  const headers = await getAuthHeaders();
  const response = await fetch('https://api.tropicoretreat.com/leads', { headers });
  return response.json();
}
```

### Amplify v6: Check Current User
```typescript
// Source: https://docs.amplify.aws/gen1/react/build-a-backend/auth/manage-user-session/
import { getCurrentUser } from 'aws-amplify/auth';

async function checkAuthState() {
  try {
    const { username, userId, signInDetails } = await getCurrentUser();
    return { isAuthenticated: true, username, userId };
  } catch {
    return { isAuthenticated: false };
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| REST API + Lambda Authorizer | HTTP API + JWT Authorizer | 2020 | 70% cost reduction, native Cognito support |
| Amplify v5 class-based | Amplify v6 functional APIs | 2023 | 59% smaller bundles, better tree-shaking |
| Auth.currentSession() | fetchAuthSession() | Amplify v6 | Simplified API, automatic refresh |
| CognitoUser object passing | getCurrentUser() stateless | Amplify v6 | No need to track user object |
| Manual token refresh | Automatic with fetchAuthSession | Amplify v6 | Built-in refresh when tokens expire |

**Deprecated/outdated:**
- `Auth.signIn()` (v5) - Use `signIn()` from 'aws-amplify/auth'
- `Auth.currentSession()` - Use `fetchAuthSession()`
- `Auth.currentAuthenticatedUser()` - Use `getCurrentUser()`
- CognitoUser class - No longer returned or required in v6

## Open Questions

Things that couldn't be fully resolved:

1. **Admin domain registration**
   - What we know: STATE.md lists "Register domain for admin dashboard (admin.tropicoretreat.com)" as TODO
   - What's unclear: Is the domain already registered? DNS configuration needed?
   - Recommendation: Verify domain status; if not registered, add to Phase 4 tasks or block on it

2. **SES production access for invite emails**
   - What we know: SES is in sandbox mode per STATE.md
   - What's unclear: Can Cognito send invite emails without SES production access?
   - Recommendation: Use COGNITO_DEFAULT email sending initially; upgrade to SES later for custom branding

3. **Identity Pool requirement**
   - What we know: PROJECT.md says "Cognito User Pool + Identity Pool"; STATE.md says "Set up both"
   - What's unclear: Whether admin dashboard needs direct AWS resource access
   - Recommendation: For API-only access, User Pool is sufficient. Identity Pool only needed if admin uploads files directly to S3 or queries DynamoDB directly (not through API)

## Sources

### Primary (HIGH confidence)
- [AWS API Gateway HTTP API JWT Authorizer](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-jwt-authorizer.html) - JWT configuration details
- [Terraform aws_cognito_user_pool](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cognito_user_pool) - User Pool configuration
- [Terraform aws_cognito_user_pool_client](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cognito_user_pool_client) - Client configuration
- [Amplify v6 Auth Migration Guide](https://docs.amplify.aws/gen1/react/build-a-backend/auth/auth-migration-guide/) - v6 API examples
- [Amplify v6 Manage User Session](https://docs.amplify.aws/gen1/react/build-a-backend/auth/manage-user-session/) - fetchAuthSession, getCurrentUser
- [Amplify Use Existing Cognito Resources](https://docs.amplify.aws/react/build-a-backend/auth/use-existing-cognito-resources/) - Manual configuration

### Secondary (MEDIUM confidence)
- [AWS HTTP API Gateway with Cognito and Terraform](https://andrewtarry.com/posts/aws-http-gateway-with-cognito-and-terraform/) - Terraform patterns
- [AWS Security Blog: JWT Authorizer](https://aws.amazon.com/blogs/security/how-to-secure-api-gateway-http-endpoints-with-jwt-authorizer/) - Best practices
- [Cognito Refresh Tokens](https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-the-refresh-token.html) - Token refresh mechanics
- [Cognito Security Best Practices](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-security-best-practices.html) - Security guidelines

### Tertiary (LOW confidence)
- [SECFORCE Cognito Pitfalls](https://www.secforce.com/blog/aws-cognito-pitfalls-default-settings-attackers-love-and-you-should-know-about/) - Security pitfalls (verify in production)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official AWS documentation and Terraform registry
- Architecture: HIGH - Verified patterns from official docs and working examples
- Pitfalls: HIGH - AWS security best practices documentation + verified blog sources

**Research date:** 2026-01-23
**Valid until:** 2026-02-23 (30 days - Cognito is stable, Amplify v6 is mature)
