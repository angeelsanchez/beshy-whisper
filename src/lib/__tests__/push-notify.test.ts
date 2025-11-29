import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';

const { mockSendNotification, mockQueryBuilder } = vi.hoisted(() => {
  const mockSendNotification = vi.fn();

  const mockQueryBuilder: Record<string, ReturnType<typeof vi.fn>> = {};
  mockQueryBuilder.from = vi.fn(() => mockQueryBuilder);
  mockQueryBuilder.select = vi.fn().mockReturnValue(mockQueryBuilder);
  mockQueryBuilder.delete = vi.fn().mockReturnValue(mockQueryBuilder);
  mockQueryBuilder.eq = vi.fn().mockReturnValue(mockQueryBuilder);
  mockQueryBuilder.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });

  return { mockSendNotification, mockQueryBuilder };
});

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('web-push', () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: mockSendNotification,
  },
}));

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: vi.fn(() => mockQueryBuilder),
  },
}));

const originalEnv = { ...process.env };

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'test-public-key';
  process.env.VAPID_PRIVATE_KEY = 'test-private-key';
  process.env.VAPID_EMAIL = 'mailto:test@test.com';
  mockQueryBuilder.select.mockReturnValue(mockQueryBuilder);
  mockQueryBuilder.eq.mockReturnValue(mockQueryBuilder);
  mockQueryBuilder.delete.mockReturnValue(mockQueryBuilder);
});

afterAll(() => {
  process.env = originalEnv;
});

import { sendPushToUser } from '../push-notify';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { logger } from '@/lib/logger';

const payload = {
  title: 'Test title',
  body: 'Test body',
  tag: 'test-tag',
};

describe('sendPushToUser', () => {
  it('returns false when VAPID keys are not configured', async () => {
    delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

    const result = await sendPushToUser('user-1', payload);

    expect(result).toBe(false);
    expect(logger.error).toHaveBeenCalledWith('VAPID keys not configured');
  });

  it('returns false when no push token is registered', async () => {
    mockQueryBuilder.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

    const result = await sendPushToUser('user-1', payload);

    expect(result).toBe(false);
    expect(supabaseAdmin.from).toHaveBeenCalledWith('push_tokens');
    expect(logger.info).toHaveBeenCalledWith('No push token registered', { userId: 'user-1' });
  });

  it('returns false when token query errors', async () => {
    mockQueryBuilder.maybeSingle.mockResolvedValueOnce({ data: null, error: { message: 'DB error' } });

    const result = await sendPushToUser('user-1', payload);

    expect(result).toBe(false);
  });

  it('sends notification and returns true on success', async () => {
    mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
      data: { endpoint: 'https://push.example.com/sub', p256dh: 'key1', auth: 'key2' },
      error: null,
    });
    mockSendNotification.mockResolvedValueOnce({});

    const result = await sendPushToUser('user-1', payload);

    expect(result).toBe(true);
    expect(mockSendNotification).toHaveBeenCalledWith(
      { endpoint: 'https://push.example.com/sub', keys: { p256dh: 'key1', auth: 'key2' } },
      expect.any(String),
      { TTL: 3600, headers: { Urgency: 'normal' } }
    );
    expect(logger.info).toHaveBeenCalledWith('Push notification sent', { userId: 'user-1', tag: 'test-tag' });
  });

  it('includes correct payload fields in JSON', async () => {
    mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
      data: { endpoint: 'https://push.example.com/sub', p256dh: 'key1', auth: 'key2' },
      error: null,
    });
    mockSendNotification.mockResolvedValueOnce({});

    await sendPushToUser('user-1', { ...payload, data: { url: '/test' }, requireInteraction: true });

    const sentPayload = JSON.parse(mockSendNotification.mock.calls[0][1]);
    expect(sentPayload.title).toBe('Test title');
    expect(sentPayload.body).toBe('Test body');
    expect(sentPayload.tag).toBe('test-tag');
    expect(sentPayload.icon).toBe('/icon-192.png');
    expect(sentPayload.requireInteraction).toBe(true);
    expect(sentPayload.data).toEqual({ url: '/test' });
  });

  it('removes expired token on 410 status', async () => {
    mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
      data: { endpoint: 'https://push.example.com/expired', p256dh: 'key1', auth: 'key2' },
      error: null,
    });
    mockSendNotification.mockRejectedValueOnce({ statusCode: 410, message: 'Gone' });

    const result = await sendPushToUser('user-1', payload);

    expect(result).toBe(false);
    expect(supabaseAdmin.from).toHaveBeenCalledWith('push_tokens');
    expect(mockQueryBuilder.delete).toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith('Removed expired push token', { userId: 'user-1', statusCode: 410 });
  });

  it('removes expired token on 404 status', async () => {
    mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
      data: { endpoint: 'https://push.example.com/not-found', p256dh: 'key1', auth: 'key2' },
      error: null,
    });
    mockSendNotification.mockRejectedValueOnce({ statusCode: 404, message: 'Not Found' });

    const result = await sendPushToUser('user-1', payload);

    expect(result).toBe(false);
    expect(mockQueryBuilder.delete).toHaveBeenCalled();
  });

  it('logs error on other push failures', async () => {
    mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
      data: { endpoint: 'https://push.example.com/sub', p256dh: 'key1', auth: 'key2' },
      error: null,
    });
    mockSendNotification.mockRejectedValueOnce(new Error('Network error'));

    const result = await sendPushToUser('user-1', payload);

    expect(result).toBe(false);
    expect(logger.error).toHaveBeenCalledWith('Push notification failed', expect.objectContaining({
      userId: 'user-1',
      detail: 'Network error',
    }));
  });

  it('defaults requireInteraction to false', async () => {
    mockQueryBuilder.maybeSingle.mockResolvedValueOnce({
      data: { endpoint: 'https://push.example.com/sub', p256dh: 'key1', auth: 'key2' },
      error: null,
    });
    mockSendNotification.mockResolvedValueOnce({});

    await sendPushToUser('user-1', payload);

    const sentPayload = JSON.parse(mockSendNotification.mock.calls[0][1]);
    expect(sentPayload.requireInteraction).toBe(false);
    expect(sentPayload.data).toEqual({});
  });
});
