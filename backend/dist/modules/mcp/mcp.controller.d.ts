import type { Request, Response } from 'express';
import { DocsMcpServerService } from './docs-mcp-server.service';
export declare class McpController {
    private readonly docsService;
    private readonly logger;
    private readonly transports;
    constructor(docsService: DocsMcpServerService);
    private createServer;
    sse(req: Request, res: Response): Promise<void>;
    messages(req: Request, res: Response, sessionId: string): Promise<void>;
}
