import { Module } from '@nestjs/common';
import { DocsMcpServerService } from './docs-mcp-server.service';
import { ShadcnMcpServerService } from './shadcn-mcp-server.service';
import { McpController } from './mcp.controller';

@Module({
  providers: [DocsMcpServerService, ShadcnMcpServerService],
  controllers: [McpController],
  exports: [DocsMcpServerService, ShadcnMcpServerService],
})
export class McpModule {}
