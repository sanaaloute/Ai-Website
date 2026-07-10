import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '@/lib/prisma.service';

interface RequiredTable {
  name: string;
  columns: string[];
}

const REQUIRED_TABLES: RequiredTable[] = [
  {
    name: 'project_generations',
    columns: ['id', 'user_id', 'project_id', 'thread_id', 'status', 'started_at'],
  },
  {
    name: 'agent_checkpoints',
    columns: ['thread_id', 'checkpoint_ns', 'checkpoint_id', 'checkpoint', 'metadata', 'created_at'],
  },
  {
    name: 'agent_writes',
    columns: ['thread_id', 'checkpoint_ns', 'checkpoint_id', 'task_id', 'idx', 'channel', 'value'],
  },
  {
    name: 'agent_memories',
    columns: ['id', 'user_id', 'project_id', 'memory_type', 'content', 'created_at', 'updated_at'],
  },
];

@Injectable()
export class AgentSchemaService implements OnModuleInit {
  private readonly logger = new Logger(AgentSchemaService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.verifySchema();
  }

  async verifySchema(): Promise<{ ok: boolean; errors: string[] }> {
    const errors: string[] = [];

    for (const table of REQUIRED_TABLES) {
      try {
        const rows = await this.prisma.$queryRaw<Array<{ column_name: string }>>`
          SELECT column_name
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = ${table.name}
        `;

        if (!rows || rows.length === 0) {
          errors.push(`Table "${table.name}" is missing. Run backend-nestjs/agent_memory_schema.sql in Supabase.`);
          continue;
        }

        const existingColumns = new Set(rows.map((row) => row.column_name));
        const missing = table.columns.filter((col) => !existingColumns.has(col));
        if (missing.length) {
          errors.push(
            `Table "${table.name}" is missing columns: ${missing.join(', ')}. ` +
            `Run backend-nestjs/agent_memory_schema.sql in the Supabase SQL editor (it drops and recreates the tables; do not run it if you need to keep existing data).`,
          );
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`Unexpected error verifying "${table.name}": ${msg}`);
      }
    }

    if (errors.length) {
      this.logger.error('Agent persistence schema verification failed:');
      for (const err of errors) this.logger.error(`  - ${err}`);
      return { ok: false, errors };
    }

    this.logger.log('Agent persistence schema verification passed.');
    return { ok: true, errors: [] };
  }
}
