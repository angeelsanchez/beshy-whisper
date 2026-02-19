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

const USER_ID = '550e8400-e29b-41d4-a716-446655440000';
const OTHER_USER_ID = '660e8400-e29b-41d4-a716-446655440001';

const mockSession = {
  user: {
    id: USER_ID,
    email: 'test@test.com',
    alias: 'BSY001',
    name: 'Test User',
    role: 'user',
  },
  expires: new Date(Date.now() + 86400000).toISOString(),
};

function makeEntry(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'entry-1',
    user_id: OTHER_USER_ID,
    nombre: 'Author',
    mensaje: 'Hello world',
    fecha: '2026-01-15T10:00:00Z',
    franja: 'DIA',
    guest: false,
    is_private: false,
    edited: false,
    ip: '127.0.0.1',
    users: { alias: 'author1', name: 'Author Name', bsy_id: 'BSY002', profile_photo_url: null },
    ...overrides,
  };
}

function makeRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost/api/feed');
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new NextRequest(url);
}

function createEntriesBuilder(data: Record<string, unknown>[], count: number = data.length) {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {};
  builder.select = vi.fn().mockReturnValue(builder);
  builder.eq = vi.fn().mockReturnValue(builder);
  builder.in = vi.fn().mockReturnValue(builder);
  builder.order = vi.fn().mockReturnValue(builder);
  builder.range = vi.fn().mockResolvedValue({ data, error: null, count });
  return builder;
}

function createFollowsBuilder(data: Array<{ following_id: string }> | null, error: { message: string } | null = null) {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {};
  builder.select = vi.fn().mockReturnValue(builder);
  builder.eq = vi.fn().mockResolvedValue({ data, error });
  return builder;
}

function createRepostsBuilder(data: Record<string, unknown>[] | null = [], error: { message: string } | null = null) {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {};
  builder.select = vi.fn().mockReturnValue(builder);
  builder.in = vi.fn().mockReturnValue(builder);
  builder.order = vi.fn().mockReturnValue(builder);
  builder.range = vi.fn().mockResolvedValue({ data, error });
  return builder;
}

describe('GET /api/feed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('all feed (default filter)', () => {
    it('returns entries without session (anonymous access)', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const entries = [makeEntry(), makeEntry({ id: 'entry-2', nombre: 'Author2' })];
      const builder = createEntriesBuilder(entries, 2);
      mockFrom.mockReturnValue(builder);

      const res = await GET(makeRequest());
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.entries).toHaveLength(2);
      expect(json.total).toBe(2);
    });

    it('returns formatted entry with correct display fields', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);

      const entry = makeEntry({
        id: 'entry-1',
        user_id: OTHER_USER_ID,
        franja: 'DIA',
        users: { alias: 'cool_alias', name: 'Cool Name', bsy_id: 'BSY099', profile_photo_url: 'https://example.com/photo.jpg' },
      });
      const builder = createEntriesBuilder([entry], 1);
      mockFrom.mockReturnValue(builder);

      const res = await GET(makeRequest());
      const json = await res.json();
      const formatted = json.entries[0];

      expect(formatted.display_id).toBe('cool_alias');
      expect(formatted.display_name).toBe('Cool Name');
      expect(formatted.likes_count).toBe(0);
      expect(formatted.reposts_count).toBe(0);
      expect(formatted.has_objectives).toBe(true);
      expect(formatted.is_own).toBe(false);
      expect(formatted.profile_photo_url).toBe('https://example.com/photo.jpg');
    });

    it('marks entry as is_own when user_id matches current session', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);

      const entry = makeEntry({ user_id: USER_ID, users: { alias: 'BSY001', name: 'Test User', bsy_id: 'BSY001', profile_photo_url: null } });
      const builder = createEntriesBuilder([entry], 1);
      mockFrom.mockReturnValue(builder);

      const res = await GET(makeRequest());
      const json = await res.json();

      expect(json.entries[0].is_own).toBe(true);
    });

    it('returns empty feed when no entries exist', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const builder = createEntriesBuilder([], 0);
      mockFrom.mockReturnValue(builder);

      const res = await GET(makeRequest());
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.entries).toEqual([]);
      expect(json.total).toBe(0);
    });

    it('filters out private entries from other users', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);

      const entries = [
        makeEntry({ id: 'public-entry', is_private: false }),
        makeEntry({ id: 'private-other', is_private: true, user_id: OTHER_USER_ID }),
        makeEntry({ id: 'private-own', is_private: true, user_id: USER_ID, users: { alias: 'BSY001', name: 'Test User', bsy_id: 'BSY001', profile_photo_url: null } }),
      ];
      const builder = createEntriesBuilder(entries, 3);
      mockFrom.mockReturnValue(builder);

      const res = await GET(makeRequest());
      const json = await res.json();

      expect(json.entries).toHaveLength(2);
      const ids = json.entries.map((e: Record<string, unknown>) => e.id);
      expect(ids).toContain('public-entry');
      expect(ids).toContain('private-own');
      expect(ids).not.toContain('private-other');
    });

    it('formats guest entries with "(Invitado)" suffix', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const entry = makeEntry({ user_id: null, guest: true, nombre: 'GuestUser', users: null });
      const builder = createEntriesBuilder([entry], 1);
      mockFrom.mockReturnValue(builder);

      const res = await GET(makeRequest());
      const json = await res.json();

      expect(json.entries[0].display_id).toBe('GuestUser (Invitado)');
      expect(json.entries[0].display_name).toBe('GuestUser');
    });

    it('uses "Anonimo" for guest entries without name', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const entry = makeEntry({ user_id: null, guest: true, nombre: '', users: null });
      const builder = createEntriesBuilder([entry], 1);
      mockFrom.mockReturnValue(builder);

      const res = await GET(makeRequest());
      const json = await res.json();

      expect(json.entries[0].display_name).toContain('nimo');
      expect(json.entries[0].display_id).toContain('nimo');
    });

    it('sets has_objectives to false for NOCHE entries', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const entry = makeEntry({ franja: 'NOCHE' });
      const builder = createEntriesBuilder([entry], 1);
      mockFrom.mockReturnValue(builder);

      const res = await GET(makeRequest());
      const json = await res.json();

      expect(json.entries[0].has_objectives).toBe(false);
    });

    it('returns 500 when entries query fails', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const builder: Record<string, ReturnType<typeof vi.fn>> = {};
      builder.select = vi.fn().mockReturnValue(builder);
      builder.order = vi.fn().mockReturnValue(builder);
      builder.range = vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' }, count: null });
      mockFrom.mockReturnValue(builder);

      const res = await GET(makeRequest());
      expect(res.status).toBe(500);

      const json = await res.json();
      expect(json.error).toBe('Internal server error');
    });

    it('respects limit and offset query params', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const builder = createEntriesBuilder([], 0);
      mockFrom.mockReturnValue(builder);

      await GET(makeRequest({ limit: '10', offset: '20' }));

      expect(builder.range).toHaveBeenCalledWith(20, 29);
    });

    it('uses display_name fallback when user has no name', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const entry = makeEntry({
        users: { alias: 'abc123', name: undefined, bsy_id: 'BSY010', profile_photo_url: null },
      });
      const builder = createEntriesBuilder([entry], 1);
      mockFrom.mockReturnValue(builder);

      const res = await GET(makeRequest());
      const json = await res.json();

      expect(json.entries[0].display_name).toBe('Usuario abc123');
      expect(json.entries[0].display_id).toBe('abc123');
    });

    it('handles null entries from supabase gracefully', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const builder: Record<string, ReturnType<typeof vi.fn>> = {};
      builder.select = vi.fn().mockReturnValue(builder);
      builder.order = vi.fn().mockReturnValue(builder);
      builder.range = vi.fn().mockResolvedValue({ data: null, error: null, count: 0 });
      mockFrom.mockReturnValue(builder);

      const res = await GET(makeRequest());
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.entries).toEqual([]);
      expect(json.total).toBe(0);
    });
  });

  describe('validation', () => {
    it('returns 400 for invalid filter value', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const res = await GET(makeRequest({ filter: 'invalid' }));
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error).toBe('Invalid request data');
    });

    it('returns 400 for negative offset', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const res = await GET(makeRequest({ offset: '-1' }));
      expect(res.status).toBe(400);
    });

    it('returns 400 for limit exceeding max', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const res = await GET(makeRequest({ limit: '101' }));
      expect(res.status).toBe(400);
    });

    it('returns 400 for limit of zero', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const res = await GET(makeRequest({ limit: '0' }));
      expect(res.status).toBe(400);
    });

    it('returns 400 for non-numeric limit', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const res = await GET(makeRequest({ limit: 'abc' }));
      expect(res.status).toBe(400);
    });
  });

  describe('following filter', () => {
    it('returns 401 when filter=following without session', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const res = await GET(makeRequest({ filter: 'following' }));
      expect(res.status).toBe(401);

      const json = await res.json();
      expect(json.error).toBe('Unauthorized');
    });

    it('returns empty when user follows nobody', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);

      const followsBuilder = createFollowsBuilder([]);
      mockFrom.mockReturnValue(followsBuilder);

      const res = await GET(makeRequest({ filter: 'following' }));
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.entries).toEqual([]);
      expect(json.total).toBe(0);
    });

    it('returns entries from followed users', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);

      const followedUserId = '770e8400-e29b-41d4-a716-446655440002';
      const followsBuilder = createFollowsBuilder([{ following_id: followedUserId }]);
      const entriesBuilder = createEntriesBuilder([makeEntry({ user_id: followedUserId })], 1);
      const repostsBuilder = createRepostsBuilder([]);

      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return followsBuilder;
        if (callCount === 2) return entriesBuilder;
        return repostsBuilder;
      });

      const res = await GET(makeRequest({ filter: 'following' }));
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.entries).toHaveLength(1);
      expect(json.entries[0].id).toBe('entry-1');
    });

    it('returns 500 when follows query fails', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);

      const followsBuilder = createFollowsBuilder(null, { message: 'DB error' });
      mockFrom.mockReturnValue(followsBuilder);

      const res = await GET(makeRequest({ filter: 'following' }));
      expect(res.status).toBe(500);

      const json = await res.json();
      expect(json.error).toBe('Internal server error');
    });

    it('returns 500 when entries query fails for following feed', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);

      const followedUserId = '770e8400-e29b-41d4-a716-446655440002';
      const followsBuilder = createFollowsBuilder([{ following_id: followedUserId }]);

      const entriesBuilder: Record<string, ReturnType<typeof vi.fn>> = {};
      entriesBuilder.select = vi.fn().mockReturnValue(entriesBuilder);
      entriesBuilder.in = vi.fn().mockReturnValue(entriesBuilder);
      entriesBuilder.eq = vi.fn().mockReturnValue(entriesBuilder);
      entriesBuilder.order = vi.fn().mockReturnValue(entriesBuilder);
      entriesBuilder.range = vi.fn().mockResolvedValue({ data: null, error: { message: 'entries error' }, count: null });

      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? followsBuilder : entriesBuilder;
      });

      const res = await GET(makeRequest({ filter: 'following' }));
      expect(res.status).toBe(500);
    });

    it('merges reposts into the following feed', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);

      const followedUserId = '770e8400-e29b-41d4-a716-446655440002';
      const followsBuilder = createFollowsBuilder([{ following_id: followedUserId }]);
      const entriesBuilder = createEntriesBuilder([
        makeEntry({ id: 'original-entry', user_id: followedUserId, fecha: '2026-01-10T10:00:00Z' }),
      ], 1);

      const repostData = [{
        id: 'repost-1',
        user_id: followedUserId,
        created_at: '2026-01-15T12:00:00Z',
        users: { alias: 'reposter', name: 'Reposter Name', bsy_id: 'BSY003', profile_photo_url: null },
        entries: {
          id: 'reposted-entry',
          user_id: 'someone-else',
          nombre: 'Someone',
          mensaje: 'Reposted content',
          fecha: '2026-01-05T10:00:00Z',
          franja: 'NOCHE',
          guest: false,
          is_private: false,
          edited: false,
          ip: '127.0.0.1',
          users: { alias: 'someone', name: 'Someone Else', bsy_id: 'BSY004', profile_photo_url: null },
        },
      }];
      const repostsBuilder = createRepostsBuilder(repostData);

      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return followsBuilder;
        if (callCount === 2) return entriesBuilder;
        return repostsBuilder;
      });

      const res = await GET(makeRequest({ filter: 'following' }));
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.entries).toHaveLength(2);

      const repostEntry = json.entries.find((e: Record<string, unknown>) => e.is_repost === true);
      expect(repostEntry).toBeDefined();
      expect(repostEntry.id).toBe('reposted-entry');
      expect(repostEntry.reposted_by.display_name).toBe('Reposter Name');
      expect(repostEntry.reposted_by.user_id).toBe(followedUserId);
    });

    it('does not duplicate entries that appear as both original and repost', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);

      const followedUserId = '770e8400-e29b-41d4-a716-446655440002';
      const sharedEntryId = 'shared-entry';
      const followsBuilder = createFollowsBuilder([{ following_id: followedUserId }]);
      const entriesBuilder = createEntriesBuilder([
        makeEntry({ id: sharedEntryId, user_id: followedUserId }),
      ], 1);

      const repostData = [{
        id: 'repost-dup',
        user_id: followedUserId,
        created_at: '2026-01-15T12:00:00Z',
        users: { alias: 'reposter', name: 'Reposter', bsy_id: 'BSY003', profile_photo_url: null },
        entries: {
          id: sharedEntryId,
          user_id: followedUserId,
          nombre: 'Author',
          mensaje: 'Same entry',
          fecha: '2026-01-15T10:00:00Z',
          franja: 'DIA',
          guest: false,
          is_private: false,
          edited: false,
          ip: '127.0.0.1',
          users: { alias: 'author1', name: 'Author Name', bsy_id: 'BSY002', profile_photo_url: null },
        },
      }];
      const repostsBuilder = createRepostsBuilder(repostData);

      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return followsBuilder;
        if (callCount === 2) return entriesBuilder;
        return repostsBuilder;
      });

      const res = await GET(makeRequest({ filter: 'following' }));
      const json = await res.json();

      expect(json.entries).toHaveLength(1);
      expect(json.entries[0].id).toBe(sharedEntryId);
    });

    it('excludes private reposted entries', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);

      const followedUserId = '770e8400-e29b-41d4-a716-446655440002';
      const followsBuilder = createFollowsBuilder([{ following_id: followedUserId }]);
      const entriesBuilder = createEntriesBuilder([], 0);

      const repostData = [{
        id: 'repost-private',
        user_id: followedUserId,
        created_at: '2026-01-15T12:00:00Z',
        users: { alias: 'reposter', name: 'Reposter', bsy_id: 'BSY003', profile_photo_url: null },
        entries: {
          id: 'private-entry',
          user_id: 'someone',
          nombre: 'Someone',
          mensaje: 'Private message',
          fecha: '2026-01-15T10:00:00Z',
          franja: 'DIA',
          guest: false,
          is_private: true,
          edited: false,
          ip: '127.0.0.1',
          users: { alias: 'someone', name: 'Someone', bsy_id: 'BSY005', profile_photo_url: null },
        },
      }];
      const repostsBuilder = createRepostsBuilder(repostData);

      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return followsBuilder;
        if (callCount === 2) return entriesBuilder;
        return repostsBuilder;
      });

      const res = await GET(makeRequest({ filter: 'following' }));
      const json = await res.json();

      const repostEntries = json.entries.filter((e: Record<string, unknown>) => e.is_repost === true);
      expect(repostEntries).toHaveLength(0);
    });

    it('continues gracefully when reposts query fails', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);

      const followedUserId = '770e8400-e29b-41d4-a716-446655440002';
      const followsBuilder = createFollowsBuilder([{ following_id: followedUserId }]);
      const entriesBuilder = createEntriesBuilder([makeEntry({ user_id: followedUserId })], 1);
      const repostsBuilder = createRepostsBuilder(null, { message: 'reposts error' });

      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return followsBuilder;
        if (callCount === 2) return entriesBuilder;
        return repostsBuilder;
      });

      const res = await GET(makeRequest({ filter: 'following' }));
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.entries).toHaveLength(1);
    });

    it('sorts merged entries by date descending', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);

      const followedUserId = '770e8400-e29b-41d4-a716-446655440002';
      const followsBuilder = createFollowsBuilder([{ following_id: followedUserId }]);
      const entriesBuilder = createEntriesBuilder([
        makeEntry({ id: 'old-entry', user_id: followedUserId, fecha: '2026-01-01T10:00:00Z' }),
        makeEntry({ id: 'new-entry', user_id: followedUserId, fecha: '2026-01-20T10:00:00Z' }),
      ], 2);

      const repostData = [{
        id: 'repost-mid',
        user_id: followedUserId,
        created_at: '2026-01-10T10:00:00Z',
        users: { alias: 'reposter', name: 'Reposter', bsy_id: 'BSY003', profile_photo_url: null },
        entries: {
          id: 'reposted-mid',
          user_id: 'someone',
          nombre: 'Someone',
          mensaje: 'Middle entry',
          fecha: '2025-12-25T10:00:00Z',
          franja: 'DIA',
          guest: false,
          is_private: false,
          edited: false,
          ip: '127.0.0.1',
          users: { alias: 'someone', name: 'Someone', bsy_id: 'BSY006', profile_photo_url: null },
        },
      }];
      const repostsBuilder = createRepostsBuilder(repostData);

      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return followsBuilder;
        if (callCount === 2) return entriesBuilder;
        return repostsBuilder;
      });

      const res = await GET(makeRequest({ filter: 'following' }));
      const json = await res.json();

      expect(json.entries).toHaveLength(3);
      expect(json.entries[0].id).toBe('new-entry');
      expect(json.entries[1].id).toBe('reposted-mid');
      expect(json.entries[2].id).toBe('old-entry');
    });

    it('uses "Alguien" when reposter has no name or alias', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);

      const followedUserId = '770e8400-e29b-41d4-a716-446655440002';
      const followsBuilder = createFollowsBuilder([{ following_id: followedUserId }]);
      const entriesBuilder = createEntriesBuilder([], 0);

      const repostData = [{
        id: 'repost-anon',
        user_id: followedUserId,
        created_at: '2026-01-15T12:00:00Z',
        users: null,
        entries: {
          id: 'reposted-anon-entry',
          user_id: 'someone',
          nombre: 'Someone',
          mensaje: 'Content',
          fecha: '2026-01-10T10:00:00Z',
          franja: 'DIA',
          guest: false,
          is_private: false,
          edited: false,
          ip: '127.0.0.1',
          users: { alias: 'someone', name: 'Someone', bsy_id: 'BSY007', profile_photo_url: null },
        },
      }];
      const repostsBuilder = createRepostsBuilder(repostData);

      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return followsBuilder;
        if (callCount === 2) return entriesBuilder;
        return repostsBuilder;
      });

      const res = await GET(makeRequest({ filter: 'following' }));
      const json = await res.json();

      const repostEntry = json.entries.find((e: Record<string, unknown>) => e.is_repost === true);
      expect(repostEntry.reposted_by.display_name).toBe('Alguien');
    });

    it('excludes reposts with null entries', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);

      const followedUserId = '770e8400-e29b-41d4-a716-446655440002';
      const followsBuilder = createFollowsBuilder([{ following_id: followedUserId }]);
      const entriesBuilder = createEntriesBuilder([], 0);

      const repostData = [{
        id: 'repost-null',
        user_id: followedUserId,
        created_at: '2026-01-15T12:00:00Z',
        users: { alias: 'reposter', name: 'Reposter', bsy_id: 'BSY003', profile_photo_url: null },
        entries: null,
      }];
      const repostsBuilder = createRepostsBuilder(repostData);

      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return followsBuilder;
        if (callCount === 2) return entriesBuilder;
        return repostsBuilder;
      });

      const res = await GET(makeRequest({ filter: 'following' }));
      const json = await res.json();

      expect(json.entries).toHaveLength(0);
    });
  });

  describe('error handling', () => {
    it('returns 500 when an unexpected error is thrown', async () => {
      mockGetServerSession.mockRejectedValue(new Error('Unexpected failure'));

      const res = await GET(makeRequest());
      expect(res.status).toBe(500);

      const json = await res.json();
      expect(json.error).toBe('Internal server error');
    });

    it('handles non-Error thrown values', async () => {
      mockGetServerSession.mockRejectedValue('string error');

      const res = await GET(makeRequest());
      expect(res.status).toBe(500);

      const json = await res.json();
      expect(json.error).toBe('Internal server error');
    });
  });
});
