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

vi.mock('@/app/api/auth/[...nextauth]/auth', () => ({
  authOptions: {},
}));

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: { from: mockFrom },
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import { GET } from '../route';

const VALID_USER_ID = '550e8400-e29b-41d4-a716-446655440000';

function makeRequest(userId: string): NextRequest {
  return new NextRequest(`http://localhost/api/reposts/user?userId=${userId}`);
}

describe('GET /api/reposts/user', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 with invalid userId', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await GET(makeRequest('not-a-uuid'));
    expect(res.status).toBe(400);
  });

  it('returns empty entries when user has no reposts', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const builder: Record<string, ReturnType<typeof vi.fn>> = {};
    builder.select = vi.fn().mockReturnValue(builder);
    builder.eq = vi.fn().mockReturnValue(builder);
    builder.order = vi.fn().mockReturnValue(builder);
    builder.range = vi.fn().mockResolvedValue({ data: [], error: null, count: 0 });
    mockFrom.mockReturnValue(builder);

    const res = await GET(makeRequest(VALID_USER_ID));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.entries).toEqual([]);
    expect(json.total).toBe(0);
  });

  it('returns formatted entries when user has reposts', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const repostData = [{
      id: 'repost-1',
      created_at: '2026-01-01T00:00:00Z',
      entries: {
        id: 'entry-1',
        user_id: 'author-1',
        nombre: 'Author',
        mensaje: 'Hello world',
        fecha: '2026-01-01T00:00:00Z',
        franja: 'DIA',
        guest: false,
        is_private: false,
        edited: false,
        mood: null,
        users: { alias: 'author', name: 'Author Name', bsy_id: 'BSY002', profile_photo_url: null },
      },
    }];

    const builder: Record<string, ReturnType<typeof vi.fn>> = {};
    builder.select = vi.fn().mockReturnValue(builder);
    builder.eq = vi.fn().mockReturnValue(builder);
    builder.order = vi.fn().mockReturnValue(builder);
    builder.range = vi.fn().mockResolvedValue({ data: repostData, error: null, count: 1 });
    mockFrom.mockReturnValue(builder);

    const res = await GET(makeRequest(VALID_USER_ID));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.entries).toHaveLength(1);
    expect(json.entries[0].id).toBe('entry-1');
    expect(json.entries[0].display_name).toBe('Author Name');
    expect(json.entries[0].reposted_at).toBe('2026-01-01T00:00:00Z');
  });

  it('filters out private entries', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const repostData = [{
      id: 'repost-1',
      created_at: '2026-01-01T00:00:00Z',
      entries: {
        id: 'entry-1',
        user_id: 'author-1',
        nombre: 'Author',
        mensaje: 'Private whisper',
        fecha: '2026-01-01T00:00:00Z',
        franja: 'DIA',
        guest: false,
        is_private: true,
        edited: false,
        mood: null,
        users: { alias: 'author', name: 'Author Name', bsy_id: 'BSY002', profile_photo_url: null },
      },
    }];

    const builder: Record<string, ReturnType<typeof vi.fn>> = {};
    builder.select = vi.fn().mockReturnValue(builder);
    builder.eq = vi.fn().mockReturnValue(builder);
    builder.order = vi.fn().mockReturnValue(builder);
    builder.range = vi.fn().mockResolvedValue({ data: repostData, error: null, count: 1 });
    mockFrom.mockReturnValue(builder);

    const res = await GET(makeRequest(VALID_USER_ID));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.entries).toHaveLength(0);
  });
});
