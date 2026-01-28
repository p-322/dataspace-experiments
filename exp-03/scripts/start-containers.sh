#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

API_KEY="${API_KEY:-SomeOtherApiKey}"

PROVIDER_MGMT="${PROVIDER_MGMT:-http://localhost:11012/api/management}"
CONSUMER_1_MGMT="${CONSUMER_1_MGMT:-http://localhost:12012/api/management}"
CONSUMER_2_MGMT="${CONSUMER_2_MGMT:-http://localhost:22012/api/management}"
CONSUMER_3_MGMT="${CONSUMER_3_MGMT:-http://localhost:32012/api/management}"

# These are host-facing ports in your compose (mapped to container 11003/11005)
PROVIDER_DSP_HOST="${PROVIDER_DSP_HOST:-http://localhost:11013/api/dsp}"
CONSUMER_1_DSP_HOST="${CONSUMER_1_DSP_HOST:-http://localhost:12013/api/dsp}"
CONSUMER_2_DSP_HOST="${CONSUMER_2_DSP_HOST:-http://localhost:22013/api/dsp}"
CONSUMER_3_DSP_HOST="${CONSUMER_3_DSP_HOST:-http://localhost:32013/api/dsp}"

PROVIDER_PUBLIC_HOST="${PROVIDER_PUBLIC_HOST:-http://localhost:11015/api/public}"
CONSUMER_1_PUBLIC_HOST="${CONSUMER_1_PUBLIC_HOST:-http://localhost:12015/api/public}"
CONSUMER_2_PUBLIC_HOST="${CONSUMER_2_PUBLIC_HOST:-http://localhost:22015/api/public}"
CONSUMER_3_PUBLIC_HOST="${CONSUMER_3_PUBLIC_HOST:-http://localhost:32015/api/public}"

echo "== Dataspace smoketest: starting required containers =="

echo "== docker compose up =="
docker compose up -d

echo "== Waiting for EDC management APIs =="

wait_for_v3_query() {
  local name="$1"
  local base="$2"
  local url="$base/v3/assets/request"

  printf "Waiting for %s " "$name"
  for i in {1..90}; do
    # Make curl failures non-fatal during boot (connection resets etc.)
    local code
    code="$(curl -sS -o /dev/null -w "%{http_code}" \
      -H "X-Api-Key: $API_KEY" \
      -H "Content-Type: application/json" \
      -H "Accept: application/json" \
      -X POST "$url" \
      -d '{"@type":"https://w3id.org/edc/v0.0.1/ns/QuerySpec","offset":0,"limit":1}' \
      2>/dev/null || true)"

    if echo "$code" | grep -qE '^(200|204)$'; then
      echo " OK"
      return 0
    fi

    printf "."
    sleep 1
  done

  echo
  echo "ERROR: $name did not become ready at $url" >&2
  echo "Tip: check logs: docker compose logs --tail=200 edc-provider edc-consumer-1 edc-consumer-2" >&2
  exit 1
}

wait_for_http() {
  local name="$1"
  local url="$2"
  local ok_re="$3"

  printf "Waiting for %s " "$name"
  for i in {1..90}; do
    local code
    code="$(curl -sS -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || true)"

    if echo "$code" | grep -qE "$ok_re"; then
      echo " OK (HTTP $code)"
      return 0
    fi

    printf "."
    sleep 1
  done

  echo
  echo "ERROR: $name did not become ready at $url" >&2
  echo "Tip: check logs: docker compose logs --tail=200 edc-provider edc-consumer-1 edc-consumer-2" >&2
  exit 1
}

wait_for_public_dataplane() {
  local name="$1"
  local base="$2"

  # We do a GET on "/" without auth. Many setups return 401/403/404 depending on routing.
  # We accept any of these as "endpoint is up and responding".
  wait_for_http "$name public dataplane" "$base/" '^(200|401|403|404)$'
}

# 1) Management APIs
wait_for_v3_query "EDC provider management" "$PROVIDER_MGMT"
wait_for_v3_query "EDC consumer-1 management" "$CONSUMER_1_MGMT"
wait_for_v3_query "EDC consumer-2 management" "$CONSUMER_2_MGMT"
wait_for_v3_query "EDC consumer-3 management" "$CONSUMER_3_MGMT"

echo "== Waiting for DSP endpoints (host-facing) =="
# DSP endpoints often respond with 200/404/405 depending on method/path; we just need them alive.
wait_for_http "EDC provider DSP" "$PROVIDER_DSP_HOST" '^(200|404|405)$'
wait_for_http "EDC consumer-1 DSP" "$CONSUMER_1_DSP_HOST" '^(200|404|405)$'
wait_for_http "EDC consumer-2 DSP" "$CONSUMER_2_DSP_HOST" '^(200|404|405)$'
wait_for_http "EDC consumer-3 DSP" "$CONSUMER_3_DSP_HOST" '^(200|404|405)$'

echo "== Waiting for public dataplanes (host-facing) =="
wait_for_public_dataplane "EDC provider" "$PROVIDER_PUBLIC_HOST"
wait_for_public_dataplane "EDC consumer-1" "$CONSUMER_1_PUBLIC_HOST"
wait_for_public_dataplane "EDC consumer-2" "$CONSUMER_2_PUBLIC_HOST"
wait_for_public_dataplane "EDC consumer-3" "$CONSUMER_3_PUBLIC_HOST"

echo "== Containers ready =="