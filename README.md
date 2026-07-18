# AI-Website

AI-native application builder. Users describe an app in natural language; AI-Website plans, generates, previews, and deploys a full-stack project inside E2B sandboxes.

## Monorepo

```
ai-website-project/
├── frontend/          # Next.js 16 user-facing app (builder, landing, projects, billing)
├── admin/             # Next.js 16 admin dashboard (users, subscriptions, generations)
└── backend-nestjs/    # NestJS 11 API gateway (AI, sandboxes, jobs, billing, auth)
```

## Stack

- **Frontend / Admin**: Next.js 16, React 18, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: NestJS 11, BullMQ/Redis, Supabase (Postgres + Auth), E2B sandboxes
- **AI Gateway**: OpenAI-compatible provider via `AI_BASE_URL` / `AI_API_KEY`
- **Deployment**: OpenHost (not Vercel)

## Quick start

1. Copy and fill environment variables:
   ```bash
   cp backend-nestjs/.env.example backend-nestjs/.env
   # plus any frontend/admin .env.local files
   ```
2. Start Redis (required for queues and sandbox state).
3. Run the backend:
   ```bash
   cd backend-nestjs
   npm install
   npm run build
   npm run start
   ```
4. Run the frontend and admin:
   ```bash
   cd frontend && npm install && npm run dev
   cd admin && npm install && npm run dev
   ```

See `backend-nestjs/README.md`, `backend-nestjs/API.md`, and `backend-nestjs/ADMIN_API.md` for detailed endpoint and deployment guidance.

## Authentication

Both user and admin sessions use `httpOnly` cookies:

- User cookies: `lc_access_token`, `lc_refresh_token`
- Admin cookie: `lc_admin_token`

Frontend and admin requests must use `credentials: 'include'`. The backend still accepts `Authorization: Bearer <token>` as a fallback for legacy clients.

## Key features

- Natural-language app generation with streaming SSE progress
- Atomic project snapshots before every generation
- E2B sandbox lifecycle management (create, attach, renew, kill)
- OpenHost deployment integration
- Paddle billing and subscriptions
- Admin observability: users, subscriptions, agent generation metrics, queue status, sandbox inventory

## Docs

- [`backend-nestjs/API.md`](backend-nestjs/API.md) — user/app API reference
- [`backend-nestjs/ADMIN_API.md`](backend-nestjs/ADMIN_API.md) — admin API reference
- [`backend-nestjs/README.md`](backend-nestjs/README.md) — backend deployment guide
- [`API_DEPLOYMENT_GUIDE.md`](API_DEPLOYMENT_GUIDE.md) — legacy deployment notes
