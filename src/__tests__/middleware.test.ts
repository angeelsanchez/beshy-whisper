import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

let middleware: (request: NextRequest) => ReturnType<typeof import('../middleware')['middleware']>;

beforeEach(async () => {
  vi.resetModules();
  const mod = await import('../middleware');
  middleware = mod.middleware;
});

function makeRequest(path: string, ip = '127.0.0.1'): NextRequest {
  const req = new NextRequest(`http://localhost${path}`, { method: 'GET' });
  req.headers.set('x-forwarded-for', ip);
  return req;
}

describe('middleware', () => {
  it('passes through non-API routes', () => {
    const res = middleware(makeRequest('/about'));
    expect(res.status).toBe(200);
  });

  it('allows API requests within rate limit', () => {
    const res = middleware(makeRequest('/api/likes', '10.0.0.1'));
    expect(res.status).toBe(200);
  });

  it('returns 429 when rate limit exceeded for register', () => {
    const ip = '10.0.0.2';
    for (let i = 0; i < 5; i++) {
      middleware(makeRequest('/api/auth/register', ip));
    }
    const res = middleware(makeRequest('/api/auth/register', ip));
    expect(res.status).toBe(429);
    const retryAfter = res.headers.get('Retry-After');
    expect(retryAfter).toBeDefined();
  });

  it('allows requests from different IPs independently', () => {
    for (let i = 0; i < 5; i++) {
      middleware(makeRequest('/api/auth/register', '10.0.0.3'));
    }
    const res = middleware(makeRequest('/api/auth/register', '10.0.0.4'));
    expect(res.status).toBe(200);
  });

  it('uses default limit for unknown API paths', () => {
    const ip = '10.0.0.5';
    for (let i = 0; i < 60; i++) {
      middleware(makeRequest('/api/some/other', ip));
    }
    const res = middleware(makeRequest('/api/some/other', ip));
    expect(res.status).toBe(429);
  });

  it('returns 429 when check-lockout rate limit exceeded (5/min)', () => {
    const ip = '10.0.0.10';
    for (let i = 0; i < 5; i++) {
      middleware(makeRequest('/api/auth/check-lockout', ip));
    }
    const res = middleware(makeRequest('/api/auth/check-lockout', ip));
    expect(res.status).toBe(429);
  });

  it('returns 429 when callback rate limit exceeded (5/min)', () => {
    const ip = '10.0.0.11';
    for (let i = 0; i < 5; i++) {
      middleware(makeRequest('/api/auth/callback', ip));
    }
    const res = middleware(makeRequest('/api/auth/callback', ip));
    expect(res.status).toBe(429);
  });

  it('allows check-lockout requests within limit', () => {
    const ip = '10.0.0.12';
    for (let i = 0; i < 4; i++) {
      middleware(makeRequest('/api/auth/check-lockout', ip));
    }
    const res = middleware(makeRequest('/api/auth/check-lockout', ip));
    expect(res.status).toBe(200);
  });
});
