import Redis from 'ioredis';
import config from './env';

/**
 * Redis client for BullMQ and rate limiting
 * - Used by BullMQ for job persistence (survives restarts)
 * - Used for distributed rate limiting counters
 * - Shared across multiple workers safely
 */
class RedisClient {
  private client: Redis;

  constructor() {
    this.client = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      maxRetriesPerRequest: null, // Required for BullMQ
      enableReadyCheck: false,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.client.on('error', (err) => {
      console.error('Redis connection error:', err);
    });

    this.client.on('connect', () => {
      console.log('✅ Redis connected successfully');
    });
  }

  /**
   * Get the Redis client instance
   */
  getClient(): Redis {
    return this.client;
  }

  /**
   * Create a new Redis connection (for BullMQ worker)
   * BullMQ requires separate connections for Queue and Worker
   */
  // Return type is intentionally `any` to avoid tight coupling between
  // the ioredis version used here and the one bundled with BullMQ.
  // BullMQ accepts any compatible Redis-like connection object.
  createConnection(): any {
    return new Redis({
      host: config.redis.host,
      port: config.redis.port,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
  }

  /**
   * Test Redis connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.client.ping();
      console.log('✅ Redis ping successful');
      return true;
    } catch (error) {
      console.error('❌ Redis connection failed:', error);
      return false;
    }
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    await this.client.quit();
  }
}

// Singleton instance
const redisClient = new RedisClient();

export default redisClient;
