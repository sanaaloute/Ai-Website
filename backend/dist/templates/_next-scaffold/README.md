# `_next-scaffold` — generic Next.js + Prisma template scaffold

This folder is the **single source of truth** for every generated full‑stack site.
It is a *schema‑driven* Next.js (App Router) + Prisma (libSQL/SQLite) app: it has
no hard‑coded entities. At generation time the engine
(`backend/scripts/synth-next-template.mjs`) copies this scaffold into a category
folder and overlays three derived files from `db_schema.json`:

| Derived file            | Produced from `db_schema.json`                                  |
| ----------------------- | --------------------------------------------------------------- |
| `prisma/schema.prisma`  | one Prisma model per collection (relations, `@@map`, `@id`)     |
| `prisma/seed.ts`        | idempotent admin‑user upsert                                    |
| `src/lib/schema.ts`     | collection metadata + data‑access helpers (rules → auth scope)  |

Everything else in this scaffold is shared verbatim.

## Regenerate a template

```bash
node backend/scripts/synth-next-template.mjs ecommerce        # one
node backend/scripts/synth-next-template.mjs --all            # all 14
node backend/scripts/synth-next-template.mjs --all --dry-run  # validate only
node backend/scripts/synth-next-template.mjs ecommerce --keep-vite
```

The conversion is idempotent: it wipes `src/`, re‑copies the scaffold, removes
Vite/PocketBase artifacts and re‑emits the derived files.

## Architecture

- **Data layer**: `src/lib/data-source/*` is a thin, generic wrapper over Prisma.
  It resolves a collection name → Prisma delegate via `src/lib/schema.ts`
  (`getCollection().accessor`). Routes never touch Prisma directly.
- **Auth**: hand‑rolled JWT (`jose` HS256, `bcryptjs`), httpOnly `token` cookie.
  `/api/auth/{login,register,logout,me}`. `src/middleware.ts` guards `/admin/*`
  (role `admin`); `/api/*` routes self‑authorize per collection rule.
- **Rules → scope**: `authorize()` in `schema.ts` maps PocketBase‑style rules to
  `public | any | owner | admin` (heuristic — refine per project). Owner scoping
  uses the relation field that points at the auth collection (`ownerField()`).
- **Generic CRUD**: `src/app/api/[collection]/route.ts` (list/create) and
  `[id]/route.ts` (get/update/delete) coerce input via `coerceInput()`.
- **Admin UI**: `/admin` dashboard + `/admin/[collection]` list + `new`/`edit`
  pages driven by a single generic `RecordForm` over the schema metadata.
- **Storefront**: `/` lists collections + counts; `/login`, `/register`.

## Database

- Preview/local: `DATABASE_URL=file:./dev.db` (SQLite via `@prisma/adapter-libsql`).
- Production: point `DATABASE_URL` at a Turso/libSQL URL (`libsql://...`) — the
  same adapter, no schema change.
- Schema is applied with `prisma db push` (no migration history is shipped with
  generated templates). Containers run `db push` + idempotent `db seed` in the
  entrypoint. Vercel uses the `vercel-build` script (`prisma generate && prisma
  db push && next build`); run `prisma db seed` once against the prod DB.

> File‑backed SQLite is ephemeral on Vercel. Use Turso (or another libSQL host)
> for persistence.

## Generator wiring (status)

The agent runtime branches on `TemplateService.getTemplateKind(category)`:

- [x] `lib/e2b.service.ts` — `detectFramework()`; per‑framework port (3000/5173),
  dev command, log file and health check; `prepareNextSandbox()` writes `.env`
  (`DATABASE_URL`, `JWT_SECRET`, app URL), installs deps, `prisma generate`,
  `prisma db push`, idempotent `prisma db seed`. PocketBase is skipped for Next.
- [x] `database-seeder.service.ts` — `verifyAndSeed()` routes to a Prisma branch
  (`prisma db push`/`db seed` + table counts via `@libsql/client`).
- [x] `template-selector.node.ts` — sets `state.framework`; calls
  `prepareNextSandbox()` for Next (keeps PocketBase reconfigure for Vite).
- [x] `route-discovery.ts` — enumerates `src/app/**/page.tsx` for Next.
- [x] `state.ts` / `graph.ts` / `database-initializer.node.ts` — `framework` on
  state; DB routing triggers for either backend.
- [x] `prompts/*.md` + `modules/mcp/*` — framework‑detection guidance added to
  executor/planner/debugger/reviewer/pre‑flight; docs enums extended with
  `next`/`nextjs`/`prisma`.

Open items: the `analyzer` still emits `needsIntegration: 'pocketbase'` as a
generic “needs DB” flag (routing treats it as backend‑agnostic); per‑project
Turso provisioning on Deploy; and migrating from `prisma db push` to versioned
migrations for production.
