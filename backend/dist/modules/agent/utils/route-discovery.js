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
        if (needsIntegration === 'pocketbase') {
            routes.push('/admin');
        }
    }
    return routes;
}
async function readRoutes(e2b, sandboxId) {
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