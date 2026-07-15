#!/usr/bin/env bash
# Update / upgrade an existing production deployment with minimal disruption.
# Unlike deploy.sh this does NOT tear everything down: it (optionally) pulls
# the latest code, rebuilds images, and recreates only the services that
# changed. Prisma migrations run automatically via the backend container
# entrypoint when it is recreated. The nginx site config is refreshed only
# when it actually changed (no reload otherwise).
#
# Usage on prod:  bash scripts/upgrade.sh [--no-cache] [--no-git-pull] [--request-cert]
#   --no-cache      rebuild images without using the Docker layer cache
#   --no-git-pull   skip the fast-forward git pull
#   --request-cert  if no certificate exists, obtain one via Let's Encrypt
#                   (needs DNS pointing here + sudo)
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

log "Recreating changed services..."
docker compose up -d --remove-orphans

wait_for_backend || warn "Backend health check failed — see logs above."

# Front door: additive nginx site config (refreshed only when changed).
install_nginx_config || warn "nginx is not configured — the site will not be reachable. See messages above."

# TLS: obtain certs on request, then flip the site config to full HTTPS.
if ! certs_exist && [[ "$REQUEST_CERT" -eq 1 ]]; then
  if request_certs "$(letsencrypt_email)"; then
    ok "Certificates obtained."
    install_nginx_config && install_cert_renewal_hook
  else
    warn "Certbot failed — staying on HTTP. Check that DNS A records point here."
  fi
fi

show_status
