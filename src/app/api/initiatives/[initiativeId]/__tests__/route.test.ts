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

vi.mock('../../../auth/[...nextauth]/auth', () => ({
  authOptions: {},
}));

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: { from: mockFrom },
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import { GET, PATCH, DELETE } from '../route';

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

function makeParams(initiativeId: string): { params: Promise<{ initiativeId: string }> } {
  return { params: Promise.resolve({ initiativeId }) };
}

function makeGetRequest(): NextRequest {
  return new NextRequest(`http://localhost/api/initiatives/${INITIATIVE_UUID}`, {
    method: 'GET',
  });
}

function makePatchRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest(`http://localhost/api/initiatives/${INITIATIVE_UUID}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

function makeDeleteRequest(): NextRequest {
  return new NextRequest(`http://localhost/api/initiatives/${INITIATIVE_UUID}`, {
    method: 'DELETE',
  });
}

function createInitiativeBuilder(data: Record<string, unknown> | null, error: { message: string } | null = null) {
  const b: Record<string, ReturnType<typeof vi.fn>> = {};
  b.select = vi.fn().mockReturnValue(b);
  b.eq = vi.fn().mockReturnValue(b);
  b.maybeSingle = vi.fn().mockResolvedValue({ data, error });
  b.single = vi.fn().mockResolvedValue({ data, error });
  return b;
}

function createUpdateBuilder(error: { message: string } | null = null) {
  const b: Record<string, ReturnType<typeof vi.fn>> = {};
  b.update = vi.fn().mockReturnValue(b);
  b.eq = vi.fn().mockReturnValue(b);
  b.select = vi.fn().mockReturnValue(b);
  b.single = vi.fn().mockResolvedValue({ data: mockInitiative, error });
  return b;
}

describe('GET /api/initiatives/[initiativeId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when no session', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await GET(makeGetRequest(), makeParams(INITIATIVE_UUID));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe('Unauthorized');
  });

  it('returns 401 when session has no user id', async () => {
    mockGetServerSession.mockResolvedValue({ user: {}, expires: '' });
    const res = await GET(makeGetRequest(), makeParams(INITIATIVE_UUID));
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid UUID format', async () => {
    mockGetServerSession.mockResolvedValue(mockUserSession);
    const res = await GET(makeGetRequest(), makeParams('not-a-uuid'));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Invalid initiative ID');
  });

  it('returns 404 when initiative not found', async () => {
    mockGetServerSession.mockResolvedValue(mockUserSession);
    const initiativeBuilder = createInitiativeBuilder(null);
    mockFrom.mockReturnValue(initiativeBuilder);

    const res = await GET(makeGetRequest(), makeParams(INITIATIVE_UUID));
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe('Initiative not found');
  });

  it('returns 500 when initiative query fails', async () => {
    mockGetServerSession.mockResolvedValue(mockUserSession);
    const initiativeBuilder = createInitiativeBuilder(null, { message: 'DB error' });
    mockFrom.mockReturnValue(initiativeBuilder);

    const res = await GET(makeGetRequest(), makeParams(INITIATIVE_UUID));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('Internal server error');
  });

  it('returns initiative with is_joined=false and user_checked_in_today=false when not joined and no log', async () => {
    mockGetServerSession.mockResolvedValue(mockUserSession);

    const initiativeBuilder = createInitiativeBuilder(mockInitiative);
    const participationBuilder = createInitiativeBuilder(null);
    const logBuilder = createInitiativeBuilder(null);

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return initiativeBuilder;
      if (callCount === 2) return participationBuilder;
      return logBuilder;
    });

    const res = await GET(makeGetRequest(), makeParams(INITIATIVE_UUID));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.initiative).toEqual(mockInitiative);
    expect(json.is_joined).toBe(false);
    expect(json.user_checked_in_today).toBe(false);
    expect(json.user_today_value).toBeNull();
  });

  it('returns is_joined=true when user has active participation', async () => {
    mockGetServerSession.mockResolvedValue(mockUserSession);

    const initiativeBuilder = createInitiativeBuilder(mockInitiative);
    const participationBuilder = createInitiativeBuilder({ id: 'part-1' });
    const logBuilder = createInitiativeBuilder(null);

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return initiativeBuilder;
      if (callCount === 2) return participationBuilder;
      return logBuilder;
    });

    const res = await GET(makeGetRequest(), makeParams(INITIATIVE_UUID));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.is_joined).toBe(true);
  });

  it('returns user_checked_in_today=true and user_today_value when log exists', async () => {
    mockGetServerSession.mockResolvedValue(mockUserSession);

    const initiativeBuilder = createInitiativeBuilder(mockInitiative);
    const participationBuilder = createInitiativeBuilder({ id: 'part-1' });
    const logBuilder = createInitiativeBuilder({ value: 5 });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return initiativeBuilder;
      if (callCount === 2) return participationBuilder;
      return logBuilder;
    });

    const res = await GET(makeGetRequest(), makeParams(INITIATIVE_UUID));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.user_checked_in_today).toBe(true);
    expect(json.user_today_value).toBe(5);
  });

  it('returns 500 when getServerSession throws', async () => {
    mockGetServerSession.mockRejectedValue(new Error('Session failure'));
    const res = await GET(makeGetRequest(), makeParams(INITIATIVE_UUID));
    expect(res.status).toBe(500);
  });
});

describe('PATCH /api/initiatives/[initiativeId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when no session', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await PATCH(makePatchRequest({ name: 'Updated' }), makeParams(INITIATIVE_UUID));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe('Unauthorized');
  });

  it('returns 401 when session has no user id', async () => {
    mockGetServerSession.mockResolvedValue({ user: {}, expires: '' });
    const res = await PATCH(makePatchRequest({ name: 'Updated' }), makeParams(INITIATIVE_UUID));
    expect(res.status).toBe(401);
  });

  it('returns 403 when user is not admin', async () => {
    mockGetServerSession.mockResolvedValue(mockUserSession);
    const res = await PATCH(makePatchRequest({ name: 'Updated' }), makeParams(INITIATIVE_UUID));
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toBe('Forbidden');
  });

  it('returns 400 for invalid UUID format', async () => {
    mockGetServerSession.mockResolvedValue(mockAdminSession);
    const res = await PATCH(makePatchRequest({ name: 'Updated' }), makeParams('not-a-uuid'));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Invalid initiative ID');
  });

  it('returns 400 for invalid request body - name too long', async () => {
    mockGetServerSession.mockResolvedValue(mockAdminSession);
    const res = await PATCH(
      makePatchRequest({ name: 'a'.repeat(101) }),
      makeParams(INITIATIVE_UUID),
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Invalid request data');
  });

  it('returns 400 for invalid color format', async () => {
    mockGetServerSession.mockResolvedValue(mockAdminSession);
    const res = await PATCH(
      makePatchRequest({ color: 'not-a-color' }),
      makeParams(INITIATIVE_UUID),
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid category', async () => {
    mockGetServerSession.mockResolvedValue(mockAdminSession);
    const res = await PATCH(
      makePatchRequest({ category: 'sports' }),
      makeParams(INITIATIVE_UUID),
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid reminderTime format', async () => {
    mockGetServerSession.mockResolvedValue(mockAdminSession);
    const res = await PATCH(
      makePatchRequest({ reminderTime: '9:30' }),
      makeParams(INITIATIVE_UUID),
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 when no fields to update (empty body)', async () => {
    mockGetServerSession.mockResolvedValue(mockAdminSession);
    const res = await PATCH(makePatchRequest({}), makeParams(INITIATIVE_UUID));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('No fields to update');
  });

  it('returns 200 on successful name update', async () => {
    mockGetServerSession.mockResolvedValue(mockAdminSession);
    const updatedInitiative = { ...mockInitiative, name: 'Updated Challenge' };
    const updateBuilder = createUpdateBuilder();
    updateBuilder.single.mockResolvedValue({ data: updatedInitiative, error: null });
    mockFrom.mockReturnValue(updateBuilder);

    const res = await PATCH(makePatchRequest({ name: 'Updated Challenge' }), makeParams(INITIATIVE_UUID));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.initiative.name).toBe('Updated Challenge');
  });

  it('returns 200 on successful isActive update', async () => {
    mockGetServerSession.mockResolvedValue(mockAdminSession);
    const updatedInitiative = { ...mockInitiative, is_active: false };
    const updateBuilder = createUpdateBuilder();
    updateBuilder.single.mockResolvedValue({ data: updatedInitiative, error: null });
    mockFrom.mockReturnValue(updateBuilder);

    const res = await PATCH(makePatchRequest({ isActive: false }), makeParams(INITIATIVE_UUID));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.initiative.is_active).toBe(false);
  });

  it('returns 200 on successful maxParticipants update', async () => {
    mockGetServerSession.mockResolvedValue(mockAdminSession);
    const updatedInitiative = { ...mockInitiative, max_participants: 50 };
    const updateBuilder = createUpdateBuilder();
    updateBuilder.single.mockResolvedValue({ data: updatedInitiative, error: null });
    mockFrom.mockReturnValue(updateBuilder);

    const res = await PATCH(makePatchRequest({ maxParticipants: 50 }), makeParams(INITIATIVE_UUID));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.initiative.max_participants).toBe(50);
  });

  it('returns 200 when clearing nullable fields (icon, category, reminderTime, maxParticipants)', async () => {
    mockGetServerSession.mockResolvedValue(mockAdminSession);
    const updatedInitiative = { ...mockInitiative, icon: null, category: null, reminder_time: null, max_participants: null };
    const updateBuilder = createUpdateBuilder();
    updateBuilder.single.mockResolvedValue({ data: updatedInitiative, error: null });
    mockFrom.mockReturnValue(updateBuilder);

    const res = await PATCH(
      makePatchRequest({ icon: null, category: null, reminderTime: null, maxParticipants: null }),
      makeParams(INITIATIVE_UUID),
    );
    expect(res.status).toBe(200);
  });

  it('returns 200 on successful color update', async () => {
    mockGetServerSession.mockResolvedValue(mockAdminSession);
    const updatedInitiative = { ...mockInitiative, color: '#FF5733' };
    const updateBuilder = createUpdateBuilder();
    updateBuilder.single.mockResolvedValue({ data: updatedInitiative, error: null });
    mockFrom.mockReturnValue(updateBuilder);

    const res = await PATCH(makePatchRequest({ color: '#FF5733' }), makeParams(INITIATIVE_UUID));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.initiative.color).toBe('#FF5733');
  });

  it('returns 500 when DB update fails', async () => {
    mockGetServerSession.mockResolvedValue(mockAdminSession);
    const updateBuilder = createUpdateBuilder({ message: 'Update failed' });
    mockFrom.mockReturnValue(updateBuilder);

    const res = await PATCH(makePatchRequest({ name: 'Updated' }), makeParams(INITIATIVE_UUID));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('Failed to update initiative');
  });

  it('returns 500 when getServerSession throws', async () => {
    mockGetServerSession.mockRejectedValue(new Error('Unexpected error'));
    const res = await PATCH(makePatchRequest({ name: 'Updated' }), makeParams(INITIATIVE_UUID));
    expect(res.status).toBe(500);
  });
});

describe('DELETE /api/initiatives/[initiativeId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when no session', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await DELETE(makeDeleteRequest(), makeParams(INITIATIVE_UUID));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe('Unauthorized');
  });

  it('returns 401 when session has no user id', async () => {
    mockGetServerSession.mockResolvedValue({ user: {}, expires: '' });
    const res = await DELETE(makeDeleteRequest(), makeParams(INITIATIVE_UUID));
    expect(res.status).toBe(401);
  });

  it('returns 403 when user is not admin', async () => {
    mockGetServerSession.mockResolvedValue(mockUserSession);
    const res = await DELETE(makeDeleteRequest(), makeParams(INITIATIVE_UUID));
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toBe('Forbidden');
  });

  it('returns 400 for invalid UUID format', async () => {
    mockGetServerSession.mockResolvedValue(mockAdminSession);
    const res = await DELETE(makeDeleteRequest(), makeParams('not-a-valid-uuid'));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Invalid initiative ID');
  });

  it('returns 200 on successful soft delete', async () => {
    mockGetServerSession.mockResolvedValue(mockAdminSession);

    const updateBuilder: Record<string, ReturnType<typeof vi.fn>> = {};
    updateBuilder.update = vi.fn().mockReturnValue(updateBuilder);
    updateBuilder.eq = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue(updateBuilder);

    const res = await DELETE(makeDeleteRequest(), makeParams(INITIATIVE_UUID));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it('returns 500 when DB soft delete fails', async () => {
    mockGetServerSession.mockResolvedValue(mockAdminSession);

    const updateBuilder: Record<string, ReturnType<typeof vi.fn>> = {};
    updateBuilder.update = vi.fn().mockReturnValue(updateBuilder);
    updateBuilder.eq = vi.fn().mockResolvedValue({ error: { message: 'Delete failed' } });
    mockFrom.mockReturnValue(updateBuilder);

    const res = await DELETE(makeDeleteRequest(), makeParams(INITIATIVE_UUID));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('Failed to delete initiative');
  });

  it('returns 500 when getServerSession throws', async () => {
    mockGetServerSession.mockRejectedValue(new Error('Unexpected error'));
    const res = await DELETE(makeDeleteRequest(), makeParams(INITIATIVE_UUID));
    expect(res.status).toBe(500);
  });

  it('returns 500 when non-Error value is thrown', async () => {
    mockGetServerSession.mockRejectedValue('string error');
    const res = await DELETE(makeDeleteRequest(), makeParams(INITIATIVE_UUID));
    expect(res.status).toBe(500);
  });
});
