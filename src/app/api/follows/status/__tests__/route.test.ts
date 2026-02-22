import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { mockGetServerSession, mockFrom } = vi.hoisted(() => {
  const mockGetServerSession = vi.fn();

  const mockQueryBuilder: Record<string, ReturnType<typeof vi.fn>> = {};
  mockQueryBuilder.select = vi.fn().mockReturnValue(mockQueryBuilder);
  mockQueryBuilder.eq = vi.fn().mockReturnValue(mockQueryBuilder);
  mockQueryBuilder.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });

  const mockFrom = vi.fn(() => mockQueryBuilder);

  return { mockGetServerSession, mockFrom, mockQueryBuilder };
});

vi.mock('next-auth/next', () => ({
  getServerSession: mockGetServerSession,
}));

vi.mock('../../../auth/[...nextauth]/auth', () => ({
  authOptions: {},
}));

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: { from: mockFrom },
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { GET } from '../route';

const USER_ID = '550e8400-e29b-41d4-a716-446655440000';
const TARGET_ID = '660e8400-e29b-41d4-a716-446655440001';

const mockSession = {
  user: { id: USER_ID, email: 'test@test.com', alias: 'TestUser', bsy_id: 'BSY001', name: 'Test', role: 'user' },
  expires: new Date(Date.now() + 86400000).toISOString(),
};

function makeRequest(params: Record<string, string>): NextRequest {
  const url = new URL('http://localhost/api/follows/status');
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new NextRequest(url);
}

describe('GET /api/follows/status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const builder = mockFrom();
    builder.select.mockReturnValue(builder);
    builder.eq.mockReturnValue(builder);
    builder.maybeSingle.mockResolvedValue({ data: null, error: null });
  });

  it('returns 401 without session', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await GET(makeRequest({ targetUserId: TARGET_ID }));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe('Unauthorized');
  });

  it('returns 401 when session has no user id', async () => {
    mockGetServerSession.mockResolvedValue({ user: { email: 'test@test.com' } });
    const res = await GET(makeRequest({ targetUserId: TARGET_ID }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when targetUserId is missing', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    const res = await GET(makeRequest({}));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Invalid request data');
  });

  it('returns 400 when targetUserId is not a valid UUID', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    const res = await GET(makeRequest({ targetUserId: 'not-a-uuid' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when targetUserId is empty string', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    const res = await GET(makeRequest({ targetUserId: '' }));
    expect(res.status).toBe(400);
  });

  it('returns isFollowing true when user follows target', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    const builder = mockFrom();
    builder.maybeSingle.mockResolvedValue({ data: { follower_id: USER_ID }, error: null });

    const res = await GET(makeRequest({ targetUserId: TARGET_ID }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.isFollowing).toBe(true);
  });

  it('returns isFollowing false when user does not follow target', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    const builder = mockFrom();
    builder.maybeSingle.mockResolvedValue({ data: null, error: null });

    const res = await GET(makeRequest({ targetUserId: TARGET_ID }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.isFollowing).toBe(false);
  });

  it('queries supabase with correct parameters', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    const builder = mockFrom();
    builder.maybeSingle.mockResolvedValue({ data: null, error: null });

    await GET(makeRequest({ targetUserId: TARGET_ID }));

    expect(mockFrom).toHaveBeenCalledWith('follows');
    expect(builder.select).toHaveBeenCalledWith('follower_id');
    expect(builder.eq).toHaveBeenCalledWith('follower_id', USER_ID);
    expect(builder.eq).toHaveBeenCalledWith('following_id', TARGET_ID);
  });

  it('returns 500 when supabase query errors', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    const builder = mockFrom();
    builder.maybeSingle.mockResolvedValue({ data: null, error: { message: 'DB connection failed' } });

    const res = await GET(makeRequest({ targetUserId: TARGET_ID }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('Internal server error');
  });

  it('returns 500 and logs when unexpected exception is thrown', async () => {
    mockGetServerSession.mockRejectedValue(new Error('Network failure'));

    const res = await GET(makeRequest({ targetUserId: TARGET_ID }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('Internal server error');
  });

  it('returns 500 and handles non-Error exceptions', async () => {
    mockGetServerSession.mockRejectedValue('string error');

    const res = await GET(makeRequest({ targetUserId: TARGET_ID }));
    expect(res.status).toBe(500);
  });
});
