import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockCheckLockout = vi.fn();

vi.mock('@/lib/auth-lockout', () => ({
  checkLockout: (...args: unknown[]) => mockCheckLockout(...args),
}));

import { POST } from '../route';

function makeRequest(body: unknown, ip = '1.2.3.4'): NextRequest {
  const req = new NextRequest('http://localhost/api/auth/check-lockout', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
  req.headers.set('x-forwarded-for', ip);
  return req;
}

describe('POST /api/auth/check-lockout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckLockout.mockResolvedValue({
      locked: false,
      remainingSeconds: 0,
      failedAttempts: 0,
    });
  });

  it('returns 400 for missing email', async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Datos inválidos');
  });

  it('returns 400 for invalid email format', async () => {
    const res = await POST(makeRequest({ email: 'not-an-email' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for email exceeding max length', async () => {
    const longEmail = `${'a'.repeat(250)}@test.com`;
    const res = await POST(makeRequest({ email: longEmail }));
    expect(res.status).toBe(400);
  });

  it('returns unlocked status when not locked', async () => {
    mockCheckLockout.mockResolvedValueOnce({
      locked: false,
      remainingSeconds: 0,
      failedAttempts: 2,
    });

    const res = await POST(makeRequest({ email: 'user@test.com' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.locked).toBe(false);
    expect(json.remainingSeconds).toBe(0);
  });

  it('returns locked status with remaining seconds', async () => {
    mockCheckLockout.mockResolvedValueOnce({
      locked: true,
      remainingSeconds: 45,
      failedAttempts: 5,
    });

    const res = await POST(makeRequest({ email: 'user@test.com' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.locked).toBe(true);
    expect(json.remainingSeconds).toBe(45);
  });

  it('extracts IP from x-forwarded-for header', async () => {
    await POST(makeRequest({ email: 'user@test.com' }, '10.0.0.1'));

    expect(mockCheckLockout).toHaveBeenCalledWith('10.0.0.1', 'user@test.com');
  });

  it('extracts IP from x-real-ip when x-forwarded-for is absent', async () => {
    const req = new NextRequest('http://localhost/api/auth/check-lockout', {
      method: 'POST',
      body: JSON.stringify({ email: 'user@test.com' }),
      headers: { 'Content-Type': 'application/json' },
    });
    req.headers.set('x-real-ip', '10.0.0.2');

    await POST(req);

    expect(mockCheckLockout).toHaveBeenCalledWith('10.0.0.2', 'user@test.com');
  });

  it('uses "unknown" when no IP headers present', async () => {
    const req = new NextRequest('http://localhost/api/auth/check-lockout', {
      method: 'POST',
      body: JSON.stringify({ email: 'user@test.com' }),
      headers: { 'Content-Type': 'application/json' },
    });

    await POST(req);

    expect(mockCheckLockout).toHaveBeenCalledWith('unknown', 'user@test.com');
  });

  it('does not expose failedAttempts in response', async () => {
    mockCheckLockout.mockResolvedValueOnce({
      locked: false,
      remainingSeconds: 0,
      failedAttempts: 3,
    });

    const res = await POST(makeRequest({ email: 'user@test.com' }));
    const json = await res.json();
    expect(json.failedAttempts).toBeUndefined();
  });
});
