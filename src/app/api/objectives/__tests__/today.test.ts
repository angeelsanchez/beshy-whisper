import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { mockGetServerSession, mockQueryBuilder } = vi.hoisted(() => {
  const mockGetServerSession = vi.fn();

  const mockQueryBuilder: Record<string, ReturnType<typeof vi.fn>> = {};
  mockQueryBuilder.select = vi.fn().mockReturnValue(mockQueryBuilder);
  mockQueryBuilder.eq = vi.fn().mockReturnValue(mockQueryBuilder);
  mockQueryBuilder.gte = vi.fn().mockReturnValue(mockQueryBuilder);
  mockQueryBuilder.lt = vi.fn().mockReturnValue(mockQueryBuilder);
  mockQueryBuilder.order = vi.fn().mockReturnValue(mockQueryBuilder);
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

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

import { GET } from '../today/route';

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';

const mockSession = {
  user: {
    id: VALID_UUID,
    email: 'test@test.com',
    alias: 'BSY001',
    name: 'Test',
    role: 'user',
  },
  expires: new Date(Date.now() + 86400000).toISOString(),
};

function makeGetRequest(franja = 'DIA'): NextRequest {
  return new NextRequest(`http://localhost/api/objectives/today?franja=${franja}`);
}

describe('GET /api/objectives/today', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQueryBuilder.select?.mockClear();
    mockQueryBuilder.eq?.mockClear();
    mockQueryBuilder.gte?.mockClear();
    mockQueryBuilder.lt?.mockClear();
    mockQueryBuilder.order?.mockClear();
    mockQueryBuilder.single?.mockClear();
  });

  it('returns 401 if no session', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const response = await GET(makeGetRequest());
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toContain('No autorizado');
  });

  it('returns 401 if user ID is missing', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: null },
    });

    const response = await GET(makeGetRequest());

    expect(response.status).toBe(401);
  });

  it('returns empty objectives when entry does not exist', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    mockQueryBuilder.single?.mockResolvedValue({
      data: null,
      error: { code: 'PGRST116' },
    });

    const response = await GET(makeGetRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.objectives).toEqual([]);
  });

  it('returns objectives when entry exists', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);

    const mockObjectives = [
      { id: 'obj-1', text: 'Objetivo 1', done: false },
      { id: 'obj-2', text: 'Objetivo 2', done: true },
    ];

    let fromCallCount = 0;
    const mockFrom = vi.fn((table: string) => {
      fromCallCount++;
      if (fromCallCount === 1 && table === 'entries') {
        mockQueryBuilder.single?.mockResolvedValueOnce({
          data: { id: 'entry-1' },
          error: null,
        });
      } else if (fromCallCount === 2 && table === 'objectives') {
        mockQueryBuilder.order?.mockResolvedValueOnce({
          data: mockObjectives,
          error: null,
        });
      }
      return mockQueryBuilder;
    });

    const { supabaseAdmin } = await import('@/lib/supabase-admin');
    vi.mocked(supabaseAdmin.from).mockImplementation(mockFrom);

    const response = await GET(makeGetRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.objectives).toEqual(mockObjectives);
    expect(data.entryId).toBe('entry-1');
  });

  it('filters by franja parameter', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    mockQueryBuilder.single?.mockResolvedValue({
      data: null,
      error: { code: 'PGRST116' },
    });

    const response = await GET(makeGetRequest('NOCHE'));
    await response.json();

    expect(response.status).toBe(200);
    expect(mockQueryBuilder.eq).toHaveBeenCalledWith('franja', 'NOCHE');
  });

  it('returns 500 on database error', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    mockQueryBuilder.single?.mockResolvedValue({
      data: null,
      error: { code: 'SOME_DB_ERROR', message: 'Database error' },
    });

    const response = await GET(makeGetRequest());

    expect(response.status).toBe(500);
  });
});
