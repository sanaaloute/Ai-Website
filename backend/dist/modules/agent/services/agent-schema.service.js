"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AgentSchemaService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentSchemaService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../lib/prisma.service");
const REQUIRED_TABLES = [
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
let AgentSchemaService = AgentSchemaService_1 = class AgentSchemaService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(AgentSchemaService_1.name);
    }
    async onModuleInit() {
        await this.verifySchema();
    }
    async verifySchema() {
        const errors = [];
        for (const table of REQUIRED_TABLES) {
            try {
                const rows = await this.prisma.$queryRaw `
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
                    errors.push(`Table "${table.name}" is missing columns: ${missing.join(', ')}. ` +
                        `Run backend-nestjs/agent_memory_schema.sql in the Supabase SQL editor (it drops and recreates the tables; do not run it if you need to keep existing data).`);
                }
            }
            catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                errors.push(`Unexpected error verifying "${table.name}": ${msg}`);
            }
        }
        if (errors.length) {
            this.logger.error('Agent persistence schema verification failed:');
            for (const err of errors)
                this.logger.error(`  - ${err}`);
            return { ok: false, errors };
        }
        this.logger.log('Agent persistence schema verification passed.');
        return { ok: true, errors: [] };
    }
};
exports.AgentSchemaService = AgentSchemaService;
exports.AgentSchemaService = AgentSchemaService = AgentSchemaService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AgentSchemaService);
//# sourceMappingURL=agent-schema.service.js.map