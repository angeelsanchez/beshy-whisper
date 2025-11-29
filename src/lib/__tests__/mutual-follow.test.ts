import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSelect = vi.fn();
const mockOr = vi.fn();

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: mockSelect,
    })),
  },
}));

mockSelect.mockReturnValue({ or: mockOr });

import { areMutualFollows, getCanonicalPair } from '../mutual-follow';

describe('areMutualFollows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelect.mockReturnValue({ or: mockOr });
  });

  it('returns false when users are the same', async () => {
    const result = await areMutualFollows('user-1', 'user-1');
    expect(result).toBe(false);
  });

  it('returns true when both users follow each other', async () => {
    mockOr.mockResolvedValue({
      data: [
        { follower_id: 'user-a', following_id: 'user-b' },
        { follower_id: 'user-b', following_id: 'user-a' },
      ],
      error: null,
    });

    const result = await areMutualFollows('user-a', 'user-b');
    expect(result).toBe(true);
  });

  it('returns false when only one user follows the other', async () => {
    mockOr.mockResolvedValue({
      data: [{ follower_id: 'user-a', following_id: 'user-b' }],
      error: null,
    });

    const result = await areMutualFollows('user-a', 'user-b');
    expect(result).toBe(false);
  });

  it('returns false when neither follows the other', async () => {
    mockOr.mockResolvedValue({
      data: [],
      error: null,
    });

    const result = await areMutualFollows('user-a', 'user-b');
    expect(result).toBe(false);
  });

  it('returns false on database error', async () => {
    mockOr.mockResolvedValue({
      data: null,
      error: { message: 'Database error' },
    });

    const result = await areMutualFollows('user-a', 'user-b');
    expect(result).toBe(false);
  });

  it('returns false when data is null', async () => {
    mockOr.mockResolvedValue({
      data: null,
      error: null,
    });

    const result = await areMutualFollows('user-a', 'user-b');
    expect(result).toBe(false);
  });
});

describe('getCanonicalPair', () => {
  it('returns userAId < userBId when first id is smaller', () => {
    const result = getCanonicalPair('aaa', 'bbb');
    expect(result).toEqual({ userAId: 'aaa', userBId: 'bbb' });
  });

  it('swaps order when second id is smaller', () => {
    const result = getCanonicalPair('bbb', 'aaa');
    expect(result).toEqual({ userAId: 'aaa', userBId: 'bbb' });
  });

  it('works with UUIDs', () => {
    const uuid1 = '11111111-1111-1111-1111-111111111111';
    const uuid2 = '22222222-2222-2222-2222-222222222222';

    const result1 = getCanonicalPair(uuid1, uuid2);
    expect(result1).toEqual({ userAId: uuid1, userBId: uuid2 });

    const result2 = getCanonicalPair(uuid2, uuid1);
    expect(result2).toEqual({ userAId: uuid1, userBId: uuid2 });
  });
});
