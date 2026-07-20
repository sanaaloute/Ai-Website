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
var SandboxStateService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SandboxStateService = void 0;
const common_1 = require("@nestjs/common");
const redis_service_1 = require("./redis.service");
let SandboxStateService = SandboxStateService_1 = class SandboxStateService {
    constructor(redis) {
        this.redis = redis;
        this.logger = new common_1.Logger(SandboxStateService_1.name);
    }
    get redisClient() {
        return this.redis.getClient();
    }
    key(...parts) {
        return `sandbox:${parts.join(':')}`;
    }
    async setJson(key, value, ttlSeconds = 86400) {
        await this.redisClient.setex(key, ttlSeconds, JSON.stringify(value));
    }
    async getJson(key) {
        const raw = await this.redisClient.get(key);
        if (!raw)
            return null;
        try {
            return JSON.parse(raw);
        }
        catch (e) {
            this.logger.warn(`Failed to parse Redis key ${key}: ${e instanceof Error ? e.message : String(e)}`);
            return null;
        }
    }
    async setSandboxInfo(sandboxId, info) {
        await this.setJson(this.key(sandboxId, 'info'), info, 86400);
        if (info.userId) {
            await this.addUserSandbox(info.userId, sandboxId);
        }
    }
    async touchSandbox(sandboxId) {
        await this.redisClient.setex(this.key(sandboxId, 'lastSeen'), 86400, String(Date.now()));
    }
    async getSandboxLastSeen(sandboxId) {
        const raw = await this.redisClient.get(this.key(sandboxId, 'lastSeen'));
        return raw ? parseInt(raw, 10) : null;
    }
    async addUserSandbox(userId, sandboxId) {
        await this.redisClient.sadd(this.key('user', userId, 'sandboxes'), sandboxId);
        await this.redisClient.expire(this.key('user', userId, 'sandboxes'), 86400);
    }
    async listUserSandboxes(userId) {
        return this.redisClient.smembers(this.key('user', userId, 'sandboxes'));
    }
    async removeUserSandbox(userId, sandboxId) {
        await this.redisClient.srem(this.key('user', userId, 'sandboxes'), sandboxId);
    }
    async getSandboxInfo(sandboxId) {
        return this.getJson(this.key(sandboxId, 'info'));
    }
    async deleteSandboxInfo(sandboxId) {
        await this.redisClient.del(this.key(sandboxId, 'info'));
    }
    async setChain(oldId, newId) {
        await this.redisClient.setex(this.key(oldId, 'chain'), 86400, newId);
    }
    async getChain(sandboxId) {
        return this.redisClient.get(this.key(sandboxId, 'chain'));
    }
    async getCurrentSandboxId(sandboxId) {
        let current = sandboxId;
        const seen = new Set();
        while (true) {
            if (seen.has(current))
                break;
            seen.add(current);
            const next = await this.getChain(current);
            if (!next)
                break;
            current = next;
        }
        return current;
    }
    async setPocketbaseInfo(sandboxId, info) {
        await this.setJson(this.key(sandboxId, 'pocketbase'), info, 86400);
    }
    async getPocketbaseInfo(sandboxId) {
        return this.getJson(this.key(sandboxId, 'pocketbase'));
    }
    async deletePocketbaseInfo(sandboxId) {
        await this.redisClient.del(this.key(sandboxId, 'pocketbase'));
    }
    async listSandboxInfos() {
        const keys = [];
        let cursor = '0';
        do {
            const result = await this.redisClient.scan(cursor, 'MATCH', this.key('*', 'info'), 'COUNT', 100);
            cursor = result[0];
            keys.push(...result[1]);
        } while (cursor !== '0');
        const entries = [];
        if (keys.length === 0)
            return entries;
        const values = await this.redisClient.mget(...keys);
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            const value = values[i];
            if (!value)
                continue;
            try {
                const sandboxId = key.replace(this.key(''), '').replace(':info', '');
                entries.push({ sandboxId, info: JSON.parse(value) });
            }
            catch (e) {
                this.logger.warn(`Failed to parse sandbox info from ${key}`);
            }
        }
        return entries;
    }
    async acquireRenewalLock(sandboxId, ttlSeconds = 300) {
        const result = await this.redisClient.set(this.key(sandboxId, 'renewal_lock'), '1', 'EX', ttlSeconds, 'NX');
        return result === 'OK';
    }
    async releaseRenewalLock(sandboxId) {
        await this.redisClient.del(this.key(sandboxId, 'renewal_lock'));
    }
    async clearSandboxState(sandboxId) {
        const info = await this.getSandboxInfo(sandboxId);
        if (info?.userId) {
            await this.removeUserSandbox(info.userId, sandboxId);
        }
        const keys = await this.redisClient.keys(this.key(sandboxId, '*'));
        if (keys.length > 0) {
            await this.redisClient.del(...keys);
        }
    }
    async setPackageJsonHash(sandboxId, hash) {
        const info = await this.getSandboxInfo(sandboxId);
        if (info) {
            await this.setSandboxInfo(sandboxId, { ...info, packageJsonHash: hash });
        }
    }
    async getPackageJsonHash(sandboxId) {
        const info = await this.getSandboxInfo(sandboxId);
        return info?.packageJsonHash;
    }
    async clearPackageJsonHash(sandboxId) {
        const info = await this.getSandboxInfo(sandboxId);
        if (info) {
            const { packageJsonHash: _, ...rest } = info;
            await this.setSandboxInfo(sandboxId, rest);
        }
    }
};
exports.SandboxStateService = SandboxStateService;
exports.SandboxStateService = SandboxStateService = SandboxStateService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [redis_service_1.RedisService])
], SandboxStateService);
//# sourceMappingURL=sandbox-state.service.js.map