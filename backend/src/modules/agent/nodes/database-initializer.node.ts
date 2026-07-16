import { AgentState } from '../state';
import { GraphDependencies } from '../graph';
import { withTransientRetry } from '@/lib/e2b.service';

export async function databaseInitializerNode(state: AgentState, deps: GraphDependencies): Promise<Partial<AgentState>> {
  const category = state.websiteCategory || 'generic';
  const workflow = state.workflow || 'new_app';

  // Only verify/seeds for flows that are backed by a database (PocketBase).
  const shouldInitialize =
    !!state.needsIntegration ||
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
      data: { status: 'analyzing', message: `Verifying PocketBase collections for ${category}...` },
    });

    const status = await withTransientRetry(
      'verifyAndSeed',
      () =>
        deps.databaseSeeder.verifyAndSeed(
          state.sandboxId,
          category,
          state.dbSchemaTemplate,
        ),
      deps.logger,
    );

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
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const name = e instanceof Error ? e.name : 'UnknownError';
    deps.logger.error(
      `Database initializer failed: [${name}] ${message}${e instanceof Error && e.stack ? `\n${e.stack}` : ''}`,
    );
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
