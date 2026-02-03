import { describe, it, expect } from 'vitest';
import {
  createHabitSchema,
  updateHabitSchema,
  toggleHabitLogSchema,
  habitStatsQuerySchema,
  derivedFromTargetDays,
} from '../habits';

describe('createHabitSchema', () => {
  it('accepts minimal binary habit', () => {
    const result = createHabitSchema.safeParse({ name: 'Read' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.trackingType).toBe('binary');
      expect(result.data.targetDays).toEqual([0, 1, 2, 3, 4, 5, 6]);
      expect(result.data.color).toBe('#4A2E1B');
    }
  });

  it('accepts quantity habit with targetValue and unit', () => {
    const result = createHabitSchema.safeParse({
      name: 'Beber agua',
      trackingType: 'quantity',
      targetValue: 8,
      unit: 'vasos',
    });
    expect(result.success).toBe(true);
  });

  it('rejects quantity habit without targetValue', () => {
    const result = createHabitSchema.safeParse({
      name: 'Beber agua',
      trackingType: 'quantity',
      unit: 'vasos',
    });
    expect(result.success).toBe(false);
  });

  it('rejects quantity habit without unit', () => {
    const result = createHabitSchema.safeParse({
      name: 'Beber agua',
      trackingType: 'quantity',
      targetValue: 8,
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty name', () => {
    const result = createHabitSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects name over 100 chars', () => {
    const result = createHabitSchema.safeParse({ name: 'a'.repeat(101) });
    expect(result.success).toBe(false);
  });

  it('rejects invalid color', () => {
    const result = createHabitSchema.safeParse({ name: 'Read', color: 'red' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid targetDays values', () => {
    const result = createHabitSchema.safeParse({ name: 'Read', targetDays: [8] });
    expect(result.success).toBe(false);
  });

  it('rejects duplicate targetDays', () => {
    const result = createHabitSchema.safeParse({ name: 'Read', targetDays: [1, 1, 2] });
    expect(result.success).toBe(false);
  });

  it('rejects empty targetDays', () => {
    const result = createHabitSchema.safeParse({ name: 'Read', targetDays: [] });
    expect(result.success).toBe(false);
  });

  it('rejects invalid trackingType', () => {
    const result = createHabitSchema.safeParse({ name: 'Read', trackingType: 'duration' });
    expect(result.success).toBe(false);
  });

  it('rejects negative targetValue', () => {
    const result = createHabitSchema.safeParse({
      name: 'Water',
      trackingType: 'quantity',
      targetValue: -5,
      unit: 'vasos',
    });
    expect(result.success).toBe(false);
  });

  it('rejects targetValue exceeding max', () => {
    const result = createHabitSchema.safeParse({
      name: 'Water',
      trackingType: 'quantity',
      targetValue: 1000000,
      unit: 'vasos',
    });
    expect(result.success).toBe(false);
  });

  it('rejects unit over 20 chars', () => {
    const result = createHabitSchema.safeParse({
      name: 'Water',
      trackingType: 'quantity',
      targetValue: 8,
      unit: 'a'.repeat(21),
    });
    expect(result.success).toBe(false);
  });

  it('accepts valid icon', () => {
    const result = createHabitSchema.safeParse({ name: 'Read', icon: '📖' });
    expect(result.success).toBe(true);
  });

  it('rejects icon over 10 chars', () => {
    const result = createHabitSchema.safeParse({ name: 'Read', icon: 'a'.repeat(11) });
    expect(result.success).toBe(false);
  });

  it('accepts valid category', () => {
    const result = createHabitSchema.safeParse({ name: 'Read', category: 'mind' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid category', () => {
    const result = createHabitSchema.safeParse({ name: 'Read', category: 'sports' });
    expect(result.success).toBe(false);
  });

  it('accepts valid reminderTime', () => {
    const result = createHabitSchema.safeParse({ name: 'Read', reminderTime: '08:30' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid reminderTime format', () => {
    const result = createHabitSchema.safeParse({ name: 'Read', reminderTime: '8:30' });
    expect(result.success).toBe(false);
  });

  it('rejects reminderTime with invalid hours', () => {
    const result = createHabitSchema.safeParse({ name: 'Read', reminderTime: '25:00' });
    expect(result.success).toBe(false);
  });

  it('allows binary habit with targetValue and unit (ignored)', () => {
    const result = createHabitSchema.safeParse({
      name: 'Read',
      trackingType: 'binary',
      targetValue: 5,
      unit: 'pages',
    });
    expect(result.success).toBe(true);
  });

  it('accepts description under 500 chars', () => {
    const result = createHabitSchema.safeParse({ name: 'Read', description: 'A short description' });
    expect(result.success).toBe(true);
  });

  it('rejects description over 500 chars', () => {
    const result = createHabitSchema.safeParse({ name: 'Read', description: 'a'.repeat(501) });
    expect(result.success).toBe(false);
  });
});

describe('updateHabitSchema', () => {
  it('accepts partial update with name only', () => {
    const result = updateHabitSchema.safeParse({ name: 'Updated' });
    expect(result.success).toBe(true);
  });

  it('accepts nullable fields', () => {
    const result = updateHabitSchema.safeParse({
      description: null,
      icon: null,
      category: null,
      reminderTime: null,
    });
    expect(result.success).toBe(true);
  });

  it('accepts isActive boolean', () => {
    const result = updateHabitSchema.safeParse({ isActive: false });
    expect(result.success).toBe(true);
  });

  it('accepts sortOrder', () => {
    const result = updateHabitSchema.safeParse({ sortOrder: 3 });
    expect(result.success).toBe(true);
  });

  it('rejects negative sortOrder', () => {
    const result = updateHabitSchema.safeParse({ sortOrder: -1 });
    expect(result.success).toBe(false);
  });

  it('accepts all new fields together', () => {
    const result = updateHabitSchema.safeParse({
      trackingType: 'quantity',
      targetValue: 10,
      unit: 'vasos',
      icon: '💧',
      category: 'health',
      reminderTime: '09:00',
    });
    expect(result.success).toBe(true);
  });
});

describe('toggleHabitLogSchema', () => {
  it('accepts valid habitId', () => {
    const result = toggleHabitLogSchema.safeParse({
      habitId: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid UUID', () => {
    const result = toggleHabitLogSchema.safeParse({ habitId: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });

  it('accepts optional date', () => {
    const result = toggleHabitLogSchema.safeParse({
      habitId: '550e8400-e29b-41d4-a716-446655440000',
      date: '2026-01-15',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid date format', () => {
    const result = toggleHabitLogSchema.safeParse({
      habitId: '550e8400-e29b-41d4-a716-446655440000',
      date: '2026-1-5',
    });
    expect(result.success).toBe(false);
  });

  it('accepts optional value', () => {
    const result = toggleHabitLogSchema.safeParse({
      habitId: '550e8400-e29b-41d4-a716-446655440000',
      value: 3,
    });
    expect(result.success).toBe(true);
  });

  it('accepts negative value for decrementing', () => {
    const result = toggleHabitLogSchema.safeParse({
      habitId: '550e8400-e29b-41d4-a716-446655440000',
      value: -1,
    });
    expect(result.success).toBe(true);
  });

  it('rejects value below min', () => {
    const result = toggleHabitLogSchema.safeParse({
      habitId: '550e8400-e29b-41d4-a716-446655440000',
      value: -1000000,
    });
    expect(result.success).toBe(false);
  });

  it('rejects value exceeding max', () => {
    const result = toggleHabitLogSchema.safeParse({
      habitId: '550e8400-e29b-41d4-a716-446655440000',
      value: 1000000,
    });
    expect(result.success).toBe(false);
  });
});

describe('habitStatsQuerySchema', () => {
  it('accepts empty params', () => {
    const result = habitStatsQuerySchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts valid habitId', () => {
    const result = habitStatsQuerySchema.safeParse({
      habitId: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid habitId', () => {
    const result = habitStatsQuerySchema.safeParse({ habitId: 'bad' });
    expect(result.success).toBe(false);
  });

  it('accepts valid date range', () => {
    const result = habitStatsQuerySchema.safeParse({
      from: '2026-01-01',
      to: '2026-01-31',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid date format', () => {
    const result = habitStatsQuerySchema.safeParse({ from: '2026-1-1' });
    expect(result.success).toBe(false);
  });
});

describe('derivedFromTargetDays', () => {
  it('returns weekly for single day', () => {
    const result = derivedFromTargetDays([0]);
    expect(result.frequency).toBe('weekly');
    expect(result.targetDaysPerWeek).toBe(1);
  });

  it('returns daily for multiple days', () => {
    const result = derivedFromTargetDays([1, 3, 5]);
    expect(result.frequency).toBe('daily');
    expect(result.targetDaysPerWeek).toBe(3);
  });

  it('returns daily for all days', () => {
    const result = derivedFromTargetDays([0, 1, 2, 3, 4, 5, 6]);
    expect(result.frequency).toBe('daily');
    expect(result.targetDaysPerWeek).toBe(7);
  });
});
