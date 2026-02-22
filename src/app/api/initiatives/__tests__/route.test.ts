import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { mockGetServerSession, mockFrom } = vi.hoisted(() => {
  const mockGetServerSession = vi.fn();
  const mockFrom = vi.fn();
  return { mockGetServerSession, mockFrom };
});

vi.mock('next-auth/next', () => ({
  getServerSession: mockGetServerSession,
}));

vi.mock('../../auth/[...nextauth]/auth', () => ({
  authOptions: {},
}));

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: { from: mockFrom },
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import { GET, POST } from '../route';

const USER_UUID = '550e8400-e29b-41d4-a716-446655440000';
const INITIATIVE_UUID = '550e8400-e29b-41d4-a716-446655440099';

const mockUserSession = {
  user: {
    id: USER_UUID,
    email: 'user@test.com',
    alias: 'BSY001',
    bsy_id: 'BSY001',
    name: 'Test User',
    role: 'user',
  },
  expires: new Date(Date.now() + 86400000).toISOString(),
};

const mockAdminSession = {
  user: {
    id: USER_UUID,
    email: 'admin@test.com',
    alias: 'BSY002',
    bsy_id: 'BSY002',
    name: 'Admin User',
    role: 'admin',
  },
  expires: new Date(Date.now() + 86400000).toISOString(),
};

const mockInitiative = {
  id: INITIATIVE_UUID,
  name: 'Run 5K',
  description: 'Daily running challenge',
  icon: '🏃',
  color: '#4A2E1B',
  category: 'health',
  tracking_type: 'binary',
  target_value: null,
  unit: null,
  start_date: '2026-01-01',
  end_date: null,
  max_participants: null,
  reminder_time: null,
  participant_count: 10,
  is_active: true,
  creator_id: '550e8400-e29b-41d4-a716-446655440001',
};

function makeGetRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost/api/initiatives');
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new NextRequest(url);
}

function makePostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/initiatives', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

function createInitiativesListBuilder(
  data: Record<string, unknown>[],
  count: number = data.length,
  error: { message: string } | null = null,
) {
  const resolvedValue = { data, error, count };
  const b = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    range: vi.fn(),
    in: vi.fn(),
    then: (resolve: (v: typeof resolvedValue) => void) => resolve(resolvedValue),
  };
  b.select.mockReturnValue(b);
  b.eq.mockReturnValue(b);
  b.order.mockReturnValue(b);
  b.range.mockReturnValue(b);
  b.in.mockReturnValue(b);
  return b;
}

function createParticipantsBuilder(data: Array<{ initiative_id: string }> | null, error: { message: string } | null = null) {
  const b: Record<string, ReturnType<typeof vi.fn>> = {};
  b.select = vi.fn().mockReturnValue(b);
  b.eq = vi.fn()
    .mockReturnValueOnce(b)
    .mockResolvedValueOnce({ data, error });
  return b;
}

function createLogsBuilder(data: Array<{ initiative_id: string; user_id: string }> | null) {
  const b: Record<string, ReturnType<typeof vi.fn>> = {};
  b.select = vi.fn().mockReturnValue(b);
  b.in = vi.fn().mockReturnValue(b);
  b.eq = vi.fn().mockResolvedValue({ data });
  return b;
}

describe('GET /api/initiatives', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when no session', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe('Unauthorized');
  });

  it('returns 401 when session has no user id', async () => {
    mockGetServerSession.mockResolvedValue({ user: {}, expires: '' });
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid query parameters', async () => {
    mockGetServerSession.mockResolvedValue(mockUserSession);
    const res = await GET(makeGetRequest({ joined: 'maybe' }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Invalid query parameters');
  });

  it('returns 400 for page below minimum', async () => {
    mockGetServerSession.mockResolvedValue(mockUserSession);
    const res = await GET(makeGetRequest({ page: '0' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for limit exceeding max', async () => {
    mockGetServerSession.mockResolvedValue(mockUserSession);
    const res = await GET(makeGetRequest({ limit: '51' }));
    expect(res.status).toBe(400);
  });

  it('returns enriched initiatives list on happy path', async () => {
    mockGetServerSession.mockResolvedValue(mockUserSession);

    const initiative = { ...mockInitiative, participant_count: 5 };
    const listBuilder = createInitiativesListBuilder([initiative], 1);
    const participantsBuilder = createParticipantsBuilder([{ initiative_id: INITIATIVE_UUID }]);
    const logsBuilder = createLogsBuilder([{ initiative_id: INITIATIVE_UUID, user_id: USER_UUID }]);

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return listBuilder;
      if (callCount === 2) return participantsBuilder;
      return logsBuilder;
    });

    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.initiatives).toHaveLength(1);
    expect(json.total).toBe(1);
    expect(json.initiatives[0].is_joined).toBe(true);
    expect(json.initiatives[0].today_completed).toBe(true);
    expect(json.initiatives[0].today_completion_rate).toBeGreaterThanOrEqual(0);
  });

  it('returns is_joined=false and today_completed=false when user has not joined or checked in', async () => {
    mockGetServerSession.mockResolvedValue(mockUserSession);

    const listBuilder = createInitiativesListBuilder([mockInitiative], 1);
    const participantsBuilder = createParticipantsBuilder([]);
    const logsBuilder = createLogsBuilder([]);

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return listBuilder;
      if (callCount === 2) return participantsBuilder;
      return logsBuilder;
    });

    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.initiatives[0].is_joined).toBe(false);
    expect(json.initiatives[0].today_completed).toBe(false);
    expect(json.initiatives[0].today_completion_rate).toBe(0);
  });

  it('returns empty list when no initiatives exist', async () => {
    mockGetServerSession.mockResolvedValue(mockUserSession);

    const listBuilder = createInitiativesListBuilder([], 0);
    const participantsBuilder = createParticipantsBuilder([]);
    const logsBuilder = createLogsBuilder([]);

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return listBuilder;
      if (callCount === 2) return participantsBuilder;
      return logsBuilder;
    });

    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.initiatives).toEqual([]);
    expect(json.total).toBe(0);
  });

  it('returns 500 when initiatives query fails', async () => {
    mockGetServerSession.mockResolvedValue(mockUserSession);

    const listBuilder = createInitiativesListBuilder([], 0, { message: 'DB error' });
    const participantsBuilder = createParticipantsBuilder([]);

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return listBuilder;
      return participantsBuilder;
    });

    const res = await GET(makeGetRequest());
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('Failed to fetch initiatives');
  });

  it('returns empty initiatives immediately when joined=true and user has no participations', async () => {
    mockGetServerSession.mockResolvedValue(mockUserSession);

    const listBuilder = createInitiativesListBuilder([], 0);
    const joinedParticipantsBuilder = createParticipantsBuilder([]);

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return listBuilder;
      return joinedParticipantsBuilder;
    });

    const res = await GET(makeGetRequest({ joined: 'true' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.initiatives).toEqual([]);
    expect(json.total).toBe(0);
  });

  it('returns only joined initiatives when joined=true', async () => {
    mockGetServerSession.mockResolvedValue(mockUserSession);

    const listBuilder = createInitiativesListBuilder([mockInitiative], 1);
    const joinedParticipantsBuilder = createParticipantsBuilder([{ initiative_id: INITIATIVE_UUID }]);
    const allParticipantsBuilder = createParticipantsBuilder([{ initiative_id: INITIATIVE_UUID }]);
    const logsBuilder = createLogsBuilder([]);

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return listBuilder;
      if (callCount === 2) return joinedParticipantsBuilder;
      if (callCount === 3) return allParticipantsBuilder;
      return logsBuilder;
    });

    const res = await GET(makeGetRequest({ joined: 'true' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.initiatives).toHaveLength(1);
  });

  it('computes today_completion_rate=100 when all participants completed today', async () => {
    mockGetServerSession.mockResolvedValue(mockUserSession);

    const initiative = { ...mockInitiative, participant_count: 2 };
    const otherUserId = '550e8400-e29b-41d4-a716-446655440002';

    const listBuilder = createInitiativesListBuilder([initiative], 1);
    const participantsBuilder = createParticipantsBuilder([{ initiative_id: INITIATIVE_UUID }]);
    const logsBuilder = createLogsBuilder([
      { initiative_id: INITIATIVE_UUID, user_id: USER_UUID },
      { initiative_id: INITIATIVE_UUID, user_id: otherUserId },
    ]);

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return listBuilder;
      if (callCount === 2) return participantsBuilder;
      return logsBuilder;
    });

    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.initiatives[0].today_completion_rate).toBe(100);
  });

  it('uses participant_count=1 as denominator when initiative has 0 participants', async () => {
    mockGetServerSession.mockResolvedValue(mockUserSession);

    const initiative = { ...mockInitiative, participant_count: 0 };

    const listBuilder = createInitiativesListBuilder([initiative], 1);
    const participantsBuilder = createParticipantsBuilder([]);
    const logsBuilder = createLogsBuilder([{ initiative_id: INITIATIVE_UUID, user_id: USER_UUID }]);

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return listBuilder;
      if (callCount === 2) return participantsBuilder;
      return logsBuilder;
    });

    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.initiatives[0].today_completion_rate).toBe(100);
  });

  it('respects page and limit query parameters', async () => {
    mockGetServerSession.mockResolvedValue(mockUserSession);

    const listBuilder = createInitiativesListBuilder([], 0);
    const participantsBuilder = createParticipantsBuilder([]);
    const logsBuilder = createLogsBuilder([]);

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return listBuilder;
      if (callCount === 2) return participantsBuilder;
      return logsBuilder;
    });

    const res = await GET(makeGetRequest({ page: '2', limit: '10' }));
    expect(res.status).toBe(200);
    expect(listBuilder.range).toHaveBeenCalledWith(10, 19);
  });

  it('returns 500 when getServerSession throws', async () => {
    mockGetServerSession.mockRejectedValue(new Error('Session failure'));
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(500);
  });

  it('handles null data from supabase initiatives query gracefully', async () => {
    mockGetServerSession.mockResolvedValue(mockUserSession);

    const b: Record<string, ReturnType<typeof vi.fn>> = {};
    b.select = vi.fn().mockReturnValue(b);
    b.eq = vi.fn().mockReturnValue(b);
    b.order = vi.fn().mockReturnValue(b);
    b.range = vi.fn().mockResolvedValue({ data: null, error: null, count: 0 });
    b.in = vi.fn().mockReturnValue(b);

    const participantsBuilder = createParticipantsBuilder([]);
    const logsBuilder = createLogsBuilder([]);

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return b;
      if (callCount === 2) return participantsBuilder;
      return logsBuilder;
    });

    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.initiatives).toEqual([]);
    expect(json.total).toBe(0);
  });
});

describe('POST /api/initiatives', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const validBinaryBody = {
    name: 'Run 5K',
    description: 'Daily running challenge',
    color: '#4A2E1B',
    trackingType: 'binary',
    startDate: '2026-02-01',
  };

  it('returns 401 when no session', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await POST(makePostRequest(validBinaryBody));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe('Unauthorized');
  });

  it('returns 401 when session has no user id', async () => {
    mockGetServerSession.mockResolvedValue({ user: {}, expires: '' });
    const res = await POST(makePostRequest(validBinaryBody));
    expect(res.status).toBe(401);
  });

  it('returns 403 when user is not admin', async () => {
    mockGetServerSession.mockResolvedValue(mockUserSession);
    const res = await POST(makePostRequest(validBinaryBody));
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toBe('Forbidden');
  });

  it('returns 400 for missing name', async () => {
    mockGetServerSession.mockResolvedValue(mockAdminSession);
    const res = await POST(makePostRequest({ ...validBinaryBody, name: '' }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Invalid request data');
  });

  it('returns 400 for name exceeding 100 characters', async () => {
    mockGetServerSession.mockResolvedValue(mockAdminSession);
    const res = await POST(makePostRequest({ ...validBinaryBody, name: 'a'.repeat(101) }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for missing description', async () => {
    mockGetServerSession.mockResolvedValue(mockAdminSession);
    const { description: _, ...bodyWithoutDescription } = validBinaryBody;
    const res = await POST(makePostRequest(bodyWithoutDescription));
    expect(res.status).toBe(400);
  });

  it('returns 400 for description exceeding 500 characters', async () => {
    mockGetServerSession.mockResolvedValue(mockAdminSession);
    const res = await POST(makePostRequest({ ...validBinaryBody, description: 'a'.repeat(501) }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid color format', async () => {
    mockGetServerSession.mockResolvedValue(mockAdminSession);
    const res = await POST(makePostRequest({ ...validBinaryBody, color: 'red' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid startDate format', async () => {
    mockGetServerSession.mockResolvedValue(mockAdminSession);
    const res = await POST(makePostRequest({ ...validBinaryBody, startDate: '01-01-2026' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when endDate is before startDate', async () => {
    mockGetServerSession.mockResolvedValue(mockAdminSession);
    const res = await POST(makePostRequest({
      ...validBinaryBody,
      startDate: '2026-06-01',
      endDate: '2026-01-01',
    }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid trackingType', async () => {
    mockGetServerSession.mockResolvedValue(mockAdminSession);
    const res = await POST(makePostRequest({ ...validBinaryBody, trackingType: 'unknown' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for quantity type without targetValue', async () => {
    mockGetServerSession.mockResolvedValue(mockAdminSession);
    const res = await POST(makePostRequest({
      ...validBinaryBody,
      trackingType: 'quantity',
      unit: 'km',
    }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for quantity type without unit', async () => {
    mockGetServerSession.mockResolvedValue(mockAdminSession);
    const res = await POST(makePostRequest({
      ...validBinaryBody,
      trackingType: 'quantity',
      targetValue: 5,
    }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for timer type without targetValue', async () => {
    mockGetServerSession.mockResolvedValue(mockAdminSession);
    const res = await POST(makePostRequest({
      ...validBinaryBody,
      trackingType: 'timer',
      unit: 'min',
    }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for timer type without unit', async () => {
    mockGetServerSession.mockResolvedValue(mockAdminSession);
    const res = await POST(makePostRequest({
      ...validBinaryBody,
      trackingType: 'timer',
      targetValue: 30,
    }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid reminderTime format', async () => {
    mockGetServerSession.mockResolvedValue(mockAdminSession);
    const res = await POST(makePostRequest({ ...validBinaryBody, reminderTime: '8:00' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid category', async () => {
    mockGetServerSession.mockResolvedValue(mockAdminSession);
    const res = await POST(makePostRequest({ ...validBinaryBody, category: 'sports' }));
    expect(res.status).toBe(400);
  });

  it('returns 201 on successful binary initiative creation', async () => {
    mockGetServerSession.mockResolvedValue(mockAdminSession);

    const insertBuilder: Record<string, ReturnType<typeof vi.fn>> = {};
    insertBuilder.insert = vi.fn().mockReturnValue(insertBuilder);
    insertBuilder.select = vi.fn().mockReturnValue(insertBuilder);
    insertBuilder.single = vi.fn().mockResolvedValue({ data: mockInitiative, error: null });
    mockFrom.mockReturnValue(insertBuilder);

    const res = await POST(makePostRequest(validBinaryBody));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.initiative).toEqual(mockInitiative);
  });

  it('returns 201 on successful quantity initiative creation', async () => {
    mockGetServerSession.mockResolvedValue(mockAdminSession);

    const quantityInitiative = {
      ...mockInitiative,
      tracking_type: 'quantity',
      target_value: 5,
      unit: 'km',
    };

    const insertBuilder: Record<string, ReturnType<typeof vi.fn>> = {};
    insertBuilder.insert = vi.fn().mockReturnValue(insertBuilder);
    insertBuilder.select = vi.fn().mockReturnValue(insertBuilder);
    insertBuilder.single = vi.fn().mockResolvedValue({ data: quantityInitiative, error: null });
    mockFrom.mockReturnValue(insertBuilder);

    const res = await POST(makePostRequest({
      ...validBinaryBody,
      trackingType: 'quantity',
      targetValue: 5,
      unit: 'km',
    }));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.initiative.tracking_type).toBe('quantity');
    expect(json.initiative.target_value).toBe(5);
    expect(json.initiative.unit).toBe('km');
  });

  it('returns 201 on successful timer initiative creation', async () => {
    mockGetServerSession.mockResolvedValue(mockAdminSession);

    const timerInitiative = {
      ...mockInitiative,
      tracking_type: 'timer',
      target_value: 30,
      unit: 'min',
    };

    const insertBuilder: Record<string, ReturnType<typeof vi.fn>> = {};
    insertBuilder.insert = vi.fn().mockReturnValue(insertBuilder);
    insertBuilder.select = vi.fn().mockReturnValue(insertBuilder);
    insertBuilder.single = vi.fn().mockResolvedValue({ data: timerInitiative, error: null });
    mockFrom.mockReturnValue(insertBuilder);

    const res = await POST(makePostRequest({
      ...validBinaryBody,
      trackingType: 'timer',
      targetValue: 30,
      unit: 'min',
    }));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.initiative.tracking_type).toBe('timer');
  });

  it('returns 201 with all optional fields', async () => {
    mockGetServerSession.mockResolvedValue(mockAdminSession);

    const fullInitiative = {
      ...mockInitiative,
      icon: '🏃',
      category: 'health',
      end_date: '2026-12-31',
      max_participants: 100,
      reminder_time: '08:00',
    };

    const insertBuilder: Record<string, ReturnType<typeof vi.fn>> = {};
    insertBuilder.insert = vi.fn().mockReturnValue(insertBuilder);
    insertBuilder.select = vi.fn().mockReturnValue(insertBuilder);
    insertBuilder.single = vi.fn().mockResolvedValue({ data: fullInitiative, error: null });
    mockFrom.mockReturnValue(insertBuilder);

    const res = await POST(makePostRequest({
      ...validBinaryBody,
      icon: '🏃',
      category: 'health',
      endDate: '2026-12-31',
      maxParticipants: 100,
      reminderTime: '08:00',
    }));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.initiative.reminder_time).toBe('08:00');
    expect(json.initiative.max_participants).toBe(100);
  });

  it('returns 500 when DB insert fails', async () => {
    mockGetServerSession.mockResolvedValue(mockAdminSession);

    const insertBuilder: Record<string, ReturnType<typeof vi.fn>> = {};
    insertBuilder.insert = vi.fn().mockReturnValue(insertBuilder);
    insertBuilder.select = vi.fn().mockReturnValue(insertBuilder);
    insertBuilder.single = vi.fn().mockResolvedValue({ data: null, error: { message: 'Insert failed' } });
    mockFrom.mockReturnValue(insertBuilder);

    const res = await POST(makePostRequest(validBinaryBody));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('Failed to create initiative');
  });

  it('returns 500 when getServerSession throws', async () => {
    mockGetServerSession.mockRejectedValue(new Error('Unexpected error'));
    const res = await POST(makePostRequest(validBinaryBody));
    expect(res.status).toBe(500);
  });

  it('returns 500 when non-Error value is thrown', async () => {
    mockGetServerSession.mockRejectedValue('string error');
    const res = await POST(makePostRequest(validBinaryBody));
    expect(res.status).toBe(500);
  });
});
