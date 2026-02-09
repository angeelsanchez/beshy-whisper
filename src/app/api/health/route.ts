import { NextResponse } from 'next/server';
import { getRedisClient, isRedisAvailable } from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function GET() {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    redis: {
      available: false,
      latency: null as number | null,
    },
  };

  // Check Redis connection
  if (isRedisAvailable()) {
    try {
      const start = Date.now();
      const redis = getRedisClient();
      await redis.ping();
      health.redis.available = true;
      health.redis.latency = Date.now() - start;
    } catch {
      health.redis.available = false;
    }
  }

  return NextResponse.json(health);
}
