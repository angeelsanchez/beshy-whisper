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

import { POST } from '../route';

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

const activeManifestationRow = {
  id: MANIFESTATION_ID,
  user_id: USER_ID,
  content: 'I am achieving my goals',
  status: 'active',
  created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
};

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/manifestations/fulfill', {
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
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({ data, error }),
      }),
    }),
  };
}

function buildUpdateChain(error: { message: string } | null = null) {
  return {
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error }),
    }),
  };
}

function buildLogsCountChain(data: { id: string }[]) {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data, error: null }),
    }),
  };
}

describe('POST /api/manifestations/fulfill', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when no session', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await POST(makeRequest({ manifestationId: MANIFESTATION_ID }));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe('Unauthorized');
  });

  it('returns 401 when session has no user id', async () => {
    mockGetServerSession.mockResolvedValue({ user: { email: 'test@test.com' } });
    const res = await POST(makeRequest({ manifestationId: MANIFESTATION_ID }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when manifestationId is missing', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Invalid request data');
  });

  it('returns 400 when manifestationId is not a UUID format (Zod)', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    const res = await POST(makeRequest({ manifestationId: 'not-uuid' }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Invalid request data');
  });

  it('returns 400 when manifestationId fails UUID_REGEX after Zod', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    const res = await POST(makeRequest({ manifestationId: INVALID_ID }));
    expect(res.status).toBe(400);
  });

  it('returns 500 when fetch query fails', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    mockFrom.mockReturnValueOnce(
      buildFetchChain(null, { message: 'DB error' }),
    );
    const res = await POST(makeRequest({ manifestationId: MANIFESTATION_ID }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('Failed to fulfill manifestation');
  });

  it('returns 404 when manifestation is not found', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    mockFrom.mockReturnValueOnce(buildFetchChain(null));
    const res = await POST(makeRequest({ manifestationId: MANIFESTATION_ID }));
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe('Manifestation not found');
  });

  it('returns 403 when manifestation belongs to another user (IDOR)', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    mockFrom.mockReturnValueOnce(
      buildFetchChain({ ...activeManifestationRow, user_id: OTHER_USER_ID }),
    );
    const res = await POST(makeRequest({ manifestationId: MANIFESTATION_ID }));
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toBe('Forbidden');
  });

  it('returns 400 when manifestation is already fulfilled', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    mockFrom.mockReturnValueOnce(
      buildFetchChain({ ...activeManifestationRow, status: 'fulfilled' }),
    );
    const res = await POST(makeRequest({ manifestationId: MANIFESTATION_ID }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Only active manifestations can be fulfilled');
  });

  it('returns 400 when manifestation is archived', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    mockFrom.mockReturnValueOnce(
      buildFetchChain({ ...activeManifestationRow, status: 'archived' }),
    );
    const res = await POST(makeRequest({ manifestationId: MANIFESTATION_ID }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Only active manifestations can be fulfilled');
  });

  it('returns 500 when update query fails', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return buildFetchChain(activeManifestationRow);
      }
      return buildUpdateChain({ message: 'Update failed' });
    });
    const res = await POST(makeRequest({ manifestationId: MANIFESTATION_ID }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('Failed to fulfill manifestation');
  });

  it('fulfills manifestation successfully and returns enriched response', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return buildFetchChain(activeManifestationRow);
      }
      if (callCount === 2) {
        return buildUpdateChain();
      }
      return buildLogsCountChain([{ id: 'log-1' }, { id: 'log-2' }]);
    });
    const res = await POST(makeRequest({ manifestationId: MANIFESTATION_ID }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.manifestation.id).toBe(MANIFESTATION_ID);
    expect(json.manifestation.content).toBe(activeManifestationRow.content);
    expect(json.manifestation.status).toBe('fulfilled');
    expect(json.manifestation.fulfilledAt).toBeDefined();
    expect(json.manifestation.reaffirmationCount).toBe(2);
    expect(json.manifestation.daysManifesting).toBeGreaterThanOrEqual(1);
  });

  it('computes daysManifesting correctly for older manifestation', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    const oldManifestation = {
      ...activeManifestationRow,
      created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    };
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return buildFetchChain(oldManifestation);
      }
      if (callCount === 2) {
        return buildUpdateChain();
      }
      return buildLogsCountChain([]);
    });
    const res = await POST(makeRequest({ manifestationId: MANIFESTATION_ID }));
    const json = await res.json();
    expect(json.manifestation.daysManifesting).toBeGreaterThanOrEqual(10);
  });

  it('returns reaffirmationCount 0 when no logs exist', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return buildFetchChain(activeManifestationRow);
      }
      if (callCount === 2) {
        return buildUpdateChain();
      }
      return buildLogsCountChain([]);
    });
    const res = await POST(makeRequest({ manifestationId: MANIFESTATION_ID }));
    const json = await res.json();
    expect(json.manifestation.reaffirmationCount).toBe(0);
  });

  it('handles null logs gracefully (reaffirmationCount 0)', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return buildFetchChain(activeManifestationRow);
      }
      if (callCount === 2) {
        return buildUpdateChain();
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      };
    });
    const res = await POST(makeRequest({ manifestationId: MANIFESTATION_ID }));
    const json = await res.json();
    expect(json.manifestation.reaffirmationCount).toBe(0);
  });

  it('returns 500 when unexpected exception is thrown', async () => {
    mockGetServerSession.mockRejectedValue(new Error('Unexpected'));
    const res = await POST(makeRequest({ manifestationId: MANIFESTATION_ID }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('Internal server error');
  });

  it('returns 500 when request body is invalid JSON', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    const badRequest = new NextRequest('http://localhost/api/manifestations/fulfill', {
      method: 'POST',
      body: 'not-json',
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(badRequest);
    expect(res.status).toBe(500);
  });
});
