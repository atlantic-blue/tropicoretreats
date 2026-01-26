#!/bin/bash

# Integration Tests for Tropico Retreats
# Usage: ./test-integration.sh [staging|production]

ENV=${1:-production}

if [ "$ENV" = "staging" ]; then
  API_URL="https://staging-api.tropicoretreat.com/v1"
  ADMIN_URL="https://dl5p1fy8ewaqz.cloudfront.net"
else
  API_URL="https://api.tropicoretreat.com/v1"
  ADMIN_URL="https://admin.tropicoretreat.com"
fi

echo "Testing $ENV environment..."
echo ""

FAILED=0

# Test Frontend
echo -n "Frontend: "
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$ADMIN_URL" 2>/dev/null)
if [ "$CODE" = "200" ]; then
  echo "PASS ($CODE)"
else
  echo "FAIL ($CODE)"
  FAILED=1
fi

# Test API (validation error expected)
echo -n "API (validation): "
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/leads" -H "Content-Type: application/json" -d '{}' 2>/dev/null)
if [ "$CODE" = "400" ]; then
  echo "PASS ($CODE)"
else
  echo "FAIL ($CODE)"
  FAILED=1
fi

# Test API (create lead)
echo -n "API (create lead): "
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/leads" \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Test","lastName":"Integration","email":"test@example.com","message":"Integration test"}' 2>/dev/null)
if [ "$CODE" = "201" ]; then
  echo "PASS ($CODE)"
else
  echo "FAIL ($CODE)"
  FAILED=1
fi

# Test SSL
echo -n "SSL Certificate: "
SSL=$(curl -s -o /dev/null -w "%{ssl_verify_result}" "$API_URL/leads" 2>/dev/null)
if [ "$SSL" = "0" ]; then
  echo "PASS"
else
  echo "FAIL (verify=$SSL)"
  FAILED=1
fi

echo ""
if [ "$FAILED" = "0" ]; then
  echo "All tests passed!"
else
  echo "Some tests failed!"
  exit 1
fi
