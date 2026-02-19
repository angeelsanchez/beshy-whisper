import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetServerSession = vi.fn();
const mockFrom = vi.fn();
const mockSendPushToUserIfEnabled = vi.fn();
const mockInvalidateStreakCache = vi.fn();

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

vi.mock('@/lib/push-notify', () => ({
  sendPushToUserIfEnabled: (...args: unknown[]) => mockSendPushToUserIfEnabled(...args),
}));

vi.mock('@/lib/cache/streaks', () => ({
  invalidateStreakCache: (...args: unknown[]) => mockInvalidateStreakCache(...args),
}));

import { POST } from '../route';

const USER_ID = '550e8400-e29b-41d4-a716-446655440000';
const ENTRY_ID = '660e8400-e29b-41d4-a716-446655440001';

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

const validDayBody = {
  mensaje: 'Today was a good day',
  franja: 'DIA',
  is_private: false,
  objectives: ['Do something great'],
  mood: 'feliz',
  habitSnapshots: [],
};

const validNightBody = {
  mensaje: 'Night reflections',
  franja: 'NOCHE',
  is_private: false,
  objectives: [],
  mood: 'tranquilo',
  habitSnapshots: [
    {
      habitId: '770e8400-e29b-41d4-a716-446655440002',
      habitName: 'Exercise',
      habitIcon: null,
      habitColor: '#4A2E1B',
      trackingType: 'binary',
      targetValue: null,
      unit: null,
      completedValue: null,
      isCompleted: true,
    },
  ],
};

const createdEntry = {
  id: ENTRY_ID,
  user_id: USER_ID,
  nombre: 'TestUser',
  mensaje: 'Today was a good day',
  fecha: new Date().toISOString(),
  franja: 'DIA',
  guest: false,
  is_private: false,
  mood: 'feliz',
};

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/posts/create', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': '127.0.0.1',
    },
  });
}

function buildCheckExistingChain(data: unknown[], error: { message: string } | null = null) {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            lt: vi.fn().mockResolvedValue({ data, error }),
          }),
        }),
      }),
    }),
  };
}

function buildInsertEntryChain(
  data: Record<string, unknown> | null,
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

function buildInsertObjectivesChain(
  data: unknown[] | null = [],
  error: { message: string } | null = null,
) {
  return {
    insert: vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({ data, error }),
    }),
  };
}

function buildFollowersSelectChain(
  data: { follower_id: string }[] | null = null,
  error: { message: string } | null = null,
) {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data, error }),
    }),
  };
}

describe('POST /api/posts/create', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvalidateStreakCache.mockResolvedValue(undefined);
    mockSendPushToUserIfEnabled.mockResolvedValue(true);
  });

  it('returns 401 when no session', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const res = await POST(makeRequest(validDayBody));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe('Unauthorized');
  });

  it('returns 401 when session has no user id', async () => {
    mockGetServerSession.mockResolvedValue({ user: { email: 'test@test.com' } });

    const res = await POST(makeRequest(validDayBody));
    expect(res.status).toBe(401);
  });

  it('returns 400 when mensaje is missing', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);

    const res = await POST(makeRequest({ franja: 'DIA' }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Invalid request data');
  });

  it('returns 400 when mensaje is empty string', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);

    const res = await POST(makeRequest({ mensaje: '', franja: 'DIA' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when mensaje exceeds 300 chars', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);

    const res = await POST(makeRequest({ mensaje: 'a'.repeat(301), franja: 'DIA' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when franja is invalid', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);

    const res = await POST(makeRequest({ mensaje: 'hello', franja: 'INVALID' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when mood is invalid enum value', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);

    const res = await POST(makeRequest({ ...validDayBody, mood: 'nonexistent' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when weekly whisper has more than 3 objectives', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);

    const res = await POST(makeRequest({
      mensaje: 'Week summary',
      franja: 'SEMANA',
      objectives: ['obj1', 'obj2', 'obj3', 'obj4'],
    }));
    expect(res.status).toBe(400);
  });

  it('returns 500 when checking existing posts fails', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);

    mockFrom.mockReturnValueOnce(
      buildCheckExistingChain([], { message: 'DB error' }),
    );

    const res = await POST(makeRequest(validDayBody));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('Internal server error');
  });

  it('returns 409 when user already posted for the same franja today', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);

    mockFrom.mockReturnValueOnce(
      buildCheckExistingChain([{ id: 'existing-post-id' }]),
    );

    const res = await POST(makeRequest(validDayBody));
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toContain('Ya has publicado');
  });

  it('returns 409 with correct franja label for DIA', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);

    mockFrom.mockReturnValueOnce(
      buildCheckExistingChain([{ id: 'existing-post-id' }]),
    );

    const res = await POST(makeRequest(validDayBody));
    const json = await res.json();
    expect(json.error).toContain('día');
  });

  it('returns 409 with correct franja label for NOCHE', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);

    mockFrom.mockReturnValueOnce(
      buildCheckExistingChain([{ id: 'existing-post-id' }]),
    );

    const res = await POST(makeRequest({
      ...validNightBody,
      habitSnapshots: [],
    }));
    const json = await res.json();
    expect(json.error).toContain('noche');
  });

  it('returns 500 when entry insert fails', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return buildCheckExistingChain([]);
      }
      return buildInsertEntryChain(null, { message: 'Insert failed' });
    });

    const res = await POST(makeRequest(validDayBody));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('Failed to create post');
  });

  it('returns 500 when entry insert returns no data', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return buildCheckExistingChain([]);
      }
      return buildInsertEntryChain(null);
    });

    const res = await POST(makeRequest(validDayBody));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('Failed to create post');
  });

  it('creates a DIA post with objectives successfully', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);

    const savedObjectives = [
      { id: 'obj-1', entry_id: ENTRY_ID, user_id: USER_ID, text: 'Do something great', done: false },
    ];

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return buildCheckExistingChain([]);
      }
      if (callCount === 2) {
        return buildInsertEntryChain(createdEntry);
      }
      if (callCount === 3) {
        return buildInsertObjectivesChain(savedObjectives);
      }
      return buildFollowersSelectChain([]);
    });

    const res = await POST(makeRequest(validDayBody));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.entry).toEqual(createdEntry);
    expect(json.objectives).toEqual(savedObjectives);
    expect(json.habitSnapshots).toEqual([]);
  });

  it('creates a NOCHE post with habit snapshots successfully', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);

    const savedSnapshots = [
      {
        id: 'snap-1',
        entry_id: ENTRY_ID,
        habit_id: '770e8400-e29b-41d4-a716-446655440002',
        habit_name: 'Exercise',
        is_completed: true,
      },
    ];

    const nightEntry = { ...createdEntry, franja: 'NOCHE', mood: 'tranquilo' };

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return buildCheckExistingChain([]);
      }
      if (callCount === 2) {
        return buildInsertEntryChain(nightEntry);
      }
      if (callCount === 3) {
        return buildInsertObjectivesChain(savedSnapshots);
      }
      return buildFollowersSelectChain([]);
    });

    const res = await POST(makeRequest(validNightBody));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.entry).toEqual(nightEntry);
    expect(json.habitSnapshots).toEqual(savedSnapshots);
  });

  it('invalidates streak cache after successful post creation', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return buildCheckExistingChain([]);
      }
      if (callCount === 2) {
        return buildInsertEntryChain(createdEntry);
      }
      if (callCount === 3) {
        return buildInsertObjectivesChain([{ id: 'obj-1' }]);
      }
      return buildFollowersSelectChain([]);
    });

    await POST(makeRequest(validDayBody));
    expect(mockInvalidateStreakCache).toHaveBeenCalledWith(USER_ID);
  });

  it('does not insert objectives for DIA when objectives array is empty', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);

    const bodyNoObjectives = { ...validDayBody, objectives: [] };

    let callCount = 0;
    mockFrom.mockImplementation((table: string) => {
      callCount++;
      if (callCount === 1) {
        return buildCheckExistingChain([]);
      }
      if (callCount === 2) {
        return buildInsertEntryChain(createdEntry);
      }
      if (table === 'follows') {
        return buildFollowersSelectChain([]);
      }
      return buildFollowersSelectChain([]);
    });

    const res = await POST(makeRequest(bodyNoObjectives));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.objectives).toEqual([]);
  });

  it('does not insert habit snapshots for NOCHE when array is empty', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);

    const bodyNoSnapshots = { ...validNightBody, habitSnapshots: [] };
    const nightEntry = { ...createdEntry, franja: 'NOCHE' };

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return buildCheckExistingChain([]);
      }
      if (callCount === 2) {
        return buildInsertEntryChain(nightEntry);
      }
      return buildFollowersSelectChain([]);
    });

    const res = await POST(makeRequest(bodyNoSnapshots));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.habitSnapshots).toEqual([]);
  });

  it('still returns 201 when objectives insert fails', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return buildCheckExistingChain([]);
      }
      if (callCount === 2) {
        return buildInsertEntryChain(createdEntry);
      }
      if (callCount === 3) {
        return buildInsertObjectivesChain(null, { message: 'Objectives insert failed' });
      }
      return buildFollowersSelectChain([]);
    });

    const res = await POST(makeRequest(validDayBody));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.objectives).toEqual([]);
  });

  it('still returns 201 when habit snapshot insert fails', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);

    const nightEntry = { ...createdEntry, franja: 'NOCHE' };

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return buildCheckExistingChain([]);
      }
      if (callCount === 2) {
        return buildInsertEntryChain(nightEntry);
      }
      if (callCount === 3) {
        return buildInsertObjectivesChain(null, { message: 'Snapshot insert failed' });
      }
      return buildFollowersSelectChain([]);
    });

    const res = await POST(makeRequest(validNightBody));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.habitSnapshots).toEqual([]);
  });

  it('does not notify followers when post is private', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);

    const privateBody = { ...validDayBody, is_private: true, objectives: [] };

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return buildCheckExistingChain([]);
      }
      return buildInsertEntryChain(createdEntry);
    });

    const res = await POST(makeRequest(privateBody));
    expect(res.status).toBe(201);
    expect(mockSendPushToUserIfEnabled).not.toHaveBeenCalled();
  });

  it('notifies followers when post is public', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);

    const followerId = '880e8400-e29b-41d4-a716-446655440003';

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return buildCheckExistingChain([]);
      }
      if (callCount === 2) {
        return buildInsertEntryChain(createdEntry);
      }
      if (callCount === 3) {
        return buildInsertObjectivesChain([{ id: 'obj-1' }]);
      }
      return buildFollowersSelectChain([{ follower_id: followerId }]);
    });

    const res = await POST(makeRequest(validDayBody));
    expect(res.status).toBe(201);

    await vi.waitFor(() => {
      expect(mockSendPushToUserIfEnabled).toHaveBeenCalledWith(
        followerId,
        expect.objectContaining({
          title: expect.stringContaining('TestUser'),
          tag: 'follow-post-notification',
        }),
        'follow_post',
      );
    });
  });

  it('uses alias as fallback when name is not available', async () => {
    const sessionNoName = {
      ...mockSession,
      user: { ...mockSession.user, name: undefined, alias: 'AnonymousAlias' },
    };
    mockGetServerSession.mockResolvedValue(sessionNoName);

    const followerId = '880e8400-e29b-41d4-a716-446655440003';

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return buildCheckExistingChain([]);
      }
      if (callCount === 2) {
        return buildInsertEntryChain(createdEntry);
      }
      if (callCount === 3) {
        return buildInsertObjectivesChain([{ id: 'obj-1' }]);
      }
      return buildFollowersSelectChain([{ follower_id: followerId }]);
    });

    await POST(makeRequest(validDayBody));

    await vi.waitFor(() => {
      expect(mockSendPushToUserIfEnabled).toHaveBeenCalledWith(
        followerId,
        expect.objectContaining({
          title: expect.stringContaining('AnonymousAlias'),
        }),
        'follow_post',
      );
    });
  });

  it('uses "Alguien" as fallback when neither name nor alias exist', async () => {
    const sessionNoNameOrAlias = {
      ...mockSession,
      user: { ...mockSession.user, name: undefined, alias: undefined },
    };
    mockGetServerSession.mockResolvedValue(sessionNoNameOrAlias);

    const followerId = '880e8400-e29b-41d4-a716-446655440003';

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return buildCheckExistingChain([]);
      }
      if (callCount === 2) {
        return buildInsertEntryChain(createdEntry);
      }
      if (callCount === 3) {
        return buildInsertObjectivesChain([]);
      }
      return buildFollowersSelectChain([{ follower_id: followerId }]);
    });

    await POST(makeRequest(validDayBody));

    await vi.waitFor(() => {
      expect(mockSendPushToUserIfEnabled).toHaveBeenCalledWith(
        followerId,
        expect.objectContaining({
          title: expect.stringContaining('Alguien'),
        }),
        'follow_post',
      );
    });
  });

  it('does not crash when follower notification fails', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return buildCheckExistingChain([]);
      }
      if (callCount === 2) {
        return buildInsertEntryChain(createdEntry);
      }
      if (callCount === 3) {
        return buildInsertObjectivesChain([]);
      }
      return buildFollowersSelectChain(null, { message: 'Followers query failed' });
    });

    const res = await POST(makeRequest(validDayBody));
    expect(res.status).toBe(201);
  });

  it('extracts IP from x-forwarded-for header', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);

    const privateBody = { ...validDayBody, is_private: true, objectives: [] };

    let insertCall: Record<string, unknown> | null = null;

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return buildCheckExistingChain([]);
      }
      return {
        insert: vi.fn().mockImplementation((data: Record<string, unknown>) => {
          insertCall = data;
          return {
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: createdEntry, error: null }),
            }),
          };
        }),
      };
    });

    await POST(makeRequest(privateBody));
    expect(insertCall).toBeTruthy();
    expect(insertCall!.ip).toBe('127.0.0.1');
  });

  it('returns 500 when request.json() throws', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);

    const badRequest = new NextRequest('http://localhost/api/posts/create', {
      method: 'POST',
      body: 'not-json',
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(badRequest);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('Internal server error');
  });

  it('defaults is_private to false when not provided', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);

    const bodyWithoutPrivate = {
      mensaje: 'Hello world',
      franja: 'DIA',
    };

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return buildCheckExistingChain([]);
      }
      if (callCount === 2) {
        return buildInsertEntryChain(createdEntry);
      }
      return buildFollowersSelectChain([]);
    });

    const res = await POST(makeRequest(bodyWithoutPrivate));
    expect(res.status).toBe(201);
  });

  it('accepts null mood value', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);

    const bodyWithNullMood = { ...validDayBody, mood: null, objectives: [] };

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return buildCheckExistingChain([]);
      }
      if (callCount === 2) {
        return buildInsertEntryChain({ ...createdEntry, mood: null });
      }
      return buildFollowersSelectChain([]);
    });

    const res = await POST(makeRequest(bodyWithNullMood));
    expect(res.status).toBe(201);
  });

  it('trims whitespace from mensaje', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);

    const bodyWithSpaces = {
      ...validDayBody,
      mensaje: '  Hello world  ',
      objectives: [],
      is_private: true,
    };

    let insertedData: Record<string, unknown> | null = null;

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return buildCheckExistingChain([]);
      }
      return {
        insert: vi.fn().mockImplementation((data: Record<string, unknown>) => {
          insertedData = data;
          return {
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: createdEntry, error: null }),
            }),
          };
        }),
      };
    });

    const res = await POST(makeRequest(bodyWithSpaces));
    expect(res.status).toBe(201);
    expect(insertedData).toBeTruthy();
    expect(insertedData!.mensaje).toBe('Hello world');
  });

  it('accepts SEMANA franja with up to 3 objectives', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);

    const weekBody = {
      mensaje: 'Weekly reflection',
      franja: 'SEMANA',
      objectives: ['obj1', 'obj2', 'obj3'],
      is_private: true,
    };

    const weekEntry = { ...createdEntry, franja: 'SEMANA' };

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return buildCheckExistingChain([]);
      }
      return buildInsertEntryChain(weekEntry);
    });

    const res = await POST(makeRequest(weekBody));
    expect(res.status).toBe(201);
  });
});
