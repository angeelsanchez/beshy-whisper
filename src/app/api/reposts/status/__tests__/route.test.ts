import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { mockGetServerSession, mockFrom } = vi.hoisted(() => {
  const mockGetServerSession = vi.fn();
  const mockFrom = vi.fn();
  return { mockGetServerSession, mockFrom };
});

vi.mock('next-auth/next', () => ({
  getServerSession: mockGetServerSession,
}));

vi.mock('@/app/api/auth/[...nextauth]/auth', () => ({
  authOptions: {},
}));

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: { from: mockFrom },
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import { GET } from '../route';

const mockSession = {
  user: {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'test@test.com',
    alias: 'BSY001',
    name: 'Test User',
    role: 'user',
  },
  expires: new Date(Date.now() + 86400000).toISOString(),
};

const VALID_ENTRY_ID = '550e8400-e29b-41d4-a716-446655440001';

function makeRequest(entryId: string): NextRequest {
  return new NextRequest(`http://localhost/api/reposts/status?entryId=${entryId}`);
}

describe('GET /api/reposts/status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 without session', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await GET(makeRequest(VALID_ENTRY_ID));
    expect(res.status).toBe(401);
  });

  it('returns 400 with invalid entryId', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    const res = await GET(makeRequest('not-a-uuid'));
    expect(res.status).toBe(400);
  });

  it('returns reposted false and count 0 when no repost exists', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);

    const repostCheckBuilder: Record<string, ReturnType<typeof vi.fn>> = {};
    repostCheckBuilder.select = vi.fn().mockReturnValue(repostCheckBuilder);
    repostCheckBuilder.eq = vi.fn().mockReturnValue(repostCheckBuilder);
    repostCheckBuilder.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });

    const countBuilder: Record<string, ReturnType<typeof vi.fn>> = {};
    countBuilder.select = vi.fn().mockReturnValue(countBuilder);
    countBuilder.eq = vi.fn().mockResolvedValue({ data: [], count: 0, error: null });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? repostCheckBuilder : countBuilder;
    });

    const res = await GET(makeRequest(VALID_ENTRY_ID));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.reposted).toBe(false);
    expect(json.count).toBe(0);
  });

  it('returns reposted true and count when repost exists', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);

    const repostCheckBuilder: Record<string, ReturnType<typeof vi.fn>> = {};
    repostCheckBuilder.select = vi.fn().mockReturnValue(repostCheckBuilder);
    repostCheckBuilder.eq = vi.fn().mockReturnValue(repostCheckBuilder);
    repostCheckBuilder.maybeSingle = vi.fn().mockResolvedValue({ data: { id: 'repost-id' }, error: null });

    const countBuilder: Record<string, ReturnType<typeof vi.fn>> = {};
    countBuilder.select = vi.fn().mockReturnValue(countBuilder);
    countBuilder.eq = vi.fn().mockResolvedValue({ data: [{}, {}, {}], count: 3, error: null });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? repostCheckBuilder : countBuilder;
    });

    const res = await GET(makeRequest(VALID_ENTRY_ID));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.reposted).toBe(true);
    expect(json.count).toBe(3);
  });
});
