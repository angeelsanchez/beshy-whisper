import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { mockGetServerSession, habitsBuilder } = vi.hoisted(() => {
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
  };
});

vi.mock('next-auth/next', () => ({
  getServerSession: mockGetServerSession,
}));

vi.mock('../../auth/[...nextauth]/auth', () => ({
  authOptions: {},
}));

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: vi.fn(() => habitsBuilder),
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import { GET, POST } from '../route';

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';

const mockSession = {
  user: {
    id: VALID_UUID,
    email: 'test@test.com',
    alias: 'BSY001',
    bsy_id: 'BSY001',
    name: 'Test',
    role: 'user',
  },
  expires: new Date(Date.now() + 86400000).toISOString(),
};

function makePostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/habits', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

describe('GET /api/habits', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    habitsBuilder.select.mockReturnValue(habitsBuilder);
    habitsBuilder.eq.mockReturnValue(habitsBuilder);
    habitsBuilder.order.mockReturnValue(habitsBuilder);
  });

  it('returns 401 without session', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns habits for authenticated user', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    const habits = [
      { id: '1', name: 'Read', color: '#4A2E1B', target_days: [0, 1, 2, 3, 4, 5, 6] },
      { id: '2', name: 'Exercise', color: '#2E7D32', target_days: [1, 3, 5] },
    ];
    habitsBuilder.order
      .mockReturnValueOnce(habitsBuilder)
      .mockResolvedValueOnce({ data: habits, error: null });

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.habits).toHaveLength(2);
    expect(json.habits[0].name).toBe('Read');
  });

  it('returns empty array when no habits', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    habitsBuilder.order
      .mockReturnValueOnce(habitsBuilder)
      .mockResolvedValueOnce({ data: [], error: null });

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.habits).toEqual([]);
  });

  it('returns 500 on supabase error', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    habitsBuilder.order
      .mockReturnValueOnce(habitsBuilder)
      .mockResolvedValueOnce({ data: null, error: { message: 'DB error' } });

    const res = await GET();
    expect(res.status).toBe(500);
  });
});

describe('POST /api/habits', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    habitsBuilder.select.mockReturnValue(habitsBuilder);
    habitsBuilder.insert.mockReturnValue(habitsBuilder);
    habitsBuilder.eq.mockReturnValue(habitsBuilder);
  });

  it('returns 401 without session', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await POST(makePostRequest({ name: 'Read' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 with empty name', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    const res = await POST(makePostRequest({ name: '' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 with name exceeding 100 chars', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    const res = await POST(makePostRequest({ name: 'a'.repeat(101) }));
    expect(res.status).toBe(400);
  });

  it('returns 400 with invalid targetDays values', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    const res = await POST(makePostRequest({ name: 'Read', targetDays: [8] }));
    expect(res.status).toBe(400);
  });

  it('returns 400 with empty targetDays', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    const res = await POST(makePostRequest({ name: 'Read', targetDays: [] }));
    expect(res.status).toBe(400);
  });

  it('returns 400 with duplicate targetDays', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    const res = await POST(makePostRequest({ name: 'Read', targetDays: [1, 1, 2] }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when max habits reached', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    habitsBuilder.eq
      .mockReturnValueOnce(habitsBuilder)
      .mockResolvedValueOnce({ count: 20, error: null });

    const res = await POST(makePostRequest({ name: 'New Habit' }));
    expect(res.status).toBe(400);
  });

  it('returns 201 on successful creation with default targetDays', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    habitsBuilder.eq
      .mockReturnValueOnce(habitsBuilder)
      .mockResolvedValueOnce({ count: 0, error: null });

    const createdHabit = {
      id: '550e8400-e29b-41d4-a716-446655440099',
      name: 'Read',
      description: null,
      frequency: 'daily',
      target_days_per_week: 7,
      target_days: [0, 1, 2, 3, 4, 5, 6],
      color: '#4A2E1B',
    };
    habitsBuilder.single.mockResolvedValueOnce({ data: createdHabit, error: null });

    const res = await POST(makePostRequest({ name: 'Read' }));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.habit.name).toBe('Read');
    expect(json.habit.target_days).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it('returns 201 with custom targetDays', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    habitsBuilder.eq
      .mockReturnValueOnce(habitsBuilder)
      .mockResolvedValueOnce({ count: 0, error: null });

    const createdHabit = {
      id: '550e8400-e29b-41d4-a716-446655440099',
      name: 'Gym',
      frequency: 'daily',
      target_days_per_week: 3,
      target_days: [1, 3, 5],
      color: '#2E7D32',
    };
    habitsBuilder.single.mockResolvedValueOnce({ data: createdHabit, error: null });

    const res = await POST(makePostRequest({
      name: 'Gym',
      targetDays: [5, 1, 3],
      color: '#2E7D32',
    }));
    expect(res.status).toBe(201);
  });

  it('returns 201 with single day deriving weekly frequency', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    habitsBuilder.eq
      .mockReturnValueOnce(habitsBuilder)
      .mockResolvedValueOnce({ count: 0, error: null });

    const createdHabit = {
      id: '550e8400-e29b-41d4-a716-446655440099',
      name: 'Weekly review',
      frequency: 'weekly',
      target_days_per_week: 1,
      target_days: [0],
      color: '#4A2E1B',
    };
    habitsBuilder.single.mockResolvedValueOnce({ data: createdHabit, error: null });

    const res = await POST(makePostRequest({
      name: 'Weekly review',
      targetDays: [0],
    }));
    expect(res.status).toBe(201);
  });

  it('returns 500 on insert error', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    habitsBuilder.eq
      .mockReturnValueOnce(habitsBuilder)
      .mockResolvedValueOnce({ count: 0, error: null });
    habitsBuilder.single.mockResolvedValueOnce({ data: null, error: { message: 'Insert failed' } });

    const res = await POST(makePostRequest({ name: 'Read' }));
    expect(res.status).toBe(500);
  });
});
