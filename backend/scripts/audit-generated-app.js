#!/usr/bin/env node
/**
 * Audit a generated LoveCode React app for integration/routing issues.
 * Run from the root of the generated project (where package.json lives).
 *
 * Example:
 *   node /path/to/backend-nestjs/scripts/audit-generated-app.js
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'src');
const ROUTES_FILE = path.join(SRC, 'lib', 'routes.ts');

const issues = [];

function read(p) {
  try {
    return fs.readFileSync(p, 'utf-8');
  } catch {
    return null;
  }
}

function walk(dir, ext, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, ext, out);
    } else if (entry.isFile() && full.endsWith(ext)) {
      out.push(full);
    }
  }
  return out;
}

function addIssue(msg) {
  issues.push(msg);
  console.log(`  ❌ ${msg}`);
}

function ok(msg) {
  console.log(`  ✅ ${msg}`);
}

function main() {
  console.log('🔍 Auditing generated app...\n');

  // 1. routes.ts exists
  if (!fs.existsSync(ROUTES_FILE)) {
    addIssue('src/lib/routes.ts is missing. Multi-page apps must define routes here.');
    printSummary();
    return;
  }
  ok('src/lib/routes.ts exists');

  const routesContent = read(ROUTES_FILE);
  const appContent = read(path.join(SRC, 'App.tsx')) || '';

  // 2. App.tsx is a thin router
  if (!appContent.includes("from '@/lib/routes'") && !appContent.includes('from "@/lib/routes"')) {
    addIssue('App.tsx does not import from @/lib/routes.');
  } else {
    ok('App.tsx imports from @/lib/routes');
  }

  if (!appContent.includes('routes.map') && !appContent.includes('pageComponents')) {
    addIssue('App.tsx does not appear to render routes from the route manifest.');
  } else {
    ok('App.tsx renders routes from the route manifest');
  }

  // 3. No inline page components in App.tsx
  const inlineFunctionMatches = appContent.match(/function\s+(?!App\b)[A-Z]\w*\s*\(/g) || [];
  if (inlineFunctionMatches.length > 0) {
    addIssue(
      `App.tsx contains inline component(s): ${inlineFunctionMatches.join(', ')}. Pages must live in src/pages/*.tsx.`,
    );
  } else {
    ok('App.tsx has no inline page components');
  }

  // 4. Extract route entries from routes.ts (multiline objects)
  const pageRefs = [...routesContent.matchAll(/page:\s*['"`]([^'"`]+)['"`]/g)].map((m) => m[1]);
  const navLabels = [];
  const navPaths = [];
  const navMatches = routesContent.matchAll(
    /\{\s*path:\s*['"`]([^'"`]+)['"`],\s*page:\s*['"`]([^'"`]+)['"`],\s*label:\s*['"`]([^'"`]+)['"`],\s*showInNav:\s*true\s*\}/gs,
  );
  for (const m of navMatches) {
    navPaths.push(m[1]);
    navLabels.push(m[3]);
  }

  // 5. Every page file is routed
  const pageFiles = walk(path.join(SRC, 'pages'), '.tsx');
  const pageNames = pageFiles.map((f) => path.basename(f, '.tsx'));
  for (const name of pageNames) {
    if (!pageRefs.includes(name)) {
      addIssue(`src/pages/${name}.tsx exists but is not wired into src/lib/routes.ts.`);
    } else {
      ok(`src/pages/${name}.tsx is routed`);
    }
  }

  // 6. Page exports are default exports
  for (const file of pageFiles) {
    const content = read(file) || '';
    if (!/export\s+default\s+/.test(content)) {
      addIssue(`${path.relative(ROOT, file)} is missing a default export. Page components must be default exports.`);
    }
  }
  if (pageFiles.length > 0) ok('All page components use default exports');

  // 7. Section exports are named exports
  const sectionFiles = walk(path.join(SRC, 'components', 'sections'), '.tsx');
  for (const file of sectionFiles) {
    const content = read(file) || '';
    if (/export\s+default\s+/.test(content)) {
      addIssue(
        `${path.relative(ROOT, file)} uses a default export. Section/feature components must use named exports.`,
      );
    }
  }
  if (sectionFiles.length > 0) ok('All section components use named exports');

  // 8. Sections are imported somewhere
  const allSrcFiles = walk(SRC, '.tsx').concat(walk(SRC, '.ts'));
  for (const file of sectionFiles) {
    const name = path.basename(file, '.tsx');
    const used = allSrcFiles.some((f) => f !== file && read(f).includes(name));
    if (!used) {
      addIssue(`${path.relative(ROOT, file)} (${name}) is never imported or used.`);
    } else {
      ok(`${path.relative(ROOT, file)} is used`);
    }
  }

  // 9. No window.location usage for routing
  const locationHits = [];
  for (const file of allSrcFiles) {
    const content = read(file) || '';
    if (/window\.location/.test(content)) {
      locationHits.push(path.relative(ROOT, file));
    }
  }
  if (locationHits.length > 0) {
    addIssue(`window.location found in: ${locationHits.join(', ')}. Use useParams/useSearchParams/useNavigate instead.`);
  } else {
    ok('No window.location usage for routing');
  }

  // 10. Navigation covers all showInNav routes
  const navFiles = [
    path.join(SRC, 'components', 'layout', 'Header.tsx'),
    path.join(SRC, 'components', 'layout', 'Navigation.tsx'),
  ];
  const navContent = navFiles.map(read).join('\n');
  for (let i = 0; i < navLabels.length; i++) {
    const label = navLabels[i];
    const href = navPaths[i];
    if (!navContent.includes(label) && !navContent.includes(href)) {
      addIssue(`Navigation is missing link for route "${label}" (${href}).`);
    } else {
      ok(`Navigation links to "${label}" (${href})`);
    }
  }

  // 11. Preview handshake check
  const indexHtml = read(path.join(ROOT, 'index.html')) || '';
  const mainTsx = read(path.join(SRC, 'main.tsx')) || '';
  if (!mainTsx.includes('LOVECODE_PREVIEW_READY') || !mainTsx.includes('window.parent.postMessage')) {
    addIssue('src/main.tsx does not post LOVECODE_PREVIEW_READY to the parent window after mounting.');
  } else {
    ok('src/main.tsx posts LOVECODE_PREVIEW_READY');
  }
  if (!indexHtml.includes('window.__lovecodePreviewReady = false') || !indexHtml.includes('LOVECODE_PREVIEW_ERROR')) {
    addIssue('index.html is missing the blank-page safety script that reports LOVECODE_PREVIEW_ERROR.');
  } else {
    ok('index.html has blank-page safety script');
  }

  // 12. TypeScript compile check (only if TypeScript is installed locally)
  const tsInstalled = fs.existsSync(path.join(ROOT, 'node_modules', 'typescript'));
  if (!tsInstalled) {
    console.log('  ⚠️  Skipping tsc --noEmit (TypeScript not installed in node_modules)');
  } else {
    const tscResult = spawnSync('npx', ['tsc', '--noEmit'], {
      cwd: ROOT,
      stdio: 'pipe',
      shell: true,
    });
    if (tscResult.status !== 0) {
      const stderr = tscResult.stderr?.toString() || '';
      const stdout = tscResult.stdout?.toString() || '';
      addIssue(`TypeScript compile failed:\n${(stdout || stderr).trim()}`);
    } else {
      ok('TypeScript compiles with tsc --noEmit');
    }
  }

  printSummary();
}

function printSummary() {
  console.log('\n─────────────────────────────');
  if (issues.length === 0) {
    console.log('🎉 Audit passed — no critical integration issues found.');
    process.exit(0);
  } else {
    console.log(`⚠️  Audit failed with ${issues.length} critical issue(s).`);
    process.exit(1);
  }
}

main();
