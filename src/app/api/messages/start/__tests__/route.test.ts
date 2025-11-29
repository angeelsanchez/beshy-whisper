import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetServerSession = vi.fn();
const mockFrom = vi.fn();
const mockAreMutualFollows = vi.fn();
const mockGetCanonicalPair = vi.fn();

vi.mock('next-auth/next', () => ({
  getServerSession: () => mockGetServerSession(),
}));

vi.mock('@/app/api/auth/[...nextauth]/auth', () => ({
  authOptions: {},
}));

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: { from: () => mockFrom() },
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/mutual-follow', () => ({
  areMutualFollows: () => mockAreMutualFollows(),
  getCanonicalPair: (a: string, b: string) => mockGetCanonicalPair(a, b),
}));

import { POST } from '../route';

function createRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/messages/start', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('POST /api/messages/start', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCanonicalPair.mockImplementation((a: string, b: string) =>
      a < b ? { userAId: a, userBId: b } : { userAId: b, userBId: a }
    );
  });

  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const res = await POST(createRequest({ targetUserId: 'user-b' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid UUID', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-a' } });

    const res = await POST(createRequest({ targetUserId: 'not-a-uuid' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when targeting self', async () => {
    const userId = '12345678-1234-1234-1234-123456789abc';
    mockGetServerSession.mockResolvedValue({ user: { id: userId } });

    const res = await POST(createRequest({ targetUserId: userId }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('contigo mismo');
  });

  it('returns 404 when target user does not exist', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: '11111111-1111-1111-1111-111111111111' },
    });

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    });

    const res = await POST(
      createRequest({ targetUserId: '22222222-2222-2222-2222-222222222222' })
    );
    expect(res.status).toBe(404);
  });

  it('returns 403 when users are not mutual follows', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: '11111111-1111-1111-1111-111111111111' },
    });

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: '22222222-2222-2222-2222-222222222222' },
            error: null,
          }),
        }),
      }),
    });

    mockAreMutualFollows.mockResolvedValue(false);

    const res = await POST(
      createRequest({ targetUserId: '22222222-2222-2222-2222-222222222222' })
    );
    expect(res.status).toBe(403);
  });

  it('returns existing conversation if one exists', async () => {
    const userId = '11111111-1111-1111-1111-111111111111';
    const targetId = '22222222-2222-2222-2222-222222222222';
    const convId = '33333333-3333-3333-3333-333333333333';

    mockGetServerSession.mockResolvedValue({ user: { id: userId } });
    mockAreMutualFollows.mockResolvedValue(true);

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: targetId },
                error: null,
              }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: convId },
                error: null,
              }),
            }),
          }),
        }),
      };
    });

    const res = await POST(createRequest({ targetUserId: targetId }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.conversationId).toBe(convId);
  });

  it('creates new conversation when none exists', async () => {
    const userId = '11111111-1111-1111-1111-111111111111';
    const targetId = '22222222-2222-2222-2222-222222222222';
    const newConvId = '44444444-4444-4444-4444-444444444444';

    mockGetServerSession.mockResolvedValue({ user: { id: userId } });
    mockAreMutualFollows.mockResolvedValue(true);

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: targetId },
                error: null,
              }),
            }),
          }),
        };
      }
      if (callCount === 2) {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      return {
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: newConvId },
              error: null,
            }),
          }),
        }),
      };
    });

    const res = await POST(createRequest({ targetUserId: targetId }));
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.conversationId).toBe(newConvId);
  });
});
