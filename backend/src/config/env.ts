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
  lovecodeApiKeySiteUrl: string;

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

  gitccGitlabBaseUrl: string;
  gitccGitlabClientId: string;
  gitccGitlabClientSecret: string;
  gitccGitlabRedirectUri: string;
  gitccGitlabCookieDomain: string;

  openhostBaseUrl: string;
  openhostApiToken: string;
  openhostServerUuid: string;
  openhostProjectUuid: string;
  openhostPrivateKeyUuid: string;
  openhostEnvironmentName: string;
  openhostGitBranch: string;
  openhostPortsExposes: string;
  openhostBaseDomain: string;
  openhostPbSubdomainPrefix: string;

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
  const stripeSecretKey = requireEnv('STRIPE_SECRET_KEY');
  const stripeWebhookSecret = requireEnv('STRIPE_WEBHOOK_SECRET');

  const redisUrl = requireEnv('REDIS_URL');

  const openhostApiToken = getEnv('OPENHOST_API_TOKEN');
  const openhostServerUuid = getEnv('OPENHOST_SERVER_UUID');
  const openhostProjectUuid = getEnv('OPENHOST_PROJECT_UUID');
  const openhostBaseUrl = getEnv('OPENHOST_BASE_URL') ?? 'https://www.dpqq.com/api/v1';

  const deployEnabled = !!(openhostApiToken && openhostServerUuid && openhostProjectUuid);
  if (deployEnabled) {
    logger.log('OpenHost deploy integration enabled');
  } else {
    logger.warn('OpenHost deploy integration disabled: missing OPENHOST_API_TOKEN, OPENHOST_SERVER_UUID, or OPENHOST_PROJECT_UUID');
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
    lovecodeApiKeySiteUrl: getEnv('LOVECODE_API_KEY_SITE_URL', ['NEXT_PUBLIC_LOVECODE_API_KEY_SITE_URL']) ?? 'https://api.gitcc.com/dashboard/overview',

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

    gitccGitlabBaseUrl: getEnv('GITCC_GITLAB_BASE_URL') ?? 'https://www.gitcc.com',
    gitccGitlabClientId: getEnv('GITCC_GITLAB_CLIENT_ID', ['NEXT_PUBLIC_GITCC_APP_ID']) ?? '',
    gitccGitlabClientSecret: getEnv('GITCC_GITLAB_CLIENT_SECRET', ['NEXT_PUBLIC_GITCC_APP_SECRET']) ?? '',
    gitccGitlabRedirectUri: getEnv('GITCC_GITLAB_REDIRECT_URI') ?? 'http://localhost:3000/api/gitcc/gitlab/callback',
    gitccGitlabCookieDomain: getEnv('GITCC_GITLAB_COOKIE_DOMAIN') ?? 'localhost',

    openhostBaseUrl,
    openhostApiToken: openhostApiToken ?? '',
    openhostServerUuid: openhostServerUuid ?? '',
    openhostProjectUuid: openhostProjectUuid ?? '',
    openhostPrivateKeyUuid: getEnv('OPENHOST_PRIVATE_KEY_UUID') ?? '',
    openhostEnvironmentName: getEnv('OPENHOST_ENVIRONMENT_NAME') ?? 'production',
    openhostGitBranch: getEnv('OPENHOST_GIT_BRANCH') ?? 'main',
    openhostPortsExposes: getEnv('OPENHOST_PORTS_EXPOSES') ?? '3000',
    openhostBaseDomain: getEnv('OPENHOST_BASE_DOMAIN') ?? '',
    openhostPbSubdomainPrefix: getEnv('OPENHOST_PB_SUBDOMAIN_PREFIX') ?? 'pb',

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
