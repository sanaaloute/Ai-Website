# AI-Website Backend API Documentation

> Base URL: `http://localhost:4000` (development default) or your production host.

## Table of Contents

- [Authentication](#authentication)
- [User & Profile](#user--profile)
- [Agent & AI](#agent--ai)
- [Sandbox](#sandbox)
- [Project](#project)
- [Billing](#billing)
- [Integrations](#integrations)
- [Utility](#utility)
- [System](#system)
- [Common Status Codes](#common-status-codes)

---

## Authentication

Most endpoints require authentication. The backend stores session tokens in **httpOnly cookies**:

- `lc_access_token` — short-lived access token (set on sign-in/sign-up/refresh).
- `lc_refresh_token` — long-lived refresh token (set on sign-in/sign-up/refresh).

The browser sends these cookies automatically when requests use `credentials: 'include'`. For backwards compatibility, the `Authorization: Bearer <token>` header and legacy Supabase cookie names (`sb-access-token`, `supabase-auth-token`) are still accepted as fallbacks.

Endpoints marked **Auth: Optional** will attach a `user_id` when available but still work for anonymous users. Endpoints marked **Auth: Required** will return `401 Unauthorized` if no valid token is present.

### Sign in / sign up

`POST /api/auth/signin` and `POST /api/auth/signup` accept `{ email, password }` and return `{ success: true, user }`. The access/refresh tokens are returned as `httpOnly` cookies, not in the response body.

### Refresh

`POST /api/auth/refresh` reads the `lc_refresh_token` cookie and sets fresh access/refresh cookies. It also accepts a legacy `refresh_token` in the request body.

### Sign out

`POST /api/auth/signout` revokes the session server-side and clears the auth cookies.

---

## User & Profile

### `GET /api/auth/session`

Validate the current session and return the Supabase user object.

| Attribute | Value |
|-----------|-------|
| **Auth** | Required |
| **Headers** | Cookie `lc_access_token` (or `Authorization: Bearer <token>` fallback) |

**Response `200 OK`**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    ...
  }
}
```

---

### `GET /api/profile`

Get the user's profile row from Postgres plus their Stripe subscription info.

| Attribute | Value |
|-----------|-------|
| **Auth** | Required |

**Response `200 OK`**
```json
{
  "profile": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "John Doe",
    "phone": null,
    "avatar_url": null,
    "subscribed": false,
    "subscription_type": null,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  },
  "subscription": {
    "plan": "pro",
    "plan_label": "Pro",
    "billing_interval": "month",
    "status": "active",
    "stripe_price_id": "price_xxx",
    "price_display": ""
  }
}
```

---

### `PATCH /api/profile`

Update profile fields (partial update).

| Attribute | Value |
|-----------|-------|
| **Auth** | Required |
| **Content-Type** | `application/json` |

**Request Body**
```json
{
  "full_name": "Jane Doe",
  "phone": "+1234567890",
  "avatar_url": "https://example.com/avatar.png"
}
```

**Response `200 OK`**
```json
{
  "ok": true
}
```

---

### `GET /api/ai-website-api-key`

Check whether the user has stored a AI-Website AI gateway API key.

| Attribute | Value |
|-----------|-------|
| **Auth** | Required |

**Response `200 OK`**
```json
{
  "ok": true,
  "hasApiKey": true,
  "keyPreview": "sk-1...xYzA"
}
```

---

### `PUT /api/ai-website-api-key`

Save or update the user's AI-Website API key.

| Attribute | Value |
|-----------|-------|
| **Auth** | Required |
| **Content-Type** | `application/json` |

**Request Body**
```json
{
  "api_key": "sk-xxxxxxxxxxxxxxxx"
}
```

**Response `200 OK`**
```json
{
  "ok": true,
  "hasApiKey": true,
  "keyPreview": "sk-xx...xxxx",
  "validated": true,
  "validationWarning": null
}
```

---

### `DELETE /api/ai-website-api-key`

Remove the stored API key.

| Attribute | Value |
|-----------|-------|
| **Auth** | Required |

**Response `200 OK`**
```json
{
  "ok": true,
  "hasApiKey": false,
  "keyPreview": null
}
```

---

### `GET /api/conversation-state`

Pass-through endpoint for conversation state.

| Attribute | Value |
|-----------|-------|
| **Auth** | Optional |

**Query Params**
- `state` (optional): opaque state string

**Response `200 OK`**
```json
{
  "state": "...",
  "userId": "uuid"
}
```

---

### `POST /api/conversation-state`

Update or reset conversation state.

| Attribute | Value |
|-----------|-------|
| **Auth** | Optional |
| **Content-Type** | `application/json` |

**Request Body**
```json
{
  "action": "reset",
  "state": {}
}
```

**Response `200 OK`**
```json
{
  "state": {},
  "cleared": true,
  "userId": "uuid"
}
```

---

### `DELETE /api/conversation-state`

Clear conversation state.

| Attribute | Value |
|-----------|-------|
| **Auth** | Optional |

**Response `200 OK`**
```json
{
  "state": {},
  "cleared": true
}
```

---

### `POST /api/reset`

Request a Supabase Auth password reset email.

| Attribute | Value |
|-----------|-------|
| **Auth** | None |
| **Content-Type** | `application/json` |

**Request Body**
```json
{
  "email": "user@example.com",
  "redirectTo": "https://example.com/reset"
}
```

**Response `200 OK`**
```json
{
  "success": true,
  "message": "Password reset email sent"
}
```

---

## Agent & AI

Most AI endpoints require a valid `ai_website_api_key` to be stored on the user profile (see `/api/ai-website-api-key`). If missing, they return `402 Payment Required` (mapped as `AiWebsiteApiKeyException`).

Endpoints that require the AI-Website API key:

- `POST /api/chat`
- `POST /api/analyze-edit-intent`
- `POST /api/apply-ai-code-stream`
- `POST /api/code/component`
- `POST /api/code/page`
- `POST /api/design/tokens`
- `POST /api/spec/summarize`
- `POST /api/spec/ui-ux-blueprint`

`POST /api/project/file-plan` only requires authentication; it uses the gateway-wide AI key so it can be called before the user has supplied their own key.

> **Note:** Per-user rate limits are documented but not yet enforced.

### `POST /api/agent-stream`

Run the LangGraph agent and stream progress events.

| Attribute | Value |
|-----------|-------|
| **Auth** | Required |
| **AI-Website API Key** | Required |
| **Rate Limit** | 10/minute |
| **Content-Type** | `application/json` |
| **Response Type** | `text/event-stream` (SSE) |

**Request Body**
```json
{
  "prompt": "Build a landing page for a SaaS product",
  "model": "gpt-5.4",
  "sandboxId": "sandbox-xxx",
  "chatHistory": [
    { "role": "user", "content": "..." }
  ],
  "projectId": "uuid"
}
```

**SSE Response**

The stream emits the following event names (other events may be added for debugging but should be ignored by clients if unrecognized):

| Event | Payload | Meaning |
|---|---|---|
| `status` | `{ "status": "coordinator", "message": "..." }` | Current graph node started |
| `todos_update` | `{ "todos": [...] }` | Planner/validator produced a task list |
| `file_delta` | `{ "files": [...] }` | Executor wrote files to the sandbox |
| `review` | `{ "passed": true, "issues": [], "suggestions": [] }` | Reviewer result |
| `preview` | `{ "url": "https://...e2b.dev" }` | Preview URL after finalize |
| `error` | `{ "message": "..." }` | Fatal or step error |
| `done` | `{}` | Graph finished |

Example:
```
event: status
data: {"status":"analyzer","message":"Analyzing your request..."}

event: todos_update
data: {"todos":[{"id":"1","content":"...","status":"pending"}]}

event: file_delta
data: {"files":[{"path":"src/App.tsx","status":"written"}]}

event: preview
data: {"url":"https://<sandboxId>.e2b.dev"}

event: done
data: {}
```

---

### `POST /api/chat`

Simple prompt-to-SSE chat proxy to the AI gateway.

| Attribute | Value |
|-----------|-------|
| **Auth** | Required |
| **AI-Website API Key** | Required |
| **Content-Type** | `application/json` |
| **Response Type** | `text/event-stream` (SSE) |

**Request Body**
```json
{
  "provider": "ai-website",
  "prompt": "Explain React hooks",
  "model": "gpt-5.4"
}
```

**SSE Response**

The stream returns raw `data:` lines. Each line is a JSON object containing a content chunk. No `event:` field is used.

```
data: {"content":"React hooks are..."}

data: {"content":" functions that let you use state and other React features..."}
```

---

### `POST /api/analyze-edit-intent`

Returns a structured search plan for visual/select edits.

| Attribute | Value |
|-----------|-------|
| **Auth** | Required |
| **AI-Website API Key** | Required |
| **Content-Type** | `application/json` |

**Request Body**
```json
{
  "prompt": "Change the button color to blue",
  "manifest": {
    "files": {},
    "routes": [],
    "componentTree": {}
  },
  "model": "gpt-5.4"
}
```

**Response `200 OK`**
```json
{
  "success": true,
  "search_plan": {
    "edit_type": "style",
    "reasoning": "User wants to change button color",
    "search_terms": ["button", "color"],
    "regex_patterns": ["color:\s*[^;]+"],
    "file_types_to_search": [".css", ".tsx"],
    "expected_matches": 3,
    "fallback_search": "button"
  }
}
```

---

### `POST /api/apply-ai-code-stream`

Applies parsed AI output to the sandbox with streaming progress.

| Attribute | Value |
|-----------|-------|
| **Auth** | Required |
| **Rate Limit** | 10/minute |
| **Content-Type** | `application/json` |
| **Response Type** | `text/event-stream` (SSE) |

**Request Body**
```json
{
  "response": "{\"files\":[{\"path\":\"src/App.tsx\",\"content\":\"...\"}]}",
  "is_edit": false,
  "packages": ["framer-motion"],
  "sandboxId": "sandbox-xxx",
  "model": "gpt-5.4",
  "conversationState": {},
  "existingFiles": ["src/App.tsx"],
  "currentFiles": {}
}
```

**SSE Response**
```
event: start
data: {"message":"Applying AI code"}

event: info
data: {"message":"Parsing response"}

event: success
data: {"path":"src/App.tsx","status":"written"}

event: complete
data: {"success":true,"appliedFiles":["src/App.tsx"]}
```

---

### `POST /api/code/component`

Generate a standalone React component.

| Attribute | Value |
|-----------|-------|
| **Auth** | Required |
| **AI-Website API Key** | Required |
| **Content-Type** | `application/json` |

**Request Body**
```json
{
  "section": {
    "name": "HeroSection",
    "description": "A hero section with CTA"
  },
  "tokens": {
    "primaryColor": "#3b82f6"
  }
}
```

**Response `200 OK`**
```json
{
  "code": "import React from 'react';\nexport const HeroSection = () => { ... }"
}
```

---

### `POST /api/code/page`

Generate a complete page component.

| Attribute | Value |
|-----------|-------|
| **Auth** | Required |
| **AI-Website API Key** | Required |
| **Content-Type** | `application/json` |

**Request Body**
```json
{
  "page": {
    "name": "Home",
    "route": "/"
  },
  "sections": [
    { "name": "Hero", "type": "hero" }
  ]
}
```

**Response `200 OK`**
```json
{
  "code": "export default function HomePage() { ... }"
}
```

---

### `POST /api/design/tokens`

Generate design tokens JSON from a spec.

| Attribute | Value |
|-----------|-------|
| **Auth** | Required |
| **AI-Website API Key** | Required |
| **Content-Type** | `application/json` |

**Request Body**
```json
{
  "spec": {
    "brand": "Acme",
    "vibe": "modern and clean"
  }
}
```

**Response `200 OK`**
```json
{
  "theme": "acme",
  "colors": {
    "primary": "#3b82f6",
    "secondary": "#64748b"
  },
  "radius": {},
  "shadows": {},
  "typography": {}
}
```

---

### `POST /api/spec/summarize`

Summarize a free-form prompt into a structured project spec.

| Attribute | Value |
|-----------|-------|
| **Auth** | Required |
| **AI-Website API Key** | Required |
| **Content-Type** | `application/json` |

**Request Body**
```json
{
  "prompt": "I want a portfolio website for a photographer"
}
```

**Response `200 OK`**
```json
{
  "project_type": "web_app",
  "title": "Photographer Portfolio",
  "tagline": "Showcase your best shots",
  "target_audience": "photographers",
  "core_features": ["gallery", "contact form"],
  "pages": [{"name": "Home", "route": "/"}],
  "brand_tone": "professional",
  "color_preferences": "dark and moody",
  "constraints": []
}
```

---

### `POST /api/spec/ui-ux-blueprint`

Produce a page/section blueprint from a spec.

| Attribute | Value |
|-----------|-------|
| **Auth** | Required |
| **AI-Website API Key** | Required |
| **Content-Type** | `application/json` |

**Request Body**
```json
{
  "spec": { "title": "SaaS Landing Page", "pages": 3 }
}
```

**Response `200 OK`**
```json
{
  "pages": [
    {
      "name": "Home",
      "sections": [
        { "name": "Hero", "type": "hero" },
        { "name": "Features", "type": "features" }
      ]
    }
  ]
}
```

---

### `POST /api/project/file-plan`

Build a deterministic file plan from spec + blueprint.

| Attribute | Value |
|-----------|-------|
| **Auth** | Required |
| **AI-Website API Key** | Not required (uses gateway key) |
| **Content-Type** | `application/json` |

**Request Body**
```json
{
  "spec": { "title": "Portfolio" },
  "blueprint": { "pages": [{"name": "Home"}] }
}
```

**Response `200 OK`**
```json
{
  "files": [
    { "path": "src/pages/Home.tsx", "purpose": "Main landing page" }
  ]
}
```

---

## Sandbox

All sandbox routes manage E2B code sandbox lifecycles.

### `POST /api/create-ai-sandbox-v2`

Create a new E2B sandbox and scaffold a Vite React app.

| Attribute | Value |
|-----------|-------|
| **Auth** | Optional |
| **Rate Limit** | 5/minute |
| **Content-Type** | `application/json` |

**Request Body**
```json
{
  "projectName": "My App",
  "skipSetup": false
}
```

**Response `200 OK`**
```json
{
  "success": true,
  "sandboxId": "sandbox-xxx",
  "url": "https://...e2b.dev",
  "provider": "e2b",
  "createdAt": "2024-01-01T00:00:00Z",
  "endAt": "2024-01-01T00:40:00Z",
  "files": { "package.json": "..." },
  "structure": "./package.json\n./src/main.tsx",
  "fileCount": 10
}
```

---

### `POST /api/kill-sandbox`

Terminate a sandbox.

| Attribute | Value |
|-----------|-------|
| **Auth** | Optional |
| **Content-Type** | `application/json` |

**Request Body**
```json
{
  "sandboxId": "sandbox-xxx"
}
```

**Response `200 OK`**
```json
{
  "success": true,
  "sandboxKilled": true
}
```

---

### `POST /api/sandbox-renew`

Migrate files from an expiring sandbox to a new one.

| Attribute | Value |
|-----------|-------|
| **Auth** | Optional |
| **Content-Type** | `application/json` |

**Request Body**
```json
{
  "sandboxId": "sandbox-xxx"
}
```

**Response `200 OK`**
```json
{
  "success": true,
  "oldSandboxId": "sandbox-old",
  "newSandboxId": "sandbox-new",
  "url": "https://...e2b.dev",
  "filesMigrated": 15,
  "durationMs": 3200
}
```

---

### `GET /api/sandbox-status`

Fast status check for a sandbox.

| Attribute | Value |
|-----------|-------|
| **Auth** | Optional |

**Query Params**
- `sandboxId` (required)

**Response `200 OK`**
```json
{
  "success": true,
  "active": true,
  "healthy": true,
  "sandboxData": {
    "sandboxId": "sandbox-xxx",
    "url": "https://...e2b.dev",
    "createdAt": "...",
    "endAt": "..."
  }
}
```

---

### `GET /api/sandbox-logs`

Return dev-server process status and recent log tail.

| Attribute | Value |
|-----------|-------|
| **Auth** | Optional |

**Query Params**
- `sandboxId` (required)

**Response `200 OK`**
```json
{
  "success": true,
  "logs": ["vite v5.3.1 ready"],
  "status": "running"
}
```

---

### `GET /api/sandbox-snapshot`

Download the latest snapshot JSON from Supabase Storage.

| Attribute | Value |
|-----------|-------|
| **Auth** | Required |

**Query Params**
- `projectId` (required)
- `sandboxId` (required)

**Response `200 OK`**
```json
{
  "success": true,
  "snapshot": {
    "projectId": "uuid",
    "sandboxId": "sandbox-xxx",
    "fileStructure": "...",
    "sandboxFiles": {}
  }
}
```

---

### `POST /api/sandbox-snapshot`

Save/upsert a snapshot to Supabase Storage.

| Attribute | Value |
|-----------|-------|
| **Auth** | Required |
| **Content-Type** | `application/json` |

**Request Body**
```json
{
  "projectId": "uuid",
  "sandboxId": "sandbox-xxx",
  "projectName": "My App",
  "fileStructure": "...",
  "structureContent": "...",
  "sandboxFiles": {},
  "chat": [],
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

**Response `200 OK`**
```json
{
  "success": true,
  "snapshot": { ... }
}
```

---

### `POST /api/restart-preview`

Restart the dev server inside the sandbox.

| Attribute | Value |
|-----------|-------|
| **Auth** | Optional |
| **Content-Type** | `application/json` |

**Request Body**
```json
{
  "sandboxId": "sandbox-xxx"
}
```

**Response `200 OK`**
```json
{
  "success": true,
  "message": "Preview server restarted"
}
```

---

### `POST /api/run-command-v2`

Execute a shell command in the sandbox.

| Attribute | Value |
|-----------|-------|
| **Auth** | Optional |
| **Rate Limit** | 10/minute |
| **Content-Type** | `application/json` |

**Request Body**
```json
{
  "sandboxId": "sandbox-xxx",
  "command": "ls -la"
}
```

**Response `200 OK`**
```json
{
  "success": true,
  "output": "total 32\ndrwxr-xr-x ...",
  "error": "",
  "exitCode": 0,
  "message": "Command executed successfully"
}
```

---

### `POST /api/install-packages-v2`

Streaming package installation via npm.

| Attribute | Value |
|-----------|-------|
| **Auth** | Optional |
| **Rate Limit** | 10/minute |
| **Content-Type** | `application/json` |
| **Response Type** | `text/event-stream` (SSE) |

**Request Body**
```json
{
  "sandboxId": "sandbox-xxx",
  "packages": ["framer-motion", "lucide-react"]
}
```

**SSE Response**
```
event: start
data: {"packages":["framer-motion","lucide-react"]}

event: status
data: {"message":"Installing 2 packages..."}

event: success
data: {"package":"framer-motion"}

event: complete
data: {"results":[],"appliedFiles":[],"analyzerDone":true}
```

---

### `GET /api/get-sandbox-files`

Lists and reads sandbox source files.

| Attribute | Value |
|-----------|-------|
| **Auth** | Optional |

**Query Params**
- `sandboxId` (required)

**Response `200 OK`**
```json
{
  "success": true,
  "files": {
    "src/App.tsx": "import React..."
  },
  "structure": "./src/App.tsx\n./src/main.tsx",
  "fileCount": 5,
  "manifest": {
    "files": {},
    "routes": [],
    "componentTree": {},
    "entryPoint": "src/main.tsx",
    "styleFiles": ["src/index.css"]
  }
}
```

---

### `POST /api/preview-health`

Probe the preview URL for HTTP health.

| Attribute | Value |
|-----------|-------|
| **Auth** | Optional |
| **Content-Type** | `application/json` |

**Request Body**
```json
{
  "sandboxId": "sandbox-xxx",
  "previewUrl": "https://...e2b.dev",
  "timeoutMs": 5000
}
```

**Response `200 OK`**
```json
{
  "success": true,
  "active": true,
  "reachable": true,
  "sandboxId": "sandbox-xxx",
  "previewUrl": "https://...e2b.dev",
  "statusCode": 200,
  "diagnostics": {},
  "reason": null
}
```

---

### `GET /api/monitor-preview-logs`

Scans sandbox logs for missing NPM imports.

| Attribute | Value |
|-----------|-------|
| **Auth** | Optional |

**Query Params**
- `sandboxId` (required)

**Response `200 OK`**
```json
{
  "success": true,
  "hasErrors": true,
  "errors": [
    {
      "type": "missing_import",
      "package": "framer-motion",
      "message": "Cannot find module 'framer-motion'",
      "file": ""
    }
  ]
}
```

---

### `POST /api/report-preview-error`

Client-side observability endpoint for preview errors.

| Attribute | Value |
|-----------|-------|
| **Auth** | None |
| **Content-Type** | `application/json` |

**Request Body**
```json
{
  "error": "Module not found",
  "file": "src/App.tsx",
  "type": "missing_import",
  "sandboxId": "sandbox-xxx"
}
```

**Response `200 OK`**
```json
{
  "success": true,
  "error": {
    "type": "missing_import",
    "message": "Module not found",
    "file": "src/App.tsx",
    "timestamp": "2024-01-01T00:00:00Z"
  }
}
```

---

### `GET /api/check-preview-errors`

Legacy no-op endpoint.

| Attribute | Value |
|-----------|-------|
| **Auth** | None |

**Response `200 OK`**
```json
{
  "success": true,
  "hasErrors": false,
  "errors": [],
  "storage": "none"
}
```

---

### `POST /api/preview-inline-text`

Apply a single-line text replacement inside a sandbox file.

| Attribute | Value |
|-----------|-------|
| **Auth** | Required |
| **Content-Type** | `application/json` |

**Request Body**
```json
{
  "sandboxId": "sandbox-xxx",
  "relativePath": "src/App.tsx",
  "lineNumber": 12,
  "oldText": "bg-red-500",
  "newText": "bg-blue-500",
  "context": null
}
```

**Response `200 OK`**
```json
{
  "success": true,
  "path": "src/App.tsx"
}
```

---

### `POST /api/e2b/attach`

Reconnects to an existing E2B sandbox; creates a new one if gone.

| Attribute | Value |
|-----------|-------|
| **Auth** | Optional |
| **Content-Type** | `application/json` |

**Request Body**
```json
{
  "sandboxId": "sandbox-xxx"
}
```

**Response `200 OK`**
```json
{
  "success": true,
  "recovered": true,
  "sandboxData": { ... }
}
```

---

### `POST /api/e2b/clone-repo`

Clones a Git repo into `/home/user/app`.

| Attribute | Value |
|-----------|-------|
| **Auth** | Optional |
| **Rate Limit** | 5/minute |
| **Content-Type** | `application/json` |

**Request Body**
```json
{
  "sandboxId": "sandbox-xxx",
  "repoUrl": "https://github.com/user/repo.git"
}
```

**Response `200 OK`**
```json
{
  "success": true,
  "files": { "package.json": "..." },
  "structure": "./package.json",
  "fileCount": 5
}
```

---

### `GET /api/e2b/sandboxes`

List E2B sandboxes for the authenticated user.

| Attribute | Value |
|-----------|-------|
| **Auth** | Required |

**Query Params**
- `state` (optional): filter by state
- `limit` (optional, default 25)

**Response `200 OK`**
```json
{
  "success": true,
  "sandboxes": [
    {
      "sandboxId": "sandbox-xxx",
      "templateId": "",
      "state": "running",
      "startedAt": "2024-01-01T00:00:00Z",
      "endAt": "2024-01-01T00:40:00Z",
      "metadata": {}
    }
  ]
}
```

---

### `POST /api/e2b/terminate`

Kill a sandbox by ID.

| Attribute | Value |
|-----------|-------|
| **Auth** | Optional |
| **Content-Type** | `application/json` |

**Request Body**
```json
{
  "sandboxId": "sandbox-xxx"
}
```

**Response `200 OK`**
```json
{
  "success": true,
  "sandboxKilled": true
}
```

---

## Project

### `GET /api/projects`

List saved projects for the authenticated user.

| Attribute | Value |
|-----------|-------|
| **Auth** | Required |

**Response `200 OK`**
```json
{
  "success": true,
  "projects": [
    {
      "projectId": "uuid",
      "projectName": "My App",
      "updatedAt": 1704067200000,
      "preview": null,
      "vercelProjectId": null,
      "vercelDomainUrl": null,
      "vercelDeployedAt": null,
      "githubRepoUrl": null
    }
  ]
}
```

---

### `DELETE /api/projects`

Delete a project, its files, generations, and storage objects.

| Attribute | Value |
|-----------|-------|
| **Auth** | Required |
| **Content-Type** | `application/json` |

**Request Body**
```json
{
  "projectId": "uuid"
}
```

**Response `200 OK`**
```json
{
  "success": true,
  "projectId": "uuid"
}
```

---

### `PATCH /api/projects`

Rename a project.

| Attribute | Value |
|-----------|-------|
| **Auth** | Required |
| **Content-Type** | `application/json` |

**Request Body**
```json
{
  "projectId": "uuid",
  "projectName": "New Name"
}
```

**Response `200 OK`**
```json
{
  "success": true,
  "projectId": "uuid",
  "projectName": "New Name"
}
```

---

### `POST /api/projects/save`

Durable save: writes snapshot JSON, files table, and zip artifact.

| Attribute | Value |
|-----------|-------|
| **Auth** | Required |
| **Content-Type** | `application/json` |

**Request Body**
```json
{
  "sandboxId": "sandbox-xxx",
  "projectId": "uuid",
  "projectName": "My App",
  "aiWebsiteProjectUuid": "uuid",
  "fileStructure": "...",
  "structureContent": "...",
  "chat": [],
  "saveReason": "manual"
}
```

**Response `200 OK`**
```json
{
  "success": true,
  "projectId": "uuid",
  "projectName": "My App",
  "savedFiles": 12,
  "storageFilesUploaded": 12,
  "zipPath": "uuid/projects/uuid/snapshot.zip",
  "zipUploaded": true,
  "dbSynced": true,
  "warnings": []
}
```

---

### `POST /api/projects/open`

Restore a saved project into a target sandbox.

| Attribute | Value |
|-----------|-------|
| **Auth** | Required |
| **Content-Type** | `application/json` |

**Request Body**
```json
{
  "projectId": "uuid",
  "targetSandboxId": "sandbox-xxx"
}
```

**Response `200 OK`**
```json
{
  "success": true,
  "restoreSource": "storage",
  "restoredCount": 12,
  "sandboxData": { ... },
  "warnings": [],
  "snapshot": { ... }
}
```

---

### `POST /api/projects/restore-local`

Legacy fallback for local SQLite restore (not supported).

| Attribute | Value |
|-----------|-------|
| **Auth** | Required |
| **Content-Type** | `application/json` |

**Request Body**
```json
{
  "projectId": "uuid",
  "sandboxId": "sandbox-xxx"
}
```

**Response `200 OK`**
```json
{
  "success": true,
  "projectId": "uuid",
  "sandboxId": "sandbox-xxx",
  "restoredCount": 0,
  "totalFiles": 0,
  "errors": ["Local SQLite fallback not supported in this backend"]
}
```

---

### `POST /api/create-zip`

Produce a downloadable zip of a project.

| Attribute | Value |
|-----------|-------|
| **Auth** | Required |
| **Content-Type** | `application/json` |

**Request Body**
```json
{
  "sandboxId": "sandbox-xxx",
  "projectId": "uuid",
  "projectName": "My App"
}
```

**Response `200 OK`**
```json
{
  "success": true,
  "downloadUrl": "https://...supabase.co/.../snapshot.zip?token=...",
  "fileName": "My App.zip",
  "message": "ZIP created successfully"
}
```

---

### `GET /api/download-repo`

Clone a public repo, zip it, and return the binary.

| Attribute | Value |
|-----------|-------|
| **Auth** | Required |

**Query Params**
- `repo_url` (required): public git URL

**Response `200 OK`**
- Content-Type: `application/zip`
- Content-Disposition: `attachment; filename=repo.zip`

---

## Billing

### `POST /api/checkout`

Create a Stripe Checkout session.

| Attribute | Value |
|-----------|-------|
| **Auth** | Required |
| **Content-Type** | `application/json` |

**Request Body**
```json
{
  "priceId": "price_xxx",
  "billingMode": "subscription",
  "successUrl": "https://example.com/success",
  "cancelUrl": "https://example.com/cancel"
}
```

**Response `200 OK`**
```json
{
  "url": "https://checkout.stripe.com/..."
}
```

---

### `POST /api/billing/portal`

Create a Stripe Billing Portal session.

| Attribute | Value |
|-----------|-------|
| **Auth** | Required |
| **Content-Type** | `application/json` |

**Request Body**
```json
{
  "returnUrl": "https://example.com/settings"
}
```

**Response `200 OK`**
```json
{
  "url": "https://billing.stripe.com/..."
}
```

---

### `POST /api/billing/sync-checkout-session`

Client-side mirror of the Stripe webhook (forces sync of subscription state).

| Attribute | Value |
|-----------|-------|
| **Auth** | Required |
| **Content-Type** | `application/json` |

**Request Body**
```json
{
  "sessionId": "cs_test_xxx"
}
```

**Response `200 OK`**
```json
{
  "ok": true
}
```

---

### `POST /api/stripe/webhook`

Stripe webhook handler. Called by Stripe, not the frontend (documented for completeness).

| Attribute | Value |
|-----------|-------|
| **Auth** | Stripe signature verification |
| **Headers** | `Stripe-Signature: ...` |

**Response `200 OK`**
```json
{
  "received": true
}
```

---

## Integrations

### `GET /api/github/authorize`

Redirects to GitHub OAuth.

| Attribute | Value |
|-----------|-------|
| **Auth** | None (browser redirect flow) |

**Query Params**
- `next` (optional): redirect path after callback

**Response `307 Temporary Redirect`**
- Redirects to GitLab OAuth URL.
- Sets `github_oauth_state` cookie.

---

### `GET /api/github/callback`

OAuth callback. Exchanges code for token and sets cookie.

| Attribute | Value |
|-----------|-------|
| **Auth** | None (uses state cookie) |

**Query Params**
- `code` (required)
- `state` (required)

**Response `307 Temporary Redirect`**
- Sets `github_access` cookie.
- Redirects to `next` or `/`.

---

### `GET /api/github/status`

Check whether GitHub is connected.

| Attribute | Value |
|-----------|-------|
| **Auth** | None (reads cookie) |

**Response `200 OK`**
```json
{
  "connected": true
}
```

---

### `POST /api/github/push`

Push files to GitHub.

| Attribute | Value |
|-----------|-------|
| **Auth** | Required |
| **Extra Auth** | `github_access` cookie required |
| **Content-Type** | `application/json` |

**Request Body**
```json
{
  "repoName": "my-repo",
  "files": [
    { "path": "src/App.tsx", "content": "..." }
  ],
  "aiWebsiteProjectId": "uuid"
}
```

**Response `200 OK`**
```json
{
  "ok": true,
  "repoUrl": "https://github.com/user/my-repo",
  "uploaded": 12,
  "requestId": "uuid"
}
```

---

### `GET /api/vercel/check-domain`

Check whether a custom domain is already in use.

| Attribute | Value |
|-----------|-------|
| **Auth** | Required |

**Query Params**
- `domain` (required)
- `projectId` (optional)

**Response `200 OK`**
```json
{
  "success": true,
  "available": true,
  "message": "Domain is available",
  "conflictProjectName": null
}
```

---

### `POST /api/vercel/deploy`

Deploy a GitHub repo to Vercel.

| Attribute | Value |
|-----------|-------|
| **Auth** | Required |
| **Content-Type** | `application/json` |

**Request Body**
```json
{
  "repoUrl": "https://github.com/user/repo.git",
  "projectName": "My App",
  "customDomain": "myapp.com",
  "projectId": "uuid"
}
```

**Response `200 OK`**
```json
{
  "ok": true,
  "appUuid": "app-xxx",
  "deploymentUuid": "dep-xxx",
  "domainUrl": "https://myapp.com",
  "projectUrl": "https://myapp.com",
  "isUpdate": false,
  "requestId": "uuid"
}
```

---

### `GET /api/vercel/status`

Poll Vercel app + latest deployment status.

| Attribute | Value |
|-----------|-------|
| **Auth** | Required |

**Query Params**
- `deploymentUuid` (required)
- `appUuid` (required)

**Response `200 OK`**
```json
{
  "success": true,
  "app": { ... },
  "latestDeployment": { ... }
}
```

---

### `POST /api/integrations/user-supabase/connect`

Write user's Supabase credentials into the generated app's `.env` file.

| Attribute | Value |
|-----------|-------|
| **Auth** | Required |
| **Content-Type** | `application/json` |

**Query Params**
- `sandboxId` (required)

**Request Body**
```json
{
  "supabaseUrl": "https://xxxx.supabase.co",
  "supabaseAnonKey": "eyJ..."
}
```

**Response `200 OK`**
```json
{
  "success": true,
  "message": "Connected"
}
```

---

### `GET /api/integrations/user-supabase/status`

Check whether the generated app has Supabase credentials.

| Attribute | Value |
|-----------|-------|
| **Auth** | Required |

**Query Params**
- `sandboxId` (required)

**Response `200 OK`**
```json
{
  "connected": true,
  "supabaseUrl": "https://xxxx.supabase.co"
}
```

---

### `POST /api/integrations/user-supabase/disconnect`

Remove Supabase credentials from the generated app's `.env` file.

| Attribute | Value |
|-----------|-------|
| **Auth** | Required |

**Query Params**
- `sandboxId` (required)

**Response `200 OK`**
```json
{
  "success": true,
  "message": "Disconnected"
}
```

---

## Utility

### `GET /api/screenshot`

Returns a PNG screenshot of a URL via Google PageSpeed API.

| Attribute | Value |
|-----------|-------|
| **Auth** | None |

**Query Params**
- `url` (required): target URL to screenshot

**Response `200 OK`**
- Content-Type: `image/png`
- Binary PNG data

**Response `404 Not Found`**
- If screenshot cannot be generated.

---

### `POST /api/search`

Legacy disabled endpoint.

| Attribute | Value |
|-----------|-------|
| **Auth** | None |

**Response `200 OK`**
```json
{
  "results": [],
  "message": "URL search is disabled. Use the AI agent instead."
}
```

---

## System

### `GET /health`

Basic health check. Returns API status and version.

| Attribute | Value |
|-----------|-------|
| **Auth** | None |

**Response `200 OK`**
```json
{
  "status": "ok",
  "version": "1.0.0"
}
```

---

### `GET /live`

Liveness probe for orchestrators (e.g., Kubernetes).

| Attribute | Value |
|-----------|-------|
| **Auth** | None |

**Response `200 OK`**
```json
{
  "status": "ok"
}
```

---

### `GET /ready`

Readiness probe. Checks Redis connectivity.

| Attribute | Value |
|-----------|-------|
| **Auth** | None |

**Response `200 OK`**
```json
{
  "status": "ok",
  "redis": true
}
```

**Response `503 Service Unavailable`**
```json
{
  "status": "not ready",
  "redis": false
}
```

---

## Common Status Codes

| Code | Meaning | Typical Cause |
|------|---------|---------------|
| `200` | OK | Success |
| `307` | Temporary Redirect | OAuth flows |
| `401` | Unauthorized | Missing or invalid JWT/cookie |
| `402` | Payment Required | Missing `ai_website_api_key` on AI endpoints |
| `404` | Not Found | Resource does not exist |
| `422` | Unprocessable Entity | Validation error (e.g., missing required field) |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Internal Server Error | Unexpected server error |

---

## Notes for Frontend Developers

1. **SSE Streams**: Endpoints like `/api/agent-stream`, `/api/chat`, and `/api/apply-ai-code-stream` return `text/event-stream`. Use `EventSource` or a fetch-based SSE parser.

2. **Field Aliases**: Many request/response fields use camelCase aliases (e.g., `sandboxId`, `projectName`). The backend populates by name, so both `sandbox_id` and `sandboxId` are accepted in requests. Responses always use camelCase.

3. **Cookie Auth**: The backend sets `lc_access_token` and `lc_refresh_token` as `httpOnly` cookies. All frontend requests should use `credentials: 'include'` so the browser sends them automatically. The legacy `Authorization: Bearer <token>` header is still accepted as a fallback.

4. **File Uploads**: There is no multipart file upload endpoint. Files are sent as JSON strings in the `content` field (e.g., `/api/github/push`, `/api/projects/save`).
