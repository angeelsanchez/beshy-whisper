import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { mockGetServerSession, mockQueryBuilder, mockRpc } = vi.hoisted(() => {
  const mockGetServerSession = vi.fn();

  const mockQueryBuilder: Record<string, ReturnType<typeof vi.fn>> = {};
  mockQueryBuilder.select = vi.fn().mockReturnValue(mockQueryBuilder);
  mockQueryBuilder.update = vi.fn().mockReturnValue(mockQueryBuilder);
  mockQueryBuilder.eq = vi.fn().mockReturnValue(mockQueryBuilder);
  mockQueryBuilder.single = vi.fn().mockResolvedValue({ data: null, error: null });

  const mockRpc = vi.fn();

  return { mockGetServerSession, mockQueryBuilder, mockRpc };
});

vi.mock('next-auth', () => ({
  getServerSession: mockGetServerSession,
}));

vi.mock('../../../auth/[...nextauth]/auth', () => ({
  authOptions: {},
}));

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: vi.fn(() => mockQueryBuilder),
    rpc: mockRpc,
  },
}));

import { POST } from '../route';

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';

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
  return new NextRequest('http://localhost/api/user/update-name', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

describe('POST /api/user/update-name', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQueryBuilder.update.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.eq.mockReturnValue(mockQueryBuilder);
  });

  it('returns 401 without session', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await POST(makeRequest({ name: 'New Name' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 with empty name', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    const res = await POST(makeRequest({ name: '' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 with name exceeding 50 chars', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    const res = await POST(makeRequest({ name: 'a'.repeat(51) }));
    expect(res.status).toBe(400);
  });

  it('returns 403 when cooldown not expired', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    mockRpc.mockResolvedValueOnce({ data: false, error: null });
    const res = await POST(makeRequest({ name: 'New Name' }));
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.message).toContain('14 days');
  });

  it('returns 200 on successful name update', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    mockRpc.mockResolvedValueOnce({ data: true, error: null });
    const res = await POST(makeRequest({ name: 'New Name' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.name).toBe('New Name');
  });
});
