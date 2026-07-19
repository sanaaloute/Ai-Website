import { ModelResolverService } from './model-resolver.service';
import { resetEnvCache } from '@/config/env';

const REQUIRED_ENV: Record<string, string> = {
  SUPABASE_URL: 'http://localhost',
  SUPABASE_SERVICE_ROLE_KEY: 'test-key',
  E2B_API_KEY: 'test-key',
  REDIS_URL: 'redis://localhost:6379',
};

const AI_ENV_KEYS = [
  'AI_ALLOWED_MODELS',
  'AI_DEFAULT_MODEL',
  'AI_MODEL_REASONING',
  'AI_MODEL_CODE',
  'AI_MODEL_REVIEW',
  'AI_MODEL_FAST',
];

describe('ModelResolverService', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv, ...REQUIRED_ENV };
    for (const key of AI_ENV_KEYS) delete process.env[key];
    resetEnvCache();
  });

  afterAll(() => {
    process.env = originalEnv;
    resetEnvCache();
  });

  it('defaults to the built-in allowlist with role-specific primaries', () => {
    const resolver = new ModelResolverService();
    expect(resolver.resolveSequence('executor')).toEqual(['kimi-k2.5', 'qwen-max']);
    expect(resolver.resolveSequence('seo_meta')).toEqual(['qwen-max', 'kimi-k2.5']);
    expect(resolver.resolveSequence('planner')).toEqual(['kimi-k2.5', 'qwen-max']);
  });

  it('honors AI_ALLOWED_MODELS and per-role primaries', () => {
    process.env.AI_ALLOWED_MODELS = 'a,b,c';
    process.env.AI_MODEL_CODE = 'c';
    resetEnvCache();
    const resolver = new ModelResolverService();
    expect(resolver.resolveSequence('executor')).toEqual(['c', 'a', 'b']);
    // fast role primary (default qwen-max) is filtered out — not in allowlist
    expect(resolver.resolveSequence('seo_meta')).toEqual(['a', 'b', 'c']);
  });

  it('drops AI_DEFAULT_MODEL outside the allowlist (loudly, not silently)', () => {
    process.env.AI_DEFAULT_MODEL = 'gpt-4o';
    resetEnvCache();
    const resolver = new ModelResolverService();
    expect(resolver.resolveSequence('planner')).toEqual(['kimi-k2.5', 'qwen-max']);
  });

  it('isAllowedModel uses the env allowlist', () => {
    process.env.AI_ALLOWED_MODELS = 'x';
    resetEnvCache();
    const resolver = new ModelResolverService();
    expect(resolver.isAllowedModel('x')).toBe(true);
    expect(resolver.isAllowedModel('kimi-k2.5')).toBe(false);
    expect(resolver.isAllowedModel(undefined)).toBe(false);
  });
});
