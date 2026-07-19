import { readdirSync } from 'fs';
import * as path from 'path';
import { PromptLoaderService } from './prompt-loader.service';

describe('PromptLoaderService', () => {
  const service = new PromptLoaderService();
  const promptFiles = readdirSync(path.resolve(process.cwd(), 'src/prompts'))
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.replace(/\.md$/, ''));

  it('loads every prompt file present in src/prompts', async () => {
    expect(promptFiles.length).toBeGreaterThan(0);
    for (const name of promptFiles) {
      const content = await service.load(name);
      expect(content.length).toBeGreaterThan(0);
    }
  });

  it('has a fallback for every prompt file (graph survives a missing file)', () => {
    for (const name of promptFiles) {
      expect(service.listAvailable()).toContain(name);
    }
  });

  it('has no fallbacks for prompts that do not exist as files (no dead prompts)', () => {
    for (const key of service.listAvailable()) {
      expect(promptFiles).toContain(key);
    }
  });

  it('throws for unknown prompts', async () => {
    await expect(service.load('does-not-exist')).rejects.toThrow('Unknown prompt');
  });
});
