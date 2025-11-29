import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { mockGetServerSession, mockQueryBuilder } = vi.hoisted(() => {
  const mockGetServerSession = vi.fn();

  const mockQueryBuilder: Record<string, ReturnType<typeof vi.fn>> = {};
  mockQueryBuilder.select = vi.fn().mockReturnValue(mockQueryBuilder);
  mockQueryBuilder.insert = vi.fn().mockReturnValue(mockQueryBuilder);
  mockQueryBuilder.eq = vi.fn().mockReturnValue(mockQueryBuilder);

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

import { POST } from '../route';

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';
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
  return new NextRequest('http://localhost/api/objectives/batch', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

describe('POST /api/objectives/batch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQueryBuilder.insert.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.select.mockResolvedValue({ data: [], error: null });
  });

  it('returns 401 without session', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await POST(makeRequest({ objectives: [] }));
    expect(res.status).toBe(401);
  });

  it('returns 400 without objectives array', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it('returns 400 with empty objectives array', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    const res = await POST(makeRequest({ objectives: [] }));
    expect(res.status).toBe(400);
  });

  it('returns 403 when objectives belong to another user', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    const res = await POST(makeRequest({
      objectives: [{ user_id: '550e8400-e29b-41d4-a716-446655440099', entry_id: ENTRY_UUID, text: 'test' }],
    }));
    expect(res.status).toBe(403);
  });

  it('returns 400 with invalid entry_id', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    const res = await POST(makeRequest({
      objectives: [{ user_id: VALID_UUID, entry_id: 'bad-id', text: 'test' }],
    }));
    expect(res.status).toBe(400);
  });

  it('returns 200 on successful batch save', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    const objectives = [
      { user_id: VALID_UUID, entry_id: ENTRY_UUID, text: 'Obj 1' },
      { user_id: VALID_UUID, entry_id: ENTRY_UUID, text: 'Obj 2' },
    ];
    const res = await POST(makeRequest({ objectives }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });
});
