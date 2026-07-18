# AI-Website Backend Gateway

Standalone NestJS API gateway for the AI-Website project. Exposes the `/api/*` routes documented in `BACKEND_GATEWAY_CONFIG.md` and `API.md`.

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
# Backend configuration now lives in the project root .env file.
# Edit ../.env and fill in required secrets.

# 3. Development
npm run start:dev

# 4. Production build
npm run build
npm run start:prod
```

## Docker

```bash
docker compose up --build
```

## Required environment variables

The following are validated on startup and the app will fail fast if missing:

- `SUPABASE_URL` (or `NEXT_PUBLIC_SUPABASE_URL`)
- `SUPABASE_SERVICE_ROLE_KEY`
- `E2B_API_KEY`

Optional integrations become real SDK calls when configured:

- Supabase (`@supabase/supabase-js`)
- E2B (`e2b`)
- Paddle (`@paddle/paddle-node-sdk`)
- GitCC/GitLab OAuth
- OpenHost / Coolify

## Implemented routes

- Health: `GET /health`, `GET /live`, `GET /ready`
- Agent / Generation: `/api/agent-stream`, `/api/chat`, `/api/analyze-edit-intent`, `/api/apply-ai-code-stream`, `/api/code/component`, `/api/code/page`, `/api/design/tokens`, `/api/spec/summarize`, `/api/spec/ui-ux-blueprint`, `/api/project/file-plan`
- Sandbox Lifecycle: `/api/create-ai-sandbox-v2`, `/api/kill-sandbox`, `/api/sandbox-renew`, `/api/sandbox-status`, `/api/sandbox-logs`, `/api/sandbox-snapshot`, `/api/restart-preview`, `/api/run-command-v2`, `/api/install-packages-v2`, `/api/get-sandbox-files`, `/api/get-sandbox-files-binary`, `/api/get-sandbox-pocketbase-info`, `/api/preview-health`, `/api/monitor-preview-logs`, `/api/report-preview-error`, `/api/check-preview-errors`, `/api/preview-inline-text`
- PocketBase (e-commerce backend): `/api/pocketbase/template`, `/api/pocketbase/prepare-deploy`, `/api/pocketbase/info`
- E2B Management: `/api/e2b/attach`, `/api/e2b/clone-repo`, `/api/e2b/sandboxes`, `/api/e2b/terminate`
- Project Persistence: `/api/projects`, `/api/projects/save`, `/api/projects/open`, `/api/projects/restore-local`, `/api/create-zip`, `/api/download-repo`
- Integrations: `/api/gitcc/gitlab/authorize`, `/api/gitcc/gitlab/callback`, `/api/gitcc/gitlab/status`, `/api/gitcc/push`, `/api/openhost/check-domain`, `/api/openhost/deploy`, `/api/openhost/deploy-pocketbase`, `/api/openhost/status`, `/api/integrations/user-supabase/*`
- Billing: `/api/checkout`, `/api/billing/portal`, `/api/billing/sync-checkout-session`, `/api/paddle/webhook`
- User / Account: `/api/profile`, `/api/ai-website-api-key`, `/api/conversation-state`
- Auth: `/api/auth/session`, `/api/reset`
- Utilities: `/api/screenshot`, `/api/search`

## PocketBase e-commerce deployments

Generated e-commerce sites can now run with a PocketBase backend:

- Frontend: `https://my-website.dpqq.com`
- PocketBase API: `https://pb.my-website.dpqq.com`
- Admin dashboard: `https://pb.my-website.dpqq.com/_/`

The backend provides:
- A reusable PocketBase template (`/api/pocketbase/template`) with collections for products, categories, orders, order items, reviews, and users.
- A deployment renderer (`/api/pocketbase/prepare-deploy`) that produces `docker-compose.yaml`, Dockerfiles, migrations, and hooks for a given domain.
- An OpenHost/Coolify deploy route (`/api/openhost/deploy-pocketbase`) that deploys the docker-compose project and exposes both the frontend and `pb.` subdomain.

The E2B sandbox also sets up PocketBase automatically so the live preview includes a working backend. Use `/api/get-sandbox-pocketbase-info` to retrieve the preview URL and admin credentials.

## Notes

- Authentication uses `httpOnly` cookies (`lc_access_token`, `lc_refresh_token`, `lc_admin_token`). `Authorization: Bearer <token>` and legacy Supabase cookie names are still accepted as fallbacks.
- AI endpoints require a stored AI-Website API key and return `402 Payment Required` when missing.
- SSE streams use raw response streaming with immediate flushing and disconnect handling.
