import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

const mockQueryBuilder: Record<string, ReturnType<typeof vi.fn>> = {};
mockQueryBuilder.from = vi.fn(() => mockQueryBuilder);
mockQueryBuilder.select = vi.fn().mockReturnValue(mockQueryBuilder);
mockQueryBuilder.insert = vi.fn().mockReturnValue(mockQueryBuilder);
mockQueryBuilder.eq = vi.fn().mockReturnValue(mockQueryBuilder);
mockQueryBuilder.gte = vi.fn().mockReturnValue(mockQueryBuilder);
mockQueryBuilder.order = vi.fn().mockResolvedValue({ data: [], error: null });
mockQueryBuilder.rpc = vi.fn().mockResolvedValue({ error: null });

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: vi.fn(() => mockQueryBuilder),
    rpc: vi.fn().mockResolvedValue({ error: null }),
  },
}));

import { checkLockout, recordLoginAttempt } from '../auth-lockout';
import { supabaseAdmin } from '@/lib/supabase-admin';

const qb = mockQueryBuilder;

describe('checkLockout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    qb.select.mockReturnValue(qb);
    qb.eq.mockReturnValue(qb);
    qb.gte.mockReturnValue(qb);
    qb.order.mockResolvedValue({ data: [], error: null });
  });

  it('returns unlocked when no failed attempts', async () => {
    qb.order.mockResolvedValueOnce({ data: [], error: null });

    const result = await checkLockout('1.2.3.4', 'user@test.com');

    expect(result.locked).toBe(false);
    expect(result.remainingSeconds).toBe(0);
    expect(result.failedAttempts).toBe(0);
  });

  it('returns unlocked when fewer than 5 failed attempts', async () => {
    const attempts = Array.from({ length: 4 }, (_, i) => ({
      attempted_at: new Date(Date.now() - i * 1000).toISOString(),
    }));
    qb.order.mockResolvedValueOnce({ data: attempts, error: null });

    const result = await checkLockout('1.2.3.4', 'user@test.com');

    expect(result.locked).toBe(false);
    expect(result.failedAttempts).toBe(4);
  });

  it('returns locked with ~1 min cooldown at 5 failed attempts', async () => {
    const recentTime = new Date(Date.now() - 10_000).toISOString();
    const attempts = Array.from({ length: 5 }, () => ({
      attempted_at: recentTime,
    }));
    qb.order.mockResolvedValueOnce({ data: attempts, error: null });

    const result = await checkLockout('1.2.3.4', 'user@test.com');

    expect(result.locked).toBe(true);
    expect(result.remainingSeconds).toBeGreaterThan(0);
    expect(result.remainingSeconds).toBeLessThanOrEqual(60);
    expect(result.failedAttempts).toBe(5);
  });

  it('returns locked with ~5 min cooldown at 10 failed attempts', async () => {
    const recentTime = new Date(Date.now() - 10_000).toISOString();
    const attempts = Array.from({ length: 10 }, () => ({
      attempted_at: recentTime,
    }));
    qb.order.mockResolvedValueOnce({ data: attempts, error: null });

    const result = await checkLockout('1.2.3.4', 'user@test.com');

    expect(result.locked).toBe(true);
    expect(result.remainingSeconds).toBeGreaterThan(60);
    expect(result.remainingSeconds).toBeLessThanOrEqual(300);
    expect(result.failedAttempts).toBe(10);
  });

  it('returns locked with ~15 min cooldown at 20 failed attempts', async () => {
    const recentTime = new Date(Date.now() - 10_000).toISOString();
    const attempts = Array.from({ length: 20 }, () => ({
      attempted_at: recentTime,
    }));
    qb.order.mockResolvedValueOnce({ data: attempts, error: null });

    const result = await checkLockout('1.2.3.4', 'user@test.com');

    expect(result.locked).toBe(true);
    expect(result.remainingSeconds).toBeGreaterThan(300);
    expect(result.remainingSeconds).toBeLessThanOrEqual(900);
    expect(result.failedAttempts).toBe(20);
  });

  it('returns unlocked when cooldown has expired', async () => {
    const oldTime = new Date(Date.now() - 120_000).toISOString();
    const attempts = Array.from({ length: 5 }, () => ({
      attempted_at: oldTime,
    }));
    qb.order.mockResolvedValueOnce({ data: attempts, error: null });

    const result = await checkLockout('1.2.3.4', 'user@test.com');

    expect(result.locked).toBe(false);
    expect(result.failedAttempts).toBe(5);
  });

  it('returns unlocked on database error', async () => {
    qb.order.mockResolvedValueOnce({ data: null, error: { message: 'DB error' } });

    const result = await checkLockout('1.2.3.4', 'user@test.com');

    expect(result.locked).toBe(false);
    expect(result.remainingSeconds).toBe(0);
    expect(result.failedAttempts).toBe(0);
  });

  it('normalizes email to lowercase and trims', async () => {
    qb.order.mockResolvedValueOnce({ data: [], error: null });

    await checkLockout('1.2.3.4', '  User@Test.COM  ');

    expect(qb.eq).toHaveBeenCalledWith('email', 'user@test.com');
  });
});

describe('recordLoginAttempt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    qb.insert.mockReturnValue({ error: null });
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
  });

  it('inserts a record with normalized email', async () => {
    await recordLoginAttempt('1.2.3.4', '  User@Test.COM  ', false);

    expect(supabaseAdmin.from).toHaveBeenCalledWith('login_attempts');
    expect(qb.insert).toHaveBeenCalledWith({
      ip_address: '1.2.3.4',
      email: 'user@test.com',
      success: false,
    });
  });

  it('records successful login', async () => {
    await recordLoginAttempt('1.2.3.4', 'user@test.com', true);

    expect(qb.insert).toHaveBeenCalledWith({
      ip_address: '1.2.3.4',
      email: 'user@test.com',
      success: true,
    });
  });

  it('handles insert error gracefully', async () => {
    qb.insert.mockReturnValueOnce({ error: { message: 'insert failed' } });

    await expect(
      recordLoginAttempt('1.2.3.4', 'user@test.com', false)
    ).resolves.toBeUndefined();
  });

  it('triggers cleanup when random < CLEANUP_PROBABILITY', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.005);
    const rpcMock = vi.mocked(supabaseAdmin as unknown as { rpc: ReturnType<typeof vi.fn> }).rpc;
    rpcMock.mockResolvedValueOnce({ error: null });

    await recordLoginAttempt('1.2.3.4', 'user@test.com', false);

    expect(rpcMock).toHaveBeenCalledWith('cleanup_old_login_attempts');
  });

  it('does not trigger cleanup when random >= CLEANUP_PROBABILITY', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const rpcMock = vi.mocked(supabaseAdmin as unknown as { rpc: ReturnType<typeof vi.fn> }).rpc;

    await recordLoginAttempt('1.2.3.4', 'user@test.com', false);

    expect(rpcMock).not.toHaveBeenCalled();
  });
});
