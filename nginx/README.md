# Nginx — shared gateway setup

This EC2 runs **multiple services**, and the `neoshop-api-gateway` **container**
owns `0.0.0.0:80/443` (host nginx cannot bind them — leave it stopped/disabled;
the old `/etc/nginx/sites-*` files are unused). The gateway is the single public
entry point; AI-Website plugs into it.

Traffic flow:

```
internet → neoshop-api-gateway (:80/:443)
             ├─ api.barkosem.com          → neoshop services (untouched)
             ├─ ai-web-builder.com / www  → ai-website-frontend:3000 ─┐
             │   /api/*, /health, /live, /ready → ai-website-backend:4000 ─┤ shared
             └─ admin.ai-web-builder.com  → ai-website-admin:3000 ────────┘ Docker network
```

The app containers join the gateway's Docker network (auto-detected by
`scripts/deploy.sh`, overridable via `GATEWAY_NETWORK` in `.env`) with DNS
aliases `ai-website-frontend`, `ai-website-backend`, `ai-website-admin`. The
scripts also auto-detect the gateway's **mounted nginx config dir** (via
`docker inspect` mounts) and install our server blocks there as
`ai-website.conf` — no manual copying in the normal case.

Files in this repo:

- `gateway/ai-website.http.conf` — HTTP bootstrap (serves the app + ACME
  challenges on port 80; no cert needed).
- `gateway/ai-website.https.conf` — full config: 80 → 443 redirect + HTTPS
  server blocks. Installed automatically once certificates exist.

Both use `resolver 127.0.0.11` + variable `proxy_pass`, so the gateway reloads
fine even when this stack is down, and survives container IP changes.

## One-time gateway prerequisites

The gateway container needs these host paths mounted (add to the gateway's
compose file / run flags if missing, then recreate it once):

```yaml
volumes:
  - /var/www/certbot:/var/www/certbot        # ACME HTTP-01 webroot (cert issuance/renewal)
  - /etc/letsencrypt:/etc/letsencrypt:ro     # certificates (HTTPS step)
```

The deploy scripts check for these mounts and print exact instructions when
one is missing.

## 1) Deploy the app stack

```bash
bash scripts/deploy.sh
```

This builds and starts the containers, then installs the HTTP bootstrap config
into the gateway and reloads it. Verify:

```bash
curl -H 'Host: ai-web-builder.com' http://localhost/nginx-health   # ok
curl -I http://ai-web-builder.com/                                 # 200 from the frontend
```

If the gateway's config dir can't be auto-detected, the script prints its
mounts and the exact manual `cp` + reload commands.

## 2) Enable HTTPS (after DNS A records point to this instance)

Set `LETSENCRYPT_EMAIL` in `.env`, then:

```bash
sudo bash scripts/deploy.sh --request-cert
```

This obtains certificates for `ai-web-builder.com`, `www.ai-web-builder.com`
and `admin.ai-web-builder.com` via host certbot (webroot, served by the
gateway), then swaps the gateway config to the HTTPS version and reloads.

Renewal: certbot renews on the host via its systemd timer. Add a deploy hook
so the gateway picks up renewed certificates:

```bash
sudo tee /etc/letsencrypt/renewal-hooks/deploy/reload-gateway.sh >/dev/null <<'EOF'
#!/bin/sh
docker exec neoshop-api-gateway nginx -s reload
EOF
sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-gateway.sh
```

## 3) Day-to-day upgrades

```bash
bash scripts/upgrade.sh        # git pull, rebuild, recreate changed services
```

> The deploy/upgrade scripts only manage the AI-Website containers, the
> `ai-website.conf` file inside the gateway's config dir, and (with
> `--request-cert`) host certbot. They never touch other services, host nginx,
> or public ports.
