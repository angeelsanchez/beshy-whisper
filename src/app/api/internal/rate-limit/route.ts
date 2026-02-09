import { NextRequest, NextResponse } from 'next/server';
import { cache } from '@/lib/redis';

export const dynamic = 'force-dynamic';

interface RateLimitRequest {
  key: string;
  max: number;
  windowSeconds: number;
}

export async function POST(request: NextRequest) {
  // Internal endpoint - verify internal call
  const internalSecret = request.headers.get('x-internal-secret');
  if (internalSecret !== process.env.INTERNAL_API_SECRET && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body: RateLimitRequest = await request.json();
    const { key, max, windowSeconds } = body;

    if (!key || !max || !windowSeconds) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const rateLimitKey = `ratelimit:${key}`;

    // Get current count
    const currentStr = await cache.get(rateLimitKey);
    const current = currentStr ? parseInt(currentStr, 10) : 0;

    // Get remaining TTL
    const ttl = await cache.ttl(rateLimitKey);

    if (current >= max) {
      return NextResponse.json({
        allowed: false,
        current,
        max,
        remaining: 0,
        resetIn: ttl > 0 ? ttl : windowSeconds,
      });
    }

    // Increment counter
    const newCount = await cache.incr(rateLimitKey);

    // Set expiry if this is the first request in the window
    if (newCount === 1 || ttl < 0) {
      await cache.expire(rateLimitKey, windowSeconds);
    }

    return NextResponse.json({
      allowed: true,
      current: newCount,
      max,
      remaining: Math.max(0, max - newCount),
      resetIn: ttl > 0 ? ttl : windowSeconds,
    });
  } catch (error) {
    // On error, allow the request (fail open)
    return NextResponse.json({
      allowed: true,
      current: 0,
      max: 0,
      remaining: 0,
      resetIn: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
