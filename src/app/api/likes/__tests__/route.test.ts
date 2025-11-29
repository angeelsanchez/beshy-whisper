import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { mockGetServerSession, mockQueryBuilder, mockRpc } = vi.hoisted(() => {
  const mockGetServerSession = vi.fn();

  const mockQueryBuilder: Record<string, ReturnType<typeof vi.fn>> = {};
  mockQueryBuilder.select = vi.fn().mockReturnValue(mockQueryBuilder);
  mockQueryBuilder.insert = vi.fn().mockReturnValue(mockQueryBuilder);
  mockQueryBuilder.delete = vi.fn().mockReturnValue(mockQueryBuilder);
  mockQueryBuilder.eq = vi.fn().mockReturnValue(mockQueryBuilder);
  mockQueryBuilder.single = vi.fn().mockResolvedValue({ data: null, error: null });
  mockQueryBuilder.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });

  const mockRpc = vi.fn();

  return { mockGetServerSession, mockQueryBuilder, mockRpc };
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
    rpc: mockRpc,
  },
}));

vi.mock('web-push', () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn(),
  },
  setVapidDetails: vi.fn(),
  sendNotification: vi.fn(),
}));

import { POST } from '../route';

const mockSession = {
  user: {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'test@test.com',
    alias: 'BSY001',
    bsy_id: 'BSY001',
    name: 'Test',
    role: 'user',
  },
  expires: new Date(Date.now() + 86400000).toISOString(),
};

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/likes', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

describe('POST /api/likes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 without session', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const res = await POST(makeRequest({ entryId: '550e8400-e29b-41d4-a716-446655440001' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 without entryId', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);

    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it('returns 400 with invalid entryId format', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);

    const res = await POST(makeRequest({ entryId: 'not-a-uuid' }));
    expect(res.status).toBe(400);
  });

  it('returns 200 on successful like toggle via RPC', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    mockRpc.mockResolvedValue({ data: { action: 'liked', liked: true }, error: null });

    const res = await POST(makeRequest({ entryId: '550e8400-e29b-41d4-a716-446655440001' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.action).toBe('liked');
    expect(json.liked).toBe(true);
  });

  it('returns 200 on successful unlike toggle via RPC', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    mockRpc.mockResolvedValue({ data: { action: 'unliked', liked: false }, error: null });

    const res = await POST(makeRequest({ entryId: '550e8400-e29b-41d4-a716-446655440001' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.action).toBe('unliked');
    expect(json.liked).toBe(false);
  });
});
