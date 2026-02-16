import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/supabase-admin', () => {
  const mockQueryBuilder: Record<string, ReturnType<typeof vi.fn>> = {};
  mockQueryBuilder.select = vi.fn().mockReturnValue(mockQueryBuilder);
  mockQueryBuilder.insert = vi.fn().mockReturnValue(mockQueryBuilder);
  mockQueryBuilder.eq = vi.fn().mockReturnValue(mockQueryBuilder);
  mockQueryBuilder.order = vi.fn().mockReturnValue(mockQueryBuilder);
  mockQueryBuilder.limit = vi.fn().mockReturnValue(mockQueryBuilder);
  mockQueryBuilder.ilike = vi.fn().mockResolvedValue({ data: [], error: null });
  mockQueryBuilder.single = vi.fn().mockResolvedValue({ data: null, error: null });

  return {
    supabaseAdmin: {
      from: vi.fn(() => mockQueryBuilder),
      _qb: mockQueryBuilder,
    },
  };
});

const fetchSpy = vi.fn();
global.fetch = fetchSpy;

import { POST } from '../route';
import { supabaseAdmin } from '@/lib/supabase-admin';

const qb = (supabaseAdmin as unknown as { _qb: Record<string, ReturnType<typeof vi.fn>> })._qb;

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchSpy.mockResolvedValue({
      json: () => Promise.resolve({ success: true, score: 0.9 }),
    });
    qb.single.mockResolvedValue({ data: null, error: null });
    qb.ilike.mockResolvedValue({ data: [], error: null });
    qb.insert.mockReturnValue({ error: null });
  });

  it('returns 400 for missing email', async () => {
    const res = await POST(makeRequest({ password: 'Test123!a', token: 'tok' }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.errors).toBeDefined();
  });

  it('returns 400 for invalid email format', async () => {
    const res = await POST(makeRequest({ email: 'not-email', password: 'Test123!a', token: 'tok' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for password too short', async () => {
    const res = await POST(makeRequest({ email: 'test@test.com', password: '123', token: 'tok' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for missing reCAPTCHA token', async () => {
    const res = await POST(makeRequest({ email: 'test@test.com', password: 'Test123!a' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when reCAPTCHA fails', async () => {
    fetchSpy.mockResolvedValueOnce({
      json: () => Promise.resolve({ success: false }),
    });

    const res = await POST(makeRequest({ email: 'test@test.com', password: 'Test123!a', token: 'bad-tok' }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.message).toContain('reCAPTCHA');
  });

  it('returns 400 when reCAPTCHA score is too low', async () => {
    fetchSpy.mockResolvedValueOnce({
      json: () => Promise.resolve({ success: true, score: 0.2 }),
    });

    const res = await POST(makeRequest({ email: 'test@test.com', password: 'Test123!a', token: 'tok' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when user already exists', async () => {
    qb.single.mockResolvedValueOnce({ data: { id: 'existing-uuid' }, error: null });

    const res = await POST(makeRequest({ email: 'exists@test.com', password: 'Test123!a', token: 'tok' }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.message).toContain('already exists');
  });

  it('returns 200 on successful registration', async () => {
    qb.single.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } });
    qb.ilike.mockResolvedValueOnce({ data: [{ bsy_id: 'BSY005' }], error: null });
    qb.insert.mockReturnValueOnce({ error: null });

    const res = await POST(makeRequest({
      email: 'new@test.com',
      password: 'Secure1pass!',
      token: 'valid-token',
      name: 'Test User',
    }));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.message).toContain('registered');
    expect(json.bsy_id).toBe('BSY006');
    expect(json.name).toBe('Test User');
  });
});
