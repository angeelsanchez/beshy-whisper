import { describe, it, expect } from 'vitest';
import { setLevelsSchema, advanceLevelSchema } from '../habit-levels';

describe('setLevelsSchema', () => {
  it('validates valid levels', () => {
    const result = setLevelsSchema.safeParse({
      levels: [
        { levelNumber: 1, label: 'Principiante', weeklyTarget: 2 },
        { levelNumber: 2, label: 'Intermedio', weeklyTarget: 4 },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects fewer than 2 levels', () => {
    const result = setLevelsSchema.safeParse({
      levels: [{ levelNumber: 1 }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects more than 10 levels', () => {
    const levels = Array.from({ length: 11 }, (_, i) => ({ levelNumber: i + 1 }));
    const result = setLevelsSchema.safeParse({ levels });
    expect(result.success).toBe(false);
  });

  it('rejects duplicate level numbers', () => {
    const result = setLevelsSchema.safeParse({
      levels: [
        { levelNumber: 1 },
        { levelNumber: 1 },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('validates levels with all optional fields', () => {
    const result = setLevelsSchema.safeParse({
      levels: [
        { levelNumber: 1, label: 'Inicio', targetDays: [1, 3, 5], weeklyTarget: 3, targetValue: 10 },
        { levelNumber: 2, label: 'Pro', targetDays: [1, 2, 3, 4, 5], weeklyTarget: 5, targetValue: 20 },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects label longer than 100 chars', () => {
    const result = setLevelsSchema.safeParse({
      levels: [
        { levelNumber: 1, label: 'x'.repeat(101) },
        { levelNumber: 2 },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects levelNumber of 0', () => {
    const result = setLevelsSchema.safeParse({
      levels: [
        { levelNumber: 0 },
        { levelNumber: 1 },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects weeklyTarget > 7', () => {
    const result = setLevelsSchema.safeParse({
      levels: [
        { levelNumber: 1, weeklyTarget: 8 },
        { levelNumber: 2 },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative targetValue', () => {
    const result = setLevelsSchema.safeParse({
      levels: [
        { levelNumber: 1, targetValue: -1 },
        { levelNumber: 2 },
      ],
    });
    expect(result.success).toBe(false);
  });
});

describe('advanceLevelSchema', () => {
  it('validates when confirm is true', () => {
    const result = advanceLevelSchema.safeParse({ confirm: true });
    expect(result.success).toBe(true);
  });

  it('rejects when confirm is false', () => {
    const result = advanceLevelSchema.safeParse({ confirm: false });
    expect(result.success).toBe(false);
  });

  it('rejects when confirm is missing', () => {
    const result = advanceLevelSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
