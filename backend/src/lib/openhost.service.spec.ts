import { OpenhostService } from './openhost.service';

jest.mock('@/config/env', () => ({
  env: () => ({
    gitccGitlabBaseUrl: 'https://www.gitcc.com/gitcc/',
    openhostBaseUrl: 'https://openhost.example.com',
    openhostApiToken: 'token',
    openhostServerUuid: 'server',
    openhostProjectUuid: 'project',
    openhostGitBranch: 'main',
    openhostPortsExposes: '3000',
    openhostEnvironmentName: 'production',
    openhostPrivateKeyUuid: '',
    openhostPbSubdomainPrefix: 'pb',
    openhostBaseDomain: 'example.com',
  }),
}));

describe('OpenhostService', () => {
  it('prefixes a relative GitCC repo path with the configured base URL', () => {
    const service = new OpenhostService();

    const normalized = (service as unknown as { normalizeGitRepository(url: string, isSsh: boolean): string }).normalizeGitRepository(
      'elsone/wine-city.git',
      false,
    );

    expect(normalized).toBe('https://www.gitcc.com/gitcc/elsone/wine-city.git');
  });
});
