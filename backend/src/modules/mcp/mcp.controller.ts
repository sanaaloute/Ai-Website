import { Controller, Get, Post, Query, Req, Res, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { DocsMcpServerService } from './docs-mcp-server.service';

@Controller('api/mcp/docs')
export class McpController {
  private readonly logger = new Logger(McpController.name);
  private readonly transports = new Map<string, SSEServerTransport>();

  constructor(private readonly docsService: DocsMcpServerService) {}

  private createServer(): Server {
    const server = new Server(
      { name: 'lovecode-docs', version: '1.0.0' },
      { capabilities: { tools: {} } },
    );

    server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'context7_resolve_library',
          description: 'Resolve a library name to a Context7-compatible library ID.',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'The user task or question, used to rank library matches.' },
              libraryName: { type: 'string', description: 'The library name to resolve, e.g. "React" or "PocketBase".' },
            },
            required: ['query', 'libraryName'],
          },
        },
        {
          name: 'context7_query_docs',
          description: 'Fetch up-to-date documentation for a Context7 library ID and a specific query.',
          inputSchema: {
            type: 'object',
            properties: {
              libraryId: { type: 'string', description: 'A Context7-compatible library ID, e.g. /facebook/react.' },
              query: { type: 'string', description: 'The specific API or topic to look up.' },
              tokens: { type: 'number', description: 'Maximum tokens of documentation to retrieve (default 3000).' },
            },
            required: ['libraryId', 'query'],
          },
        },
        {
          name: 'framework_docs',
          description: 'Fetch up-to-date documentation for a supported framework (react, vite, node, pocketbase, playwright).',
          inputSchema: {
            type: 'object',
            properties: {
              framework: {
                type: 'string',
                enum: ['react', 'vite', 'node', 'nodejs', 'pocketbase', 'playwright'],
                description: 'Framework shorthand.',
              },
              query: { type: 'string', description: 'The specific API or topic to look up.' },
              tokens: { type: 'number', description: 'Maximum tokens of documentation to retrieve (default 3000).' },
            },
            required: ['framework', 'query'],
          },
        },
      ],
    }));

    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      try {
        let result: Awaited<ReturnType<DocsMcpServerService['resolveLibrary']>>;
        switch (name) {
          case 'context7_resolve_library':
            result = await this.docsService.resolveLibrary(args as { query: string; libraryName: string });
            break;
          case 'context7_query_docs':
            result = await this.docsService.queryDocs(args as { libraryId: string; query: string; tokens?: number });
            break;
          case 'framework_docs':
            result = await this.docsService.frameworkDocs(args as { framework: string; query: string; tokens?: number });
            break;
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
        return { content: result.content };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true };
      }
    });

    return server;
  }

  @Get('sse')
  async sse(@Req() req: Request, @Res() res: Response) {
    const server = this.createServer();
    const transport = new SSEServerTransport('/api/mcp/docs/messages', res as unknown as import('node:http').ServerResponse);

    this.transports.set(transport.sessionId, transport);

    transport.onclose = () => {
      this.transports.delete(transport.sessionId);
    };

    try {
      await transport.start();
      await server.connect(transport);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`MCP SSE connection failed: ${message}`);
      if (!res.writableEnded) {
        res.status(500).end();
      }
    }
  }

  @Post('messages')
  async messages(
    @Req() req: Request,
    @Res() res: Response,
    @Query('sessionId') sessionId: string,
  ) {
    const transport = this.transports.get(sessionId);
    if (!transport) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    try {
      await transport.handlePostMessage(
        req as unknown as import('node:http').IncomingMessage,
        res as unknown as import('node:http').ServerResponse,
        req.body,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`MCP message handling failed: ${message}`);
      if (!res.writableEnded) {
        res.status(500).json({ error: message });
      }
    }
  }
}
