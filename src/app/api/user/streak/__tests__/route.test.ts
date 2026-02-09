import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { mockGetServerSession, mockQueryBuilder } = vi.hoisted(() => {
  const mockGetServerSession = vi.fn();

  const mockQueryBuilder: Record<string, ReturnType<typeof vi.fn>> = {};
  mockQueryBuilder.select = vi.fn().mockReturnValue(mockQueryBuilder);
  mockQueryBuilder.eq = vi.fn().mockReturnValue(mockQueryBuilder);
  mockQueryBuilder.order = vi.fn().mockResolvedValue({ data: [], error: null });

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

vi.mock('@/lib/cache/streaks', () => ({
  getCachedStreak: vi.fn().mockResolvedValue(null),
  setCachedStreak: vi.fn().mockResolvedValue(undefined),
  invalidateStreakCache: vi.fn().mockResolvedValue(undefined),
}));

import { GET } from '../route';

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

function makeRequest(): NextRequest {
  return new NextRequest('http://localhost/api/user/streak', { method: 'GET' });
}

describe('GET /api/user/streak', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQueryBuilder.select.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.eq.mockReturnValue(mockQueryBuilder);
  });

  it('returns 401 without session', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it('returns zero streak for no entries', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    mockQueryBuilder.order.mockResolvedValueOnce({ data: [], error: null });
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.currentStreak).toBe(0);
    expect(json.longestStreak).toBe(0);
    expect(json.totalPosts).toBe(0);
  });

  it('returns correct streak for entries with both DIA and NOCHE', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    mockQueryBuilder.order.mockResolvedValueOnce({
      data: [
        { fecha: `${todayStr}T08:00:00Z`, franja: 'DIA' },
        { fecha: `${todayStr}T20:00:00Z`, franja: 'NOCHE' },
      ],
      error: null,
    });

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.totalPosts).toBe(2);
    expect(json.longestStreak).toBeGreaterThanOrEqual(1);
  });

  it('returns 500 on database error', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    mockQueryBuilder.order.mockResolvedValueOnce({
      data: null,
      error: { message: 'DB error' },
    });
    const res = await GET(makeRequest());
    expect(res.status).toBe(500);
  });
});
