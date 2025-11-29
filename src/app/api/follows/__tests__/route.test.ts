import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { mockGetServerSession, mockQueryBuilder, mockSendPushToUser } = vi.hoisted(() => {
  const mockGetServerSession = vi.fn();
  const mockSendPushToUser = vi.fn().mockResolvedValue(true);

  const mockQueryBuilder: Record<string, ReturnType<typeof vi.fn>> = {};
  mockQueryBuilder.select = vi.fn().mockReturnValue(mockQueryBuilder);
  mockQueryBuilder.insert = vi.fn().mockResolvedValue({ error: null });
  mockQueryBuilder.delete = vi.fn().mockReturnValue(mockQueryBuilder);
  mockQueryBuilder.eq = vi.fn().mockReturnValue(mockQueryBuilder);
  mockQueryBuilder.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
  mockQueryBuilder.single = vi.fn().mockResolvedValue({ data: { bsy_id: 'BSY001', name: 'Test' }, error: null });

  return { mockGetServerSession, mockQueryBuilder, mockSendPushToUser };
});

vi.mock('next-auth/next', () => ({
  getServerSession: mockGetServerSession,
}));

vi.mock('../../auth/[...nextauth]/auth', () => ({
  authOptions: {},
}));

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: vi.fn(() => mockQueryBuilder),
  },
}));

vi.mock('@/lib/push-notify', () => ({
  sendPushToUser: mockSendPushToUser,
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { POST } from '../route';

const USER_ID = '550e8400-e29b-41d4-a716-446655440000';
const TARGET_ID = '660e8400-e29b-41d4-a716-446655440001';

const mockSession = {
  user: { id: USER_ID, email: 'test@test.com', alias: 'BSY001', bsy_id: 'BSY001', name: 'Test', role: 'user' },
  expires: new Date(Date.now() + 86400000).toISOString(),
};

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/follows', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

describe('POST /api/follows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQueryBuilder.select.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.eq.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.delete.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.insert.mockResolvedValue({ error: null });
    mockQueryBuilder.maybeSingle.mockResolvedValue({ data: null, error: null });
    mockQueryBuilder.single.mockResolvedValue({ data: { bsy_id: 'BSY001', name: 'Test' }, error: null });
  });

  it('returns 401 without session', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await POST(makeRequest({ targetUserId: TARGET_ID }));
    expect(res.status).toBe(401);
  });

  it('returns 400 with invalid data', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it('returns 400 when trying to follow yourself', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    const res = await POST(makeRequest({ targetUserId: USER_ID }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Cannot follow yourself');
  });

  it('returns 404 when target user not found', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    mockQueryBuilder.maybeSingle.mockResolvedValue({ data: null, error: null });
    const res = await POST(makeRequest({ targetUserId: TARGET_ID }));
    expect(res.status).toBe(404);
  });

  it('unfollows when already following', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    let maybeSingleCalls = 0;
    mockQueryBuilder.maybeSingle.mockImplementation(() => {
      maybeSingleCalls++;
      if (maybeSingleCalls === 1) {
        return Promise.resolve({ data: { id: TARGET_ID }, error: null });
      }
      return Promise.resolve({ data: { follower_id: USER_ID }, error: null });
    });

    const res = await POST(makeRequest({ targetUserId: TARGET_ID }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.action).toBe('unfollowed');
    expect(json.isFollowing).toBe(false);
    expect(mockSendPushToUser).not.toHaveBeenCalled();
  });

  it('follows successfully', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    let maybeSingleCalls = 0;
    mockQueryBuilder.maybeSingle.mockImplementation(() => {
      maybeSingleCalls++;
      if (maybeSingleCalls === 1) {
        return Promise.resolve({ data: { id: TARGET_ID }, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });
    mockQueryBuilder.insert.mockResolvedValueOnce({ error: null });

    const res = await POST(makeRequest({ targetUserId: TARGET_ID }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.action).toBe('followed');
    expect(json.isFollowing).toBe(true);
  });

  it('returns 500 when insert fails', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    let maybeSingleCalls = 0;
    mockQueryBuilder.maybeSingle.mockImplementation(() => {
      maybeSingleCalls++;
      if (maybeSingleCalls === 1) {
        return Promise.resolve({ data: { id: TARGET_ID }, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });
    mockQueryBuilder.insert.mockResolvedValueOnce({ error: { message: 'insert error' } });

    const res = await POST(makeRequest({ targetUserId: TARGET_ID }));
    expect(res.status).toBe(500);
  });
});
