# Phase 6: Custom API Domain - Research

**Researched:** 2026-01-26
**Domain:** AWS API Gateway HTTP API Custom Domain + Throttling
**Confidence:** HIGH

## Summary

This research covers configuring a custom domain (`api.tropicoretreat.com`) for an existing AWS API Gateway HTTP API (v2), implementing a `/v1` base path prefix via API mappings, and adding rate limiting via stage-level throttling.

The codebase already has a wildcard ACM certificate (`*.tropicoretreat.com`) that can be reused. API Gateway HTTP API supports custom domains through `aws_apigatewayv2_domain_name` and path-based routing through `aws_apigatewayv2_api_mapping`. Rate limiting uses `default_route_settings` on the existing `aws_apigatewayv2_stage` resource.

**Primary recommendation:** Create the custom domain resource, add an API mapping with `api_mapping_key = "v1"`, configure throttling on the existing stage, and add Route53 alias record pointing to the API Gateway domain endpoint.

## Standard Stack

The established Terraform resources for this domain:

### Core
| Resource | Version | Purpose | Why Standard |
|----------|---------|---------|--------------|
| `aws_apigatewayv2_domain_name` | AWS Provider 5.x | Custom domain for HTTP API | Native API Gateway V2 resource |
| `aws_apigatewayv2_api_mapping` | AWS Provider 5.x | Map `/v1` base path to API stage | Supports multi-level paths in V2 |
| `aws_route53_record` | AWS Provider 5.x | DNS alias to API Gateway endpoint | Standard Route53 pattern |

### Supporting
| Resource | Version | Purpose | When to Use |
|----------|---------|---------|-------------|
| `aws_acm_certificate` | Already exists | TLS certificate for HTTPS | Wildcard cert covers api.* subdomain |
| `aws_apigatewayv2_stage` | Already exists | Update with throttling settings | Add `default_route_settings` block |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native throttling | AWS WAF rate limiting | More granular rules but higher cost/complexity |
| API mapping | Route prefixes in Lambda | Less clean URLs, more Lambda code changes |

**No new package installation required** - only Terraform resource additions.

## Architecture Patterns

### Recommended Resource Structure
```
infra/
  api/
    main.tf              # Add domain_name, api_mapping, update stage throttling
    outputs.tf           # Add api_custom_domain output
  api-route53.tf         # NEW: Route53 record for api.tropicoretreat.com
```

### Pattern 1: Custom Domain with Existing Wildcard Certificate

**What:** Reuse the existing wildcard ACM certificate for the api subdomain
**When to use:** Wildcard certificate already exists and is validated
**Example:**
```hcl
# Source: Terraform AWS Provider docs, Shisho Dojo examples
resource "aws_apigatewayv2_domain_name" "api" {
  domain_name = "api.tropicoretreat.com"

  domain_name_configuration {
    certificate_arn = aws_acm_certificate.www_certificate.arn  # Existing wildcard cert
    endpoint_type   = "REGIONAL"
    security_policy = "TLS_1_2"
  }

  tags = local.tags
}
```

### Pattern 2: API Mapping with Base Path Prefix

**What:** Map the `/v1` base path to the existing API stage
**When to use:** API versioning through URL paths
**Example:**
```hcl
# Source: AWS Documentation - HTTP API mappings
resource "aws_apigatewayv2_api_mapping" "v1" {
  api_id          = aws_apigatewayv2_api.leads.id
  domain_name     = aws_apigatewayv2_domain_name.api.id
  stage           = aws_apigatewayv2_stage.default.id
  api_mapping_key = "v1"  # Results in api.tropicoretreat.com/v1/*
}
```

### Pattern 3: Stage-Level Rate Limiting

**What:** Apply throttling across all routes via default_route_settings
**When to use:** Uniform rate limits across all endpoints
**Example:**
```hcl
# Source: AWS HTTP API Throttling docs
resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.leads.id
  name        = "$default"
  auto_deploy = true

  default_route_settings {
    throttling_burst_limit = 10   # Max concurrent requests
    throttling_rate_limit  = 10   # Requests per second
  }

  # ... existing access_log_settings ...
}
```

### Pattern 4: Route53 Alias Record for API Gateway

**What:** Create DNS alias pointing subdomain to API Gateway regional endpoint
**When to use:** Custom domain DNS configuration
**Example:**
```hcl
# Source: Existing admin-route53.tf pattern
resource "aws_route53_record" "api" {
  zone_id = aws_route53_zone.www.zone_id
  name    = "api.tropicoretreat.com"
  type    = "A"

  alias {
    name                   = aws_apigatewayv2_domain_name.api.domain_name_configuration[0].target_domain_name
    zone_id                = aws_apigatewayv2_domain_name.api.domain_name_configuration[0].hosted_zone_id
    evaluate_target_health = false
  }
}
```

### Anti-Patterns to Avoid
- **Setting throttling to 0:** Known Terraform bug - removing throttling config sets limits to 0, blocking all traffic. Always keep explicit values once configured.
- **Using API Gateway V1 for multi-level paths:** V1 doesn't support slashes in base path mappings.
- **Creating new ACM certificate:** Wasteful when wildcard already exists.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Rate limiting | Custom Lambda middleware | `default_route_settings` throttling | Built-in, no code changes |
| API versioning | Lambda path parsing | `api_mapping_key` | Clean URL structure, no Lambda changes |
| HTTPS certificate | Manual cert upload | Existing wildcard ACM cert | Auto-renewal, already validated |
| DNS routing | Manual IP configuration | Route53 alias record | Health-aware, API Gateway managed |

**Key insight:** All requirements are solved by native Terraform resources with zero Lambda code changes.

## Common Pitfalls

### Pitfall 1: Throttling Bug - Zero Limits
**What goes wrong:** Removing `throttling_burst_limit` and `throttling_rate_limit` from Terraform sets them to 0 instead of "not configured", blocking all traffic with 429 errors.
**Why it happens:** Terraform provider sends null which AWS interprets as 0.
**How to avoid:** Once throttling is configured, always keep explicit values. Never remove the settings block.
**Warning signs:** `terraform plan` showing throttling values going to `null`.

### Pitfall 2: Certificate Region Mismatch
**What goes wrong:** Certificate in wrong region fails validation.
**Why it happens:** Regional endpoints require certificate in same region as API Gateway.
**How to avoid:** Use the existing `aws_acm_certificate.www_certificate` which is in us-east-1.
**Warning signs:** Domain creation error mentioning certificate validation failure.

### Pitfall 3: CORS Origin Update Forgotten
**What goes wrong:** Frontend works on old endpoint but fails on new custom domain.
**Why it happens:** CORS `allow_origins` doesn't include new API domain (but this isn't needed since API is same-origin with frontend).
**How to avoid:** CORS allows origins that CALL the API (frontend domains), not the API's own domain. No changes needed to CORS config.
**Warning signs:** Browser CORS errors in console.

### Pitfall 4: Frontend Not Updated After Deployment
**What goes wrong:** Frontend still calls old execute-api endpoint.
**Why it happens:** Environment variables not updated after infrastructure deployment.
**How to avoid:** Update frontend `.env` files and redeploy after Terraform apply.
**Warning signs:** Frontend works but bypasses custom domain entirely.

### Pitfall 5: API Mapping Path Confusion
**What goes wrong:** Expecting `/v1/leads` to work when API mapping key is `v1` but route is `POST /v1/leads`.
**Why it happens:** Misunderstanding that API mapping key is prepended to existing routes.
**How to avoid:** Keep existing routes as-is (`POST /leads`). API mapping prepends `/v1`, resulting in `api.tropicoretreat.com/v1/leads`.
**Warning signs:** 404 errors on routes that previously worked.

## Code Examples

Verified patterns from official sources:

### Complete Custom Domain Setup
```hcl
# Source: Terraform AWS Provider docs + AWS API Gateway docs
# File: infra/api/main.tf

# Custom domain using existing wildcard certificate
resource "aws_apigatewayv2_domain_name" "api" {
  domain_name = "api.${local.domain_name}"

  domain_name_configuration {
    certificate_arn = var.wildcard_certificate_arn
    endpoint_type   = "REGIONAL"
    security_policy = "TLS_1_2"
  }

  tags = local.tags
}

# Map /v1 path to existing API stage
resource "aws_apigatewayv2_api_mapping" "v1" {
  api_id          = aws_apigatewayv2_api.leads.id
  domain_name     = aws_apigatewayv2_domain_name.api.id
  stage           = aws_apigatewayv2_stage.default.id
  api_mapping_key = "v1"
}
```

### Stage with Rate Limiting
```hcl
# Source: AWS HTTP API Throttling documentation
# File: infra/api/main.tf (update existing resource)

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.leads.id
  name        = "$default"
  auto_deploy = true

  default_route_settings {
    throttling_burst_limit = 10  # Burst capacity
    throttling_rate_limit  = 10  # 10 requests/second as per CONTEXT.md
  }

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

  tags = local.tags
}
```

### Route53 DNS Record
```hcl
# Source: Existing admin-route53.tf pattern
# File: infra/api-route53.tf

resource "aws_route53_record" "api" {
  zone_id = aws_route53_zone.www.zone_id
  name    = "api.tropicoretreat.com"
  type    = "A"

  alias {
    name                   = module.api.api_domain_target
    zone_id                = module.api.api_domain_zone_id
    evaluate_target_health = false
  }
}
```

### Frontend Environment Updates
```bash
# File: frontend/.env
API_URL=https://api.tropicoretreat.com/v1

# File: admin/.env
VITE_API_ENDPOINT=https://api.tropicoretreat.com/v1
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| REST API (V1) for custom domains | HTTP API (V2) | 2020 | HTTP API supports multi-level base paths |
| Edge-optimized endpoints | Regional endpoints | Standard | Lower latency for regional users |
| TLS 1.0/1.1 | TLS 1.2 minimum | Security requirement | TLS 1.0/1.1 deprecated |

**Deprecated/outdated:**
- `aws_api_gateway_domain_name` (V1): Use `aws_apigatewayv2_domain_name` for HTTP APIs
- `aws_api_gateway_base_path_mapping` (V1): Doesn't support slashes in paths

## Open Questions

Things that couldn't be fully resolved:

1. **Per-IP vs Per-Client Rate Limiting**
   - What we know: `default_route_settings` applies per-route, but the "per IP" behavior is account-level default
   - What's unclear: Whether API Gateway V2 tracks per source IP or uses other identifiers
   - Recommendation: Accept account-level behavior for now; 10 req/sec limit is sufficient protection

2. **Exact 429 Response Format**
   - What we know: API Gateway returns 429 Too Many Requests when throttled
   - What's unclear: Exact response body format
   - Recommendation: Test after deployment; document actual format for frontend handling

## Sources

### Primary (HIGH confidence)
- AWS API Gateway HTTP API Custom Domain documentation - domain setup, certificate requirements
- AWS API Gateway HTTP API Throttling documentation - throttling configuration, 429 behavior
- Terraform AWS Provider - `aws_apigatewayv2_domain_name`, `aws_apigatewayv2_api_mapping`, `aws_apigatewayv2_stage` resources
- Shisho Dojo Terraform examples - practical code patterns

### Secondary (MEDIUM confidence)
- terraform-aws-modules/terraform-aws-apigateway-v2 README - module patterns and best practices
- HashiCorp GitHub Issues #30373 - throttling bug documentation

### Tertiary (LOW confidence)
- General WebSearch results for ecosystem patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - verified with official Terraform and AWS docs
- Architecture: HIGH - patterns match existing codebase and official docs
- Pitfalls: HIGH - verified bug reports and AWS documentation
- Rate limiting: MEDIUM - exact per-IP behavior needs testing

**Research date:** 2026-01-26
**Valid until:** 2026-02-26 (stable infrastructure patterns)
