# Kong gateway — AI-Website routes

This EC2 runs **multiple services**, and the `neoshop-api-gateway` container —
**Kong Gateway** — owns `0.0.0.0:80/443` (Kong proxy ports 8000/8443). Host
nginx is unused (leave it disabled). Kong is configured through its **Admin
API** (container port 8001) — the deploy scripts do this automatically; no
config files, mounts, or reloads, and everything persists in Kong's database
across container recreates.

Kong often binds the Admin API to the container's loopback only (its default),
so the scripts auto-discover the first transport that answers `/status`:

1. `$KONG_ADMIN_URL` (env or `.env`), if set
2. `http://127.0.0.1:8001` on the host (if the port is published)
3. `http://<gateway-container-ip>:8001`
4. `docker exec <gateway> curl … http://127.0.0.1:8001` (if the image has curl)
5. a throwaway `curlimages/curl` container sharing the gateway's network
   namespace (works with zero changes to the gateway image)

Traffic flow:

```
internet → neoshop-api-gateway (Kong :80/:443)
             ├─ api.barkosem.com          → neoshop services (untouched)
             ├─ ai-web-builder.com / www  → service ai-website-frontend:3000 ─┐
             │   /api, /health, /live, /ready → service ai-website-backend:4000 ┤ shared
             └─ admin.ai-web-builder.com  → service ai-website-admin:3000 ──────┘ Docker network
```

The app containers join the gateway's Docker network (auto-detected by
`scripts/deploy.sh`, overridable via `GATEWAY_NETWORK` in `.env`) with DNS
aliases `ai-website-frontend`, `ai-website-backend`, `ai-website-admin`. Kong
resolves those aliases through Docker DNS at request time.

What the scripts manage in Kong (idempotent upserts):

| Service | Upstream | Route | Match |
|---|---|---|---|
| `ai-website-frontend` | `http://ai-website-frontend:3000` | `ai-website-web` | hosts `ai-web-builder.com`, `www…`, path `/` |
| `ai-website-backend` | `http://ai-website-backend:4000` (15-min SSE timeouts) | `ai-website-api` | same hosts, paths `/api`, `/health`, `/live`, `/ready` |
| `ai-website-admin` | `http://ai-website-admin:3000` | `ai-website-admin` | host `admin.ai-web-builder.com`, path `/` |
| `ai-website-acme` | `http://<host-bridge-ip>:8888` | `ai-website-acme` | our hosts, path `/.well-known/acme-challenge`, HTTP only |

All routes use `strip_path: false` + `preserve_host: true` (path and Host pass
through unchanged, like a plain nginx `proxy_pass`). Longer prefixes win over
`/`, so API traffic never hits the frontend route.

## 1) Deploy the app stack

```bash
bash scripts/deploy.sh
```

Builds and starts the containers, then upserts the Kong services/routes and
probes through Kong. Verify:

```bash
curl -H 'Host: ai-web-builder.com' http://localhost/health   # 200 from the backend
curl -I http://ai-web-builder.com/                           # 200 from the frontend
```

If the Admin API isn't reachable by any transport, set `KONG_ADMIN_URL` in
`.env` (e.g. `http://<kong-container-ip>:8001`) and re-run. Inspect what Kong
serves with `bash scripts/kong-admin.sh GET /services` (or `/routes`).

## 2) Enable HTTPS (after DNS A records point to this instance)

Set `LETSENCRYPT_EMAIL` in `.env`, then:

```bash
sudo bash scripts/deploy.sh --request-cert
```

How it works (no mounts, no gateway changes):

1. A Kong route forwards `/.well-known/acme-challenge` on our domains to
   `certbot --standalone` on the host (port 8888, used only during issuance).
2. certbot issues into `/etc/letsencrypt` on the host.
3. The cert + key are uploaded to Kong via the Admin API
   (`PUT /certificates/ai-web-builder.com`, SNIs: apex, www, admin) — Kong
   starts serving TLS immediately.
4. A renewal hook (`/etc/letsencrypt/renewal-hooks/deploy/ai-website-kong.sh`)
   re-uploads renewed certs automatically; manual equivalent:
   `sudo bash scripts/kong-cert-upload.sh`.

## 3) Day-to-day upgrades

```bash
bash scripts/upgrade.sh        # git pull, rebuild, recreate changed services
```

## Notes & troubleshooting

- **DB-less Kong**: if Kong runs without a database (writes to the Admin API
  are refused), merge `gateway/kong-routes.yml` into the gateway's declarative
  config file and reload Kong instead.
- **DNS caching**: Kong caches upstream DNS per the Docker TTL. After a stack
  recreate, traffic can take a couple of minutes to stabilize; `docker restart
  neoshop-api-gateway` forces immediate re-resolution (brief blip for all
  services — usually unnecessary).
- **Admin API exposure**: port 8001 is reachable from every container on the
  shared network (Kong's default). That's a property of the existing gateway
  setup, not something these scripts change — consider restricting it in the
  gateway's own config.
- Inspect what Kong serves: `bash scripts/kong-admin.sh GET /services` and
  `bash scripts/kong-admin.sh GET /routes` (uses the same transport
  auto-discovery as the deploy scripts).
