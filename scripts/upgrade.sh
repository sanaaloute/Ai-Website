#!/usr/bin/env bash
# Update / upgrade an existing production deployment with minimal disruption.
# Unlike deploy.sh this does NOT tear everything down: it (optionally) pulls the
# latest code, rebuilds images, and recreates only the services that changed.
# Prisma migrations run automatically via the backend container entrypoint when
# it is recreated.
#
# Shared-host notes: only the AI-Website containers, the single host nginx site
# (installed once, then certbot-managed) and certbot are ever touched. Other
# sites and services on the host are never modified.
#
# Usage on prod:  bash scripts/upgrade.sh [--no-cache] [--no-git-pull] [--request-cert]
#   --no-cache      rebuild images without using the Docker layer cache
#   --no-git-pull   skip the fast-forward git pull
#   --request-cert  if no certificate exists, obtain one via Let's Encrypt
#                   (certbot --nginx --redirect; needs DNS pointing here + sudo)
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

# First run on a new host: install the nginx site (later runs leave the
# certbot-managed file untouched).
ensure_host_config
reload_nginx

if [[ "$REQUEST_CERT" -eq 1 && ! -f "$CERT_FULLCHAIN" ]]; then
  if request_certs "$(letsencrypt_email)"; then
    ok "Certificates obtained; certbot enabled HTTPS + redirect in the site config."
  else
    warn "Certbot failed — keeping the current host nginx config."
  fi
fi

log "Recreating changed services..."
docker compose up -d --remove-orphans

wait_for_backend || warn "Backend health check failed — see logs above."
show_status
