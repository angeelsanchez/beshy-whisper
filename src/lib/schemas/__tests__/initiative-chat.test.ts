import { describe, it, expect } from 'vitest';
import { sendMessageSchema, messagesQuerySchema } from '../initiative-chat';

describe('sendMessageSchema', () => {
  it('accepts valid message', () => {
    const result = sendMessageSchema.safeParse({ content: 'Hola equipo!' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.content).toBe('Hola equipo!');
    }
  });

  it('trims whitespace', () => {
    const result = sendMessageSchema.safeParse({ content: '  Hola  ' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.content).toBe('Hola');
    }
  });

  it('rejects empty string', () => {
    const result = sendMessageSchema.safeParse({ content: '' });
    expect(result.success).toBe(false);
  });

  it('rejects whitespace-only string', () => {
    const result = sendMessageSchema.safeParse({ content: '   ' });
    expect(result.success).toBe(false);
  });

  it('rejects missing content', () => {
    const result = sendMessageSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('accepts message at max length (500 chars)', () => {
    const result = sendMessageSchema.safeParse({ content: 'a'.repeat(500) });
    expect(result.success).toBe(true);
  });

  it('rejects message over 500 chars', () => {
    const result = sendMessageSchema.safeParse({ content: 'a'.repeat(501) });
    expect(result.success).toBe(false);
  });

  it('rejects non-string content', () => {
    const result = sendMessageSchema.safeParse({ content: 123 });
    expect(result.success).toBe(false);
  });

  it('rejects null content', () => {
    const result = sendMessageSchema.safeParse({ content: null });
    expect(result.success).toBe(false);
  });

  it('accepts single character after trim', () => {
    const result = sendMessageSchema.safeParse({ content: ' a ' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.content).toBe('a');
    }
  });
});

describe('messagesQuerySchema', () => {
  it('applies defaults when empty', () => {
    const result = messagesQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(30);
      expect(result.data.cursor).toBeUndefined();
    }
  });

  it('accepts valid cursor', () => {
    const result = messagesQuerySchema.safeParse({ cursor: '2026-01-15T10:30:00.000Z' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.cursor).toBe('2026-01-15T10:30:00.000Z');
    }
  });

  it('accepts valid limit', () => {
    const result = messagesQuerySchema.safeParse({ limit: '20' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(20);
    }
  });

  it('coerces string limit to number', () => {
    const result = messagesQuerySchema.safeParse({ limit: '15' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(15);
    }
  });

  it('accepts minimum limit (1)', () => {
    const result = messagesQuerySchema.safeParse({ limit: '1' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(1);
    }
  });

  it('accepts maximum limit (50)', () => {
    const result = messagesQuerySchema.safeParse({ limit: '50' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(50);
    }
  });

  it('rejects limit 0', () => {
    const result = messagesQuerySchema.safeParse({ limit: '0' });
    expect(result.success).toBe(false);
  });

  it('rejects limit over 50', () => {
    const result = messagesQuerySchema.safeParse({ limit: '51' });
    expect(result.success).toBe(false);
  });

  it('rejects negative limit', () => {
    const result = messagesQuerySchema.safeParse({ limit: '-1' });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer limit', () => {
    const result = messagesQuerySchema.safeParse({ limit: '2.5' });
    expect(result.success).toBe(false);
  });
});
