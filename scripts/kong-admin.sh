#!/usr/bin/env bash
# Convenience CLI for inspecting the Kong Admin API through whatever transport
# works (see kong_admin_resolve in scripts/lib.sh).
#   bash scripts/kong-admin.sh GET /routes | less
#   bash scripts/kong-admin.sh GET /services
#   bash scripts/kong-admin.sh DELETE /routes/some-id
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
# shellcheck disable=SC1091
source "$ROOT/scripts/lib.sh"

if [[ $# -lt 2 ]]; then
  echo "Usage: bash scripts/kong-admin.sh METHOD /path [curl args...]" >&2
  echo "  e.g. bash scripts/kong-admin.sh GET /routes | less" >&2
  exit 64
fi

kong_admin_resolve || die "Kong Admin API is not reachable by any transport."
log "Admin API via $(kong_admin_describe)"
kong_api "$@"
echo
