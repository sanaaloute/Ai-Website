import { Logger } from '@nestjs/common';

const logger = new Logger('EnvConfig');

function getEnv(name: string, aliases: string[] = []): string | undefined {
  const candidates = [name, ...aliases];
  for (const key of candidates) {
    const value = process.env[key];
    if (value !== undefined && value !== '') return value;
  }
  return undefined;
}

function requireEnv(name: string, aliases: string[] = []): string {
  const value = getEnv(name, aliases);
  if (!value) {
    logger.error(`Missing required environment variable: ${name}${aliases.length ? ` (aliases: ${aliases.join(', ')})` : ''}`);
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export interface Env {
  nodeEnv: string;
  port: number;
  host: string;
  frontendOrigin: string;
  corsCredentials: boolean;
  appUrl: string;
  siteUrl: string;
  aiWebsiteApiKeySiteUrl: string;

  aiBaseUrl: string;
  aiApiKey: string;
  aiDefaultModel: string;
  /** Models the agent runtime may use (comma-separated in AI_ALLOWED_MODELS). */
  aiAllowedModels: string[];
  /** Primary model per agent role; must be in aiAllowedModels to take effect. */
  aiModelReasoning: string;
  aiModelCode: string;
  aiModelReview: string;
  aiModelFast: string;
  /** Abort a streaming LLM call when no SSE chunk arrives for this long. */
  aiStreamIdleTimeoutMs: number;
  /** Hard ceiling for one streaming LLM call (including in-stream tool runs). */
  aiStreamTotalTimeoutMs: number;
  /** Hard ceiling for one agent generation job (enforced in the worker). */
  agentJobTimeoutMs: number;

  /** Retries per failed graph node before giving up (wrapNode). */
  agentMaxNodeAttempts: number;
  /** LangGraph recursion limit for one run. */
  agentRecursionLimit: number;
  /** BullMQ worker concurrency (also read directly from process.env at decorator time). */
  agentWorkerConcurrency: number;
  /** Per-user concurrent generation cap. */
  agentMaxConcurrentGenerations: number;
  /** Per-user enqueue cap per minute. */
  agentMaxEnqueuesPerMinute: number;

  /** Hard cap on characters of a single tool result fed back to the model. */
  agentToolResultMaxChars: number;

  /** Sampling temperature per agent role. */
  aiTempReasoning: number;
  aiTempCode: number;
  aiTempReview: number;
  aiTempFast: number;
  /** Optional max_tokens for LLM responses (provider default when unset). */
  aiMaxTokens?: number;

  e2bApiKey: string;

  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;

  paddleApiKey: string;
  paddleWebhookSecret: string;
  paddleEnvironment: 'sandbox' | 'production';
  paddlePrices: Record<string, string | undefined>;

  githubClientId: string;
  githubClientSecret: string;
  githubRedirectUri: string;
  githubCookieDomain: string;

  vercelToken: string;
  vercelTeamId: string;
  vercelDefaultDomain: string;

  // Deployment target: 'vercel' (managed) or self-hosted ('docker' | 'coolify')
  deployProvider: 'vercel' | 'docker' | 'coolify';
  deployBaseDomain: string;
  deployWorkspaceDir: string;
  siteNetwork: string;
  siteCpuLimit: string;
  siteMemoryLimit: string;
  siteBuildTimeoutSeconds: number;
  dockerSocket: string;
  coolifyUrl: string;
  coolifyToken: string;

  morphApiKey: string;

  adminJwtSecret: string;
  adminJwtAlgorithm: string;
  adminJwtExpiryMinutes: number;
  adminRegistrationSecret: string;

  tokenEncryptionKey?: string;

  redisUrl: string;

  accessTokenCookieName: string;
  refreshTokenCookieName: string;
  adminTokenCookieName: string;
  cookieDomain?: string;
  cookieSameSite: 'strict' | 'lax' | 'none';
  cookieSecure: boolean;

  context7ApiKey?: string;
  mcpDocsEnabled: boolean;
  mcpDocsCacheTtlSeconds: number;

  // Template marketplace
  templatesDir?: string;
  templateRepo: string;
  templateRepoRef: string;
  githubToken?: string;
}

export function buildEnv(): Env {
  const supabaseUrl = requireEnv('SUPABASE_URL', ['NEXT_PUBLIC_SUPABASE_URL']);
  const supabaseAnonKey = getEnv('SUPABASE_ANON_KEY', ['NEXT_PUBLIC_SUPABASE_ANON_KEY']) ?? '';
  const supabaseServiceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  const e2bApiKey = requireEnv('E2B_API_KEY');
  // Paddle is OPTIONAL: when the keys are absent the app boots with billing
  // disabled (PaddleService already stubs checkout/portal/webhook when
  // unconfigured). Set PADDLE_API_KEY (+ PADDLE_WEBHOOK_SECRET) to enable.
  const paddleApiKey = getEnv('PADDLE_API_KEY') ?? '';
  const paddleWebhookSecret = getEnv('PADDLE_WEBHOOK_SECRET') ?? '';
  const paddleEnvironment = (getEnv('PADDLE_ENVIRONMENT') ?? 'sandbox') as 'sandbox' | 'production';
  if (!paddleApiKey) logger.warn('Paddle disabled: PADDLE_API_KEY not set (billing off)');

  const redisUrl = requireEnv('REDIS_URL');

  const vercelToken = getEnv('VERCEL_TOKEN');
  const vercelTeamId = getEnv('VERCEL_TEAM_ID') ?? '';

  const deployProvider = (getEnv('DEPLOY_PROVIDER') ?? 'vercel') as Env['deployProvider'];
  if (deployProvider === 'vercel') {
    if (vercelToken) logger.log('Deploy provider: vercel (enabled)');
    else logger.warn('Deploy provider: vercel (disabled: missing VERCEL_TOKEN)');
  } else if (deployProvider === 'docker') {
    logger.log(`Deploy provider: docker (self-hosted, base domain ${getEnv('DEPLOY_BASE_DOMAIN') ?? 'localhost'})`);
  } else if (deployProvider === 'coolify') {
    const ok = getEnv('COOLIFY_URL') && getEnv('COOLIFY_TOKEN');
    logger.log(`Deploy provider: coolify (${ok ? 'enabled' : 'disabled: missing COOLIFY_URL/COOLIFY_TOKEN'})`);
  }

  const priceKeys = [
    'BASIC_MONTHLY', 'BASIC_YEARLY', 'BASIC_ONETIME', 'BASIC_ONE_TIME',
    'STANDARD_MONTHLY', 'STANDARD_YEARLY', 'STANDARD_ONETIME', 'STANDARD_ONE_TIME',
    'PRO_MONTHLY', 'PRO_YEARLY', 'PRO_ONETIME', 'PRO_ONE_TIME',
  ];
  const paddlePrices: Record<string, string | undefined> = {};
  for (const key of priceKeys) {
    paddlePrices[key] = getEnv(`PADDLE_PRICE_${key}`, [`NEXT_PUBLIC_PADDLE_PRICE_${key}`]);
  }

  return {
    nodeEnv: getEnv('NODE_ENV') ?? 'development',
    port: parseInt(getEnv('PORT') ?? getEnv('APP_PORT') ?? '4000', 10),
    host: getEnv('APP_HOST') ?? '0.0.0.0',
    frontendOrigin: getEnv('FRONTEND_ORIGIN') ?? getEnv('CORS_ORIGINS') ?? getEnv('APP_URL') ?? 'http://localhost:3000',
    corsCredentials: (getEnv('CORS_CREDENTIALS') ?? 'true') === 'true',
    appUrl: getEnv('APP_URL', ['NEXT_PUBLIC_APP_URL']) ?? 'http://localhost:3000',
    siteUrl: getEnv('SITE_URL', ['APP_URL', 'NEXT_PUBLIC_APP_URL']) ?? 'http://localhost:3000',
    aiWebsiteApiKeySiteUrl: getEnv('AI_WEBSITE_API_KEY_SITE_URL', ['NEXT_PUBLIC_AI_WEBSITE_API_KEY_SITE_URL']) ?? 'https://www.tokenfree.com',

    aiBaseUrl: getEnv('AI_BASE_URL') ?? 'https://www.tokenfree.com/v1',
    aiApiKey: getEnv('AI_API_KEY', ['NEW_API_KEY']) ?? '',
    aiDefaultModel: getEnv('AI_DEFAULT_MODEL') ?? 'qwen-max',
    aiAllowedModels: (getEnv('AI_ALLOWED_MODELS') ?? 'kimi-k2.5,qwen-max')
      .split(',')
      .map((m) => m.trim())
      .filter(Boolean),
    aiModelReasoning: getEnv('AI_MODEL_REASONING') ?? 'kimi-k2.5',
    aiModelCode: getEnv('AI_MODEL_CODE') ?? 'kimi-k2.5',
    aiModelReview: getEnv('AI_MODEL_REVIEW') ?? 'kimi-k2.5',
    aiModelFast: getEnv('AI_MODEL_FAST') ?? 'qwen-max',
    aiStreamIdleTimeoutMs: parseInt(getEnv('AI_STREAM_IDLE_TIMEOUT_MS') ?? '120000', 10),
    aiStreamTotalTimeoutMs: parseInt(getEnv('AI_STREAM_TOTAL_TIMEOUT_MS') ?? '1200000', 10),
    agentJobTimeoutMs: parseInt(getEnv('AGENT_JOB_TIMEOUT_MS') ?? '1800000', 10),

    agentMaxNodeAttempts: parseInt(getEnv('AGENT_MAX_NODE_ATTEMPTS') ?? '3', 10),
    agentRecursionLimit: parseInt(getEnv('AGENT_RECURSION_LIMIT') ?? '50', 10),
    agentWorkerConcurrency: parseInt(getEnv('AGENT_WORKER_CONCURRENCY') ?? '4', 10),
    agentMaxConcurrentGenerations: parseInt(getEnv('AGENT_MAX_CONCURRENT_GENERATIONS') ?? '2', 10),
    agentMaxEnqueuesPerMinute: parseInt(getEnv('AGENT_MAX_ENQUEUES_PER_MINUTE') ?? '10', 10),
    agentToolResultMaxChars: parseInt(getEnv('AGENT_TOOL_RESULT_MAX_CHARS') ?? '20000', 10),

    aiTempReasoning: parseFloat(getEnv('AI_TEMP_REASONING') ?? '0.3'),
    aiTempCode: parseFloat(getEnv('AI_TEMP_CODE') ?? '0.3'),
    aiTempReview: parseFloat(getEnv('AI_TEMP_REVIEW') ?? '0.2'),
    aiTempFast: parseFloat(getEnv('AI_TEMP_FAST') ?? '0.7'),
    aiMaxTokens: getEnv('AI_MAX_TOKENS') ? parseInt(getEnv('AI_MAX_TOKENS')!, 10) : undefined,

    e2bApiKey,

    supabaseUrl,
    supabaseAnonKey,
    supabaseServiceRoleKey,

    paddleApiKey,
    paddleWebhookSecret,
    paddleEnvironment,
    paddlePrices,

    githubClientId: getEnv('GITHUB_CLIENT_ID', ['NEXT_PUBLIC_GITHUB_APP_ID']) ?? '',
    githubClientSecret: getEnv('GITHUB_CLIENT_SECRET', ['NEXT_PUBLIC_GITHUB_APP_SECRET']) ?? '',
    githubRedirectUri: getEnv('GITHUB_REDIRECT_URI') ?? 'http://localhost:3000/api/github/callback',
    githubCookieDomain: getEnv('GITHUB_COOKIE_DOMAIN') ?? 'localhost',

    vercelToken: vercelToken ?? '',
    vercelTeamId,
    vercelDefaultDomain: getEnv('VERCEL_DEFAULT_DOMAIN') ?? 'vercel.app',

    deployProvider,
    deployBaseDomain: getEnv('DEPLOY_BASE_DOMAIN') ?? 'localhost',
    deployWorkspaceDir: getEnv('DEPLOY_WORKSPACE_DIR') ?? '/var/lib/ai-website/sites',
    siteNetwork: getEnv('SITE_NETWORK') ?? 'aiwebsite_web',
    siteCpuLimit: getEnv('SITE_CPU_LIMIT') ?? '1.0',
    siteMemoryLimit: getEnv('SITE_MEMORY_LIMIT') ?? '512m',
    siteBuildTimeoutSeconds: parseInt(getEnv('SITE_BUILD_TIMEOUT_SECONDS') ?? '600', 10),
    dockerSocket: getEnv('DOCKER_SOCKET') ?? '/var/run/docker.sock',
    coolifyUrl: getEnv('COOLIFY_URL') ?? '',
    coolifyToken: getEnv('COOLIFY_TOKEN') ?? '',

    morphApiKey: getEnv('MORPH_API_KEY') ?? '',

    adminJwtSecret: getEnv('ADMIN_JWT_SECRET') ?? 'change-me-in-production',
    adminJwtAlgorithm: getEnv('ADMIN_JWT_ALGORITHM') ?? 'HS256',
    adminJwtExpiryMinutes: parseInt(getEnv('ADMIN_JWT_EXPIRY_MINUTES') ?? '1440', 10),
    adminRegistrationSecret: getEnv('ADMIN_REGISTRATION_SECRET') ?? '',

    tokenEncryptionKey: getEnv('TOKEN_ENCRYPTION_KEY'),

    redisUrl,

    accessTokenCookieName: getEnv('ACCESS_TOKEN_COOKIE_NAME') ?? 'lc_access_token',
    refreshTokenCookieName: getEnv('REFRESH_TOKEN_COOKIE_NAME') ?? 'lc_refresh_token',
    adminTokenCookieName: getEnv('ADMIN_TOKEN_COOKIE_NAME') ?? 'lc_admin_token',
    cookieDomain: getEnv('COOKIE_DOMAIN'),
    cookieSameSite: (getEnv('COOKIE_SAME_SITE') ?? 'lax') as 'strict' | 'lax' | 'none',
    cookieSecure: (getEnv('COOKIE_SECURE') ?? 'false') === 'true',

    context7ApiKey: getEnv('CONTEXT7_API_KEY'),
    mcpDocsEnabled: (getEnv('MCP_DOCS_ENABLED') ?? 'true') === 'true',
    mcpDocsCacheTtlSeconds: parseInt(getEnv('MCP_DOCS_CACHE_TTL_SECONDS') ?? '3600', 10),

    templatesDir: getEnv('TEMPLATES_DIR'),
    templateRepo: getEnv('TEMPLATE_REPO') ?? '',
    templateRepoRef: getEnv('TEMPLATE_REPO_REF') ?? 'main',
    githubToken: getEnv('GITHUB_TOKEN'),
  };
}

let cachedEnv: Env | null = null;

export function env(): Env {
  if (!cachedEnv) {
    cachedEnv = buildEnv();
  }
  return cachedEnv;
}

export function resetEnvCache(): void {
  cachedEnv = null;
}
