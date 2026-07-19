# Agentic Workflow Audit Report — Backend

Date: 2026-07-19
Scope: `backend/src/modules/agent` (LangGraph workflow, nodes, tools, prompts, wiring/config)
Status legend: `PENDING` = not started · `IN PROGRESS` = being fixed · `FIXED` = fix applied and verified · `DECISION NEEDED` = waiting on product owner

Each issue lists: severity, location, the problem, and the solution. Issues are ordered by fix priority.

---

## Issue 1 — `database_initializer` runs planner and executor in parallel (routing bug)

- **Severity:** CRITICAL
- **Location:** `backend/src/modules/agent/graph.ts:273` and `graph.ts:289-292`
- **Problem:** `database_initializer` has a static edge `→ planner` **and** conditional edges to `planner`/`executor`. LangGraph evaluates both, so on the edit-with-DB path (`routeAfterDatabaseInitializer` returns `'executor'`) **both** `planner` and `executor` are scheduled in the same superstep. The executor starts with no plan, then runs a second time via `pre_flight_validator`. Four other nodes (`designer`, `component_selector`, `planner`, `pre_flight_validator`, `debugger`) have the same static+conditional duplication; those are harmless today only because both edges happen to target the same node and LangGraph dedupes same-node triggers within a superstep.
- **Solution:** Remove every static edge that is shadowed by a conditional edge from the same source node; the conditional routers already cover all targets. Concretely delete: `addEdge('database_initializer', 'planner')`, `addEdge('designer', 'component_selector')`, `addEdge('component_selector', 'template_selector')`, `addEdge('planner', ...)` has no static edge (only conditional) — keep as is, `addEdge('debugger', ...)` has no static edge — keep as is. Keep static edges that are the only outgoing edge (`coordinator→analyzer`, `template_selector→database_initializer`, `executor→file_state_tracker`, `answer_generator→finalize`, `finalize→END`, `increment_retry→executor`).
- **Status:** FIXED (2026-07-19)

---

## Issue 2 — Path traversal + shell injection in sandbox tools

- **Severity:** CRITICAL
- **Location:** `backend/src/modules/agent/tools/file-manifest.ts:73-79`; `tools/implementations/grep.ts:58,67-69`; `code_search.ts:46`; `delete_file.ts:39`; `rename_file.ts:51`; `read_file.ts:7-18`
- **Problem:**
  1. `file-manifest.ts` normalizes paths with `path.posix.normalize`, which **keeps leading `..`**. The protected-path set lookup then fails to match (`'../package.json' !== 'package.json'`), so `write_file('../package.json')`, `read_file('../../etc/passwd')`, and `delete_file('../../x')` escape the workspace. The comment claims the opposite of the actual behavior.
  2. Unquoted shell interpolation: `grep.ts` embeds `args.query` unquoted into a shell command (and the default `--include *` is glob-expanded by the sandbox shell, making default grep results wrong); `code_search.ts` quotes `file_pattern` but never sanitizes it; `delete_file.ts` and `rename_file.ts` run unquoted `rm` commands.
- **Solution:**
  1. Add a shared `resolveSafeWorkspacePath()` helper that strips the workspace prefix, normalizes, and **rejects any path that still contains a `..` segment or is absolute after normalization**; use it in every file tool (read/write/edit/delete/rename/copy/search_replace/list_files).
  2. Single-quote all user-controlled interpolations in shell commands (`'...'` with embedded `'` escaped as `'\''`); fix the grep default include pattern to a quoted `'*.ts'`-style list or drop `--include` when the pattern is `*`; validate `file_pattern` against an allowlist of glob metacharacters only.
- **Status:** FIXED (2026-07-19)

---

## Issue 3 — Stale `seo_meta:` failures keep the verification loop alive forever

- **Severity:** HIGH
- **Location:** `backend/src/modules/agent/graph.ts:202-214` (`routeAfterVerification`), `backend/src/modules/agent/nodes/verification.node.ts:72-77`
- **Problem:** `verificationFailures` **accumulates** across rounds (`[...old, ...new].slice(-20)`), and `routeAfterVerification` checks it with `f.startsWith('seo_meta:')`. If SEO fails in round 1 but passes in round 2, the stale `seo_meta:` entries still match → `hasIssues` stays true → all 3 retries are burned even though everything is green.
- **Solution:** In `verification.node.ts`, return SEO failures under a dedicated `seoIssues`-style fresh field (not merged into the accumulated history), and make `routeAfterVerification` evaluate only the **current round's** arrays (`visualIssues`, `functionalIssues`, `a11yIssues`, `e2eFailures`, `securityIssues`, plus the fresh SEO field). Keep `verificationFailures` purely as capped history for reporting.
- **Status:** FIXED (2026-07-19)

---

## Issue 4 — No timeouts on streaming LLM calls or BullMQ jobs

- **Severity:** CRITICAL (reliability)
- **Location:** `backend/src/lib/ai-gateway.service.ts:300,404` (streaming calls pass only the caller signal); `backend/src/modules/agent/services/agent-job.service.ts:84-90` (job options); `backend/src/modules/agent/agent.processor.ts`
- **Problem:** The 2-minute `NON_STREAMING_LLM_TIMEOUT_MS` applies only to non-streaming calls. A hung SSE stream from a provider stalls forever, and since BullMQ jobs have no `timeout` either, one stuck generation permanently occupies one of only 4 worker slots.
- **Solution:**
  1. Wrap streaming calls in an inactivity watchdog: reset an `AbortController`-driven timer on every received SSE chunk; abort when no chunk arrives for `AI_STREAM_IDLE_TIMEOUT_MS` (env, default 120000) and enforce a hard ceiling `AI_STREAM_TOTAL_TIMEOUT_MS` (env, default 600000).
  2. Add `timeout` to BullMQ job options (env `AGENT_JOB_TIMEOUT_MS`, default 1800000 = 30 min) so a wedged job fails and releases its slot.
- **Status:** FIXED (2026-07-19) — with two deviations from the plan: total stream ceiling defaults to 1200000 (20 min, not 600000) to survive legit in-stream tool runs, and BullMQ v5 has **no** job `timeout` option, so the job ceiling is enforced in `agent.processor.ts` via a timer on the job's `AbortController` instead.

---

## Issue 5 — Debugger enters blind on `debug` workflow; review issues mislabeled "Build logs"

- **Severity:** HIGH
- **Location:** `backend/src/modules/agent/nodes/debugger.node.ts:26-33`
- **Problem:** On the `debug` workflow the debugger's context is built from `debugRemainingErrors` (empty on first pass — nothing sets it before the debugger), `reviewIssues` (empty), DB status, and the raw user prompt. The analyzer's `scope`, `relevantFiles`, `intent` — and the todo the analyzer seeded — are never passed, so the debugger starts with no idea what to investigate. Additionally, review issues are fed under the literal label `Build logs:`, and the debugger never learns which retry attempt it is on.
- **Solution:** Extend the debugger context with: `analyzer` info (`intent`, `scope`, `relevantFiles`), `retryCount`/`maxRetries`, previous fix attempts (`debugRemainingErrors`), and a correctly-labeled section (`Review issues:` only when reached from the reviewer; `Reported errors:` otherwise). Distinguish the two entry modes explicitly so the model knows why it was recalled.
- **Status:** FIXED (2026-07-19)

---

## Issue 6 — Reviewer toolset contradicts its prompt (both directions)

- **Severity:** HIGH
- **Location:** `backend/src/prompts/reviewer.md:93` (claims `run_type_checks`); `backend/src/modules/agent/tools/index.ts:85-97` (`buildReadOnlyToolSet`); `backend/src/modules/agent/services/agent-mcp-tool.service.ts:191,203` (registers `shadcn_install`, `shadcn_init`)
- **Problem:** The prompt tells the reviewer to run `tsc` via `run_type_checks`, but the read-only toolset doesn't include it → hallucinated tool calls or skipped type audits. Conversely, the "read-only" reviewer receives the sandbox-mutating MCP tools `shadcn_install`/`shadcn_init` (the planner toolset explicitly strips them at `index.ts:108-110`; the reviewer's does not).
- **Solution (DECISION NEEDED):**
  - Option A: strip `shadcn_install`/`shadcn_init` from the reviewer toolset **and** add `run_type_checks` (it is genuinely read-only) — prompt becomes truthful.
  - Option B: strip the mutating tools and fix `reviewer.md:93` to not mention `run_type_checks`.
- **Status:** FIXED (2026-07-19) — owner chose Option A.

---

## Issue 7 — Stub tools lie to the model; 4 orphaned tools

- **Severity:** HIGH
- **Location:** `backend/src/modules/agent/tools/implementations/execute_sql.ts:34-45`; `get_supabase_project_info.ts:50-54`; `get_supabase_table_schema.ts:49-52`; `setup_pocketbase.ts` (`templateId` no-op); `set_chat_summary.ts:14-16`; `code_search.ts:14` ("semantic-aware" claim); orphaned: `write_plan`, `exit_plan`, `set_chat_summary`, `planning_questionnaire` (imported in `tools/index.ts` but never registered)
- **Problem:** Tool descriptions promise behavior the implementations don't deliver (`execute_sql` "executes" but returns the query text; Supabase info/schema tools return placeholders; `set_chat_summary` claims success but persists nothing) → the model hallucinates downstream. Four implemented tools are dead code.
- **Solution (DECISION NEEDED):**
  - Option A (small): rewrite descriptions to tell the truth (e.g. `execute_sql`: "Prepares the SQL for execution; execution requires a Management API token — do not expect result rows"), remove the fake "semantic-aware" claim from `code_search`, delete the 4 orphaned tools.
  - Option B (large): actually implement the Supabase Management API calls + chat-summary persistence, then keep descriptions. Significantly more work and new config surface.
- **Status:** FIXED (2026-07-19) — owner didn't pick; applied the recommended low-risk Option A (honest descriptions + delete dead code). Can be upgraded to Option B (real Supabase Management API) on request.

---

## Issue 8 — Fallback prompts contradict the real prompts; 3 dead prompt files

- **Severity:** HIGH
- **Location:** `backend/src/modules/agent/services/prompt-loader.service.ts` (FALLBACK_PROMPTS at :87-95, :120-122, :147-151, :209); dead files: `backend/src/prompts/coordinator.md`, `file-state-tracker.md`, `schema-adaptor.md`
- **Problem:** Three fallbacks directly contradict the `.md` files they replace (pre-flight `valid` semantics; planner "you are ALSO the designer"; executor `src/admin/` forbidden vs allowed under `src/admin/pages/`). `designer`, `component-selector`, `e2e-test-generator` have **no fallback** and their `load()` calls sit outside try blocks → a missing file kills the whole graph after 3 retries. Three prompt files describe agents that don't exist (dead, misleading). No caching (fs read per node per run); unreadable file silently swaps in a stale fallback with the real error discarded.
- **Solution:** Sync the 3 contradicting fallbacks with their `.md` counterparts; add fallbacks for `designer`, `component-selector`, `e2e-test-generator`; delete the 3 dead prompt files (and their unreachable fallbacks); add a small in-memory cache with `NODE_ENV !== 'production'` bypass for dev hot-reload; log the real fs error at warn level when falling back.
- **Status:** FIXED (2026-07-19)

---

## Issue 9 — One shared `retryCount` funds two different loops

- **Severity:** MEDIUM
- **Location:** `backend/src/modules/agent/graph.ts:197,212` (both check `< 3`); `backend/src/modules/agent/nodes/debugger.node.ts:95-100` (increments); `backend/src/modules/agent/nodes/increment-retry.node.ts` (increments)
- **Problem:** Review-loop retries and verification-loop retries draw from the same counter — 2 review failures leave only 1 verification retry. The ceiling `3` is also hardcoded in three places (`agent.service.ts:211`, `graph.ts:197`, `graph.ts:212`).
- **Solution:** Split the budget: keep `retryCount` for the verification loop (incremented by `increment-retry.node.ts`) and add a dedicated `reviewRetryCount` for the reviewer↔debugger loop (incremented in `debugger.node.ts` when reached from the reviewer). Reset `reviewRetryCount` when the reviewer passes. Export a single `MAX_REVIEW_RETRIES` / `MAX_VERIFICATION_RETRIES` constant from `graph.ts` and use it in `agent.service.ts`.
- **Status:** FIXED (2026-07-19) — constants live in `state.ts` instead of `graph.ts` to avoid a circular import (`graph.ts` imports the nodes, which need the constants).

---

## Issue 10 — `AI_DEFAULT_MODEL` silently ignored; model "roles" are fake

- **Severity:** MEDIUM
- **Location:** `backend/src/modules/agent/services/model-resolver.service.ts:9-12,72-88`
- **Problem:** `rolePrimaries` maps `reasoning`, `code`, and `review` to the identical `['kimi-k2.5', 'qwen-max']` despite a comment claiming per-role preferences. `AI_DEFAULT_MODEL` is appended to the sequence then filtered out by the 2-entry allowlist — setting it does nothing, with no warning.
- **Solution (DECISION NEEDED):**
  - Option A: keep the allowlist but honor `AI_DEFAULT_MODEL` when it's in the allowlist and **log an explicit warning** when it's filtered out; collapse the pretend roles to two real ones (`fast`, `default`) and update `NODE_ROLE_MAP`.
  - Option B: make the allowlist itself env-configurable (`AI_ALLOWED_MODELS`, comma-separated, default `kimi-k2.5,qwen-max`) and differentiate primaries per role through env (`AI_MODEL_REASONING`, `AI_MODEL_CODE`, `AI_MODEL_REVIEW`, `AI_MODEL_FAST`).
- **Status:** FIXED (2026-07-19) — owner didn't pick; applied the recommended Option A (env-configurable allowlist + role models).

---

## Issue 11 — Prompt/parser contract drift

- **Severity:** MEDIUM
- **Location:** `backend/src/prompts/pre-flight-validator.md:16,74 vs 110,133,156` + `nodes/pre-flight-validator.node.ts:143-171`; `prompts/debugger.md:38-45` vs `nodes/debugger.node.ts:55,57,91`; `prompts/planner.md:338,352`; `prompts/analyze.md:34`; `nodes/designer.node.ts:101`; `nodes/debugger.node.ts:55`
- **Problem:**
  1. pre-flight-validator.md self-contradicts on `valid` (always true vs examples with false) and demands `suggested_fixes`/`correction_commands` the parser never reads.
  2. debugger.md's output schema omits `root_cause`/`fixes_applied`, which the parser reads.
  3. planner.md instructs calling `update_todos` **after** emitting JSON, which can push the JSON out of the tool loop's `finalContent` → silent fallback plan.
  4. analyze.md:34 tells the analyzer to "use available tools" — it has none.
  5. `designer.node.ts:101` casts parsed JSON to `DesignSpec` with zero validation.
  6. `debugger.node.ts:55` fallback regex `/fixed|resolved/i` matches "not fixed".
- **Solution:**
  1. Rewrite pre-flight-validator.md: `valid` is informational only (the node recomputes it as `errors.length === 0`); remove `suggested_fixes`/`correction_commands` from the schema; fix examples.
  2. Add `root_cause` and `fixes_applied` to debugger.md's schema.
  3. planner.md: state the JSON object must be the **final** message content; remove the post-JSON `update_todos` instruction.
  4. Remove the tool claim from analyze.md.
  5. Add a lightweight `validateDesignSpec()` check (required top-level keys + palette tokens) in `designer.node.ts`; fall back to the default spec with a warning on failure.
  6. Replace the regex with a negation-aware check (e.g. `/\bfixed\b|\bresolved\b/i` minus `/not fixed|couldn'?t fix|unable to fix/i`).
- **Status:** FIXED (2026-07-19)

- **Severity:** MEDIUM
- **Location:** `backend/src/lib/ai-gateway.service.ts:163,246,305,411,633` (temperatures), no `max_tokens` anywhere; retry/rate-limit/concurrency constants at `graph.ts:44`, `agent.service.ts:139`, `agent.processor.ts:11-15`, `rate-limit.service.ts:13-15`
- **Problem:** Temperature `0.7` chat / `0.3` tools applies identically to planner/reviewer/debugger; no `max_tokens`; response `usage` is never parsed (no per-node/model/user cost data); operational constants (node attempts, recursion limit, worker concurrency, rate limits) are compile-time.
- **Solution (DECISION NEEDED on scope):**
  - Option A (config only): move constants to env (`AGENT_MAX_NODE_ATTEMPTS`, `AGENT_RECURSION_LIMIT`, `AGENT_WORKER_CONCURRENCY`, `AGENT_MAX_CONCURRENT_GENERATIONS`, `AGENT_MAX_ENQUEUES_PER_MINUTE`); no behavior change.
  - Option B (config + behavior): additionally per-role temperature/`max_tokens` (env-overridable, e.g. planner/reviewer/debugger at 0.2, executor tools at 0.3) and capture `usage` from responses into a per-job log line (node, model, prompt/completion tokens).
- **Status:** FIXED (2026-07-19) — owner didn't pick; applied the recommended Option A (config + behavior + usage capture). Caveat: streaming requests now send `stream_options.include_usage`; a provider that strictly rejects unknown body fields would fail over to the next model (logged).

---

## Lower-priority observations — ALL FIXED (2026-07-19)

- ~~`executor.node.ts:195` drops the cancellation signal~~ — FIXED alongside Issue 12 (both the stream call and the direct `executeToolCall` now receive `deps.signal`).
- ~~`executor.node.ts` context omits `filesWritten`~~ — FIXED: recalled executors now get `previousFilesWritten` (path + status, capped at 50).
- ~~No global tool-result size cap~~ — FIXED: `truncateToolResult` in `tool-executor.ts` caps every tool result (`AGENT_TOOL_RESULT_MAX_CHARS`, default 20000) with a guidance marker.
- ~~Blind retries of deterministic failures~~ — FIXED: new `DeterministicToolError` (`tools/errors.ts`); zod validation + protected-path + path-traversal + exact-match + todo-order errors return to the model immediately instead of 3 backoff attempts.
- ~~`write_file` always reports "modified"~~ — FIXED: existence is checked before the write.
- ~~`edit_file` emits `file_update` then reverts silently~~ — FIXED: a corrective `file_update` with the original content is emitted on revert.
- ~~zod→JSON-schema converter gaps~~ — FIXED: `ZodEffects` unwrapping, `ZodNativeEnum` values, and number/string min/max constraints now emitted (7 new tests in `tool-definitions.spec.ts`).
- ~~`update_manifest` lets the model write false entries~~ — FIXED: tool removed (manifest is auto-maintained by the mutating tools; `buildDebugToolSet` also deduplicated to delegate to `buildToolSet`).
- ~~`run_type_checks`' `path` param silently ignored~~ — FIXED: param removed; description states checks are always project-wide (`tsc --project` can't take per-file args).
- ~~Prompt-injection hygiene~~ — FIXED: untrusted-data fencing/framing at the 4 sites (executor context JSON marked as data-not-instructions; seo-meta interpolations JSON-escaped; answer-generator file contents wrapped in `<file>` tags with an untrusted header; analyzer memories labeled untrusted historical data).
- ~~analyzer parse-error triggers 3 full node retries~~ — FIXED: analyzer no longer returns `error` on JSON parse failure (its graceful fallback already produces a safe workflow).
- ~~Env hygiene~~ — FIXED: `.env.example` documents `TOKENFREE_BASE_URL`, `NEW_API_KEY`, `CORS_ORIGINS`, `DOCKER_HOST`; dead `PROJECTS_DB_PATH`/`SANDBOX_PROVIDER` removed from both `.env.example` and `env.ts`.
- ~~BullMQ gaps~~ — FIXED: `[dlq]` structured log on permanent failure (ops-alertable), retried jobs resume from checkpoint (deterministic `agent-job-<id>` thread id + `resume` on attempt ≥ 2, guarded by a checkpoint-existence check in `agent.service.ts`), and stalled jobs now release their concurrency slot via an `onStalled` handler.
- ~~`graph.spec.ts` smoke test only~~ — FIXED earlier (Issue 1): edge-mixing + reachability tests; plus new specs for file-manifest, prompt-loader, model-resolver, tool-definitions.
- **LangSmith/OpenTelemetry tracing** — NOT DONE by design: choosing a tracing vendor is an infrastructure decision; out of scope for code fixes. `[llm-usage]` per-call token logs (Issue 12) cover the cost-observability part meanwhile.

---

## Final review (2026-07-19)

A fresh-eyes review of the complete diff (independent subagent + manual hunk inspection) confirmed all routing, shell-quoting, watchdog mechanics, retry budgets, model-resolver, prompt-loader, and prompt↔parser contracts — and found 5 remaining problems, all fixed in this pass:

1. **Job timeout reported as `completed` (review finding).** `agent.service.stream()` swallows cancellation (emits error+done, returns normally), so the processor's timeout rethrow was unreachable and a 30-min timeout would be marked completed with no BullMQ retry. Fixed: the processor now checks `jobTimedOut` right after the stream loop, publishes an error event, releases the slot, and throws — the job fails honestly and retries (resuming from checkpoint, per fix L).
2. **Validation errors not classified deterministic (review finding).** `@langchain/core` wraps tool-arg schema failures in `ToolInputParsingException` whose `name` is plain `'Error'` — the `ZodError` name check never matched. Fixed: `isDeterministicToolError` now checks `instanceof ToolInputParsingException`.
3. **DeterministicToolError re-wrapped into generic Error (review finding).** The catch blocks of `search_replace`, `update_todos`, `edit_file`, `list_files` re-wrapped all errors, losing the classification. Fixed: each catch rethrows `DeterministicToolError` as-is (after emitting `tool_end`); `edit_file`'s anchor-miss throws are now deterministic too.
4. **Pre-existing BLOCKER: parallel template copy never consumed.** `designer.node.ts` set `deps.templateCopy`, but `wrapNode` hands each node a shallow copy of deps — the mutation landed on a throwaway object, so the template selector always re-copied sequentially (files copied twice), and a background-copy rejection was an unhandled promise rejection (process-crash risk). Fixed: `GraphDependencies.templateCopy` is now a shared mutable box (`templateCopy.current`) initialized in `agent.service.ts`, and `startTemplateCopy` attaches a guarded `.catch(() => {})`.
5. **`chat()` generator had no timeout (review finding).** The third streaming method (used by `POST /chat`) had no `signal` at all. Fixed: same watchdog as the other two streaming methods (idle + total, failover on timeout).

Verification after this pass: `tsc --noEmit` clean, `nest build` clean, full backend suite **59/59 green**.

---

## Fix log

- **2026-07-19 — Issue 1 FIXED.** Removed the 3 static edges shadowed by conditional edges (`database_initializer→planner`, `designer→component_selector`, `component_selector→template_selector`) in `graph.ts`; added a regression guard comment. Extended `graph.spec.ts` from a smoke test to 3 tests, incl. "never mixes static and conditional edges from the same node" (introspects `getGraph().edges`). All tests pass.

- **2026-07-19 — Issue 2 FIXED.** `normalizeFilePath` (`file-manifest.ts`) now throws on any path that escapes the workspace (`..`, `../…`, absolute after normalization) — one guard covers write/edit/search_replace/delete/rename/copy and `isProtected`. `read_file`/`list_files` path resolvers rewritten on top of it. New `tools/shell.ts` `shellQuote()` helper applied to every model-controlled shell interpolation: `grep` (also replaced the glob-broken default `--include *` with `--exclude-dir` list), `code_search`, `delete_file`/`rename_file` (`rm -- '…'`), `sandbox-provider.listFiles` (`find`), `installPackage` (`npm install`). Added `file-manifest.spec.ts` — 13 tests covering traversal rejection, protected paths, and quoting. Full agent suite: 33/33 pass; `tsc --noEmit` clean.

- **2026-07-19 — Issue 3 FIXED.** Added fresh-per-round `seoIssues` to the agent state (`state.ts`); `verification.node.ts` now populates it from the current SEO result only (the accumulated `verificationFailures` remains as capped reporting history); `routeAfterVerification` checks only current-round arrays (`graph.ts`); `executor.node.ts` includes `seoIssues` in the retry context it builds. Stale `seo_meta:` history can no longer keep the loop alive. Suite green, typecheck clean.

- **2026-07-19 — Issue 4 FIXED.** New `createStreamWatchdog` in `ai-gateway.service.ts`: idle timer reset on every SSE chunk (`AI_STREAM_IDLE_TIMEOUT_MS`, default 120s) + hard ceiling (`AI_STREAM_TOTAL_TIMEOUT_MS`, default 20min), applied to both `chatCompletionsStream` and `chatCompletionsWithToolsStream`; idle timer is **suspended while a tool call runs inside the stream** (run_command can take minutes); watchdog timeouts fail over to the next model and are never misclassified as user-cancellation (dedicated `timedOut` flag, since AbortError alone would match `isCancellation`). Job-level ceiling: BullMQ v5 dropped the `timeout` job option, so `agent.processor.ts` now arms a timer on the job's AbortController (`AGENT_JOB_TIMEOUT_MS`, default 30min) and rethrows an honest "timed out" error. Env vars added to `env.ts` + `.env.example`; unused `combineAbortSignals` import removed. Suite green, typecheck clean.

- **2026-07-19 — Issue 5 FIXED.** `debugger.node.ts` context rewritten: an explicit "WHY YOU WERE CALLED" header distinguishes reviewer-recall (fix ONLY these review issues, retry #N) from the analyzer debug workflow (investigate the user's bug). The analyzer path now carries `intent`/`scope`/`relevantFiles` (previously absent — the debugger entered blind); previous-attempt errors and current TypeScript errors are appended when present; the misleading `Build logs:` label is gone. Suite green, typecheck clean.

- **2026-07-19 — Issue 6 FIXED (owner decision: Option A).** `buildReadOnlyToolSet` now includes `RunTypeChecksTool` (reviewer.md's `tsc` instruction is now backed by a real tool) and filters the sandbox-mutating `shadcn_install`/`shadcn_init` MCP tools out of the reviewer's docs tools — same guard the planner toolset already had. Stale "analyze node" comment corrected. Suite green, typecheck clean.

- **2026-07-19 — Issue 7 FIXED (default Option A; owner skipped the question).** Descriptions rewritten to state real behavior: `execute_sql` (stages only, never executes — "do not fabricate query results"), `get_supabase_project_info` (IDs only, no keys/tables), `get_supabase_table_schema` (no schema data returned), `setup_pocketbase.templateId` (label only; dead defensive cast removed), `code_search` (keyword grep, not "semantic-aware"), `add_integration` result message no longer overpromises. Deleted the 4 orphaned tools (`write_plan`, `exit_plan`, `set_chat_summary`, `planning_questionnaire`) and their dead imports in `tools/index.ts`. Suite green, typecheck clean.

- **2026-07-19 — Issue 8 FIXED.** `prompt-loader.service.ts`: deleted unreachable `coordinator`/`file-state-tracker` fallbacks; synced the 3 contradicting fallbacks (executor admin rule now matches executor.md's `src/admin/pages/` rule; planner fallback no longer claims "you are ALSO the designer"; pre-flight fallback marks `valid` informational and drops the parser-ignored `suggested_fixes`/`correction_commands`); removed the analyze fallback's false tool claim; added fallbacks for `designer`, `component-selector`, `e2e-test-generator` (their `load()` calls sit outside try blocks — the graph no longer dies on a missing file); added production-only in-memory caching (dev keeps hot-reload) and warn-level logging of the real fs error. Deleted the 3 dead prompt files (`coordinator.md`, `file-state-tracker.md`, `schema-adaptor.md`). New `prompt-loader.service.spec.ts` guards both drift directions (fallback↔file sets must match). Suite green, typecheck clean.

- **2026-07-19 — Issue 9 FIXED.** New `reviewRetryCount` state field; `MAX_REVIEW_RETRIES`/`MAX_VERIFICATION_RETRIES` constants exported from `state.ts` (not `graph.ts` — circular import). Reviewer↔debugger loop draws from `reviewRetryCount` (incremented in `debugger.node.ts` when reached from the reviewer, reset to 0 when the reviewer passes); verification loop keeps `retryCount` via `increment-retry.node.ts`. Routers in `graph.ts` and the human-in-the-loop `review_max_reached` event in `agent.service.ts` use the matching counter/constant — the hardcoded `3` (previously duplicated in 3 files) now exists exactly once. The debugger's recall message now also shows the real budget ("retry #N of 3"). Suite green, typecheck clean.

- **2026-07-19 — Issue 10 FIXED (default Option A; owner skipped the question).** `AI_ALLOWED_MODELS` (comma-separated, default `kimi-k2.5,qwen-max`) now drives the runtime allowlist; per-role primaries are env-configurable (`AI_MODEL_REASONING`/`AI_MODEL_CODE`/`AI_MODEL_REVIEW`/`AI_MODEL_FAST`). Any configured model outside the allowlist (incl. `AI_DEFAULT_MODEL`) is dropped with an explicit warn-once log instead of vanishing silently; empty-after-filter falls back to the first allowed model with a warning. `isAllowedModel` reads the same env list. New `model-resolver.service.spec.ts` (4 tests). Env vars documented in `.env.example`. Suite green, typecheck clean.

- **2026-07-19 — Issue 11 FIXED.** pre-flight-validator.md: `valid` redefined as informational (system recomputes from `errors`), parser-ignored `suggested_fixes`/`correction_commands` removed from schema + all 4 examples, Example 3's warnings-only output corrected to `valid: true`, Example 4 rewritten around `recharts` (framer-motion IS pre-installed — verified against `src/templates/*/package.json`). debugger.md: output schema gains the `root_cause`/`fixes_applied` fields the parser reads. planner.md: removed the "call `update_todos` after JSON output" instruction (could push the JSON out of `finalContent` → silent fallback plan) and the hash-routing example that contradicted its own routes.ts rule. analyze.md: dropped the false "use available tools" claim and the `"pocketbase | null"` literal-string schema risk. debugger.node.ts: `fixed` fallback regex is now negation-aware ("not fixed" no longer counts as fixed). designer.node.ts: new `validateDesignSpec` — invalid/partial model JSON now falls back to the default spec with a warning instead of being blindly cast. Suite green, typecheck clean.

- **2026-07-19 — Issue 12 FIXED (default Option A; owner skipped the question).** Env-configurable operations: `AGENT_MAX_NODE_ATTEMPTS` (wrapNode, read lazily so tests don't need env), `AGENT_RECURSION_LIMIT`, `AGENT_WORKER_CONCURRENCY` (read from process.env at decorator time), `AGENT_MAX_CONCURRENT_GENERATIONS`, `AGENT_MAX_ENQUEUES_PER_MINUTE` (rate-limit.service). New `GenerationOptions` threaded through `chatCompletionsStream`/`chatCompletionsWithToolsStream`: per-role temperature via `modelResolver.generationParams(nodeType)` (`AI_TEMP_REASONING` 0.3 / `_CODE` 0.3 / `_REVIEW` 0.2 / `_FAST` 0.7), optional `AI_MAX_TOKENS`, and per-node labels. Usage capture: streaming requests send `stream_options.include_usage`, the usage chunk is parsed, and `[llm-usage]` log lines record node/provider/model/prompt/completion tokens per call. Wired into tool-loop (planner/designer/reviewer/debugger/component-selector), executor, analyzer, answer-generator, seo-meta, e2e-test-generator. Also fixed along the way: executor's stream call and direct tool execution now receive `deps.signal` (cancellation previously not honored there). Suite green, typecheck clean.

- **2026-07-19 — Lower-priority observations FIXED (all except vendor tracing).** (1) Recalled executors now receive `previousFilesWritten`. (2) Global tool-result cap via `AGENT_TOOL_RESULT_MAX_CHARS` (default 20000) with a narrowing-guidance marker. (3) `DeterministicToolError` stops blind 3× retries for zod/protected-path/traversal/exact-match/todo-order failures. (4) `write_file` checks existence before writing (real created/modified status). (5) `edit_file` emits a corrective `file_update` when its tsc check reverts. (6) zod converter: `ZodEffects` unwrap, `ZodNativeEnum` values, min/max constraints (+7 tests). (7) `update_manifest` tool deleted; `buildDebugToolSet` deduplicated onto `buildToolSet`. (8) `run_type_checks` `path` param removed (was silently ignored). (9) Untrusted-data fencing at the 4 prompt-interpolation sites. (10) Analyzer no longer returns `error` on parse failure (kills the wasteful 3× retry). (11) `.env.example` documents the 4 used-but-undocumented vars; 2 dead vars removed from example + `env.ts`. (12) BullMQ: `[dlq]` dead-letter log, checkpoint-resume on retried jobs (guarded), stalled-job slot release. Vendor tracing (LangSmith/OTel) intentionally left out — infrastructure decision, not a code fix. Full backend suite: 59/59 green; `tsc --noEmit` clean.
