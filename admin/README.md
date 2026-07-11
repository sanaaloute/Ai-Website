# AI-Website Admin Dashboard

A premium, futuristic admin dashboard for the AI-Website AI app builder platform. Built with Next.js 16, TypeScript, Tailwind CSS v4, Recharts, Framer Motion, and TanStack Query.

## Features

- **Overview Dashboard** – KPI cards with animated counters, line/area/bar/donut charts, and a real-time activity feed.
- **Users Management** – Searchable, sortable, paginated data table with inline actions (view, suspend, activate, delete), user detail modal, and CSV export.
- **Subscriptions Management** – Filterable subscription table with plan/status charts, cancel subscription flow with reason modal.
- **Behavior Analytics** – DAU/WAU line charts, feature usage bar charts, engagement heatmap, and top active users leaderboard.
- **System Logs** – Timeline view of admin actions.
- **Multi-Language Support** – 7 languages (English, Spanish, Chinese, Hindi, French, Arabic, Portuguese) with RTL support for Arabic.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) + TypeScript |
| Styling | Tailwind CSS v4 + `tailwindcss-animate` |
| Charts | Recharts |
| UI Primitives | Radix UI |
| Animations | Framer Motion |
| State (Server) | TanStack Query (React Query) |
| State (UI) | Zustand |
| Data Tables | TanStack React Table |
| Icons | Lucide React |
| Dates | date-fns |
| i18n | Custom React Context + JSON dictionaries |

## Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn

### Installation

```bash
cd admin
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The root path redirects to `/dashboard`.

### Build

```bash
npm run build
npm start
```

## Project Structure

```
app/
  (dashboard)/           # Route group for all dashboard pages
    dashboard/page.tsx   # Overview / home
    users/page.tsx       # Users management
    subscriptions/page.tsx
    behavior/page.tsx
    logs/page.tsx
    layout.tsx           # Dashboard shell (sidebar + header)
  login/page.tsx         # Login placeholder
  layout.tsx             # Root layout
  providers.tsx          # React Query provider
  globals.css            # Tailwind theme + custom styles
components/
  ui/                    # Reusable shadcn-style primitives
  dashboard/             # Page-specific components (KPI cards, tables, modals, etc.)
lib/
  types/index.ts         # TypeScript interfaces
  api/
    client.ts            # API functions (calls /api/admin/*)
  utils.ts               # Helpers (cn, formatters, etc.)
  i18n/                  # i18n core (context, hook, dictionaries)
    dictionaries/        # JSON-like dictionaries per language
store/
  ui-store.ts            # Zustand stores (sidebar, toasts)
hooks/                   # Custom React hooks
```

## Design System

- **Background**: `#0A0A0F` (deep slate/black)
- **Panels**: Glassmorphic `rgba(20,20,30,0.6)` with `backdrop-blur`
- **Primary Accent**: Cyan `#00E5FF`
- **Secondary Accent**: Purple `#B026FF`
- **Typography**: Inter (variable font)

## Internationalization (i18n)

The dashboard supports 7 languages with a lightweight custom i18n layer:

- **English** (`en`)
- **Spanish** (`es`)
- **Chinese** (`zh`)
- **Hindi** (`hi`)
- **French** (`fr`)
- **Arabic** (`ar`) — full RTL layout support
- **Portuguese** (`pt`)

### Adding a new language

1. Create `lib/i18n/dictionaries/<code>.ts` exporting a `Dictionary`.
2. Import and register it in `lib/i18n/dictionaries/index.ts`.
3. Add the locale code to `lib/i18n/config.ts` (`LOCALES`) and label mapping.
4. If the language is RTL, add it to `RTL_LOCALES` in `config.ts`.

### Using translations in components

```tsx
import { useTranslation, useFormatters } from "@/lib/i18n";

export function MyComponent() {
  const { t } = useTranslation();
  const { formatDate } = useFormatters();

  return <h1>{t("users.title")}</h1>;
}
```

### Language persistence

The selected language is persisted to `localStorage` and restored on page load. RTL languages automatically toggle the `dir="rtl"` attribute on `<html>`.

## Backend API Integration

All data fetching is centralized in `lib/api/client.ts`, which calls same-origin `/api/admin/*` routes. Set the `BACKEND_API_URL` environment variable and Next.js rewrites those requests to the real backend (see `next.config.ts`).

See `ADMIN_API.md` for the full backend endpoint specification.

### Required environment variable

```bash
# Centralized configuration lives in the project root .env file.
# For local `npm run dev`, copy BACKEND_API_URL into admin/.env.local:
BACKEND_API_URL=http://localhost:4000
```

The trailing slash must be omitted. When `BACKEND_API_URL` is unset, `/api/admin/*` requests will 404 because the local mock routes have been removed.

## Authentication

The dashboard uses the backend's JWT-based admin auth flow:

- `POST /api/admin/auth/login` returns an access token and admin profile.
- The token is stored in Zustand + `localStorage` and sent as `Authorization: Bearer <token>` on all subsequent `/api/admin/*` requests.
- `GET /api/admin/auth/me` is used by the dashboard layout to validate the token on load.

Login, register, forgot-password, and reset-password pages are all wired to the backend endpoints documented in `ADMIN_API.md`.

## License

Proprietary – AI-Website Team
