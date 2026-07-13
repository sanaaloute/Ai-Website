import { RedisService } from './redis.service';
export interface SandboxInfo {
    createdAt: string;
    endAt: string;
    renewing?: boolean;
    userId?: string;
}
export interface PocketbaseInfo {
    url: string;
    adminEmail: string;
    adminPassword: string;
}
export declare class SandboxStateService {
    private readonly redis;
    private readonly logger;
    constructor(redis: RedisService);
    private get redisClient();
    private key;
    private setJson;
    private getJson;
    setSandboxInfo(sandboxId: string, info: SandboxInfo): Promise<void>;
    getSandboxInfo(sandboxId: string): Promise<SandboxInfo | null>;
    deleteSandboxInfo(sandboxId: string): Promise<void>;
    setChain(oldId: string, newId: string): Promise<void>;
    getChain(sandboxId: string): Promise<string | null>;
    getCurrentSandboxId(sandboxId: string): Promise<string>;
    setPocketbaseInfo(sandboxId: string, info: PocketbaseInfo): Promise<void>;
    getPocketbaseInfo(sandboxId: string): Promise<PocketbaseInfo | null>;
    deletePocketbaseInfo(sandboxId: string): Promise<void>;
    listSandboxInfos(): Promise<Array<{
        sandboxId: string;
        info: SandboxInfo;
    }>>;
    acquireRenewalLock(sandboxId: string, ttlSeconds?: number): Promise<boolean>;
    releaseRenewalLock(sandboxId: string): Promise<void>;
    clearSandboxState(sandboxId: string): Promise<void>;
}
