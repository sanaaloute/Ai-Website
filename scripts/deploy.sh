#!/usr/bin/env bash
# Full production deploy on the SHARED host. The neoshop-api-gateway container
# (Kong Gateway) owns ports 80/443 — this script never touches host nginx or
# public ports; it configures Kong through its Admin API.
#   1) detect the gateway container + its Docker network
#   2) docker compose down          (tear existing app containers down)
#   3) docker compose build         (build FRESH images)
#   4) prisma migrate deploy        (run DB migrations, fail-fast)
#   5) docker compose up -d         (create and start the app containers)
#   6) upsert Kong services + routes for our domains (Admin API)
#   7) optionally obtain Let's Encrypt certs via certbot --standalone reached
#      through a Kong ACME route, upload the cert to Kong (--request-cert)
#
# Prisma migrations also run automatically in the backend container entrypoint
# (Dockerfile CMD: `npx prisma migrate deploy && node dist/main`); the explicit
# run here gives clear, fail-fast feedback before the whole stack starts.
#
# Usage on prod:  bash scripts/deploy.sh [--no-cache] [--request-cert]
#   --no-cache      rebuild images without using the Docker layer cache
#   --request-cert  if no certificate exists, obtain one via Let's Encrypt
#                   (needs DNS pointing here + sudo)
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

log "Detecting shared gateway..."
ensure_gateway_network

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

log "Creating and starting all services..."
docker compose up -d

wait_for_backend || warn "Backend health check failed — see logs above."

# Front door: Kong services + routes (idempotent; persist in Kong's database).
ensure_kong_routes || warn "Kong is not configured — the site will not be reachable. See messages above."

# TLS: upload the existing cert (keeps Kong in sync), or obtain one first.
if certs_exist; then
  kong_upload_cert || true
elif [[ "$REQUEST_CERT" -eq 1 ]]; then
  if request_certs "$(letsencrypt_email)"; then
    ok "Certificates obtained."
    kong_upload_cert && install_cert_renewal_hook
  else
    warn "Certbot failed — staying on HTTP. Check that DNS A records point here"
    warn "and that port 80 reaches Kong (curl -H 'Host: $DOMAIN' http://localhost/nginx-health is not used; try /health)."
  fi
fi

show_status
