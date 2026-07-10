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

Obtain certificates with the webroot plugin (the running nginx serves the challenge):

```bash
docker compose run --rm certbot certonly --webroot \
  -w /var/www/certbot \
  -d ai-web-builder.com -d www.ai-web-builder.com -d admin.ai-web-builder.com \
  --email you@example.com --agree-tos --no-eff-email
```

Then load the HTTPS servers and restart nginx:

```bash
cp nginx/conf.d/ssl.conf.template nginx/conf.d/ssl.conf
docker compose restart nginx
```

Renewal:

```bash
docker compose run --rm certbot renew
docker compose exec nginx nginx -s reload
```
