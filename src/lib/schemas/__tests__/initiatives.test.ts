import { describe, it, expect } from 'vitest';
import {
  createInitiativeSchema,
  updateInitiativeSchema,
  initiativeCheckinSchema,
  initiativeListQuerySchema,
  initiativeProgressQuerySchema,
} from '../initiatives';

describe('createInitiativeSchema', () => {
  const validBase = {
    name: 'Morning run',
    description: 'Run every morning as a group',
    startDate: '2026-03-01',
  };

  it('accepts minimal binary initiative', () => {
    const result = createInitiativeSchema.safeParse(validBase);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.trackingType).toBe('binary');
      expect(result.data.color).toBe('#4A2E1B');
    }
  });

  it('accepts full initiative with all fields', () => {
    const result = createInitiativeSchema.safeParse({
      ...validBase,
      icon: '\uD83C\uDFC3',
      color: '#FF5733',
      category: 'health',
      trackingType: 'quantity',
      targetValue: 30,
      unit: 'min',
      endDate: '2026-06-01',
      maxParticipants: 50,
      reminderTime: '08:00',
    });
    expect(result.success).toBe(true);
  });

  it('accepts timer initiative with targetValue and unit', () => {
    const result = createInitiativeSchema.safeParse({
      ...validBase,
      trackingType: 'timer',
      targetValue: 25,
      unit: 'min',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    const result = createInitiativeSchema.safeParse({ ...validBase, name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects name over 100 chars', () => {
    const result = createInitiativeSchema.safeParse({ ...validBase, name: 'a'.repeat(101) });
    expect(result.success).toBe(false);
  });

  it('rejects empty description', () => {
    const result = createInitiativeSchema.safeParse({ ...validBase, description: '' });
    expect(result.success).toBe(false);
  });

  it('rejects description over 500 chars', () => {
    const result = createInitiativeSchema.safeParse({ ...validBase, description: 'a'.repeat(501) });
    expect(result.success).toBe(false);
  });

  it('rejects invalid color format', () => {
    const result = createInitiativeSchema.safeParse({ ...validBase, color: 'red' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid hex color (3 digits)', () => {
    const result = createInitiativeSchema.safeParse({ ...validBase, color: '#FFF' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid category', () => {
    const result = createInitiativeSchema.safeParse({ ...validBase, category: 'fitness' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid trackingType', () => {
    const result = createInitiativeSchema.safeParse({ ...validBase, trackingType: 'duration' });
    expect(result.success).toBe(false);
  });

  it('rejects quantity without targetValue', () => {
    const result = createInitiativeSchema.safeParse({
      ...validBase,
      trackingType: 'quantity',
      unit: 'pages',
    });
    expect(result.success).toBe(false);
  });

  it('rejects quantity without unit', () => {
    const result = createInitiativeSchema.safeParse({
      ...validBase,
      trackingType: 'quantity',
      targetValue: 10,
    });
    expect(result.success).toBe(false);
  });

  it('rejects timer without targetValue', () => {
    const result = createInitiativeSchema.safeParse({
      ...validBase,
      trackingType: 'timer',
      unit: 'min',
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative targetValue', () => {
    const result = createInitiativeSchema.safeParse({
      ...validBase,
      trackingType: 'quantity',
      targetValue: -5,
      unit: 'reps',
    });
    expect(result.success).toBe(false);
  });

  it('rejects zero targetValue', () => {
    const result = createInitiativeSchema.safeParse({
      ...validBase,
      trackingType: 'quantity',
      targetValue: 0,
      unit: 'reps',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing startDate', () => {
    const result = createInitiativeSchema.safeParse({
      name: 'Test',
      description: 'Test desc',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid startDate format', () => {
    const result = createInitiativeSchema.safeParse({ ...validBase, startDate: '01-03-2026' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid calendar date (Feb 30)', () => {
    const result = createInitiativeSchema.safeParse({ ...validBase, startDate: '2026-02-30' });
    expect(result.success).toBe(false);
  });

  it('rejects endDate before startDate', () => {
    const result = createInitiativeSchema.safeParse({
      ...validBase,
      startDate: '2026-06-01',
      endDate: '2026-05-01',
    });
    expect(result.success).toBe(false);
  });

  it('rejects endDate equal to startDate', () => {
    const result = createInitiativeSchema.safeParse({
      ...validBase,
      startDate: '2026-06-01',
      endDate: '2026-06-01',
    });
    expect(result.success).toBe(false);
  });

  it('accepts endDate after startDate', () => {
    const result = createInitiativeSchema.safeParse({
      ...validBase,
      endDate: '2026-12-31',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid reminderTime', () => {
    const result = createInitiativeSchema.safeParse({ ...validBase, reminderTime: '25:00' });
    expect(result.success).toBe(false);
  });

  it('accepts valid reminderTime', () => {
    const result = createInitiativeSchema.safeParse({ ...validBase, reminderTime: '09:30' });
    expect(result.success).toBe(true);
  });

  it('rejects negative maxParticipants', () => {
    const result = createInitiativeSchema.safeParse({ ...validBase, maxParticipants: -1 });
    expect(result.success).toBe(false);
  });

  it('rejects zero maxParticipants', () => {
    const result = createInitiativeSchema.safeParse({ ...validBase, maxParticipants: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects maxParticipants over 10000', () => {
    const result = createInitiativeSchema.safeParse({ ...validBase, maxParticipants: 10001 });
    expect(result.success).toBe(false);
  });

  it('trims whitespace from name and description', () => {
    const result = createInitiativeSchema.safeParse({
      ...validBase,
      name: '  Morning run  ',
      description: '  Run every morning  ',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Morning run');
      expect(result.data.description).toBe('Run every morning');
    }
  });

  it('accepts all valid categories', () => {
    const categories = ['health', 'mind', 'productivity', 'wellness', 'social', 'creativity'];
    for (const category of categories) {
      const result = createInitiativeSchema.safeParse({ ...validBase, category });
      expect(result.success).toBe(true);
    }
  });
});

describe('updateInitiativeSchema', () => {
  it('accepts empty object', () => {
    const result = updateInitiativeSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts partial name update', () => {
    const result = updateInitiativeSchema.safeParse({ name: 'New name' });
    expect(result.success).toBe(true);
  });

  it('accepts null icon (to clear it)', () => {
    const result = updateInitiativeSchema.safeParse({ icon: null });
    expect(result.success).toBe(true);
  });

  it('accepts null category', () => {
    const result = updateInitiativeSchema.safeParse({ category: null });
    expect(result.success).toBe(true);
  });

  it('accepts isActive toggle', () => {
    const result = updateInitiativeSchema.safeParse({ isActive: false });
    expect(result.success).toBe(true);
  });

  it('rejects invalid color in update', () => {
    const result = updateInitiativeSchema.safeParse({ color: 'blue' });
    expect(result.success).toBe(false);
  });

  it('rejects empty name in update', () => {
    const result = updateInitiativeSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });
});

describe('initiativeCheckinSchema', () => {
  it('accepts empty body (defaults)', () => {
    const result = initiativeCheckinSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts valid date', () => {
    const result = initiativeCheckinSchema.safeParse({ date: '2026-03-15' });
    expect(result.success).toBe(true);
  });

  it('accepts positive value', () => {
    const result = initiativeCheckinSchema.safeParse({ value: 5 });
    expect(result.success).toBe(true);
  });

  it('accepts negative value (for decrement)', () => {
    const result = initiativeCheckinSchema.safeParse({ value: -1 });
    expect(result.success).toBe(true);
  });

  it('accepts zero value', () => {
    const result = initiativeCheckinSchema.safeParse({ value: 0 });
    expect(result.success).toBe(true);
  });

  it('rejects invalid date format', () => {
    const result = initiativeCheckinSchema.safeParse({ date: '15-03-2026' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid calendar date', () => {
    const result = initiativeCheckinSchema.safeParse({ date: '2026-13-01' });
    expect(result.success).toBe(false);
  });

  it('rejects value over limit', () => {
    const result = initiativeCheckinSchema.safeParse({ value: 1000000 });
    expect(result.success).toBe(false);
  });

  it('rejects value under limit', () => {
    const result = initiativeCheckinSchema.safeParse({ value: -1000000 });
    expect(result.success).toBe(false);
  });
});

describe('initiativeListQuerySchema', () => {
  it('applies defaults', () => {
    const result = initiativeListQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
    }
  });

  it('accepts joined filter', () => {
    const result = initiativeListQuerySchema.safeParse({ joined: 'true' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid joined value', () => {
    const result = initiativeListQuerySchema.safeParse({ joined: 'maybe' });
    expect(result.success).toBe(false);
  });

  it('coerces string page to number', () => {
    const result = initiativeListQuerySchema.safeParse({ page: '3' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(3);
    }
  });

  it('rejects page 0', () => {
    const result = initiativeListQuerySchema.safeParse({ page: '0' });
    expect(result.success).toBe(false);
  });

  it('rejects limit over 50', () => {
    const result = initiativeListQuerySchema.safeParse({ limit: '51' });
    expect(result.success).toBe(false);
  });

  it('rejects limit 0', () => {
    const result = initiativeListQuerySchema.safeParse({ limit: '0' });
    expect(result.success).toBe(false);
  });
});

describe('initiativeProgressQuerySchema', () => {
  it('defaults to 7 days', () => {
    const result = initiativeProgressQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.days).toBe(7);
    }
  });

  it('accepts valid days', () => {
    const result = initiativeProgressQuerySchema.safeParse({ days: '30' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.days).toBe(30);
    }
  });

  it('rejects 0 days', () => {
    const result = initiativeProgressQuerySchema.safeParse({ days: '0' });
    expect(result.success).toBe(false);
  });

  it('rejects over 90 days', () => {
    const result = initiativeProgressQuerySchema.safeParse({ days: '91' });
    expect(result.success).toBe(false);
  });
});
