#!/usr/bin/env bash
# Shared helpers for scripts/deploy.sh and scripts/upgrade.sh.
# This file is SOURCED by those scripts, not executed directly.
#
# Shared-host architecture:
#   - The neoshop-api-gateway container — Kong Gateway 3.x — owns 0.0.0.0:80/443
#     (proxy ports 8000/8443) and fronts all services on this host.
#   - This stack never publishes public ports. The app containers join the
#     gateway's Docker network (compose `gateway` network) with DNS aliases
#     ai-website-frontend / -backend / -admin.
#   - Kong is configured through its Admin API (container port 8001, reachable
#     from the host via the container IP): services + routes for our domains,
#     and TLS certificates uploaded straight from /etc/letsencrypt.
#     Admin-API changes are applied instantly and persist in Kong's database —
#     no config files, mounts, or reloads.
#   - ACME HTTP-01: a dedicated Kong route forwards /.well-known/acme-challenge
#     to certbot --standalone running on the host (port 8888) during issuance.

# ── logging ──────────────────────────────────────────────────────────────────
log()  { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
ok()   { printf '\033[1;32m✓\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m!\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[1;31m✗\033[0m %s\n' "$*" >&2; exit 1; }

# ── domains, certificates, gateway ───────────────────────────────────────────
DOMAIN="ai-web-builder.com"
CERT_DIR="/etc/letsencrypt/live/$DOMAIN"
CERT_FULLCHAIN="$CERT_DIR/fullchain.pem"
CERT_KEY="$CERT_DIR/privkey.pem"

# Host port used by certbot --standalone for the ACME HTTP-01 challenge. Kong
# routes the challenge path to it; only needs to be free during issuance.
ACME_PORT=8888

GATEWAY_CONTAINER_DEFAULT="neoshop-api-gateway"

certs_exist() { [[ -f "$CERT_FULLCHAIN" && -f "$CERT_KEY" ]]; }

# Read a KEY=value from the repo .env without sourcing it (secrets-safe).
env_from_file() {
  local key="$1"
  [[ -f "$ROOT/.env" ]] || return 1
  grep -E "^${key}=" "$ROOT/.env" \
    | head -n1 | cut -d= -f2- | tr -d '"' | tr -d "'" | tr -d '[:space:]'
}

letsencrypt_email() {
  if [[ -n "${LETSENCRYPT_EMAIL:-}" ]]; then printf '%s' "$LETSENCRYPT_EMAIL"; return; fi
  if [[ -n "${CERTBOT_EMAIL:-}" ]]; then printf '%s' "$CERTBOT_EMAIL"; return; fi
  env_from_file LETSENCRYPT_EMAIL || env_from_file CERTBOT_EMAIL || true
}

gateway_container() {
  if [[ -n "${GATEWAY_CONTAINER:-}" ]]; then printf '%s' "$GATEWAY_CONTAINER"; return; fi
  env_from_file GATEWAY_CONTAINER || printf '%s' "$GATEWAY_CONTAINER_DEFAULT"
}

# ── gateway network detection ────────────────────────────────────────────────

# Priority: env GATEWAY_NETWORK > .env GATEWAY_NETWORK > auto-detect (first
# non-bridge network of the gateway container).
detect_gateway_network() {
  if [[ -n "${GATEWAY_NETWORK:-}" ]]; then printf '%s' "$GATEWAY_NETWORK"; return 0; fi
  local pinned
  pinned="$(env_from_file GATEWAY_NETWORK || true)"
  if [[ -n "$pinned" ]]; then printf '%s' "$pinned"; return 0; fi
  docker inspect "$(gateway_container)" \
    --format '{{range $name, $_ := .NetworkSettings.Networks}}{{println $name}}{{end}}' \
    2>/dev/null | grep -v '^bridge$' | head -n1
}

# Export GATEWAY_NETWORK for docker compose interpolation.
ensure_gateway_network() {
  local gw net
  gw="$(gateway_container)"
  if ! docker inspect "$gw" >/dev/null 2>&1; then
    die "Gateway container '$gw' not found. This host must run the shared Kong
  gateway (ports 80/443). If it has a different name, set GATEWAY_CONTAINER in .env."
  fi
  net="$(detect_gateway_network || true)"
  if [[ -z "$net" ]]; then
    die "Could not detect the Docker network of '$gw'.
  Set GATEWAY_NETWORK in .env (see: docker inspect $gw --format '{{json .NetworkSettings.Networks}}')."
  fi
  export GATEWAY_NETWORK="$net"
  ok "Gateway: container '$gw', network '$GATEWAY_NETWORK'."
}

# ── Kong Admin API ───────────────────────────────────────────────────────────

# Base URL of Kong's Admin API. Priority: env KONG_ADMIN_URL > .env
# KONG_ADMIN_URL > http://<gateway container IP on the shared network>:8001.
kong_admin_url() {
  if [[ -n "${KONG_ADMIN_URL:-}" ]]; then printf '%s' "$KONG_ADMIN_URL"; return 0; fi
  local pinned
  pinned="$(env_from_file KONG_ADMIN_URL || true)"
  if [[ -n "$pinned" ]]; then printf '%s' "$pinned"; return 0; fi
  local gw net ip
  gw="$(gateway_container)"
  net="${GATEWAY_NETWORK:-$(detect_gateway_network || true)}"
  if [[ -n "$net" ]]; then
    ip="$(docker inspect "$gw" --format "{{with index .NetworkSettings.Networks \"$net\"}}{{.IPAddress}}{{end}}" 2>/dev/null || true)"
  fi
  if [[ -z "${ip:-}" ]]; then
    ip="$(docker inspect "$gw" --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' 2>/dev/null | head -n1)"
  fi
  [[ -n "$ip" ]] && printf 'http://%s:8001' "$ip"
}

kong_admin_reachable() {
  local url
  url="$(kong_admin_url || true)"
  [[ -n "$url" ]] || return 1
  curl -fsS --max-time 5 "$url/status" >/dev/null 2>&1
}

# Thin wrapper: kong_api METHOD PATH [curl args...]
kong_api() {
  local method="$1" path="$2"
  shift 2
  curl -fsS --max-time 15 -X "$method" "$(kong_admin_url)$path" "$@"
}

# Create-or-update the Kong services and routes for our domains. Idempotent.
ensure_kong_routes() {
  if ! kong_admin_reachable; then
    warn "Kong Admin API is not reachable ($(kong_admin_url || echo 'URL unknown'))."
    warn "If it listens on a different address, set KONG_ADMIN_URL in .env and re-run."
    return 1
  fi
  log "Configuring Kong services + routes (Admin API)..."
  local out
  if ! out="$(kong_api PUT /services/ai-website-frontend \
      -H 'Content-Type: application/json' \
      --data '{"url":"http://ai-website-frontend:3000"}' 2>&1)"; then
    warn "Kong refused the Admin API write: $out"
    warn "If Kong runs DB-less (declarative config), merge nginx/gateway/kong-routes.yml"
    warn "into the gateway's declarative config file and reload Kong instead."
    return 1
  fi
  # Builder AI routes can exceed default proxy timeouts (SSE streams) — raise
  # them on the backend service.
  kong_api PUT /services/ai-website-backend \
    -H 'Content-Type: application/json' \
    --data '{"url":"http://ai-website-backend:4000","connect_timeout":75000,"read_timeout":900000,"write_timeout":900000}' >/dev/null
  kong_api PUT /services/ai-website-admin \
    -H 'Content-Type: application/json' \
    --data '{"url":"http://ai-website-admin:3000"}' >/dev/null

  # strip_path=false + preserve_host=true: pass path and Host through unchanged,
  # exactly like a plain nginx proxy_pass. Longer prefixes win over "/".
  kong_api PUT /routes/ai-website-web \
    -H 'Content-Type: application/json' \
    --data '{"service":{"name":"ai-website-frontend"},"hosts":["ai-web-builder.com","www.ai-web-builder.com"],"paths":["/"],"strip_path":false,"preserve_host":true}' >/dev/null
  kong_api PUT /routes/ai-website-api \
    -H 'Content-Type: application/json' \
    --data '{"service":{"name":"ai-website-backend"},"hosts":["ai-web-builder.com","www.ai-web-builder.com"],"paths":["/api","/health","/live","/ready"],"strip_path":false,"preserve_host":true}' >/dev/null
  kong_api PUT /routes/ai-website-admin \
    -H 'Content-Type: application/json' \
    --data '{"service":{"name":"ai-website-admin"},"hosts":["admin.ai-web-builder.com"],"paths":["/"],"strip_path":false,"preserve_host":true}' >/dev/null
  ok "Kong routes configured for $DOMAIN (+ www, admin)."
}

# The host's IP on the shared Docker network (bridge gateway) — Kong uses it to
# reach certbot --standalone during ACME issuance.
host_bridge_ip() {
  docker network inspect "${GATEWAY_NETWORK:-$(detect_gateway_network || true)}" \
    --format '{{(index .IPAM.Config 0).Gateway}}' 2>/dev/null
}

# Route /.well-known/acme-challenge on our domains to the host's ACME port.
# Kept permanently so renewals work without reconfiguration.
kong_ensure_acme_route() {
  local bip
  bip="$(host_bridge_ip || true)"
  if [[ -z "$bip" ]]; then
    warn "Could not determine the host IP on network ${GATEWAY_NETWORK:-<unknown>}."
    return 1
  fi
  kong_api PUT /services/ai-website-acme \
    -H 'Content-Type: application/json' \
    --data "{\"url\":\"http://$bip:$ACME_PORT\"}" >/dev/null
  kong_api PUT /routes/ai-website-acme \
    -H 'Content-Type: application/json' \
    --data '{"service":{"name":"ai-website-acme"},"hosts":["ai-web-builder.com","www.ai-web-builder.com","admin.ai-web-builder.com"],"paths":["/.well-known/acme-challenge"],"strip_path":false,"preserve_host":true,"protocols":["http"]}' >/dev/null
  ok "ACME challenge route configured (Kong -> host:$ACME_PORT)."
}

# Upload the issued certificate to Kong (SNI-based; no mounts or reloads).
# Handles the root-only /etc/letsencrypt permissions via sudo when needed.
kong_upload_cert() {
  certs_exist || { warn "No certificate on the host to upload."; return 1; }
  if ! kong_admin_reachable; then
    warn "Kong Admin API is not reachable — cannot upload the certificate."
    return 1
  fi
  local tmp fullchain key
  tmp="$(mktemp -d)"
  if ! cp "$CERT_FULLCHAIN" "$CERT_KEY" "$tmp/" 2>/dev/null; then
    if sudo -n true 2>/dev/null; then
      sudo cp "$CERT_FULLCHAIN" "$CERT_KEY" "$tmp/"
      sudo chown "$USER:$(id -gn)" "$tmp"/*.pem
    else
      warn "Cannot read $CERT_FULLCHAIN — re-run with sudo."
      rm -rf "$tmp"
      return 1
    fi
  fi
  fullchain="$tmp/$(basename "$CERT_FULLCHAIN")"
  key="$tmp/$(basename "$CERT_KEY")"
  if kong_api PUT "/certificates/$DOMAIN" \
      -F "cert=@$fullchain;type=application/x-pem-file" \
      -F "key=@$key;type=application/x-pem-file" \
      -F "snis[]=$DOMAIN" -F "snis[]=www.$DOMAIN" -F "snis[]=admin.$DOMAIN" >/dev/null; then
    ok "Certificate uploaded to Kong (SNI: $DOMAIN, www, admin)."
    rm -rf "$tmp"
    return 0
  fi
  warn "Uploading the certificate to Kong failed."
  rm -rf "$tmp"
  return 1
}

# ── TLS issuance (host certbot --standalone, reached through Kong) ───────────

request_certs() {
  local email="$1"
  [[ -z "$email" ]] && die "No Let's Encrypt email. Set LETSENCRYPT_EMAIL (or CERTBOT_EMAIL) in .env."
  command -v certbot >/dev/null 2>&1 || die "certbot is not installed on the host (sudo apt install certbot)."
  if ! sudo -n true >/dev/null 2>&1; then
    warn "certbot needs sudo. Re-run with sudo or grant the deploy user NOPASSWD for certbot."
    return 1
  fi
  kong_ensure_acme_route || return 1
  log "Requesting Let's Encrypt certificates (standalone on :$ACME_PORT, reached via Kong)..."
  sudo certbot certonly --standalone --http-01-port "$ACME_PORT" \
    -d "$DOMAIN" -d "www.$DOMAIN" -d "admin.$DOMAIN" \
    --email "$email" --agree-tos --no-eff-email --non-interactive
}

# Renewal hook: re-upload renewed certificates to Kong automatically.
install_cert_renewal_hook() {
  sudo -n true >/dev/null 2>&1 || { warn "Need sudo to install the certbot renewal hook. Skipping."; return 0; }
  local hook="/etc/letsencrypt/renewal-hooks/deploy/ai-website-kong.sh"
  sudo mkdir -p "$(dirname "$hook")"
  printf '#!/bin/sh\nbash %s/scripts/kong-cert-upload.sh >> /var/log/ai-website-kong-cert.log 2>&1\n' "$ROOT" \
    | sudo tee "$hook" >/dev/null
  sudo chmod +x "$hook"
  ok "Certbot renewal hook installed ($hook)."
}

# ── stack health + status ────────────────────────────────────────────────────

# Verify the gateway can resolve our container aliases (Kong resolves upstream
# hostnames through Docker DNS).
verify_gateway_dns() {
  local gw
  gw="$(gateway_container)"
  if docker exec "$gw" getent hosts ai-website-frontend >/dev/null 2>&1 \
     && docker exec "$gw" getent hosts ai-website-backend >/dev/null 2>&1; then
    ok "Gateway can resolve ai-website-frontend / ai-website-backend."
  else
    warn "Gateway '$gw' cannot resolve the ai-website-* aliases."
    warn "Make sure '$gw' is attached to network '${GATEWAY_NETWORK:-<unknown>}':"
    warn "  docker network connect ${GATEWAY_NETWORK:-<network>} $gw   # only if missing"
  fi
}

# End-to-end probe through Kong's published HTTP port.
probe_gateway() {
  local code
  code="$(curl -s -o /dev/null -w '%{http_code}' -H "Host: $DOMAIN" --max-time 10 \
    http://localhost/health 2>/dev/null || true)"
  if [[ "$code" == "200" ]]; then
    ok "Gateway serves $DOMAIN (backend /health returned 200)."
  else
    warn "Gateway probe for http://$DOMAIN/health returned HTTP '$code'."
    warn "Check routes: curl -s \$(bash -c 'source scripts/lib.sh; kong_admin_url')/routes | less"
  fi
}

wait_for_backend() {
  log "Waiting for backend to become healthy..."
  local cid status
  for _ in $(seq 1 60); do
    cid="$(docker compose ps -q backend 2>/dev/null || true)"
    status="$(docker inspect -f '{{.State.Health.Status}}' "$cid" 2>/dev/null || true)"
    if [[ "$status" == "healthy" ]]; then
      ok "Backend is healthy."
      return 0
    fi
    sleep 2
  done
  warn "Backend did not become healthy in time. Recent logs:"
  docker compose logs --tail=60 backend || true
  return 1
}

show_status() {
  echo
  docker compose ps
  echo
  verify_gateway_dns
  probe_gateway
  if certs_exist; then
    ok "Site should be live at https://$DOMAIN (and https://admin.$DOMAIN)."
  else
    ok "App stack is up; Kong serves http://$DOMAIN (HTTP only — no certificate yet)."
    log "To enable HTTPS: set LETSENCRYPT_EMAIL in .env, ensure DNS points here, then run:"
    log "  sudo bash scripts/deploy.sh --request-cert"
  fi
}
