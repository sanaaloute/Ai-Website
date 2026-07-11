import { Test } from '@nestjs/testing';
import { DocsMcpServerService } from './docs-mcp-server.service';
import { resetEnvCache } from '@/config/env';

describe('DocsMcpServerService', () => {
  let service: DocsMcpServerService;
  let fetchSpy: jest.SpyInstance;

  beforeEach(async () => {
    resetEnvCache();
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test';
    process.env.E2B_API_KEY = 'test';
    process.env.STRIPE_SECRET_KEY = 'test';
    process.env.STRIPE_WEBHOOK_SECRET = 'test';
    process.env.REDIS_URL = 'redis://localhost';
    process.env.CONTEXT7_API_KEY = 'test-key';
    process.env.MCP_DOCS_ENABLED = 'true';
    process.env.MCP_DOCS_CACHE_TTL_SECONDS = '3600';

    const module = await Test.createTestingModule({
      providers: [DocsMcpServerService],
    }).compile();

    service = module.get(DocsMcpServerService);
    fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      text: async () => 'doc snippet',
      json: async () => ({ libraries: [{ id: '/react/react', name: 'React' }] }),
    } as unknown as Response);
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    resetEnvCache();
  });

  it('resolves a library via Context7', async () => {
    const result = await service.resolveLibrary({ query: 'hooks', libraryName: 'react' });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain('/react/react');
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('api.context7.com/v1/resolve'),
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer test-key' }) }),
    );
  });

  it('queries docs for a library ID', async () => {
    const result = await service.queryDocs({ libraryId: '/react/react', query: 'useEffect' });
    expect(result.content[0].text).toBe('doc snippet');
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('context7.com/api/v1/react/react'),
      expect.any(Object),
    );
  });

  it('maps framework shorthand to a library ID', async () => {
    const result = await service.frameworkDocs({ framework: 'react', query: 'useState' });
    expect(result.content[0].text).toBe('doc snippet');
  });

  it('caches repeated identical queries', async () => {
    await service.queryDocs({ libraryId: '/react/react', query: 'useEffect' });
    await service.queryDocs({ libraryId: '/react/react', query: 'useEffect' });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('returns an error for unknown frameworks', async () => {
    const result = await service.frameworkDocs({ framework: 'unknown', query: 'x' });
    expect(result.isError).toBe(true);
  });

  it('queries docs for shortcut libraries', async () => {
    const result = await service.shadcnDocs({ query: 'button variants' });
    expect(result.content[0].text).toBe('doc snippet');
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('context7.com/api/v1/shadcn-ui/ui'),
      expect.any(Object),
    );
  });

  it('returns an error for unknown shortcut keys', async () => {
    const result = await service.shortcutDocs('nonexistent', { query: 'x' });
    expect(result.isError).toBe(true);
  });
});
