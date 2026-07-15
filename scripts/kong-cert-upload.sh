#!/usr/bin/env bash
# Upload the host's Let's Encrypt certificate for ai-web-builder.com to Kong.
# Called by scripts/deploy.sh after issuance, and by the certbot renewal hook
# (/etc/letsencrypt/renewal-hooks/deploy/ai-website-kong.sh) after renewals.
# Needs read access to /etc/letsencrypt — run with sudo when in doubt:
#   sudo bash scripts/kong-cert-upload.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
# shellcheck disable=SC1091
source "$ROOT/scripts/lib.sh"

kong_upload_cert
