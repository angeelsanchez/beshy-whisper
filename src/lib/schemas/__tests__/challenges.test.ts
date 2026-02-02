import { describe, it, expect } from 'vitest';
import { createChallengeSchema, participateSchema } from '../challenges';

describe('createChallengeSchema', () => {
  const validBase = {
    title: 'Semana de Gratitud',
    description: 'Escribe cada dia sobre algo que agradeces',
    start_date: '2025-02-01',
    end_date: '2025-02-07',
  };

  it('accepts a valid challenge', () => {
    const result = createChallengeSchema.safeParse(validBase);
    expect(result.success).toBe(true);
  });

  it('accepts a challenge with theme', () => {
    const result = createChallengeSchema.safeParse({ ...validBase, theme: 'gratitud' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.theme).toBe('gratitud');
    }
  });

  it('accepts null theme', () => {
    const result = createChallengeSchema.safeParse({ ...validBase, theme: null });
    expect(result.success).toBe(true);
  });

  it('trims title and description', () => {
    const result = createChallengeSchema.safeParse({
      ...validBase,
      title: '  Reto  ',
      description: '  Desc  ',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe('Reto');
      expect(result.data.description).toBe('Desc');
    }
  });

  it('rejects empty title', () => {
    const result = createChallengeSchema.safeParse({ ...validBase, title: '' });
    expect(result.success).toBe(false);
  });

  it('rejects title over 100 chars', () => {
    const result = createChallengeSchema.safeParse({ ...validBase, title: 'a'.repeat(101) });
    expect(result.success).toBe(false);
  });

  it('rejects empty description', () => {
    const result = createChallengeSchema.safeParse({ ...validBase, description: '' });
    expect(result.success).toBe(false);
  });

  it('rejects description over 500 chars', () => {
    const result = createChallengeSchema.safeParse({ ...validBase, description: 'a'.repeat(501) });
    expect(result.success).toBe(false);
  });

  it('rejects invalid date format', () => {
    const result = createChallengeSchema.safeParse({ ...validBase, start_date: '01-02-2025' });
    expect(result.success).toBe(false);
  });

  it('rejects semantically invalid date (month 13)', () => {
    const result = createChallengeSchema.safeParse({ ...validBase, start_date: '2025-13-01' });
    expect(result.success).toBe(false);
  });

  it('rejects semantically invalid date (day 32)', () => {
    const result = createChallengeSchema.safeParse({ ...validBase, start_date: '2025-01-32' });
    expect(result.success).toBe(false);
  });

  it('rejects Feb 30', () => {
    const result = createChallengeSchema.safeParse({ ...validBase, start_date: '2025-02-30' });
    expect(result.success).toBe(false);
  });

  it('accepts Feb 29 on leap year', () => {
    const result = createChallengeSchema.safeParse({
      ...validBase,
      start_date: '2024-02-29',
      end_date: '2024-03-07',
    });
    expect(result.success).toBe(true);
  });

  it('rejects Feb 29 on non-leap year', () => {
    const result = createChallengeSchema.safeParse({ ...validBase, start_date: '2025-02-29' });
    expect(result.success).toBe(false);
  });

  it('rejects end_date before start_date', () => {
    const result = createChallengeSchema.safeParse({
      ...validBase,
      start_date: '2025-02-07',
      end_date: '2025-02-01',
    });
    expect(result.success).toBe(false);
  });

  it('accepts same start_date and end_date', () => {
    const result = createChallengeSchema.safeParse({
      ...validBase,
      start_date: '2025-02-01',
      end_date: '2025-02-01',
    });
    expect(result.success).toBe(true);
  });

  it('rejects theme over 50 chars', () => {
    const result = createChallengeSchema.safeParse({ ...validBase, theme: 'a'.repeat(51) });
    expect(result.success).toBe(false);
  });
});

describe('participateSchema', () => {
  const validUUID = '550e8400-e29b-41d4-a716-446655440000';

  it('accepts valid UUIDs', () => {
    const result = participateSchema.safeParse({
      challengeId: validUUID,
      entryId: validUUID,
    });
    expect(result.success).toBe(true);
  });

  it('rejects non-UUID challengeId', () => {
    const result = participateSchema.safeParse({
      challengeId: 'not-a-uuid',
      entryId: validUUID,
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-UUID entryId', () => {
    const result = participateSchema.safeParse({
      challengeId: validUUID,
      entryId: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing fields', () => {
    const result = participateSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
