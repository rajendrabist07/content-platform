#!/usr/bin/env bash
set -euo pipefail

# Production Smoke Test Script for Content Platform API
# Usage: ./scripts/smoke.sh [BASE_URL]
# Default BASE_URL: http://localhost:3000

BASE_URL="${1:-http://localhost:3000}"
echo "=================================================="
echo "🚀 Running API Smoke Tests against: $BASE_URL"
echo "=================================================="

# Helper function to check HTTP status
check_status() {
  local endpoint="$1"
  local expected_status="$2"
  local method="${3:-GET}"
  local data="${4:-}"
  local auth_header="${5:-}"

  echo -n "Testing $method $endpoint (expecting $expected_status)... "

  local curl_cmd=(curl -s -o /dev/null -w "%{http_code}" -X "$method" "$BASE_URL$endpoint" -H "Content-Type: application/json")
  
  if [ -n "$auth_header" ]; then
    curl_cmd+=(-H "Authorization: $auth_header")
  fi

  if [ -n "$data" ]; then
    curl_cmd+=(-d "$data")
  fi

  local status
  status=$("${curl_cmd[@]}")

  if [ "$status" -eq "$expected_status" ]; then
    echo "✅ [$status OK]"
  else
    echo "❌ [Expected $expected_status, got $status]"
    exit 1
  fi
}

# 1. Health & Readiness Probes
check_status "/api/v1/health" 200
check_status "/api/v1/ready" 200

# 2. Public Read Endpoints & Docs
check_status "/api/v1/public/posts" 200
check_status "/api/v1/public/tags" 200
check_status "/api/v1/public/sitemap" 200
check_status "/api/v1/docs.json" 200

# 3. Dynamic Registration & Login Flow
RANDOM_HEX=$(head -c 4 /dev/urandom | xxd -p || date +%s)
TEST_EMAIL="smoketest_${RANDOM_HEX}@example.com"
PASSWORD="SmokePassword123!"

echo -n "Registering new test user ($TEST_EMAIL)... "
REGISTER_RES=$(curl -s -X POST "$BASE_URL/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$PASSWORD\",\"name\":\"Smoke Tester\",\"organizationName\":\"Smoke Org $RANDOM_HEX\"}")

ACCESS_TOKEN=$(echo "$REGISTER_RES" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4 || true)

if [ -n "$ACCESS_TOKEN" ]; then
  echo "✅ [Registered & Token Obtained]"
else
  echo "❌ [Failed to extract access token from registration]"
  echo "Response: $REGISTER_RES"
  exit 1
fi

AUTH_HEADER="Bearer $ACCESS_TOKEN"

# 4. Authenticated Operations
check_status "/api/v1/users/me" 200 "GET" "" "$AUTH_HEADER"
check_status "/api/v1/posts" 200 "GET" "" "$AUTH_HEADER"
check_status "/api/v1/notifications" 200 "GET" "" "$AUTH_HEADER"
check_status "/api/v1/bookmarks" 200 "GET" "" "$AUTH_HEADER"
check_status "/api/v1/audit-logs" 200 "GET" "" "$AUTH_HEADER"

echo "=================================================="
echo "🎉 ALL SMOKE TESTS PASSED SUCCESSFULLY!"
echo "=================================================="
