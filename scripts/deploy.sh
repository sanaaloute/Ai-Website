#!/usr/bin/env bash
# Full production deploy on the SHARED host (other services already run here;
# host nginx + certbot own ports 80/443).
#   1) docker compose down          (tear existing app containers down)
#   2) docker compose build         (build FRESH images)
#   3) prisma migrate deploy        (run DB migrations, fail-fast)
#   4) install the host nginx site  (first deploy only; certbot edits it later)
#   5) optionally obtain Let's Encrypt certs via certbot --nginx (--request-cert)
#   6) docker compose up -d         (create and start the app containers)
#
# This script only ever touches: the AI-Website containers, the single host
# nginx site /etc/nginx/sites-available/ai-website, and certbot. Other sites
# and services on the host are never modified.
#
# Prisma migrations also run automatically in the backend container entrypoint
# (Dockerfile CMD: `npx prisma migrate deploy && node dist/main`); the explicit
# run here gives clear, fail-fast feedback before the whole stack starts.
#
# Usage on prod:  bash scripts/deploy.sh [--no-cache] [--request-cert]
#   --no-cache      rebuild images without using the Docker layer cache
#   --request-cert  if no certificate exists, obtain one via Let's Encrypt
#                   (certbot --nginx --redirect; needs DNS pointing here + sudo)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
# shellcheck disable=SC1091
source "$ROOT/scripts/lib.sh"

NO_CACHE=0
REQUEST_CERT=0
for arg in "$@"; do
  case "$arg" in
    --no-cache)      NO_CACHE=1 ;;
    --request-cert)  REQUEST_CERT=1 ;;
    -h|--help)       echo "Usage: bash scripts/deploy.sh [--no-cache] [--request-cert]"; exit 0 ;;
    *)               die "Unknown option: $arg" ;;
  esac
done

command -v docker >/dev/null 2>&1 || die "docker is not installed."
docker compose version >/dev/null 2>&1 || die "the 'docker compose' plugin is not installed."

log "Stopping existing app containers..."
docker compose down --remove-orphans

if [[ "$NO_CACHE" -eq 1 ]]; then
  log "Building fresh images (no cache)..."
  docker compose build --no-cache
else
  log "Building fresh images..."
  docker compose build
fi

log "Running Prisma migrations (prisma migrate deploy)..."
if ! docker compose run --rm --no-deps -T backend npx prisma migrate deploy; then
  cat >&2 <<'MSG'

✗ Migration failed.
  If this database was created from raw SQL (users_schema.sql) rather than by
  Prisma, baseline it ONCE and re-run deploy, e.g.:
    docker compose run --rm backend npx prisma migrate resolve --applied 20250630000000_init
  (mark every already-applied historical migration the same way, oldest first)
MSG
  exit 1
fi
ok "Migrations applied."

# Host nginx site (first deploy installs the HTTP bootstrap; later runs leave
# the certbot-managed file untouched). Nginx must serve the :80 block before
# certbot --nginx can answer the ACME challenge.
ensure_host_config
reload_nginx

if [[ "$REQUEST_CERT" -eq 1 && ! -f "$CERT_FULLCHAIN" ]]; then
  if request_certs "$(letsencrypt_email)"; then
    ok "Certificates obtained; certbot enabled HTTPS + redirect in the site config."
    log "Tip: enable HSTS in $HOST_NGINX_AVAILABLE once HTTPS is confirmed (search 'HSTS')."
  else
    warn "Certbot failed — continuing in HTTP mode. Check DNS A records and that port 80 reaches this host's nginx."
  fi
fi

log "Creating and starting all services..."
docker compose up -d

wait_for_backend || warn "Backend health check failed — see logs above."
show_status
