import { describe, it, expect } from 'vitest';
import {
  sendDmSchema,
  startConversationSchema,
  messagesQuerySchema,
  conversationIdSchema,
} from '../messages';

describe('sendDmSchema', () => {
  it('validates valid content', () => {
    const result = sendDmSchema.safeParse({ content: 'Hello world' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.content).toBe('Hello world');
    }
  });

  it('trims whitespace', () => {
    const result = sendDmSchema.safeParse({ content: '  Hello  ' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.content).toBe('Hello');
    }
  });

  it('rejects empty content', () => {
    const result = sendDmSchema.safeParse({ content: '' });
    expect(result.success).toBe(false);
  });

  it('rejects whitespace-only content', () => {
    const result = sendDmSchema.safeParse({ content: '   ' });
    expect(result.success).toBe(false);
  });

  it('rejects content over 500 characters', () => {
    const result = sendDmSchema.safeParse({ content: 'a'.repeat(501) });
    expect(result.success).toBe(false);
  });

  it('accepts content at exactly 500 characters', () => {
    const result = sendDmSchema.safeParse({ content: 'a'.repeat(500) });
    expect(result.success).toBe(true);
  });

  it('rejects missing content', () => {
    const result = sendDmSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('startConversationSchema', () => {
  it('validates valid UUID', () => {
    const result = startConversationSchema.safeParse({
      targetUserId: '12345678-1234-1234-1234-123456789abc',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid UUID', () => {
    const result = startConversationSchema.safeParse({
      targetUserId: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing targetUserId', () => {
    const result = startConversationSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects empty string', () => {
    const result = startConversationSchema.safeParse({ targetUserId: '' });
    expect(result.success).toBe(false);
  });
});

describe('messagesQuerySchema', () => {
  it('uses defaults when no params provided', () => {
    const result = messagesQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(30);
      expect(result.data.cursor).toBeUndefined();
    }
  });

  it('parses cursor string', () => {
    const result = messagesQuerySchema.safeParse({
      cursor: '2024-01-01T00:00:00Z',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.cursor).toBe('2024-01-01T00:00:00Z');
    }
  });

  it('coerces limit from string', () => {
    const result = messagesQuerySchema.safeParse({ limit: '20' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(20);
    }
  });

  it('rejects limit below 1', () => {
    const result = messagesQuerySchema.safeParse({ limit: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects limit above 50', () => {
    const result = messagesQuerySchema.safeParse({ limit: 51 });
    expect(result.success).toBe(false);
  });

  it('accepts limit at boundaries', () => {
    const min = messagesQuerySchema.safeParse({ limit: 1 });
    const max = messagesQuerySchema.safeParse({ limit: 50 });
    expect(min.success).toBe(true);
    expect(max.success).toBe(true);
  });
});

describe('conversationIdSchema', () => {
  it('validates valid UUID', () => {
    const result = conversationIdSchema.safeParse({
      conversationId: '12345678-1234-1234-1234-123456789abc',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid UUID', () => {
    const result = conversationIdSchema.safeParse({
      conversationId: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });
});
