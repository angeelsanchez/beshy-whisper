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

vi.mock('../../../auth/[...nextauth]/auth', () => ({
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

import { PATCH, DELETE } from '../route';

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

function makeParams(habitId: string): { params: Promise<{ habitId: string }> } {
  return { params: Promise.resolve({ habitId }) };
}

function makePatchRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest(`http://localhost/api/habits/${HABIT_UUID}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

function makeDeleteRequest(): NextRequest {
  return new NextRequest(`http://localhost/api/habits/${HABIT_UUID}`, {
    method: 'DELETE',
  });
}

describe('PATCH /api/habits/[habitId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    habitsBuilder.select.mockReturnValue(habitsBuilder);
    habitsBuilder.update.mockReturnValue(habitsBuilder);
    habitsBuilder.eq.mockReturnValue(habitsBuilder);
    habitsBuilder.single.mockResolvedValue({ data: null, error: null });
    habitsBuilder.maybeSingle.mockResolvedValue({ data: null, error: null });
  });

  it('returns 401 without session', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await PATCH(makePatchRequest({ name: 'Updated' }), makeParams(HABIT_UUID));
    expect(res.status).toBe(401);
  });

  it('returns 400 with invalid UUID', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    const res = await PATCH(makePatchRequest({ name: 'Updated' }), makeParams('not-a-uuid'));
    expect(res.status).toBe(400);
  });

  it('returns 404 when habit not found', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    habitsBuilder.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

    const res = await PATCH(makePatchRequest({ name: 'Updated' }), makeParams(HABIT_UUID));
    expect(res.status).toBe(404);
  });

  it('returns 403 when habit belongs to another user', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    habitsBuilder.maybeSingle.mockResolvedValueOnce({
      data: { id: HABIT_UUID, user_id: OTHER_UUID },
      error: null,
    });

    const res = await PATCH(makePatchRequest({ name: 'Updated' }), makeParams(HABIT_UUID));
    expect(res.status).toBe(403);
  });

  it('returns 400 with invalid body', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    habitsBuilder.maybeSingle.mockResolvedValueOnce({
      data: { id: HABIT_UUID, user_id: USER_UUID },
      error: null,
    });

    const res = await PATCH(
      makePatchRequest({ name: 'a'.repeat(101) }),
      makeParams(HABIT_UUID),
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 with no fields to update', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    habitsBuilder.maybeSingle.mockResolvedValueOnce({
      data: { id: HABIT_UUID, user_id: USER_UUID },
      error: null,
    });

    const res = await PATCH(makePatchRequest({}), makeParams(HABIT_UUID));
    expect(res.status).toBe(400);
  });

  it('returns 200 on successful name update', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    habitsBuilder.maybeSingle.mockResolvedValueOnce({
      data: { id: HABIT_UUID, user_id: USER_UUID },
      error: null,
    });
    habitsBuilder.single.mockResolvedValueOnce({
      data: { id: HABIT_UUID, name: 'Updated' },
      error: null,
    });

    const res = await PATCH(makePatchRequest({ name: 'Updated' }), makeParams(HABIT_UUID));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.habit.name).toBe('Updated');
  });

  it('returns 200 when targetDays updated', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    habitsBuilder.maybeSingle.mockResolvedValueOnce({
      data: { id: HABIT_UUID, user_id: USER_UUID },
      error: null,
    });
    habitsBuilder.single.mockResolvedValueOnce({
      data: { id: HABIT_UUID, target_days: [1, 3, 5], frequency: 'daily', target_days_per_week: 3 },
      error: null,
    });

    const res = await PATCH(
      makePatchRequest({ targetDays: [1, 3, 5] }),
      makeParams(HABIT_UUID),
    );
    expect(res.status).toBe(200);
  });

  it('returns 400 with invalid targetDays in update', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    habitsBuilder.maybeSingle.mockResolvedValueOnce({
      data: { id: HABIT_UUID, user_id: USER_UUID },
      error: null,
    });

    const res = await PATCH(
      makePatchRequest({ targetDays: [9] }),
      makeParams(HABIT_UUID),
    );
    expect(res.status).toBe(400);
  });

  it('returns 500 on update error', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    habitsBuilder.maybeSingle.mockResolvedValueOnce({
      data: { id: HABIT_UUID, user_id: USER_UUID },
      error: null,
    });
    habitsBuilder.single.mockResolvedValueOnce({
      data: null,
      error: { message: 'Update failed' },
    });

    const res = await PATCH(makePatchRequest({ name: 'Updated' }), makeParams(HABIT_UUID));
    expect(res.status).toBe(500);
  });

  it('returns 200 when updating trackingType to quantity', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    habitsBuilder.maybeSingle.mockResolvedValueOnce({
      data: { id: HABIT_UUID, user_id: USER_UUID },
      error: null,
    });
    habitsBuilder.single.mockResolvedValueOnce({
      data: { id: HABIT_UUID, tracking_type: 'quantity', target_value: 8, unit: 'vasos' },
      error: null,
    });

    const res = await PATCH(
      makePatchRequest({ trackingType: 'quantity', targetValue: 8, unit: 'vasos' }),
      makeParams(HABIT_UUID),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.habit.tracking_type).toBe('quantity');
  });

  it('returns 200 when updating icon', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    habitsBuilder.maybeSingle.mockResolvedValueOnce({
      data: { id: HABIT_UUID, user_id: USER_UUID },
      error: null,
    });
    habitsBuilder.single.mockResolvedValueOnce({
      data: { id: HABIT_UUID, icon: '📖' },
      error: null,
    });

    const res = await PATCH(makePatchRequest({ icon: '📖' }), makeParams(HABIT_UUID));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.habit.icon).toBe('📖');
  });

  it('returns 200 when updating category', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    habitsBuilder.maybeSingle.mockResolvedValueOnce({
      data: { id: HABIT_UUID, user_id: USER_UUID },
      error: null,
    });
    habitsBuilder.single.mockResolvedValueOnce({
      data: { id: HABIT_UUID, category: 'mind' },
      error: null,
    });

    const res = await PATCH(makePatchRequest({ category: 'mind' }), makeParams(HABIT_UUID));
    expect(res.status).toBe(200);
  });

  it('returns 200 when updating reminderTime', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    habitsBuilder.maybeSingle.mockResolvedValueOnce({
      data: { id: HABIT_UUID, user_id: USER_UUID },
      error: null,
    });
    habitsBuilder.single.mockResolvedValueOnce({
      data: { id: HABIT_UUID, reminder_time: '09:30' },
      error: null,
    });

    const res = await PATCH(makePatchRequest({ reminderTime: '09:30' }), makeParams(HABIT_UUID));
    expect(res.status).toBe(200);
  });

  it('returns 400 with invalid reminderTime format', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    habitsBuilder.maybeSingle.mockResolvedValueOnce({
      data: { id: HABIT_UUID, user_id: USER_UUID },
      error: null,
    });

    const res = await PATCH(makePatchRequest({ reminderTime: '9:30' }), makeParams(HABIT_UUID));
    expect(res.status).toBe(400);
  });

  it('returns 400 with invalid category', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    habitsBuilder.maybeSingle.mockResolvedValueOnce({
      data: { id: HABIT_UUID, user_id: USER_UUID },
      error: null,
    });

    const res = await PATCH(makePatchRequest({ category: 'sports' }), makeParams(HABIT_UUID));
    expect(res.status).toBe(400);
  });

  it('returns 200 when clearing nullable fields', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    habitsBuilder.maybeSingle.mockResolvedValueOnce({
      data: { id: HABIT_UUID, user_id: USER_UUID },
      error: null,
    });
    habitsBuilder.single.mockResolvedValueOnce({
      data: { id: HABIT_UUID, icon: null, category: null, reminder_time: null },
      error: null,
    });

    const res = await PATCH(
      makePatchRequest({ icon: null, category: null, reminderTime: null }),
      makeParams(HABIT_UUID),
    );
    expect(res.status).toBe(200);
  });
});

describe('DELETE /api/habits/[habitId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    habitsBuilder.select.mockReturnValue(habitsBuilder);
    habitsBuilder.update.mockReturnValue(habitsBuilder);
    habitsBuilder.eq.mockReturnValue(habitsBuilder);
    habitsBuilder.single.mockResolvedValue({ data: null, error: null });
    habitsBuilder.maybeSingle.mockResolvedValue({ data: null, error: null });
  });

  it('returns 401 without session', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await DELETE(makeDeleteRequest(), makeParams(HABIT_UUID));
    expect(res.status).toBe(401);
  });

  it('returns 400 with invalid UUID', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    const res = await DELETE(makeDeleteRequest(), makeParams('not-valid'));
    expect(res.status).toBe(400);
  });

  it('returns 404 when habit not found', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    habitsBuilder.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

    const res = await DELETE(makeDeleteRequest(), makeParams(HABIT_UUID));
    expect(res.status).toBe(404);
  });

  it('returns 403 when habit belongs to another user', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    habitsBuilder.maybeSingle.mockResolvedValueOnce({
      data: { id: HABIT_UUID, user_id: OTHER_UUID },
      error: null,
    });

    const res = await DELETE(makeDeleteRequest(), makeParams(HABIT_UUID));
    expect(res.status).toBe(403);
  });

  it('returns 200 on successful soft delete', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    habitsBuilder.maybeSingle.mockResolvedValueOnce({
      data: { id: HABIT_UUID, user_id: USER_UUID },
      error: null,
    });
    habitsBuilder.eq
      .mockReturnValueOnce(habitsBuilder)
      .mockResolvedValueOnce({ error: null });

    const res = await DELETE(makeDeleteRequest(), makeParams(HABIT_UUID));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it('returns 500 on soft delete error', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    habitsBuilder.maybeSingle.mockResolvedValueOnce({
      data: { id: HABIT_UUID, user_id: USER_UUID },
      error: null,
    });
    habitsBuilder.eq
      .mockReturnValueOnce(habitsBuilder)
      .mockResolvedValueOnce({ error: { message: 'Delete failed' } });

    const res = await DELETE(makeDeleteRequest(), makeParams(HABIT_UUID));
    expect(res.status).toBe(500);
  });
});
