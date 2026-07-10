import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { E2BService } from "../../lib/e2b.service";
export declare class SandboxLifecycleService implements OnModuleInit, OnModuleDestroy {
    private readonly e2b;
    private readonly logger;
    private interval;
    constructor(e2b: E2BService);
    onModuleInit(): void;
    onModuleDestroy(): void;
    private checkRenewals;
}
