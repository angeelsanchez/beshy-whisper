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
});
