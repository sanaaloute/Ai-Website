# OpenHost API Deployment Guide

This guide explains how to deploy applications and services on OpenHost **entirely through the REST API**, without using the web dashboard after the initial API token creation.

---

## Table of Contents

1. [Overview](#overview)
2. [Before You Start](#before-you-start)
3. [Authentication](#authentication)
4. [Prerequisites](#prerequisites)
5. [Deploying Applications](#deploying-applications)
6. [Deploying Docker Compose Services](#deploying-docker-compose-services)
7. [Generic Deploy Webhook](#generic-deploy-webhook)
8. [Managing Environment Variables](#managing-environment-variables)
9. [Monitoring Deployments](#monitoring-deployments)
10. [Troubleshooting](#troubleshooting)

---

## Overview

OpenHost exposes a full REST API (`/api/v1`) that allows you to:

- Create and manage projects, environments, servers, and SSH keys
- Deploy applications from Git repositories, Dockerfiles, or container images
- Deploy Docker Compose stacks as Services
- Trigger and monitor deployments
- Manage environment variables
- Retrieve logs and resource status

Everything that can be done through the dashboard can also be done through the API.

### Base URL

```text
https://<your-openhost-domain>/api/v1
```

All examples below assume:

```bash
OPENHOST="https://openhost.example.com"
TOKEN="your-api-token"
```

---

## Before You Start

You need a running OpenHost instance. If you have not installed it yet, follow the standard installation:

```bash
git clone <repo-url>
cd openhost
bash scripts/build.sh latest
sudo env ROOT_USERNAME=admin \
         ROOT_USER_EMAIL=admin@example.com \
         ROOT_USER_PASSWORD=SecurePassword123 \
         AUTOUPDATE=false \
         bash scripts/install.sh
```

After installation, the dashboard is available at `http://YOUR_SERVER_IP:8000`.

---

## Authentication

OpenHost uses Laravel Sanctum Bearer tokens. The only operation that requires the web dashboard is creating the API token.

### Creating an API Token

1. Log in to the OpenHost dashboard.
2. Go to **Settings → API / Tokens**.
3. Click **Create Token**.
4. Choose the abilities (scopes) you need.

### Token Abilities

| Ability | Description |
|---|---|
| `read` | Read projects, servers, applications, services, deployments, and environment variables. |
| `write` | Create and update resources such as projects, servers, applications, and services. |
| `deploy` | Trigger deployments, start, restart, and stop resources. |
| `read:sensitive` | Read sensitive data such as raw compose files, webhook secrets, private keys, and build secrets. |
| `root` | Full access to all endpoints, including reading/writing sensitive data. |

> **Note:** `write:sensitive` exists in code but is not exposed in the dashboard and is not used by API route authorization. Use `root` for sensitive write operations.

> **Note:** A token is scoped to the team that is active when the token is created. All subsequent API calls operate within that team.

### Enabling the API

If the API is disabled, you must enable it with a token created while the **root/admin team is active** (`team_id = 0`) and that has `write` permission:

```bash
curl -H "Authorization: Bearer $ROOT_TOKEN" \
     "$OPENHOST/api/v1/enable"
```

> **Important:** The `root` ability alone is not sufficient if the token was created in a non-root team. The token must belong to the root team.

To disable:

```bash
curl -H "Authorization: Bearer $ROOT_TOKEN" \
     "$OPENHOST/api/v1/disable"
```

### Authenticating Requests

Include the token in every request:

```bash
curl -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -H "Accept: application/json" \
     "$OPENHOST/api/v1/teams/current"
```

---

## Prerequisites

Before deploying anything, you must create the following resources in order:

```
Team → Project → Environment → Server (with Private Key) → Destination
```

The token already carries the team context, so the first resource to create is a **Project**.

### 1. Create a Project

A project is the top-level container for resources.

```bash
PROJECT=$(curl -s -X POST "$OPENHOST/api/v1/projects" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"api-project","description":"Deployed via API"}')

PROJECT_UUID=$(echo "$PROJECT" | jq -r '.uuid')
echo "Project UUID: $PROJECT_UUID"
```

**Response:**

```json
{
  "uuid": "proj-xxxxxxxxxx"
}
```

### 2. Create an Environment

Environments represent deployment stages such as `production`, `staging`, or `development`.

```bash
ENV=$(curl -s -X POST "$OPENHOST/api/v1/projects/$PROJECT_UUID/environments" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"production"}')

ENV_UUID=$(echo "$ENV" | jq -r '.uuid')
echo "Environment UUID: $ENV_UUID"
```

You can list existing environments:

```bash
curl -s "$OPENHOST/api/v1/projects/$PROJECT_UUID/environments" \
  -H "Authorization: Bearer $TOKEN"
```

### 3. Add a Private Key

Servers need an SSH private key to connect to the host where deployments run. The key can be a plain PEM/OpenSSH key or base64-encoded.

```bash
KEY=$(curl -s -X POST "$OPENHOST/api/v1/security/keys" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"server-key\",
    \"description\": \"SSH key for production server\",
    \"private_key\": \"$PRIV_KEY\"
  }")

KEY_UUID=$(echo "$KEY" | jq -r '.uuid')
echo "Key UUID: $KEY_UUID"
```

> **Security:** Store the private key securely. If your token has `read:sensitive`, the key can be read back through the API.

### 4. Create a Server

A server represents the target host where OpenHost deploys resources.

```bash
SERVER=$(curl -s -X POST "$OPENHOST/api/v1/servers" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"prod-1\",
    \"description\": \"Production server\",
    \"ip\": \"10.0.0.5\",
    \"port\": 22,
    \"user\": \"root\",
    \"private_key_uuid\": \"$KEY_UUID\",
    \"proxy_type\": \"traefik\",
    \"instant_validate\": false
  }")

SERVER_UUID=$(echo "$SERVER" | jq -r '.uuid')
echo "Server UUID: $SERVER_UUID"
```

**Important fields:**

| Field | Description |
|---|---|
| `ip` | IP address or hostname of the server. |
| `port` | SSH port, usually `22`. |
| `user` | SSH user with permission to run Docker commands. |
| `private_key_uuid` | UUID of the SSH key created in the previous step. |
| `proxy_type` | Reverse proxy to use: `traefik`, `caddy`, or `none`. |
| `instant_validate` | If `true`, OpenHost will immediately validate the SSH connection. |

You can validate the server later:

```bash
curl -s -X GET "$OPENHOST/api/v1/servers/$SERVER_UUID/validate" \
  -H "Authorization: Bearer $TOKEN"
```

### 5. Find the Destination

A destination represents a Docker network on the server. It is created automatically when the server is validated.

If the server has only one destination, OpenHost will use it automatically. If it has multiple destinations, you must pass `destination_uuid` in deployment requests.

> **Note:** There is currently no dedicated API endpoint to list a server's destinations. You can infer whether multiple destinations exist by attempting to create a resource without `destination_uuid` and checking the error response, or by inspecting the server through the dashboard.

---

## Deploying Applications

An OpenHost **Application** is typically a single service built from source or pulled from a container registry.

### Common Fields

All application creation endpoints accept these common fields:

| Field | Required | Description |
|---|---|---|
| `project_uuid` | Yes | UUID of the project. |
| `server_uuid` | Yes | UUID of the server. |
| `environment_uuid` or `environment_name` | Yes | Target environment. |
| `destination_uuid` | Conditional | Required when the server has multiple destinations. |
| `build_pack` | Conditional | Required for Git-based methods. Examples: `nixpacks`, `dockerfile`, `dockercompose`, `static`. |
| `ports_exposes` | Conditional | Required for Git-based apps and Docker image apps. Optional/ignored for `dockerfile` apps. Not required when `build_pack` is `dockercompose`. |
| `name` | No | Human-readable name. |
| `description` | No | Description. |
| `instant_deploy` | No | If `true`, deploy immediately after creation. |
| `is_auto_deploy_enabled` | No | Auto-deploy on Git push. |
| `is_force_https_enabled` | No | Redirect HTTP to HTTPS. |
| `domains` | No | Comma-separated list of domains, e.g. `https://app.example.com`. Not used when `build_pack` is `dockercompose`; use `docker_compose_domains` instead. |

### Method 1: Public Git Repository

Best for open-source projects or repositories that do not require authentication. When `build_pack` is `dockercompose`, use `docker_compose_domains` instead of the top-level `domains` field.

```bash
curl -s -X POST "$OPENHOST/api/v1/applications/public" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"project_uuid\": \"$PROJECT_UUID\",
    \"server_uuid\": \"$SERVER_UUID\",
    \"environment_uuid\": \"$ENV_UUID\",
    \"name\": \"my-public-app\",
    \"git_repository\": \"https://github.com/coollabsio/coolify\",
    \"git_branch\": \"main\",
    \"build_pack\": \"nixpacks\",
    \"ports_exposes\": \"3000\",
    \"instant_deploy\": true
  }" | jq
```

**How it works:**

1. OpenHost clones the repository on the target server.
2. It detects or uses the specified build pack (`nixpacks`, `dockerfile`, etc.).
3. It builds the container image.
4. It starts the container and wires it to the reverse proxy.

**Build packs:**

| Build Pack | Use Case |
|---|---|
| `nixpacks` | Auto-detects language and builds (Node.js, Python, Ruby, Go, etc.). |
| `dockerfile` | Uses the `Dockerfile` in the repository. |
| `dockercompose` | Uses the `docker-compose.yaml` in the repository (see below). |
| `static` | Static sites served by Nginx. |

### Method 2: Private Git Repository via Deploy Key

Best for self-hosted Git servers or repositories that cannot use a GitHub App.

```bash
curl -s -X POST "$OPENHOST/api/v1/applications/private-deploy-key" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"project_uuid\": \"$PROJECT_UUID\",
    \"server_uuid\": \"$SERVER_UUID\",
    \"environment_uuid\": \"$ENV_UUID\",
    \"name\": \"my-private-app\",
    \"private_key_uuid\": \"$KEY_UUID\",
    \"git_repository\": \"git@git.example.com:user/repo.git\",
    \"git_branch\": \"main\",
    \"build_pack\": \"nixpacks\",
    \"ports_exposes\": \"3000\",
    \"instant_deploy\": true
  }" | jq
```

**How it works:**

1. OpenHost installs the specified private key on the server.
2. It clones the repository using `git@host:user/repo.git`.
3. The build and deploy flow is identical to public Git deployments.

### Method 3: Private GitHub Repository via GitHub App

Best for GitHub repositories when you want fine-grained access control.

```bash
curl -s -X POST "$OPENHOST/api/v1/applications/private-github-app" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"project_uuid\": \"$PROJECT_UUID\",
    \"server_uuid\": \"$SERVER_UUID\",
    \"environment_uuid\": \"$ENV_UUID\",
    \"name\": \"my-github-app\",
    \"github_app_uuid\": \"GH_APP_UUID\",
    \"git_repository\": \"user/repo\",
    \"git_branch\": \"main\",
    \"build_pack\": \"nixpacks\",
    \"ports_exposes\": \"3000\",
    \"instant_deploy\": true
  }" | jq
```

**How it works:**

1. OpenHost uses the configured GitHub App to authenticate.
2. It clones the repository without needing a deploy key.
3. Webhooks can be automatically configured for auto-deploy.

### Method 4: Dockerfile

Best when you want to deploy from a `Dockerfile` without a Git repository.

```bash
DOCKERFILE_B64=$(base64 -w 0 <<'EOF'
FROM nginx:alpine
COPY . /usr/share/nginx/html
EXPOSE 80
EOF
)

curl -s -X POST "$OPENHOST/api/v1/applications/dockerfile" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"project_uuid\": \"$PROJECT_UUID\",
    \"server_uuid\": \"$SERVER_UUID\",
    \"environment_uuid\": \"$ENV_UUID\",
    \"name\": \"my-dockerfile-app\",
    \"dockerfile\": \"$DOCKERFILE_B64\",
    \"instant_deploy\": true
  }" | jq
```

**How it works:**

1. OpenHost writes the base64-decoded Dockerfile to the server.
2. It derives the exposed port from the `EXPOSE` instruction in the Dockerfile (or defaults to `80`).
3. It builds the image.
4. It runs the container and exposes the detected port.

> **Note:** The `dockerfile` field must be **base64-encoded**. The `ports_exposes` field is optional for this endpoint and will be overwritten by the detected port.

### Method 5: Docker Image

Best for deploying pre-built images from a registry.

```bash
curl -s -X POST "$OPENHOST/api/v1/applications/dockerimage" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"project_uuid\": \"$PROJECT_UUID\",
    \"server_uuid\": \"$SERVER_UUID\",
    \"environment_uuid\": \"$ENV_UUID\",
    \"name\": \"my-image-app\",
    \"docker_registry_image_name\": \"nginx\",
    \"docker_registry_image_tag\": \"alpine\",
    \"ports_exposes\": \"80\",
    \"instant_deploy\": true
  }" | jq
```

**How it works:**

1. OpenHost pulls the specified image on the target server.
2. It runs the container with the configured environment variables.
3. It registers the container with the reverse proxy.

### Application Lifecycle

```bash
# Start or deploy
POST /api/v1/applications/{uuid}/start

# Restart
POST /api/v1/applications/{uuid}/restart

# Stop
POST /api/v1/applications/{uuid}/stop

# With options
POST /api/v1/applications/{uuid}/start?force=true&instant_deploy=true
POST /api/v1/applications/{uuid}/stop?docker_cleanup=true
```

---

## Deploying Docker Compose Services

A **Service** in OpenHost is the preferred way to deploy Docker Compose stacks, databases, and third-party applications.

### Method 1: Custom Compose Service

Best for multi-container applications, databases, or any workload described by a `docker-compose.yaml` file.

```bash
COMPOSE_B64=$(base64 -w 0 docker-compose.yaml)

curl -s -X POST "$OPENHOST/api/v1/services" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"project_uuid\": \"$PROJECT_UUID\",
    \"server_uuid\": \"$SERVER_UUID\",
    \"environment_uuid\": \"$ENV_UUID\",
    \"name\": \"my-compose-stack\",
    \"description\": \"Custom compose deployment via API\",
    \"docker_compose_raw\": \"$COMPOSE_B64\",
    \"instant_deploy\": true,
    \"urls\": [
      { \"name\": \"web\", \"url\": \"https://myapp.example.com\" }
    ]
  }" | jq
```

**How it works:**

1. OpenHost base64-decodes and parses the compose file.
2. It validates the file for command injection and YAML syntax.
3. It writes `docker-compose.yaml` and `.env` to `/data/openhost/services/{uuid}/` on the server.
4. It runs `docker compose up -d --remove-orphans --force-recreate --build`.

**Magic environment variables:**

OpenHost automatically injects variables based on service names and exposed ports:

| Variable | Example | Description |
|---|---|---|
| `SERVICE_URL_<NAME>_<PORT>` | `SERVICE_URL_GHOST_2368` | Full public URL for the service (scheme + host). |
| `SERVICE_FQDN_<NAME>_<PORT>` | `SERVICE_FQDN_GHOST_2368` | Public hostname only (no scheme). |
| `SERVICE_URL_<NAME>` | `SERVICE_URL_GHOST` | Alias for the first full URL. |
| `SERVICE_FQDN_<NAME>` | `SERVICE_FQDN_GHOST` | Alias for the first hostname. |
| `SERVICE_NAME_<NAME>` | `SERVICE_NAME_GHOST` | Docker service name. |
| `SERVICE_USER_<NAME>` | `SERVICE_USER_MYSQL` | Auto-generated database user. |
| `SERVICE_PASSWORD_<NAME>` | `SERVICE_PASSWORD_MYSQL` | Auto-generated database password. |
| `SERVICE_PASSWORD_<NAME>ROOT` | `SERVICE_PASSWORD_MYSQLROOT` | Auto-generated root password. |

Example compose file that uses these variables:

```yaml
services:
  ghost:
    image: ghost:5
    volumes:
      - ghost-content-data:/var/lib/ghost/content
    environment:
      - SERVICE_URL_GHOST_2368
      - url=$SERVICE_URL_GHOST
      - database__client=mysql
      - database__connection__host=mysql
      - database__connection__user=$SERVICE_USER_MYSQL
      - database__connection__password=$SERVICE_PASSWORD_MYSQL
    depends_on:
      mysql:
        condition: service_healthy
  mysql:
    image: mysql:8.0
    volumes:
      - ghost-mysql-data:/var/lib/mysql
    environment:
      - MYSQL_USER=${SERVICE_USER_MYSQL}
      - MYSQL_PASSWORD=${SERVICE_PASSWORD_MYSQL}
      - MYSQL_ROOT_PASSWORD=${SERVICE_PASSWORD_MYSQLROOT}

volumes:
  ghost-content-data:
  ghost-mysql-data:
```

### Method 2: One-Click Service

Best for quickly deploying well-known open-source services.

```bash
curl -s -X POST "$OPENHOST/api/v1/services" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"project_uuid\": \"$PROJECT_UUID\",
    \"server_uuid\": \"$SERVER_UUID\",
    \"environment_uuid\": \"$ENV_UUID\",
    \"type\": \"actualbudget\",
    \"name\": \"budget\",
    \"instant_deploy\": true
  }" | jq
```

**How it works:**

1. OpenHost looks up the service type in `templates/service-templates-latest.json`.
2. It uses the template's base64-encoded compose file.
3. It deploys the stack with default environment variables.

> You cannot provide both `type` and `docker_compose_raw` in the same request.

### Service Lifecycle

```bash
POST /api/v1/services/{uuid}/start
POST /api/v1/services/{uuid}/restart?latest=true
POST /api/v1/services/{uuid}/stop?docker_cleanup=true
```

- `restart?latest=true` pulls the latest images before restarting.
- `stop?docker_cleanup=true` removes containers and networks (default is `true`).

---

## Generic Deploy Webhook

The `/api/v1/deploy` endpoint is a universal trigger. It is useful for CI/CD pipelines.

### Deploy by Resource UUID

```bash
curl -s -X POST "$OPENHOST/api/v1/deploy" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "uuid": "APP_UUID" }'
```

### Deploy Multiple Resources

```bash
curl -s -X POST "$OPENHOST/api/v1/deploy" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "uuid": "app-uuid,service-uuid" }'
```

### Force Rebuild

```bash
curl -s -X POST "$OPENHOST/api/v1/deploy" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "uuid": "APP_UUID", "force": true }'
```

### Deploy by Tag

Tags group multiple resources. This deploys every application and service with the tag.

```bash
curl -s -X POST "$OPENHOST/api/v1/deploy" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "tag": "production" }'
```

### Pull Request Preview

For Docker image applications, you can deploy a preview from a PR:

```bash
curl -s -X POST "$OPENHOST/api/v1/deploy" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "uuid": "APP_UUID",
    "pull_request_id": 42,
    "docker_tag": "pr-42"
  }'
```

**Parameter rules:**

- `uuid` and `tag` cannot be used together.
- `tag` and `pull_request_id` cannot be used together.
- `tag` and `docker_tag` cannot be used together.
- `docker_tag` requires `pull_request_id`.
- `pull_request_id` previews are created automatically only for Docker image applications. For other build packs, the preview deployment must already exist.

---

## Managing Environment Variables

Environment variables are attached to resources and are encrypted at rest.

### For Applications

```bash
# List
GET /api/v1/applications/{uuid}/envs

# Create single
POST /api/v1/applications/{uuid}/envs
{
  "key": "DATABASE_URL",
  "value": "postgres://user:pass@db:5432/app",
  "is_runtime": true,
  "is_buildtime": true,
  "is_preview": false,
  "is_multiline": false,
  "is_literal": false
}

# Bulk create/update
PATCH /api/v1/applications/{uuid}/envs/bulk
{
  "data": [
    { "key": "FOO", "value": "bar", "is_runtime": true, "is_buildtime": false },
    { "key": "BAZ", "value": "qux", "is_runtime": true }
  ]
}

# Delete
DELETE /api/v1/applications/{uuid}/envs/{env_uuid}
```

### For Services

```bash
GET /api/v1/services/{uuid}/envs
POST /api/v1/services/{uuid}/envs
PATCH /api/v1/services/{uuid}/envs
PATCH /api/v1/services/{uuid}/envs/bulk
DELETE /api/v1/services/{uuid}/envs/{env_uuid}
```

Service environment variables do not support `is_preview`, `is_runtime`, or `is_buildtime`.

### Important Flags

| Flag | Meaning |
|---|---|
| `is_runtime` | Available to the running container. |
| `is_buildtime` | Available during the image build. |
| `is_preview` | Only used for preview deployments. |
| `is_literal` | Value is used as-is, without variable interpolation. |
| `is_multiline` | Value contains newlines. |

---

## Monitoring Deployments

### List Running Deployments

```bash
curl -s "$OPENHOST/api/v1/deployments" \
  -H "Authorization: Bearer $TOKEN"
```

### Get Deployment by UUID

```bash
curl -s "$OPENHOST/api/v1/deployments/DEPLOYMENT_UUID" \
  -H "Authorization: Bearer $TOKEN"
```

### Cancel a Deployment

```bash
curl -s -X POST "$OPENHOST/api/v1/deployments/DEPLOYMENT_UUID/cancel" \
  -H "Authorization: Bearer $TOKEN"
```

### View Application Logs

```bash
curl -s "$OPENHOST/api/v1/applications/APP_UUID/logs?lines=100" \
  -H "Authorization: Bearer $TOKEN"
```

### Check Resource Status

```bash
curl -s "$OPENHOST/api/v1/applications/APP_UUID" -H "Authorization: Bearer $TOKEN"
curl -s "$OPENHOST/api/v1/services/SERVICE_UUID" -H "Authorization: Bearer $TOKEN"
curl -s "$OPENHOST/api/v1/resources" -H "Authorization: Bearer $TOKEN"
```

---

## Complete Example Script

```bash
#!/bin/bash
set -e

OPENHOST="https://openhost.example.com"
TOKEN="your-api-token"
PRIV_KEY="$(cat ~/.ssh/openhost)"

# 1. Create project
PROJECT_UUID=$(curl -s -X POST "$OPENHOST/api/v1/projects" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"api-project","description":"Deployed via API"}' | jq -r '.uuid')

# 2. Create environment
ENV_UUID=$(curl -s -X POST "$OPENHOST/api/v1/projects/$PROJECT_UUID/environments" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"production"}' | jq -r '.uuid')

# 3. Add private key
KEY_UUID=$(curl -s -X POST "$OPENHOST/api/v1/security/keys" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"server-key\",\"private_key\":\"$PRIV_KEY\"}" | jq -r '.uuid')

# 4. Create server
SERVER_UUID=$(curl -s -X POST "$OPENHOST/api/v1/servers" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\":\"prod-1\",
    \"ip\":\"10.0.0.5\",
    \"private_key_uuid\":\"$KEY_UUID\",
    \"proxy_type\":\"traefik\"
  }" | jq -r '.uuid')

# 5. Deploy public application
APP=$(curl -s -X POST "$OPENHOST/api/v1/applications/public" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"project_uuid\":\"$PROJECT_UUID\",
    \"server_uuid\":\"$SERVER_UUID\",
    \"environment_uuid\":\"$ENV_UUID\",
    \"name\":\"my-app\",
    \"git_repository\":\"https://github.com/user/repo\",
    \"git_branch\":\"main\",
    \"build_pack\":\"nixpacks\",
    \"ports_exposes\":\"3000\",
    \"instant_deploy\":true
  }")

APP_UUID=$(echo "$APP" | jq -r '.uuid')
echo "Deployed application: $APP_UUID"

# 6. Add environment variables
curl -s -X PATCH "$OPENHOST/api/v1/applications/$APP_UUID/envs/bulk" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "data": [
      { "key": "NODE_ENV", "value": "production", "is_runtime": true },
      { "key": "API_KEY", "value": "secret", "is_runtime": true, "is_buildtime": false }
    ]
  }'

# 7. Trigger deploy
curl -s -X POST "$OPENHOST/api/v1/deploy" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"uuid\":\"$APP_UUID\"}"
```

---

## Troubleshooting

### API returns `401 Unauthorized`

- Token is missing or invalid.
- Token has expired.
- API is disabled. Enable it with a token from the root team that has `write` permission.

### API returns `403 Forbidden`

- The token does not have the required ability for the endpoint.

### API returns `404 Not Found`

- The resource does not exist.
- The resource exists but is not in the token’s team.

### API returns `422 Validation Error`

- Check that `Content-Type: application/json` is set.
- Verify required fields such as `project_uuid`, `server_uuid`, and `environment_uuid`.
- Ensure base64 fields (`dockerfile`, `docker_compose_raw`) are valid UTF-8 after decoding.

### Server validation fails

- Verify the SSH key is correct and the user has passwordless sudo.
- Ensure Docker is installed on the target server, or let OpenHost install it.
- Check that the server IP and port are reachable from OpenHost.

### Deployment fails

- Check deployment logs: `GET /api/v1/deployments/{uuid}`.
- Check application logs: `GET /api/v1/applications/{uuid}/logs`.
- Verify environment variables are set correctly.
- For compose services, validate the YAML locally first:

```bash
docker compose config
```

---

## Reference

- API routes: `routes/api.php`
- API controllers: `app/Http/Controllers/Api/`
- API helpers: `bootstrap/helpers/api.php`
- Service templates: `templates/service-templates-latest.json`
- OpenAPI docs: `https://<your-openhost>/docs`
