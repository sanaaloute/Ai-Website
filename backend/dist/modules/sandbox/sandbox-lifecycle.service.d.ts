import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { E2BService } from "../../lib/e2b.service";
import { EntitlementsService } from "../billing/entitlements.service";
export declare class SandboxLifecycleService implements OnModuleInit, OnModuleDestroy {
    private readonly e2b;
    private readonly entitlements;
    private readonly logger;
    private interval;
    constructor(e2b: E2BService, entitlements: EntitlementsService);
    onModuleInit(): void;
    onModuleDestroy(): void;
    private checkRenewals;
}
