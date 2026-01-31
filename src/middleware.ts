import { NextRequest, NextResponse } from 'next/server';

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMITS: Record<string, { max: number; windowMs: number }> = {
  '/api/auth/register': { max: 5, windowMs: 60_000 },
  '/api/auth/callback': { max: 10, windowMs: 60_000 },
  '/api/likes': { max: 30, windowMs: 60_000 },
  '/api/posts': { max: 20, windowMs: 60_000 },
  '/api/notifications': { max: 30, windowMs: 60_000 },
  '/api/webhooks': { max: 10, windowMs: 60_000 },
  '/api/follows': { max: 20, windowMs: 60_000 },
  '/api/feed': { max: 30, windowMs: 60_000 },
  '/api/habits': { max: 30, windowMs: 60_000 },
};

const DEFAULT_LIMIT = { max: 60, windowMs: 60_000 };

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

function getRateLimit(pathname: string) {
  for (const [prefix, limit] of Object.entries(RATE_LIMITS)) {
    if (pathname.startsWith(prefix)) return limit;
  }
  return DEFAULT_LIMIT;
}

function cleanupExpiredEntries() {
  const now = Date.now();
  for (const [key, value] of rateLimitMap) {
    if (now > value.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  const ip = getClientIp(request);
  const { max, windowMs } = getRateLimit(pathname);
  const key = `${ip}:${pathname.split('/').slice(0, 4).join('/')}`;
  const now = Date.now();

  if (rateLimitMap.size > 10_000) {
    cleanupExpiredEntries();
  }

  const record = rateLimitMap.get(key);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return NextResponse.next();
  }

  if (record.count >= max) {
    return NextResponse.json(
      { error: 'Too many requests' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((record.resetTime - now) / 1000)),
        },
      }
    );
  }

  record.count++;
  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
