#!/usr/bin/env bash
# Update / upgrade an existing production deployment with minimal disruption.
# Unlike deploy.sh this does NOT tear everything down: it (optionally) pulls the
# latest code, rebuilds images, re-evaluates the nginx mode, and recreates only
# the services that changed. Prisma migrations run automatically via the backend
# container entrypoint when it is recreated.
#
# Usage on prod:  bash scripts/upgrade.sh [--no-cache] [--no-git-pull] [--request-cert]
#   --no-cache      rebuild images without using the Docker layer cache
#   --no-git-pull   skip the fast-forward git pull
#   --request-cert  if no certificate exists, obtain one via Let's Encrypt first
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
      echo "Usage: bash scripts/upgrade.sh [--no-cache] [--no-git-pull] [--request-cert]"
      exit 0
      ;;
    *) die "Unknown option: $arg" ;;
  esac
done

command -v docker >/dev/null 2>&1 || die "docker is not installed."
docker compose version >/dev/null 2>&1 || die "the 'docker compose' plugin is not installed."

# If a previous run left nginx in HTTPS mode, default.conf was moved aside.
# Restore it now so a fast-forward git pull sees a clean tree; configure_nginx_mode
# (below) puts the correct file back before nginx is reloaded.
if [[ -f "$CONF_D/default.conf.off" && ! -f "$CONF_D/default.conf" ]]; then
  mv -f "$CONF_D/default.conf.off" "$CONF_D/default.conf"
fi

if [[ "$GIT_PULL" -eq 1 && -d "$ROOT/.git" ]]; then
  if [[ -n "$(git -C "$ROOT" status --porcelain)" ]]; then
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

if [[ "$REQUEST_CERT" -eq 1 && ! -f "$CERT_FULLCHAIN" ]]; then
  configure_nginx_mode
  log "Starting nginx (HTTP) to answer the ACME challenge..."
  docker compose up -d nginx
  sleep 3
  request_certs "$(letsencrypt_email)" || warn "Certbot failed — keeping the current nginx mode."
fi

log "Configuring nginx mode..."
configure_nginx_mode

log "Recreating changed services..."
docker compose up -d

reload_nginx
wait_for_backend || warn "Backend health check failed — see logs above."
show_status
