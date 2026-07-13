# AI-Website Templates

Starter templates for the AI-Website platform. Users pick a template; the platform clones it from GitHub and lets them customize it with AI.

## Structure

```
templates/
  b2b-saas/          # 10 B2B SaaS landing page templates (Next.js + Tailwind)
    index.json       # machine-readable catalog for this category
    01-analytics-platform/
    02-crm-sales-pipeline/
    ...
```

## Conventions

- **One directory per template.** Each template is fully standalone: its own `package.json`, no cross-directory imports. Cloning or copying the directory must be enough to `npm install && npm run dev`.
- **`template.json`** in every template directory describes it for the platform (id, name, category, tags, framework, primary color).
- **`index.json`** in every category directory is the catalog the platform reads to list templates.
- No `node_modules`, `.next`, or build output committed — each template has its own `.gitignore`.
- All copy lives in `lib/content.ts` and all theme colors in `app/globals.css` `:root` variables, so the AI (or a user) can re-skin a template by editing two files.

## Publishing flow

1. Develop templates in this directory.
2. Push the `templates/` directory to the templates GitHub repository.
3. The platform resolves a template id → GitHub path, clones the repo (shallow), copies the template directory into the user's project, and runs install.

## Categories

| Category | Status | Count |
| --- | --- | --- |
| [b2b-saas](./b2b-saas) | ✅ Ready | 10 |
| ecommerce | planned | — |
| portfolio | planned | — |
| blog | planned | — |
| restaurant | planned | — |
| education | planned | — |
