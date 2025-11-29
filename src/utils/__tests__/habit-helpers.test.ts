import { describe, it, expect } from 'vitest';
import {
  RETOMA_THRESHOLD_DAYS,
  getMonday,
  toDateStr,
  getWeekCompletionCount,
  isWeeklyQuotaMet,
  isDueToday,
  countRetomas,
  calculateCompletionRateForWeeklyCount,
} from '../habit-helpers';

describe('RETOMA_THRESHOLD_DAYS', () => {
  it('is 7', () => {
    expect(RETOMA_THRESHOLD_DAYS).toBe(7);
  });
});

describe('toDateStr', () => {
  it('formats single-digit month and day with leading zeros', () => {
    expect(toDateStr(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('formats double-digit month and day', () => {
    expect(toDateStr(new Date(2026, 11, 25))).toBe('2026-12-25');
  });
});

describe('getMonday', () => {
  it('returns the same day if already Monday', () => {
    const monday = new Date(2026, 1, 2);
    expect(monday.getDay()).toBe(1);
    const result = getMonday(monday);
    expect(toDateStr(result)).toBe('2026-02-02');
  });

  it('returns previous Monday for a Wednesday', () => {
    const wednesday = new Date(2026, 1, 4);
    expect(wednesday.getDay()).toBe(3);
    const result = getMonday(wednesday);
    expect(toDateStr(result)).toBe('2026-02-02');
  });

  it('returns previous Monday for a Sunday', () => {
    const sunday = new Date(2026, 1, 1);
    expect(sunday.getDay()).toBe(0);
    const result = getMonday(sunday);
    expect(toDateStr(result)).toBe('2026-01-26');
  });

  it('returns previous Monday for a Saturday', () => {
    const saturday = new Date(2026, 1, 7);
    expect(saturday.getDay()).toBe(6);
    const result = getMonday(saturday);
    expect(toDateStr(result)).toBe('2026-02-02');
  });

  it('does not mutate the original date', () => {
    const original = new Date(2026, 1, 4);
    const originalTime = original.getTime();
    getMonday(original);
    expect(original.getTime()).toBe(originalTime);
  });

  it('sets hours to midnight', () => {
    const d = new Date(2026, 1, 4, 15, 30, 45);
    const result = getMonday(d);
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
    expect(result.getMilliseconds()).toBe(0);
  });
});

describe('getWeekCompletionCount', () => {
  it('returns 0 for empty set', () => {
    expect(getWeekCompletionCount(new Set(), new Date(2026, 1, 4))).toBe(0);
  });

  it('counts completions within the same week (Mon-Sun)', () => {
    const wednesday = new Date(2026, 1, 4);
    const dates = new Set(['2026-02-02', '2026-02-03', '2026-02-04']);
    expect(getWeekCompletionCount(dates, wednesday)).toBe(3);
  });

  it('ignores dates from previous week', () => {
    const monday = new Date(2026, 1, 2);
    const dates = new Set(['2026-01-26', '2026-02-01', '2026-02-02']);
    expect(getWeekCompletionCount(dates, monday)).toBe(1);
  });

  it('counts all 7 days in a week', () => {
    const monday = new Date(2026, 1, 2);
    const dates = new Set([
      '2026-02-02', '2026-02-03', '2026-02-04',
      '2026-02-05', '2026-02-06', '2026-02-07', '2026-02-08',
    ]);
    expect(getWeekCompletionCount(dates, monday)).toBe(7);
  });

  it('ignores dates from next week', () => {
    const monday = new Date(2026, 1, 2);
    const dates = new Set(['2026-02-02', '2026-02-09']);
    expect(getWeekCompletionCount(dates, monday)).toBe(1);
  });
});

describe('isWeeklyQuotaMet', () => {
  it('returns false when count is below target', () => {
    const dates = new Set(['2026-02-02']);
    expect(isWeeklyQuotaMet(dates, 3, new Date(2026, 1, 4))).toBe(false);
  });

  it('returns true when count equals target', () => {
    const dates = new Set(['2026-02-02', '2026-02-03', '2026-02-04']);
    expect(isWeeklyQuotaMet(dates, 3, new Date(2026, 1, 4))).toBe(true);
  });

  it('returns true when count exceeds target', () => {
    const dates = new Set([
      '2026-02-02', '2026-02-03', '2026-02-04', '2026-02-05',
    ]);
    expect(isWeeklyQuotaMet(dates, 3, new Date(2026, 1, 5))).toBe(true);
  });
});

describe('isDueToday', () => {
  it('returns true for specific_days when today is in target_days', () => {
    const wednesday = new Date(2026, 1, 4);
    expect(wednesday.getDay()).toBe(3);
    expect(isDueToday('specific_days', [1, 3, 5], null, new Set(), wednesday)).toBe(true);
  });

  it('returns false for specific_days when today is not in target_days', () => {
    const wednesday = new Date(2026, 1, 4);
    expect(isDueToday('specific_days', [1, 5], null, new Set(), wednesday)).toBe(false);
  });

  it('returns true for specific_days with empty target_days (non-array edge)', () => {
    const wednesday = new Date(2026, 1, 4);
    expect(isDueToday('specific_days', [1, 3, 5], null, new Set(), wednesday)).toBe(true);
  });

  it('returns true for weekly_count when quota not met', () => {
    const wednesday = new Date(2026, 1, 4);
    const dates = new Set(['2026-02-02']);
    expect(isDueToday('weekly_count', [], 3, dates, wednesday)).toBe(true);
  });

  it('returns false for weekly_count when quota is met', () => {
    const wednesday = new Date(2026, 1, 4);
    const dates = new Set(['2026-02-02', '2026-02-03', '2026-02-04']);
    expect(isDueToday('weekly_count', [], 3, dates, wednesday)).toBe(false);
  });

  it('returns true for weekly_count when weeklyTarget is null', () => {
    const wednesday = new Date(2026, 1, 4);
    expect(isDueToday('weekly_count', [], null, new Set(), wednesday)).toBe(true);
  });
});

describe('countRetomas', () => {
  it('returns 0 for empty array', () => {
    expect(countRetomas([])).toBe(0);
  });

  it('returns 0 for single date', () => {
    expect(countRetomas(['2026-01-01'])).toBe(0);
  });

  it('returns 0 for consecutive dates within threshold', () => {
    expect(countRetomas(['2026-01-01', '2026-01-02', '2026-01-03'])).toBe(0);
  });

  it('returns 0 for dates exactly RETOMA_THRESHOLD_DAYS apart', () => {
    expect(countRetomas(['2026-01-01', '2026-01-08'])).toBe(0);
  });

  it('returns 1 for dates exceeding threshold', () => {
    expect(countRetomas(['2026-01-01', '2026-01-09'])).toBe(1);
  });

  it('counts multiple retomas', () => {
    expect(countRetomas([
      '2026-01-01',
      '2026-01-10',
      '2026-01-11',
      '2026-01-25',
    ])).toBe(2);
  });

  it('handles gap of exactly RETOMA_THRESHOLD_DAYS + 1', () => {
    const dates = ['2026-01-01', `2026-01-09`];
    expect(countRetomas(dates)).toBe(1);
  });
});

describe('calculateCompletionRateForWeeklyCount', () => {
  it('returns 0 for empty dates', () => {
    expect(calculateCompletionRateForWeeklyCount([], 3)).toBe(0);
  });

  it('returns correct rate when all within last 7 days', () => {
    const today = new Date();
    const dates = Array.from({ length: 3 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      return toDateStr(d);
    });
    expect(calculateCompletionRateForWeeklyCount(dates, 3)).toBe(100);
  });

  it('returns capped at 100 when exceeding target', () => {
    const today = new Date();
    const dates = Array.from({ length: 5 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      return toDateStr(d);
    });
    expect(calculateCompletionRateForWeeklyCount(dates, 3)).toBe(100);
  });

  it('returns partial rate for incomplete week', () => {
    const today = new Date();
    const dates = [toDateStr(today)];
    expect(calculateCompletionRateForWeeklyCount(dates, 5)).toBe(20);
  });

  it('ignores dates older than 7 days', () => {
    const today = new Date();
    const oldDate = new Date(today);
    oldDate.setDate(oldDate.getDate() - 10);
    const dates = [toDateStr(oldDate)];
    expect(calculateCompletionRateForWeeklyCount(dates, 3)).toBe(0);
  });

  it('handles weeklyTarget of 1', () => {
    const today = new Date();
    const dates = [toDateStr(today)];
    expect(calculateCompletionRateForWeeklyCount(dates, 1)).toBe(100);
  });
});
