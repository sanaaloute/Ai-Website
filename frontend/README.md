# AI-Website SoftChat

Chat with AI to build React apps instantly.

## What you get
- **AI generation** (streamed) via `/api/generate-ai-code-stream`
- **Live sandbox preview** created via `/api/create-ai-sandbox-v2`
- **Builder integrations**
  - **GitHub (GitLab)** export: `/api/github/push`
  - **Vercel deploy**: `/api/vercel/deploy`
  - **Database context** (Supabase/MongoDB) stored for future generations

## Setup

### 1) Install dependencies
```bash
npm install
```

### 2) Configure environment
All environment variables are now centralized in the project root `.env` file.

When running locally with `npm run dev`, Next.js reads `.env.local` from this directory, so copy the variables you need from the root `.env` into `frontend/.env.local`:

```env
# Backend API (required)
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000

# Optional
NEXT_PUBLIC_AI_WEBSITE_API_KEY_SITE_URL=https://github.com
```

> **Note:** All other configuration (Supabase, AI gateway, Paddle, E2B, GitLab OAuth, etc.) lives in the backend. The frontend only talks to the backend via `NEXT_PUBLIC_BACKEND_URL`.

### 3) Run the app
```bash
npm run dev
```

Open:
`http://localhost:3000`

## Usage
- Go to the **Generation** UI and chat to generate code into the sandbox.
- Use **Push to GitHub** to export generated code to GitHub.
- Use **Host on Vercel** to deploy generated code.

## Sandbox API routes
- **Commands / npm installs**: `/api/run-command-v2`, `/api/install-packages-v2` (streaming SSE).
- **Create preview sandbox**: `/api/create-ai-sandbox-v2`.
- **Apply generated code**: `/api/apply-ai-code-stream` (non-streaming `/api/apply-ai-code` was removed).

## Troubleshooting
- **"No active sandbox" / sandbox not found**: the sandbox may have expired server-side. Create a new sandbox from the UI and retry the action.

## License
MIT
