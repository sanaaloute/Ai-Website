#!/usr/bin/env bash
# Full production deploy on an EC2 that also hosts OTHER websites behind the
# host's nginx (which owns ports 80/443). This script:
#   1) docker compose down          (tear existing app containers down)
#   2) docker compose build         (build FRESH images)
#   3) prisma migrate deploy        (run DB migrations, fail-fast)
#   4) docker compose up -d         (create and start the app containers)
#   5) install our ADDITIVE nginx site config (sites-available/ai-website)
#   6) obtain Let's Encrypt certs via certbot --webroot when missing and switch
#      the site config to full HTTPS (automatic: needs DNS pointing here,
#      LETSENCRYPT_EMAIL in .env, and sudo)
#
# Prisma migrations also run automatically in the backend container entrypoint
# (Dockerfile CMD: `npx prisma migrate deploy && node dist/main`); the explicit
# run here gives clear, fail-fast feedback before the whole stack starts.
#
# Usage on prod:  bash scripts/deploy.sh [--no-cache]
#   --no-cache      rebuild images without using the Docker layer cache
#   --request-cert  deprecated/no-op: certs are now requested automatically
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
    -h|--help)       echo "Usage: bash scripts/deploy.sh [--no-cache]"; exit 0 ;;
    *)               die "Unknown option: $arg" ;;
  esac
done

command -v docker >/dev/null 2>&1 || die "docker is not installed."
docker compose version >/dev/null 2>&1 || die "the 'docker compose' plugin is not installed."

log "Checking DNS (needed for HTTPS issuance)..."
check_dns || true

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

# Front door: additive nginx site config (HTTP bootstrap or HTTPS by cert).
install_nginx_config || warn "nginx is not configured — the site will not be reachable. See messages above."

# TLS: obtain certs automatically when missing, then flip the site config to
# full HTTPS. Never fatal — worst case the site stays on the HTTP config.
if [[ "$REQUEST_CERT" -eq 1 ]]; then
  log "Note: --request-cert is deprecated; TLS is now set up automatically."
fi
ensure_tls

show_status
