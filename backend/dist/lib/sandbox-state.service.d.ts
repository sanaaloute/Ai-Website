import { RedisService } from './redis.service';
export interface SandboxInfo {
    createdAt: string;
    endAt: string;
    renewing?: boolean;
    renewingSince?: number;
    userId?: string;
    packageJsonHash?: string;
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
    touchSandbox(sandboxId: string): Promise<void>;
    getSandboxLastSeen(sandboxId: string): Promise<number | null>;
    addUserSandbox(userId: string, sandboxId: string): Promise<void>;
    listUserSandboxes(userId: string): Promise<string[]>;
    removeUserSandbox(userId: string, sandboxId: string): Promise<void>;
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
    setPackageJsonHash(sandboxId: string, hash: string): Promise<void>;
    getPackageJsonHash(sandboxId: string): Promise<string | undefined>;
    clearPackageJsonHash(sandboxId: string): Promise<void>;
}
