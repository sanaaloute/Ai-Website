import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from './redis.service';

export interface SandboxInfo {
  createdAt: string;
  endAt: string;
  renewing?: boolean;
}

export interface PocketbaseInfo {
  url: string;
  adminEmail: string;
  adminPassword: string;
}

/**
 * Stores all sandbox metadata in Redis so the backend can be horizontally
 * scaled. Live E2B `Sandbox` objects remain in a local LRU cache inside
 * E2BService because they are not serializable, but all lifecycle, chain,
 * and PocketBase metadata is persisted here.
 */
@Injectable()
export class SandboxStateService {
  private readonly logger = new Logger(SandboxStateService.name);

  constructor(private readonly redis: RedisService) {}

  private get redisClient() {
    return this.redis.getClient();
  }

  private key(...parts: string[]) {
    return `sandbox:${parts.join(':')}`;
  }

  private async setJson(key: string, value: unknown, ttlSeconds = 86400): Promise<void> {
    await this.redisClient.setex(key, ttlSeconds, JSON.stringify(value));
  }

  private async getJson<T>(key: string): Promise<T | null> {
    const raw = await this.redisClient.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch (e) {
      this.logger.warn(`Failed to parse Redis key ${key}: ${e instanceof Error ? e.message : String(e)}`);
      return null;
    }
  }

  async setSandboxInfo(sandboxId: string, info: SandboxInfo): Promise<void> {
    await this.setJson(this.key(sandboxId, 'info'), info, 86400);
  }

  async getSandboxInfo(sandboxId: string): Promise<SandboxInfo | null> {
    return this.getJson<SandboxInfo>(this.key(sandboxId, 'info'));
  }

  async deleteSandboxInfo(sandboxId: string): Promise<void> {
    await this.redisClient.del(this.key(sandboxId, 'info'));
  }

  async setChain(oldId: string, newId: string): Promise<void> {
    await this.redisClient.setex(this.key(oldId, 'chain'), 86400, newId);
  }

  async getChain(sandboxId: string): Promise<string | null> {
    return this.redisClient.get(this.key(sandboxId, 'chain'));
  }

  /**
   * Follows the chain of renewed sandbox IDs to the currently active one.
   */
  async getCurrentSandboxId(sandboxId: string): Promise<string> {
    let current = sandboxId;
    const seen = new Set<string>();
    while (true) {
      if (seen.has(current)) break;
      seen.add(current);
      const next = await this.getChain(current);
      if (!next) break;
      current = next;
    }
    return current;
  }

  async setPocketbaseInfo(sandboxId: string, info: PocketbaseInfo): Promise<void> {
    await this.setJson(this.key(sandboxId, 'pocketbase'), info, 86400);
  }

  async getPocketbaseInfo(sandboxId: string): Promise<PocketbaseInfo | null> {
    return this.getJson<PocketbaseInfo>(this.key(sandboxId, 'pocketbase'));
  }

  async deletePocketbaseInfo(sandboxId: string): Promise<void> {
    await this.redisClient.del(this.key(sandboxId, 'pocketbase'));
  }

  async listSandboxInfos(): Promise<Array<{ sandboxId: string; info: SandboxInfo }>> {
    const keys: string[] = [];
    let cursor = '0';
    do {
      const result = await this.redisClient.scan(cursor, 'MATCH', this.key('*', 'info'), 'COUNT', 100);
      cursor = result[0];
      keys.push(...result[1]);
    } while (cursor !== '0');

    const entries: Array<{ sandboxId: string; info: SandboxInfo }> = [];
    if (keys.length === 0) return entries;

    const values = await this.redisClient.mget(...keys);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const value = values[i];
      if (!value) continue;
      try {
        const sandboxId = key.replace(this.key(''), '').replace(':info', '');
        entries.push({ sandboxId, info: JSON.parse(value) as SandboxInfo });
      } catch (e) {
        this.logger.warn(`Failed to parse sandbox info from ${key}`);
      }
    }
    return entries;
  }

  /**
   * Acquires a short-lived Redis lock so only one pod/process renews a
   * sandbox at a time. Returns true if the lock was acquired.
   */
  async acquireRenewalLock(sandboxId: string, ttlSeconds = 300): Promise<boolean> {
    const result = await this.redisClient.set(this.key(sandboxId, 'renewal_lock'), '1', 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  }

  async releaseRenewalLock(sandboxId: string): Promise<void> {
    await this.redisClient.del(this.key(sandboxId, 'renewal_lock'));
  }

  async clearSandboxState(sandboxId: string): Promise<void> {
    const keys = await this.redisClient.keys(this.key(sandboxId, '*'));
    if (keys.length > 0) {
      await this.redisClient.del(...keys);
    }
  }
}
