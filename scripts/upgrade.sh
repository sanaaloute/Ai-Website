#!/usr/bin/env bash
# Update / upgrade an existing production deployment with minimal disruption.
# Unlike deploy.sh this does NOT tear everything down: it (optionally) pulls
# the latest code, rebuilds images, runs Prisma migrations (visible output),
# and recreates only the services that changed. The nginx site config is
# refreshed only when it actually changed (no reload otherwise).
#
# Usage on prod:  bash scripts/upgrade.sh [--no-cache] [--no-git-pull]
#   --no-cache      rebuild images without using the Docker layer cache
#   --no-git-pull   skip the fast-forward git pull
#   --request-cert  deprecated/no-op: certs are now requested automatically
#                   (when missing + DNS points here + LETSENCRYPT_EMAIL in .env + sudo)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
# shellcheck disable=SC1091
source "$ROOT/scripts/lib.sh"

NO_CACHE=0
GIT_PULL=1
REQUEST_CERT=0
for arg in "$@"; do
  case "$arg" in
    --no-cache)      NO_CACHE=1 ;;
    --no-git-pull)   GIT_PULL=0 ;;
    --request-cert)  REQUEST_CERT=1 ;;
    -h|--help)
      echo "Usage: bash scripts/upgrade.sh [--no-cache] [--no-git-pull]"
      exit 0
      ;;
    *) die "Unknown option: $arg" ;;
  esac
done

command -v docker >/dev/null 2>&1 || die "docker is not installed."
docker compose version >/dev/null 2>&1 || die "the 'docker compose' plugin is not installed."

if [[ "$GIT_PULL" -eq 1 && -d "$ROOT/.git" ]]; then
  # Only tracked-file changes should block the pull; untracked runtime artifacts
  # on the server must not prevent upgrades.
  if [[ -n "$(git -C "$ROOT" status --porcelain --untracked-files=no)" ]]; then
    warn "Working tree has local changes — skipping git pull (use --no-git-pull to silence)."
  else
    log "Pulling latest code (fast-forward only)..."
    git -C "$ROOT" pull --ff-only || warn "git pull failed — continuing with the current tree."
  fi
fi

if [[ "$NO_CACHE" -eq 1 ]]; then
  log "Building images (no cache)..."
  docker compose build --no-cache
else
  log "Building images..."
  docker compose build
fi

log "Recreating changed services..."

log "Running Prisma migrations (prisma migrate deploy)..."
if ! docker compose run --rm --no-deps -T backend npx prisma migrate deploy; then
  cat >&2 <<'MSG'

✗ Migration failed.
  If this database was created from raw SQL (users_schema.sql) rather than by
  Prisma, baseline it ONCE and re-run upgrade, e.g.:
    docker compose run --rm backend npx prisma migrate resolve --applied 20250630000000_init
  (mark every already-applied historical migration the same way, oldest first)
MSG
  exit 1
fi
ok "Migrations applied."

docker compose up -d --remove-orphans

wait_for_backend || warn "Backend health check failed — see logs above."

# Front door: additive nginx site config (refreshed only when changed).
install_nginx_config || warn "nginx is not configured — the site will not be reachable. See messages above."

# TLS: obtain certs automatically when missing, then flip the site config to
# full HTTPS. Never fatal — worst case the site stays on the HTTP config.
if [[ "$REQUEST_CERT" -eq 1 ]]; then
  log "Note: --request-cert is deprecated; TLS is now set up automatically."
fi
ensure_tls

show_status
