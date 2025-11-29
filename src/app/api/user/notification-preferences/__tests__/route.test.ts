import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGetServerSession, mockSelectBuilder, mockUpdateBuilder, mockFrom } = vi.hoisted(() => {
  const mockSelectBuilder: Record<string, ReturnType<typeof vi.fn>> = {};
  mockSelectBuilder.select = vi.fn().mockReturnValue(mockSelectBuilder);
  mockSelectBuilder.eq = vi.fn().mockReturnValue(mockSelectBuilder);
  mockSelectBuilder.single = vi.fn().mockResolvedValue({ data: null, error: null });

  const mockUpdateBuilder: Record<string, ReturnType<typeof vi.fn>> = {};
  mockUpdateBuilder.update = vi.fn().mockReturnValue(mockUpdateBuilder);
  mockUpdateBuilder.eq = vi.fn().mockResolvedValue({ error: null });

  const mockFrom = vi.fn();

  return {
    mockGetServerSession: vi.fn(),
    mockSelectBuilder,
    mockUpdateBuilder,
    mockFrom,
  };
});

vi.mock('next-auth', () => ({
  getServerSession: mockGetServerSession,
}));

vi.mock('@/app/api/auth/[...nextauth]/auth', () => ({
  authOptions: {},
}));

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: { from: mockFrom },
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import { GET, PUT } from '../route';
import { NextRequest } from 'next/server';

const MOCK_SESSION = {
  user: { id: 'aaaa-bbbb-cccc-dddd', name: 'Test', alias: 'test', bsy_id: 'test', role: 'user' },
};

function makeGetRequest(): NextRequest {
  return new NextRequest('http://localhost/api/user/notification-preferences', {
    method: 'GET',
  });
}

function makePutRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/user/notification-preferences', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('GET /api/user/notification-preferences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue(mockSelectBuilder);
    mockSelectBuilder.select.mockReturnValue(mockSelectBuilder);
    mockSelectBuilder.eq.mockReturnValue(mockSelectBuilder);
    mockSelectBuilder.single.mockResolvedValue({ data: null, error: null });
  });

  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValueOnce(null);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(401);
  });

  it('returns 401 when session has no user id', async () => {
    mockGetServerSession.mockResolvedValueOnce({ user: {} });
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(401);
  });

  it('returns empty preferences when user has null preferences', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION);
    mockSelectBuilder.single.mockResolvedValueOnce({
      data: { notification_preferences: null },
      error: null,
    });

    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.preferences).toEqual({});
  });

  it('returns stored preferences', async () => {
    const prefs = { like: false, follow: false };
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION);
    mockSelectBuilder.single.mockResolvedValueOnce({
      data: { notification_preferences: prefs },
      error: null,
    });

    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.preferences).toEqual(prefs);
  });

  it('returns 500 on database error', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION);
    mockSelectBuilder.single.mockResolvedValueOnce({
      data: null,
      error: { message: 'DB error' },
    });

    const res = await GET(makeGetRequest());
    expect(res.status).toBe(500);
  });
});

describe('PUT /api/user/notification-preferences', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockSelectBuilder.select.mockReturnValue(mockSelectBuilder);
    mockSelectBuilder.eq.mockReturnValue(mockSelectBuilder);
    mockSelectBuilder.single.mockResolvedValue({ data: { notification_preferences: null }, error: null });

    mockUpdateBuilder.update.mockReturnValue(mockUpdateBuilder);
    mockUpdateBuilder.eq.mockResolvedValue({ error: null });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return mockSelectBuilder;
      return mockUpdateBuilder;
    });
  });

  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValueOnce(null);
    const res = await PUT(makePutRequest({ preferences: { like: false } }));
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid JSON body', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION);
    const req = new NextRequest('http://localhost/api/user/notification-preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json',
    });
    const res = await PUT(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid notification type', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION);
    const res = await PUT(makePutRequest({ preferences: { invalid_type: false } }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.details).toBeDefined();
  });

  it('returns 400 for non-boolean preference value', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION);
    const res = await PUT(makePutRequest({ preferences: { like: 'yes' } }));
    expect(res.status).toBe(400);
  });

  it('merges new preferences with existing ones', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION);
    mockSelectBuilder.single.mockResolvedValueOnce({
      data: { notification_preferences: { follow: false } },
      error: null,
    });

    const res = await PUT(makePutRequest({ preferences: { like: false } }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.preferences).toEqual({ like: false, follow: false });
  });

  it('cleans true values from stored preferences (sparse)', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION);
    mockSelectBuilder.single.mockResolvedValueOnce({
      data: { notification_preferences: { like: false } },
      error: null,
    });

    const res = await PUT(makePutRequest({ preferences: { like: true } }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.preferences).toEqual({});
  });

  it('returns 500 when fetch of existing preferences fails', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION);
    mockSelectBuilder.single.mockResolvedValueOnce({
      data: null,
      error: { message: 'Fetch failed' },
    });

    const res = await PUT(makePutRequest({ preferences: { like: false } }));
    expect(res.status).toBe(500);
  });

  it('returns 500 when update fails', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION);
    mockSelectBuilder.single.mockResolvedValueOnce({
      data: { notification_preferences: null },
      error: null,
    });
    mockUpdateBuilder.eq.mockResolvedValueOnce({ error: { message: 'Update failed' } });

    const res = await PUT(makePutRequest({ preferences: { like: false } }));
    expect(res.status).toBe(500);
  });
});
