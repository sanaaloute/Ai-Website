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
var IdempotencyService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.IdempotencyService = void 0;
const common_1 = require("@nestjs/common");
const redis_service_1 = require("./redis.service");
const DEFAULT_TTL_SECONDS = 24 * 60 * 60;
const KEY_PREFIX = 'idempotency:';
let IdempotencyService = IdempotencyService_1 = class IdempotencyService {
    constructor(redis) {
        this.redis = redis;
        this.logger = new common_1.Logger(IdempotencyService_1.name);
    }
    async process(key, fn, ttlSeconds = DEFAULT_TTL_SECONDS) {
        if (!key) {
            return fn();
        }
        const redisKey = `${KEY_PREFIX}${key}`;
        const cached = await this.redis.getClient().get(redisKey);
        if (cached) {
            try {
                return JSON.parse(cached);
            }
            catch (e) {
                this.logger.warn(`Failed to parse idempotency cache for ${key}: ${e instanceof Error ? e.message : String(e)}`);
            }
        }
        const result = await fn();
        try {
            await this.redis.getClient().setex(redisKey, ttlSeconds, JSON.stringify(result));
        }
        catch (e) {
            this.logger.warn(`Failed to cache idempotency result for ${key}: ${e instanceof Error ? e.message : String(e)}`);
        }
        return result;
    }
    async complete(key, data, ttlSeconds = DEFAULT_TTL_SECONDS) {
        if (!key)
            return;
        const redisKey = `${KEY_PREFIX}${key}`;
        try {
            await this.redis.getClient().setex(redisKey, ttlSeconds, JSON.stringify(data));
        }
        catch (e) {
            this.logger.warn(`Failed to cache idempotency result for ${key}: ${e instanceof Error ? e.message : String(e)}`);
        }
    }
    async get(key) {
        const redisKey = `${KEY_PREFIX}${key}`;
        const cached = await this.redis.getClient().get(redisKey);
        if (!cached)
            return null;
        try {
            return JSON.parse(cached);
        }
        catch {
            return null;
        }
    }
};
exports.IdempotencyService = IdempotencyService;
exports.IdempotencyService = IdempotencyService = IdempotencyService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [redis_service_1.RedisService])
], IdempotencyService);
//# sourceMappingURL=idempotency.service.js.map