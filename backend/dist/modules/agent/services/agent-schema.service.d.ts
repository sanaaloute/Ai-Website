import { OnModuleInit } from '@nestjs/common';
import { PrismaService } from "../../../lib/prisma.service";
export declare class AgentSchemaService implements OnModuleInit {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    onModuleInit(): Promise<void>;
    verifySchema(): Promise<{
        ok: boolean;
        errors: string[];
    }>;
}
