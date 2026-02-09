import { cache } from '@/lib/redis';
import { logger } from '@/lib/logger';

const LIKES_COUNT_TTL = 300; // 5 minutes
const LIKES_COUNT_PREFIX = 'cache:likes:count:';

export interface LikesCountCache {
  count: number;
  cachedAt: number;
}

/**
 * Get cached likes count for an entry
 */
export async function getCachedLikesCount(entryId: string): Promise<number | null> {
  try {
    const key = `${LIKES_COUNT_PREFIX}${entryId}`;
    const cached = await cache.get(key);

    if (cached) {
      const data: LikesCountCache = JSON.parse(cached);
      return data.count;
    }

    return null;
  } catch (error) {
    logger.error('Error getting cached likes count', {
      detail: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
}

/**
 * Set cached likes count for an entry
 */
export async function setCachedLikesCount(entryId: string, count: number): Promise<void> {
  try {
    const key = `${LIKES_COUNT_PREFIX}${entryId}`;
    const data: LikesCountCache = {
      count,
      cachedAt: Date.now(),
    };
    await cache.set(key, JSON.stringify(data), LIKES_COUNT_TTL);
  } catch (error) {
    logger.error('Error setting cached likes count', {
      detail: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Invalidate cached likes count for an entry (after like/unlike)
 */
export async function invalidateLikesCount(entryId: string): Promise<void> {
  try {
    const key = `${LIKES_COUNT_PREFIX}${entryId}`;
    await cache.del(key);
  } catch (error) {
    logger.error('Error invalidating cached likes count', {
      detail: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Increment cached likes count (optimistic update)
 */
export async function incrementCachedLikesCount(entryId: string): Promise<void> {
  try {
    const key = `${LIKES_COUNT_PREFIX}${entryId}`;
    const cached = await cache.get(key);

    if (cached) {
      const data: LikesCountCache = JSON.parse(cached);
      data.count += 1;
      data.cachedAt = Date.now();
      await cache.set(key, JSON.stringify(data), LIKES_COUNT_TTL);
    }
  } catch (error) {
    logger.error('Error incrementing cached likes count', {
      detail: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Decrement cached likes count (optimistic update)
 */
export async function decrementCachedLikesCount(entryId: string): Promise<void> {
  try {
    const key = `${LIKES_COUNT_PREFIX}${entryId}`;
    const cached = await cache.get(key);

    if (cached) {
      const data: LikesCountCache = JSON.parse(cached);
      data.count = Math.max(0, data.count - 1);
      data.cachedAt = Date.now();
      await cache.set(key, JSON.stringify(data), LIKES_COUNT_TTL);
    }
  } catch (error) {
    logger.error('Error decrementing cached likes count', {
      detail: error instanceof Error ? error.message : String(error)
    });
  }
}
