import { describe, it, expect } from 'vitest';
import { createPostSchema } from '../posts';

describe('createPostSchema', () => {
  const validBase = {
    mensaje: 'Hola mundo',
    franja: 'DIA' as const,
  };

  it('accepts a valid post without mood', () => {
    const result = createPostSchema.safeParse(validBase);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.mood).toBeUndefined();
    }
  });

  it('accepts null mood', () => {
    const result = createPostSchema.safeParse({ ...validBase, mood: null });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.mood).toBeNull();
    }
  });

  it('accepts a valid mood value', () => {
    const moods = ['feliz', 'tranquilo', 'agradecido', 'energetico', 'triste', 'ansioso', 'cansado', 'frustrado'];
    for (const mood of moods) {
      const result = createPostSchema.safeParse({ ...validBase, mood });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.mood).toBe(mood);
      }
    }
  });

  it('rejects invalid mood values', () => {
    const invalid = ['happy', 'sad', '', 'FELIZ', 'unknown'];
    for (const mood of invalid) {
      const result = createPostSchema.safeParse({ ...validBase, mood });
      expect(result.success).toBe(false);
    }
  });

  it('rejects non-string mood values', () => {
    const result = createPostSchema.safeParse({ ...validBase, mood: 42 });
    expect(result.success).toBe(false);
  });

  it('trims mensaje', () => {
    const result = createPostSchema.safeParse({ ...validBase, mensaje: '  hola  ' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.mensaje).toBe('hola');
    }
  });

  it('rejects empty mensaje', () => {
    const result = createPostSchema.safeParse({ ...validBase, mensaje: '' });
    expect(result.success).toBe(false);
  });

  it('rejects mensaje over 300 chars', () => {
    const result = createPostSchema.safeParse({ ...validBase, mensaje: 'a'.repeat(301) });
    expect(result.success).toBe(false);
  });

  it('rejects invalid franja', () => {
    const result = createPostSchema.safeParse({ ...validBase, franja: 'TARDE' });
    expect(result.success).toBe(false);
  });

  it('defaults is_private to false', () => {
    const result = createPostSchema.safeParse(validBase);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.is_private).toBe(false);
    }
  });

  it('defaults objectives to empty array', () => {
    const result = createPostSchema.safeParse(validBase);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.objectives).toEqual([]);
    }
  });

  it('rejects more than 15 objectives', () => {
    const result = createPostSchema.safeParse({
      ...validBase,
      objectives: Array.from({ length: 16 }, (_, i) => `obj-${i}`),
    });
    expect(result.success).toBe(false);
  });

  it('defaults habitSnapshots to empty array', () => {
    const result = createPostSchema.safeParse(validBase);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.habitSnapshots).toEqual([]);
    }
  });

  it('accepts valid habitSnapshots', () => {
    const result = createPostSchema.safeParse({
      ...validBase,
      franja: 'NOCHE',
      habitSnapshots: [
        {
          habitId: '550e8400-e29b-41d4-a716-446655440000',
          habitName: 'Meditar',
          habitIcon: 'brain',
          habitColor: '#4A2E1B',
          trackingType: 'binary',
          isCompleted: true,
        },
        {
          habitId: '550e8400-e29b-41d4-a716-446655440001',
          habitName: 'Correr',
          habitColor: '#FF5733',
          trackingType: 'quantity',
          targetValue: 5,
          unit: 'km',
          completedValue: 3.5,
          isCompleted: true,
        },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.habitSnapshots).toHaveLength(2);
      expect(result.data.habitSnapshots[0].habitName).toBe('Meditar');
    }
  });

  it('rejects habitSnapshot with invalid UUID', () => {
    const result = createPostSchema.safeParse({
      ...validBase,
      habitSnapshots: [{ habitId: 'not-a-uuid', habitName: 'Test', habitColor: '#4A2E1B' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects habitSnapshot with invalid color', () => {
    const result = createPostSchema.safeParse({
      ...validBase,
      habitSnapshots: [{
        habitId: '550e8400-e29b-41d4-a716-446655440000',
        habitName: 'Test',
        habitColor: 'red',
      }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects more than 20 habitSnapshots', () => {
    const snapshots = Array.from({ length: 21 }, (_, i) => ({
      habitId: `550e8400-e29b-41d4-a716-44665544${String(i).padStart(4, '0')}`,
      habitName: `Habit ${i}`,
      habitColor: '#4A2E1B',
    }));
    const result = createPostSchema.safeParse({ ...validBase, habitSnapshots: snapshots });
    expect(result.success).toBe(false);
  });

  it('defaults habitSnapshot trackingType to binary', () => {
    const result = createPostSchema.safeParse({
      ...validBase,
      habitSnapshots: [{
        habitId: '550e8400-e29b-41d4-a716-446655440000',
        habitName: 'Test',
        habitColor: '#4A2E1B',
      }],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.habitSnapshots[0].trackingType).toBe('binary');
      expect(result.data.habitSnapshots[0].isCompleted).toBe(true);
    }
  });
});
