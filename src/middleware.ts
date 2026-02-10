import { NextRequest, NextResponse } from 'next/server';

// In-memory rate limiting (works in Edge Runtime, persists per container instance)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMITS: Record<string, { max: number; windowMs: number }> = {
  '/api/auth/check-lockout': { max: 5, windowMs: 60_000 },
  '/api/auth/register': { max: 5, windowMs: 60_000 },
  '/api/auth/callback': { max: 5, windowMs: 60_000 },
  '/api/likes': { max: 30, windowMs: 60_000 },
  '/api/posts': { max: 20, windowMs: 60_000 },
  '/api/notifications': { max: 30, windowMs: 60_000 },
  '/api/webhooks': { max: 10, windowMs: 60_000 },
  '/api/follows': { max: 20, windowMs: 60_000 },
  '/api/feed': { max: 30, windowMs: 60_000 },
  '/api/habits': { max: 30, windowMs: 60_000 },
  '/api/user/update-photo': { max: 10, windowMs: 60_000 },
  '/api/user/delete-photo': { max: 10, windowMs: 60_000 },
  '/api/user/update-bio': { max: 15, windowMs: 60_000 },
  '/api/generate-pdf': { max: 5, windowMs: 60_000 },
  '/api/users/search': { max: 20, windowMs: 60_000 },
  '/api/initiatives': { max: 30, windowMs: 60_000 },
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

function checkRateLimit(key: string, max: number, windowMs: number) {
  const now = Date.now();

  if (rateLimitMap.size > 10_000) {
    cleanupExpiredEntries();
  }

  const record = rateLimitMap.get(key);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: max - 1, resetIn: Math.ceil(windowMs / 1000) };
  }

  if (record.count >= max) {
    return {
      allowed: false,
      remaining: 0,
      resetIn: Math.ceil((record.resetTime - now) / 1000),
    };
  }

  record.count++;
  return {
    allowed: true,
    remaining: max - record.count,
    resetIn: Math.ceil((record.resetTime - now) / 1000),
  };
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/internal/') || pathname.startsWith('/api/health')) {
    return NextResponse.next();
  }

  const ip = getClientIp(request);
  const { max, windowMs } = getRateLimit(pathname);
  const key = `${ip}:${pathname.split('/').slice(0, 4).join('/')}`;

  const result = checkRateLimit(key, max, windowMs);

  if (!result.allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      {
        status: 429,
        headers: {
          'Retry-After': String(result.resetIn),
          'X-RateLimit-Limit': String(max),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(result.resetIn),
        },
      }
    );
  }

  const response = NextResponse.next();
  response.headers.set('X-RateLimit-Limit', String(max));
  response.headers.set('X-RateLimit-Remaining', String(result.remaining));
  response.headers.set('X-RateLimit-Reset', String(result.resetIn));

  return response;
}

export const config = {
  matcher: '/api/:path*',
};
