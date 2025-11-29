import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { mockGetServerSession, mockQueryBuilder } = vi.hoisted(() => {
  const mockGetServerSession = vi.fn();

  const mockQueryBuilder: Record<string, ReturnType<typeof vi.fn>> = {};
  mockQueryBuilder.select = vi.fn().mockReturnValue(mockQueryBuilder);
  mockQueryBuilder.upsert = vi.fn().mockResolvedValue({ error: null });
  mockQueryBuilder.eq = vi.fn().mockReturnValue(mockQueryBuilder);
  mockQueryBuilder.single = vi.fn().mockResolvedValue({ data: { id: 'user-id' }, error: null });

  return { mockGetServerSession, mockQueryBuilder };
});

vi.mock('next-auth/next', () => ({
  getServerSession: mockGetServerSession,
}));

vi.mock('../../../auth/[...nextauth]/auth', () => ({
  authOptions: {},
}));

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: vi.fn(() => mockQueryBuilder),
  },
}));

import { POST } from '../route';

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';

const mockSession = {
  user: {
    id: VALID_UUID,
    email: 'test@test.com',
    alias: 'BSY001',
    bsy_id: 'BSY001',
    name: 'Test',
    role: 'user',
  },
  expires: new Date(Date.now() + 86400000).toISOString(),
};

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/notifications/register', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

describe('POST /api/notifications/register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQueryBuilder.select.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.eq.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.single.mockResolvedValue({ data: { id: VALID_UUID }, error: null });
    mockQueryBuilder.upsert.mockResolvedValue({ error: null });
  });

  it('returns 401 without session', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await POST(makeRequest({
      endpoint: 'https://push.example.com/sub',
      p256dh: 'key1',
      auth: 'key2',
    }));
    expect(res.status).toBe(401);
  });

  it('returns 400 with missing push data', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    const res = await POST(makeRequest({ endpoint: 'not-a-url' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 with invalid endpoint URL', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    const res = await POST(makeRequest({
      endpoint: 'not-a-url',
      p256dh: 'key1',
      auth: 'key2',
    }));
    expect(res.status).toBe(400);
  });

  it('returns 404 when user not found', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    mockQueryBuilder.single.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } });
    const res = await POST(makeRequest({
      endpoint: 'https://push.example.com/sub',
      p256dh: 'key1',
      auth: 'key2',
    }));
    expect(res.status).toBe(404);
  });

  it('returns 200 on successful registration', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    const res = await POST(makeRequest({
      endpoint: 'https://push.example.com/sub',
      p256dh: 'key1',
      auth: 'key2',
    }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });
});
