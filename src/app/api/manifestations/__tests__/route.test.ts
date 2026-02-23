import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetServerSession = vi.fn();
const mockFrom = vi.fn();

vi.mock('next-auth/next', () => ({
  getServerSession: () => mockGetServerSession(),
}));

vi.mock('@/app/api/auth/[...nextauth]/auth', () => ({
  authOptions: {},
}));

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: { from: (...args: unknown[]) => mockFrom(...args) },
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { GET, POST } from '../route';

const USER_ID = '550e8400-e29b-41d4-a716-446655440000';
const MANIFESTATION_ID = '660e8400-e29b-41d4-a716-446655440001';

const mockSession = {
  user: {
    id: USER_ID,
    email: 'test@test.com',
    alias: 'BSY001',
    bsy_id: 'BSY001',
    name: 'TestUser',
    role: 'user',
  },
  expires: new Date(Date.now() + 86400000).toISOString(),
};

const today = new Date().toISOString().split('T')[0];

const manifestationRow = {
  id: MANIFESTATION_ID,
  user_id: USER_ID,
  content: 'I am healthy and thriving',
  status: 'active' as const,
  fulfilled_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

function makePostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/manifestations', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

function buildSelectChain(
  data: unknown,
  error: { message: string } | null = null,
) {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data, error }),
        }),
      }),
    }),
  };
}

function buildSelectCountChain(
  count: number | null,
  error: { message: string } | null = null,
) {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ count, error }),
      }),
    }),
  };
}

function buildLogsSelectChain(
  data: unknown,
  error: { message: string } | null = null,
) {
  return {
    select: vi.fn().mockReturnValue({
      in: vi.fn().mockResolvedValue({ data, error }),
    }),
  };
}

function buildInsertChain(
  data: unknown,
  error: { message: string } | null = null,
) {
  return {
    insert: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data, error }),
      }),
    }),
  };
}

describe('GET /api/manifestations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when no session', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe('Unauthorized');
  });

  it('returns 401 when session has no user id', async () => {
    mockGetServerSession.mockResolvedValue({ user: { email: 'test@test.com' } });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns 500 when manifestations query fails', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    mockFrom.mockReturnValueOnce(buildSelectChain(null, { message: 'DB error' }));
    const res = await GET();
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('Failed to fetch manifestations');
  });

  it('returns empty array when no manifestations exist', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    mockFrom.mockReturnValueOnce(buildSelectChain([]));
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.manifestations).toEqual([]);
  });

  it('returns empty array when manifestations is null', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    mockFrom.mockReturnValueOnce(buildSelectChain(null));
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.manifestations).toEqual([]);
  });

  it('returns enriched manifestations with log data', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return buildSelectChain([manifestationRow]);
      }
      return buildLogsSelectChain([
        { manifestation_id: MANIFESTATION_ID, reaffirmed_at: today },
        { manifestation_id: MANIFESTATION_ID, reaffirmed_at: '2024-01-01' },
      ]);
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.manifestations).toHaveLength(1);
    const m = json.manifestations[0];
    expect(m.id).toBe(MANIFESTATION_ID);
    expect(m.content).toBe(manifestationRow.content);
    expect(m.status).toBe('active');
    expect(m.reaffirmationCount).toBe(2);
    expect(m.reaffirmedToday).toBe(true);
    expect(m.daysManifesting).toBeGreaterThanOrEqual(1);
  });

  it('sets reaffirmedToday to false when no log matches today', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return buildSelectChain([manifestationRow]);
      }
      return buildLogsSelectChain([
        { manifestation_id: MANIFESTATION_ID, reaffirmed_at: '2024-01-01' },
      ]);
    });

    const res = await GET();
    const json = await res.json();
    expect(json.manifestations[0].reaffirmedToday).toBe(false);
    expect(json.manifestations[0].reaffirmationCount).toBe(1);
  });

  it('handles logs query error gracefully and still returns manifestations', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return buildSelectChain([manifestationRow]);
      }
      return buildLogsSelectChain(null, { message: 'logs error' });
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.manifestations).toHaveLength(1);
    expect(json.manifestations[0].reaffirmationCount).toBe(0);
    expect(json.manifestations[0].reaffirmedToday).toBe(false);
  });

  it('handles null logs gracefully', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return buildSelectChain([manifestationRow]);
      }
      return buildLogsSelectChain(null);
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.manifestations[0].reaffirmationCount).toBe(0);
  });

  it('sets daysManifesting to at least 1 for brand new manifestation', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);

    const freshManifestation = {
      ...manifestationRow,
      created_at: new Date().toISOString(),
    };

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return buildSelectChain([freshManifestation]);
      }
      return buildLogsSelectChain([]);
    });

    const res = await GET();
    const json = await res.json();
    expect(json.manifestations[0].daysManifesting).toBe(1);
  });

  it('returns 500 when an unexpected exception is thrown', async () => {
    mockGetServerSession.mockRejectedValue(new Error('Unexpected failure'));
    const res = await GET();
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('Internal server error');
  });
});

describe('POST /api/manifestations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when no session', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await POST(makePostRequest({ content: 'I am abundant' }));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe('Unauthorized');
  });

  it('returns 401 when session has no user id', async () => {
    mockGetServerSession.mockResolvedValue({ user: { email: 'test@test.com' } });
    const res = await POST(makePostRequest({ content: 'I am abundant' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when content is missing', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    const res = await POST(makePostRequest({}));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Invalid request data');
  });

  it('returns 400 when content is empty string', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    const res = await POST(makePostRequest({ content: '' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when content exceeds 200 characters', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    const res = await POST(makePostRequest({ content: 'a'.repeat(201) }));
    expect(res.status).toBe(400);
  });

  it('returns 500 when count query fails', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    mockFrom.mockReturnValueOnce(
      buildSelectCountChain(null, { message: 'Count error' }),
    );
    const res = await POST(makePostRequest({ content: 'I am thriving' }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('Failed to create manifestation');
  });

  it('returns 400 when user already has 5 active manifestations', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    mockFrom.mockReturnValueOnce(buildSelectCountChain(5));
    const res = await POST(makePostRequest({ content: 'I am thriving' }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('5');
  });

  it('returns 400 when count is above limit', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    mockFrom.mockReturnValueOnce(buildSelectCountChain(6));
    const res = await POST(makePostRequest({ content: 'I am thriving' }));
    expect(res.status).toBe(400);
  });

  it('returns 500 when insert fails', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return buildSelectCountChain(0);
      }
      return buildInsertChain(null, { message: 'Insert failed' });
    });
    const res = await POST(makePostRequest({ content: 'I am thriving' }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('Failed to create manifestation');
  });

  it('creates manifestation successfully and returns 201', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    const insertedData = {
      id: MANIFESTATION_ID,
      user_id: USER_ID,
      content: 'I am thriving',
      status: 'active',
      fulfilled_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return buildSelectCountChain(2);
      }
      return buildInsertChain(insertedData);
    });
    const res = await POST(makePostRequest({ content: 'I am thriving' }));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.manifestation.id).toBe(MANIFESTATION_ID);
    expect(json.manifestation.content).toBe('I am thriving');
    expect(json.manifestation.status).toBe('active');
    expect(json.manifestation.daysManifesting).toBe(1);
    expect(json.manifestation.reaffirmationCount).toBe(0);
    expect(json.manifestation.reaffirmedToday).toBe(false);
  });

  it('allows creation when count is exactly 4 (below limit)', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    const insertedData = {
      id: MANIFESTATION_ID,
      content: 'One more manifestation',
      status: 'active',
      fulfilled_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return buildSelectCountChain(4);
      }
      return buildInsertChain(insertedData);
    });
    const res = await POST(makePostRequest({ content: 'One more manifestation' }));
    expect(res.status).toBe(201);
  });

  it('trims whitespace from content', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    const insertedData = {
      id: MANIFESTATION_ID,
      content: 'Trimmed content',
      status: 'active',
      fulfilled_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    let insertedPayload: Record<string, unknown> | null = null;
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return buildSelectCountChain(0);
      }
      return {
        insert: vi.fn().mockImplementation((data: Record<string, unknown>) => {
          insertedPayload = data;
          return {
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: insertedData, error: null }),
            }),
          };
        }),
      };
    });
    await POST(makePostRequest({ content: '  Trimmed content  ' }));
    expect(insertedPayload).toBeTruthy();
    expect(insertedPayload!.content).toBe('Trimmed content');
  });

  it('returns 500 when an unexpected exception is thrown', async () => {
    mockGetServerSession.mockRejectedValue(new Error('Unexpected'));
    const res = await POST(makePostRequest({ content: 'I am thriving' }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('Internal server error');
  });

  it('returns 500 when request body is invalid JSON', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    const badRequest = new NextRequest('http://localhost/api/manifestations', {
      method: 'POST',
      body: 'not-json',
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(badRequest);
    expect(res.status).toBe(500);
  });

  it('allows count null to be treated as 0', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    const insertedData = {
      id: MANIFESTATION_ID,
      content: 'I manifest abundance',
      status: 'active',
      fulfilled_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return buildSelectCountChain(null);
      }
      return buildInsertChain(insertedData);
    });
    const res = await POST(makePostRequest({ content: 'I manifest abundance' }));
    expect(res.status).toBe(201);
  });
});
