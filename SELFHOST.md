# Self-hosting the platform on one server

Run the whole product (frontend + API + admin + Postgres + Redis) behind a single
Traefik edge with automatic HTTPS, and let the platform deploy each generated
user site as a sibling container on the same host. No Vercel required.

## What you get

| Service   | URL                                | Purpose                          |
|-----------|------------------------------------|----------------------------------|
| frontend  | `https://<domain>`                 | Product UI                       |
| backend   | `https://api.<domain>`             | API + the deploy engine          |
| admin     | `https://admin.<domain>`           | Admin console                    |
| traefik   | `:80 / :443`                       | Edge proxy + Let's Encrypt TLS   |
| postgres  | internal only                      | Platform database                |
| redis     | internal only                      | Cache / queue                    |
| coolify   | `http://<host>:8000` *(optional)*  | PaaS engine for complex sites    |

Generated user sites are published at `https://<slug>.<domain>`.

## Prerequisites

- A Linux host (or this Mac for local testing) with **Docker 24+** and **Compose v2**.
- A domain you control, with DNS pointing at the host's public IP:
  ```
  A        example.com          <host-ip>
  A        api.example.com      <host-ip>
  A        admin.example.com    <host-ip>
  A        *.example.com        <host-ip>     # one record covers every user site
  ```
- Ports **80** and **443** open to the internet (Let's Encrypt HTTP-01 needs 80).

> The wildcard `*.example.com` record is what makes per-site subdomains work.
> If your DNS provider doesn't support wildcards, add one `A`/`CNAME` per site.

## Quick start

```bash
# 1) Configure
cp .env.selfhost.example .env
$EDITOR .env                       # set DEPLOY_BASE_DOMAIN, ACME_EMAIL, POSTGRES_PASSWORD

# 2) Bring up the platform
docker compose -f docker-compose.selfhost.yml --env-file .env up -d --build

# 3) Watch it come healthy
docker compose -f docker-compose.selfhost.yml --env-file .env ps
docker logs -f backend             # first boot runs `prisma migrate deploy`
```

Open `https://<domain>`. The first certificate issuance can take ~30–60s.

## Localhost testing (no public domain / no TLS)

Let's Encrypt can't issue for `localhost`. For local-only runs, drop TLS and use
the plain `web` entrypoint:

1. In `docker-compose.selfhost.yml`, change every `entrypoints: "websecure"` to
   `entrypoints: "web"` and delete the `tls.certresolver` lines on the
   frontend/backend/admin labels.
2. Set `DEPLOY_BASE_DOMAIN=localhost` in `.env`.
3. `docker compose -f docker-compose.selfhost.yml --env-file .env up -d --build`.
4. Reach the platform at `http://localhost` (port 80).

> A proper local-TLS setup uses mkcert + a local resolver; the plain-HTTP path
> above is enough to exercise the deploy flow end to end.

## How user sites are deployed

The backend runs with `DEPLOY_PROVIDER=docker` and the host Docker socket mounted.
For each deploy it:

> Repos must be **public**. The platform always pushes generated code to public
> GitHub repos and clones them over unauthenticated HTTPS; deploy does not support
> private repos. (If a user later flips their repo to private on GitHub, deploy will
> fail until they make it public again.)

1. Clones the repo into `DEPLOY_WORKSPACE_DIR/<slug>` (default
   `/var/lib/lovecode/sites/<slug>`).
2. `docker build`s the site's own `Dockerfile` (every generated template ships one).
3. `docker run`s it on the `lovecode_web` network with:
   - a **named volume** for stateful data (`site-<slug>-data`),
   - **Traefik labels** so `https://<slug>.<domain>` routes to it,
   - **CPU / memory limits** to contain noisy neighbors,
   - a `lovecode.managed=true` label so restarts are clean.

The build workspace **must be a host path bind-mounted at the same absolute
path** inside the backend container (the host daemon builds from that path). The
compose file already wires `${DEPLOY_WORKSPACE_DIR}:/var/lib/lovecode/sites`.

> Security: building untrusted, AI-generated code (arbitrary `postinstall`/`build`
> scripts) directly on the host is risky. **Previews keep using the sandboxed
> E2B runtime**; reserve host builds for trusted/deployed sites, or point builds
> at an isolated builder (rootless Docker, BuildKit in a container, or a remote
> daemon) before opening deploys to the public.

### Using Coolify instead

For multi-container apps (e.g. a Vite frontend + PocketBase backend) or a managed
PaaS UI, deploy through the bundled Coolify:

```bash
# 1) Start Coolify alongside the platform
docker compose -f docker-compose.selfhost.yml --env-file .env --profile coolify up -d

# 2) Finish Coolify's first-run setup at http://<host>:8000, then create an API token.

# 3) Switch the platform to Coolify
#    .env:  DEPLOY_PROVIDER=coolify
#           COOLIFY_URL=http://coolify:8000
#           COOLIFY_TOKEN=<token>
docker compose -f docker-compose.selfhost.yml --env-file .env up -d backend
```

The backend talks to Coolify over its API — Coolify stays a swappable sibling, not
merged source.

## Data & backups

Persistent state lives in three places:

- **Postgres** (`pgdata` volume): platform data — users, projects, deploy records.
- **Redis** (`redis_data`): cache/queue; safe to recreate.
- **User-site workspace** (`/var/lib/lovecode/sites`): cloned sources + per-site
  named volumes (`site-<slug>-data`) holding SQLite/libSQL files.

Snapshot them regularly, e.g.:

```bash
# Postgres
docker exec postgres pg_dump -U lovecode lovecode > backups/pg-$(date +%F).sql
# Site workspace (sources)
tar -czf backups/sites-$(date +%F).tgz /var/lib/lovecode/sites
# Per-site data volumes
for v in $(docker volume ls -q --filter name=site-); do
  docker run --rm -v "$v":/data -v "$PWD/backups":/b alpine \
    tar -czf "/b/$v-$(date +%F).tgz" -C /data .
done
```

## Day-2 operations

```bash
# Update to latest code
git pull && docker compose -f docker-compose.selfhost.yml --env-file .env up -d --build

# Logs
docker compose -f docker-compose.selfhost.yml logs -f backend
docker logs -f traefik

# Re-deploy a single service
docker compose -f docker-compose.selfhost.yml up -d --build backend

# Remove all managed user sites (destructive)
docker rm -f $(docker ps -aq --filter label=lovecode.managed=true)
```

## Roadmap / known limits

- **Single host**: SQLite/libSQL volumes pin a site to this machine. To go
  multi-node, move site databases to hosted Postgres/libSQL.
- **Build isolation**: replace host `docker build` with a sandboxed builder
  before public deploys.
- **Fair scheduling**: add a build queue + per-account quotas to bound concurrent
  builds.
- **Coolify runner**: `CoolifyDeployRunner` is a stub today; wire it to Coolify's
  application/deployment API to enable the `coolify` provider end to end.
- **Public repos only**: deploy clones over unauthenticated HTTPS and the platform
  always pushes public repos; private repositories are intentionally unsupported.
