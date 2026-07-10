import { Test } from '@nestjs/testing';
import { ShadcnMcpServerService } from './shadcn-mcp-server.service';
import { E2BService } from '@/lib/e2b.service';
import { resetEnvCache } from '@/config/env';

jest.mock('@/lib/e2b.service', () => ({
  E2BService: class MockE2BService {},
}));

const mockE2BService = {
  runCommand: jest.fn(),
};

describe('ShadcnMcpServerService', () => {
  let service: ShadcnMcpServerService;
  let fetchSpy: jest.SpyInstance;

  beforeEach(async () => {
    resetEnvCache();
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test';
    process.env.E2B_API_KEY = 'test';
    process.env.STRIPE_SECRET_KEY = 'test';
    process.env.STRIPE_WEBHOOK_SECRET = 'test';
    process.env.REDIS_URL = 'redis://localhost';

    const module = await Test.createTestingModule({
      providers: [
        ShadcnMcpServerService,
        { provide: E2BService, useValue: mockE2BService },
      ],
    }).compile();

    service = module.get(ShadcnMcpServerService);
    fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [
        { name: 'button', type: 'registry:ui', title: 'Button', description: 'A button component' },
        { name: 'dialog', type: 'registry:ui', title: 'Dialog', description: 'A dialog component' },
      ],
    } as unknown as Response);
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    resetEnvCache();
    jest.clearAllMocks();
  });

  it('searches the shadcn registry', async () => {
    const result = await service.searchRegistry({ query: 'button' });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].name).toBe('button');
    expect(fetchSpy).toHaveBeenCalledWith('https://ui.shadcn.com/r/index.json');
  });

  it('views a registry item', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ name: 'button', type: 'registry:ui', dependencies: ['@radix-ui/react-slot'] }),
    } as unknown as Response);

    const result = await service.viewItem({ name: 'button' });
    expect(result.name).toBe('button');
    expect(fetchSpy).toHaveBeenCalledWith('https://ui.shadcn.com/r/styles/new-york/button.json');
  });

  it('installs a registry item in a sandbox', async () => {
    mockE2BService.runCommand.mockResolvedValue({ exitCode: 0, output: 'installed', error: '' });
    const result = await service.installItem('sandbox-1', 'button');
    expect(result).toBe('installed');
    expect(mockE2BService.runCommand).toHaveBeenCalledWith(
      'sandbox-1',
      'npx shadcn@latest add -y -o button',
      '/home/user/app',
      { timeoutMs: 5 * 60 * 1000 },
    );
  });

  it('initializes shadcn in a sandbox', async () => {
    mockE2BService.runCommand.mockResolvedValue({ exitCode: 0, output: 'initialized', error: '' });
    const result = await service.initShadcn('sandbox-1', 'slate');
    expect(result).toBe('initialized');
    expect(mockE2BService.runCommand).toHaveBeenCalledWith(
      'sandbox-1',
      'npx shadcn@latest init -y -d --base-color slate',
      '/home/user/app',
      { timeoutMs: 5 * 60 * 1000 },
    );
  });
});
