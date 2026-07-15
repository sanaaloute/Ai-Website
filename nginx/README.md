# Nginx — shared host setup

This EC2 runs **multiple services**. Host nginx (Debian `sites-available`
layout, certbot-managed) is the single public entry point on 80/443 — the same
way the existing `api.barkosem.com` site works. AI-Website adds **one more
site** and never touches other sites or public ports.

Traffic flow:

```
internet → host nginx (:80/:443)
             ├─ api.barkosem.com          → 127.0.0.1:80    (existing site, untouched)
             ├─ ai-web-builder.com / www  → 127.0.0.1:3000  (frontend container)
             │   /api/*, /health, /live, /ready → 127.0.0.1:4000  (backend container)
             └─ admin.ai-web-builder.com  → 127.0.0.1:3001  (admin container)
```

The app containers bind **loopback only**, so they cannot conflict with the
other Docker services (which publish nothing on 3000/3001/4000). Container
names are prefixed (`ai-website-*`) to stay collision-free on the shared host.

Files in this repo:

- `ai-website.http.conf` — the site config. Installed **once** by
  `scripts/deploy.sh` to `/etc/nginx/sites-available/ai-website`, then left
  untouched: `certbot --nginx` edits the installed copy in place to add the
  HTTPS blocks + redirect ("managed by Certbot"), exactly like the other sites.

## 1) Deploy the app stack

```bash
bash scripts/deploy.sh
```

On first deploy the script installs the site, reloads nginx, and the app is
reachable over HTTP:

```bash
curl -H 'Host: ai-web-builder.com' http://localhost/nginx-health   # ok
```

If a config already exists, the script never overwrites it (certbot may have
edited it).

## 2) Enable HTTPS (after DNS A records point to this instance)

Set `LETSENCRYPT_EMAIL` in `.env`, then:

```bash
sudo bash scripts/deploy.sh --request-cert
```

This runs `certbot --nginx --redirect` for `ai-web-builder.com`,
`www.ai-web-builder.com` and `admin.ai-web-builder.com` — the same flow the
existing sites use. Manual equivalent:

```bash
sudo certbot --nginx --redirect \
  -d ai-web-builder.com -d www.ai-web-builder.com -d admin.ai-web-builder.com \
  --email you@example.com --agree-tos --no-eff-email
```

After HTTPS works, enable HSTS: edit `/etc/nginx/sites-available/ai-website`,
uncomment the `Strict-Transport-Security` lines (search "HSTS"), then
`sudo nginx -t && sudo systemctl reload nginx`.

Renewal: the host already has certbot's systemd timer (used by the existing
sites); the nginx plugin reloads nginx automatically after renewal. Nothing to
do.

## 3) Day-to-day upgrades

```bash
bash scripts/upgrade.sh        # git pull, rebuild, recreate changed services
```

> The deploy/upgrade scripts only manage the AI-Website containers, the single
> `ai-website` site, and certbot. They require passwordless sudo for the nginx
> / certbot steps (or run them with `sudo`).
