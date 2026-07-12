import { DynamicStructuredTool } from '@langchain/core/tools';
import { AgentContext } from '../types';
import { DocsMcpServerService } from "../../mcp/docs-mcp-server.service";
import { ShadcnMcpServerService } from "../../mcp/shadcn-mcp-server.service";
export declare class AgentMcpToolService {
    private readonly docs;
    private readonly shadcn;
    constructor(docs: DocsMcpServerService, shadcn: ShadcnMcpServerService);
    getTools(context?: AgentContext): DynamicStructuredTool[];
}
