import { Test } from '@nestjs/testing';
import { DatabaseSeederService } from './database-seeder.service';
import { E2BService } from '@/lib/e2b.service';

jest.mock('@/lib/e2b.service', () => ({
  E2BService: class MockE2BService {},
}));

const mockE2BService = {
  detectFramework: jest.fn(),
  getPocketbaseInfo: jest.fn(),
  reconfigurePocketbaseForCategory: jest.fn(),
};

describe('DatabaseSeederService', () => {
  let service: DatabaseSeederService;
  let fetchSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        DatabaseSeederService,
        { provide: E2BService, useValue: mockE2BService },
      ],
    }).compile();

    service = module.get(DatabaseSeederService);

    mockE2BService.detectFramework.mockReset();
    mockE2BService.detectFramework.mockResolvedValue('vite');
    mockE2BService.getPocketbaseInfo.mockReset();
    mockE2BService.reconfigurePocketbaseForCategory.mockReset();

    fetchSpy = jest.spyOn(global, 'fetch').mockImplementation(async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = input.toString();
      const method = init?.method?.toUpperCase() || 'GET';
      if (url.includes('/api/admins/auth-with-password')) {
        return { ok: true, json: async () => ({ token: 'admin-token' }) } as Response;
      }
      if (url.includes('/api/collections?') && method === 'GET') {
        return {
          ok: true,
          json: async () => ({ items: [{ id: 'cat123', name: 'categories', type: 'base' }] }),
        } as Response;
      }
      if (url.includes('/api/collections') && method === 'POST') {
        return { ok: true, json: async () => ({ id: 'created' }) } as Response;
      }
      if (url.includes('/records?perPage=1')) {
        return { ok: true, json: async () => ({ totalItems: 0 }) } as Response;
      }
      if (url.includes('/records') && method === 'POST') {
        return { ok: true, json: async () => ({ id: 'created' }) } as Response;
      }
      return { ok: true, json: async () => ({}) } as Response;
    });
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('returns not ready when PocketBase info is missing', async () => {
    mockE2BService.getPocketbaseInfo.mockResolvedValue(null);
    const status = await service.verifyAndSeed('sandbox-1', 'ecommerce', {});
    expect(status.checked).toBe(true);
    expect(status.allExist).toBe(true);
    expect(status.dataAvailable).toBe(false);
  });

  it('verifies collections and creates missing collections from schema', async () => {
    mockE2BService.getPocketbaseInfo.mockResolvedValue({
      url: 'https://pb.example.com',
      adminEmail: 'admin@example.com',
      adminPassword: 'admin',
    });

    let createCollectionCalled = false;
    let collectionListCall = 0;

    fetchSpy.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = input.toString();
      const method = init?.method?.toUpperCase() || 'GET';
      if (url.includes('/api/admins/auth-with-password')) {
        return { ok: true, json: async () => ({ token: 'admin-token' }) } as Response;
      }
      if (url.includes('/api/collections?') && method === 'GET') {
        collectionListCall += 1;
        return {
          ok: true,
          json: async () => ({
            items: collectionListCall === 1 ? [] : [
              { id: 'cat123', name: 'categories', type: 'base' },
              { id: 'set123', name: 'settings', type: 'base' },
            ],
          }),
        } as Response;
      }
      if (url.includes('/api/collections') && method === 'POST') {
        createCollectionCalled = true;
        return { ok: true, json: async () => ({ id: 'created' }) } as Response;
      }
      if (url.includes('/records?perPage=1')) {
        return { ok: true, json: async () => ({ totalItems: 0 }) } as Response;
      }
      if (url.includes('/api/collections') && method === 'PATCH') {
        return { ok: true, json: async () => ({}) } as Response;
      }
      return { ok: true, json: async () => ({}) } as Response;
    });

    const status = await service.verifyAndSeed('sandbox-1', 'generic', {
      collections: [
        { name: 'categories', type: 'base', schema: [{ name: 'name', type: 'text', required: true }] },
        { name: 'settings', type: 'base', schema: [{ name: 'name', type: 'text', required: true }] },
      ],
    });

    expect(createCollectionCalled).toBe(true);
    expect(status.allExist).toBe(true);
    expect(status.collections.some((c) => c.name === 'categories')).toBe(true);
    expect(status.collections.some((c) => c.name === 'settings')).toBe(true);
  });

  it('reconfigures PocketBase when collections are missing and no schema exists', async () => {
    mockE2BService.getPocketbaseInfo.mockResolvedValue({
      url: 'https://pb.example.com',
      adminEmail: 'admin@example.com',
      adminPassword: 'admin',
    });
    mockE2BService.reconfigurePocketbaseForCategory.mockResolvedValue({
      url: 'https://pb.example.com',
      adminEmail: 'admin@example.com',
      adminPassword: 'admin',
    });

    let listCall = 0;
    fetchSpy.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = input.toString();
      const method = init?.method?.toUpperCase() || 'GET';
      if (url.includes('/api/admins/auth-with-password')) {
        return { ok: true, json: async () => ({ token: 'admin-token' }) } as Response;
      }
      if (url.includes('/api/collections?') && method === 'GET') {
        listCall++;
        return {
          ok: true,
          json: async () => ({
            items: listCall === 1 ? [] : [{ id: 'cat123', name: 'categories', type: 'base' }],
          }),
        } as Response;
      }
      if (url.includes('/api/collections') && method === 'POST') {
        return { ok: true, json: async () => ({ id: 'created' }) } as Response;
      }
      if (url.includes('/records?perPage=1')) {
        return { ok: true, json: async () => ({ totalItems: 0 }) } as Response;
      }
      return { ok: true, json: async () => ({}) } as Response;
    });

    const status = await service.verifyAndSeed('sandbox-1', 'generic', undefined);

    expect(mockE2BService.reconfigurePocketbaseForCategory).toHaveBeenCalledWith('sandbox-1', 'generic');
    expect(status.allExist).toBe(false);
    expect(status.collections.length).toBe(3);
    expect(status.collections.map((c) => c.name)).toEqual(['pages', 'contacts', 'settings']);
  });
});
