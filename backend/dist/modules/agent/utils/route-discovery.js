"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.discoverRoutes = discoverRoutes;
exports.readRoutes = readRoutes;
function discoverRoutes(source, needsIntegration) {
    const routes = [];
    const pathRegex = /path\s*[:=]\s*['"`]([^'"`]+)['"`]/g;
    let match;
    while ((match = pathRegex.exec(source)) !== null) {
        const routePath = match[1];
        if (routePath && !routes.includes(routePath)) {
            routes.push(routePath);
        }
    }
    if (routes.length === 0) {
        routes.push('/');
        if (needsIntegration) {
            routes.push('/admin');
        }
    }
    return routes;
}
const PAGE_FILE_RE = /^src\/app\/(.+\/)?page\.(tsx|ts|jsx|js)$/;
function pageFileToRoute(file) {
    if (file.startsWith('src/app/api/'))
        return null;
    if (!PAGE_FILE_RE.test(file))
        return null;
    let p = file
        .replace(/^src\/app\//, '')
        .replace(/\/page\.(tsx|ts|jsx|js)$/, '')
        .replace(/^page\.(tsx|ts|jsx|js)$/, '');
    if (!p)
        return '/';
    p = p
        .split('/')
        .filter((seg) => !(seg.startsWith('(') && seg.endsWith(')')))
        .join('/');
    return '/' + p;
}
async function readRoutes(e2b, sandboxId) {
    let framework = 'vite';
    try {
        framework = await e2b.detectFramework(sandboxId);
    }
    catch {
        framework = 'vite';
    }
    if (framework === 'next') {
        try {
            const res = await e2b.runCommand(sandboxId, "find src/app -type f \\( -name 'page.tsx' -o -name 'page.ts' -o -name 'page.jsx' -o -name 'page.js' \\) 2>/dev/null | sort");
            const files = res.output.split('\n').map((l) => l.trim()).filter(Boolean);
            const routes = [];
            for (const file of files) {
                const route = pageFileToRoute(file);
                if (route && !routes.includes(route))
                    routes.push(route);
            }
            if (routes.length) {
                return routes.map((r) => `path: '${r}'`).join('\n');
            }
        }
        catch {
        }
    }
    try {
        const content = await e2b.readFile(sandboxId, 'src/lib/routes.ts');
        if (content)
            return content;
    }
    catch {
    }
    try {
        const appContent = await e2b.readFile(sandboxId, 'src/App.tsx');
        if (appContent)
            return appContent;
    }
    catch {
    }
    return '';
}
//# sourceMappingURL=route-discovery.js.map