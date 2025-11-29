import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { mockGetServerSession, mockQueryBuilder } = vi.hoisted(() => {
  const mockGetServerSession = vi.fn();

  const mockQueryBuilder: Record<string, ReturnType<typeof vi.fn>> = {};
  mockQueryBuilder.select = vi.fn().mockReturnValue(mockQueryBuilder);
  mockQueryBuilder.update = vi.fn().mockReturnValue(mockQueryBuilder);
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

import { PUT } from '../route';

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

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/posts/update', {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

describe('PUT /api/posts/update', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQueryBuilder.select.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.update.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.eq.mockReturnValue(mockQueryBuilder);
  });

  it('returns 401 without session', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await PUT(makeRequest({ entryId: ENTRY_UUID, mensaje: 'updated' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 without entryId', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    const res = await PUT(makeRequest({ mensaje: 'updated' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 without mensaje or is_private', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    const res = await PUT(makeRequest({ entryId: ENTRY_UUID }));
    expect(res.status).toBe(400);
  });

  it('returns 400 with invalid entryId', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    const res = await PUT(makeRequest({ entryId: 'not-a-uuid', mensaje: 'updated' }));
    expect(res.status).toBe(400);
  });

  it('returns 403 when entry belongs to another user', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    mockQueryBuilder.single.mockResolvedValueOnce({ data: { user_id: OTHER_UUID }, error: null });
    const res = await PUT(makeRequest({ entryId: ENTRY_UUID, mensaje: 'updated' }));
    expect(res.status).toBe(403);
  });

  it('returns 200 on successful message update', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    mockQueryBuilder.single.mockResolvedValueOnce({ data: { user_id: VALID_UUID }, error: null });
    const res = await PUT(makeRequest({ entryId: ENTRY_UUID, mensaje: 'updated text' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it('returns 200 on successful privacy update', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    mockQueryBuilder.single.mockResolvedValueOnce({ data: { user_id: VALID_UUID }, error: null });
    const res = await PUT(makeRequest({ entryId: ENTRY_UUID, is_private: true }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });
});
