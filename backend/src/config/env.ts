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
  aiReflectionModel: string;

  e2bApiKey: string;
  sandboxProvider: string;
  projectsDbPath: string;

  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;

  stripeSecretKey: string;
  stripeWebhookSecret: string;
  stripePrices: Record<string, string | undefined>;

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
}

export function buildEnv(): Env {
  const supabaseUrl = requireEnv('SUPABASE_URL', ['NEXT_PUBLIC_SUPABASE_URL']);
  const supabaseAnonKey = getEnv('SUPABASE_ANON_KEY', ['NEXT_PUBLIC_SUPABASE_ANON_KEY']) ?? '';
  const supabaseServiceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  const e2bApiKey = requireEnv('E2B_API_KEY');
  // Stripe is OPTIONAL: when the keys are absent the app boots with billing
  // disabled (StripeService already stubs checkout/portal/webhook when
  // unconfigured). Set STRIPE_SECRET_KEY (+ STRIPE_WEBHOOK_SECRET) to enable.
  const stripeSecretKey = getEnv('STRIPE_SECRET_KEY') ?? '';
  const stripeWebhookSecret = getEnv('STRIPE_WEBHOOK_SECRET') ?? '';
  if (!stripeSecretKey) logger.warn('Stripe disabled: STRIPE_SECRET_KEY not set (billing off)');

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
  const stripePrices: Record<string, string | undefined> = {};
  for (const key of priceKeys) {
    stripePrices[key] = getEnv(`STRIPE_PRICE_${key}`, [`NEXT_PUBLIC_STRIPE_PRICE_${key}`]);
  }

  return {
    nodeEnv: getEnv('NODE_ENV') ?? 'development',
    port: parseInt(getEnv('PORT') ?? getEnv('APP_PORT') ?? '4000', 10),
    host: getEnv('APP_HOST') ?? '0.0.0.0',
    frontendOrigin: getEnv('FRONTEND_ORIGIN') ?? getEnv('CORS_ORIGINS') ?? getEnv('APP_URL') ?? 'http://localhost:3000',
    corsCredentials: (getEnv('CORS_CREDENTIALS') ?? 'true') === 'true',
    appUrl: getEnv('APP_URL', ['NEXT_PUBLIC_APP_URL']) ?? 'http://localhost:3000',
    siteUrl: getEnv('SITE_URL', ['APP_URL', 'NEXT_PUBLIC_APP_URL']) ?? 'http://localhost:3000',
    aiWebsiteApiKeySiteUrl: getEnv('AI_WEBSITE_API_KEY_SITE_URL', ['NEXT_PUBLIC_AI_WEBSITE_API_KEY_SITE_URL']) ?? 'https://api.gitcc.com/dashboard/overview',

    aiBaseUrl: getEnv('AI_BASE_URL') ?? 'https://api.gitcc.com/v1',
    aiApiKey: getEnv('AI_API_KEY', ['NEW_API_KEY']) ?? '',
    aiDefaultModel: getEnv('AI_DEFAULT_MODEL') ?? 'gpt-5.4',
    aiReflectionModel: getEnv('AI_REFLECTION_MODEL') ?? 'qwen-max',

    e2bApiKey,
    sandboxProvider: getEnv('SANDBOX_PROVIDER') ?? 'e2b',
    projectsDbPath: getEnv('PROJECTS_DB_PATH') ?? './data/projects.db',

    supabaseUrl,
    supabaseAnonKey,
    supabaseServiceRoleKey,

    stripeSecretKey,
    stripeWebhookSecret,
    stripePrices,

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
