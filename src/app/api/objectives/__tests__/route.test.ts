import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { mockGetServerSession, mockQueryBuilder } = vi.hoisted(() => {
  const mockGetServerSession = vi.fn();

  const mockQueryBuilder: Record<string, ReturnType<typeof vi.fn>> = {};
  mockQueryBuilder.select = vi.fn().mockReturnValue(mockQueryBuilder);
  mockQueryBuilder.update = vi.fn().mockReturnValue(mockQueryBuilder);
  mockQueryBuilder.delete = vi.fn().mockReturnValue(mockQueryBuilder);
  mockQueryBuilder.eq = vi.fn().mockReturnValue(mockQueryBuilder);
  mockQueryBuilder.single = vi.fn().mockResolvedValue({ data: null, error: null });

  return { mockGetServerSession, mockQueryBuilder };
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

import { PATCH, DELETE } from '../route';

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';
const OTHER_UUID = '550e8400-e29b-41d4-a716-446655440001';
const OBJ_UUID = '550e8400-e29b-41d4-a716-446655440002';

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

function makePatchRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/objectives', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

function makeDeleteRequest(objectiveId?: string): NextRequest {
  const url = objectiveId
    ? `http://localhost/api/objectives?objectiveId=${objectiveId}`
    : 'http://localhost/api/objectives';
  return new NextRequest(url, { method: 'DELETE' });
}

describe('PATCH /api/objectives', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQueryBuilder.select.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.update.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.eq.mockReturnValue(mockQueryBuilder);
  });

  it('returns 401 without session', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await PATCH(makePatchRequest({ objectiveId: OBJ_UUID, done: true }));
    expect(res.status).toBe(401);
  });

  it('returns 400 without objectiveId', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    const res = await PATCH(makePatchRequest({ done: true }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when done is not boolean', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    const res = await PATCH(makePatchRequest({ objectiveId: OBJ_UUID, done: 'yes' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 with invalid objectiveId', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    const res = await PATCH(makePatchRequest({ objectiveId: 'bad', done: true }));
    expect(res.status).toBe(400);
  });

  it('returns 403 when objective belongs to another user', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    mockQueryBuilder.single.mockResolvedValueOnce({ data: { user_id: OTHER_UUID }, error: null });
    const res = await PATCH(makePatchRequest({ objectiveId: OBJ_UUID, done: true }));
    expect(res.status).toBe(403);
  });

  it('returns 200 on successful update', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    mockQueryBuilder.single.mockResolvedValueOnce({ data: { user_id: VALID_UUID }, error: null });
    const res = await PATCH(makePatchRequest({ objectiveId: OBJ_UUID, done: true }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.done).toBe(true);
  });
});

describe('DELETE /api/objectives', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQueryBuilder.select.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.delete.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.eq.mockReturnValue(mockQueryBuilder);
  });

  it('returns 401 without session', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await DELETE(makeDeleteRequest(OBJ_UUID));
    expect(res.status).toBe(401);
  });

  it('returns 400 without objectiveId', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    const res = await DELETE(makeDeleteRequest());
    expect(res.status).toBe(400);
  });

  it('returns 403 when objective belongs to another user', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    mockQueryBuilder.single.mockResolvedValueOnce({ data: { user_id: OTHER_UUID }, error: null });
    const res = await DELETE(makeDeleteRequest(OBJ_UUID));
    expect(res.status).toBe(403);
  });

  it('returns 200 on successful deletion', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    mockQueryBuilder.single.mockResolvedValueOnce({ data: { user_id: VALID_UUID }, error: null });
    const res = await DELETE(makeDeleteRequest(OBJ_UUID));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });
});
