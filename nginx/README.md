# Nginx reverse proxy (Docker)

This directory is mounted into the `nginx` service in `docker-compose.yml`.
It is the single public entry point on ports 80/443 and routes to the app
containers by Docker service name (no host nginx required).

- `conf.d/default.conf` — active HTTP config (port 80). Loaded automatically.
- `conf.d/ssl.conf.template` — HTTPS config (port 443). Not loaded until renamed to `.conf`.

Routing (service name → container):
- `ai-web-builder.com`, `www.ai-web-builder.com` → `frontend:3000`
- `ai-web-builder.com/api/*`, `/health`, `/live`, `/ready` → `backend:4000`
- `admin.ai-web-builder.com` → `admin:3000`

## 1) Bring the stack up (site reachable on HTTP :80)

```bash
docker compose up -d --build
curl -I http://localhost/nginx-health   # HTTP/1.1 200 OK
```

## 2) Enable HTTPS (after DNS A records point to the instance)

The deploy scripts configure nginx automatically based on whether certificates
exist under `certbot/conf/live/ai-web-builder.com/`. Set `LETSENCRYPT_EMAIL` in
`.env`, then run:

```bash
bash scripts/deploy.sh --request-cert
```

The script brings nginx up in HTTP mode to answer the ACME challenge, obtains
certificates for `ai-web-builder.com`, `www.ai-web-builder.com` and
`admin.ai-web-builder.com`, then switches nginx to HTTPS mode (port 80 redirects
to https; port 443 proxies the app). On later runs it auto-detects the existing
certificates.

Renewal (set up as a cron/timer):

```bash
docker compose run --rm certbot renew
docker compose exec nginx nginx -s reload
```

Manual equivalent (without the script):

```bash
docker compose run --rm certbot certonly --webroot \
  -w /var/www/certbot \
  -d ai-web-builder.com -d www.ai-web-builder.com -d admin.ai-web-builder.com \
  --email you@example.com --agree-tos --no-eff-email
mv nginx/conf.d/default.conf nginx/conf.d/default.conf.off   # ssl.conf owns port 80
cp nginx/conf.d/ssl.conf.template nginx/conf.d/ssl.conf
docker compose restart nginx
```
