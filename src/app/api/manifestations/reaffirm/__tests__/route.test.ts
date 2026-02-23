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

import { POST } from '../route';

const USER_ID = '550e8400-e29b-41d4-a716-446655440000';
const OTHER_USER_ID = '770e8400-e29b-41d4-a716-446655440002';
const MANIFESTATION_ID_1 = '660e8400-e29b-41d4-a716-446655440001';
const MANIFESTATION_ID_2 = '880e8400-e29b-41d4-a716-446655440003';
const ENTRY_ID = '990e8400-e29b-41d4-a716-446655440004';

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

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/manifestations/reaffirm', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

function buildFetchChain(
  data: unknown,
  error: { message: string } | null = null,
) {
  return {
    select: vi.fn().mockReturnValue({
      in: vi.fn().mockResolvedValue({ data, error }),
    }),
  };
}

function buildUpsertChain(error: { message: string } | null = null) {
  return {
    upsert: vi.fn().mockResolvedValue({ error }),
  };
}

describe('POST /api/manifestations/reaffirm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when no session', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await POST(makeRequest({ manifestationIds: [MANIFESTATION_ID_1] }));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe('Unauthorized');
  });

  it('returns 401 when session has no user id', async () => {
    mockGetServerSession.mockResolvedValue({ user: { email: 'test@test.com' } });
    const res = await POST(makeRequest({ manifestationIds: [MANIFESTATION_ID_1] }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when manifestationIds is missing', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Invalid request data');
  });

  it('returns 400 when manifestationIds is an empty array', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    const res = await POST(makeRequest({ manifestationIds: [] }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Invalid request data');
  });

  it('returns 400 when manifestationIds contains invalid UUIDs', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    const res = await POST(makeRequest({ manifestationIds: ['not-a-uuid'] }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Invalid request data');
  });

  it('returns 400 when manifestationIds has more than 10 items', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    const ids = Array.from(
      { length: 11 },
      (_, i) => `${i}50e8400-e29b-41d4-a716-44665544000${i}`,
    );
    const res = await POST(makeRequest({ manifestationIds: ids }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when entryId is provided but is not a valid UUID', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    const res = await POST(makeRequest({
      manifestationIds: [MANIFESTATION_ID_1],
      entryId: 'not-a-uuid',
    }));
    expect(res.status).toBe(400);
  });

  it('returns 500 when fetch query fails', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    mockFrom.mockReturnValueOnce(
      buildFetchChain(null, { message: 'DB error' }),
    );
    const res = await POST(makeRequest({ manifestationIds: [MANIFESTATION_ID_1] }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('Failed to reaffirm manifestations');
  });

  it('returns 400 when no valid manifestations found (all belong to other user)', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    mockFrom.mockReturnValueOnce(
      buildFetchChain([
        { id: MANIFESTATION_ID_1, user_id: OTHER_USER_ID, status: 'active' },
      ]),
    );
    const res = await POST(makeRequest({ manifestationIds: [MANIFESTATION_ID_1] }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('No valid active manifestations to reaffirm');
  });

  it('returns 400 when all manifestations are not active (fulfilled)', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    mockFrom.mockReturnValueOnce(
      buildFetchChain([
        { id: MANIFESTATION_ID_1, user_id: USER_ID, status: 'fulfilled' },
      ]),
    );
    const res = await POST(makeRequest({ manifestationIds: [MANIFESTATION_ID_1] }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('No valid active manifestations to reaffirm');
  });

  it('returns 400 when all manifestations are archived', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    mockFrom.mockReturnValueOnce(
      buildFetchChain([
        { id: MANIFESTATION_ID_1, user_id: USER_ID, status: 'archived' },
      ]),
    );
    const res = await POST(makeRequest({ manifestationIds: [MANIFESTATION_ID_1] }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('No valid active manifestations to reaffirm');
  });

  it('returns 400 when fetch returns empty array', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    mockFrom.mockReturnValueOnce(buildFetchChain([]));
    const res = await POST(makeRequest({ manifestationIds: [MANIFESTATION_ID_1] }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when fetch returns null', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    mockFrom.mockReturnValueOnce(buildFetchChain(null));
    const res = await POST(makeRequest({ manifestationIds: [MANIFESTATION_ID_1] }));
    expect(res.status).toBe(400);
  });

  it('returns 500 when upsert fails', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return buildFetchChain([
          { id: MANIFESTATION_ID_1, user_id: USER_ID, status: 'active' },
        ]);
      }
      return buildUpsertChain({ message: 'Upsert failed' });
    });
    const res = await POST(makeRequest({ manifestationIds: [MANIFESTATION_ID_1] }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('Failed to reaffirm manifestations');
  });

  it('reaffirms a single active manifestation successfully', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return buildFetchChain([
          { id: MANIFESTATION_ID_1, user_id: USER_ID, status: 'active' },
        ]);
      }
      return buildUpsertChain();
    });
    const res = await POST(makeRequest({ manifestationIds: [MANIFESTATION_ID_1] }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.reaffirmed).toBe(1);
    expect(json.manifestationIds).toEqual([MANIFESTATION_ID_1]);
  });

  it('reaffirms multiple active manifestations successfully', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return buildFetchChain([
          { id: MANIFESTATION_ID_1, user_id: USER_ID, status: 'active' },
          { id: MANIFESTATION_ID_2, user_id: USER_ID, status: 'active' },
        ]);
      }
      return buildUpsertChain();
    });
    const res = await POST(makeRequest({
      manifestationIds: [MANIFESTATION_ID_1, MANIFESTATION_ID_2],
    }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.reaffirmed).toBe(2);
    expect(json.manifestationIds).toContain(MANIFESTATION_ID_1);
    expect(json.manifestationIds).toContain(MANIFESTATION_ID_2);
  });

  it('filters out manifestations belonging to other users', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return buildFetchChain([
          { id: MANIFESTATION_ID_1, user_id: USER_ID, status: 'active' },
          { id: MANIFESTATION_ID_2, user_id: OTHER_USER_ID, status: 'active' },
        ]);
      }
      return buildUpsertChain();
    });
    const res = await POST(makeRequest({
      manifestationIds: [MANIFESTATION_ID_1, MANIFESTATION_ID_2],
    }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.reaffirmed).toBe(1);
    expect(json.manifestationIds).toEqual([MANIFESTATION_ID_1]);
  });

  it('filters out non-active manifestations but reaffirms active ones', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return buildFetchChain([
          { id: MANIFESTATION_ID_1, user_id: USER_ID, status: 'active' },
          { id: MANIFESTATION_ID_2, user_id: USER_ID, status: 'fulfilled' },
        ]);
      }
      return buildUpsertChain();
    });
    const res = await POST(makeRequest({
      manifestationIds: [MANIFESTATION_ID_1, MANIFESTATION_ID_2],
    }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.reaffirmed).toBe(1);
    expect(json.manifestationIds).toEqual([MANIFESTATION_ID_1]);
  });

  it('accepts optional entryId and reaffirms successfully', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    let callCount = 0;
    let capturedUpsertPayload: unknown = null;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return buildFetchChain([
          { id: MANIFESTATION_ID_1, user_id: USER_ID, status: 'active' },
        ]);
      }
      return {
        upsert: vi.fn().mockImplementation((data: unknown) => {
          capturedUpsertPayload = data;
          return Promise.resolve({ error: null });
        }),
      };
    });
    const res = await POST(makeRequest({
      manifestationIds: [MANIFESTATION_ID_1],
      entryId: ENTRY_ID,
    }));
    expect(res.status).toBe(200);
    expect(capturedUpsertPayload).toBeTruthy();
    const payload = capturedUpsertPayload as Array<Record<string, unknown>>;
    expect(payload[0].entry_id).toBe(ENTRY_ID);
  });

  it('sets entry_id to null when entryId is not provided', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    let callCount = 0;
    let capturedUpsertPayload: unknown = null;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return buildFetchChain([
          { id: MANIFESTATION_ID_1, user_id: USER_ID, status: 'active' },
        ]);
      }
      return {
        upsert: vi.fn().mockImplementation((data: unknown) => {
          capturedUpsertPayload = data;
          return Promise.resolve({ error: null });
        }),
      };
    });
    const res = await POST(makeRequest({ manifestationIds: [MANIFESTATION_ID_1] }));
    expect(res.status).toBe(200);
    const payload = capturedUpsertPayload as Array<Record<string, unknown>>;
    expect(payload[0].entry_id).toBeNull();
  });

  it('inserts correct user_id and reaffirmed_at in log', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    const todayDate = new Date().toISOString().split('T')[0];
    let callCount = 0;
    let capturedUpsertPayload: unknown = null;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return buildFetchChain([
          { id: MANIFESTATION_ID_1, user_id: USER_ID, status: 'active' },
        ]);
      }
      return {
        upsert: vi.fn().mockImplementation((data: unknown) => {
          capturedUpsertPayload = data;
          return Promise.resolve({ error: null });
        }),
      };
    });
    await POST(makeRequest({ manifestationIds: [MANIFESTATION_ID_1] }));
    const payload = capturedUpsertPayload as Array<Record<string, unknown>>;
    expect(payload[0].user_id).toBe(USER_ID);
    expect(payload[0].reaffirmed_at).toBe(todayDate);
    expect(payload[0].manifestation_id).toBe(MANIFESTATION_ID_1);
  });

  it('returns 500 when unexpected exception is thrown', async () => {
    mockGetServerSession.mockRejectedValue(new Error('Unexpected'));
    const res = await POST(makeRequest({ manifestationIds: [MANIFESTATION_ID_1] }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('Internal server error');
  });

  it('returns 500 when request body is invalid JSON', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    const badRequest = new NextRequest('http://localhost/api/manifestations/reaffirm', {
      method: 'POST',
      body: 'not-json',
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(badRequest);
    expect(res.status).toBe(500);
  });
});
