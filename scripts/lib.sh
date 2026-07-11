#!/usr/bin/env bash
# Shared helpers for scripts/deploy.sh and scripts/upgrade.sh.
# This file is SOURCED by those scripts, not executed directly.
# Expects the caller to have set ROOT to the project root.

# ── logging ──────────────────────────────────────────────────────────────────
log()  { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
ok()   { printf '\033[1;32m✓\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m!\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[1;31m✗\033[0m %s\n' "$*" >&2; exit 1; }

# ── paths ────────────────────────────────────────────────────────────────────
CERT_DIR="$ROOT/certbot/conf/live/ai-web-builder.com"
CERT_FULLCHAIN="$CERT_DIR/fullchain.pem"
CONF_D="$ROOT/nginx/conf.d"

certs_exist() { [[ -f "$CERT_FULLCHAIN" && -f "$CERT_DIR/privkey.pem" ]]; }

# Resolve the Let's Encrypt contact email from env or .env.
letsencrypt_email() {
  if [[ -n "${LETSENCRYPT_EMAIL:-}" ]]; then printf '%s' "$LETSENCRYPT_EMAIL"; return; fi
  if [[ -n "${CERTBOT_EMAIL:-}" ]]; then printf '%s' "$CERTBOT_EMAIL"; return; fi
  if [[ -f "$ROOT/.env" ]]; then
    grep -E '^(LETSENCRYPT_EMAIL|CERTBOT_EMAIL)=' "$ROOT/.env" \
      | head -n1 | cut -d= -f2- | tr -d '"' | tr -d "'" | tr -d '[:space:]'
  fi
}

# Activate the HTTP-only or HTTPS nginx config.
#   HTTPS mode: ssl.conf is active (self-contained: port-80 redirect + 443),
#               default.conf is renamed to default.conf.off (so it does not
#               compete for port 80).
#   HTTP mode : default.conf is active, ssl.conf is removed.
configure_nginx_mode() {
  mkdir -p "$ROOT/certbot/www" "$ROOT/certbot/conf"
  if certs_exist; then
    log "Certificates found — enabling HTTPS (http -> https redirect)."
    if [[ -f "$CONF_D/default.conf" ]]; then
      mv -f "$CONF_D/default.conf" "$CONF_D/default.conf.off"
    fi
    cp -f "$CONF_D/ssl.conf.template" "$CONF_D/ssl.conf"
    ok "HTTPS config active (nginx/conf.d/ssl.conf)."
  else
    warn "No certificates found — serving HTTP only."
    if [[ -f "$CONF_D/default.conf.off" && ! -f "$CONF_D/default.conf" ]]; then
      mv -f "$CONF_D/default.conf.off" "$CONF_D/default.conf"
    fi
    rm -f "$CONF_D/ssl.conf"
    ok "HTTP config active (nginx/conf.d/default.conf)."
  fi
}

# Obtain certificates via certbot webroot. Nginx must already be serving port 80.
request_certs() {
  local email="$1"
  [[ -z "$email" ]] && die "No Let's Encrypt email. Set LETSENCRYPT_EMAIL (or CERTBOT_EMAIL) in .env."
  log "Requesting Let's Encrypt certificates (webroot challenge)..."
  docker compose run --rm certbot certonly --webroot \
    -w /var/www/certbot \
    -d ai-web-builder.com -d www.ai-web-builder.com -d admin.ai-web-builder.com \
    --email "$email" --agree-tos --no-eff-email --non-interactive
}

# Block until the backend container reports healthy (uses container_name: backend).
wait_for_backend() {
  log "Waiting for backend to become healthy..."
  local status
  for _ in $(seq 1 60); do
    status="$(docker inspect -f '{{.State.Health.Status}}' backend 2>/dev/null || true)"
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

# Reload nginx in place; fall back to a restart if the config test fails.
reload_nginx() {
  local running
  running="$(docker inspect -f '{{.State.Running}}' nginx 2>/dev/null || true)"
  [[ "$running" == "true" ]] || return 0
  log "Applying nginx configuration..."
  if docker compose exec -T nginx nginx -t >/dev/null 2>&1; then
    if docker compose exec -T nginx nginx -s reload; then
      ok "nginx reloaded."
    else
      warn "Reload failed — restarting nginx."
      docker compose restart nginx >/dev/null
    fi
  else
    warn "nginx config test failed — restarting nginx."
    docker compose restart nginx >/dev/null
  fi
}

show_status() {
  echo
  docker compose ps
  echo
  if certs_exist; then
    ok "Site is live at https://ai-web-builder.com"
  else
    ok "Site is live at http://ai-web-builder.com"
    log "To enable HTTPS: set LETSENCRYPT_EMAIL in .env, ensure DNS points here, then run:"
    log "  bash scripts/deploy.sh --request-cert"
  fi
}
