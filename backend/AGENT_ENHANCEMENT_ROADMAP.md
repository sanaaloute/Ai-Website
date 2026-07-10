# Agentic System Enhancement Roadmap

This roadmap tracks the additions that will make the Lovecode agent generate more professional, beautiful, and bug-free complete websites (storefront + admin dashboard + database) in fewer iterations.

> **Goal:** Move from "works most of the time" to a **self-correcting loop**: designer → planner → executor → type checker → visual/a11y/e2e reviewers → debugger → finalize.
>
> **Reality check:** Zero bugs in one shot is still unrealistic. The objective is to catch and fix issues inside the agent loop before the user sees them.

---

## Progress tracker

| # | Phase | Status |
|---|-------|--------|
| 1 | Expand Context7 docs shortcuts | `done` |
| 2 | Add shadcn/ui MCP server wrapper | `done` |
| 3 | Add `designer_node` | `done` |
| 4 | Add `component_selector_node` | `done` |
| 5 | Add `visual_qa_node` | `done` |
| 6 | Add `a11y_reviewer_node` | `done` |
| 7 | Add `e2e_test_generator_node` | `done` |
| 8 | Add `security_reviewer_node` | `done` |
| 9 | Add `seo_meta_node` | `done` |
| 10 | Non-MCP hardening (design tokens, pre-flight, retry context, templates) | `done` |

---

## Phase 1 — Expand Context7 docs shortcuts

Add more `docs_*` shortcut tools on top of the existing `DocsMcpServerService` / `AgentMcpToolService` so every agent node can verify APIs without guessing.

- [x] `docs_shadcn` — shadcn/ui props, variants, CLI usage (`/shadcn-ui/ui`)
- [x] `docs_tailwind` — valid Tailwind classes, v3/v4 syntax, responsive patterns
- [x] `docs_framer_motion` — animation API names and examples
- [x] `docs_zod` — schema/validation patterns
- [x] `docs_react_hook_form` — register/control usage
- [x] `docs_supabase_js` — client-side Supabase auth/queries (if/when used)
- [x] `docs_stripe` — checkout/payment intent API signatures

**Impact:** Eliminates invented props, outdated APIs, and wrong Tailwind classes.

---

## Phase 2 — Add shadcn/ui MCP server wrapper

Wrap the official shadcn/ui MCP server (`npx shadcn@latest mcp`) so the agent can install real components instead of hand-rolling primitives.

- [x] Create `ShadcnMcpServerService` wrapping the public shadcn registry API + CLI
- [x] Expose agent tools:
  - `shadcn_search` — search registries for components/blocks
  - `shadcn_view` — inspect a registry item
  - `shadcn_install` — install a component via the shadcn CLI in the E2B sandbox
  - `shadcn_init` — initialize shadcn/ui in the sandbox
- [x] Inject these tools into the executor, planner, reviewer, and debugger tool sets
- [x] Add prompt instructions telling the agent to prefer shadcn components over custom ones

**Impact:** Professional, accessible UI components; fewer broken hand-rolled primitives.

---

## Phase 3 — Add `designer_node`

Add a new LangGraph node that runs **before** the planner and produces a structured design spec.

- [x] Define `DesignSpec` interface (colors, typography, spacing, radii, breakpoints, animations, mood)
- [x] Create `designer.node.ts` that loads a new `designer.md` prompt
- [x] Output `designSpec` into agent state
- [x] Update `planner.md` and `executor.md` to consume `designSpec`
- [x] Wire graph edge: `analyzer → designer → template_selector → database_initializer → planner` for `new_app`

**Impact:** Consistent visual identity; gives executor a concrete rubric to follow.

---

## Phase 4 — Add `component_selector_node`

A small node between designer and planner that picks the exact shadcn components/blocks needed.

- [x] Query shadcn registry via `ShadcnMcpServerService`
- [x] Output `componentsToInstall` list (e.g., `button`, `dialog`, `data-table`, `dropdown-menu`)
- [x] Planner/executor install these before writing feature code

**Impact:** Right components are available before the first line of feature code is written.

---

## Phase 5 — Add `visual_qa_node`

After the reviewer, run the app and compare screenshots against the design spec.

- [x] Start the dev server in the E2B sandbox
- [x] Use Playwright to capture screenshots of key pages (discovered from `src/lib/routes.ts`)
- [x] Flag HTTP errors, blank pages, JS errors, and console errors
- [x] Return `visualIssues` and `screenshots`; route back to `executor` if any issues exist

**Impact:** Catches layout breakage, wrong colors/spacing, and responsive issues.

---

## Phase 6 — Add `a11y_reviewer_node`

Accessibility reviewer that runs after code is written.

- [x] Run `axe-core` via `@axe-core/playwright` on generated pages
- [x] Flag missing alt text, bad ARIA, contrast failures, keyboard traps
- [x] Return `a11yIssues`; route to `executor` if violations exist

**Impact:** Accessible, professional output; avoids embarrassing a11y failures.

---

## Phase 7 — Add `e2e_test_generator_node`

Generate and run Playwright end-to-end tests for the core user flows.

- [x] Generate Playwright tests based on `websiteCategory`, `planSteps`, and routes
- [x] Write tests to a temporary directory and run them with `npx playwright test`
- [x] Return `e2eFailures`; route to `executor` if any failures exist

**Impact:** Catches functional regressions (broken navigation, auth, CRUD, checkout).

---

## Phase 8 — Add `security_reviewer_node`

Static security scan of the generated code.

- [x] Detect `dangerouslySetInnerHTML` with user data
- [x] Detect hardcoded secrets / API keys
- [x] Detect unsafe `eval()` / `new Function()`
- [x] Detect `innerHTML` assignments and `document.write`
- [x] Return `securityIssues`; route to `executor` if issues exist

**Impact:** Reduces obvious security holes before deployment.

---

## Phase 9 — Add `seo_meta_node`

Before finalization, generate SEO artifacts.

- [x] Generate `title`, `meta description`, OpenGraph, and Twitter card tags in `index.html`
- [x] Generate `public/robots.txt`
- [x] Generate `public/sitemap.xml` from discovered routes

**Impact:** Production-ready metadata for storefront pages.

---

## Phase 10 — Non-MCP hardening

Small, high-leverage improvements that do not require new MCP servers.

- [x] Create project-level `design.json` / `AGENTS.md` design tokens that every agent reads first
- [x] Stricter `pre_flight_validator` — deterministic validation of file paths and plan contents plus LLM corrections
- [x] Richer retry context — pass failing verification stage, accumulated failures, and stage-specific issues back to the executor
- [x] Improve category templates — pre-seed shadcn setup, theme config, and example CRUD pages so the agent starts from a higher floor

**Impact:** Less drift, fewer retries, faster convergence.

---

## How we will work through this

1. Pick the next unchecked phase.
2. Implement only that phase.
3. Update this file by changing the phase status to `done` and checking its boxes.
4. Run `npm run build` and `npm test` after each phase.
5. Move to the next phase.
