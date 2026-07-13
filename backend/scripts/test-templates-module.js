/* Functional test for the templates module (runs against compiled dist/). */
const JSZip = require('jszip');
const assert = require('assert');

const {
  extractTemplateFromZip,
  TemplateFetchService,
} = require('../dist/modules/templates/template-fetch.service');
const {
  TemplateCatalogService,
} = require('../dist/modules/templates/template-catalog.service');

async function testZipExtraction() {
  const zip = new JSZip();
  const root = 'acme-Ai-Website-1a2b3c4/';
  // Template files
  zip.file(root + 'templates/b2b-saas/01-analytics-platform/package.json', '{"name":"tpl"}');
  zip.file(root + 'templates/b2b-saas/01-analytics-platform/lib/content.ts', 'export const x = 1;');
  zip.file(root + 'templates/b2b-saas/01-analytics-platform/app/globals.css', ':root{}');
  // Metadata must be excluded
  zip.file(root + 'templates/b2b-saas/01-analytics-platform/template.json', '{"id":"meta"}');
  // Files outside the template path must be excluded
  zip.file(root + 'templates/b2b-saas/index.json', '{"category":"b2b-saas"}');
  zip.file(root + 'templates/b2b-saas/02-crm-sales-pipeline/package.json', '{"name":"other"}');
  zip.file(root + 'backend/src/main.ts', 'bootstrap();');
  zip.file(root + 'README.md', '# repo');

  const buf = await zip.generateAsync({ type: 'nodebuffer' });
  const files = await extractTemplateFromZip(buf, 'templates/b2b-saas/01-analytics-platform');
  const keys = Object.keys(files).sort();
  assert.deepStrictEqual(keys, ['app/globals.css', 'lib/content.ts', 'package.json'], `unexpected keys: ${keys}`);
  assert.strictEqual(files['package.json'], '{"name":"tpl"}');
  console.log('✓ extractTemplateFromZip: only template files, metadata excluded, paths stripped');

  // Missing path must throw
  await assert.rejects(
    () => extractTemplateFromZip(buf, 'templates/does-not-exist'),
    /No files found/,
  );
  console.log('✓ extractTemplateFromZip: throws on missing path');
}

async function testFetchValidation() {
  const svc = new TemplateFetchService();
  await assert.rejects(
    () => svc.fetchTemplateFiles({ owner: 'a', repo: 'b', templatePath: '../etc' }),
    /Invalid template path/,
  );
  await assert.rejects(
    () => svc.fetchTemplateFiles({ owner: 'a', repo: 'b', templatePath: '' }),
    /Invalid template path/,
  );
  console.log('✓ TemplateFetchService: rejects path traversal / empty paths');
}

async function testCatalog() {
  const svc = new TemplateCatalogService();
  assert.strictEqual(svc.available, true, 'catalog should find repo-root templates/');
  console.log(`✓ TemplateCatalogService: available at ${svc.dir}`);

  const categories = await svc.listCategories();
  assert.strictEqual(categories.length, 1);
  assert.strictEqual(categories[0].category, 'b2b-saas');
  assert.strictEqual(categories[0].templates.length, 10);
  console.log('✓ listCategories: 1 category, 10 templates');

  // Find by directory name and by id
  const byPath = await svc.findTemplate('b2b-saas', '07-billing-invoicing');
  const byId = await svc.findTemplate('b2b-saas', 'b2b-saas-billing-invoicing');
  assert.ok(byPath && byId && byPath.id === byId.id);
  console.log(`✓ findTemplate: resolves dir name and id -> ${byId.id}`);

  // Traversal rejected
  assert.strictEqual(await svc.findTemplate('b2b-saas', '../etc'), null);
  assert.strictEqual(await svc.getCategory('../backend'), null);
  console.log('✓ catalog: rejects path traversal');

  // Local files collection
  const files = await svc.getLocalTemplateFiles('b2b-saas', '07-billing-invoicing');
  assert.ok(files);
  const keys = Object.keys(files);
  assert.ok(keys.includes('package.json'), 'has package.json');
  assert.ok(keys.includes('lib/content.ts'), 'has lib/content.ts');
  assert.ok(keys.includes('app/layout.tsx'), 'has app/layout.tsx');
  assert.ok(!keys.some((k) => k.includes('node_modules')), 'no node_modules');
  assert.ok(!keys.some((k) => k.startsWith('.next')), 'no .next');
  assert.ok(!keys.includes('template.json'), 'no template.json metadata');
  assert.ok(!keys.some((k) => k.includes('\\')), 'forward-slash paths only');
  console.log(`✓ getLocalTemplateFiles: ${keys.length} files, artifacts + metadata excluded`);
}

(async () => {
  await testZipExtraction();
  await testFetchValidation();
  await testCatalog();
  console.log('\nAll template module tests passed ✅');
})().catch((err) => {
  console.error('TEST FAILED:', err.message);
  process.exit(1);
});
