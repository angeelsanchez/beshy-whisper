import { describe, it, expect } from 'vitest';
import { formatLikeCount } from '../format-utils';

describe('formatLikeCount', () => {
  it('returns plain number for 0', () => {
    expect(formatLikeCount(0)).toBe('0');
  });

  it('returns plain number for values <= 999', () => {
    expect(formatLikeCount(1)).toBe('1');
    expect(formatLikeCount(42)).toBe('42');
    expect(formatLikeCount(999)).toBe('999');
  });

  it('formats thousands with "mil" suffix', () => {
    expect(formatLikeCount(1000)).toBe('1mil');
    expect(formatLikeCount(1230)).toBe('1,23mil');
    expect(formatLikeCount(1500)).toBe('1,5mil');
    expect(formatLikeCount(10000)).toBe('10mil');
    expect(formatLikeCount(999990)).toBe('999,99mil');
    expect(formatLikeCount(999999)).toBe('1000mil');
  });

  it('formats millions with "M" suffix', () => {
    expect(formatLikeCount(1000000)).toBe('1M');
    expect(formatLikeCount(1200000)).toBe('1,2M');
    expect(formatLikeCount(1234567)).toBe('1,2M');
    expect(formatLikeCount(10000000)).toBe('10M');
  });

  it('handles negative numbers', () => {
    expect(formatLikeCount(-1)).toBe('-1');
  });
});
