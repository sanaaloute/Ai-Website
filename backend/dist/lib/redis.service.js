"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var RedisService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisService = void 0;
const common_1 = require("@nestjs/common");
const ioredis_1 = __importDefault(require("ioredis"));
const env_1 = require("../config/env");
let RedisService = RedisService_1 = class RedisService {
    constructor() {
        this.logger = new common_1.Logger(RedisService_1.name);
        this.client = null;
        this.subscriberClients = new Set();
    }
    onModuleInit() {
        const url = (0, env_1.env)().redisUrl;
        this.client = new ioredis_1.default(url, {
            maxRetriesPerRequest: null,
            enableReadyCheck: true,
        });
        this.client.on('error', (err) => {
            this.logger.error(`Redis connection error: ${err.message}`);
        });
        this.client.on('connect', () => {
            this.logger.log('Redis connected');
        });
    }
    onModuleDestroy() {
        this.client?.disconnect();
        for (const subscriber of this.subscriberClients) {
            subscriber.disconnect();
        }
        this.subscriberClients.clear();
    }
    getClient() {
        if (!this.client) {
            throw new Error('Redis client not initialized');
        }
        return this.client;
    }
    getSubscriber() {
        const url = (0, env_1.env)().redisUrl;
        const subscriber = new ioredis_1.default(url, {
            maxRetriesPerRequest: null,
            enableReadyCheck: true,
        });
        subscriber.on('error', (err) => {
            this.logger.error(`Redis subscriber error: ${err.message}`);
        });
        this.subscriberClients.add(subscriber);
        return subscriber;
    }
    releaseSubscriber(subscriber) {
        this.subscriberClients.delete(subscriber);
        try {
            subscriber.disconnect();
        }
        catch {
        }
    }
};
exports.RedisService = RedisService;
exports.RedisService = RedisService = RedisService_1 = __decorate([
    (0, common_1.Injectable)()
], RedisService);
//# sourceMappingURL=redis.service.js.map