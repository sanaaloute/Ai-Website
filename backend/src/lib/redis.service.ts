import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { env } from '@/config/env';

/**
 * Shared Redis client for queues, caching, rate limiting, and sandbox state.
 *
 * We intentionally export a single connection instance that is reused by
 * BullMQ, rate limiters, and ephemeral state stores. A separate subscriber
 * connection is created on demand for SSE event subscriptions.
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private readonly subscriberClients = new Set<Redis>();

  onModuleInit() {
    const url = env().redisUrl;
    this.client = new Redis(url, {
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

  /**
   * Returns the shared Redis client. Do NOT use this for pub/sub subscriptions
   * in a long-lived request; use getSubscriber() instead.
   */
  getClient(): Redis {
    if (!this.client) {
      throw new Error('Redis client not initialized');
    }
    return this.client;
  }

  /**
   * Creates and returns a dedicated Redis subscriber connection. Each long-lived
   * SSE subscription gets its own connection because ioredis blocks the
   * connection while subscribed. Callers must invoke releaseSubscriber() when
   * the subscription ends.
   */
  getSubscriber(): Redis {
    const url = env().redisUrl;
    const subscriber = new Redis(url, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
    });
    subscriber.on('error', (err) => {
      this.logger.error(`Redis subscriber error: ${err.message}`);
    });
    this.subscriberClients.add(subscriber);
    return subscriber;
  }

  /**
   * Disconnects a subscriber connection returned by getSubscriber() and removes
   * it from the tracked set.
   */
  releaseSubscriber(subscriber: Redis): void {
    this.subscriberClients.delete(subscriber);
    try {
      subscriber.disconnect();
    } catch {
      // Ignore errors from already-disconnected clients.
    }
  }
}
