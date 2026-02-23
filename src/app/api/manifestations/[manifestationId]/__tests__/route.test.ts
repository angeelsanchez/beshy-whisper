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

vi.mock('@/lib/constants', () => ({
  UUID_REGEX: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
}));

import { GET, PATCH, DELETE } from '../route';

const USER_ID = '550e8400-e29b-41d4-a716-446655440000';
const OTHER_USER_ID = '770e8400-e29b-41d4-a716-446655440002';
const MANIFESTATION_ID = '660e8400-e29b-41d4-a716-446655440001';
const INVALID_ID = 'not-a-uuid';

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
  status: 'active',
  fulfilled_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

function makeParams(id: string) {
  return { params: Promise.resolve({ manifestationId: id }) };
}

function makeRequest(method: string, body?: Record<string, unknown>): NextRequest {
  return new NextRequest(`http://localhost/api/manifestations/${MANIFESTATION_ID}`, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: { 'Content-Type': 'application/json' },
  });
}

function buildOwnershipChain(
  data: unknown,
  error: { message: string } | null = null,
) {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({ data, error }),
      }),
    }),
  };
}

function buildFullSelectChain(
  data: unknown,
  error: { message: string } | null = null,
) {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data, error }),
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
      eq: vi.fn().mockResolvedValue({ data, error }),
    }),
  };
}

function buildUpdateChain(
  data: unknown,
  error: { message: string } | null = null,
) {
  return {
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data, error }),
        }),
      }),
    }),
  };
}

function buildDeleteChain(error: { message: string } | null = null) {
  return {
    delete: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error }),
    }),
  };
}

describe('GET /api/manifestations/[manifestationId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when no session', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await GET(makeRequest('GET'), makeParams(MANIFESTATION_ID));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe('Unauthorized');
  });

  it('returns 401 when session has no user id', async () => {
    mockGetServerSession.mockResolvedValue({ user: { email: 'test@test.com' } });
    const res = await GET(makeRequest('GET'), makeParams(MANIFESTATION_ID));
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid UUID', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    const res = await GET(makeRequest('GET'), makeParams(INVALID_ID));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Invalid manifestation ID');
  });

  it('returns 500 when ownership query fails', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    mockFrom.mockReturnValueOnce(
      buildOwnershipChain(null, { message: 'DB error' }),
    );
    const res = await GET(makeRequest('GET'), makeParams(MANIFESTATION_ID));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('Internal server error');
  });

  it('returns 404 when manifestation not found', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    mockFrom.mockReturnValueOnce(buildOwnershipChain(null));
    const res = await GET(makeRequest('GET'), makeParams(MANIFESTATION_ID));
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe('Manifestation not found');
  });

  it('returns 403 when manifestation belongs to another user (IDOR)', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    mockFrom.mockReturnValueOnce(
      buildOwnershipChain({ id: MANIFESTATION_ID, user_id: OTHER_USER_ID, status: 'active' }),
    );
    const res = await GET(makeRequest('GET'), makeParams(MANIFESTATION_ID));
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toBe('Forbidden');
  });

  it('returns 500 when full fetch query fails', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return buildOwnershipChain({ id: MANIFESTATION_ID, user_id: USER_ID, status: 'active' });
      }
      return buildFullSelectChain(null, { message: 'Fetch error' });
    });
    const res = await GET(makeRequest('GET'), makeParams(MANIFESTATION_ID));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('Failed to fetch manifestation');
  });

  it('returns manifestation with enriched data', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return buildOwnershipChain({ id: MANIFESTATION_ID, user_id: USER_ID, status: 'active' });
      }
      if (callCount === 2) {
        return buildFullSelectChain(manifestationRow);
      }
      return buildLogsSelectChain([
        { reaffirmed_at: today },
        { reaffirmed_at: '2024-01-01' },
      ]);
    });
    const res = await GET(makeRequest('GET'), makeParams(MANIFESTATION_ID));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.manifestation.id).toBe(MANIFESTATION_ID);
    expect(json.manifestation.content).toBe(manifestationRow.content);
    expect(json.manifestation.reaffirmationCount).toBe(2);
    expect(json.manifestation.reaffirmedToday).toBe(true);
    expect(json.manifestation.daysManifesting).toBeGreaterThanOrEqual(1);
  });

  it('returns reaffirmedToday false when no log matches today', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return buildOwnershipChain({ id: MANIFESTATION_ID, user_id: USER_ID, status: 'active' });
      }
      if (callCount === 2) {
        return buildFullSelectChain(manifestationRow);
      }
      return buildLogsSelectChain([{ reaffirmed_at: '2024-01-01' }]);
    });
    const res = await GET(makeRequest('GET'), makeParams(MANIFESTATION_ID));
    const json = await res.json();
    expect(json.manifestation.reaffirmedToday).toBe(false);
  });

  it('handles null logs gracefully', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return buildOwnershipChain({ id: MANIFESTATION_ID, user_id: USER_ID, status: 'active' });
      }
      if (callCount === 2) {
        return buildFullSelectChain(manifestationRow);
      }
      return buildLogsSelectChain(null);
    });
    const res = await GET(makeRequest('GET'), makeParams(MANIFESTATION_ID));
    const json = await res.json();
    expect(json.manifestation.reaffirmationCount).toBe(0);
    expect(json.manifestation.reaffirmedToday).toBe(false);
  });

  it('returns 500 when unexpected exception is thrown', async () => {
    mockGetServerSession.mockRejectedValue(new Error('Unexpected'));
    const res = await GET(makeRequest('GET'), makeParams(MANIFESTATION_ID));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('Internal server error');
  });
});

describe('PATCH /api/manifestations/[manifestationId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when no session', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await PATCH(makeRequest('PATCH', { content: 'Updated' }), makeParams(MANIFESTATION_ID));
    expect(res.status).toBe(401);
  });

  it('returns 401 when session has no user id', async () => {
    mockGetServerSession.mockResolvedValue({ user: { email: 'test@test.com' } });
    const res = await PATCH(makeRequest('PATCH', { content: 'Updated' }), makeParams(MANIFESTATION_ID));
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid UUID', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    const res = await PATCH(makeRequest('PATCH', { content: 'Updated' }), makeParams(INVALID_ID));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Invalid manifestation ID');
  });

  it('returns 404 when manifestation not found', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    mockFrom.mockReturnValueOnce(buildOwnershipChain(null));
    const res = await PATCH(makeRequest('PATCH', { content: 'Updated' }), makeParams(MANIFESTATION_ID));
    expect(res.status).toBe(404);
  });

  it('returns 403 when manifestation belongs to another user (IDOR)', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    mockFrom.mockReturnValueOnce(
      buildOwnershipChain({ id: MANIFESTATION_ID, user_id: OTHER_USER_ID, status: 'active' }),
    );
    const res = await PATCH(makeRequest('PATCH', { content: 'Updated' }), makeParams(MANIFESTATION_ID));
    expect(res.status).toBe(403);
  });

  it('returns 400 for invalid request data (status not in enum)', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    mockFrom.mockReturnValueOnce(
      buildOwnershipChain({ id: MANIFESTATION_ID, user_id: USER_ID, status: 'active' }),
    );
    const res = await PATCH(makeRequest('PATCH', { status: 'invalid' }), makeParams(MANIFESTATION_ID));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Invalid request data');
  });

  it('returns 400 when no fields to update', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    mockFrom.mockReturnValueOnce(
      buildOwnershipChain({ id: MANIFESTATION_ID, user_id: USER_ID, status: 'active' }),
    );
    const res = await PATCH(makeRequest('PATCH', {}), makeParams(MANIFESTATION_ID));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('No fields to update');
  });

  it('returns 500 when update query fails', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return buildOwnershipChain({ id: MANIFESTATION_ID, user_id: USER_ID, status: 'active' });
      }
      return buildUpdateChain(null, { message: 'Update failed' });
    });
    const res = await PATCH(makeRequest('PATCH', { content: 'Updated content' }), makeParams(MANIFESTATION_ID));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('Failed to update manifestation');
  });

  it('updates content successfully', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    const updatedRow = { ...manifestationRow, content: 'Updated content' };
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return buildOwnershipChain({ id: MANIFESTATION_ID, user_id: USER_ID, status: 'active' });
      }
      return buildUpdateChain(updatedRow);
    });
    const res = await PATCH(makeRequest('PATCH', { content: 'Updated content' }), makeParams(MANIFESTATION_ID));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.manifestation.content).toBe('Updated content');
  });

  it('updates status to archived successfully', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    const updatedRow = { ...manifestationRow, status: 'archived' };
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return buildOwnershipChain({ id: MANIFESTATION_ID, user_id: USER_ID, status: 'active' });
      }
      return buildUpdateChain(updatedRow);
    });
    const res = await PATCH(makeRequest('PATCH', { status: 'archived' }), makeParams(MANIFESTATION_ID));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.manifestation.status).toBe('archived');
  });

  it('sets fulfilled_at when status is updated to fulfilled', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    let capturedUpdates: Record<string, unknown> | null = null;
    mockFrom.mockImplementation(() => {
      const callCount = mockFrom.mock.calls.length;
      if (callCount === 1) {
        return buildOwnershipChain({ id: MANIFESTATION_ID, user_id: USER_ID, status: 'active' });
      }
      return {
        update: vi.fn().mockImplementation((data: Record<string, unknown>) => {
          capturedUpdates = data;
          return {
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { ...manifestationRow, status: 'fulfilled', fulfilled_at: new Date().toISOString() },
                  error: null,
                }),
              }),
            }),
          };
        }),
      };
    });
    const res = await PATCH(makeRequest('PATCH', { status: 'fulfilled' }), makeParams(MANIFESTATION_ID));
    expect(res.status).toBe(200);
    expect(capturedUpdates).toBeTruthy();
    expect(capturedUpdates!.fulfilled_at).toBeDefined();
    expect(capturedUpdates!.status).toBe('fulfilled');
  });

  it('does not set fulfilled_at when status is not fulfilled', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    let capturedUpdates: Record<string, unknown> | null = null;
    mockFrom.mockImplementation(() => {
      const callCount = mockFrom.mock.calls.length;
      if (callCount === 1) {
        return buildOwnershipChain({ id: MANIFESTATION_ID, user_id: USER_ID, status: 'active' });
      }
      return {
        update: vi.fn().mockImplementation((data: Record<string, unknown>) => {
          capturedUpdates = data;
          return {
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { ...manifestationRow, status: 'archived' },
                  error: null,
                }),
              }),
            }),
          };
        }),
      };
    });
    await PATCH(makeRequest('PATCH', { status: 'archived' }), makeParams(MANIFESTATION_ID));
    expect(capturedUpdates).toBeTruthy();
    expect(capturedUpdates!.fulfilled_at).toBeUndefined();
  });

  it('returns 400 when content exceeds 200 characters', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    mockFrom.mockReturnValueOnce(
      buildOwnershipChain({ id: MANIFESTATION_ID, user_id: USER_ID, status: 'active' }),
    );
    const res = await PATCH(
      makeRequest('PATCH', { content: 'a'.repeat(201) }),
      makeParams(MANIFESTATION_ID),
    );
    expect(res.status).toBe(400);
  });

  it('returns 500 when unexpected exception is thrown', async () => {
    mockGetServerSession.mockRejectedValue(new Error('Unexpected'));
    const res = await PATCH(makeRequest('PATCH', { content: 'Updated' }), makeParams(MANIFESTATION_ID));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('Internal server error');
  });
});

describe('DELETE /api/manifestations/[manifestationId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when no session', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await DELETE(makeRequest('DELETE'), makeParams(MANIFESTATION_ID));
    expect(res.status).toBe(401);
  });

  it('returns 401 when session has no user id', async () => {
    mockGetServerSession.mockResolvedValue({ user: { email: 'test@test.com' } });
    const res = await DELETE(makeRequest('DELETE'), makeParams(MANIFESTATION_ID));
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid UUID', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    const res = await DELETE(makeRequest('DELETE'), makeParams(INVALID_ID));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Invalid manifestation ID');
  });

  it('returns 404 when manifestation not found', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    mockFrom.mockReturnValueOnce(buildOwnershipChain(null));
    const res = await DELETE(makeRequest('DELETE'), makeParams(MANIFESTATION_ID));
    expect(res.status).toBe(404);
  });

  it('returns 403 when manifestation belongs to another user (IDOR)', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    mockFrom.mockReturnValueOnce(
      buildOwnershipChain({ id: MANIFESTATION_ID, user_id: OTHER_USER_ID, status: 'active' }),
    );
    const res = await DELETE(makeRequest('DELETE'), makeParams(MANIFESTATION_ID));
    expect(res.status).toBe(403);
  });

  it('returns 400 when trying to delete a fulfilled manifestation', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    mockFrom.mockReturnValueOnce(
      buildOwnershipChain({ id: MANIFESTATION_ID, user_id: USER_ID, status: 'fulfilled' }),
    );
    const res = await DELETE(makeRequest('DELETE'), makeParams(MANIFESTATION_ID));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Cannot delete a fulfilled manifestation');
  });

  it('returns 500 when delete query fails', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return buildOwnershipChain({ id: MANIFESTATION_ID, user_id: USER_ID, status: 'active' });
      }
      return buildDeleteChain({ message: 'Delete failed' });
    });
    const res = await DELETE(makeRequest('DELETE'), makeParams(MANIFESTATION_ID));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('Failed to delete manifestation');
  });

  it('deletes active manifestation successfully', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return buildOwnershipChain({ id: MANIFESTATION_ID, user_id: USER_ID, status: 'active' });
      }
      return buildDeleteChain();
    });
    const res = await DELETE(makeRequest('DELETE'), makeParams(MANIFESTATION_ID));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it('can delete archived manifestation', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return buildOwnershipChain({ id: MANIFESTATION_ID, user_id: USER_ID, status: 'archived' });
      }
      return buildDeleteChain();
    });
    const res = await DELETE(makeRequest('DELETE'), makeParams(MANIFESTATION_ID));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it('returns 500 when unexpected exception is thrown', async () => {
    mockGetServerSession.mockRejectedValue(new Error('Unexpected'));
    const res = await DELETE(makeRequest('DELETE'), makeParams(MANIFESTATION_ID));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('Internal server error');
  });
});
