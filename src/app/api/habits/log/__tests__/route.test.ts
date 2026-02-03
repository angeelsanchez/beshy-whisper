import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { mockGetServerSession, habitsBuilder, logsBuilder } = vi.hoisted(() => {
  const mockGetServerSession = vi.fn();

  function createBuilder(): Record<string, ReturnType<typeof vi.fn>> {
    const b: Record<string, ReturnType<typeof vi.fn>> = {};
    b.select = vi.fn().mockReturnValue(b);
    b.insert = vi.fn().mockReturnValue(b);
    b.update = vi.fn().mockReturnValue(b);
    b.delete = vi.fn().mockReturnValue(b);
    b.eq = vi.fn().mockReturnValue(b);
    b.order = vi.fn().mockReturnValue(b);
    b.single = vi.fn().mockResolvedValue({ data: null, error: null });
    b.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    return b;
  }

  return {
    mockGetServerSession,
    habitsBuilder: createBuilder(),
    logsBuilder: createBuilder(),
  };
});

vi.mock('next-auth/next', () => ({
  getServerSession: mockGetServerSession,
}));

vi.mock('../../../auth/[...nextauth]/auth', () => ({
  authOptions: {},
}));

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => {
      if (table === 'habit_logs') return logsBuilder;
      if (table === 'push_tokens') return logsBuilder;
      return habitsBuilder;
    }),
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock('web-push', () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn(),
  },
  setVapidDetails: vi.fn(),
  sendNotification: vi.fn(),
}));

import { POST } from '../route';

const USER_UUID = '550e8400-e29b-41d4-a716-446655440000';
const OTHER_UUID = '550e8400-e29b-41d4-a716-446655440001';
const HABIT_UUID = '550e8400-e29b-41d4-a716-446655440099';

const mockSession = {
  user: {
    id: USER_UUID,
    email: 'test@test.com',
    alias: 'BSY001',
    bsy_id: 'BSY001',
    name: 'Test',
    role: 'user',
  },
  expires: new Date(Date.now() + 86400000).toISOString(),
};

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/habits/log', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

describe('POST /api/habits/log', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    for (const key of Object.keys(habitsBuilder)) {
      habitsBuilder[key].mockReset().mockReturnValue(habitsBuilder);
    }
    habitsBuilder.single.mockReset().mockResolvedValue({ data: null, error: null });
    habitsBuilder.maybeSingle.mockReset().mockResolvedValue({ data: null, error: null });

    for (const key of Object.keys(logsBuilder)) {
      logsBuilder[key].mockReset().mockReturnValue(logsBuilder);
    }
    logsBuilder.single.mockReset().mockResolvedValue({ data: null, error: null });
    logsBuilder.maybeSingle.mockReset().mockResolvedValue({ data: null, error: null });
  });

  it('returns 401 without session', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await POST(makeRequest({ habitId: HABIT_UUID }));
    expect(res.status).toBe(401);
  });

  it('returns 400 without habitId', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it('returns 400 with invalid UUID', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    const res = await POST(makeRequest({ habitId: 'not-a-uuid' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 with invalid date format', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    const res = await POST(makeRequest({ habitId: HABIT_UUID, date: '2026-1-5' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 with future date', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    habitsBuilder.maybeSingle.mockResolvedValueOnce({
      data: { id: HABIT_UUID, user_id: USER_UUID, name: 'Read', is_active: true },
      error: null,
    });

    const res = await POST(makeRequest({ habitId: HABIT_UUID, date: '2099-12-31' }));
    expect(res.status).toBe(400);
  });

  it('returns 404 when habit not found', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    habitsBuilder.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

    const res = await POST(makeRequest({ habitId: HABIT_UUID }));
    expect(res.status).toBe(404);
  });

  it('returns 403 when habit belongs to another user', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    habitsBuilder.maybeSingle.mockResolvedValueOnce({
      data: { id: HABIT_UUID, user_id: OTHER_UUID, name: 'Read', is_active: true },
      error: null,
    });

    const res = await POST(makeRequest({ habitId: HABIT_UUID }));
    expect(res.status).toBe(403);
  });

  it('returns 400 when habit is inactive', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    habitsBuilder.maybeSingle.mockResolvedValueOnce({
      data: { id: HABIT_UUID, user_id: USER_UUID, name: 'Read', is_active: false },
      error: null,
    });

    const res = await POST(makeRequest({ habitId: HABIT_UUID }));
    expect(res.status).toBe(400);
  });

  it('returns removed when toggling off existing log', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    habitsBuilder.maybeSingle.mockResolvedValueOnce({
      data: { id: HABIT_UUID, user_id: USER_UUID, name: 'Read', is_active: true },
      error: null,
    });
    logsBuilder.maybeSingle.mockResolvedValueOnce({
      data: { id: 'log-id' },
      error: null,
    });
    logsBuilder.eq
      .mockReturnValueOnce(logsBuilder)
      .mockReturnValueOnce(logsBuilder)
      .mockResolvedValueOnce({ error: null });

    const res = await POST(makeRequest({ habitId: HABIT_UUID }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.action).toBe('removed');
    expect(json.completed).toBe(false);
  });

  it('returns logged when toggling on', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    habitsBuilder.maybeSingle.mockResolvedValueOnce({
      data: { id: HABIT_UUID, user_id: USER_UUID, name: 'Read', is_active: true },
      error: null,
    });
    logsBuilder.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    logsBuilder.insert.mockReturnValueOnce({ error: null });
    logsBuilder.order.mockResolvedValueOnce({
      data: [{ completed_at: '2026-01-31' }],
      error: null,
    });

    const res = await POST(makeRequest({ habitId: HABIT_UUID }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.action).toBe('logged');
    expect(json.completed).toBe(true);
  });

  it('returns milestone when reaching 21 reps', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    habitsBuilder.maybeSingle.mockResolvedValueOnce({
      data: { id: HABIT_UUID, user_id: USER_UUID, name: 'Read', is_active: true },
      error: null,
    });
    logsBuilder.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    logsBuilder.insert.mockReturnValueOnce({ error: null });

    const dates = Array.from({ length: 21 }, (_, i) => ({
      completed_at: `2026-01-${String(i + 1).padStart(2, '0')}`,
    }));
    logsBuilder.order.mockResolvedValueOnce({ data: dates, error: null });

    const res = await POST(makeRequest({ habitId: HABIT_UUID }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.milestone).toBeDefined();
    expect(json.milestone.type).toBe('21_reps');
  });

  it('returns milestone when reaching 66 reps', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    habitsBuilder.maybeSingle.mockResolvedValueOnce({
      data: { id: HABIT_UUID, user_id: USER_UUID, name: 'Read', is_active: true },
      error: null,
    });
    logsBuilder.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    logsBuilder.insert.mockReturnValueOnce({ error: null });

    const dates = Array.from({ length: 66 }, (_, i) => {
      const day = new Date(2025, 10, 1);
      day.setDate(day.getDate() + i);
      return {
        completed_at: `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`,
      };
    });
    logsBuilder.order.mockResolvedValueOnce({ data: dates, error: null });

    const res = await POST(makeRequest({ habitId: HABIT_UUID }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.milestone).toBeDefined();
    expect(json.milestone.type).toBe('66_reps');
  });

  it('returns 500 when delete fails on toggle off', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    habitsBuilder.maybeSingle.mockResolvedValueOnce({
      data: { id: HABIT_UUID, user_id: USER_UUID, name: 'Read', is_active: true },
      error: null,
    });
    logsBuilder.maybeSingle.mockResolvedValueOnce({ data: { id: 'log-id' }, error: null });
    logsBuilder.eq
      .mockReturnValueOnce(logsBuilder)
      .mockReturnValueOnce(logsBuilder)
      .mockResolvedValueOnce({ error: { message: 'Delete failed' } });

    const res = await POST(makeRequest({ habitId: HABIT_UUID }));
    expect(res.status).toBe(500);
  });

  it('returns 500 when insert fails', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    habitsBuilder.maybeSingle.mockResolvedValueOnce({
      data: { id: HABIT_UUID, user_id: USER_UUID, name: 'Read', is_active: true },
      error: null,
    });
    logsBuilder.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    logsBuilder.insert.mockReturnValueOnce({ error: { message: 'Insert failed', code: 'OTHER' } });

    const res = await POST(makeRequest({ habitId: HABIT_UUID }));
    expect(res.status).toBe(500);
  });

  it('returns already_logged on duplicate insert', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    habitsBuilder.maybeSingle.mockResolvedValueOnce({
      data: { id: HABIT_UUID, user_id: USER_UUID, name: 'Read', is_active: true },
      error: null,
    });
    logsBuilder.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    logsBuilder.insert.mockReturnValueOnce({ error: { code: '23505', message: 'unique violation' } });

    const res = await POST(makeRequest({ habitId: HABIT_UUID }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.action).toBe('already_logged');
  });
});

describe('POST /api/habits/log (quantity)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    for (const key of Object.keys(habitsBuilder)) {
      habitsBuilder[key].mockReset().mockReturnValue(habitsBuilder);
    }
    habitsBuilder.single.mockReset().mockResolvedValue({ data: null, error: null });
    habitsBuilder.maybeSingle.mockReset().mockResolvedValue({ data: null, error: null });

    for (const key of Object.keys(logsBuilder)) {
      logsBuilder[key].mockReset().mockReturnValue(logsBuilder);
    }
    logsBuilder.single.mockReset().mockResolvedValue({ data: null, error: null });
    logsBuilder.maybeSingle.mockReset().mockResolvedValue({ data: null, error: null });
  });

  const quantityHabit = {
    id: HABIT_UUID,
    user_id: USER_UUID,
    name: 'Beber agua',
    is_active: true,
    tracking_type: 'quantity',
    target_value: 8,
  };

  it('creates initial quantity log with value', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    habitsBuilder.maybeSingle.mockResolvedValueOnce({ data: quantityHabit, error: null });
    logsBuilder.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    logsBuilder.insert.mockReturnValueOnce({ error: null });
    logsBuilder.order.mockResolvedValueOnce({
      data: [{ completed_at: '2026-01-31' }],
      error: null,
    });

    const res = await POST(makeRequest({ habitId: HABIT_UUID, value: 3 }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.action).toBe('logged');
    expect(json.value).toBe(3);
    expect(json.completed).toBe(false);
  });

  it('defaults to value 1 when no value provided for quantity', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    habitsBuilder.maybeSingle.mockResolvedValueOnce({ data: quantityHabit, error: null });
    logsBuilder.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    logsBuilder.insert.mockReturnValueOnce({ error: null });
    logsBuilder.order.mockResolvedValueOnce({
      data: [{ completed_at: '2026-01-31' }],
      error: null,
    });

    const res = await POST(makeRequest({ habitId: HABIT_UUID }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.value).toBe(1);
  });

  it('updates existing quantity log by adding value', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    habitsBuilder.maybeSingle.mockResolvedValueOnce({ data: quantityHabit, error: null });
    logsBuilder.maybeSingle.mockResolvedValueOnce({
      data: { id: 'log-id', value: 5 },
      error: null,
    });
    logsBuilder.eq
      .mockReturnValueOnce(logsBuilder)
      .mockReturnValueOnce(logsBuilder)
      .mockResolvedValueOnce({ error: null });

    const res = await POST(makeRequest({ habitId: HABIT_UUID, value: 2 }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.action).toBe('updated');
    expect(json.value).toBe(7);
    expect(json.completed).toBe(false);
  });

  it('marks as completed when value reaches target', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    habitsBuilder.maybeSingle.mockResolvedValueOnce({ data: quantityHabit, error: null });
    logsBuilder.maybeSingle.mockResolvedValueOnce({
      data: { id: 'log-id', value: 6 },
      error: null,
    });
    logsBuilder.eq
      .mockReturnValueOnce(logsBuilder)
      .mockReturnValueOnce(logsBuilder)
      .mockResolvedValueOnce({ error: null });

    const res = await POST(makeRequest({ habitId: HABIT_UUID, value: 2 }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.completed).toBe(true);
    expect(json.value).toBe(8);
  });

  it('removes log when value decremented to zero', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    habitsBuilder.maybeSingle.mockResolvedValueOnce({ data: quantityHabit, error: null });
    logsBuilder.maybeSingle.mockResolvedValueOnce({
      data: { id: 'log-id', value: 1 },
      error: null,
    });
    logsBuilder.eq
      .mockReturnValueOnce(logsBuilder)
      .mockReturnValueOnce(logsBuilder)
      .mockResolvedValueOnce({ error: null });

    const res = await POST(makeRequest({ habitId: HABIT_UUID, value: -1 }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.action).toBe('removed');
    expect(json.value).toBe(0);
    expect(json.completed).toBe(false);
  });

  it('returns 500 when quantity update fails', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    habitsBuilder.maybeSingle.mockResolvedValueOnce({ data: quantityHabit, error: null });
    logsBuilder.maybeSingle.mockResolvedValueOnce({
      data: { id: 'log-id', value: 3 },
      error: null,
    });
    logsBuilder.eq
      .mockReturnValueOnce(logsBuilder)
      .mockReturnValueOnce(logsBuilder)
      .mockResolvedValueOnce({ error: { message: 'Update failed' } });

    const res = await POST(makeRequest({ habitId: HABIT_UUID, value: 1 }));
    expect(res.status).toBe(500);
  });

  it('returns 500 when quantity delete fails', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    habitsBuilder.maybeSingle.mockResolvedValueOnce({ data: quantityHabit, error: null });
    logsBuilder.maybeSingle.mockResolvedValueOnce({
      data: { id: 'log-id', value: 1 },
      error: null,
    });
    logsBuilder.eq
      .mockReturnValueOnce(logsBuilder)
      .mockReturnValueOnce(logsBuilder)
      .mockResolvedValueOnce({ error: { message: 'Delete failed' } });

    const res = await POST(makeRequest({ habitId: HABIT_UUID, value: -5 }));
    expect(res.status).toBe(500);
  });

  it('returns already_logged on quantity duplicate insert', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    habitsBuilder.maybeSingle.mockResolvedValueOnce({ data: quantityHabit, error: null });
    logsBuilder.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    logsBuilder.insert.mockReturnValueOnce({ error: { code: '23505', message: 'unique violation' } });

    const res = await POST(makeRequest({ habitId: HABIT_UUID, value: 2 }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.action).toBe('already_logged');
  });
});
