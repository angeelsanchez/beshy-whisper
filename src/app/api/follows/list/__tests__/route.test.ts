import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { mockGetServerSession, mockFrom } = vi.hoisted(() => {
  const mockGetServerSession = vi.fn();

  const createBuilder = (): Record<string, ReturnType<typeof vi.fn>> => {
    const builder: Record<string, ReturnType<typeof vi.fn>> = {};
    builder.select = vi.fn().mockReturnValue(builder);
    builder.eq = vi.fn().mockReturnValue(builder);
    builder.in = vi.fn().mockReturnValue(builder);
    builder.range = vi.fn().mockReturnValue(builder);
    builder.order = vi.fn().mockResolvedValue({ data: [], error: null, count: 0 });
    return builder;
  };

  const mockFrom = vi.fn(() => createBuilder());

  return { mockGetServerSession, mockFrom, createBuilder };
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

const CURRENT_USER_ID = '550e8400-e29b-41d4-a716-446655440000';
const OTHER_USER_ID = '660e8400-e29b-41d4-a716-446655440001';
const FOLLOWER_A_ID = '770e8400-e29b-41d4-a716-446655440002';
const FOLLOWER_B_ID = '880e8400-e29b-41d4-a716-446655440003';

const mockSession = {
  user: { id: CURRENT_USER_ID, email: 'test@test.com', alias: 'TestUser', bsy_id: 'BSY001', name: 'Test', role: 'user' },
  expires: new Date(Date.now() + 86400000).toISOString(),
};

function makeRequest(params: Record<string, string>): NextRequest {
  const url = new URL('http://localhost/api/follows/list');
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new NextRequest(url);
}

describe('GET /api/follows/list', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 without session', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await GET(makeRequest({ userId: OTHER_USER_ID, type: 'followers' }));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe('Unauthorized');
  });

  it('returns 401 when session has no user id', async () => {
    mockGetServerSession.mockResolvedValue({ user: { email: 'test@test.com' } });
    const res = await GET(makeRequest({ userId: OTHER_USER_ID, type: 'followers' }));
    expect(res.status).toBe(401);
  });

  describe('validation', () => {
    it('returns 400 when userId is missing', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      const res = await GET(makeRequest({ type: 'followers' }));
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('Invalid request data');
    });

    it('returns 400 when userId is not a valid UUID', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      const res = await GET(makeRequest({ userId: 'invalid', type: 'followers' }));
      expect(res.status).toBe(400);
    });

    it('returns 400 when type is missing', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      const res = await GET(makeRequest({ userId: OTHER_USER_ID }));
      expect(res.status).toBe(400);
    });

    it('returns 400 when type is invalid', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      const res = await GET(makeRequest({ userId: OTHER_USER_ID, type: 'invalid' }));
      expect(res.status).toBe(400);
    });

    it('returns 400 when page is zero', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      const res = await GET(makeRequest({ userId: OTHER_USER_ID, type: 'followers', page: '0' }));
      expect(res.status).toBe(400);
    });

    it('returns 400 when page is negative', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      const res = await GET(makeRequest({ userId: OTHER_USER_ID, type: 'followers', page: '-1' }));
      expect(res.status).toBe(400);
    });

    it('returns 400 when limit exceeds max (50)', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      const res = await GET(makeRequest({ userId: OTHER_USER_ID, type: 'followers', limit: '51' }));
      expect(res.status).toBe(400);
    });

    it('returns 400 when limit is zero', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      const res = await GET(makeRequest({ userId: OTHER_USER_ID, type: 'followers', limit: '0' }));
      expect(res.status).toBe(400);
    });

    it('returns flattened error details in 400 response', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      const res = await GET(makeRequest({ type: 'followers' }));
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.details).toBeDefined();
    });
  });

  describe('type=followers', () => {
    it('returns empty list when no followers', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      const primaryBuilder = {
        select: vi.fn(),
        eq: vi.fn(),
        range: vi.fn(),
        order: vi.fn(),
      } as Record<string, ReturnType<typeof vi.fn>>;
      primaryBuilder.select.mockReturnValue(primaryBuilder);
      primaryBuilder.eq.mockReturnValue(primaryBuilder);
      primaryBuilder.range.mockReturnValue(primaryBuilder);
      primaryBuilder.order.mockResolvedValue({ data: [], error: null, count: 0 });

      mockFrom.mockReturnValue(primaryBuilder);

      const res = await GET(makeRequest({ userId: OTHER_USER_ID, type: 'followers' }));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.users).toEqual([]);
      expect(json.total).toBe(0);
      expect(json.page).toBe(1);
      expect(json.limit).toBe(20);
    });

    it('returns followers with user data and isFollowedByMe', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);

      const followsData = [
        { follower_id: FOLLOWER_A_ID, users: { id: FOLLOWER_A_ID, alias: 'FollowerA', bsy_id: 'BSY002', name: 'Follower A' } },
        { follower_id: FOLLOWER_B_ID, users: { id: FOLLOWER_B_ID, alias: 'FollowerB', bsy_id: 'BSY003', name: 'Follower B' } },
      ];

      const primaryBuilder: Record<string, ReturnType<typeof vi.fn>> = {};
      primaryBuilder.select = vi.fn().mockReturnValue(primaryBuilder);
      primaryBuilder.eq = vi.fn().mockReturnValue(primaryBuilder);
      primaryBuilder.range = vi.fn().mockReturnValue(primaryBuilder);
      primaryBuilder.order = vi.fn().mockResolvedValue({ data: followsData, error: null, count: 2 });

      const myFollowsBuilder: Record<string, ReturnType<typeof vi.fn>> = {};
      myFollowsBuilder.select = vi.fn().mockReturnValue(myFollowsBuilder);
      myFollowsBuilder.eq = vi.fn().mockReturnValue(myFollowsBuilder);
      myFollowsBuilder.in = vi.fn().mockResolvedValue({ data: [{ following_id: FOLLOWER_A_ID }], error: null });

      let fromCallCount = 0;
      mockFrom.mockImplementation(() => {
        fromCallCount++;
        if (fromCallCount === 1) return primaryBuilder;
        return myFollowsBuilder;
      });

      const res = await GET(makeRequest({ userId: OTHER_USER_ID, type: 'followers' }));
      expect(res.status).toBe(200);
      const json = await res.json();

      expect(json.users).toHaveLength(2);
      expect(json.users[0]).toEqual({
        id: FOLLOWER_A_ID,
        alias: 'FollowerA',
        bsy_id: 'BSY002',
        name: 'Follower A',
        isFollowedByMe: true,
      });
      expect(json.users[1]).toEqual({
        id: FOLLOWER_B_ID,
        alias: 'FollowerB',
        bsy_id: 'BSY003',
        name: 'Follower B',
        isFollowedByMe: false,
      });
      expect(json.total).toBe(2);
    });

    it('does not query myFollows when follower list is empty', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);

      const primaryBuilder: Record<string, ReturnType<typeof vi.fn>> = {};
      primaryBuilder.select = vi.fn().mockReturnValue(primaryBuilder);
      primaryBuilder.eq = vi.fn().mockReturnValue(primaryBuilder);
      primaryBuilder.range = vi.fn().mockReturnValue(primaryBuilder);
      primaryBuilder.order = vi.fn().mockResolvedValue({ data: [], error: null, count: 0 });

      mockFrom.mockReturnValue(primaryBuilder);

      await GET(makeRequest({ userId: OTHER_USER_ID, type: 'followers' }));

      expect(mockFrom).toHaveBeenCalledTimes(1);
    });

    it('handles null users join gracefully', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);

      const followsData = [
        { follower_id: FOLLOWER_A_ID, users: null },
      ];

      const primaryBuilder: Record<string, ReturnType<typeof vi.fn>> = {};
      primaryBuilder.select = vi.fn().mockReturnValue(primaryBuilder);
      primaryBuilder.eq = vi.fn().mockReturnValue(primaryBuilder);
      primaryBuilder.range = vi.fn().mockReturnValue(primaryBuilder);
      primaryBuilder.order = vi.fn().mockResolvedValue({ data: followsData, error: null, count: 1 });

      const myFollowsBuilder: Record<string, ReturnType<typeof vi.fn>> = {};
      myFollowsBuilder.select = vi.fn().mockReturnValue(myFollowsBuilder);
      myFollowsBuilder.eq = vi.fn().mockReturnValue(myFollowsBuilder);
      myFollowsBuilder.in = vi.fn().mockResolvedValue({ data: [], error: null });

      let fromCallCount = 0;
      mockFrom.mockImplementation(() => {
        fromCallCount++;
        if (fromCallCount === 1) return primaryBuilder;
        return myFollowsBuilder;
      });

      const res = await GET(makeRequest({ userId: OTHER_USER_ID, type: 'followers' }));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.users[0]).toEqual({
        id: FOLLOWER_A_ID,
        alias: '',
        bsy_id: '',
        name: '',
        isFollowedByMe: false,
      });
    });

    it('returns 500 when primary query errors', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);

      const primaryBuilder: Record<string, ReturnType<typeof vi.fn>> = {};
      primaryBuilder.select = vi.fn().mockReturnValue(primaryBuilder);
      primaryBuilder.eq = vi.fn().mockReturnValue(primaryBuilder);
      primaryBuilder.range = vi.fn().mockReturnValue(primaryBuilder);
      primaryBuilder.order = vi.fn().mockResolvedValue({ data: null, error: { message: 'Query failed' }, count: null });

      mockFrom.mockReturnValue(primaryBuilder);

      const res = await GET(makeRequest({ userId: OTHER_USER_ID, type: 'followers' }));
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toBe('Internal server error');
    });

    it('respects custom page and limit parameters', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);

      const primaryBuilder: Record<string, ReturnType<typeof vi.fn>> = {};
      primaryBuilder.select = vi.fn().mockReturnValue(primaryBuilder);
      primaryBuilder.eq = vi.fn().mockReturnValue(primaryBuilder);
      primaryBuilder.range = vi.fn().mockReturnValue(primaryBuilder);
      primaryBuilder.order = vi.fn().mockResolvedValue({ data: [], error: null, count: 0 });

      mockFrom.mockReturnValue(primaryBuilder);

      const res = await GET(makeRequest({ userId: OTHER_USER_ID, type: 'followers', page: '3', limit: '10' }));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.page).toBe(3);
      expect(json.limit).toBe(10);
      expect(primaryBuilder.range).toHaveBeenCalledWith(20, 29);
    });
  });

  describe('type=following', () => {
    it('returns empty list when not following anyone', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);

      const primaryBuilder: Record<string, ReturnType<typeof vi.fn>> = {};
      primaryBuilder.select = vi.fn().mockReturnValue(primaryBuilder);
      primaryBuilder.eq = vi.fn().mockReturnValue(primaryBuilder);
      primaryBuilder.range = vi.fn().mockReturnValue(primaryBuilder);
      primaryBuilder.order = vi.fn().mockResolvedValue({ data: [], error: null, count: 0 });

      mockFrom.mockReturnValue(primaryBuilder);

      const res = await GET(makeRequest({ userId: OTHER_USER_ID, type: 'following' }));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.users).toEqual([]);
      expect(json.total).toBe(0);
    });

    it('returns following users with isFollowedByMe when viewing another user', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);

      const followsData = [
        { following_id: FOLLOWER_A_ID, users: { id: FOLLOWER_A_ID, alias: 'UserA', bsy_id: 'BSY002', name: 'User A' } },
        { following_id: FOLLOWER_B_ID, users: { id: FOLLOWER_B_ID, alias: 'UserB', bsy_id: 'BSY003', name: 'User B' } },
      ];

      const primaryBuilder: Record<string, ReturnType<typeof vi.fn>> = {};
      primaryBuilder.select = vi.fn().mockReturnValue(primaryBuilder);
      primaryBuilder.eq = vi.fn().mockReturnValue(primaryBuilder);
      primaryBuilder.range = vi.fn().mockReturnValue(primaryBuilder);
      primaryBuilder.order = vi.fn().mockResolvedValue({ data: followsData, error: null, count: 2 });

      const myFollowsBuilder: Record<string, ReturnType<typeof vi.fn>> = {};
      myFollowsBuilder.select = vi.fn().mockReturnValue(myFollowsBuilder);
      myFollowsBuilder.eq = vi.fn().mockReturnValue(myFollowsBuilder);
      myFollowsBuilder.in = vi.fn().mockResolvedValue({ data: [{ following_id: FOLLOWER_B_ID }], error: null });

      let fromCallCount = 0;
      mockFrom.mockImplementation(() => {
        fromCallCount++;
        if (fromCallCount === 1) return primaryBuilder;
        return myFollowsBuilder;
      });

      const res = await GET(makeRequest({ userId: OTHER_USER_ID, type: 'following' }));
      expect(res.status).toBe(200);
      const json = await res.json();

      expect(json.users).toHaveLength(2);
      expect(json.users[0].isFollowedByMe).toBe(false);
      expect(json.users[1].isFollowedByMe).toBe(true);
    });

    it('marks all as isFollowedByMe=true when viewing own following list', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);

      const followsData = [
        { following_id: FOLLOWER_A_ID, users: { id: FOLLOWER_A_ID, alias: 'UserA', bsy_id: 'BSY002', name: 'User A' } },
        { following_id: FOLLOWER_B_ID, users: { id: FOLLOWER_B_ID, alias: 'UserB', bsy_id: 'BSY003', name: 'User B' } },
      ];

      const primaryBuilder: Record<string, ReturnType<typeof vi.fn>> = {};
      primaryBuilder.select = vi.fn().mockReturnValue(primaryBuilder);
      primaryBuilder.eq = vi.fn().mockReturnValue(primaryBuilder);
      primaryBuilder.range = vi.fn().mockReturnValue(primaryBuilder);
      primaryBuilder.order = vi.fn().mockResolvedValue({ data: followsData, error: null, count: 2 });

      mockFrom.mockReturnValue(primaryBuilder);

      const res = await GET(makeRequest({ userId: CURRENT_USER_ID, type: 'following' }));
      expect(res.status).toBe(200);
      const json = await res.json();

      expect(json.users).toHaveLength(2);
      expect(json.users[0].isFollowedByMe).toBe(true);
      expect(json.users[1].isFollowedByMe).toBe(true);
      expect(mockFrom).toHaveBeenCalledTimes(1);
    });

    it('does not query myFollows when following list is empty (other user)', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);

      const primaryBuilder: Record<string, ReturnType<typeof vi.fn>> = {};
      primaryBuilder.select = vi.fn().mockReturnValue(primaryBuilder);
      primaryBuilder.eq = vi.fn().mockReturnValue(primaryBuilder);
      primaryBuilder.range = vi.fn().mockReturnValue(primaryBuilder);
      primaryBuilder.order = vi.fn().mockResolvedValue({ data: [], error: null, count: 0 });

      mockFrom.mockReturnValue(primaryBuilder);

      await GET(makeRequest({ userId: OTHER_USER_ID, type: 'following' }));
      expect(mockFrom).toHaveBeenCalledTimes(1);
    });

    it('handles null users join gracefully in following', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);

      const followsData = [
        { following_id: FOLLOWER_A_ID, users: null },
      ];

      const primaryBuilder: Record<string, ReturnType<typeof vi.fn>> = {};
      primaryBuilder.select = vi.fn().mockReturnValue(primaryBuilder);
      primaryBuilder.eq = vi.fn().mockReturnValue(primaryBuilder);
      primaryBuilder.range = vi.fn().mockReturnValue(primaryBuilder);
      primaryBuilder.order = vi.fn().mockResolvedValue({ data: followsData, error: null, count: 1 });

      mockFrom.mockReturnValue(primaryBuilder);

      const res = await GET(makeRequest({ userId: CURRENT_USER_ID, type: 'following' }));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.users[0]).toEqual({
        id: FOLLOWER_A_ID,
        alias: '',
        bsy_id: '',
        name: '',
        isFollowedByMe: true,
      });
    });

    it('returns 500 when primary following query errors', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);

      const primaryBuilder: Record<string, ReturnType<typeof vi.fn>> = {};
      primaryBuilder.select = vi.fn().mockReturnValue(primaryBuilder);
      primaryBuilder.eq = vi.fn().mockReturnValue(primaryBuilder);
      primaryBuilder.range = vi.fn().mockReturnValue(primaryBuilder);
      primaryBuilder.order = vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' }, count: null });

      mockFrom.mockReturnValue(primaryBuilder);

      const res = await GET(makeRequest({ userId: OTHER_USER_ID, type: 'following' }));
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toBe('Internal server error');
    });

    it('uses correct select query for following type', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);

      const primaryBuilder: Record<string, ReturnType<typeof vi.fn>> = {};
      primaryBuilder.select = vi.fn().mockReturnValue(primaryBuilder);
      primaryBuilder.eq = vi.fn().mockReturnValue(primaryBuilder);
      primaryBuilder.range = vi.fn().mockReturnValue(primaryBuilder);
      primaryBuilder.order = vi.fn().mockResolvedValue({ data: [], error: null, count: 0 });

      mockFrom.mockReturnValue(primaryBuilder);

      await GET(makeRequest({ userId: OTHER_USER_ID, type: 'following' }));

      expect(mockFrom).toHaveBeenCalledWith('follows');
      expect(primaryBuilder.select).toHaveBeenCalledWith(
        'following_id, users!follows_following_id_fkey(id, alias, bsy_id, name)',
        { count: 'exact' },
      );
      expect(primaryBuilder.eq).toHaveBeenCalledWith('follower_id', OTHER_USER_ID);
    });
  });

  describe('pagination', () => {
    it('defaults page to 1 and limit to 20 when not provided', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);

      const primaryBuilder: Record<string, ReturnType<typeof vi.fn>> = {};
      primaryBuilder.select = vi.fn().mockReturnValue(primaryBuilder);
      primaryBuilder.eq = vi.fn().mockReturnValue(primaryBuilder);
      primaryBuilder.range = vi.fn().mockReturnValue(primaryBuilder);
      primaryBuilder.order = vi.fn().mockResolvedValue({ data: [], error: null, count: 0 });

      mockFrom.mockReturnValue(primaryBuilder);

      const res = await GET(makeRequest({ userId: OTHER_USER_ID, type: 'following' }));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.page).toBe(1);
      expect(json.limit).toBe(20);
      expect(primaryBuilder.range).toHaveBeenCalledWith(0, 19);
    });

    it('calculates offset correctly for page 2 with limit 10', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);

      const primaryBuilder: Record<string, ReturnType<typeof vi.fn>> = {};
      primaryBuilder.select = vi.fn().mockReturnValue(primaryBuilder);
      primaryBuilder.eq = vi.fn().mockReturnValue(primaryBuilder);
      primaryBuilder.range = vi.fn().mockReturnValue(primaryBuilder);
      primaryBuilder.order = vi.fn().mockResolvedValue({ data: [], error: null, count: 0 });

      mockFrom.mockReturnValue(primaryBuilder);

      await GET(makeRequest({ userId: OTHER_USER_ID, type: 'following', page: '2', limit: '10' }));
      expect(primaryBuilder.range).toHaveBeenCalledWith(10, 19);
    });

    it('returns total count from supabase', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);

      const primaryBuilder: Record<string, ReturnType<typeof vi.fn>> = {};
      primaryBuilder.select = vi.fn().mockReturnValue(primaryBuilder);
      primaryBuilder.eq = vi.fn().mockReturnValue(primaryBuilder);
      primaryBuilder.range = vi.fn().mockReturnValue(primaryBuilder);
      primaryBuilder.order = vi.fn().mockResolvedValue({ data: [], error: null, count: 42 });

      mockFrom.mockReturnValue(primaryBuilder);

      const res = await GET(makeRequest({ userId: OTHER_USER_ID, type: 'following' }));
      const json = await res.json();
      expect(json.total).toBe(42);
    });

    it('returns total 0 when count is null', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);

      const primaryBuilder: Record<string, ReturnType<typeof vi.fn>> = {};
      primaryBuilder.select = vi.fn().mockReturnValue(primaryBuilder);
      primaryBuilder.eq = vi.fn().mockReturnValue(primaryBuilder);
      primaryBuilder.range = vi.fn().mockReturnValue(primaryBuilder);
      primaryBuilder.order = vi.fn().mockResolvedValue({ data: [], error: null, count: null });

      mockFrom.mockReturnValue(primaryBuilder);

      const res = await GET(makeRequest({ userId: OTHER_USER_ID, type: 'following' }));
      const json = await res.json();
      expect(json.total).toBe(0);
    });
  });

  describe('error handling', () => {
    it('returns 500 when unexpected exception is thrown', async () => {
      mockGetServerSession.mockRejectedValue(new Error('Unexpected failure'));

      const res = await GET(makeRequest({ userId: OTHER_USER_ID, type: 'followers' }));
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toBe('Internal server error');
    });

    it('handles non-Error exceptions', async () => {
      mockGetServerSession.mockRejectedValue('string error');

      const res = await GET(makeRequest({ userId: OTHER_USER_ID, type: 'followers' }));
      expect(res.status).toBe(500);
    });

    it('handles null data from primary query gracefully', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);

      const primaryBuilder: Record<string, ReturnType<typeof vi.fn>> = {};
      primaryBuilder.select = vi.fn().mockReturnValue(primaryBuilder);
      primaryBuilder.eq = vi.fn().mockReturnValue(primaryBuilder);
      primaryBuilder.range = vi.fn().mockReturnValue(primaryBuilder);
      primaryBuilder.order = vi.fn().mockResolvedValue({ data: null, error: null, count: 0 });

      mockFrom.mockReturnValue(primaryBuilder);

      const res = await GET(makeRequest({ userId: OTHER_USER_ID, type: 'followers' }));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.users).toEqual([]);
    });
  });
});
