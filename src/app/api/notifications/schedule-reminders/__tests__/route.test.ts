import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const originalEnv = { ...process.env };

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('@/utils/crypto-helpers', () => ({
  safeCompare: (a: string, b: string) => a === b,
}));

import { GET, POST } from '../route';

const CRON_SECRET = 'test-cron-secret-123';

function makeGetRequest(authHeader?: string): NextRequest {
  const headers: Record<string, string> = {};
  if (authHeader) {
    headers['authorization'] = authHeader;
  }
  return new NextRequest('http://localhost/api/notifications/schedule-reminders', {
    method: 'GET',
    headers,
  });
}

function makePostRequest(): NextRequest {
  return new NextRequest('http://localhost/api/notifications/schedule-reminders', {
    method: 'POST',
    body: JSON.stringify({ action: 'process' }),
  });
}

describe('/api/notifications/schedule-reminders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = CRON_SECRET;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('POST (deprecated)', () => {
    it('returns 410 Gone regardless of input', async () => {
      const res = await POST(makePostRequest());
      expect(res.status).toBe(410);
      const json = await res.json();
      expect(json.error).toContain('Deprecated');
    });
  });

  describe('GET (status check)', () => {
    it('returns 401 without authorization header', async () => {
      const res = await GET(makeGetRequest());
      expect(res.status).toBe(401);
    });

    it('returns 401 with wrong secret', async () => {
      const res = await GET(makeGetRequest('Bearer wrong-secret'));
      expect(res.status).toBe(401);
    });

    it('returns 500 when CRON_SECRET is not configured', async () => {
      delete process.env.CRON_SECRET;
      const res = await GET(makeGetRequest(`Bearer ${CRON_SECRET}`));
      expect(res.status).toBe(500);
    });

    it('returns 200 with valid auth and status payload', async () => {
      const res = await GET(makeGetRequest(`Bearer ${CRON_SECRET}`));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.currentTime).toBeDefined();
      expect(json.nextReminders).toBeDefined();
      expect(json.nextReminders.morning).toBeDefined();
      expect(json.nextReminders.afternoon).toBeDefined();
      expect(json.nextReminders.night).toBeDefined();
      expect(json.systemStatus).toBe('Active');
    });

    it('does not send any notifications on GET', async () => {
      const res = await GET(makeGetRequest(`Bearer ${CRON_SECRET}`));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.notificationsSent).toBeUndefined();
      expect(json.results).toBeUndefined();
    });
  });
});
