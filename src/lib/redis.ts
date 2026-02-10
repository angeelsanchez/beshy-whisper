import Redis from 'ioredis';
import { logger } from './logger';

let redisClient: Redis | null = null;
let redisAvailable = false;

// In-memory fallback store
const memoryStore = new Map<string, { value: string; expiresAt: number | null }>();

function createRedisClient(): Redis | null {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    logger.info('REDIS_URL not configured, using in-memory fallback');
    return null;
  }

  try {
    const client = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      connectTimeout: 5000,
      retryStrategy: (times: number) => {
        if (times > 3) return null;
        return Math.min(times * 200, 1000);
      },
    });

    client.on('connect', () => {
      logger.info('Redis connected');
      redisAvailable = true;
    });

    client.on('ready', () => {
      logger.info('Redis ready');
      redisAvailable = true;
    });

    client.on('error', (err: Error) => {
      logger.error('Redis error', { detail: err.message });
      redisAvailable = false;
    });

    client.on('close', () => {
      logger.info('Redis connection closed');
      redisAvailable = false;
    });

    return client;
  } catch (err) {
    logger.error('Failed to create Redis client', { detail: err instanceof Error ? err.message : String(err) });
    return null;
  }
}

export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = createRedisClient();
  }
  if (!redisClient) {
    throw new Error('Redis client not available');
  }
  return redisClient;
}

export function isRedisAvailable(): boolean {
  return redisAvailable && redisClient !== null;
}

// Initialize Redis client on module load
if (process.env.REDIS_URL) {
  getRedisClient();
}

// Memory store cleanup
function cleanupMemoryStore() {
  const now = Date.now();
  for (const [key, entry] of memoryStore) {
    if (entry.expiresAt && now > entry.expiresAt) {
      memoryStore.delete(key);
    }
  }
}

// Run cleanup every 60 seconds
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupMemoryStore, 60_000);
}

// Cache interface that falls back to memory
export const cache = {
  async get(key: string): Promise<string | null> {
    if (isRedisAvailable()) {
      try {
        return await getRedisClient().get(key);
      } catch {
        // Fall through to memory store
      }
    }

    const entry = memoryStore.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      memoryStore.delete(key);
      return null;
    }
    return entry.value;
  },

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (isRedisAvailable()) {
      try {
        if (ttlSeconds) {
          await getRedisClient().setex(key, ttlSeconds, value);
        } else {
          await getRedisClient().set(key, value);
        }
        return;
      } catch {
        // Fall through to memory store
      }
    }

    memoryStore.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
    });
  },

  async del(key: string): Promise<void> {
    if (isRedisAvailable()) {
      try {
        await getRedisClient().del(key);
      } catch {
        // Continue to delete from memory store too
      }
    }
    memoryStore.delete(key);
  },

  async incr(key: string): Promise<number> {
    if (isRedisAvailable()) {
      try {
        return await getRedisClient().incr(key);
      } catch {
        // Fall through to memory store
      }
    }

    const entry = memoryStore.get(key);
    const currentValue = entry ? parseInt(entry.value, 10) || 0 : 0;
    const newValue = currentValue + 1;
    memoryStore.set(key, {
      value: String(newValue),
      expiresAt: entry?.expiresAt ?? null,
    });
    return newValue;
  },

  async expire(key: string, ttlSeconds: number): Promise<void> {
    if (isRedisAvailable()) {
      try {
        await getRedisClient().expire(key, ttlSeconds);
        return;
      } catch {
        // Fall through to memory store
      }
    }

    const entry = memoryStore.get(key);
    if (entry) {
      entry.expiresAt = Date.now() + ttlSeconds * 1000;
    }
  },

  async ttl(key: string): Promise<number> {
    if (isRedisAvailable()) {
      try {
        return await getRedisClient().ttl(key);
      } catch {
        // Fall through to memory store
      }
    }

    const entry = memoryStore.get(key);
    if (!entry || !entry.expiresAt) return -1;
    const remaining = Math.ceil((entry.expiresAt - Date.now()) / 1000);
    return remaining > 0 ? remaining : -2;
  },

  async delPattern(pattern: string): Promise<void> {
    if (isRedisAvailable()) {
      try {
        const redis = getRedisClient();
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
          await redis.del(...keys);
        }
      } catch {
        // Continue to delete from memory store
      }
    }

    // Convert glob pattern to regex for memory store
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    for (const key of memoryStore.keys()) {
      if (regex.test(key)) {
        memoryStore.delete(key);
      }
    }
  },
};
