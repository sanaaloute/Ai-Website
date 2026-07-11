#!/usr/bin/env bash
# Shared helpers for scripts/deploy.sh and scripts/upgrade.sh.
# This file is SOURCED by those scripts, not executed directly.
#
# Nginx runs on the HOST (not in Docker). The app containers bind to 127.0.0.1
# and the host nginx reverse-proxies public traffic to them:
#   ai-web-builder.com / www  -> 127.0.0.1:3000 (frontend)
#   /api/, /health, /live, /ready -> 127.0.0.1:4000 (backend)
#   admin.ai-web-builder.com  -> 127.0.0.1:3001 (admin)
#
# Host nginx config is host-managed: scripts install a sane default ONLY when no
# config exists yet, then leave it alone. Certificates are obtained via the host
# certbot using the webroot that host nginx serves.

# ── logging ──────────────────────────────────────────────────────────────────
log()  { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
ok()   { printf '\033[1;32m✓\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m!\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[1;31m✗\033[0m %s\n' "$*" >&2; exit 1; }

# ── host nginx + certificate paths ───────────────────────────────────────────
DOMAIN="ai-web-builder.com"
CERT_DIR="/etc/letsencrypt/live/$DOMAIN"
CERT_FULLCHAIN="$CERT_DIR/fullchain.pem"
CERT_KEY="$CERT_DIR/privkey.pem"

# Host nginx config locations. Debian/Ubuntu sites-available/sites-enabled is the
# default; install_host_config falls back to conf.d (nginx.org / RHEL layout).
HOST_NGINX_AVAILABLE="/etc/nginx/sites-available/ai-website"
HOST_NGINX_ENABLED="/etc/nginx/sites-enabled/ai-website"
HOST_NGINX_CONFD="/etc/nginx/conf.d/ai-website.conf"

# Repo sources installed on first boot (the host owns them afterwards).
SRC_HTTP_CONF="$ROOT/nginx-host.http.conf"   # HTTP-only bootstrap (no cert needed)
SRC_HTTPS_CONF="$ROOT/nginx-host.conf"       # full config: 80 -> 443 redirect + 443

# ACME HTTP-01 webroot served by host nginx (see nginx-host*.conf).
ACME_WEBROOT="/var/www/certbot"

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

# Resolve the Let's Encrypt contact email from env or .env.
letsencrypt_email() {
  if [[ -n "${LETSENCRYPT_EMAIL:-}" ]]; then printf '%s' "$LETSENCRYPT_EMAIL"; return; fi
  if [[ -n "${CERTBOT_EMAIL:-}" ]]; then printf '%s' "$CERTBOT_EMAIL"; return; fi
  if [[ -f "$ROOT/.env" ]]; then
    grep -E '^(LETSENCRYPT_EMAIL|CERTBOT_EMAIL)=' "$ROOT/.env" \
      | head -n1 | cut -d= -f2- | tr -d '"' | tr -d "'" | tr -d '[:space:]'
  fi
}

host_config_installed() { [[ -e "$HOST_NGINX_ENABLED" || -f "$HOST_NGINX_AVAILABLE" || -f "$HOST_NGINX_CONFD" ]]; }

# Install one of the repo host configs into sites-available and symlink it into
# sites-enabled. mode: http | https. Non-fatal without sudo (host-managed).
install_host_config() {
  local mode="$1" src
  case "$mode" in
    http)  src="$SRC_HTTP_CONF" ;;
    https) src="$SRC_HTTPS_CONF" ;;
    *)     die "install_host_config: unknown mode '$mode'" ;;
  esac
  [[ -f "$src" ]] || die "Missing host nginx config: $src"
  need_sudo || return 0
  if ! command -v nginx >/dev/null 2>&1; then
    warn "nginx is not installed on the host. One-time setup, then re-run deploy:"
    warn "  sudo apt update && sudo apt install -y nginx certbot"
    warn "  sudo mkdir -p /var/www/certbot"
    return 0
  fi
  # Layout: Debian/Ubuntu sites-enabled (preferred) vs conf.d (nginx.org / RHEL).
  if [[ -d /etc/nginx/sites-available ]] || grep -qE 'include[[:space:]]+/etc/nginx/sites-enabled' /etc/nginx/nginx.conf 2>/dev/null; then
    sudo mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled
    log "Installing host nginx config ($mode) -> $HOST_NGINX_AVAILABLE"
    sudo install -m 0644 "$src" "$HOST_NGINX_AVAILABLE"
    sudo ln -sfn "$HOST_NGINX_AVAILABLE" "$HOST_NGINX_ENABLED"
  else
    sudo mkdir -p /etc/nginx/conf.d
    log "Installing host nginx config ($mode) -> $HOST_NGINX_CONFD"
    sudo install -m 0644 "$src" "$HOST_NGINX_CONFD"
  fi
}

# Ensure a host nginx config exists so ACME + the site work. Host-managed after
# first boot: if a config is already present we leave it untouched.
configure_nginx_mode() {
  if host_config_installed; then
    if certs_exist; then
      ok "Host nginx config present and certificates found (HTTPS)."
    else
      warn "Host nginx config present; no certificate yet (HTTP only)."
    fi
    return 0
  fi
  # First boot only: install a config. HTTPS if a cert already exists, else HTTP.
  if certs_exist; then
    install_host_config https
  else
    install_host_config http
  fi
}

# After a successful --request-cert, switch from the HTTP bootstrap to the full
# HTTPS config. Only acts when a certificate now exists.
enable_https_config() {
  certs_exist || { warn "No certificate found — keeping the current host nginx config."; return 0; }
  install_host_config https
}

# Obtain certificates via host certbot (webroot). Host nginx must already serve
# /.well-known/acme-challenge/ from $ACME_WEBROOT on port 80.
request_certs() {
  local email="$1"
  [[ -z "$email" ]] && die "No Let's Encrypt email. Set LETSENCRYPT_EMAIL (or CERTBOT_EMAIL) in .env."
  command -v certbot >/dev/null 2>&1 || die "certbot is not installed on the host (sudo apt install certbot)."
  need_sudo || return 1
  sudo mkdir -p "$ACME_WEBROOT"
  log "Requesting Let's Encrypt certificates (webroot)..."
  sudo certbot certonly --webroot \
    -w "$ACME_WEBROOT" \
    -d "$DOMAIN" -d "www.$DOMAIN" -d "admin.$DOMAIN" \
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

show_status() {
  echo
  docker compose ps
  echo
  if certs_exist; then
    ok "Site is live at https://$DOMAIN"
  else
    ok "App containers are up; host nginx should serve http://$DOMAIN (HTTP only — no certificate yet)."
    log "To enable HTTPS: set LETSENCRYPT_EMAIL in .env, ensure DNS points here, then run:"
    log "  sudo bash scripts/deploy.sh --request-cert"
  fi
}
