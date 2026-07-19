import { normalizeFilePath, FileManifest } from './file-manifest';
import { shellQuote } from './shell';

// file-manifest imports FORBIDDEN_PATH_PREFIXES from e2b.service, which pulls
// in the ESM-only e2b package; mock it like graph.spec.ts does.
jest.mock('@/lib/e2b.service', () => ({
  FORBIDDEN_PATH_PREFIXES: ['node_modules/', '.git/', '.next/', 'dist/', '.agent_state/'],
}));

describe('normalizeFilePath', () => {
  it('keeps normal relative paths', () => {
    expect(normalizeFilePath('src/App.tsx')).toBe('src/App.tsx');
    expect(normalizeFilePath('./src/App.tsx')).toBe('src/App.tsx');
  });

  it('strips the workspace prefix', () => {
    expect(normalizeFilePath('/home/user/app/src/App.tsx')).toBe('src/App.tsx');
  });

  it('clamps absolute paths into the workspace', () => {
    expect(normalizeFilePath('/etc/passwd')).toBe('etc/passwd');
  });

  it('collapses inner dot segments', () => {
    expect(normalizeFilePath('src/components/../App.tsx')).toBe('src/App.tsx');
  });

  it.each([
    '../package.json',
    '../../etc/passwd',
    'src/../../etc/passwd',
    '..',
    '/home/user/app/../secret',
  ])('throws on traversal: %s', (p) => {
    expect(() => normalizeFilePath(p)).toThrow(/escapes the workspace/);
  });
});

describe('FileManifest.isProtected', () => {
  it('protects scaffold files', () => {
    const manifest = new FileManifest();
    expect(manifest.isProtected('package.json')).toBe(true);
    expect(manifest.isProtected('/home/user/app/package.json')).toBe(true);
    expect(manifest.isProtected('src/App.tsx')).toBe(false);
  });
});

describe('shellQuote', () => {
  it('wraps in single quotes', () => {
    expect(shellQuote('*.ts')).toBe(`'*.ts'`);
  });

  it('neutralizes shell metacharacters', () => {
    expect(shellQuote('x; rm -rf /')).toBe(`'x; rm -rf /'`);
    expect(shellQuote('$(whoami)')).toBe(`'$(whoami)'`);
    expect(shellQuote('`id`')).toBe('`id`'.replace(/^/, `'`).replace(/$/, `'`));
  });

  it('escapes embedded single quotes', () => {
    expect(shellQuote("it's")).toBe(`'it'\\''s'`);
  });
});
