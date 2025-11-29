import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockQueryBuilder, mockLogger } = vi.hoisted(() => {
  const mockQueryBuilder: Record<string, ReturnType<typeof vi.fn>> = {};
  mockQueryBuilder.select = vi.fn().mockReturnValue(mockQueryBuilder);
  mockQueryBuilder.eq = vi.fn().mockReturnValue(mockQueryBuilder);
  mockQueryBuilder.in = vi.fn().mockReturnValue(mockQueryBuilder);
  mockQueryBuilder.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });

  const mockLogger = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  };

  return { mockQueryBuilder, mockLogger };
});

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: { from: vi.fn(() => mockQueryBuilder) },
}));

vi.mock('@/lib/logger', () => ({ logger: mockLogger }));

import {
  isNotificationEnabled,
  getUserNotificationPreferences,
  isNotificationEnabledForUser,
  getBatchUserPreferences,
} from '../notification-preferences';

describe('isNotificationEnabled', () => {
  it('returns true when preferences is null', () => {
    expect(isNotificationEnabled(null, 'like')).toBe(true);
  });

  it('returns true when preferences is undefined', () => {
    expect(isNotificationEnabled(undefined as never, 'like')).toBe(true);
  });

  it('returns true when key is missing from preferences', () => {
    expect(isNotificationEnabled({}, 'like')).toBe(true);
  });

  it('returns true when key is explicitly true', () => {
    expect(isNotificationEnabled({ like: true }, 'like')).toBe(true);
  });

  it('returns false when key is explicitly false', () => {
    expect(isNotificationEnabled({ like: false }, 'like')).toBe(false);
  });

  it('handles multiple keys independently', () => {
    const prefs = { like: false, follow: true };
    expect(isNotificationEnabled(prefs, 'like')).toBe(false);
    expect(isNotificationEnabled(prefs, 'follow')).toBe(true);
    expect(isNotificationEnabled(prefs, 'chat')).toBe(true);
  });
});

describe('getUserNotificationPreferences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns preferences from database', async () => {
    const prefs = { like: false, follow: false };
    mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
      data: { notification_preferences: prefs },
      error: null,
    });

    const result = await getUserNotificationPreferences('user-1');
    expect(result).toEqual(prefs);
  });

  it('returns null when user has no preferences set', async () => {
    mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
      data: { notification_preferences: null },
      error: null,
    });

    const result = await getUserNotificationPreferences('user-1');
    expect(result).toBeNull();
  });

  it('returns null when user not found', async () => {
    mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: null,
    });

    const result = await getUserNotificationPreferences('nonexistent');
    expect(result).toBeNull();
  });

  it('returns null and logs error on database failure', async () => {
    mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'Connection refused' },
    });

    const result = await getUserNotificationPreferences('user-1');
    expect(result).toBeNull();
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Error fetching notification preferences',
      expect.objectContaining({ userId: 'user-1' })
    );
  });
});

describe('isNotificationEnabledForUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns true when user has no preferences', async () => {
    mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
      data: { notification_preferences: null },
      error: null,
    });

    const result = await isNotificationEnabledForUser('user-1', 'like');
    expect(result).toBe(true);
  });

  it('returns false when user disabled the notification type', async () => {
    mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
      data: { notification_preferences: { like: false } },
      error: null,
    });

    const result = await isNotificationEnabledForUser('user-1', 'like');
    expect(result).toBe(false);
  });

  it('returns true for a type not in preferences', async () => {
    mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
      data: { notification_preferences: { like: false } },
      error: null,
    });

    const result = await isNotificationEnabledForUser('user-1', 'follow');
    expect(result).toBe(true);
  });
});

describe('getBatchUserPreferences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty map for empty user array', async () => {
    const result = await getBatchUserPreferences([]);
    expect(result.size).toBe(0);
  });

  it('returns preferences for multiple users', async () => {
    mockQueryBuilder.in.mockResolvedValueOnce({
      data: [
        { id: 'user-1', notification_preferences: { like: false } },
        { id: 'user-2', notification_preferences: null },
        { id: 'user-3', notification_preferences: { follow: false, chat: false } },
      ],
      error: null,
    });

    const result = await getBatchUserPreferences(['user-1', 'user-2', 'user-3']);
    expect(result.size).toBe(3);
    expect(result.get('user-1')).toEqual({ like: false });
    expect(result.get('user-2')).toBeNull();
    expect(result.get('user-3')).toEqual({ follow: false, chat: false });
  });

  it('returns empty map and logs error on database failure', async () => {
    mockQueryBuilder.in.mockResolvedValueOnce({
      data: null,
      error: { message: 'Query failed' },
    });

    const result = await getBatchUserPreferences(['user-1']);
    expect(result.size).toBe(0);
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Error batch-fetching notification preferences',
      expect.objectContaining({ detail: 'Query failed' })
    );
  });

  it('returns empty map when data is null without error', async () => {
    mockQueryBuilder.in.mockResolvedValueOnce({
      data: null,
      error: null,
    });

    const result = await getBatchUserPreferences(['user-1']);
    expect(result.size).toBe(0);
  });
});
