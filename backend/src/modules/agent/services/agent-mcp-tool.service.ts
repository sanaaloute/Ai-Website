import { Injectable } from '@nestjs/common';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { AgentContext } from '../types';
import {
  DocsMcpServerService,
  frameworkDocsSchema,
  queryDocsSchema,
  resolveLibrarySchema,
  singleFrameworkDocsSchema,
} from '@/modules/mcp/docs-mcp-server.service';
import {
  ShadcnMcpServerService,
  shadcnSearchSchema,
  shadcnViewSchema,
  shadcnInstallSchema,
  shadcnInitSchema,
} from '@/modules/mcp/shadcn-mcp-server.service';

@Injectable()
export class AgentMcpToolService {
  constructor(
    private readonly docs: DocsMcpServerService,
    private readonly shadcn: ShadcnMcpServerService,
  ) {}

  getTools(context?: AgentContext): DynamicStructuredTool[] {
    const sandbox = context?.sandboxProvider;

    const docsTools: DynamicStructuredTool[] = [
      new DynamicStructuredTool({
        name: 'docs_context7_resolve_library',
        description:
          'Resolve a library name to a Context7-compatible library ID. Use this when you need docs for a library but do not know its Context7 ID.',
        schema: resolveLibrarySchema,
        func: async (args) => {
          const result = await this.docs.resolveLibrary(args);
          return result.content.map((c) => c.text).join('\n');
        },
      }),
      new DynamicStructuredTool({
        name: 'docs_context7_query',
        description:
          'Fetch up-to-date documentation for a Context7 library ID and a specific query. Use this for precise API references and code examples.',
        schema: queryDocsSchema,
        func: async (args) => {
          const result = await this.docs.queryDocs(args);
          return result.content.map((c) => c.text).join('\n');
        },
      }),
      new DynamicStructuredTool({
        name: 'docs_framework',
        description:
          'Fetch up-to-date documentation for a supported framework (react, vite, node, pocketbase, playwright). Use this when you need framework-specific API details.',
        schema: frameworkDocsSchema,
        func: async (args) => {
          const result = await this.docs.frameworkDocs(args);
          return result.content.map((c) => c.text).join('\n');
        },
      }),
      new DynamicStructuredTool({
        name: 'docs_react',
        description: 'Fetch current React documentation for a specific API or pattern.',
        schema: singleFrameworkDocsSchema('React'),
        func: async (args) => {
          const result = await this.docs.reactDocs(args);
          return result.content.map((c) => c.text).join('\n');
        },
      }),
      new DynamicStructuredTool({
        name: 'docs_vite',
        description: 'Fetch current Vite documentation for a specific API or configuration topic.',
        schema: singleFrameworkDocsSchema('Vite'),
        func: async (args) => {
          const result = await this.docs.viteDocs(args);
          return result.content.map((c) => c.text).join('\n');
        },
      }),
      new DynamicStructuredTool({
        name: 'docs_node',
        description: 'Fetch current Node.js documentation for a specific API or topic.',
        schema: singleFrameworkDocsSchema('Node.js'),
        func: async (args) => {
          const result = await this.docs.nodeDocs(args);
          return result.content.map((c) => c.text).join('\n');
        },
      }),
      new DynamicStructuredTool({
        name: 'docs_pocketbase',
        description:
          'Fetch current PocketBase (JavaScript SDK) documentation for a specific API or topic.',
        schema: singleFrameworkDocsSchema('PocketBase'),
        func: async (args) => {
          const result = await this.docs.pocketbaseDocs(args);
          return result.content.map((c) => c.text).join('\n');
        },
      }),
      new DynamicStructuredTool({
        name: 'docs_playwright',
        description: 'Fetch current Playwright documentation for a specific API or testing topic.',
        schema: singleFrameworkDocsSchema('Playwright'),
        func: async (args) => {
          const result = await this.docs.playwrightDocs(args);
          return result.content.map((c) => c.text).join('\n');
        },
      }),
      new DynamicStructuredTool({
        name: 'docs_shadcn',
        description: 'Fetch current shadcn/ui documentation (components, theming, CLI). Use before writing or customizing shadcn components.',
        schema: singleFrameworkDocsSchema('shadcn/ui'),
        func: async (args) => {
          const result = await this.docs.shadcnDocs(args);
          return result.content.map((c) => c.text).join('\n');
        },
      }),
      new DynamicStructuredTool({
        name: 'docs_tailwind',
        description: 'Fetch current Tailwind CSS documentation (utility classes, configuration, responsive design).',
        schema: singleFrameworkDocsSchema('Tailwind CSS'),
        func: async (args) => {
          const result = await this.docs.tailwindDocs(args);
          return result.content.map((c) => c.text).join('\n');
        },
      }),
      new DynamicStructuredTool({
        name: 'docs_framer_motion',
        description: 'Fetch current Framer Motion documentation (variants, gestures, layout animations).',
        schema: singleFrameworkDocsSchema('Framer Motion'),
        func: async (args) => {
          const result = await this.docs.framerMotionDocs(args);
          return result.content.map((c) => c.text).join('\n');
        },
      }),
      new DynamicStructuredTool({
        name: 'docs_zod',
        description: 'Fetch current Zod documentation (schemas, validation, type inference).',
        schema: singleFrameworkDocsSchema('Zod'),
        func: async (args) => {
          const result = await this.docs.zodDocs(args);
          return result.content.map((c) => c.text).join('\n');
        },
      }),
      new DynamicStructuredTool({
        name: 'docs_react_hook_form',
        description: 'Fetch current React Hook Form documentation (register, controller, validation integration).',
        schema: singleFrameworkDocsSchema('React Hook Form'),
        func: async (args) => {
          const result = await this.docs.reactHookFormDocs(args);
          return result.content.map((c) => c.text).join('\n');
        },
      }),
      new DynamicStructuredTool({
        name: 'docs_supabase_js',
        description: 'Fetch current Supabase JavaScript client documentation (auth, queries, realtime).',
        schema: singleFrameworkDocsSchema('Supabase JS'),
        func: async (args) => {
          const result = await this.docs.supabaseJsDocs(args);
          return result.content.map((c) => c.text).join('\n');
        },
      }),
      new DynamicStructuredTool({
        name: 'docs_stripe',
        description: 'Fetch current Stripe.js documentation (elements, payment intents, checkout).',
        schema: singleFrameworkDocsSchema('Stripe.js'),
        func: async (args) => {
          const result = await this.docs.stripeDocs(args);
          return result.content.map((c) => c.text).join('\n');
        },
      }),
    ];

    const shadcnTools: DynamicStructuredTool[] = [
      new DynamicStructuredTool({
        name: 'shadcn_search',
        description: 'Search the shadcn/ui component registry for components, blocks, hooks, or templates matching a query.',
        schema: shadcnSearchSchema,
        func: async (args) => {
          const result = await this.shadcn.searchRegistry(args);
          return JSON.stringify(result, null, 2);
        },
      }),
      new DynamicStructuredTool({
        name: 'shadcn_view',
        description: 'View the full details of a shadcn/ui registry item (files, dependencies, registryDependencies).',
        schema: shadcnViewSchema,
        func: async (args) => {
          const result = await this.shadcn.viewItem(args);
          return JSON.stringify(result, null, 2);
        },
      }),
      new DynamicStructuredTool({
        name: 'shadcn_install',
        description: 'Install a shadcn/ui registry item into the current project sandbox (e.g., "button"). Requires a live sandbox.',
        schema: shadcnInstallSchema,
        func: async (args) => {
          if (!sandbox) {
            throw new Error('shadcn_install requires a sandbox context');
          }
          const result = await this.shadcn.installItem(sandbox.currentSandboxId, args.name);
          return result;
        },
      }),
      new DynamicStructuredTool({
        name: 'shadcn_init',
        description: 'Initialize shadcn/ui in the current project sandbox. Use before installing components if components.json is missing.',
        schema: shadcnInitSchema,
        func: async (args) => {
          if (!sandbox) {
            throw new Error('shadcn_init requires a sandbox context');
          }
          const result = await this.shadcn.initShadcn(sandbox.currentSandboxId, args.baseColor);
          return result;
        },
      }),
    ];

    return [...docsTools, ...shadcnTools];
  }
}
