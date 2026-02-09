import { cache } from '@/lib/redis';
import { logger } from '@/lib/logger';

const STREAK_CACHE_TTL = 600; // 10 minutes
const STREAK_CACHE_PREFIX = 'cache:streak:';

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  totalPosts: number;
  lastPostDate: string | null;
  streakHistory: Array<{
    date: string;
    hasDayPost: boolean;
    hasNightPost: boolean;
    complete: boolean;
  }>;
}

export interface StreakCache {
  data: StreakData;
  cachedAt: number;
}

/**
 * Get cached streak data for a user
 */
export async function getCachedStreak(userId: string): Promise<StreakData | null> {
  try {
    const key = `${STREAK_CACHE_PREFIX}${userId}`;
    const cached = await cache.get(key);

    if (cached) {
      const data: StreakCache = JSON.parse(cached);
      return data.data;
    }

    return null;
  } catch (error) {
    logger.error('Error getting cached streak', {
      detail: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
}

/**
 * Set cached streak data for a user
 */
export async function setCachedStreak(userId: string, streakData: StreakData): Promise<void> {
  try {
    const key = `${STREAK_CACHE_PREFIX}${userId}`;
    const data: StreakCache = {
      data: streakData,
      cachedAt: Date.now(),
    };
    await cache.set(key, JSON.stringify(data), STREAK_CACHE_TTL);
  } catch (error) {
    logger.error('Error setting cached streak', {
      detail: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Invalidate cached streak data for a user (after new post)
 */
export async function invalidateStreakCache(userId: string): Promise<void> {
  try {
    const key = `${STREAK_CACHE_PREFIX}${userId}`;
    await cache.del(key);
  } catch (error) {
    logger.error('Error invalidating cached streak', {
      detail: error instanceof Error ? error.message : String(error)
    });
  }
}
