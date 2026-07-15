#!/usr/bin/env bash
# Shared helpers for scripts/deploy.sh and scripts/upgrade.sh.
# This file is SOURCED by those scripts, not executed directly.
#
# Shared-host architecture:
#   - Host nginx (Debian sites-available layout, certbot-managed) is the single
#     public entry point on 80/443 and already fronts other services (e.g.
#     api.barkosem.com). This stack adds ONE more site and never touches other
#     sites or public ports.
#   - App containers bind 127.0.0.1 only: frontend :3000, backend :4000,
#     admin :3001. Host nginx reverse-proxies our domains to them.
#   - The site config (nginx/ai-website.http.conf) is installed ONCE, then left
#     untouched: certbot --nginx edits the installed copy in place to add HTTPS
#     (same "managed by Certbot" flow as the existing sites on the host).

# ── logging ──────────────────────────────────────────────────────────────────
log()  { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
ok()   { printf '\033[1;32m✓\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m!\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[1;31m✗\033[0m %s\n' "$*" >&2; exit 1; }

# ── domains, certificates, host nginx paths ──────────────────────────────────
DOMAIN="ai-web-builder.com"
CERT_DIR="/etc/letsencrypt/live/$DOMAIN"
CERT_FULLCHAIN="$CERT_DIR/fullchain.pem"
CERT_KEY="$CERT_DIR/privkey.pem"

HOST_NGINX_AVAILABLE="/etc/nginx/sites-available/ai-website"
HOST_NGINX_ENABLED="/etc/nginx/sites-enabled/ai-website"

# Repo source installed on first deploy (the host owns it afterwards).
SRC_HOST_CONF="$ROOT/nginx/ai-website.http.conf"

certs_exist() { [[ -f "$CERT_FULLCHAIN" && -f "$CERT_KEY" ]]; }

# Passwordless sudo is required for host nginx / certbot steps. When unavailable
# we warn and gracefully no-op so `set -e` deploys do not abort; the printed
# manual commands let the operator finish by hand.
can_sudo() { sudo -n true >/dev/null 2>&1; }
need_sudo() {
  can_sudo && return 0
  warn "This step needs passwordless sudo (host nginx / certbot). Skipping."
  warn "Re-run with sudo (e.g. 'sudo bash $0 ...') or grant the deploy user NOPASSWD."
  return 1
}

# Read a KEY=value from the repo .env without sourcing it (secrets-safe).
env_from_file() {
  local key="$1"
  [[ -f "$ROOT/.env" ]] || return 1
  grep -E "^${key}=" "$ROOT/.env" \
    | head -n1 | cut -d= -f2- | tr -d '"' | tr -d "'" | tr -d '[:space:]'
}

# Resolve the Let's Encrypt contact email from env or .env.
letsencrypt_email() {
  if [[ -n "${LETSENCRYPT_EMAIL:-}" ]]; then printf '%s' "$LETSENCRYPT_EMAIL"; return; fi
  if [[ -n "${CERTBOT_EMAIL:-}" ]]; then printf '%s' "$CERTBOT_EMAIL"; return; fi
  env_from_file LETSENCRYPT_EMAIL || env_from_file CERTBOT_EMAIL || true
}

host_config_installed() { [[ -e "$HOST_NGINX_ENABLED" || -f "$HOST_NGINX_AVAILABLE" ]]; }

# Install the HTTP site ONLY when absent. certbot --nginx edits the installed
# file in place afterwards, so an existing config is never overwritten.
ensure_host_config() {
  if host_config_installed; then
    ok "Host nginx config already present (left untouched)."
    return 0
  fi
  need_sudo || return 0
  if ! command -v nginx >/dev/null 2>&1; then
    warn "nginx is not installed on the host. One-time setup, then re-run deploy:"
    warn "  sudo apt update && sudo apt install -y nginx certbot python3-certbot-nginx"
    return 0
  fi
  [[ -f "$SRC_HOST_CONF" ]] || die "Missing host nginx config: $SRC_HOST_CONF"
  sudo mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled
  log "Installing host nginx site -> $HOST_NGINX_AVAILABLE"
  sudo install -m 0644 "$SRC_HOST_CONF" "$HOST_NGINX_AVAILABLE"
  sudo ln -sfn "$HOST_NGINX_AVAILABLE" "$HOST_NGINX_ENABLED"
  ok "Host nginx site installed (HTTP). Enable HTTPS with: sudo bash scripts/deploy.sh --request-cert"
}

# Obtain certificates via the certbot nginx plugin — the same flow already used
# by the other sites on this host. --redirect makes certbot add the HTTP→HTTPS
# redirect block automatically. Requires the site config installed + nginx live
# and DNS pointing to this host.
request_certs() {
  local email="$1"
  [[ -z "$email" ]] && die "No Let's Encrypt email. Set LETSENCRYPT_EMAIL (or CERTBOT_EMAIL) in .env."
  command -v certbot >/dev/null 2>&1 || die "certbot is not installed on the host (sudo apt install certbot python3-certbot-nginx)."
  need_sudo || return 1
  log "Requesting Let's Encrypt certificates (certbot --nginx)..."
  sudo certbot --nginx --redirect \
    -d "$DOMAIN" -d "www.$DOMAIN" -d "admin.$DOMAIN" \
    --email "$email" --agree-tos --no-eff-email --non-interactive
}

# Reload the HOST nginx; start (and enable) it if it is not running.
reload_nginx() {
  need_sudo || return 0
  command -v nginx >/dev/null 2>&1 || { warn "nginx is not installed on the host (sudo apt install nginx)."; return 0; }
  log "Applying host nginx configuration..."
  if ! sudo nginx -t >/dev/null 2>&1; then
    warn "nginx config test failed:"; sudo nginx -t >&2 || true
    return 0   # host-managed: never abort the deploy over the host config
  fi
  if sudo systemctl is-active --quiet nginx; then
    if sudo systemctl reload nginx; then ok "nginx reloaded."
    else warn "Reload failed — restarting nginx."; sudo systemctl restart nginx; fi
  else
    sudo systemctl enable --now nginx >/dev/null 2>&1 || true
    if sudo systemctl start nginx; then ok "nginx started."
    else warn "Could not start nginx."; fi
  fi
}

# Block until the backend container reports healthy.
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
  if certs_exist; then
    ok "Site should be live at https://$DOMAIN (and https://admin.$DOMAIN)."
  else
    ok "App containers are up; host nginx serves http://$DOMAIN (HTTP only — no certificate yet)."
    log "To enable HTTPS: set LETSENCRYPT_EMAIL in .env, ensure DNS points here, then run:"
    log "  sudo bash scripts/deploy.sh --request-cert"
  fi
}
