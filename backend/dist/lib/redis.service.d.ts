import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
export declare class RedisService implements OnModuleInit, OnModuleDestroy {
    private readonly logger;
    private client;
    private readonly subscriberClients;
    onModuleInit(): void;
    onModuleDestroy(): void;
    getClient(): Redis;
    getSubscriber(): Redis;
    releaseSubscriber(subscriber: Redis): void;
}
