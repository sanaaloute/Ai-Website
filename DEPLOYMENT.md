# Deployment — EC2 with shared host nginx

This EC2 also runs **other websites** behind the host's nginx, which owns
ports 80/443. This platform is a *tenant* of that nginx: its containers never
publish public ports, and nginx reverse-proxies our domains to loopback.

```
internet ──> host nginx :80/:443  (also serves your other websites — untouched)
               ├─ ai-web-builder.com / www  ──> 127.0.0.1:3000 (frontend)
               ├─ /api/*, /health, /live, /ready ──> 127.0.0.1:4000 (backend)
               └─ admin.ai-web-builder.com ──> 127.0.0.1:3001 (admin)
                     ai-website Docker containers (compose project ai-website)
```

**Coexistence guarantee:** the deploy script installs exactly ONE self-contained
file — `/etc/nginx/sites-available/ai-website` (plus a `sites-enabled`
symlink) — and only reloads nginx after `nginx -t` passes. It never reads,
modifies, or deletes any other site's configuration.

## 1) Instance requirements

| Item | Recommendation |
|---|---|
| Instance | `t3.medium` (2 vCPU / 4 GB). `t3.small` works with a 2 GB swap file |
| Disk | 30 GB gp3 |
| OS | Ubuntu 24.04 LTS with **nginx** (`sudo apt install nginx`) and **certbot** (`sudo apt install certbot`) |
| Security group | inbound `22` (your IP), `80` + `443` (0.0.0.0/0); outbound all |
| IP | **Elastic IP** attached; DNS A records `@`, `www`, `admin` → that IP |
| Loopback ports | `3000`, `3001`, `4000` on 127.0.0.1 must be free — **check the other website isn't already using them** (`sudo ss -ltnp`). If it is, change the ports in `docker-compose.yml` *and* in `nginx/ai-website.*.conf` together |

## 2) Bootstrap the box

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"   # log out and back in once
sudo apt update && sudo apt install -y nginx certbot
git clone https://github.com/sanaaloute/Ai-Website.git ~/Ai-Website
cd ~/Ai-Website
```

Copy `.env` from the old server (Supabase DB URL, AI provider keys,
`NEXT_PUBLIC_*` values, ...). The database needs no migration — Supabase is
external. If the old server has user data in the `agent_store` volume:

```bash
# OLD server:
docker run --rm -v ai-website_agent_store_data:/from -v "$PWD":/backup alpine \
  tar czf /backup/agent_store.tar.gz -C /from .
scp agent_store.tar.gz ubuntu@<new-server>:~

# NEW server:
docker volume create ai-website_agent_store_data
docker run --rm -v ai-website_agent_store_data:/to -v "$PWD":/backup alpine \
  tar xzf /backup/agent_store.tar.gz -C /to
```

## 3) Deploy (HTTP first)

```bash
bash scripts/deploy.sh
```

Builds and starts the containers, runs Prisma migrations, installs the HTTP
nginx site config, and probes through nginx. Verify:

```bash
curl -H 'Host: ai-web-builder.com' http://localhost/health   # 200 from the backend
curl -H 'Host: ai-web-builder.com' http://localhost/         # 200 from the frontend
```

## 4) Enable HTTPS (after DNS A records point here)

Set `LETSENCRYPT_EMAIL` in `.env` — that's all. Every `deploy.sh` / `upgrade.sh`
run checks the certificate state and, when none exists yet, obtains one
automatically (DNS must point here and sudo is required):

```bash
sudo bash scripts/deploy.sh
```

certbot uses the **webroot** authenticator (`/var/www/certbot`, served by the
HTTP site config) — it does not edit any nginx files. After issuance the
script swaps in the full HTTPS site config (301 redirect, HSTS, SSE-tuned
`/api` proxying) and installs a renewal hook
(`/etc/letsencrypt/renewal-hooks/deploy/ai-website-nginx.sh`) that reloads
nginx when certs renew. `sudo certbot renew --dry-run` verifies renewal.
(`--request-cert` is still accepted for compatibility but is no longer needed.)

## 5) Day-to-day upgrades

```bash
bash scripts/upgrade.sh        # git pull, rebuild, recreate changed services
```

Flags: `--no-cache`, `--no-git-pull` (`--request-cert` is deprecated — TLS is
automatic). The nginx config is re-installed only when it changed (no
pointless reloads), and certificates are requested automatically when missing.

## Troubleshooting

- **Other website broke after deploy**: it shouldn't — our file is additive
  and `nginx -t` gates every reload. `sudo nginx -t` shows the first error;
  removing our symlink (`sudo rm /etc/nginx/sites-enabled/ai-website &&
  sudo systemctl reload nginx`) instantly removes this platform's routing.
- **502 Bad Gateway**: a container is down or a loopback port conflict —
  `docker compose ps`, `sudo ss -ltnp | grep -E ':(3000|3001|4000)'`.
- **certbot fails**: DNS not pointing here yet (`getent ahostsv4
  ai-web-builder.com`), or port 80 blocked, or the other nginx site is
  intercepting `/.well-known/acme-challenge/` for our domains (it shouldn't —
  server_name match is exact).
- **Backend unhealthy**: `docker compose logs --tail=100 backend` (usually a
  missing/invalid `.env` value, e.g. the Supabase connection string).
- **Direct debug access**: backend `127.0.0.1:4000`, frontend `127.0.0.1:3000`,
  admin `127.0.0.1:3001` (loopback-only, e.g. via `ssh -L` tunnel).
