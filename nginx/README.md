# Nginx reverse proxy (host)

Nginx runs **on the host**, independently of Docker. The app containers
(`frontend`, `backend`, `admin`) bind to `127.0.0.1` only; the host nginx is the
single public entry point on ports 80/443 and proxies to them on localhost.

Routing (host → localhost):
- `ai-web-builder.com`, `www.ai-web-builder.com` → `127.0.0.1:3000` (frontend)
- `/api/*`, `/health`, `/live`, `/ready` → `127.0.0.1:4000` (backend)
- `admin.ai-web-builder.com` → `127.0.0.1:3001` (admin)

Files in this repo:
- `nginx-host.conf` — full HTTPS config (80 → 443 redirect + 443). Requires a cert.
- `nginx-host.http.conf` — HTTP-only bootstrap for first boot (no cert yet).

## One-time host setup

```bash
sudo apt update && sudo apt install -y nginx certbot
sudo mkdir -p /var/www/certbot
```

## 1) Bring the app stack up (no nginx container)

```bash
bash scripts/deploy.sh
```

On first boot the script installs `nginx-host.http.conf` to
`/etc/nginx/sites-available/ai-website` (symlinked into `sites-enabled`) and
reloads host nginx, so the site is reachable over HTTP on port 80:

```bash
curl -I http://localhost/nginx-health   # HTTP/1.1 200 OK
```

If a host config already exists, the script leaves it untouched (host-managed).

## 2) Enable HTTPS (after DNS A records point to the instance)

Set `LETSENCRYPT_EMAIL` in `.env`, ensure port 80 is reachable, then:

```bash
sudo bash scripts/deploy.sh --request-cert
```

The script ensures host nginx serves the ACME webroot, obtains certificates for
`ai-web-builder.com`, `www.ai-web-builder.com` and `admin.ai-web-builder.com`
via host certbot, installs the full `nginx-host.conf` (HTTPS), and reloads nginx.
On later runs it auto-detects the existing certificate.

Renewal (certbot installs a systemd timer/cron automatically; reload nginx after
renewal so it picks up the new cert):

```bash
sudo certbot renew
sudo systemctl reload nginx
```

Manual equivalent (without the script):

```bash
sudo certbot certonly --webroot \
  -w /var/www/certbot \
  -d ai-web-builder.com -d www.ai-web-builder.com -d admin.ai-web-builder.com \
  --email you@example.com --agree-tos --no-eff-email
sudo install -m 0644 nginx-host.conf /etc/nginx/sites-available/ai-website
sudo ln -sfn /etc/nginx/sites-available/ai-website /etc/nginx/sites-enabled/ai-website
sudo nginx -t && sudo systemctl reload nginx
```

> `scripts/deploy.sh` / `scripts/upgrade.sh` call `sudo systemctl reload nginx`
> and `sudo certbot`. Run them with `sudo`, or grant the deploy user passwordless
> sudo for `systemctl reload nginx`, `nginx -t`, and `certbot`.
