/**
 * Typed API client for AI-Website backend routes.
 * Centralizes all fetch calls with proper typing and error handling.
 *
 * Every endpoint documented in API.md is wired here.
 */

import { backendApiUrl } from './backendConfig';
import { safeFetchJson, safeFetchBlob, type SafeFetchResult } from './safeFetch';
import { withAuthInit } from '@/lib/auth/token';

export const DEFAULT_AI_MODEL = 'qwen-max';

// ─── Types ──────────────────────────────────────────────────────────────

export interface SandboxData {
  sandboxId: string;
  url: string;
  createdAt?: string;
  endAt?: string;
  [key: string]: unknown;
}

export interface ProjectListItem {
  projectId: string;
  projectName: string;
  updatedAt: number;
  preview: string | null;
  vercelProjectId?: string | null;
  vercelDomainUrl?: string | null;
  vercelDeployedAt?: string | null;
  githubRepoUrl?: string | null;
  pocketbaseUrl?: string | null;
  pocketbaseAdminUrl?: string | null;
}

export interface Manifest {
  files: Record<string, unknown>;
  routes: string[];
  componentTree: Record<string, unknown>;
  entryPoint: string;
  styleFiles: string[];
}

export interface SandboxFilesResponse {
  success: boolean;
  files: Record<string, string>;
  structure: string;
  fileCount: number;
  manifest?: Manifest;
  error?: string;
  code?: string;
}

export interface SandboxStatusResponse {
  success: boolean;
  active: boolean;
  healthy: boolean;
  sandboxData?: SandboxData | null;
}

export interface SearchPlan {
  edit_type: string;
  reasoning: string;
  search_terms: string[];
  regex_patterns: string[];
  file_types_to_search: string[];
  expected_matches: number;
  fallback_search: string;
}

export interface DesignTokens {
  theme: string;
  colors: Record<string, string>;
  radius: Record<string, unknown>;
  shadows: Record<string, unknown>;
  typography: Record<string, unknown>;
}

export interface ProjectSpec {
  project_type: string;
  title: string;
  tagline: string;
  target_audience: string;
  core_features: string[];
  pages: Array<{ name: string; route: string }>;
  brand_tone: string;
  color_preferences: string;
  constraints: string[];
}

export interface UiUxBlueprint {
  pages: Array<{
    name: string;
    sections: Array<{ name: string; type: string }>;
  }>;
}

export interface FilePlan {
  files: Array<{ path: string; purpose: string }>;
}

// ─── Helpers ────────────────────────────────────────────────────────────

function generateIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function apiUrl(path: string): string {
  return backendApiUrl(`/api${path}`);
}

async function apiPost<T = unknown>(
  path: string,
  body?: Record<string, unknown>,
  context?: string,
  signal?: AbortSignal,
  timeoutMs?: number
): Promise<SafeFetchResult<T>> {
  return safeFetchJson<T>(
    apiUrl(path),
    {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
      signal,
    },
    context ?? path,
    true,
    timeoutMs
  );
}

async function apiGet<T = unknown>(
  path: string,
  context?: string,
  signal?: AbortSignal
): Promise<SafeFetchResult<T>> {
  return safeFetchJson<T>(apiUrl(path), { method: 'GET', signal }, context ?? path);
}

async function apiDelete<T = unknown>(
  path: string,
  body?: Record<string, unknown>,
  context?: string
): Promise<SafeFetchResult<T>> {
  return safeFetchJson<T>(
    apiUrl(path),
    {
      method: 'DELETE',
      body: body ? JSON.stringify(body) : undefined,
    },
    context ?? path
  );
}

async function apiPut<T = unknown>(
  path: string,
  body?: Record<string, unknown>,
  context?: string
): Promise<SafeFetchResult<T>> {
  return safeFetchJson<T>(
    apiUrl(path),
    {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    },
    context ?? path
  );
}

async function apiPatch<T = unknown>(
  path: string,
  body?: Record<string, unknown>,
  context?: string
): Promise<SafeFetchResult<T>> {
  return safeFetchJson<T>(
    apiUrl(path),
    {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    },
    context ?? path
  );
}

/**
 * Streaming POST for endpoints that return SSE or raw streams.
 * Returns the raw Response so the caller can read the stream.
 * Auth headers are injected automatically.
 */
async function apiPostStream(
  path: string,
  body?: Record<string, unknown>,
  signal?: AbortSignal
): Promise<Response> {
  return fetch(apiUrl(path), withAuthInit({
    method: 'POST',
    signal,
    headers: { Accept: 'text/event-stream' },
    body: body ? JSON.stringify(body) : undefined,
  }));
}

// ─── Sandbox APIs ───────────────────────────────────────────────────────

export async function createSandbox(body?: { projectName?: string; skipSetup?: boolean; idempotencyKey?: string }) {
  return apiPost<{
    success: boolean;
    sandboxId: string;
    url: string;
    provider: string;
    createdAt: string;
    endAt: string;
    files: Record<string, string>;
    structure: string;
    fileCount: number;
    error?: string;
  }>('/create-ai-sandbox-v2', { ...body, idempotencyKey: body?.idempotencyKey ?? generateIdempotencyKey() }, 'createSandbox', undefined,
    // Cold E2B sandboxes + npm install routinely take 30-60s. The 15s default
    // JSON timeout aborts the request mid-creation, so give this endpoint a
    // 60s budget. The idempotency key above makes a user retry safe if this
    // still times out.
    60_000);
}

export async function getSandboxStatus(sandboxId?: string, signal?: AbortSignal) {
  const qs = sandboxId ? `?sandboxId=${encodeURIComponent(sandboxId)}` : '';
  return apiGet<SandboxStatusResponse>(`/sandbox-status${qs}`, 'getSandboxStatus', signal);
}

export async function killSandbox(sandboxId?: string) {
  return apiPost<{ success: boolean; sandboxKilled: boolean; error?: string }>('/kill-sandbox', sandboxId ? { sandboxId } : undefined, 'killSandbox');
}

export async function attachSandbox(sandboxId: string) {
  return apiPost<{
    success: boolean;
    recovered: boolean;
    sandboxData: SandboxData;
  }>('/e2b/attach', { sandboxId }, 'attachSandbox');
}

export async function listSandboxes() {
  return apiGet<{ success: boolean; sandboxes?: Array<{ sandboxId: string; templateId: string | null; state: string | null; startedAt: string | null; endAt: string | null; metadata: Record<string, unknown> | null }> }>(
    '/e2b/sandboxes?state=running&limit=25',
    'listSandboxes'
  );
}

export async function getSandboxFiles(sandboxId: string, maxFiles?: number | null) {
  const maxParam = maxFiles === null ? 'maxFiles=null' : maxFiles !== undefined ? `maxFiles=${maxFiles}` : '';
  const query = maxParam ? `?sandboxId=${encodeURIComponent(sandboxId)}&${maxParam}` : `?sandboxId=${encodeURIComponent(sandboxId)}`;
  return apiGet<SandboxFilesResponse>(`/get-sandbox-files${query}`, 'getSandboxFiles');
}

export async function restoreSandboxSnapshot(sandboxId: string, snapshotId: string) {
  return apiPost<{ success: boolean }>('/sandbox-snapshot/restore', { sandboxId, snapshotId }, 'restoreSandboxSnapshot');
}

export async function runCommand(sandboxId: string, command: string, signal?: AbortSignal) {
  return apiPost<{ success: boolean; output: string; error: string; exitCode: number; message: string }>('/run-command-v2', { sandboxId, command }, 'runCommand', signal);
}

export async function installPackages(sandboxId: string, packages: string[], signal?: AbortSignal) {
  return apiPostStream('/install-packages-v2', { sandboxId, packages }, signal);
}

export async function restartPreview(sandboxId: string) {
  return apiPost<{ success: boolean; message: string }>('/restart-preview', { sandboxId }, 'restartPreview');
}

export async function getSandboxLogs(sandboxId: string) {
  return apiGet<{ success: boolean; logs: string[]; status: string }>(
    `/sandbox-logs?sandboxId=${encodeURIComponent(sandboxId)}`,
    'getSandboxLogs'
  );
}

export async function getSandboxSnapshot(projectId: string, sandboxId: string) {
  return apiGet<{
    success: boolean;
    snapshot: {
      projectId: string;
      sandboxId: string;
      fileStructure: string;
      sandboxFiles: Record<string, string>;
    };
  }>(
    `/sandbox-snapshot?projectId=${encodeURIComponent(projectId)}&sandboxId=${encodeURIComponent(sandboxId)}`,
    'getSandboxSnapshot'
  );
}

export async function monitorPreviewLogs(sandboxId: string) {
  return apiGet<{ success: boolean; hasErrors: boolean; errors: Array<{ type: string; package?: string; message: string; file?: string }> }>(
    `/monitor-preview-logs?sandboxId=${encodeURIComponent(sandboxId)}`,
    'monitorPreviewLogs'
  );
}

export async function getSandboxFile(sandboxId: string, filePath: string) {
  return apiGet<{ success: boolean; path: string; content: string }>(
    `/sandbox-file?sandboxId=${encodeURIComponent(sandboxId)}&path=${encodeURIComponent(filePath)}`,
    'getSandboxFile'
  );
}

export async function writeSandboxFile(sandboxId: string, filePath: string, content: string) {
  return apiPost<{ success: boolean; path: string }>(
    '/sandbox-file',
    { sandboxId, path: filePath, content },
    'writeSandboxFile'
  );
}

export async function deleteSandboxFile(sandboxId: string, filePath: string) {
  return apiDelete<{ success: boolean; path: string }>(
    `/sandbox-file?sandboxId=${encodeURIComponent(sandboxId)}&path=${encodeURIComponent(filePath)}`,
    undefined,
    'deleteSandboxFile'
  );
}

export async function renameSandboxFile(sandboxId: string, filePath: string, newFilePath: string) {
  return apiPatch<{ success: boolean; oldPath: string; newPath: string }>(
    '/sandbox-file',
    { sandboxId, path: filePath, newPath: newFilePath },
    'renameSandboxFile'
  );
}

// ─── Agent & AI APIs ────────────────────────────────────────────────────

export async function createAgentSession(body: {
  prompt?: string;
  templateRepo?: string;
  templatePrompt?: string;
  projectName?: string;
}) {
  return apiPost<{ success: boolean; sessionId: string }>('/agent-sessions', body, 'createAgentSession');
}

export async function getAgentSession(sessionId: string) {
  return apiGet<{ success: boolean; session: { prompt?: string; templateRepo?: string; templatePrompt?: string; projectName?: string; userId: string } }>(
    `/agent-sessions/${encodeURIComponent(sessionId)}`,
    'getAgentSession'
  );
}

export async function agentStream(body: {
  sessionId?: string;
  prompt?: string;
  sandboxId: string;
  chatHistory?: Array<{ role: string; content: string }>;
  projectId?: string;
  intent?: string;
  idempotencyKey?: string;
  resumeReview?: {
    issues: string[];
    todos?: Array<{ id: string; content: string; status: string }>;
  };
}) {
  return apiPost<{ success: boolean; jobId: string; status: string }>(
    '/agent-stream',
    { ...body, idempotencyKey: body.idempotencyKey ?? generateIdempotencyKey() },
    'agentStream'
  );
}

export async function subscribeAgentStream(jobId: string, signal?: AbortSignal) {
  return fetch(apiUrl(`/agent-stream/${encodeURIComponent(jobId)}`), withAuthInit({
    method: 'GET',
    signal,
    headers: { Accept: 'text/event-stream' },
  }));
}

export async function cancelAgentJob(jobId: string) {
  return apiPost<{ success: boolean; cancelled: boolean; message: string }>(
    `/agent-jobs/${encodeURIComponent(jobId)}/cancel`,
    undefined,
    'cancelAgentJob'
  );
}

export async function getActiveAgentJob(sandboxId: string) {
  return apiGet<{ success: boolean; job: { id: string; state: string } | null }>(
    `/agent-jobs/active?sandboxId=${encodeURIComponent(sandboxId)}`,
    'getActiveAgentJob'
  );
}

export async function chatStream(body: {
  provider: string;
  prompt: string;
}, signal?: AbortSignal) {
  return apiPostStream('/chat', body, signal);
}

export async function analyzeEditIntent(body: {
  prompt: string;
  manifest: {
    files: Record<string, unknown>;
    routes: string[];
    componentTree: Record<string, unknown>;
  };
}) {
  return apiPost<{ success: boolean; search_plan: SearchPlan }>('/analyze-edit-intent', body, 'analyzeEditIntent');
}

export async function applyAICodeStream(body: {
  response: string;
  is_edit: boolean;
  packages: string[];
  sandboxId: string;
  conversationState?: Record<string, unknown>;
  existingFiles?: string[];
  currentFiles?: Record<string, string>;
  idempotencyKey?: string;
}) {
  return apiPostStream('/apply-ai-code-stream', { ...body, idempotencyKey: body.idempotencyKey ?? generateIdempotencyKey() });
}

export async function generateComponent(body: {
  section: { name: string; description: string };
  tokens?: Record<string, string>;
}) {
  return apiPost<{ code: string }>('/code/component', body, 'generateComponent');
}

export async function generatePage(body: {
  page: { name: string; route: string };
  sections?: Array<{ name: string; type: string }>;
}) {
  return apiPost<{ code: string }>('/code/page', body, 'generatePage');
}

export async function generateDesignTokens(body: {
  spec: { brand: string; vibe: string };
}) {
  return apiPost<DesignTokens>('/design/tokens', body, 'generateDesignTokens');
}

export async function summarizeSpec(body: {
  prompt: string;
}) {
  return apiPost<ProjectSpec>('/spec/summarize', body, 'summarizeSpec');
}

export async function generateUiUxBlueprint(body: {
  spec: Record<string, unknown>;
}) {
  return apiPost<UiUxBlueprint>('/spec/ui-ux-blueprint', body, 'generateUiUxBlueprint');
}

export async function generateFilePlan(body: {
  spec: Record<string, unknown>;
  blueprint: Record<string, unknown>;
}) {
  return apiPost<FilePlan>('/project/file-plan', body, 'generateFilePlan');
}

// ─── Project APIs ───────────────────────────────────────────────────────

export async function listProjects() {
  return apiGet<{ success: boolean; projects?: ProjectListItem[]; error?: string }>(
    '/projects',
    'listProjects'
  );
}

export async function saveProject(body: {
  sandboxId: string;
  projectId?: string;
  projectName: string;
  siteTitle?: string;
  fileStructure: string;
  structureContent: string;
  sandboxFiles: Record<string, string>;
  chat: Array<Record<string, unknown>>;
  saveReason?: string;
  idempotencyKey?: string;
}) {
  return apiPost<{
    success: boolean;
    projectId: string;
    projectName: string;
    savedFiles: number;
    storageFilesUploaded: number;
    zipPath: string;
    zipUploaded: boolean;
    dbSynced: boolean;
    warnings: string[];
    error?: string;
  }>('/projects/save', { ...body, idempotencyKey: body.idempotencyKey ?? generateIdempotencyKey() }, 'saveProject');
}

export async function openProject(projectId: string, targetSandboxId?: string) {
  return apiPost<{
    success: boolean;
    restoreSource: string;
    restoredCount: number;
    sandboxData: SandboxData;
    warnings: string[];
    snapshot: Record<string, unknown>;
  }>('/projects/open', { projectId, targetSandboxId }, 'openProject');
}

export async function deleteProject(projectId: string) {
  return apiDelete<{ success: boolean; projectId: string; error?: string }>(
    '/projects',
    { projectId },
    'deleteProject'
  );
}

export async function renameProject(projectId: string, projectName: string) {
  return apiPatch<{
    success: boolean;
    projectId: string;
    projectName: string;
    error?: string;
  }>('/projects', { projectId, projectName }, 'renameProject');
}

export async function restoreLocalProject(projectId: string, sandboxId: string) {
  return apiPost<{
    success: boolean;
    projectId: string;
    sandboxId: string;
    restoredCount: number;
    totalFiles: number;
    errors: string[];
  }>('/projects/restore-local', { projectId, sandboxId }, 'restoreLocalProject');
}

// ─── Snapshot APIs ──────────────────────────────────────────────────────

export async function saveSnapshot(payload: {
  projectId: string;
  sandboxId: string;
  projectName: string;
  fileStructure: string;
  structureContent: string;
  sandboxFiles: Record<string, string>;
  chat: Array<Record<string, unknown>>;
  updatedAt: string;
}) {
  return apiPost<{
    success: boolean;
    snapshot: Record<string, unknown>;
  }>('/sandbox-snapshot', payload, 'saveSnapshot');
}

// ─── Preview APIs ───────────────────────────────────────────────────────

export async function previewHealth(body: {
  sandboxId: string;
  previewUrl: string;
  timeoutMs?: number;
}) {
  return apiPost<{
    success: boolean;
    active: boolean;
    reachable: boolean;
    sandboxId: string;
    previewUrl: string;
    statusCode: number;
    diagnostics: Record<string, unknown>;
    reason: string | null;
  }>('/preview-health', body, 'previewHealth');
}

export async function reportPreviewError(body: {
  error: string;
  file?: string;
  type?: string;
  sandboxId: string;
}) {
  return apiPost<{ success: boolean; error: { type: string; message: string; file: string; timestamp: string } }>('/report-preview-error', body, 'reportPreviewError');
}

export async function applyPreviewInlineText(body: {
  sandboxId: string;
  relativePath: string;
  lineNumber: number;
  oldText: string;
  newText: string;
  context?: string | null | Record<string, unknown>;
}) {
  return apiPost<{ success: boolean; path: string }>('/preview-inline-text', body as Record<string, unknown>, 'applyPreviewInlineText');
}

export async function checkPreviewErrors() {
  return apiGet<{ success: boolean; hasErrors: boolean; errors: unknown[]; storage: string }>('/check-preview-errors', 'checkPreviewErrors');
}

// ─── User / Profile / API Key APIs ──────────────────────────────────────

export async function getSession() {
  return safeFetchJson<{ user: Record<string, unknown> }>(
    backendApiUrl('/api/auth/session'),
    { method: 'GET' },
    'getSession'
  );
}

export async function getAiWebsiteApiKey() {
  return apiGet<{ ok: boolean; hasApiKey: boolean; keyPreview: string | null }>('/ai-website-api-key', 'getAiWebsiteApiKey');
}

export async function updateAiWebsiteApiKey(apiKey: string) {
  return apiPut<{
    ok: boolean;
    hasApiKey: boolean;
    keyPreview: string;
    validated: boolean;
    validationWarning: string | null;
  }>('/ai-website-api-key', { api_key: apiKey }, 'updateAiWebsiteApiKey');
}

export async function deleteAiWebsiteApiKey() {
  return apiDelete<{ ok: boolean; hasApiKey: boolean; keyPreview: string | null }>('/ai-website-api-key', undefined, 'deleteAiWebsiteApiKey');
}

// ─── LLM provider keys ──────────────────────────────────────────────────

export interface LlmProviderInfo {
  id: string;
  label: string;
  keySiteUrl: string;
  models: string[];
}

export interface ProviderKeyView {
  provider: string;
  keyPreview: string;
}

export interface ProviderKeysState {
  ok: boolean;
  activeProvider: string | null;
  keys: ProviderKeyView[];
}

export async function getLlmProviders() {
  return apiGet<{ ok: boolean; providers: LlmProviderInfo[] }>('/llm-providers', 'getLlmProviders');
}

export async function getProviderKeys() {
  return apiGet<ProviderKeysState>('/provider-keys', 'getProviderKeys');
}

export async function saveProviderKey(provider: string, apiKey: string) {
  return apiPut<{
    ok: boolean;
    provider: string;
    keyPreview: string;
    activeProvider: string | null;
    validated: boolean;
    validationWarning: string | null;
  }>(`/provider-keys/${provider}`, { api_key: apiKey }, 'saveProviderKey');
}

export async function deleteProviderKey(provider: string) {
  return apiDelete<{ ok: boolean; provider: string; activeProvider: string | null }>(`/provider-keys/${provider}`, undefined, 'deleteProviderKey');
}

export async function setActiveProvider(provider: string) {
  return apiPut<{ ok: boolean; activeProvider: string }>('/provider-keys-active', { provider }, 'setActiveProvider');
}

export async function requestPasswordReset(body: {
  email: string;
  redirectTo?: string;
}) {
  return apiPost<{ success: boolean; message: string }>('/reset', body, 'requestPasswordReset');
}

export async function loadProfile() {
  return apiGet<{
    profile: {
      id: string;
      email: string;
      full_name: string | null;
      phone: string | null;
      avatar_url: string | null;
      subscribed: boolean;
      subscription_type: string | null;
      created_at: string;
      updated_at: string;
    };
    subscription: {
      plan: string;
      plan_label: string;
      billing_interval: string;
      status: string;
      price_id: string;
      price_display: string;
    } | null;
  }>('/profile', 'loadProfile');
}

export async function saveProfile(fields: {
  full_name?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
}) {
  return apiPatch<{ ok: boolean }>('/profile', fields, 'saveProfile');
}

// ─── Conversation APIs ──────────────────────────────────────────────────

export async function getConversationState(state?: string) {
  const qs = state ? `?state=${encodeURIComponent(state)}` : '';
  return apiGet<{ state: string; userId: string }>(`/conversation-state${qs}`, 'getConversationState');
}

export async function updateConversationState(body: {
  action: string;
  state?: Record<string, unknown>;
}) {
  return apiPost<{ state: Record<string, unknown>; cleared: boolean; userId: string }>(
    '/conversation-state',
    body,
    'updateConversationState'
  );
}

export async function clearConversationState() {
  return apiDelete<{ state: Record<string, unknown>; cleared: boolean }>(
    '/conversation-state',
    undefined,
    'clearConversationState'
  );
}

export async function resetConversationState(state?: Record<string, unknown>) {
  return updateConversationState({ action: 'reset', state });
}

// ─── Billing APIs ───────────────────────────────────────────────────────

export async function createCheckoutSession(body: {
  priceId: string;
  billingMode: string;
  successUrl: string;
  cancelUrl: string;
}) {
  return apiPost<{ url: string }>('/checkout', body, 'createCheckoutSession');
}

export async function getBillingPortal(body: { returnUrl: string }) {
  return apiPost<{ url: string; error?: string }>('/billing/portal', body, 'getBillingPortal');
}

export async function syncCheckoutSession(body: {
  sessionId: string;
  transactionId?: string;
}) {
  return apiPost<{ ok: boolean }>('/billing/sync-checkout-session', body, 'syncCheckoutSession');
}

// ─── Plans / entitlements ─────────────────────────────────────────────────

export type PlanFeatureId =
  | 'github_push'
  | 'db_integration'
  | 'deploy'
  | 'custom_domain'
  | 'templates';

export interface PlanLimits {
  generationsPerMonth: number | null;
  /** Lifetime generation cap, never reset. null = no lifetime cap. */
  generationsLifetime: number | null;
  sandboxSecondsPerMonth: number | null;
  maxProjects: number | null;
}

export interface Entitlements {
  ok: boolean;
  plan: 'trial' | 'basic' | 'standard' | 'pro';
  planLabel: string;
  features: PlanFeatureId[];
  limits: PlanLimits;
  usage: { generations: number; sandboxSeconds: number; projects: number };
}

export interface BillingPlan {
  id: 'basic' | 'standard' | 'pro';
  label: string;
  priceMonthly: number;
  priceYearly: number;
  priceIdMonthly: string | null;
  priceIdYearly: string | null;
  features: { id: PlanFeatureId; label: string; requiredPlan: string }[];
  limits: PlanLimits;
}

export interface PlanLimitError {
  code: 'PLAN_LIMIT';
  feature: PlanFeatureId | null;
  quota: 'generations' | 'sandbox_hours' | 'projects' | null;
  requiredPlan: 'basic' | 'standard' | 'pro';
  message: string;
}

/** Extract a PLAN_LIMIT payload from a failed SafeFetchResult, if present. */
export function extractPlanLimitError(result: { ok: boolean; data?: unknown }): PlanLimitError | null {
  if (result.ok) return null;
  const data = result.data as Record<string, unknown> | undefined;
  if (data && data.code === 'PLAN_LIMIT') {
    return data as unknown as PlanLimitError;
  }
  return null;
}

export async function getEntitlements() {
  return apiGet<Entitlements>('/entitlements', 'getEntitlements');
}

export async function getBillingPlans() {
  return apiGet<{
    ok: boolean;
    trial: { id: 'trial'; label: string; priceMonthly: number; priceYearly: number; features: []; limits: PlanLimits };
    plans: BillingPlan[];
  }>('/billing/plans', 'getBillingPlans');
}

// ─── Integration APIs ───────────────────────────────────────────────────

export async function getVercelStatus(params: { deploymentUuid: string; appUuid: string }) {
  return apiGet<{
    success: boolean;
    app?: { status?: string; domains?: string[] };
    latestDeployment?: { status?: string; commit_message?: string; finished_at?: string };
  }>(
    `/vercel/status?deploymentUuid=${encodeURIComponent(params.deploymentUuid)}&appUuid=${encodeURIComponent(params.appUuid)}`,
    'getVercelStatus'
  );
}

export async function checkVercelDomain(domain: string, projectId?: string) {
  const qs = new URLSearchParams();
  qs.set('domain', domain);
  if (projectId) qs.set('projectId', projectId);
  return apiGet<{ success: boolean; available: boolean; message: string; conflictProjectName: string | null }>(
    `/vercel/check-domain?${qs.toString()}`,
    'checkVercelDomain'
  );
}

export async function deployToVercel(body: {
  repoUrl: string;
  projectName: string;
  frontendDomain?: string;
  projectId?: string;
}) {
  const { frontendDomain, ...rest } = body;
  return apiPost<{
    ok: boolean;
    appUuid: string;
    deploymentUuid: string;
    domainUrl: string;
    isUpdate: boolean;
    requestId: string;
  }>(
    '/vercel/deploy',
    { ...rest, customDomain: frontendDomain },
    'deployToVercel'
  );
}

export async function getPocketbaseTemplate() {
  return apiGet<{
    success: boolean;
    schema: Record<string, unknown>;
    sdkSource: string;
    files: Array<{ path: string; content: string }>;
    fileCount: number;
  }>('/pocketbase/template', 'getPocketbaseTemplate');
}

export async function preparePocketbaseDeploy(body: {
  projectName: string;
  domain: string;
  pbSubdomainPrefix?: string;
  category?: string;
}) {
  return apiPost<{
    success: boolean;
    frontendUrl: string;
    pocketbaseUrl: string;
    adminUrl: string;
    adminEmail: string;
    adminPassword: string;
    files: Array<{ path: string; content: string }>;
    fileCount: number;
  }>('/pocketbase/prepare-deploy', body, 'preparePocketbaseDeploy');
}

export async function getSandboxPocketbaseInfo(sandboxId: string) {
  return apiGet<{
    success: boolean;
    url: string | null;
    adminUrl: string | null;
    adminEmail: string | null;
    adminPassword: string | null;
    message?: string;
  }>(`/get-sandbox-pocketbase-info?sandboxId=${encodeURIComponent(sandboxId)}`, 'getSandboxPocketbaseInfo');
}

export async function pushToGithub(
  body: {
    repoName: string;
    files: Array<{ path: string; content: string }>;
    aiWebsiteProjectId?: string;
  },
  signal?: AbortSignal
) {
  return apiPost<{
    ok: boolean;
    repoUrl: string;
    uploaded: number;
    requestId: string;
  }>('/github/push', body, 'pushToGithub', signal);
}

export async function getGithubStatus() {
  return apiGet<{ connected: boolean }>('/github/status', 'getGithubStatus');
}

export async function cloneRepo(sandboxId: string, repoUrl: string) {
  return apiPost<{
    success: boolean;
    files: Record<string, string>;
    structure: string;
    fileCount: number;
  }>('/e2b/clone-repo', { sandboxId, repoUrl }, 'cloneRepo');
}

export async function terminateSandbox(sandboxId: string) {
  return apiPost<{ success: boolean; sandboxKilled: boolean }>('/e2b/terminate', { sandboxId }, 'terminateSandbox');
}

// ─── User-Supabase Integration APIs ─────────────────────────────────────

export async function connectUserSupabase(sandboxId: string, body: {
  supabaseUrl: string;
  supabaseAnonKey: string;
}) {
  return apiPost<{ success: boolean; message: string }>(
    `/integrations/user-supabase/connect?sandboxId=${encodeURIComponent(sandboxId)}`,
    body,
    'connectUserSupabase'
  );
}

export async function getUserSupabaseStatus(sandboxId: string) {
  return apiGet<{ connected: boolean; supabaseUrl: string }>(
    `/integrations/user-supabase/status?sandboxId=${encodeURIComponent(sandboxId)}`,
    'getUserSupabaseStatus'
  );
}

export async function disconnectUserSupabase(sandboxId: string) {
  return apiPost<{ success: boolean; message: string }>(
    `/integrations/user-supabase/disconnect?sandboxId=${encodeURIComponent(sandboxId)}`,
    undefined,
    'disconnectUserSupabase'
  );
}

// ─── Utility APIs ───────────────────────────────────────────────────────

export async function getScreenshot(url: string) {
  return safeFetchBlob(
    apiUrl(`/screenshot?url=${encodeURIComponent(url)}`),
    { method: 'GET' },
    'getScreenshot',
    false // no auth required
  );
}

export async function search() {
  return apiPost<{ results: unknown[]; message: string }>('/search', undefined, 'search');
}

// ─── System APIs ────────────────────────────────────────────────────────

export async function healthCheck() {
  return safeFetchJson<{ status: string; version: string }>(backendApiUrl('/health'), { method: 'GET' }, 'healthCheck', false);
}

export async function liveCheck() {
  return safeFetchJson<{ status: string }>(backendApiUrl('/live'), { method: 'GET' }, 'liveCheck', false);
}

export async function readyCheck() {
  return safeFetchJson<{ status: string; redis: boolean }>(backendApiUrl('/ready'), { method: 'GET' }, 'readyCheck', false);
}

// ─── Raw streaming / blob APIs ──────────────────────────────────────────

export async function createZip(body: {
  sandboxId: string;
  projectId: string;
  projectName: string;
}) {
  return apiPost<{
    success: boolean;
    downloadUrl: string;
    fileName: string;
    message: string;
  }>('/create-zip', body, 'createZip');
}

export async function createZipRaw(body: {
  sandboxId?: string;
  projectName?: string;
  projectId?: string | null;
}) {
  return fetch(apiUrl('/create-zip'), withAuthInit({
    method: 'POST',
    body: JSON.stringify(body),
  }));
}

// ─── Sandbox Renew ──────────────────────────────────────────────────────

export async function renewSandbox(sandboxId: string) {
  // Renewal is always a migration (file copy + npm install + dev server)
  // which can take several minutes — give the request a matching timeout.
  return apiPost<{
    success: boolean;
    error?: string;
    oldSandboxId?: string;
    newSandboxId?: string;
    url?: string;
    createdAt?: string;
    endAt?: string;
    filesMigrated?: number;
    /** True when the old sandbox was already gone and nothing could be migrated. */
    sourceGone?: boolean;
    durationMs?: number;
  }>('/sandbox-renew', { sandboxId }, 'renewSandbox', undefined, 10 * 60 * 1000);
}
