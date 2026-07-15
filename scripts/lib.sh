#!/usr/bin/env bash
# Shared helpers for scripts/deploy.sh and scripts/upgrade.sh.
# This file is SOURCED by those scripts, not executed directly.
#
# Host-nginx tenant architecture:
#   - This EC2 also runs OTHER websites behind the host's nginx, which owns
#     0.0.0.0:80/443. This stack never publishes public ports; nginx proxies:
#       ai-web-builder.com / www  -> 127.0.0.1:3000 (frontend)
#       /api/*, /health, /live, /ready -> 127.0.0.1:4000 (backend)
#       admin.ai-web-builder.com  -> 127.0.0.1:3001 (admin)
#   - The nginx integration is strictly ADDITIVE: one self-contained site file
#     (nginx/ai-website.{http,https}.conf) installed into sites-available +
#     a sites-enabled symlink, always gated by `nginx -t` before reload.
#     Other sites on this nginx are never read or modified.
#   - TLS: certbot --webroot (challenges served by the HTTP site config from
#     /var/www/certbot). After issuance the HTTPS site config is installed and
#     a renewal hook reloads nginx. certbot never edits our nginx file.

# ── logging ──────────────────────────────────────────────────────────────────
log()  { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
ok()   { printf '\033[1;32m✓\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m!\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[1;31m✗\033[0m %s\n' "$*" >&2; exit 1; }

# ── domains, certificates, nginx paths ───────────────────────────────────────
DOMAIN="ai-web-builder.com"
# Overridable for testing; standard Let's Encrypt location by default.
CERT_DIR="${CERT_DIR:-/etc/letsencrypt/live/$DOMAIN}"
CERT_FULLCHAIN="$CERT_DIR/fullchain.pem"
CERT_KEY="$CERT_DIR/privkey.pem"

# Overridable for testing; these are the standard Ubuntu nginx locations.
NGINX_AVAILABLE="${NGINX_AVAILABLE:-/etc/nginx/sites-available/ai-website}"
NGINX_ENABLED="${NGINX_ENABLED:-/etc/nginx/sites-enabled/ai-website}"
ACME_WEBROOT="${ACME_WEBROOT:-/var/www/certbot}"

certs_exist() { [[ -f "$CERT_FULLCHAIN" && -f "$CERT_KEY" ]]; }

# Run a command as root: directly when already root, else via passwordless sudo.
as_root() {
  if [[ "$(id -u)" -eq 0 ]]; then "$@"
  elif sudo -n true 2>/dev/null; then sudo "$@"
  else return 1
  fi
}

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

# ── preflight ────────────────────────────────────────────────────────────────

# Soft check: do our DNS names resolve to THIS server's public IP? certbot can
# only obtain certificates once they do. Warns (never fails) — DNS may simply
# not have propagated yet.
check_dns() {
  local pub name ip all_good=1
  pub="$(curl -s --max-time 5 https://api.ipify.org 2>/dev/null || true)"
  if [[ -z "$pub" ]]; then
    warn "Could not determine this server's public IP — skipping the DNS check."
    return 0
  fi
  for name in "$DOMAIN" "www.$DOMAIN" "admin.$DOMAIN"; do
    ip="$(getent ahostsv4 "$name" 2>/dev/null | awk 'NR==1{print $1}')"
    if [[ -z "$ip" ]]; then
      warn "DNS: $name does not resolve yet."
      all_good=0
    elif [[ "$ip" != "$pub" ]]; then
      warn "DNS: $name -> $ip, but this server's public IP is $pub."
      all_good=0
    fi
  done
  if [[ "$all_good" -eq 1 ]]; then
    ok "DNS: all three names resolve to this server ($pub)."
  else
    warn "Fix the A records at your registrar. Until then the site stays"
    warn "unreachable and certificates cannot be issued."
  fi
}

# ── nginx site configuration (additive) ─────────────────────────────────────

nginx_installed() {
  command -v nginx >/dev/null 2>&1 && [[ -d "$(dirname "$NGINX_AVAILABLE")" ]]
}

# Install the right site config (HTTP bootstrap vs full HTTPS, chosen by cert
# existence) and reload nginx. Never touches other sites.
install_nginx_config() {
  local tmpl
  if certs_exist; then
    tmpl="$ROOT/nginx/ai-website.https.conf"
  else
    tmpl="$ROOT/nginx/ai-website.http.conf"
  fi
  if ! nginx_installed; then
    warn "Host nginx not found (need the nginx binary + $(dirname "$NGINX_AVAILABLE"))."
    warn "Install it: sudo apt install nginx — then re-run this script."
    return 1
  fi
  if ! as_root true; then
    warn "Need passwordless sudo to configure nginx. Manual equivalent:"
    warn "  sudo cp $tmpl $NGINX_AVAILABLE"
    warn "  sudo ln -sfn $NGINX_AVAILABLE $NGINX_ENABLED"
    warn "  sudo nginx -t && sudo systemctl reload nginx"
    return 1
  fi
  if [[ -L "$NGINX_ENABLED" && -f "$NGINX_AVAILABLE" ]] \
     && cmp -s "$tmpl" "$NGINX_AVAILABLE" 2>/dev/null; then
    ok "nginx site config already up to date (ai-website)."
    return 0
  fi
  as_root mkdir -p "$ACME_WEBROOT"
  as_root cp "$tmpl" "$NGINX_AVAILABLE"
  as_root ln -sfn "$NGINX_AVAILABLE" "$NGINX_ENABLED"
  if ! as_root nginx -t >/dev/null 2>&1; then
    as_root nginx -t || true
    die "nginx -t failed — NOT reloading, other sites are unaffected. Fix the config and re-run."
  fi
  as_root systemctl reload nginx
  ok "nginx configured for $DOMAIN (+ www, admin); other sites untouched."
}

# ── TLS issuance (host certbot --webroot through our HTTP site config) ──────

request_certs() {
  local email="$1"
  [[ -z "$email" ]] && die "No Let's Encrypt email. Set LETSENCRYPT_EMAIL (or CERTBOT_EMAIL) in .env."
  command -v certbot >/dev/null 2>&1 || die "certbot is not installed (sudo apt install certbot)."
  if ! as_root true; then
    warn "certbot needs sudo. Re-run with sudo or grant the deploy user NOPASSWD for certbot."
    return 1
  fi
  log "Requesting Let's Encrypt certificates (webroot: $ACME_WEBROOT)..."
  as_root certbot certonly --webroot -w "$ACME_WEBROOT" \
    -d "$DOMAIN" -d "www.$DOMAIN" -d "admin.$DOMAIN" \
    --email "$email" --agree-tos --no-eff-email --non-interactive
}

# Renewal hook: reload nginx so it picks up renewed certificates.
# Nice-to-have: never fails the deploy (worst case, nginx picks up renewed
# certs at its next reload).
install_cert_renewal_hook() {
  as_root true || { warn "Need sudo to install the certbot renewal hook. Skipping."; return 0; }
  local hook_dir="${LETSENCRYPT_HOOK_DIR:-/etc/letsencrypt/renewal-hooks/deploy}"
  local hook="$hook_dir/ai-website-nginx.sh"
  if as_root mkdir -p "$hook_dir" \
     && printf '#!/bin/sh\nnginx -t && systemctl reload nginx\n' | as_root tee "$hook" >/dev/null \
     && as_root chmod +x "$hook"; then
    ok "Certbot renewal hook installed ($hook)."
  else
    warn "Could not install the certbot renewal hook ($hook)."
    warn "Renewed certs will only take effect at nginx's next reload."
  fi
  return 0
}

# ── health + status ──────────────────────────────────────────────────────────

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

# End-to-end probe through host nginx. Pre-cert: /health is proxied over HTTP
# (expect 200). Post-cert: port 80 redirects (expect 3xx) and HTTPS serves 200
# (cert chain is validated — no -k).
probe_stack() {
  local http_code https_code
  http_code="$(curl -s -o /dev/null -w '%{http_code}' -H "Host: $DOMAIN" \
    --max-time 10 http://localhost/health 2>/dev/null || true)"
  if certs_exist; then
    if [[ "$http_code" =~ ^3 ]]; then
      ok "nginx redirects $DOMAIN HTTP -> HTTPS."
    else
      warn "HTTP probe for $DOMAIN returned '$http_code' (expected a 3xx redirect)."
    fi
    https_code="$(curl -s -o /dev/null -w '%{http_code}' \
      --resolve "$DOMAIN:443:127.0.0.1" --max-time 10 \
      "https://$DOMAIN/health" 2>/dev/null || true)"
    if [[ "$https_code" == "200" ]]; then
      ok "HTTPS is live: https://$DOMAIN/health returned 200 (valid certificate)."
      return 0
    fi
    warn "HTTPS probe for https://$DOMAIN/health returned '$https_code'."
    return 1
  fi
  if [[ "$http_code" == "200" ]]; then
    ok "nginx serves $DOMAIN over HTTP (backend /health returned 200)."
    return 0
  fi
  warn "HTTP probe for http://$DOMAIN/health returned '$http_code'."
  warn "Check: docker compose ps, sudo nginx -t, sudo tail /var/log/nginx/error.log"
  return 1
}

show_status() {
  echo
  docker compose ps
  echo
  local live=0
  probe_stack && live=1
  if [[ "$live" -eq 1 ]] && certs_exist; then
    ok "Site should be live at https://$DOMAIN (and https://admin.$DOMAIN)."
  elif [[ "$live" -eq 1 ]]; then
    ok "App stack is up and routed by nginx (HTTP only — no certificate yet)."
    log "To enable HTTPS: set LETSENCRYPT_EMAIL in .env, ensure DNS points here, then run:"
    log "  sudo bash scripts/deploy.sh --request-cert"
  else
    warn "The app may be running, but nginx is not routing to it yet — see above."
  fi
}
