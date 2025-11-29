import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { mockGetServerSession, mockQueryBuilder } = vi.hoisted(() => {
  const mockGetServerSession = vi.fn();

  const mockQueryBuilder: Record<string, ReturnType<typeof vi.fn>> = {};
  mockQueryBuilder.select = vi.fn().mockReturnValue(mockQueryBuilder);
  mockQueryBuilder.delete = vi.fn().mockReturnValue(mockQueryBuilder);
  mockQueryBuilder.eq = vi.fn().mockReturnValue(mockQueryBuilder);
  mockQueryBuilder.single = vi.fn().mockResolvedValue({ data: null, error: null });

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

import { DELETE } from '../route';

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';
const OTHER_UUID = '550e8400-e29b-41d4-a716-446655440001';
const ENTRY_UUID = '550e8400-e29b-41d4-a716-446655440002';

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

function makeRequest(entryId?: string): NextRequest {
  const url = entryId
    ? `http://localhost/api/posts/delete?entryId=${entryId}`
    : 'http://localhost/api/posts/delete';
  return new NextRequest(url, { method: 'DELETE' });
}

describe('DELETE /api/posts/delete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQueryBuilder.select.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.delete.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.eq.mockReturnValue(mockQueryBuilder);
  });

  it('returns 401 without session', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await DELETE(makeRequest(ENTRY_UUID));
    expect(res.status).toBe(401);
  });

  it('returns 400 without entryId', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    const res = await DELETE(makeRequest());
    expect(res.status).toBe(400);
  });

  it('returns 400 with invalid entryId', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    const res = await DELETE(makeRequest('not-a-uuid'));
    expect(res.status).toBe(400);
  });

  it('returns 404 when entry not found', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    mockQueryBuilder.single.mockResolvedValueOnce({ data: null, error: null });
    const res = await DELETE(makeRequest(ENTRY_UUID));
    expect(res.status).toBe(404);
  });

  it('returns 403 when entry belongs to another user', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    mockQueryBuilder.single.mockResolvedValueOnce({ data: { user_id: OTHER_UUID }, error: null });
    const res = await DELETE(makeRequest(ENTRY_UUID));
    expect(res.status).toBe(403);
  });

  it('returns 200 on successful deletion', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    mockQueryBuilder.single.mockResolvedValueOnce({ data: { user_id: VALID_UUID }, error: null });
    const res = await DELETE(makeRequest(ENTRY_UUID));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });
});
