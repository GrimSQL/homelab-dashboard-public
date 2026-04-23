#!/usr/bin/env bash
set -euo pipefail

# Portainer stack deploy for homelab-dashboard
# Usage:
#   scripts/deploy-portainer.sh                  # deploy :latest from ghcr
#   IMAGE_TAG=abc123 scripts/deploy-portainer.sh # deploy specific sha tag
#
# Reads secrets from .env.deploy (not committed). See .env.deploy.example.

cd "$(dirname "$0")/.."

ENV_FILE="${ENV_FILE:-.env.deploy}"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "error: $ENV_FILE not found. Copy .env.deploy.example and fill it in." >&2
  exit 1
fi

# shellcheck disable=SC1090
set -a; source "$ENV_FILE"; set +a

: "${PORTAINER_URL:?PORTAINER_URL missing from $ENV_FILE}"
: "${PORTAINER_API_KEY:?PORTAINER_API_KEY missing from $ENV_FILE}"
: "${PORTAINER_ENDPOINT_ID:?PORTAINER_ENDPOINT_ID missing from $ENV_FILE}"
: "${HA_TOKEN:?HA_TOKEN missing from $ENV_FILE}"
: "${PVE_TOKEN_SECRET:?PVE_TOKEN_SECRET missing from $ENV_FILE}"
: "${PORTAINER_API_KEY_FOR_STACK:?PORTAINER_API_KEY_FOR_STACK missing from $ENV_FILE (API key the app itself uses)}"
: "${AUTH_SECRET:?AUTH_SECRET missing from $ENV_FILE — generate with: openssl rand -hex 32}"
: "${ADMIN_EMAIL:?ADMIN_EMAIL missing from $ENV_FILE (used on first boot to seed the admin user)}"
: "${ADMIN_PASSWORD:?ADMIN_PASSWORD missing from $ENV_FILE (used on first boot; min 12 chars with mixed classes)}"

STACK_NAME="homelab-dashboard"
IMAGE_TAG="${IMAGE_TAG:-latest}"
COMPOSE_FILE="compose.yml"

CURL_OPTS=(-sk -H "X-API-Key: $PORTAINER_API_KEY")

echo "-> Checking if stack '$STACK_NAME' exists on endpoint $PORTAINER_ENDPOINT_ID..."
STACK_ID=$(curl "${CURL_OPTS[@]}" \
  "$PORTAINER_URL/api/stacks?filters=%7B%22EndpointId%22%3A$PORTAINER_ENDPOINT_ID%7D" \
  | jq -r ".[] | select(.Name == \"$STACK_NAME\") | .Id // empty")

# Build env var list for the stack. These are the runtime values baked into the container.
ENV_JSON=$(jq -n \
  --arg ha_url "${HA_BASE_URL:-http://10.0.0.12:8123}" \
  --arg ha_tok "$HA_TOKEN" \
  --arg pve_url "${PVE_BASE_URL:-https://10.0.0.10:8006}" \
  --arg pve_id "${PVE_TOKEN_ID:-homelab-dashboard@pve!readonly}" \
  --arg pve_sec "$PVE_TOKEN_SECRET" \
  --arg pt_url "${PORTAINER_BASE_URL:-https://10.0.0.13:9443}" \
  --arg pt_key "$PORTAINER_API_KEY_FOR_STACK" \
  --arg pt_ep "${PORTAINER_ENDPOINT_ID_FOR_STACK:-2}" \
  --arg tag "$IMAGE_TAG" \
  --arg auth_sec "$AUTH_SECRET" \
  --arg auth_url "${AUTH_URL:-https://homelab.example.com}" \
  --arg admin_email "$ADMIN_EMAIL" \
  --arg admin_pw "$ADMIN_PASSWORD" \
  --arg gh_tok "${GITHUB_TOKEN:-}" \
  --arg gh_owner "${GITHUB_SYNC_OWNER:-example-user}" \
  --arg gh_ms "${GITHUB_SYNC_INTERVAL_MS:-3600000}" \
  '[
    {name: "IMAGE_TAG",               value: $tag},
    {name: "HA_BASE_URL",             value: $ha_url},
    {name: "HA_TOKEN",                value: $ha_tok},
    {name: "PVE_BASE_URL",            value: $pve_url},
    {name: "PVE_TOKEN_ID",            value: $pve_id},
    {name: "PVE_TOKEN_SECRET",        value: $pve_sec},
    {name: "PORTAINER_BASE_URL",      value: $pt_url},
    {name: "PORTAINER_API_KEY",       value: $pt_key},
    {name: "PORTAINER_ENDPOINT_ID",   value: $pt_ep},
    {name: "AUTH_SECRET",             value: $auth_sec},
    {name: "AUTH_URL",                value: $auth_url},
    {name: "ADMIN_EMAIL",             value: $admin_email},
    {name: "ADMIN_PASSWORD",          value: $admin_pw},
    {name: "GITHUB_TOKEN",            value: $gh_tok},
    {name: "GITHUB_SYNC_OWNER",       value: $gh_owner},
    {name: "GITHUB_SYNC_INTERVAL_MS", value: $gh_ms}
  ]')

COMPOSE_CONTENT=$(cat "$COMPOSE_FILE")

if [[ -n "$STACK_ID" ]]; then
  echo "-> Stack exists (id=$STACK_ID), updating..."
  PAYLOAD=$(jq -n \
    --arg sf "$COMPOSE_CONTENT" \
    --argjson env "$ENV_JSON" \
    '{stackFileContent: $sf, env: $env, prune: true, pullImage: true}')
  RESP=$(curl "${CURL_OPTS[@]}" -X PUT \
    -H "Content-Type: application/json" \
    "$PORTAINER_URL/api/stacks/$STACK_ID?endpointId=$PORTAINER_ENDPOINT_ID" \
    -d "$PAYLOAD")
  echo "-> Update response: $(echo "$RESP" | jq -c '{Id, Name, Status}' 2>/dev/null || echo "$RESP" | head -c 200)"
else
  echo "-> Stack does not exist, creating..."
  PAYLOAD=$(jq -n \
    --arg name "$STACK_NAME" \
    --arg sf "$COMPOSE_CONTENT" \
    --argjson env "$ENV_JSON" \
    '{name: $name, stackFileContent: $sf, env: $env, fromAppTemplate: false}')
  RESP=$(curl "${CURL_OPTS[@]}" -X POST \
    -H "Content-Type: application/json" \
    "$PORTAINER_URL/api/stacks/create/standalone/string?endpointId=$PORTAINER_ENDPOINT_ID" \
    -d "$PAYLOAD")
  echo "-> Create response: $(echo "$RESP" | jq -c '{Id, Name, Status}' 2>/dev/null || echo "$RESP" | head -c 200)"
fi

echo "-> Done. Verify: docker ps | grep homelab-dashboard (on docker-proxmox)"
