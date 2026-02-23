import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { NextRequest } from 'next/server';

const { mockSendPushToUser, mockQueryBuilder, mockGetBatchUserPreferences, mockIsNotificationEnabled } = vi.hoisted(() => {
  const mockSendPushToUser = vi.fn();
  const mockGetBatchUserPreferences = vi.fn();
  const mockIsNotificationEnabled = vi.fn();

  const mockQueryBuilder: Record<string, ReturnType<typeof vi.fn>> = {};
  mockQueryBuilder.select = vi.fn().mockReturnValue(mockQueryBuilder);
  mockQueryBuilder.insert = vi.fn().mockReturnValue(mockQueryBuilder);
  mockQueryBuilder.delete = vi.fn().mockReturnValue(mockQueryBuilder);
  mockQueryBuilder.single = vi.fn().mockResolvedValue({ data: { id: 'log-id-123' }, error: null });
  mockQueryBuilder.eq = vi.fn().mockReturnValue(mockQueryBuilder);
  mockQueryBuilder.gte = vi.fn().mockReturnValue(mockQueryBuilder);
  mockQueryBuilder.not = vi.fn().mockReturnValue(mockQueryBuilder);
  mockQueryBuilder.in = vi.fn().mockReturnValue(mockQueryBuilder);
  mockQueryBuilder.contains = vi.fn().mockReturnValue(mockQueryBuilder);
  mockQueryBuilder.limit = vi.fn().mockResolvedValue({ data: [], error: null });
  mockQueryBuilder.filter = vi.fn().mockReturnValue(mockQueryBuilder);

  return { mockSendPushToUser, mockQueryBuilder, mockGetBatchUserPreferences, mockIsNotificationEnabled };
});

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('@/utils/crypto-helpers', () => ({
  safeCompare: (a: string, b: string) => a === b,
}));

vi.mock('@/lib/push-notify', () => ({
  sendPushToUser: mockSendPushToUser,
  ensureVapidConfigured: vi.fn().mockReturnValue(true),
}));

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: vi.fn(() => mockQueryBuilder),
  },
}));

vi.mock('@/lib/notification-preferences', () => ({
  isNotificationEnabled: mockIsNotificationEnabled,
  getBatchUserPreferences: mockGetBatchUserPreferences,
}));

vi.mock('@/lib/streak', () => ({
  calculateUserStreak: vi.fn().mockResolvedValue(5),
  checkUserTodayPosts: vi.fn().mockResolvedValue({ hasDayPost: false, hasNightPost: false }),
}));

const originalEnv = { ...process.env };

import { GET, POST } from '../route';
import { logger } from '@/lib/logger';

const CRON_SECRET = 'test-cron-secret-456';
const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440000';

function makeGetRequest(authHeader?: string): NextRequest {
  const headers: Record<string, string> = {};
  if (authHeader) {
    headers['authorization'] = authHeader;
  }
  return new NextRequest('http://localhost/api/notifications/cron-reminders', {
    method: 'GET',
    headers,
  });
}

function makePostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/notifications/cron-reminders', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('/api/notifications/cron-reminders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = CRON_SECRET;

    mockQueryBuilder.select.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.insert.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.delete.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.single.mockResolvedValue({ data: { id: 'log-id-123' }, error: null });
    mockQueryBuilder.eq.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.gte.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.not.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.in.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.contains.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.limit.mockResolvedValue({ data: [], error: null });

    mockIsNotificationEnabled.mockReturnValue(true);
    mockGetBatchUserPreferences.mockResolvedValue(new Map());
    mockSendPushToUser.mockResolvedValue(true);
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('GET (cron trigger)', () => {
    it('returns 500 when CRON_SECRET is not configured', async () => {
      delete process.env.CRON_SECRET;
      const res = await GET(makeGetRequest(`Bearer ${CRON_SECRET}`));
      expect(res.status).toBe(500);
    });

    it('returns 401 without authorization header', async () => {
      const res = await GET(makeGetRequest());
      expect(res.status).toBe(401);
    });

    it('returns 401 with wrong secret', async () => {
      const res = await GET(makeGetRequest('Bearer wrong-secret'));
      expect(res.status).toBe(401);
    });

    it('returns 200 with valid auth and processes reminders', async () => {
      mockQueryBuilder.select.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.eq.mockReturnValue(mockQueryBuilder);
      // push_tokens query returns one user
      const selectMock = vi.fn().mockResolvedValueOnce({
        data: [{ user_id: TEST_USER_ID }],
        error: null,
      });
      mockQueryBuilder.select = selectMock;

      const res = await GET(makeGetRequest(`Bearer ${CRON_SECRET}`));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.results).toBeDefined();
    });
  });

  describe('POST (manual trigger)', () => {
    it('returns 500 when CRON_SECRET is not configured', async () => {
      delete process.env.CRON_SECRET;
      const res = await POST(makePostRequest({ action: 'process', secret: CRON_SECRET }));
      expect(res.status).toBe(500);
    });

    it('returns 400 with invalid body', async () => {
      const res = await POST(makePostRequest({ invalid: true }));
      expect(res.status).toBe(400);
    });

    it('returns 401 with wrong secret in body', async () => {
      const res = await POST(makePostRequest({ action: 'process', secret: 'wrong' }));
      expect(res.status).toBe(401);
    });

    it('returns 200 with valid secret and processes reminders', async () => {
      const selectMock = vi.fn().mockResolvedValueOnce({
        data: [],
        error: null,
      });
      mockQueryBuilder.select = selectMock;

      const res = await POST(makePostRequest({ action: 'process', secret: CRON_SECRET }));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });
  });

  describe('deduplication behavior', () => {
    it('does not send when no users have push tokens', async () => {
      mockQueryBuilder.select.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.eq.mockReturnValue(mockQueryBuilder);
      // push_tokens query returns empty
      mockQueryBuilder.select.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      await GET(makeGetRequest(`Bearer ${CRON_SECRET}`));

      expect(mockSendPushToUser).not.toHaveBeenCalled();
      const res = await GET(makeGetRequest(`Bearer ${CRON_SECRET}`));
      const json = await res.json();
      expect(json.success).toBe(true);
    });

    it('handles DB error fetching users gracefully', async () => {
      mockQueryBuilder.select.mockResolvedValueOnce({
        data: null,
        error: { message: 'DB connection failed' },
      });

      const res = await GET(makeGetRequest(`Bearer ${CRON_SECRET}`));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.results.notificationsSent).toBe(0);
    });

    it('skips sending when notification type is disabled by user', async () => {
      mockIsNotificationEnabled.mockReturnValue(false);

      // Return one user from push_tokens
      mockQueryBuilder.select.mockResolvedValueOnce({
        data: [{ user_id: TEST_USER_ID }],
        error: null,
      });

      await GET(makeGetRequest(`Bearer ${CRON_SECRET}`));

      expect(mockSendPushToUser).not.toHaveBeenCalled();
    });

    it('respects dedup: cron-reminders logs to DB via insert', async () => {
      mockQueryBuilder.select.mockResolvedValueOnce({
        data: [{ user_id: TEST_USER_ID }],
        error: null,
      });

      await GET(makeGetRequest(`Bearer ${CRON_SECRET}`));

      expect(logger.info).toHaveBeenCalledWith(
        'Reminder processing complete',
        expect.any(Object)
      );
    });

    it('deletes reminder log when push send fails (allows retry)', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 1, 24, 21, 30, 0));

      mockSendPushToUser.mockResolvedValue(false);

      mockQueryBuilder.select.mockResolvedValueOnce({
        data: [{ user_id: TEST_USER_ID }],
        error: null,
      });

      await GET(makeGetRequest(`Bearer ${CRON_SECRET}`));

      expect(logger.warn).toHaveBeenCalledWith(
        'Push send failed, reminder log deleted for retry',
        expect.objectContaining({ userId: TEST_USER_ID })
      );

      vi.useRealTimers();
    });
  });
});
