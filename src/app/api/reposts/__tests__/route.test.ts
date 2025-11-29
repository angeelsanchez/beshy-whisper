import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { mockGetServerSession, mockFrom, mockQueryBuilder } = vi.hoisted(() => {
  const mockGetServerSession = vi.fn();

  const mockQueryBuilder: Record<string, ReturnType<typeof vi.fn>> = {};
  mockQueryBuilder.select = vi.fn().mockReturnValue(mockQueryBuilder);
  mockQueryBuilder.insert = vi.fn().mockResolvedValue({ data: null, error: null });
  mockQueryBuilder.delete = vi.fn().mockReturnValue(mockQueryBuilder);
  mockQueryBuilder.eq = vi.fn().mockReturnValue(mockQueryBuilder);
  mockQueryBuilder.single = vi.fn().mockResolvedValue({ data: null, error: null });
  mockQueryBuilder.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });

  const mockFrom = vi.fn(() => mockQueryBuilder);

  return { mockGetServerSession, mockFrom, mockQueryBuilder };
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

vi.mock('@/lib/push-notify', () => ({
  sendPushToUserIfEnabled: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import { POST } from '../route';

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

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/reposts', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

describe('POST /api/reposts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.select = vi.fn().mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.insert = vi.fn().mockResolvedValue({ data: null, error: null });
    mockQueryBuilder.delete = vi.fn().mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.eq = vi.fn().mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
  });

  it('returns 401 without session', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await POST(makeRequest({ entryId: VALID_ENTRY_ID }));
    expect(res.status).toBe(401);
  });

  it('returns 400 without entryId', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it('returns 400 with invalid entryId', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    const res = await POST(makeRequest({ entryId: 'not-a-uuid' }));
    expect(res.status).toBe(400);
  });

  it('returns 200 on successful repost (insert)', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    mockQueryBuilder.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    mockQueryBuilder.insert = vi.fn().mockResolvedValue({ data: null, error: null });

    const res = await POST(makeRequest({ entryId: VALID_ENTRY_ID }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.action).toBe('reposted');
    expect(json.reposted).toBe(true);
  });

  it('returns 200 on successful unrepost (delete)', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);

    const selectBuilder: Record<string, ReturnType<typeof vi.fn>> = {};
    selectBuilder.select = vi.fn().mockReturnValue(selectBuilder);
    selectBuilder.eq = vi.fn().mockReturnValue(selectBuilder);
    selectBuilder.maybeSingle = vi.fn().mockResolvedValue({ data: { id: 'some-id' }, error: null });

    const deleteBuilder: Record<string, ReturnType<typeof vi.fn>> = {};
    deleteBuilder.delete = vi.fn().mockReturnValue(deleteBuilder);
    deleteBuilder.eq = vi.fn()
      .mockReturnValueOnce(deleteBuilder)
      .mockResolvedValueOnce({ error: null });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? selectBuilder : deleteBuilder;
    });

    const res = await POST(makeRequest({ entryId: VALID_ENTRY_ID }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.action).toBe('unreposted');
    expect(json.reposted).toBe(false);
  });
});
