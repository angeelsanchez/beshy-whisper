import { describe, it, expect } from 'vitest';
import { toggleRepostSchema, repostStatusSchema } from '../reposts';

describe('toggleRepostSchema', () => {
  it('accepts a valid UUID entryId', () => {
    const result = toggleRepostSchema.safeParse({ entryId: '550e8400-e29b-41d4-a716-446655440000' });
    expect(result.success).toBe(true);
  });

  it('rejects missing entryId', () => {
    const result = toggleRepostSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects invalid UUID', () => {
    const result = toggleRepostSchema.safeParse({ entryId: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });

  it('rejects non-string entryId', () => {
    const result = toggleRepostSchema.safeParse({ entryId: 123 });
    expect(result.success).toBe(false);
  });

  it('rejects empty string', () => {
    const result = toggleRepostSchema.safeParse({ entryId: '' });
    expect(result.success).toBe(false);
  });
});

describe('repostStatusSchema', () => {
  it('accepts a valid UUID entryId', () => {
    const result = repostStatusSchema.safeParse({ entryId: '550e8400-e29b-41d4-a716-446655440000' });
    expect(result.success).toBe(true);
  });

  it('rejects missing entryId', () => {
    const result = repostStatusSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects invalid UUID', () => {
    const result = repostStatusSchema.safeParse({ entryId: 'abc' });
    expect(result.success).toBe(false);
  });
});
