"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.databaseInitializerNode = databaseInitializerNode;
const e2b_service_1 = require("../../../lib/e2b.service");
async function databaseInitializerNode(state, deps) {
    const category = state.websiteCategory || 'generic';
    const workflow = state.workflow || 'new_app';
    const shouldInitialize = !!state.needsIntegration ||
        workflow === 'new_app' ||
        (state.dbSchemaTemplate && Object.keys(state.dbSchemaTemplate).length > 0);
    if (!shouldInitialize) {
        return {
            databaseReady: true,
            databaseStatus: {
                checked: true,
                collections: [],
                allExist: true,
                dataAvailable: false,
                message: 'No database integration required; skipping initializer.',
            },
            messages: [{ role: 'assistant', content: 'No database integration required' }],
        };
    }
    try {
        await deps.emit({
            type: 'status',
            data: { status: 'analyzing', message: `Verifying ${state.framework === 'next' ? 'Prisma tables' : 'PocketBase collections'} for ${category}...` },
        });
        const status = await (0, e2b_service_1.withTransientRetry)('verifyAndSeed', () => deps.databaseSeeder.verifyAndSeed(state.sandboxId, category, state.dbSchemaTemplate), deps.logger);
        const message = status.message;
        await deps.emit({
            type: 'status',
            data: { status: 'analyzing', message },
        });
        return {
            databaseStatus: status,
            databaseReady: status.allExist,
            messages: [{ role: 'assistant', content: message }],
        };
    }
    catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        const name = e instanceof Error ? e.name : 'UnknownError';
        deps.logger.error(`Database initializer failed: [${name}] ${message}${e instanceof Error && e.stack ? `\n${e.stack}` : ''}`);
        return {
            databaseReady: false,
            databaseStatus: {
                checked: true,
                collections: [],
                allExist: false,
                dataAvailable: false,
                message: `Database initializer failed: ${message}`,
            },
            messages: [{ role: 'assistant', content: `Database initializer error: ${message}` }],
        };
    }
}
//# sourceMappingURL=database-initializer.node.js.map