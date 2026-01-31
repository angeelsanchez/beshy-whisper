import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { mockGetServerSession, habitsBuilder, logsBuilder } = vi.hoisted(() => {
  const mockGetServerSession = vi.fn();

  function createBuilder(): Record<string, ReturnType<typeof vi.fn>> {
    const b: Record<string, ReturnType<typeof vi.fn>> = {};
    b.select = vi.fn().mockReturnValue(b);
    b.eq = vi.fn().mockReturnValue(b);
    b.in = vi.fn().mockReturnValue(b);
    b.gte = vi.fn().mockReturnValue(b);
    b.lte = vi.fn().mockReturnValue(b);
    b.order = vi.fn().mockReturnValue(b);
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
      return habitsBuilder;
    }),
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import { GET } from '../route';

const USER_UUID = '550e8400-e29b-41d4-a716-446655440000';
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

function makeRequest(params?: Record<string, string>): NextRequest {
  const url = new URL('http://localhost/api/habits/stats');
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }
  return new NextRequest(url);
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

describe('GET /api/habits/stats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    habitsBuilder.select.mockReturnValue(habitsBuilder);
    habitsBuilder.eq.mockReturnValue(habitsBuilder);

    logsBuilder.select.mockReturnValue(logsBuilder);
    logsBuilder.eq.mockReturnValue(logsBuilder);
    logsBuilder.in.mockReturnValue(logsBuilder);
    logsBuilder.gte.mockReturnValue(logsBuilder);
    logsBuilder.lte.mockReturnValue(logsBuilder);
    logsBuilder.order.mockReturnValue(logsBuilder);
  });

  it('returns 401 without session', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it('returns 400 with invalid query params', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    const res = await GET(makeRequest({ habitId: 'not-a-uuid' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 with invalid date format', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    const res = await GET(makeRequest({ from: '2026-1-5' }));
    expect(res.status).toBe(400);
  });

  it('returns empty stats when no habits', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    habitsBuilder.eq
      .mockReturnValueOnce(habitsBuilder)
      .mockResolvedValueOnce({ data: [], error: null });

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.stats).toEqual([]);
  });

  it('returns stats with data', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);

    const habits = [
      { id: HABIT_UUID, name: 'Read', target_days_per_week: 7, target_days: [0, 1, 2, 3, 4, 5, 6] },
    ];
    habitsBuilder.eq
      .mockReturnValueOnce(habitsBuilder)
      .mockResolvedValueOnce({ data: habits, error: null });

    const todayStr = toDateStr(new Date());
    const logs = [{ habit_id: HABIT_UUID, completed_at: todayStr }];
    logsBuilder.order.mockResolvedValueOnce({ data: logs, error: null });

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.stats).toHaveLength(1);
    expect(json.stats[0].habitId).toBe(HABIT_UUID);
    expect(json.stats[0].totalRepetitions).toBe(1);
    expect(json.stats[0].completionsByDate[todayStr]).toBe(true);
  });

  it('completion rate uses target_days length not hardcoded 7', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);

    const habits = [
      { id: HABIT_UUID, name: 'Gym', target_days_per_week: 3, target_days: [1, 3, 5] },
    ];
    habitsBuilder.eq
      .mockReturnValueOnce(habitsBuilder)
      .mockResolvedValueOnce({ data: habits, error: null });

    const today = new Date();
    const dates = Array.from({ length: 3 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      return { habit_id: HABIT_UUID, completed_at: toDateStr(d) };
    });
    logsBuilder.order.mockResolvedValueOnce({ data: dates, error: null });

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.stats[0].completionRateWeekly).toBe(100);
  });

  it('completion rate capped at 100', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);

    const habits = [
      { id: HABIT_UUID, name: 'Gym', target_days_per_week: 2, target_days: [1, 5] },
    ];
    habitsBuilder.eq
      .mockReturnValueOnce(habitsBuilder)
      .mockResolvedValueOnce({ data: habits, error: null });

    const today = new Date();
    const dates = Array.from({ length: 5 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      return { habit_id: HABIT_UUID, completed_at: toDateStr(d) };
    });
    logsBuilder.order.mockResolvedValueOnce({ data: dates, error: null });

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.stats[0].completionRateWeekly).toBeLessThanOrEqual(100);
  });

  it('filters by habitId when provided', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);

    const habits = [
      { id: HABIT_UUID, name: 'Read', target_days_per_week: 7, target_days: [0, 1, 2, 3, 4, 5, 6] },
    ];
    habitsBuilder.eq
      .mockReturnValueOnce(habitsBuilder)
      .mockReturnValueOnce(habitsBuilder)
      .mockResolvedValueOnce({ data: habits, error: null });

    logsBuilder.order.mockResolvedValueOnce({ data: [], error: null });

    const res = await GET(makeRequest({ habitId: HABIT_UUID }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.stats).toHaveLength(1);
    expect(json.stats[0].totalRepetitions).toBe(0);
  });

  it('returns 500 on habits query error', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    habitsBuilder.eq
      .mockReturnValueOnce(habitsBuilder)
      .mockResolvedValueOnce({ data: null, error: { message: 'DB error' } });

    const res = await GET(makeRequest());
    expect(res.status).toBe(500);
  });

  it('returns 500 on logs query error', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);

    const habits = [
      { id: HABIT_UUID, name: 'Read', target_days_per_week: 7, target_days: [0, 1, 2, 3, 4, 5, 6] },
    ];
    habitsBuilder.eq
      .mockReturnValueOnce(habitsBuilder)
      .mockResolvedValueOnce({ data: habits, error: null });

    logsBuilder.order.mockResolvedValueOnce({ data: null, error: { message: 'Logs error' } });

    const res = await GET(makeRequest());
    expect(res.status).toBe(500);
  });

  it('returns correct milestones', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);

    const habits = [
      { id: HABIT_UUID, name: 'Read', target_days_per_week: 7, target_days: [0, 1, 2, 3, 4, 5, 6] },
    ];
    habitsBuilder.eq
      .mockReturnValueOnce(habitsBuilder)
      .mockResolvedValueOnce({ data: habits, error: null });

    const dates = Array.from({ length: 66 }, (_, i) => {
      const d = new Date(2025, 10, 1);
      d.setDate(d.getDate() + i);
      return { habit_id: HABIT_UUID, completed_at: toDateStr(d) };
    });
    logsBuilder.order.mockResolvedValueOnce({ data: dates, error: null });

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.stats[0].milestone).toBe('66_reps');
    expect(json.stats[0].totalRepetitions).toBe(66);
  });
});
