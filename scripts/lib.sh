#!/usr/bin/env bash
# Shared helpers for scripts/deploy.sh and scripts/upgrade.sh.
# This file is SOURCED by those scripts, not executed directly.
#
# Shared-host architecture:
#   - The neoshop-api-gateway CONTAINER owns 0.0.0.0:80/443 (host nginx cannot
#     bind them). It is the single public entry point for all services.
#   - This stack never publishes public ports. The app containers join the
#     gateway's Docker network (compose `gateway` network) with DNS aliases
#     ai-website-frontend / -backend / -admin; the gateway reverse-proxies our
#     domains to those aliases (nginx/gateway/*.conf).
#   - Scripts auto-detect the gateway's network AND its mounted nginx config
#     dir (via docker inspect), install the server blocks there, and reload
#     nginx inside the gateway container. They never modify the gateway's own
#     project files or other services.
#   - TLS: host certbot (webroot) issues into /etc/letsencrypt; the gateway
#     must mount /var/www/certbot (ACME) and /etc/letsencrypt (certs) — the
#     scripts check and print exact instructions if a mount is missing.

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

# ACME HTTP-01 webroot; must be mounted into the gateway at the same path.
ACME_WEBROOT="/var/www/certbot"

# Repo gateway configs installed into the gateway container.
SRC_GATEWAY_HTTP_CONF="$ROOT/nginx/gateway/ai-website.http.conf"   # HTTP bootstrap
SRC_GATEWAY_HTTPS_CONF="$ROOT/nginx/gateway/ai-website.https.conf" # 80 -> 443 + 443
GATEWAY_CONF_NAME="ai-website.conf"  # filename inside the gateway's conf dir

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
    die "Gateway container '$gw' not found. This host must run the shared nginx
  gateway (ports 80/443). If it has a different name, set GATEWAY_CONTAINER in .env."
  fi
  net="$(detect_gateway_network || true)"
  if [[ -z "$net" ]]; then
    warn "Could not detect the Docker network of '$gw'."
    warn "Set GATEWAY_NETWORK in .env (see: docker inspect $gw --format '{{json .NetworkSettings.Networks}}')."
    warn "Falling back to the compose default (neoshop_default)."
    return 0
  fi
  export GATEWAY_NETWORK="$net"
  ok "Gateway: container '$gw', network '$GATEWAY_NETWORK'."
}

# ── gateway config-dir detection + install ───────────────────────────────────

# List the gateway's mounts as "source|destination" lines.
gateway_mounts() {
  docker inspect "$(gateway_container)" \
    --format '{{range .Mounts}}{{println .Source "|" .Destination}}{{end}}' 2>/dev/null
}

# Find the host directory that maps to the gateway's nginx config include dir.
# Priority: a mount straight onto a conf.d / sites-enabled dir; else a whole
# /etc/nginx mount (we then use its conf.d subdirectory). Prints the HOST path.
gateway_conf_host_dir() {
  local gw src dest
  gw="$(gateway_container)"
  # 1) direct conf.d / sites-enabled mount
  while IFS='|' read -r src dest; do
    case "$dest" in
      */conf.d|*/conf.d/|*/sites-enabled|*/sites-enabled/)
        if docker exec "$gw" test -d "$dest" 2>/dev/null; then
          printf '%s' "${src%/}"
          return 0
        fi
        ;;
    esac
  done < <(gateway_mounts)
  # 2) whole /etc/nginx mount -> its conf.d subdir
  while IFS='|' read -r src dest; do
    case "${dest%/}" in
      /etc/nginx)
        if docker exec "$gw" test -d "$dest/conf.d" 2>/dev/null; then
          printf '%s' "${src%/}/conf.d"
          return 0
        fi
        ;;
    esac
  done < <(gateway_mounts)
  return 1
}

# Print manual install instructions (fallback when auto-install isn't possible).
gateway_config_hint() {
  local mode="$1" src gw
  src="$SRC_GATEWAY_HTTP_CONF"; [[ "$mode" == "https" ]] && src="$SRC_GATEWAY_HTTPS_CONF"
  gw="$(gateway_container)"
  cat >&2 <<MSG

! Could not auto-detect the gateway's nginx config dir. Install manually:
    cp $src  <gateway conf.d>/$GATEWAY_CONF_NAME
    docker exec $gw nginx -t && docker exec $gw nginx -s reload
  The gateway's current mounts are:
$(gateway_mounts | sed 's/^/    /')
MSG
}

# Install the gateway server blocks (mode: http|https) into the detected config
# dir and reload the gateway. Non-fatal: falls back to printed instructions.
install_gateway_config() {
  local mode="$1" src dest_dir dest_file gw
  case "$mode" in
    http)  src="$SRC_GATEWAY_HTTP_CONF" ;;
    https) src="$SRC_GATEWAY_HTTPS_CONF" ;;
    *)     die "install_gateway_config: unknown mode '$mode'" ;;
  esac
  [[ -f "$src" ]] || die "Missing gateway config: $src"
  gw="$(gateway_container)"

  dest_dir="$(gateway_conf_host_dir || true)"
  if [[ -z "$dest_dir" ]]; then
    gateway_config_hint "$mode"
    return 1
  fi
  dest_file="$dest_dir/$GATEWAY_CONF_NAME"
  if cp "$src" "$dest_file" 2>/dev/null || sudo -n cp "$src" "$dest_file" 2>/dev/null; then
    ok "Installed gateway config ($mode) -> $dest_file"
    reload_gateway
    return 0
  fi
  warn "No write permission for $dest_file"
  gateway_config_hint "$mode"
  return 1
}

# True when a path is visible inside the gateway container (as a mount).
gateway_has_mount() {
  docker exec "$(gateway_container)" test -e "$1" 2>/dev/null
}

# ── TLS (host certbot, webroot served by the gateway) ────────────────────────

# Obtain certificates via host certbot (webroot). Requires: HTTP gateway config
# installed, $ACME_WEBROOT mounted into the gateway, DNS pointing here.
request_certs() {
  local email="$1"
  [[ -z "$email" ]] && die "No Let's Encrypt email. Set LETSENCRYPT_EMAIL (or CERTBOT_EMAIL) in .env."
  command -v certbot >/dev/null 2>&1 || die "certbot is not installed on the host (sudo apt install certbot)."
  if ! sudo -n true >/dev/null 2>&1; then
    warn "certbot needs sudo. Re-run with sudo or grant the deploy user NOPASSWD for certbot."
    return 1
  fi
  if ! gateway_has_mount "$ACME_WEBROOT"; then
    warn "$ACME_WEBROOT is NOT mounted into the gateway container — the ACME"
    warn "challenge cannot be served. Add to the gateway and recreate it:"
    warn "  -v $ACME_WEBROOT:$ACME_WEBROOT"
    return 1
  fi
  sudo mkdir -p "$ACME_WEBROOT"
  log "Requesting Let's Encrypt certificates (webroot: $ACME_WEBROOT)..."
  sudo certbot certonly --webroot \
    -w "$ACME_WEBROOT" \
    -d "$DOMAIN" -d "www.$DOMAIN" -d "admin.$DOMAIN" \
    --email "$email" --agree-tos --no-eff-email --non-interactive
}

# After certificates exist, verify the gateway can actually read them.
check_gateway_cert_mount() {
  if gateway_has_mount "$CERT_FULLCHAIN"; then
    return 0
  fi
  warn "The gateway cannot see $CERT_FULLCHAIN"
  warn "Mount the certificates into the gateway container (read-only) and recreate it:"
  warn "  -v /etc/letsencrypt:/etc/letsencrypt:ro"
  warn "Then re-run: bash scripts/deploy.sh   (to install the HTTPS config)"
  return 1
}

# Reload nginx INSIDE the gateway container (no host nginx involved).
reload_gateway() {
  local gw
  gw="$(gateway_container)"
  log "Reloading nginx in gateway container '$gw'..."
  if ! docker exec "$gw" nginx -t >/dev/null 2>&1; then
    warn "nginx config test failed inside '$gw':"; docker exec "$gw" nginx -t >&2 || true
    return 1
  fi
  if docker exec "$gw" nginx -s reload >/dev/null 2>&1; then
    ok "Gateway nginx reloaded."
    return 0
  fi
  warn "Could not reload gateway nginx (try: docker restart $gw)."
  return 1
}

# ── stack health + status ────────────────────────────────────────────────────

# Non-fatal: verify the gateway can resolve our container aliases on the shared
# network (catches the #1 misconfiguration — stack and gateway on different
# networks). Runs after `docker compose up -d`.
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
  if certs_exist; then
    ok "Site should be live at https://$DOMAIN (and https://admin.$DOMAIN)."
  else
    ok "App stack is up; gateway serves http://$DOMAIN (HTTP only — no certificate yet)."
    log "To enable HTTPS: set LETSENCRYPT_EMAIL in .env, ensure DNS points here, then run:"
    log "  sudo bash scripts/deploy.sh --request-cert"
  fi
}
